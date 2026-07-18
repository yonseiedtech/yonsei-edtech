import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dataApi } from "@/lib/bkend";
import type { CardNewsSeries } from "@/features/card-news/types";
import type { NewsletterSection } from "@/features/newsletter/newsletter-store";
import type {
  ContentDraft,
  ContentDraftKind,
  ContentDraftStats,
  ContentDraftStatus,
} from "./types";

const TABLE = "content_drafts";

// ── 직렬화 helpers (payload는 JSON 문자열로 저장 — newsletter sections 저장 패턴과 동일) ──

function parseDraft(doc: Record<string, unknown>): ContentDraft {
  const kind = (doc.kind as ContentDraftKind) ?? "newsletter";
  let cardSeries: CardNewsSeries | undefined;
  let sections: NewsletterSection[] | undefined;
  if (typeof doc.payload === "string") {
    try {
      const parsed = JSON.parse(doc.payload);
      if (kind === "card-news") cardSeries = parsed as CardNewsSeries;
      else sections = parsed as NewsletterSection[];
    } catch {
      /* 손상된 payload는 빈 초안으로 취급 */
    }
  }
  return {
    id: doc.id as string,
    seminarId: (doc.seminarId as string) ?? "",
    seminarTitle: (doc.seminarTitle as string) ?? "",
    seminarDate: (doc.seminarDate as string | undefined) ?? undefined,
    kind,
    status: (doc.status as ContentDraftStatus) ?? "pending",
    source: (doc.source as ContentDraft["source"]) ?? "cron",
    stats: (doc.stats as ContentDraftStats | undefined) ?? undefined,
    cardSeries,
    sections,
    reviewQuotes: Array.isArray(doc.reviewQuotes) ? (doc.reviewQuotes as string[]) : undefined,
    createdAt: (doc.createdAt as string) ?? new Date().toISOString(),
    updatedAt: (doc.updatedAt as string | undefined) ?? undefined,
    consumedAt: (doc.consumedAt as string | undefined) ?? undefined,
    consumedBy: (doc.consumedBy as string | undefined) ?? undefined,
  };
}

// ── CRUD ──

/** 검토 대기(pending) 초안 목록 — 최신순 */
export async function fetchPendingDrafts(): Promise<ContentDraft[]> {
  const res = await dataApi.list<Record<string, unknown>>(TABLE, {
    "filter[status]": "pending",
    limit: 100,
  });
  return res.data
    .map(parseDraft)
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export async function getDraft(id: string): Promise<ContentDraft | null> {
  try {
    const doc = await dataApi.get<Record<string, unknown>>(TABLE, id);
    return parseDraft(doc);
  } catch {
    return null;
  }
}

/** 초안을 사용됨(consumed)으로 표시 — 편집기로 보낸 뒤 큐에서 제거 */
export async function markDraftConsumed(id: string, byName?: string): Promise<void> {
  await dataApi.update(TABLE, id, {
    status: "consumed" satisfies ContentDraftStatus,
    consumedAt: new Date().toISOString(),
    ...(byName ? { consumedBy: byName } : {}),
  });
}

/** 초안 보류/삭제 — 큐에서 숨김 */
export async function dismissDraft(id: string): Promise<void> {
  await dataApi.update(TABLE, id, {
    status: "dismissed" satisfies ContentDraftStatus,
  });
}

// ── React Query hooks ──

const QUERY_KEY = ["content-drafts"];

export function usePendingContentDrafts(enabled = true) {
  const { data, isLoading } = useQuery({
    queryKey: [...QUERY_KEY, "pending"],
    queryFn: fetchPendingDrafts,
    staleTime: 1000 * 60,
    enabled,
  });
  return { drafts: data ?? [], isLoading };
}

export function useMarkDraftConsumed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, byName }: { id: string; byName?: string }) => markDraftConsumed(id, byName),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDismissDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dismissDraft(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
