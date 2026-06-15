// ── 진단평가 (Diagnostic Assessment) — MVP ──
// 대학원생이 아카이브 개념(통계방법·연구방법·교육공학 핵심개념)을 얼마나 아는지
// 객관식으로 진단 → "논문 작성 준비도 / 연구 분석 준비도" 리포트 + 약점 개념을
// 아카이브로 연결한다.
//
// 데이터 모델:
//  - diagnostic_questions: published 공개 read · staff+ write (firestore.rules 와 양쪽 게이트)
//  - diagnostic_results: 본인 read/write
//
// ⚠️ 문항 저작권·정확성 주의: 학자 원설명을 그대로 복제하지 않고 객관적 서술로 변형.
//    정확성이 불확실한 개념은 제외(보수적). 시드는 src/lib/diagnostic-seed.ts 참고.

/** 진단 영역 — 3영역 */
export type DiagnosticArea = "statistics" | "method" | "concept";

export const DIAGNOSTIC_AREA_LABELS: Record<DiagnosticArea, string> = {
  statistics: "통계방법",
  method: "연구방법",
  concept: "교육공학 핵심개념",
};

/** 영역별 출처 아카이브 — 약점 진단 시 어디로 연결할지 안내에 사용 */
export const DIAGNOSTIC_AREA_DESCRIPTIONS: Record<DiagnosticArea, string> = {
  statistics: "ANOVA · 회귀 · 요인분석 · SEM 등 통계기법의 정의와 적용 조건",
  method: "양적 · 질적 · 혼합 연구방법론의 핵심 절차와 특성",
  concept: "자기효능감 · 인지부하 · TPACK 등 교육공학 핵심 이론·구성개념",
};

export const DIAGNOSTIC_AREA_COLORS: Record<DiagnosticArea, string> = {
  statistics: "bg-indigo-50 text-indigo-800 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-800",
  method: "bg-sky-50 text-sky-800 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-800",
  concept: "bg-violet-50 text-violet-800 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-200 dark:border-violet-800",
};

/** 영역 순서 (러너·리포트 렌더 순서) */
export const DIAGNOSTIC_AREA_ORDER: DiagnosticArea[] = [
  "statistics",
  "method",
  "concept",
];

/**
 * 문항 유형. (서술형 등 자동 채점 불가 유형은 포함하지 않는다 — 모두 자동 채점)
 *  - "mcq"      : 4지선다 객관식 (options·answerIndex)
 *  - "ordering" : 절차 순서 정렬 (items 를 정답 순서로 저장, 런타임 셔플 후 재배열)
 *  - "term"     : 단어 맞추기 (prompt 정의 → answer 개념명, acceptedAnswers 동의어)
 *  - "ox"       : 진술 참/거짓 (statement·answerBool)
 *  - "compare"  : 유사개념 구분 — 혼동되는 개념 선지 중 정답 선택 (options·answerIndex, mcq 구조 동일)
 *  - "matching" : 짝짓기 — 왼쪽 개념을 오른쪽 학자/모델에 연결 (leftItems·rightItems·correctMap)
 *  - "scenario" : 적용 — 연구/분석 상황 맥락에서 적절한 방법·기법 선택 (options·answerIndex, mcq 구조 동일)
 *  - "passage"  : 지문 분석 — 짧은 가상 연구 서술(passage)을 읽고 적용 개념·한계 식별 (passage·options·answerIndex, 채점은 mcq 동일)
 *  - "diagram"  : 연구모형 도형 — 인라인 SVG 연구모형(매개·조절·경로·집단설계 등)을 보고 모형 유형·적합 분석 식별 (svg·options·answerIndex, 채점은 mcq 동일)
 * 미지정 시 "mcq" 로 간주(하위호환).
 */
export type DiagnosticQuestionType =
  | "mcq"
  | "ordering"
  | "term"
  | "ox"
  | "compare"
  | "matching"
  | "scenario"
  | "passage"
  | "diagram";

