import type { ArchiveOperationalMeta } from "./edutech-archive";
import { CAT_CHIP } from "@/lib/design-tokens";

// ── 교육공학 아카이브 — 기초 용어 가이드 (Phase 1) ──
// 변인·연구설계·교수설계·체제이론·측정·학습이론 기초 용어를 정리한 가이드.
// 운영진 검수(published) 게이트 적용 — firestore.rules 의 archive_foundation_terms 와 양쪽 게이트.
// 사용자가 헷갈리기 쉬운 용어 페어(confusedWith) 를 1급 모델로 명시화.

export type FoundationTermCategory =
  | "variables"
  | "research-design"
  | "instructional-design"
  | "systems-theory"
  | "measurement"
  | "learning-theory";

export const FOUNDATION_TERM_CATEGORY_LABELS: Record<FoundationTermCategory, string> = {
  variables: "변인",
  "research-design": "연구설계",
  "instructional-design": "교수설계",
  "systems-theory": "체제이론",
  measurement: "측정·평가",
  "learning-theory": "학습이론",
};

export const FOUNDATION_TERM_CATEGORY_COLORS: Record<FoundationTermCategory, string> = {
  variables: CAT_CHIP.blue,
  "research-design": CAT_CHIP.violet,
  "instructional-design": CAT_CHIP.emerald,
  "systems-theory": CAT_CHIP.indigo,
  measurement: CAT_CHIP.amber,
  "learning-theory": CAT_CHIP.rose,
};

// ── 하위 카테고리 (사이클 69) ──
// 측정·평가처럼 항목이 몰린 카테고리를 카드 안에서 2차 그룹핑한다.
// 최상위 카테고리는 그대로 두고, subCategory 가 있는 항목만 하위 그룹 헤더로 묶인다.
export type FoundationTermSubCategory =
  | "scale" // 측정 척도·변수 유형
  | "reliability-validity" // 신뢰도·타당도
  | "sampling" // 표집·모집단
  | "statistics"; // 통계 검정·결과 해석

export const FOUNDATION_TERM_SUBCATEGORY_LABELS: Record<FoundationTermSubCategory, string> = {
  scale: "측정 척도·변수 유형",
  "reliability-validity": "신뢰도·타당도",
  sampling: "표집·모집단",
  statistics: "통계 검정·결과 해석",
};

/** 하위 그룹 렌더 순서 (학습 흐름: 무엇으로 재나 → 잘 쟀나 → 누구를 → 어떻게 분석하나) */
export const FOUNDATION_TERM_SUBCATEGORY_ORDER: FoundationTermSubCategory[] = [
  "scale",
  "reliability-validity",
  "sampling",
  "statistics",
];

export interface FoundationTermExample {
  id: string;
  text: string;
}

/** "비슷하지만 다른" 용어 페어 — 사용자가 헷갈리기 쉬운 용어들의 차이점 설명 */
export interface FoundationTermConfusion {
  id: string;
  /** 헷갈리는 다른 용어 (term id 또는 외부 용어 자유 텍스트) */
  confusedTermId?: string; // archive_foundation_terms 의 id (양방향 매핑 시)
  confusedTermLabel?: string; // 또는 자유 텍스트 (외부 용어)
  /** 차이점 설명 — 짧고 명확하게 */
  distinction: string;
}

export interface FoundationTermReference {
  id: string;
  title: string;
  author?: string;
  year?: number;
  url?: string;
}

export interface FoundationTerm extends ArchiveOperationalMeta {
  id: string;
  term: string; // 한국어 용어 (예: "독립변인")
  /** 순화어 — 노션 용어사전집 기준 우리말 다듬은 용어. term 과 병기 표시, 운영진 수정 가능. */
  purifiedName?: string;
  /**
   * AECT 공식 역어 — 『교육공학 용어해설』(Richey 편, 학지사 2020) 표제어 기준.
   * term과 다를 때만 병기 표시.
   */
  aectTerm?: string;
  abbreviation?: string; // 약어 (예: "IV", "ISD")
  englishName?: string; // 영문 (예: "Independent Variable")
  category: FoundationTermCategory;
  /** 하위 그룹 (선택) — 측정·평가 등 항목 과밀 카테고리의 2차 분류 (사이클 69) */
  subCategory?: FoundationTermSubCategory;
  summary: string; // 한 줄 요약
  accessibleSummary?: string; // "쉽게 이해하기" 비유
  definition?: string; // 상세 정의 (마크다운)
  etymology?: string; // 어원·유래 (선택)
  examples?: FoundationTermExample[]; // 사용 예시
  /** "비슷하지만 다른" 용어 페어 */
  confusedWith?: FoundationTermConfusion[];
  relatedTermIds?: string[]; // 같은 컬렉션 내 관련 용어
  relatedConceptIds?: string[]; // 외부 archive_concepts 단방향 chip
  relatedResearchMethodIds?: string[];
  relatedStatisticalMethodIds?: string[];
  references?: FoundationTermReference[];
  published: boolean;
  curatedBy?: string;
  /** Phase 5 — 시드 멱등성 키. `foundation-term:{slug}` 형식. */
  seedKey?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}
