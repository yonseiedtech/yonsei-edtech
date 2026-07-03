// QA-v2(2026-07-03): 질적·혼합 연구방법 8종 published=false → true 전환.
//  · 배경: 파인더(research-finder)가 listPublished() 만 조회 — draft 라 일반 회원 결과가
//    폴백 라벨만 남고 상세 링크·선배논문 매칭이 소실됨 (QA 전수감사 High).
//  · 대상: seedKey = research-method:{slug} 8종. 멱등: 이미 published=true 면 건너뜀.
//  · 실행: set -a; source .env.local; set +a
//          npx tsc scripts/publish-qual-mixed-methods-2026-07-03.ts --module commonjs --outDir .seed-tmp \
//            --esModuleInterop --skipLibCheck && node .seed-tmp/scripts/publish-qual-mixed-methods-2026-07-03.js [--apply]
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const APPLY = process.argv.includes("--apply");
const COLLECTION = "archive_research_methods";
const TARGET_SLUGS = [
  "phenomenology",
  "ethnography",
  "narrative-inquiry",
  "qualitative-content-analysis",
  "convergent-parallel",
  "explanatory-sequential",
  "exploratory-sequential",
  "mixed-methods-overview",
];

const sa = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, "base64").toString("utf8"),
);
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();
db.settings({ preferRest: true });

async function main() {
  const targets = new Set(TARGET_SLUGS.map((s) => `research-method:${s}`));
  const snap = await db.collection(COLLECTION).get();
  let flipped = 0;
  for (const d of snap.docs) {
    const x = d.data() as { seedKey?: string; name?: string; published?: boolean };
    if (!x.seedKey || !targets.has(x.seedKey)) continue;
    if (x.published === true) {
      console.log(`skip (already published): ${x.name} [${x.seedKey}]`);
      continue;
    }
    console.log(`${APPLY ? "PUBLISH" : "would publish"}: ${x.name} [${x.seedKey}]`);
    if (APPLY) {
      await d.ref.update({ published: true, updatedAt: new Date().toISOString() });
    }
    flipped += 1;
  }
  console.log(`${APPLY ? "published" : "dry-run"}: ${flipped}/${TARGET_SLUGS.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