/** 인지수준 태깅 (Bloom 개정 분류 일부) — 리포트에 인지수준별 정답률 표시. */
export type CognitiveLevel = "remember" | "understand" | "apply" | "analyze";

export const COGNITIVE_LEVEL_LABELS: Record<CognitiveLevel, string> = {
  remember: "기억",
  understand: "이해",
  apply: "적용",
  analyze: "분석",
};

export const COGNITIVE_LEVEL_DESCRIPTIONS: Record<CognitiveLevel, string> = {
  remember: "용어·정의·사실의 재인·회상",
  understand: "개념의 의미 파악·해석·구분",
  apply: "실제 연구·분석 상황에 방법·기법 적용",
  analyze: "요소 간 관계 분석·유사개념 변별",
};

export const COGNITIVE_LEVEL_COLORS: Record<CognitiveLevel, string> = {
  remember: "bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
  understand: "bg-teal-50 text-teal-800 border border-teal-200 dark:bg-teal-950/40 dark:text-teal-200 dark:border-teal-800",
  apply: "bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800",
  analyze: "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800",
};

/** 인지수준 순서 (리포트 렌더 순서 — 낮은 수준부터). */
export const COGNITIVE_LEVEL_ORDER: CognitiveLevel[] = [
  "remember",
  "understand",
  "apply",
  "analyze",
];

