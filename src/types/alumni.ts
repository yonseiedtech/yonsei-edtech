// ── 졸업생 학위논문 DB (Track 4) — types-domain-split Phase 6 ──

export type GraduationType = "thesis" | "research_report";

export const GRADUATION_TYPE_LABELS: Record<GraduationType, string> = {
  thesis: "논문",
  research_report: "연구보고서",
};

export type ThesisAuthorMappingStatus =
  | "unmapped"   // 회원 매핑 시도 안 함
  | "candidate"  // 자동 추천 후보 있음 (운영진 검토 대기)
  | "verified"   // 운영진/본인 클레임 검증 완료
  | "ambiguous"; // 동명이인 등으로 매핑 불가

export type ThesisSeedSource =
  | "csv_seed_2026_04"
  | "manual"
  | "self_claim";

/** 졸업생 학위논문(또는 연구보고서) 메타데이터 — 회원 미매핑 상태로도 적재 가능 */
export interface AlumniThesis {
  id: string;
  graduationType: GraduationType;
  /** 학위수여년월 YYYY-MM (원본 "2000. 8" → "2000-08") */
  awardedYearMonth: string;
  authorName: string;
  /** 회원 매핑 결과 — 동명이인 위험으로 자동 매핑은 후보까지만 */
  authorUserId?: string;
  authorMappingStatus: ThesisAuthorMappingStatus;
  authorMappingCandidates?: string[];
  title: string;
  titleEn?: string;
  advisorName?: string;
  advisorUserId?: string;
  keywords: string[];
  /** 원본 자유 텍스트 키워드 (정규화 전) */
  keywordsRaw?: string;
  /** 교육공학 아카이브 개념 ID (archive_concepts) */
  conceptIds?: string[];
  /** 교육공학 아카이브 변인 ID (archive_variables) */
  variableIds?: string[];
  /** 교육공학 아카이브 측정도구 ID (archive_measurements) */
  measurementIds?: string[];
  abstract?: string;
  toc?: string;
  dcollectionUrl?: string;
  pdfUrl?: string;
  source: ThesisSeedSource;
  /** 참고문헌 추출 완료 여부 (V1.5+) */
  hasReferenceList: boolean;
  referenceCount?: number;
  /** 초록 임베딩 생성 완료 여부 (V2+) */
  hasEmbedding: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ThesisReferenceSource = "manual" | "grobid" | "crossref" | "openalex";

/** 학위논문 참고문헌 1건 (V1.5+) */
export interface ThesisReference {
  id: string;
  thesisId: string;
  rawCitation: string;
  doi?: string;
  normalizedTitle?: string;
  normalizedAuthors?: string[];
  year?: number;
  source: ThesisReferenceSource;
  createdAt: string;
}

/** 본인 학위논문 클레임 (졸업생 회원이 "이게 내 논문" 클레임) */
export interface ThesisClaim {
  id: string;
  thesisId: string;
  userId: string;
  status: "pending" | "approved" | "rejected";
  evidence?: string;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}
