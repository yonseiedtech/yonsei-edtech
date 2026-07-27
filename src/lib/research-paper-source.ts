/**
 * 학술 논문 공식 API 클라이언트 (Sprint 70 — Research Review Agent PoC)
 *
 * 공식·무료 API 만 사용:
 * - OpenAlex: 무제한, concept tagging, 교육공학 분야 식별
 * - Semantic Scholar Graph: 100 req/5min, abstract + TLDR 제공
 *
 * Google Scholar 사용 금지 (공식 API 미제공, ToS 위반 위험).
 * 본 모듈은 abstract 만 사용 (저작권 fair use 범위) — 본문/표/그림 인용 절대 금지.
 */


export interface ResearchPaper {
  /** 식별자 (OpenAlex ID 또는 DOI) */
  id: string;
  /** DOI (있을 때만) — 인용 검증 필수 */
  doi?: string;
  title: string;
  /** 영문 abstract (있을 때만 — fair use 범위 인용) */
  abstract?: string;
  /** Semantic Scholar TLDR (있을 때만) */
  tldr?: string;
  authors: string[];
  year: number;
  /** 학술지 명 */
  venue?: string;
  /** 출처 시스템 */
  source: "openalex" | "semantic-scholar";
  /** 공식 페이지 URL */
  url?: string;
}