/** 진단 문항 (7유형 통합). 유형별 채점 필드는 옵셔널이며 type 에 따라 사용한다. */
export interface DiagnosticQuestion {
  id: string;
  /** 문항 유형 — 미지정 시 "mcq" (하위호환) */
  type?: DiagnosticQuestionType;
  /** 관련 아카이브 개념 ID (archive_concepts) — 약점 진단 시 링크. 통계·연구방법 문항은 미연결 가능. */
  conceptId?: string;
  area: DiagnosticArea;
  /** Bloom 인지수준 태깅 (선택). 미지정 시 리포트의 인지수준 집계에서 제외. */
  cognitiveLevel?: CognitiveLevel;
  /** 문항(질문). term·ox 유형은 prompt·statement 를 사용하므로 비워도 됨. */
  question: string;
  /** [mcq·compare·scenario·passage·diagram] 보기 (compare 는 혼동 개념 2~4개) */
  options?: string[];
  /** [mcq·compare·scenario·passage·diagram] 정답 인덱스 */
  answerIndex?: number;
  /** [passage] 지문(짧은 가상 연구 서술). question 위에 본문으로 표시. 실제 논문 복제 금지 — 가상 서술. */
  passage?: string;
  /**
   * [diagram] 인라인 SVG 연구모형 마크업(신뢰된 시드 문자열). question 위에 도형으로 표시.
   * 외부 이미지 금지 — 코드로 그린 박스+화살표. 다크모드 대응 위해 stroke/fill 은 currentColor 사용.
   * dangerouslySetInnerHTML 로 렌더하므로 시드/운영진 검수 문자열만 허용.
   */
  svg?: string;
  /** [ordering] 정답 순서로 저장된 단계 목록. 런타임에 셔플해 제시하고, 사용자가 원래 순서로 맞추면 정답. */
  items?: string[];
  /** [term] 개념의 정의 서술(문제 본문). question 대신 화면에 표시. */
  prompt?: string;
  /** [term] 정답 개념명 */
  answer?: string;
  /** [term] 허용되는 동의어·영문 표기 (정규화 후 매칭) */
  acceptedAnswers?: string[];
  /** [ox] 참/거짓을 판단할 진술. question 대신 화면에 표시. */
  statement?: string;
  /** [ox] 진술의 참/거짓 정답 (true=참, false=거짓) */
  answerBool?: boolean;
  /** [matching] 왼쪽 항목 (개념·이론) */
  leftItems?: string[];
  /** [matching] 오른쪽 항목 (학자·모델·기법) */
  rightItems?: string[];
  /** [matching] 정답 매핑 — 왼쪽 index → 오른쪽 index */
  correctMap?: number[];
  /**
   * [scenario·passage] 졸업생 논문 연계 메타 — 이 문항이 다루는 연구방법 이름.
   * archive_research_methods.name 과 동일하게 두어, 추후 "이 방법을 쓴 졸업생 논문 보기"
   * (/alumni/thesis, AlumniThesis.researchMethodIds 매칭)로 연결할 때 사용한다.
   * 예: "실험연구", "준실험연구", "구조방정식모형(SEM)", "측정도구 개발과 타당화".
   */
  relatedMethodName?: string;
  /** [scenario·passage] 졸업생 논문 연계 메타 — 통계기법 이름(선택, archive_statistical_methods.name 대응). */
  relatedStatMethodName?: string;
  /** 해설 (선택) */
  explanation?: string;
  /** 운영진 검수 후 공개 게이트 */
  published: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

const KNOWN_QUESTION_TYPES: readonly DiagnosticQuestionType[] = [
  "mcq",
  "ordering",
  "term",
  "ox",
  "compare",
  "matching",
  "scenario",
  "passage",
  "diagram",
];

/** 문항 유형 라벨 (개인화 진단 빌더 칩·러너 배지 공용) */
export const DIAGNOSTIC_QUESTION_TYPE_LABELS: Record<DiagnosticQuestionType, string> = {
  mcq: "객관식",
  ordering: "순서 정렬",
  term: "단어 맞추기",
  ox: "참 / 거짓",
  compare: "개념 구분",
  matching: "짝짓기",
  scenario: "상황 적용",
  passage: "지문 분석",
  diagram: "연구모형 도형",
};

/** 문항 유형 표시 순서 (빌더 칩 렌더 순서) */
export const DIAGNOSTIC_QUESTION_TYPE_ORDER: DiagnosticQuestionType[] = [
  "mcq",
  "scenario",
  "passage",
  "compare",
  "ordering",
  "ox",
  "matching",
  "term",
  "diagram",
];

/** 문항 유형 정규화 — 미지정·잘못된 값은 "mcq" 로 폴백 */
export function questionType(q: Pick<DiagnosticQuestion, "type">): DiagnosticQuestionType {
  return q.type && KNOWN_QUESTION_TYPES.includes(q.type) ? q.type : "mcq";
}

/**
 * 사용자 응답 — 유형별로 형태가 다르다.
 *  - mcq·compare·scenario·passage·diagram : number (선택한 보기 인덱스)
 *  - ordering             : string[] (사용자가 재배열한 단계 순서)
 *  - term                 : string (입력한 텍스트)
 *  - ox                   : boolean (참/거짓 선택)
 *  - matching             : number[] (왼쪽 index 순서대로 선택한 오른쪽 index. 미선택은 -1)
 */
export type DiagnosticAnswer = number | string[] | string | boolean | number[];

/** 단어 맞추기 정규화 — trim·소문자·공백/구두점 제거(한글·영문·숫자만 남김) */
export function normalizeTermAnswer(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKC")
    // 한글 자모/완성형, 영문, 숫자만 유지 — 공백·괄호·하이픈·중점 등 모두 제거
    .replace(/[^0-9a-z가-힣ㄱ-ㆎ]/g, "");
}

/**
 * 유형별 채점 — 정답이면 true.
 *  - mcq·compare·scenario·passage·diagram : 선택 인덱스 === answerIndex
 *  - ordering             : 재배열 순서가 정답(items)과 완전일치
 *  - term                 : 정규화 후 answer 또는 acceptedAnswers 중 하나와 일치
 *  - ox                   : 선택한 boolean === answerBool
 *  - matching             : 모든 왼쪽 항목이 correctMap 의 오른쪽 index 와 완전일치
 * 응답이 없거나(undefined) 형태가 맞지 않으면 false(오답 처리).
 */
export function gradeQuestion(
  q: DiagnosticQuestion,
  answer: DiagnosticAnswer | undefined,
): boolean {
  if (answer === undefined) return false;
  switch (questionType(q)) {
    case "ordering": {
      if (!Array.isArray(answer) || !q.items) return false;
      if (answer.length !== q.items.length) return false;
      return q.items.every((it, i) => answer[i] === it);
    }
    case "term": {
      if (typeof answer !== "string") return false;
      const norm = normalizeTermAnswer(answer);
      if (!norm) return false;
      const accepted = [q.answer ?? "", ...(q.acceptedAnswers ?? [])]
        .map(normalizeTermAnswer)
        .filter(Boolean);
      return accepted.includes(norm);
    }
    case "ox":
      return typeof answer === "boolean" && answer === q.answerBool;
    case "matching": {
      if (!Array.isArray(answer) || !q.correctMap || !q.leftItems) return false;
      if (answer.length !== q.correctMap.length) return false;
      // 모든 왼쪽 항목이 정답 오른쪽 index 와 일치해야 정답(부분점수 없음).
      return q.correctMap.every((right, i) => answer[i] === right);
    }
    case "compare":
    case "scenario":
    case "passage":
    case "diagram":
    case "mcq":
    default:
      return typeof answer === "number" && answer === q.answerIndex;
  }
}

/** 영역별·인지수준별 채점 결과 (구조 동일) */
export interface AreaScore {
  correct: number;
  total: number;
}

/** 인지수준별 채점 결과 */
export type CognitiveScore = AreaScore;

/** 진단 결과 (저장) */
export interface DiagnosticResult {
  id: string;
  userId: string;
  /** 영역별 정답 수 / 전체 수 */
  areaScores: Partial<Record<DiagnosticArea, AreaScore>>;
  /** 약점으로 진단된 개념 ID (archive_concepts) — 틀린 문항의 conceptId */
  weakConceptIds: string[];
  /** 약점 개념 표시용 denorm 이름 (리포트 칩 라벨) */
  weakConceptNames?: string[];
  /**
   * 이 회차에서 맞춘 문항 ID 목록 (seed:* 또는 firestore id).
   * 준비도(영역 숙련도) 누적 집계의 핵심 — 여러 회차의 correctQuestionIds 를 합집합(union)해
   * "지금까지 한 번이라도 맞춘 고유 문항 수 / 영역 전체 문항 수" 로 환산한다.
   * 레거시 결과(이 필드 없음)는 누적 분자에 기여하지 않는다(하위호환 — 표시 점수만 보존).
   */
  correctQuestionIds?: string[];
  /**
   * 논문 작성 준비도 0~100.
   * v2(영역 숙련도): (개념 + 연구방법) 영역의 누적 숙련도 평균 = 풀 대비 맞춘 고유 문항 비율.
   * (레거시 결과는 응시 문항 정답률 평균이었다 — 저장 시점 값 그대로 표시.)
   */
  paperReadiness: number;
  /**
   * 연구 분석 준비도 0~100.
   * v2(영역 숙련도): (통계 + 연구방법) 영역의 누적 숙련도 평균.
   */
  analysisReadiness: number;
  createdAt?: string;
  updatedAt?: string;
}

/** 영역별 정답률(0~100) 계산 — total 0 이면 0 반환 */
export function areaScorePercent(score: AreaScore | undefined): number {
  if (!score || score.total === 0) return 0;
  return Math.round((score.correct / score.total) * 100);
}

/**
 * 준비도 환산 (MVP 단순).
 *  - analysisReadiness = (통계 + 연구방법) 정답률 평균
 *  - paperReadiness    = (개념 + 연구방법) 정답률 평균
 * 해당 영역 문항을 풀지 않았으면(total 0) 그 영역은 평균에서 제외한다.
 */
export function computeReadiness(
  areaScores: Partial<Record<DiagnosticArea, AreaScore>>,
): { paperReadiness: number; analysisReadiness: number } {
  const pct = (area: DiagnosticArea): number | null => {
    const s = areaScores[area];
    if (!s || s.total === 0) return null;
    return (s.correct / s.total) * 100;
  };
  const avg = (vals: (number | null)[]): number => {
    const present = vals.filter((v): v is number => v !== null);
    if (present.length === 0) return 0;
    return Math.round(present.reduce((a, b) => a + b, 0) / present.length);
  };
  return {
    analysisReadiness: avg([pct("statistics"), pct("method")]),
    paperReadiness: avg([pct("concept"), pct("method")]),
  };
}

// ── 준비도 v2 — 영역 숙련도(풀 대비 누적 정답) 기반 ──
//
// 사용자 의도: 준비도를 "응시한 문항의 정답률"이 아니라
//  "해당 영역의 전체 문항 풀 대비 한 번이라도 맞춘 고유 문항 비율" 로 정의한다.
//   → 일부만 풀면 낮게 나오고, 추가 평가로 더 맞출수록 % 가 오른다(전체 풀이 시 100% 근접).
//
// 분모 = 영역별 전체 풀 문항 수(diagnostic-seed 또는 Firestore published, 응시 안 한 문항 포함).
// 분자 = 그 영역에서 지금까지 한 번이라도 맞춘 고유 문항 수(여러 회차 union).
//
// 채점 정오답 로직(gradeQuestion)은 불변 — 여기서는 "환산식" 만 바꾼다.

/** 영역별 전체 문항 수(준비도 분모). diagnostic-seed.getSeedPoolCountsByArea() 또는 Firestore 풀 기준. */
export type DiagnosticPoolCounts = Partial<Record<DiagnosticArea, number>>;

/**
 * 영역 숙련도(0~100) — 그 영역에서 맞춘 고유 문항 수 / 전체 풀 문항 수.
 * 풀 수가 0(미상)이면 0 반환. 누적 정답 수가 풀을 넘어도 100 으로 상한.
 */
export function areaMasteryPercent(
  correctCount: number,
  poolCount: number | undefined,
): number {
  if (!poolCount || poolCount <= 0) return 0;
  return Math.min(100, Math.round((correctCount / poolCount) * 100));
}

/**
 * 누적 정답 문항 ID 집합 → 영역별 맞춘 고유 문항 수.
 * @param correctIds 지금까지(여러 회차 union) 맞춘 문항 ID 집합
 * @param areaOfQuestion 문항 ID → 영역 매핑 (풀에서 구성). 매핑 없는 ID 는 무시.
 */
export function countCorrectByArea(
  correctIds: Iterable<string>,
  areaOfQuestion: (id: string) => DiagnosticArea | undefined,
): Record<DiagnosticArea, number> {
  const counts: Record<DiagnosticArea, number> = { statistics: 0, method: 0, concept: 0 };
  const seen = new Set<string>();
  for (const id of correctIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const area = areaOfQuestion(id);
    if (area) counts[area] += 1;
  }
  return counts;
}

/**
 * 준비도 v2 환산 — 영역별 누적 숙련도 평균.
 *  - analysisReadiness = (통계 + 연구방법) 숙련도 평균
 *  - paperReadiness    = (개념 + 연구방법) 숙련도 평균
 * 풀 수가 0 인 영역은 평균에서 제외(데이터 미상). 두 영역 모두 미상이면 0.
 */
export function computeReadinessFromMastery(
  correctCountByArea: Partial<Record<DiagnosticArea, number>>,
  poolCounts: DiagnosticPoolCounts,
): { paperReadiness: number; analysisReadiness: number } {
  const mastery = (area: DiagnosticArea): number | null => {
    const pool = poolCounts[area];
    if (!pool || pool <= 0) return null;
    return areaMasteryPercent(correctCountByArea[area] ?? 0, pool);
  };
  const avg = (vals: (number | null)[]): number => {
    const present = vals.filter((v): v is number => v !== null);
    if (present.length === 0) return 0;
    return Math.round(present.reduce((a, b) => a + b, 0) / present.length);
  };
  return {
    analysisReadiness: avg([mastery("statistics"), mastery("method")]),
    paperReadiness: avg([mastery("concept"), mastery("method")]),
  };
}

// ── 피어 러닝·비교 (M4) — 익명 동료 분포 ──
//
// 사용자 의도: 내 영역별 정답률·준비도가 전체 응시자(익명) 대비 어디쯤인지 보여
//  커뮤니티 동기를 만든다. ⚠️ 개별 회원 식별 금지 — 집계 통계만 노출한다.
//  데이터가 적으면(표본 부족) 분포를 보류하고 안내한다(graceful).
//
// 집계는 서버(Admin SDK)에서만 수행한다(firestore.rules 가 일반 회원의 전체 read 를
//  막으므로). 클라이언트에는 평균·백분위 같은 익명 수치만 전달한다.

/** 피어 비교를 표시하기 위한 최소 표본 수 — 미만이면 분포 보류(개인 추정 방지·노이즈 회피). */
export const PEER_STATS_MIN_SAMPLE = 5;

/** 영역별 익명 동료 분포 — 응시 회원들의 그 영역 최신 정답률(%) 집계. */
export interface PeerAreaStat {
  /** 표본(해당 영역을 응시한 회원) 수 */
  sample: number;
  /** 평균 정답률(0~100) */
  avg: number;
  /** 중앙값 정답률(0~100) */
  median: number;
}

/** 준비도(논문작성/연구분석) 익명 동료 분포. */
export interface PeerReadinessStat {
  sample: number;
  avg: number;
  median: number;
}

/**
 * 진단 피어 비교 통계 (익명 집계만). 서버에서 산출해 클라이언트로 전달.
 * 개별 userId·이름·식별 가능한 원자료는 포함하지 않는다.
 */
export interface DiagnosticPeerStats {
  /** 집계에 포함된 응시 회원 수(회원당 최신 결과 1건 기준). */
  totalMembers: number;
  /** 영역별 정답률 분포 — 표본이 최소치 미만인 영역은 생략(undefined). */
  areas: Partial<Record<DiagnosticArea, PeerAreaStat>>;
  /** 논문 작성 준비도 분포 (표본 부족 시 undefined). */
  paperReadiness?: PeerReadinessStat;
  /** 연구 분석 준비도 분포 (표본 부족 시 undefined). */
  analysisReadiness?: PeerReadinessStat;
}

/**
 * 백분위(percentile) — 내 값이 동료 분포 중 몇 % 이상인지(0~100, 반올림).
 * @param myValue 내 점수(0~100)
 * @param sortedAsc 동료 값들의 오름차순 정렬 배열(내 값 포함 여부 무관)
 * 표본이 비면 null(표시 보류). 동점은 "이하" 비율로 계산(상위 N% 직관).
 */
export function percentileRank(
  myValue: number,
  sortedAsc: number[],
): number | null {
  if (sortedAsc.length === 0) return null;
  let atOrBelow = 0;
  for (const v of sortedAsc) {
    if (v <= myValue) atOrBelow += 1;
    else break; // 정렬되어 있으므로 조기 종료
  }
  return Math.round((atOrBelow / sortedAsc.length) * 100);
}

/** 평균·중앙값 산출 헬퍼 — 빈 배열이면 0. 분포 집계 서버/클라 공용. */
export function avgMedian(values: number[]): { avg: number; median: number } {
  if (values.length === 0) return { avg: 0, median: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const avg = Math.round(sorted.reduce((s, v) => s + v, 0) / sorted.length);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
      : sorted[mid];
  return { avg, median };
}

// ── 후속 단계 TODO (MVP 이후) ──
// TODO(diagnostic): 동적 문항 생성 — 아카이브 개념 description 으로 LLM 객관식 자동 생성.
// TODO(diagnostic): 적응형(adaptive) — 직전 정오답에 따라 다음 문항 난이도/영역 조정 (IRT 기반).
// TODO(diagnostic): 약점 개념별 추천 학습 경로 — 측정도구·졸업생 논문·연구방법 연결 큐레이션.
