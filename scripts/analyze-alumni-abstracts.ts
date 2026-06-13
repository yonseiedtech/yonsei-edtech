// 사이클 70 — 졸업생 학위논문 초록 구조 분석 (작성 탭 데이터 기반 도움말용)
//  · alumni_theses.abstract 전수 분석 → 분량·문장수·단락 구성 패턴·도입/마무리 관용구 집계
//  · 출력 통계를 바탕으로 AbstractPanel 도움말 문구를 작성한다 (분석 전용, 쓰기 없음)
// 실행: npx tsx scripts/analyze-alumni-abstracts.ts
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, "base64").toString("utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();

function median(arr: number[]): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

// 한국어 문장 분리 — "다." 류 종결 + 마침표 (소수점 보호)
function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[다음됨함임략))])\.\s+|(?<=[가-힣])\.\s+(?=[가-힣A-Z])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);
}

// 구조 마커 — 초록 단락이 통상 담는 5요소
const MARKERS: { key: string; label: string; re: RegExp }[] = [
  { key: "background", label: "연구 배경·필요성", re: /필요성|중요성|대두|증가하|확산|문제로|주목받|요구된다|급변|배경/ },
  { key: "purpose", label: "연구 목적·문제", re: /목적은|목적으로|목적이|규명하|밝히는\s*것|알아보|검증하(고자|는|기)|탐색하(고자|는)|확인하(고자|기)|본\s*연구는/ },
  { key: "method", label: "연구 방법·대상", re: /대상으로|참여자|표본|설문|면담|실험|분석을\s*실시|분석하였|자료를\s*수집|측정하|척도를/ },
  { key: "results", label: "연구 결과", re: /결과는|나타났다|유의한|유의하게|밝혀졌다|확인되었|차이가\s*있|효과가\s*있|관계가\s*있|드러났다/ },
  { key: "implication", label: "결론·시사점·제언", re: /시사점|제언|함의|기여|의의|제안한다|논의하였|결론적으로|향후|제공한다/ },
];

async function main() {
  const snap = await db.collection("alumni_theses").get();
  const lens: number[] = [];
  const sentCounts: number[] = [];
  const kwCounts: number[] = [];
  const markerHits: Record<string, number> = {};
  const orderOpens: Record<string, number> = {}; // 도입 마커
  const orderCloses: Record<string, number> = {}; // 마무리 마커
  let withAbstract = 0;
  let total = 0;

  for (const d of snap.docs) {
    total += 1;
    const x = d.data() as { abstract?: string; keywords?: string[] };
    const ab = (x.abstract ?? "").trim();
    if (ab.length < 80) continue;
    withAbstract += 1;
    lens.push(ab.length);
    const ss = sentences(ab);
    sentCounts.push(ss.length);
    kwCounts.push((x.keywords ?? []).length);

    // 마커 등장
    const present: string[] = [];
    for (const m of MARKERS) {
      if (m.re.test(ab)) {
        markerHits[m.key] = (markerHits[m.key] ?? 0) + 1;
        present.push(m.key);
      }
    }
    // 도입부(첫 2문장)·마무리(마지막 2문장)에서 어떤 마커가 잡히나
    const head = ss.slice(0, 2).join(" ");
    const tail = ss.slice(-2).join(" ");
    for (const m of MARKERS) {
      if (m.re.test(head)) orderOpens[m.key] = (orderOpens[m.key] ?? 0) + 1;
      if (m.re.test(tail)) orderCloses[m.key] = (orderCloses[m.key] ?? 0) + 1;
    }
  }

  const pct = (n: number) => `${Math.round((n / withAbstract) * 100)}%`;
  console.log(`=== 졸업생 초록 분석 (전체 ${total}편 · 분석 대상 ${withAbstract}편) ===\n`);
  console.log(`■ 분량(자): 최소 ${Math.min(...lens)} · 중앙값 ${median(lens)} · 최대 ${Math.max(...lens)} · 평균 ${Math.round(lens.reduce((a, b) => a + b, 0) / lens.length)}`);
  console.log(`■ 문장 수: 최소 ${Math.min(...sentCounts)} · 중앙값 ${median(sentCounts)} · 최대 ${Math.max(...sentCounts)}`);
  console.log(`■ 키워드 수: 중앙값 ${median(kwCounts)} (보유 ${kwCounts.filter((n) => n > 0).length}편)\n`);
  console.log("■ 구조 요소 포함률:");
  for (const m of MARKERS) console.log(`   ${m.label}: ${markerHits[m.key] ?? 0}편 (${pct(markerHits[m.key] ?? 0)})`);
  console.log("\n■ 도입부(첫 2문장) 주요 요소:");
  for (const m of MARKERS) if (orderOpens[m.key]) console.log(`   ${m.label}: ${pct(orderOpens[m.key])}`);
  console.log("\n■ 마무리(마지막 2문장) 주요 요소:");
  for (const m of MARKERS) if (orderCloses[m.key]) console.log(`   ${m.label}: ${pct(orderCloses[m.key])}`);

  // 5요소 모두 포함하는 '완결형' 비율
  const full = snap.docs.filter((d) => {
    const ab = ((d.data() as { abstract?: string }).abstract ?? "").trim();
    if (ab.length < 80) return false;
    return MARKERS.every((m) => m.re.test(ab));
  }).length;
  console.log(`\n■ 5요소(배경·목적·방법·결과·시사점) 모두 포함: ${full}편 (${pct(full)})`);
}
void main();
