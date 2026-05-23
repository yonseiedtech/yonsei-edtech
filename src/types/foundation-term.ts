import type { ArchiveOperationalMeta } from "./edutech-archive";

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
  variables: "bg-blue-50 text-blue-800 border border-blue-200",
  "research-design": "bg-violet-50 text-violet-800 border border-violet-200",
  "instructional-design": "bg-emerald-50 text-emerald-800 border border-emerald-200",
  "systems-theory": "bg-indigo-50 text-indigo-800 border border-indigo-200",
  measurement: "bg-amber-50 text-amber-800 border border-amber-200",
  "learning-theory": "bg-rose-50 text-rose-800 border border-rose-200",
};

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
  abbreviation?: string; // 약어 (예: "IV", "ISD")
  englishName?: string; // 영문 (예: "Independent Variable")
  category: FoundationTermCategory;
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
