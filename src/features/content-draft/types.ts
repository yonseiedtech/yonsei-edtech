// ── 콘텐츠 자동 초안함 (content_drafts) 데이터 모델 ──
// 세미나 종료(completed) 시 cron이 카드뉴스/학회보 초안을 자동 생성해
// staff 검토 대기 큐(content_drafts)에 적재한다. 자동 발행은 없다(운영진 검수 전제).

import type { CardNewsSeries } from "@/features/card-news/types";
import type { NewsletterSection } from "@/features/newsletter/newsletter-store";

export type ContentDraftKind = "card-news" | "newsletter";
export type ContentDraftStatus = "pending" | "consumed" | "dismissed";
export type ContentDraftSource = "cron" | "manual";

/** 초안 생성 시점의 세미나 집계 (표지/섹션 통계 슬롯용) */
export interface ContentDraftStats {
  attendeeCount: number;
  reviewCount: number;
  /** 참석자 후기 평균 별점 (1~5). 별점이 하나도 없으면 생략. */
  avgRating?: number;
}

/**
 * 파싱된 콘텐츠 초안. Firestore 문서에서는 payload가 JSON 문자열로 저장되며
 * (newsletter sections 저장 패턴과 동일), 클라이언트에서 kind에 따라
 * cardSeries 또는 sections로 역직렬화된다.
 */
export interface ContentDraft {
  id: string;
  seminarId: string;
  seminarTitle: string;
  /** 세미나 일자 (YYYY-MM-DD) */
  seminarDate?: string;
  kind: ContentDraftKind;
  status: ContentDraftStatus;
  source: ContentDraftSource;
  stats?: ContentDraftStats;
  /** kind === "card-news" 일 때의 페이로드 */
  cardSeries?: CardNewsSeries;
  /** kind === "newsletter" 일 때의 페이로드 */
  sections?: NewsletterSection[];
  /** 초안에 포함된 후기 인용 (미리보기·출처 표시용) */
  reviewQuotes?: string[];
  createdAt: string;
  updatedAt?: string;
  consumedAt?: string;
  consumedBy?: string;
}

/** 결정적 문서 ID — 대상 세미나 × kind 당 1회 (멱등 키) */
export function contentDraftId(seminarId: string, kind: ContentDraftKind): string {
  return `${seminarId}__${kind}`;
}
