// 온보딩 체크리스트 신규 항목 2종 추가 — 사이클 5 판정 타입의 운영 데이터 (멱등: completionType 중복 시 skip)
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8'));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();

const COLL = 'onboarding_checklist';

const NEW_ITEMS = [
  {
    label: '논문 여정 단계 설정',
    href: '/mypage/research',
    icon: 'GraduationCap',
    completionType: 'set.thesisJourneyStage',
    enabled: true,
    priority: 'medium',
  },
  {
    label: '소통 보드 질문/답변 1건',
    href: '/activities',
    icon: 'Users',
    completionType: 'participated.commBoard',
    enabled: true,
    priority: 'medium',
  },
];

const snap = await db.collection(COLL).get();
const existing = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
console.log(`=== 기존 항목 ${existing.length}건 ===`);
existing
  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  .forEach((x) => console.log(`  [${x.order}] ${x.label} (${x.completionType}) enabled=${x.enabled}`));

let maxOrder = existing.reduce((m, x) => Math.max(m, Number(x.order ?? 0)), -1);
const now = new Date().toISOString();

for (const item of NEW_ITEMS) {
  if (existing.some((x) => x.completionType === item.completionType)) {
    console.log(`SKIP (이미 존재): ${item.label}`);
    continue;
  }
  maxOrder += 1;
  const doc = {
    ...item,
    order: maxOrder,
    createdBy: 'system:cycle27-script',
    createdAt: now,
    updatedAt: now,
  };
  const ref = await db.collection(COLL).add(doc);
  console.log(`ADDED [order=${maxOrder}] ${item.label} → ${ref.id}`);
}

const after = await db.collection(COLL).get();
console.log(`\n=== 최종 ${after.size}건 ===`);
after.docs
  .map((d) => d.data())
  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  .forEach((x) => console.log(`  [${x.order}] ${x.label} (${x.completionType}) enabled=${x.enabled}`));
