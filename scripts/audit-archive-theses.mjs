// 트랙 2 정찰 (read-only) — 졸업생 논문 × 아카이브 현황·연결 무결성 전수 조사
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8'));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();

const [theses, concepts, variables, measurements] = await Promise.all([
  db.collection('alumni_theses').get(),
  db.collection('archive_concepts').get(),
  db.collection('archive_variables').get(),
  db.collection('archive_measurements').get(),
]);

const T = theses.docs.map((d) => ({ id: d.id, ...d.data() }));
const C = concepts.docs.map((d) => ({ id: d.id, ...d.data() }));
const V = variables.docs.map((d) => ({ id: d.id, ...d.data() }));
const M = measurements.docs.map((d) => ({ id: d.id, ...d.data() }));

console.log(`=== 규모 ===`);
console.log(`졸업생 논문 ${T.length} · 개념 ${C.length} · 변인 ${V.length} · 측정도구 ${M.length}`);

// 개념별 이름·별칭
console.log(`\n=== 개념 목록 (이름 | 별칭 | 연결 변인 수 | 논문 연결 수) ===`);
const cIds = new Set(C.map((c) => c.id));
const vIds = new Set(V.map((v) => v.id));
const mIds = new Set(M.map((m) => m.id));
const thesisCountByConcept = new Map();
for (const t of T) for (const cid of t.conceptIds ?? []) thesisCountByConcept.set(cid, (thesisCountByConcept.get(cid) ?? 0) + 1);
for (const c of C) {
  console.log(`- ${c.name} | ${(c.altNames ?? []).join('·') || '-'} | 변인 ${(c.variableIds ?? []).length} | 논문 ${thesisCountByConcept.get(c.id) ?? 0}`);
}

// 논문 연결 현황
const linked = T.filter((t) => (t.conceptIds ?? []).length > 0);
console.log(`\n=== 논문→개념 연결: ${linked.length}/${T.length}편 연결됨 ===`);

// 무결성: 고아 참조
let orphan = 0;
for (const t of T) {
  for (const cid of t.conceptIds ?? []) if (!cIds.has(cid)) { orphan++; console.log(`ORPHAN thesis ${t.id} → concept ${cid}`); }
  for (const vid of t.variableIds ?? []) if (!vIds.has(vid)) { orphan++; console.log(`ORPHAN thesis ${t.id} → variable ${vid}`); }
  for (const mid of t.measurementIds ?? []) if (!mIds.has(mid)) { orphan++; console.log(`ORPHAN thesis ${t.id} → measurement ${mid}`); }
}
for (const c of C) for (const vid of c.variableIds ?? []) if (!vIds.has(vid)) { orphan++; console.log(`ORPHAN concept ${c.name} → variable ${vid}`); }
for (const v of V) {
  for (const mid of v.measurementIds ?? []) if (!mIds.has(mid)) { orphan++; console.log(`ORPHAN variable ${v.name} → measurement ${mid}`); }
  for (const cid of v.conceptIds ?? []) if (!cIds.has(cid)) { orphan++; console.log(`ORPHAN variable ${v.name} → concept ${cid}`); }
}
console.log(`고아 참조 총 ${orphan}건`);

// 역방향 일관성: concept.variableIds ↔ variable.conceptIds
let asym = 0;
const vById = new Map(V.map((v) => [v.id, v]));
for (const c of C) {
  for (const vid of c.variableIds ?? []) {
    const v = vById.get(vid);
    if (v && !(v.conceptIds ?? []).includes(c.id)) { asym++; console.log(`ASYM concept "${c.name}" → variable "${v.name}" (역방향 없음)`); }
  }
}
console.log(`비대칭 연결 ${asym}건`);

// 논문 제목 빈출 키워드 (개념 후보 발굴용) — 2~6자 한글 n-gram 단순 빈도
const stop = new Set(['연구', '관한', '관계', '효과', '영향', '분석', '중심으로', '대한', '활용한', '활용', '기반', '통한', '프로그램', '미치는', '학습', '교육', '대학', '학생', '중학생', '고등학생', '초등학생', '대학생']);
const freq = new Map();
for (const t of T) {
  const words = String(t.title ?? '').split(/[\s:·,()\-]+/).map((w) => w.replace(/[^가-힣A-Za-z]/g, '')).filter((w) => w.length >= 2 && !stop.has(w));
  for (const w of new Set(words)) freq.set(w, (freq.get(w) ?? 0) + 1);
}
const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 60);
console.log(`\n=== 논문 제목 빈출어 TOP 60 (개념 후보 발굴) ===`);
console.log(top.map(([w, n]) => `${w}(${n})`).join(', '));

// 개념명·별칭이 제목에 등장하는데 미연결인 논문 수 (연결 잠재량)
console.log(`\n=== 제목 매칭 기반 연결 잠재량 (개념명/별칭이 제목에 포함되나 미연결) ===`);
for (const c of C) {
  const names = [c.name, ...(c.altNames ?? [])].filter((n) => n && n.length >= 3);
  let candidates = 0;
  for (const t of T) {
    if ((t.conceptIds ?? []).includes(c.id)) continue;
    const title = String(t.title ?? '');
    if (names.some((n) => title.includes(n))) candidates++;
  }
  if (candidates > 0) console.log(`- ${c.name}: +${candidates}편 연결 가능`);
}
