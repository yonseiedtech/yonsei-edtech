// ── 교육공학 아카이브 — 연구방법 가이드 (Phase 1) ──
// 양적/질적/혼합 연구방법론을 정리한 가이드. 운영진 검수(published) 게이트 적용.
// Phase 2~3에서 Finder(진단 위저드)·도구 가이드(SPSS/AMOS/R) 연결 예정.

export type ResearchMethodKind = "quantitative" | "qualitative" | "mixed";

export const RESEARCH_METHOD_KIND_LABELS: Record<ResearchMethodKind, string> = {
  quantitative: "양적",
  qualitative: "질적",
  mixed: "혼합",
};

export const RESEARCH_METHOD_KIND_COLORS: Record<ResearchMethodKind, string> = {
  quantitative: "bg-blue-50 text-blue-800 border border-blue-200",
  qualitative: "bg-amber-50 text-amber-800 border border-amber-200",
  mixed: "bg-emerald-50 text-emerald-800 border border-emerald-200",
};

export type ResearchMethodToolGuide = "spss" | "amos" | "r";

export const RESEARCH_METHOD_TOOL_LABELS: Record<ResearchMethodToolGuide, string> = {
  spss: "SPSS",
  amos: "AMOS",
  r: "R",
};

/** 사용 전 기본 가정 (양적 연구 통계 가정 등) */
export interface ResearchMethodAssumption {
  id: string;
  name: string;
  description: string;
  /** 검정 방법 (예: Shapiro-Wilk, Levene 등) */
  howToCheck?: string;
  spssCommand?: string;
  rCommand?: string;
  /** 임계치/판정 기준 (예: p > .05) */
  threshold?: string;
}

/** 연구 절차 단계 */
export interface ResearchMethodProcedureStep {
  id: string;
  step: string;
  detail?: string;
}

/** 참고 자료 */
export interface ResearchMethodReference {
  id: string;
  title: string;
  author?: string;
  year?: number;
  url?: string;
}

export interface ResearchMethod {
  id: string;
  name: string;
  kind: ResearchMethodKind;
  /** 한 줄 요약 (객관적 정의 1~2문장) */
  summary: string;
  /** "쉽게 이해하기" — 통계·수학에 어려움을 느끼는 학습자를 위한 일상 비유 설명. 학술적 책임 회피를 위해 단순화된 비유 수준만 작성. */
  accessibleSummary?: string;
  /** 상세 설명 (긴 텍스트/마크다운) */
  description?: string;
  /** 교육공학 활용 예 */
  educationalTechExamples?: string[];
  procedures?: ResearchMethodProcedureStep[];
  assumptions?: ResearchMethodAssumption[];
  strengths?: string[];
  limitations?: string[];
  /** Phase 3 연결: 관련 도구 가이드 */
  relatedToolGuides?: ResearchMethodToolGuide[];
  references?: ResearchMethodReference[];
  /** 운영자가 큐레이트한 졸업생 학위논문 ID 목록 (alumni_theses) */
  alumniThesisIds?: string[];
  /** Phase 1.5 — 자주 사용되는 통계방법 ID (archive_statistical_methods) 양방향 연계 */
  statisticalMethodIds?: string[];
  /** 운영진 검수 후 공개 게이트 */
  published: boolean;
  curatedBy?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}
