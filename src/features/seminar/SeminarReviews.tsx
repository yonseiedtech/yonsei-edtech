"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reviewsApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Trash2, Star, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Seminar, SeminarReview } from "@/types";

type ReviewSubTab = "speaker" | "staff" | "attendee";

const SUB_TABS: { value: ReviewSubTab; label: string }[] = [
  { value: "speaker", label: "연사 후기" },
  { value: "staff", label: "운영진 후기" },
  { value: "attendee", label: "참석자 후기" },
];

function StarRating({
  value,
  onChange,
  readonly,
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(n)}
          className={readonly ? "cursor-default" : "cursor-pointer"}
        >
          <Star
            size={16}
            className={
              n <= value
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/30"
            }
          />
        </button>
      ))}
    </div>
  );
}

interface Props {
  seminar: Seminar;
}

export default function SeminarReviews({ seminar }: Props) {
  const [subTab, setSubTab] = useState<ReviewSubTab>("speaker");
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  const isStaff = isAtLeast(user, "staff");
  const isAttendee = user ? seminar.attendeeIds.includes(user.id) : false;

  const { data: allReviews = [] } = useQuery({
    queryKey: ["reviews", seminar.id],
    queryFn: async () => {
      const res = await fetch(`/api/reviews?seminarId=${seminar.id}&mode=list`);
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data ?? []) as SeminarReview[];
    },
  });

  // 서브탭별 필터링 (공개 + 게시된 것만)
  const filteredReviews = allReviews.filter((r) => {
    if ((r.status ?? "published") === "hidden") return false;
    if (r.type === subTab) {
      if (subTab === "staff") return (r.visibility ?? "public") === "public";
      return true;
    }
    // type이 없는 레거시 데이터는 attendee로 취급
    if (!r.type && subTab === "attendee") return true;
    return false;
  });

  const canWrite =
    subTab === "attendee" ? isAttendee :
    subTab === "speaker" ? isStaff :
    subTab === "staff" ? isStaff : false;

  const alreadyWritten = subTab === "attendee"
    ? allReviews.some((r) => r.type === "attendee" && r.authorId === user?.id)
    : false;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reviewsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", seminar.id] });
      queryClient.invalidateQueries({ queryKey: ["reviews", seminar.id, "admin"] });
      toast.success("후기가 삭제되었습니다.");
    },
  });

  async function handleSubmit() {
    if (!content.trim()) { toast.error("내용을 입력해주세요."); return; }
    if (!user) return;

    setSubmitting(true);
    try {
      await reviewsApi.create({
        seminarId: seminar.id,
        type: subTab,
        content: content.trim(),
        rating,
        authorId: user.id,
        authorName: user.name,
        authorGeneration: user.generation || undefined,
        visibility: "public",
        status: "published",
      });
      queryClient.invalidateQueries({ queryKey: ["reviews", seminar.id] });
      queryClient.invalidateQueries({ queryKey: ["reviews", seminar.id, "admin"] });
      toast.success("후기가 등록되었습니다.");
      setContent("");
      setRating(5);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "등록 실패");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* 서브탭 */}
      <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setSubTab(tab.value); setContent(""); }}
            className={cn(
              "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm",
              subTab === tab.value
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 작성 폼 */}
      {canWrite && !alreadyWritten && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <h3 className="mb-3 text-sm font-medium">
            {subTab === "attendee" ? "참석 후기 작성" : subTab === "speaker" ? "연사 후기 작성" : "운영진 후기 작성"}
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">평점:</span>
              <StarRating value={rating} onChange={setRating} />
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder={
                subTab === "attendee" ? "세미나에 참석하신 소감을 남겨주세요." :
                subTab === "speaker" ? "발표 소감이나 후기를 작성해주세요." :
                "운영 소감이나 세미나에 대한 후기를 남겨주세요."
              }
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <Button onClick={handleSubmit} disabled={submitting} size="sm">
              {submitting ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Send size={14} className="mr-1" />}
              등록
            </Button>
          </div>
        </div>
      )}

      {canWrite && alreadyWritten && subTab === "attendee" && (
        <p className="text-sm text-muted-foreground">이미 후기를 작성하셨습니다.</p>
      )}

      {/* 후기 목록 */}
      {filteredReviews.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          등록된 후기가 없습니다.
        </p>
      ) : (
        <div className="space-y-3">
          {filteredReviews.map((r) => (
            <div key={r.id} className="rounded-lg border bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{r.authorName}</span>
                    {r.rating && <StarRating value={r.rating} readonly />}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{r.content}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })}
                  </p>
                </div>
                {(isStaff || r.authorId === user?.id) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-destructive"
                    onClick={() => deleteMutation.mutate(r.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
