// Phase 2a — 연구방법 추천 마법사가 참조할 안정 seedKey 주입 (2026-07-01)
//  · 기존 연구방법 문서에 seedKey 가 없어 finder 코드가 안정 참조 불가 → id 기준으로 seedKey 부여(없을 때만).
//  · 멱등: 이미 seedKey 있으면 건너뜀. name 이중 확인으로 오적용 방지.
// 실행: npx tsx scripts/seed-research-method-seedkeys-2026-07-01.ts          (드라이런)
//       npx tsx scripts/seed-research-method-seedkeys-2026-07-01.ts --apply  (적용)
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const APPLY = process.argv.includes("--apply");
const COLLECTION = "archive_research_methods";
const sa = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, "base64").toString("utf8"),
);
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();
db.settings({ preferRest: true });
const now = () => new Date().toISOString();

// id → { expectName, slug } (2026-07-01 DB 덤프 기준)
const PLANS: { id: string; expectName: string; slug: string }[] = [
  { id: "MVGSG7sxPJNrjHeSsfDp", expectName: "근거이론", slug: "grounded-theory" },
  { id: "CRxYnYSOR0cf8k4RGoMW", expectName: "사례연구", slug: "case-study" },
  { id: "g0pNvF5tlj4cyiyAZwXj", expectName: "액션리서치", slug: "action-research" },
  { id: "ELTUlqnCI9OnYblvoSzs", expectName: "델파이 기법", slug: "delphi" },
  { id: "WlkONXWP2GzGqtRiFat0", expectName: "실험연구", slug: "experimental" },
  { id: "svSa9aSOEIBPzG7Pv2Zs", expectName: "준실험연구", slug: "quasi-experimental" },
  { id: "NJaEV2NXcEj9Ta8M3rgk", expectName: "설문조사연구", slug: "survey" },
  { id: "0JJjPvYOnzh5etifoITe", expectName: "구조방정식모형(SEM)", slug: "sem" },
  { id: "c36ml6aIWB8kwnLesShH", expectName: "메타분석", slug: "meta-analysis" },
  { id: "jsJM0yf7s8eTRnVh8QQC", expectName: "척도(측정도구) 개발 연구", slug: "scale-development" },
  { id: "OxhInbYJh5xlgZB7yJFQ", expectName: "교육 프로그램 개발과 타당화", slug: "program-development" },
  { id: "qCvghZRtbH0x3emO7afu", expectName: "개발연구", slug: "developmental-research" },
  { id: "vqpZWWCUucmhtI12RamN", expectName: "설계기반연구(DBR)", slug: "design-based-research" },
];

async function main() {
  let touched = 0, unchanged = 0, skipped = 0;
  for (const p of PLANS) {
    const ref = db.collection(COLLECTION).doc(p.id);
    const snap = await ref.get();
    if (!snap.exists) { console.log(`⚠ 없음: ${p.expectName}`); skipped++; continue; }
    const x = snap.data() as { name?: string; seedKey?: string };
    if (x.name !== p.expectName) { console.log(`⚠ 이름 불일치: ${p.id} 기대="${p.expectName}" 실제="${x.name}"`); skipped++; continue; }
    if (x.seedKey) { console.log(`· 이미 있음: ${p.expectName} (${x.seedKey})`); unchanged++; continue; }
    console.log(`~ 부여: ${p.expectName} → research-method:${p.slug}`);
    touched++;
    if (APPLY) await ref.set({ seedKey: `research-method:${p.slug}`, updatedAt: now() }, { merge: true });
  }
  console.log(`\n부여 ${touched} · 유지 ${unchanged} · 건너뜀 ${skipped}  ${APPLY ? "=== 적용 완료 ===" : "=== 드라이런 ==="}`);
}
main().then(() => process.exit(0));
