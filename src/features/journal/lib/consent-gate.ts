// ────────────────────────────────────────────────────────────
// features/journal/lib/consent-gate.ts
//
// 저자 동의 게이트 — 정식 연구지 출판 전 모든 저자가 저자순서·CRediT·ORCID 에
// 동의해야 submitted 상태로 전이 가능. 저자권 분쟁 사전 차단.
// ────────────────────────────────────────────────────────────

import type {
  ArticleAuthorSnapshot,
  AuthorConsent,
  ResearchJournalArticle,
} from "@/types";

export interface ConsentGateResult {
  /** submitted 전이 가능 여부 */
  canSubmit: boolean;
  /** 진행률 (0~100) */
  progress: number;
  /** 동의한 저자 수 */
  agreed: number;
  /** 거부한 저자 수 (1명이라도 있으면 submitted 불가) */
  rejected: number;
  /** 응답 대기 중인 저자 수 */
  pending: number;
  /** 전체 저자 수 */
  total: number;
  /** UI 표시용 사유 */
  reason?: string;
}

export function evaluateConsentGate(article: ResearchJournalArticle): ConsentGateResult {
  const authors = article.authors ?? [];
  const consents = article.authorConsents ?? {};
  const total = authors.length;

  if (total === 0) {
    return {
      canSubmit: false,
      progress: 0,
      agreed: 0,
      rejected: 0,
      pending: 0,
      total: 0,
      reason: "저자가 1명 이상 등록되어야 합니다.",
    };
  }

  let agreed = 0;
  let rejected = 0;
  let pending = 0;

  for (const a of authors) {
    const c: AuthorConsent | undefined = consents[a.userId];
    if (!c || c.status === "pending") {
      pending++;
    } else if (c.status === "agreed") {
      agreed++;
    } else if (c.status === "rejected") {
      rejected++;
    }
  }

  const progress = total > 0 ? Math.round((agreed / total) * 100) : 0;

  if (article.publicationType !== "journal") {
    // 워킹 페이퍼·노트는 동의 게이트 없음 — leader 자율 publish
    return {
      canSubmit: true,
      progress,
      agreed,
      rejected,
      pending,
      total,
    };
  }

  if (rejected > 0) {
    return {
      canSubmit: false,
      progress,
      agreed,
      rejected,
      pending,
      total,
      reason: `저자 중 ${rejected}명이 동의를 거부했습니다. 협의 후 재요청하세요.`,
    };
  }

  if (pending > 0) {
    return {
      canSubmit: false,
      progress,
      agreed,
      rejected,
      pending,
      total,
      reason: `${pending}명의 저자가 아직 동의 응답을 하지 않았습니다.`,
    };
  }

  return {
    canSubmit: true,
    progress,
    agreed,
    rejected,
    pending,
    total,
  };
}

/** 저자 정보가 출판 마법사 진입 자격을 갖추는지 (이름·소속 필수) */
export function isAuthorComplete(a: ArticleAuthorSnapshot): boolean {
  return !!a.displayName?.trim() && !!a.affiliation?.trim();
}

/** 모든 저자가 완전한 정보를 갖췄는지 */
export function areAllAuthorsComplete(authors: ArticleAuthorSnapshot[]): boolean {
  if (authors.length === 0) return false;
  return authors.every(isAuthorComplete);
}
