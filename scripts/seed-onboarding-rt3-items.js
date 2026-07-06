// RT-3 온보딩 항목 3종 시드 (2026-07-06, 개강 체크리스트 운영 액션)
//  · 문헌 매트릭스·연구 모형·스튜디오 — 콘솔 미등록으로 신규 회원 위젯에 노출되지 않던 항목
//  · 멱등: completionType 기준 존재 시 건너뜀. 실행: node scripts/seed-onboarding-rt3-items.js [--apply]
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const APPLY = process.argv.includes("--apply");
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, "base64").toString("utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();
db.settings({ preferRest: true });

const ITEMS = [
  {
    completionType: "used.literatureMatrix",
    label: "문헌 매트릭스에 논문 1편 정리",
    href: "/mypage/research?tab=reading&focus=matrix",
    icon: "BookOpen",
    priority: "high", // 개강 채택 전환 사이클 핵심 KPI (매트릭스 5+)
  },
  {
    completionType: "used.researchModel",
    label: "연구 모형 그리기",
    href: "/research-model",
    icon: "FileText",
    priority: "medium",
  },
  {
    completionType: "visited.studio",
    label: "디자인 스튜디오 둘러보기",
    href: "/studio",
    icon: "Sparkles",
    priority: "low",
  },
];

(async () => {
  const snap = await db.collection("onboarding_checklist").get();
  const existingTypes = new Set(snap.docs.map((d) => d.data().completionType));
  const maxOrder = snap.docs.reduce((m, d) => Math.max(m, d.data().order ?? 0), -1);
  const now = new Date().toISOString();
  let order = maxOrder + 1;
  for (const item of ITEMS) {
    if (existingTypes.has(item.completionType)) {
      console.log(`skip (이미 존재): ${item.completionType}`);
      continue;
    }
    const doc = { ...item, order: order++, enabled: true, createdBy: "seed:rt3-2026-07-06", createdAt: now, updatedAt: now };
    console.log(`${APPLY ? "CREATE" : "would create"}: [${doc.order}] ${doc.label} (${doc.completionType}, ${doc.priority})`);
    if (APPLY) await db.collection("onboarding_checklist").add(doc);
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
