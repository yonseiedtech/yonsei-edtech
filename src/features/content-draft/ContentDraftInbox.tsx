"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Images,
  Newspaper,
  Eye,
  Pencil,
  Trash2,
  Sparkles,
  Users,
  MessageSquareQuote,
  Star,
  Loader2,
  CalendarDays,
} from "lucide-react";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  usePendingContentDrafts,
  useMarkDraftConsumed,
  useDismissDraft,
} from "./content-draft-store";
import type { ContentDraft } from "./types";

function StatChips({ draft }: { draft: ContentDraft }) {
  const s = draft.stats;
  if (!s) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {s.attendeeCount > 0 && (
        <Badge variant="secondary" className="gap-1 text-[10px]">
          <Users className="h-3 w-3" />
          {s.attendeeCount}명 참석
        </Badge>
      )}
      {s.reviewCount > 0 && (
        <Badge variant="secondary" className="gap-1 text-[10px]">
          <MessageSquareQuote className="h-3 w-3" />
          후기 {s.reviewCount}건
        </Badge>
      )}
      {typeof s.avgRating === "number" && s.avgRating > 0 && (
        <Badge variant="secondary" className="gap-1 text-[10px]">
          <Star className="h-3 w-3" />
          {s.avgRating.toFixed(1)}
        </Badge>
      )}
    </div>
  );
}

function DraftPreview({ draft }: { draft: ContentDraft }) {
  if (draft.kind === "card-news") {
    const cards = draft.cardSeries?.cards ?? [];
    return (
      <div className="space-y-2">
        {cards.map((c, i) => (
          <div key={c.id} className="rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">{i + 1}</span>
              <Badge variant="outline" className="text-[10px]">
                {c.kind}
              </Badge>
              {c.badge && <span className="text-[11px] text-muted-foreground">{c.badge}</span>}
            </div>
            {c.title && (
              <p className="mt-1 whitespace-pre-wrap text-sm font-semibold">{c.title}</p>
            )}
            {c.body && <p className="mt-0.5 text-xs text-muted-foreground">{c.body}</p>}
            {c.bullets && c.bullets.length > 0 && (
              <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
                {c.bullets.map((b, bi) => (
                  <li key={bi}>{b}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    );
  }
  const sections = draft.sections ?? [];
  return (
    <div className="space-y-2">
      {sections.map((sec, i) => (
        <div key={sec.id} className="rounded-lg border bg-muted/20 p-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">{i + 1}</span>
            <Badge variant="outline" className="text-[10px]">
              {sec.type}
            </Badge>
            <span className="truncate text-sm font-semibold">{sec.title}</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
            {sec.content}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function ContentDraftInbox() {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const { drafts, isLoading } = usePendingContentDrafts();
  const consumeMutation = useMarkDraftConsumed();
  const dismissMutation = useDismissDraft();
  const [previewDraft, setPreviewDraft] = useState<ContentDraft | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  async function sendToEditor(draft: ContentDraft) {
    setActingId(draft.id);
    try {
      await consumeMutation.mutateAsync({ id: draft.id, byName: currentUser?.name });
      if (draft.kind === "card-news") {
        router.push(`/console/card-news/new/edit?draft=${encodeURIComponent(draft.id)}`);
      } else {
        router.push(`/console/newsletter?draft=${encodeURIComponent(draft.id)}`);
      }
    } catch {
      toast.error("편집기로 보내지 못했습니다. 다시 시도해 주세요.");
      setActingId(null);
    }
  }

  async function handleDismiss(draft: ContentDraft) {
    if (!confirm(`"${draft.seminarTitle}" ${draft.kind === "card-news" ? "카드뉴스" : "학회보"} 초안을 보류하시겠습니까?`)) {
      return;
    }
    setActingId(draft.id);
    try {
      await dismissMutation.mutateAsync(draft.id);
      toast.success("초안을 보류했습니다.");
    } catch {
      toast.error("보류에 실패했습니다.");
    } finally {
      setActingId(null);
    }
  }

  const cardCount = drafts.filter((d) => d.kind === "card-news").length;
  const newsletterCount = drafts.filter((d) => d.kind === "newsletter").length;

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={Sparkles}
        title="콘텐츠 초안함"
        description="종료된 세미나에서 자동 생성된 카드뉴스·학회보 초안입니다. 검토 후 편집기로 보내 발행하세요."
      />

      {!isLoading && drafts.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "검토 대기", value: drafts.length },
            { label: "카드뉴스", value: cardCount },
            { label: "학회보", value: newsletterCount },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border bg-card p-4">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="mt-1 text-lg font-bold">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            불러오는 중…
          </CardContent>
        </Card>
      ) : drafts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
            <Sparkles className="h-10 w-10 opacity-40" />
            <p className="text-sm">검토 대기 중인 자동 초안이 없습니다.</p>
            <p className="text-xs">
              세미나가 종료되면 카드뉴스·학회보 초안이 자동으로 이곳에 적재됩니다.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {drafts.map((draft) => {
            const isCard = draft.kind === "card-news";
            const Icon = isCard ? Images : Newspaper;
            const busy = actingId === draft.id;
            const count = isCard
              ? draft.cardSeries?.cards.length ?? 0
              : draft.sections?.length ?? 0;
            return (
              <Card key={draft.id} className="flex flex-col">
                <CardContent className="flex flex-1 flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant={isCard ? "default" : "secondary"} className="gap-1">
                      <Icon className="h-3 w-3" />
                      {isCard ? "카드뉴스" : "학회보"}
                    </Badge>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="h-3 w-3" />
                      {draft.seminarDate ?? draft.createdAt.slice(0, 10)}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold leading-snug">{draft.seminarTitle}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {isCard ? `${count}장 슬라이드` : `${count}개 섹션`}
                      {draft.reviewQuotes && draft.reviewQuotes.length > 0
                        ? ` · 후기 인용 ${draft.reviewQuotes.length}건 포함`
                        : ""}
                    </p>
                  </div>

                  <StatChips draft={draft} />

                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPreviewDraft(draft)}
                      disabled={busy}
                    >
                      <Eye className="mr-1 h-3.5 w-3.5" />
                      미리보기
                    </Button>
                    <Button size="sm" onClick={() => sendToEditor(draft)} disabled={busy}>
                      {busy ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                      )}
                      편집기로 보내기
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDismiss(draft)}
                      disabled={busy}
                      className="text-muted-foreground hover:text-destructive"
                      title="보류"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!previewDraft} onOpenChange={(o) => !o && setPreviewDraft(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewDraft?.kind === "card-news" ? (
                <Images className="h-4 w-4" />
              ) : (
                <Newspaper className="h-4 w-4" />
              )}
              {previewDraft?.seminarTitle} — 초안 미리보기
            </DialogTitle>
          </DialogHeader>
          {previewDraft && <DraftPreview draft={previewDraft} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDraft(null)}>
              닫기
            </Button>
            {previewDraft && (
              <Button
                onClick={() => {
                  const d = previewDraft;
                  setPreviewDraft(null);
                  void sendToEditor(d);
                }}
              >
                <Pencil className="mr-1 h-3.5 w-3.5" />
                편집기로 보내기
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
