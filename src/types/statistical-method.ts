import type { ArchiveOperationalMeta } from "./edutech-archive";
import { CAT_CHIP } from "@/lib/design-tokens";

// ── 교육공학 아카이브 — 통계방법 가이드 (Phase 1.5) ──
// 연구방법(research-methods)과 양방향 연계되는 1급 엔티티.
// ANOVA/회귀/요인분석/SEM 등 통계기법을 가정·절차·구문·비교 프로파일과 함께 관리.
// 운영진 검수(published) 게이트 — firestore.rules 의 archive_statistical_methods 와 양쪽 게이트.

export type StatisticalMethodCategory =
  | "basic"
  | "anova_family"
  | "regression"
  | "factor"
  | "sem"
  | "nonparametric"
  | "mediation_moderation"
  | "multilevel"
  | "measurement"
  | "other";

export const STATISTICAL_METHOD_CATEGORY_LABELS: Record<StatisticalMethodCategory, string> = {
  basic: "기초·상관",
  anova_family: "ANOVA 계열",
  regression: "회귀분석",
  factor: "요인분석",
  sem: "구조방정식(SEM)",
  nonparametric: "비모수",
  mediation_moderation: "매개·조절",
  multilevel: "다층모형",
  measurement: "측정·타당도",
  other: "기타",
};

export const STATISTICAL_METHOD_CATEGORY_COLORS: Record<StatisticalMethodCategory, string> = {
  basic: CAT_CHIP.teal,
  anova_family: CAT_CHIP.blue,
  regression: CAT_CHIP.violet,
  factor: CAT_CHIP.emerald,
  sem: CAT_CHIP.indigo,
  nonparametric: CAT_CHIP.amber,
  mediation_moderation: CAT_CHIP.rose,
  multilevel: CAT_CHIP.cyan,
  measurement: CAT_CHIP.purple,
  other: CAT_CHIP.slate,
};

/** 비교 프로파일 — 동일 데이터 대안 통계방법 비교표에서 행으로 사용 */
export interface ComparisonProfile {
  /** 분석 초점 (예: "공변량 통제 후 집단 평균 차이") */
  focus?: string;
  /** 종속변수 형태 (예: "연속형 1개") */
  dependentVariable?: string;
  /** 독립변수 형태 (예: "범주형 1~K개") */
  independentVariable?: string;
  /** 최소 표본 크기 권장 (예: "셀당 20명 이상 권장") */
  minSampleSize?: string;
  /** 핵심 가정 라벨 목록 */
  keyAssumptions?: string[];
  /** 한 줄 강점 */
  strengthOneliner?: string;
  /** 한 줄 한계 */
  limitationOneliner?: string;
  /** 의사결정 분기 — 집단 수 */
  groupCount?: "single" | "two" | "three_or_more" | "varies";
  /** 의사결정 분기 — 종속변수 개수 */
  dependentVariableCount?: "one" | "two_or_more" | "varies";
  /** 의사결정 분기 — 독립변수 개수 */
  independentVariableCount?: "one" | "two_or_more" | "varies";
  /** 의사결정 분기 — 설계 유형 */
  designType?:
    | "between_subjects"
    | "within_subjects"
    | "mixed"
    | "single_sample"
    | "varies";
}

export const GROUP_COUNT_LABELS: Record<
  NonNullable<ComparisonProfile["groupCount"]>,
  string
> = {
  single: "1집단",
  two: "2집단",
  three_or_more: "3집단 이상",
  varies: "유연/상황별",
};

export const DV_COUNT_LABELS: Record<
  NonNullable<ComparisonProfile["dependentVariableCount"]>,
  string
> = {
  one: "1개",
  two_or_more: "2개 이상",
  varies: "유연",
};

export const IV_COUNT_LABELS: Record<
  NonNullable<ComparisonProfile["independentVariableCount"]>,
  string
> = {
  one: "1개",
  two_or_more: "2개 이상",
  varies: "유연",
};

export const DESIGN_TYPE_LABELS: Record<
  NonNullable<ComparisonProfile["designType"]>,
  string
> = {
  between_subjects: "피험자간",
  within_subjects: "피험자내",
  mixed: "혼합 (간+내)",
  single_sample: "단일표본",
  varies: "유연/상황별",
};

/** 동일 데이터로 시도해볼 수 있는 다른 통계방법 추천 */
export interface StatisticalMethodAlternative {
  /** archive_statistical_methods id */
  methodId: string;
  /** 추천 사유 (예: "공변량을 통제하고 싶을 때") */
  reason: string;
}

/** 사용 전 기본 가정 */
export interface StatisticalAssumption {
  id: string;
  name: string;
  description: string;
  /** 검정 방법 (예: Shapiro-Wilk, Levene) */
  howToCheck?: string;
  spssCommand?: string;
  rCommand?: string;
  /** 임계치/판정 기준 */
  threshold?: string;
  /** 가정이 성립하지 않을 때의 표준 대처 (Welch 보정·비모수 대체·robust 추정 등) */
  ifViolated?: string;
}

/** 분석 절차 단계 */
export interface StatisticalProcedureStep {
  id: string;
  step: string;
  detail?: string;
}

/** 참고 자료 */
export interface StatisticalReference {
  id: string;
  title: string;
  author?: string;
  year?: number;
  url?: string;
}

export interface StatisticalMethod extends ArchiveOperationalMeta {
  id: string;
  name: string;
  /** 순화어 — 노션 용어사전집 기준 우리말 다듬은 용어. name 과 병기 표시, 운영진 수정 가능. */
  purifiedName?: string;
  category: StatisticalMethodCategory;
  /** 객관적 정의 1~2문장 */
  summary: string;
  /** "쉽게 이해하기" — 통계·수학에 어려움을 느끼는 학습자를 위한 일상 비유 설명. 학술적 책임 회피를 위해 단순화된 비유 수준만 작성. */
  accessibleSummary?: string;
  /** 상세 설명 (마크다운/긴 텍스트) */
  description?: string;
  /** 언제 사용하는가 */
  whenToUse?: string;
  assumptions?: StatisticalAssumption[];
  procedure?: StatisticalProcedureStep[];
  spssCommand?: string;
  amosCommand?: string;
  rCommand?: string;
  /** 결과 해석 핵심 포인트 */
  interpretationKeys?: string[];
  /** 비교표용 프로파일 (대안 비교 시 행 = 차원·열 = 방법) */
  comparisonProfile?: ComparisonProfile;
  /** 동일 데이터로 가능한 대안 통계방법 */
  alternativeMethods?: StatisticalMethodAlternative[];
  /** 양방향 연계: 관련 연구방법 ID (archive_research_methods) */
  relatedResearchMethodIds?: string[];
  /** 운영자가 큐레이트한 졸업생 학위논문 ID */
  alumniThesisIds?: string[];
  /** 통계 SW 실습 절차 (사이클 65 — jamovi 등 무료 도구의 메뉴 경로·옵션 단계) */
  toolGuides?: { tool: string; steps: string[]; note?: string }[];
  references?: StatisticalReference[];
  /** 운영진 검수 후 공개 게이트 */
  published: boolean;
  curatedBy?: string;
  /** Phase 5 — 시드 멱등성 키. `statistical-method:{slug}` 형식. */
  seedKey?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}
