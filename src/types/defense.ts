// ── 논문 심사 연습 (Thesis Defense Practice) ──
/** 질문 유형 — 답변 흐름·전략을 다르게 잡기 위한 분류 */
export type DefenseQuestionType =
  | "briefing"   // 브리핑 (연구 개요·전체 요약)
  | "identity"   // 연구 정체성 (왜 이 연구인가, 차별점)
  | "theory"     // 이론 이해 (이론적 배경·학자·개념)
  | "method"     // 연구방법론 이해 (설계·도구·표집)
  | "etc";       // 기타

export const DEFENSE_QUESTION_TYPE_LABELS: Record<DefenseQuestionType, string> = {
  briefing: "브리핑",
  identity: "연구 정체성",
  theory: "이론 이해",
  method: "연구방법론 이해",
  etc: "기타",
};

export interface DefenseQuestion {
  id: string;
  question: string;
  /** 사전에 작성한 모범 답변 — STT 전사 결과와 비교 채점 기준 */
  expectedAnswer: string;
  /** 추가 메모/힌트 (선택) */
  note?: string;
  /** 질문 유형 (선택, 기본 'etc') — 운영자/회원이 답변 흐름 설계에 활용 */
  type?: DefenseQuestionType;
}

export type DefensePracticeCategory =
  | "proposal"      // 예비심사
  | "midterm"       // 중간발표
  | "final"         // 최종 심사
  | "qualifying"    // 자격시험
  | "general";      // 일반

export const DEFENSE_CATEGORY_LABELS: Record<DefensePracticeCategory, string> = {
  proposal: "예비심사",
  midterm: "중간발표",
  final: "최종 심사",
  qualifying: "자격시험",
  general: "일반",
};

/** 연습 모드 — 심사 답변(STT vs 모범) | 따라 읽기(문장 단위 통과) */
export type DefensePracticeMode = "answer" | "readalong";

export interface DefensePracticeAttempt {
  /** 시도 시각 ISO */
  at: string;
  /** 모드 (구버전 데이터는 mode 누락 → "answer"로 간주) */
  mode?: DefensePracticeMode;
  /** STT 인식 언어 */
  sttLang?: "ko-KR" | "en-US";
  /** 전체 평균 점수 (answer: 평균 유사도, readalong: 통과율 0~100) */
  averageScore: number;
  /** 답변 모드 결과 — 구버전 호환을 위해 results 키 유지 */
  results: Array<{
    questionId: string;
    transcript: string;
    score: number;
    durationSec?: number;
    /** 모범답변에 있는 학자 중 발화에 언급된 학자 (canonical) */
    scholarsMentioned?: string[];
    /** 모범답변에 등장한 전체 학자 (canonical) */
    scholarsExpected?: string[];
  }>;
  /** 따라 읽기 모드 결과 (mode === "readalong"일 때만) */
  readalongResults?: Array<{
    questionId: string;
    totalSentences: number;
    passedSentences: number;
    difficulty: "easy" | "normal" | "hard";
    durationSec?: number;
  }>;
}

export interface DefensePracticeSet {
  id: string;
  userId: string;
  title: string;
  description?: string;
  category: DefensePracticeCategory;
  /** 연구 주제·논문 제목 등 발표 맥락 */
  topic?: string;
  questions: DefenseQuestion[];
  /** 마지막 연습 결과 (구버전 호환) */
  lastAttempt?: DefensePracticeAttempt;
  /** 시도 이력 (시간 내림차순, 최대 50건 유지) */
  attempts?: DefensePracticeAttempt[];
  /** 누적 시도 횟수 */
  attemptCount?: number;
  createdAt: string;
  updatedAt: string;
}

/** 운영 콘솔에서 관리자가 사전 등록하는 질문 템플릿 — 회원이 연습 세트 생성 시 import */
export interface DefenseQuestionTemplate {
  id: string;
  /** 템플릿 이름 (예: "석사 예비심사 표준 질문 20선") */
  name: string;
  category: DefensePracticeCategory;
  description?: string;
  questions: DefenseQuestion[];
  /** 비활성화 시 회원 화면에서 숨김 */
  active: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
