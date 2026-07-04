// C-1(2026-07-04): 2026-2학기 개강 사이트 팝업 예약 발행.
//  · 노출: 2026-08-25 ~ 2026-09-07 (KST) · 로그인 회원 · 우측 하단 배너 · 7일 보지 않기
//  · 멱등: 고정 doc id. 운영진은 콘솔(/console/popups)에서 수정·비활성 가능.
//  · 실행: set -a; source .env.local; set +a
//    npx tsc scripts/seed-kickoff-popup-2026-09.ts --module commonjs --outDir .seed-tmp --esModuleInterop --skipLibCheck
//    node .seed-tmp/seed-kickoff-popup-2026-09.js [--apply]
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const APPLY = process.argv.includes("--apply");
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, "base64").toString("utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();
db.settings({ preferRest: true });

const DOC_ID = "kickoff-2026-fall";
const now = new Date().toISOString();

const popup = {
  title: "2026년 2학기 개강 🎓",
  content:
    "방학 동안 논문 도구가 크게 업그레이드됐어요 — 문헌 리뷰 매트릭스, 연구모형 마법사, 논문 에디터(목차·표·윤리 체크리스트), 디자인 스튜디오까지. 새 학기 첫 걸음으로 둘러보세요.",
  ctaLabel: "새 기능 보기",
  ctaUrl: "/whats-new",
  startsAt: "2026-08-24T15:00:00.000Z", // KST 2026-08-25 00:00
  endsAt: "2026-09-07T14:59:59.000Z", // KST 2026-09-07 23:59
  audience: "member",
  position: "bottom-right",
  dismissDuration: "7d",
  active: true,
  priority: 90,
  createdAt: now,
  updatedAt: now,
  createdBy: "system:c1-kickoff",
};

async function main() {
  const ref = db.collection("site_popups").doc(DOC_ID);
  const existing = await ref.get();
  if (existing.exists) {
    console.log(`skip (already exists): site_popups/${DOC_ID}`);
    return;
  }
  console.log(`${APPLY ? "CREATE" : "would create"}: site_popups/${DOC_ID}`);
  console.log(JSON.stringify(popup, null, 2));
  if (APPLY) await ref.set(popup);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
