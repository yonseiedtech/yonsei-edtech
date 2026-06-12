// 사이클 43 — 졸업생 논문 구조화: 제목+초록에서 연구대상·변인·통계/연구방법 추출
//  · 한국어 학위논문 제목 관용 패턴("X가 Y에 미치는 영향/효과") + 초록 키워드 휴리스틱
//  · 결과는 thesis.analysis 객체로 저장 (수동 보정 가능, extractedFrom 명시)
// 실행: npx tsx scripts/extract-thesis-analysis.ts          (드라이런 — 요약+샘플)
//       npx tsx scripts/extract-thesis-analysis.ts --full   (드라이런 — 전수 출력)
//       npx tsx scripts/extract-thesis-analysis.ts --apply  (적용)
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const APPLY = process.argv.includes("--apply");
const FULL = process.argv.includes("--full");
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, "base64").toString("utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();

// ── 연구대상 사전 ──
const SUBJECT_RULES: { label: string; re: RegExp }[] = [
  { label: "유아", re: /유아|유치원/ },
  { label: "초등학생", re: /초등학생|초등학교|초등 / },
  { label: "중학생", re: /중학생|중학교/ },
  { label: "고등학생", re: /고등학생|고등학교/ },
  { label: "대학생", re: /대학생|대학 신입생|학부생/ },
  { label: "대학원생", re: /대학원생/ },
  { label: "성인학습자", re: /성인학습자|성인 학습자/ },
  { label: "교사", re: /교사|교원/ },
  { label: "기업 구성원", re: /기업|사내|직원|관리자|사원|회사원|보험설계사|예비관리자/ },
  { label: "군인", re: /군인|병사|장병|군 |부대/ },
  { label: "장애 학습자", re: /장애학생|장애아|특수교육/ },
  { label: "학부모", re: /학부모|부모/ },
];

// ── 통계방법 사전 (가이드 이름과 매칭 가능한 표준명으로) ──
// 사이클 53: 부분 문자열 오탐 수정 — 배열 순서가 우선순위. 구체적 방법(MANCOVA·CFA·로지스틱)을
// 먼저 매칭하고 그 문자열을 소비(마스킹)한 뒤 일반 방법(ANOVA·EFA·다중회귀)을 검사한다.
// 예: "공분산분석"만 쓴 논문이 "분산분석"(ANOVA)으로도 추출되던 문제 해소.
// alternation 은 최장 패턴 우선으로 나열해 소비 시 잔여 부분 문자열이 남지 않게 한다.
const STAT_RULES: { label: string; re: RegExp }[] = [
  { label: "MANCOVA (다변량공분산분석)", re: /다변량\s*공분산\s*분석|다변량\s*공분산|MANCOVA/i },
  { label: "MANOVA (다변량분산분석)", re: /다변량\s*분산\s*분석|다변량\s*분산|MANOVA/i },
  { label: "ANCOVA (공분산분석)", re: /공분산\s*분석|공분산|ANCOVA/i },
  { label: "ANOVA (일원분산분석)", re: /분산\s*분석|ANOVA|일원배치/i },
  { label: "확인적 요인분석(CFA)", re: /확인적\s*요인\s*분석|확인적\s*요인|CFA/i },
  { label: "탐색적 요인분석(EFA)", re: /탐색적\s*요인\s*분석|탐색적\s*요인|요인분석|EFA(?![A-Za-z])/ },
  { label: "로지스틱회귀분석", re: /로지스틱\s*회귀\s*분석|로지스틱\s*회귀|로지스틱/ },
  { label: "다중회귀분석", re: /다중\s*회귀|중다\s*회귀|위계적\s*회귀|회귀분석/ },
  { label: "구조방정식모형(SEM)", re: /구조방정식|경로분석|SEM(?![a-z])/i },
  { label: "t-test (독립/대응표본)", re: /t[-‐]?검정|t[-‐]?test|독립표본|대응표본/i },
  { label: "상관분석", re: /상관분석|상관관계\s*분석/ },
  { label: "카이제곱 검정 (χ²)", re: /카이제곱|교차분석|χ²|x²검정/i },
];

/** 우선순위 매칭 + 소비(마스킹) — 구체적 방법에 쓰인 문자열은 일반 방법 검사에서 제외 */
function extractStatMethods(hay: string): string[] {
  let rest = hay;
  const found: string[] = [];
  for (const r of STAT_RULES) {
    if (r.re.test(rest)) {
      found.push(r.label);
      rest = rest.replace(new RegExp(r.re.source, r.re.flags.replace("g", "") + "g"), " ");
    }
  }
  return found;
}

// ── 연구방법 사전 ──
const METHOD_RULES: { label: string; re: RegExp }[] = [
  { label: "실험연구", re: /무선\s*할당|무작위\s*배정|진실험/ },
  { label: "준실험연구", re: /준실험|비동등|실험집단.{0,14}통제집단|통제집단.{0,14}실험집단|사전[-·]?사후/ },
  { label: "설문조사연구", re: /설문조사|설문지를|조사연구|질문지/ },
  { label: "사례연구", re: /사례\s*연구/ },
  { label: "개발연구", re: /개발\s*연구|프로그램\s*개발|모형\s*개발|설계\s*및\s*개발/ },
  { label: "델파이 기법", re: /델파이/ },
  { label: "근거이론", re: /근거이론/ },
  { label: "액션리서치", re: /실행연구|액션리서치/ },
  { label: "질적연구", re: /심층\s*면담|질적\s*연구|인터뷰를\s*통해/ },
  { label: "메타분석", re: /메타분석/ },
];

/** 제목 관용 패턴에서 독립/종속변인 후보 추출 */
function extractVarsFromTitle(title: string): { independent: string[]; dependent: string[] } {
  const independent: string[] = [];
  const dependent: string[] = [];
  // 패턴 1: "X가|이 Y에 미치는 영향|효과"
  let m = title.match(/^(.*?)(?:이|가)\s+(.+?)에\s*미치는\s*(?:영향|효과)/);
  if (m) {
    independent.push(...splitVars(m[1]));
    dependent.push(...splitVars(m[2]));
    return { independent, dependent };
  }
  // 패턴 2: "X의 Y 효과분석" — X=맥락(교과·현장), Y=처치(독립변인). 종속변인은 제목에 없음.
  m = title.match(/^(.+?)의\s+(.+?)\s*효과\s*(?:분석|검증)/);
  if (m) {
    independent.push(...splitVars(m[2]));
    return { independent, dependent };
  }
  // 패턴 3: "...이 ...에 미치는 영향력 규명"
  m = title.match(/^(.*?)(?:이|가)\s+(.+?)에\s*미치는\s*영향력/);
  if (m) {
    independent.push(...splitVars(m[1]));
    dependent.push(...splitVars(m[2]));
  }
  return { independent, dependent };
}

function clean(s: string): string {
  return s.replace(/^[\s·,]+|[\s·,]+$/g, "").trim();
}

function splitVars(s: string): string[] {
  // 구분자: ·, 쉼표, " 및 ", 그리고 조사 '와/과'는 뒤에 공백이 올 때만 (— "과제"의 '과' 오절단 방지)
  return s
    .split(/·|,|\s및\s|(?<=[가-힣])(?<![교효성결학통문])[과와]\s/)
    .map(clean)
    .map(stripContext)
    .filter((x) => x.length >= 2 && x.length <= 24);
}

/** "…에서 X" 형태의 선행 맥락 제거 — 마지막 '에서 ' 이후만 변인으로 */
function stripContext(s: string): string {
  const idx = s.lastIndexOf("에서 ");
  return idx >= 0 ? s.slice(idx + 3).trim() : s;
}

async function main() {
  const snap = await db.collection("alumni_theses").get();
  const stats = { withAbstract: 0, subjects: 0, vars: 0, stat: 0, method: 0 };
  const rows: { id: string; title: string; analysis: Record<string, unknown> }[] = [];

  let manualSkipped = 0;
  for (const d of snap.docs) {
    const x = d.data() as {
      title?: string;
      abstract?: string;
      keywords?: string[];
      analysis?: { extractedBy?: string };
    };
    // 운영진이 수동 검수한 분석은 재추출로 덮어쓰지 않는다 (사이클 52 검수 루프 보호)
    if (x.analysis?.extractedBy?.startsWith("manual:")) {
      manualSkipped += 1;
      continue;
    }
    const title = String(x.title ?? "");
    const abstract = String(x.abstract ?? "");
    const hay = `${title}\n${abstract}\n${(x.keywords ?? []).join(" ")}`;
    if (abstract.trim().length > 30) stats.withAbstract += 1;

    const subjects = SUBJECT_RULES.filter((r) => r.re.test(hay)).map((r) => r.label);
    const statMethods = extractStatMethods(hay);
    const researchMethods = METHOD_RULES.filter((r) => r.re.test(hay)).map((r) => r.label);
    const { independent, dependent } = extractVarsFromTitle(title);

    if (subjects.length) stats.subjects += 1;
    if (independent.length || dependent.length) stats.vars += 1;
    if (statMethods.length) stats.stat += 1;
    if (researchMethods.length) stats.method += 1;

    const analysis = {
      subjects,
      independent,
      dependent,
      statMethods,
      researchMethods,
      extractedFrom: abstract.trim().length > 30 ? "title+abstract" : "title",
      extractedAt: new Date().toISOString(),
      extractedBy: "system:orchestra-cycle53",
    };
    rows.push({ id: d.id, title, analysis });
  }

  console.log(`=== 추출 요약 (총 ${snap.size}편 · 초록 ${stats.withAbstract}편 · 검수 보호 ${manualSkipped}편) ===`);
  console.log(`연구대상 추출 ${stats.subjects} · 변인 추출 ${stats.vars} · 통계방법 ${stats.stat} · 연구방법 ${stats.method}`);

  const sample = FULL ? rows : rows.slice(0, 20);
  for (const r of sample) {
    const a = r.analysis as { subjects: string[]; independent: string[]; dependent: string[]; statMethods: string[]; researchMethods: string[] };
    console.log(`\n■ ${r.title.slice(0, 52)}`);
    if (a.subjects.length) console.log(`  대상: ${a.subjects.join(", ")}`);
    if (a.independent.length) console.log(`  독립: ${a.independent.join(" / ")}`);
    if (a.dependent.length) console.log(`  종속: ${a.dependent.join(" / ")}`);
    if (a.statMethods.length) console.log(`  통계: ${a.statMethods.join(", ")}`);
    if (a.researchMethods.length) console.log(`  방법: ${a.researchMethods.join(", ")}`);
  }

  if (APPLY) {
    let n = 0;
    for (const r of rows) {
      await db.collection("alumni_theses").doc(r.id).update({ analysis: r.analysis, updatedAt: new Date().toISOString() });
      n += 1;
    }
    console.log(`\n=== 적용 완료 — ${n}편 analysis 저장 ===`);
  } else {
    console.log(`\n=== 드라이런 (${FULL ? "전수" : "샘플 20"}) — --apply 로 저장 ===`);
  }
}

void main();
