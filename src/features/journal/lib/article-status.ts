import { CAT_BADGE, CAT_BADGE_BORDER } from "@/lib/design-tokens";

// ────────────────────────────────────────────────────────────
// features/journal/lib/article-status.ts
//
// 논문 상태·트랙·가시성 라벨 + 상태 전이 화이트리스트.
// ────────────────────────────────────────────────────────────

import type {
  ArticleReviewStatus,
  ArticleVisibility,
  PublicationType,
  JournalIssueStatus,
  ReviewCommentSeverity,
} from "@/types";

export const PUBLICATION_TYPE_LABELS: Record<PublicationType, string> = {
  journal: "정식 연구지 논문",
  working_paper: "워킹 페이퍼",
  note: "리서치 노트",
};

export const PUBLICATION_TYPE_DESCRIPTIONS: Record<PublicationType, string> = {
  journal:
    "Volume·Issue·DOI 가 부여되는 정식 학술 출판물. 운영진 검수를 거쳐 호수에 배정된 후 발간됩니다.",
  working_paper:
    "호수 없이 개별 출판되는 워킹 페이퍼. 책임연구자 자율 publish 가능 — 검수 절차 없음.",
  note:
    "짧은 리서치 노트·아이디어 메모. 가벼운 공유 목적.",
};

export const REVIEW_STATUS_LABELS: Record<ArticleReviewStatus, string> = {
  draft: "작성 중",
  submitted: "검수 제출",
  under_review: "검수 중",
  revision_requested: "수정 요청",
  accepted: "승인",
  published: "발간 완료",
  withdrawn: "철회",
};

export const REVIEW_STATUS_COLORS: Record<ArticleReviewStatus, string> = {
  draft:              CAT_BADGE.zinc,
  submitted:          CAT_BADGE.blue,
  under_review:       CAT_BADGE.amber,
  revision_requested: CAT_BADGE.orange,
  accepted:           CAT_BADGE.emerald,
  published:          CAT_BADGE.violet,
  withdrawn:          CAT_BADGE.zincDim,
};

export const VISIBILITY_LABELS: Record<ArticleVisibility, string> = {
  private: "팀 전용",
  society: "학회원 공개",
  public: "전체 공개",
};

const VISIBILITY_DESCRIPTIONS: Record<ArticleVisibility, string> = {
  private: "연구팀 멤버만 열람 가능.",
  society: "로그인한 학회 회원만 열람 가능.",
  public: "비로그인 외부 방문자 포함 전체 공개 + Google Scholar 인덱싱.",
};

export const ISSUE_STATUS_LABELS: Record<JournalIssueStatus, string> = {
  preparing: "준비 중",
  published: "발간 완료",
  archived: "보관",
};

export const SEVERITY_LABELS: Record<ReviewCommentSeverity, string> = {
  blocking: "필수 수정",
  major: "주요 수정",
  minor: "사소 수정",
  praise: "칭찬",
};

export const SEVERITY_COLORS: Record<ReviewCommentSeverity, string> = {
  blocking: CAT_BADGE_BORDER.red,
  major:    CAT_BADGE_BORDER.amber,
  minor:    CAT_BADGE_BORDER.blue,
  praise:   CAT_BADGE_BORDER.emerald,
};

/** 검수 워크플로우 상태 전이 화이트리스트. */
const ALLOWED_TRANSITIONS: Record<ArticleReviewStatus, ArticleReviewStatus[]> = {
  draft: ["submitted", "withdrawn"],
  submitted: ["under_review", "draft", "withdrawn"],
  under_review: ["revision_requested", "accepted", "draft", "withdrawn"],
  revision_requested: ["submitted", "draft", "withdrawn"],
  accepted: ["published", "under_review", "withdrawn"],
  published: ["withdrawn"],
  withdrawn: [],
};

export function canTransitionReviewStatus(
  from: ArticleReviewStatus,
  to: ArticleReviewStatus,
): boolean {
  if (from === to) return false;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/** 호수 코드 → "Vol.3 No.1" 형태 */
export function formatIssueCode(volume: number, number: number): string {
  return `Vol.${volume} No.${number}`;
}

/** publishedAt 기준 인용 연도 추출 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function citationYear(publishedAt?: string): number {
  if (!publishedAt) return new Date().getFullYear();
  return new Date(publishedAt).getFullYear();
}
