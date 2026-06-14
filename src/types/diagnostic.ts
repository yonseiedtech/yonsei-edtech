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
  statistics: "bg-indigo-50 text-indigo-800 border border-indigo-200",
  method: "bg-sky-50 text-sky-800 border border-sky-200",
  concept: "bg-violet-50 text-violet-800 border border-violet-200",
};

/** 영역 순서 (러너·리포트 렌더 순서) */
export const DIAGNOSTIC_AREA_ORDER: DiagnosticArea[] = [
  "statistics",
  "method",
  "concept",
];

/**
 * 문항 유형.
 *  - "mcq"      : 4지선다 객관식 (options·answerIndex)
 *  - "ordering" : 절차 순서 정렬 (items 를 정답 순서로 저장, 런타임 셔플 후 재배열)
 *  - "term"     : 단어 맞추기 (prompt 정의 → answer 개념명, acceptedAnswers 동의어)
 * 미지정 시 "mcq" 로 간주(하위호환).
 */
export type DiagnosticQuestionType = "mcq" | "ordering" | "term";

/** 진단 문항 (3유형 통합). 유형별 채점 필드는 옵셔널이며 type 에 따라 사용한다. */
export interface DiagnosticQuestion {
  id: string;
  /** 문항 유형 — 미지정 시 "mcq" (하위호환) */
  type?: DiagnosticQuestionType;
  /** 관련 아카이브 개념 ID (archive_concepts) — 약점 진단 시 링크. 통계·연구방법 문항은 미연결 가능. */
  conceptId?: string;
  area: DiagnosticArea;
  /** 문항(질문). term 유형은 prompt 를 사용하므로 비워도 됨. */
  question: string;
  /** [mcq] 보기 4개 */
  options?: string[];
  /** [mcq] 정답 인덱스 (0~3) */
  answerIndex?: number;
  /** [ordering] 정답 순서로 저장된 단계 목록. 런타임에 셔플해 제시하고, 사용자가 원래 순서로 맞추면 정답. */
  items?: string[];
  /** [term] 개념의 정의 서술(문제 본문). question 대신 화면에 표시. */
  prompt?: string;
  /** [term] 정답 개념명 */
  answer?: string;
  /** [term] 허용되는 동의어·영문 표기 (정규화 후 매칭) */
  acceptedAnswers?: string[];
  /** 해설 (선택) */
  explanation?: string;
  /** 운영진 검수 후 공개 게이트 */
  published: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** 문항 유형 정규화 — 미지정·잘못된 값은 "mcq" 로 폴백 */
export function questionType(q: Pick<DiagnosticQuestion, "type">): DiagnosticQuestionType {
  return q.type === "ordering" || q.type === "term" ? q.type : "mcq";
}

/**
 * 사용자 응답 — 유형별로 형태가 다르다.
 *  - mcq      : number (선택한 보기 인덱스)
 *  - ordering : string[] (사용자가 재배열한 단계 순서)
 *  - term     : string (입력한 텍스트)
 */
export type DiagnosticAnswer = number | string[] | string;

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
 *  - mcq      : 선택 인덱스 === answerIndex
 *  - ordering : 재배열 순서가 정답(items)과 완전일치
 *  - term     : 정규화 후 answer 또는 acceptedAnswers 중 하나와 일치
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
    case "mcq":
    default:
      return typeof answer === "number" && answer === q.answerIndex;
  }
}

/** 영역별 채점 결과 */
export interface AreaScore {
  correct: number;
  total: number;
}

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
  /** 논문 작성 준비도 0~100 (개념 + 연구방법 정답률 평균) */
  paperReadiness: number;
  /** 연구 분석 준비도 0~100 (통계 + 연구방법 정답률 평균) */
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

// ── 후속 단계 TODO (MVP 이후) ──
// TODO(diagnostic): 동적 문항 생성 — 아카이브 개념 description 으로 LLM 객관식 자동 생성.
// TODO(diagnostic): 적응형(adaptive) — 직전 정오답에 따라 다음 문항 난이도/영역 조정 (IRT 기반).
// TODO(diagnostic): 약점 개념별 추천 학습 경로 — 측정도구·졸업생 논문·연구방법 연결 큐레이션.
