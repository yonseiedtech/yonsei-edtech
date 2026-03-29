"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reviewsApi, registrationsApi, seminarsApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  Send,
  Loader2,
  Trash2,
  Eye,
  EyeOff,
  Plus,
  X,
  MessageSquare,
  BarChart3,
  Settings,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Seminar, SeminarReview } from "@/types";

type ReviewSubTab = "speaker" | "staff" | "attendee";

const SUB_TABS: { value: ReviewSubTab; label: string }[] = [
  { value: "speaker", label: "연사 후기" },
  { value: "staff", label: "운영진 후기" },
  { value: "attendee", label: "참석자 후기" },
];

const NO_QUESTION = [".", "-", "없음", "없습니다", "아직 없습니다", "없어요", "x", "X", "아직 없음", "아직없습니다", "없슴", "특별히 없습니다"];

function StarRating({ value, onChange, readonly }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={readonly} onClick={() => onChange?.(n)} className={readonly ? "cursor-default" : "cursor-pointer"}>
          <Star size={16} className={n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"} />
        </button>
      ))}
    </div>
  );
}

interface Props {
  seminar: Seminar;
}

type Section = "stats" | "memos" | "questions" | "reviews";

export default function ReviewManagement({ seminar }: Props) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [section, setSection] = useState<Section>("stats");
  const [reviewSubTab, setReviewSubTab] = useState<ReviewSubTab>("speaker");

  // 후기 작성 상태
  const [writeType, setWriteType] = useState<"attendee" | "speaker" | "staff">("staff");
  const [writeVisibility, setWriteVisibility] = useState<"public" | "internal">("public");
  const [writeContent, setWriteContent] = useState("");
  const [writeRating, setWriteRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  // 질문 설정 상태
  const [newQuestion, setNewQuestion] = useState("");

  // 데이터 조회
  const { data: allReviews = [] } = useQuery({
    queryKey: ["reviews-admin", seminar.id],
    queryFn: async () => {
      // 관리자는 클라이언트 SDK로 전체 조회 (hidden/internal 포함)
      const res = await reviewsApi.list(seminar.id);
      return res.data as unknown as SeminarReview[];
    },
  });

  const { data: registrations = [] } = useQuery({
    queryKey: ["registrations", seminar.id],
    queryFn: async () => {
      const res = await registrationsApi.list(seminar.id);
      return res.data as unknown as { id: string; name: string; memo?: string }[];
    },
  });

  // 통계 계산
  const stats = {
    total: allReviews.length,
    avgRating: allReviews.length > 0
      ? (allReviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / allReviews.filter((r) => r.rating).length).toFixed(1)
      : "0",
    byType: {
      attendee: allReviews.filter((r) => r.type === "attendee" || !r.type).length,
      speaker: allReviews.filter((r) => r.type === "speaker").length,
      staff: allReviews.filter((r) => r.type === "staff").length,
    },
    hidden: allReviews.filter((r) => (r.status ?? "published") === "hidden").length,
  };

  // 신청 시 질문 필터링
  const memos = registrations.filter((r) => {
    if (!r.memo) return false;
    const trimmed = r.memo.trim();
    if (trimmed.length < 2) return false;
    if (NO_QUESTION.includes(trimmed) || trimmed.startsWith("아직 특별한") || trimmed.startsWith("아직 없")) return false;
    return true;
  });

  // 서브탭별 후기 (관리자: 모두 표시)
  const filteredReviews = allReviews.filter((r) => {
    if (r.type === reviewSubTab) return true;
    if (!r.type && reviewSubTab === "attendee") return true;
    return false;
  });

  // 후기 상태 토글
  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      reviewsApi.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", seminar.id] });
      toast.success("상태가 변경되었습니다.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reviewsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", seminar.id] });
      toast.success("후기가 삭제되었습니다.");
    },
  });

  // 후기 작성
  async function handleWrite() {
    if (!writeContent.trim() || !user) return;
    setSubmitting(true);
    try {
      await reviewsApi.create({
        seminarId: seminar.id,
        type: writeType,
        content: writeContent.trim(),
        rating: writeRating,
        authorId: user.id,
        authorName: user.name,
        authorGeneration: user.generation || undefined,
        visibility: writeType === "staff" ? writeVisibility : "public",
        status: "published",
      });
      queryClient.invalidateQueries({ queryKey: ["reviews", seminar.id] });
      toast.success("후기가 등록되었습니다.");
      setWriteContent("");
      setWriteRating(5);
    } catch {
      toast.error("등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  // 질문 설정 (유형별)
  const [questionType, setQuestionType] = useState<ReviewSubTab>("attendee");
  const allReviewQuestions = seminar.reviewQuestions ?? {};
  const currentQuestions = allReviewQuestions[questionType] ?? [];

  async function addQuestion() {
    if (!newQuestion.trim()) return;
    const updated = { ...allReviewQuestions, [questionType]: [...currentQuestions, newQuestion.trim()] };
    await seminarsApi.update(seminar.id, { reviewQuestions: updated });
    queryClient.invalidateQueries({ queryKey: ["seminar", seminar.id] });
    setNewQuestion("");
    toast.success("질문이 추가되었습니다.");
  }

  async function removeQuestion(idx: number) {
    const updated = { ...allReviewQuestions, [questionType]: currentQuestions.filter((_, i) => i !== idx) };
    await seminarsApi.update(seminar.id, { reviewQuestions: updated });
    queryClient.invalidateQueries({ queryKey: ["seminar", seminar.id] });
    toast.success("질문이 삭제되었습니다.");
  }

  const SECTIONS: { value: Section; label: string; icon: React.ReactNode }[] = [
    { value: "stats", label: "통계", icon: <BarChart3 size={14} /> },
    { value: "memos", label: "질문 모아보기", icon: <ClipboardList size={14} /> },
    { value: "questions", label: "폼 질문 설정", icon: <Settings size={14} /> },
    { value: "reviews", label: "후기 목록", icon: <MessageSquare size={14} /> },
  ];

  return (
    <div className="space-y-4">
      {/* 섹션 네비게이션 */}
      <div className="flex flex-wrap gap-1">
        {SECTIONS.map((s) => (
          <button
            key={s.value}
            onClick={() => setSection(s.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              section === s.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:text-foreground",
            )}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>

      {/* 통계 */}
      {section === "stats" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
            <div className="rounded-lg border bg-white p-3 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">총 후기</p>
            </div>
            <div className="rounded-lg border bg-white p-3 text-center">
              <p className="text-2xl font-bold text-amber-500">★ {stats.avgRating}</p>
              <p className="text-xs text-muted-foreground">평균 평점</p>
            </div>
            <div className="rounded-lg border bg-white p-3 text-center">
              <div className="flex items-center justify-center gap-2 text-sm">
                <span>연사 {stats.byType.speaker}</span>
                <span className="text-muted-foreground">|</span>
                <span>운영 {stats.byType.staff}</span>
                <span className="text-muted-foreground">|</span>
                <span>참석 {stats.byType.attendee}</span>
              </div>
              <p className="text-xs text-muted-foreground">유형별 분포</p>
            </div>
            <div className="rounded-lg border bg-white p-3 text-center">
              <p className="text-2xl font-bold text-muted-foreground">{stats.hidden}</p>
              <p className="text-xs text-muted-foreground">숨김 처리</p>
            </div>
          </div>

          {/* 관리자 후기 작성 */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <h3 className="mb-3 text-sm font-medium">후기 작성</h3>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">유형:</span>
                  <select
                    value={writeType}
                    onChange={(e) => setWriteType(e.target.value as typeof writeType)}
                    className="rounded-md border bg-white px-2 py-1 text-sm"
                  >
                    <option value="attendee">참석자</option>
                    <option value="speaker">연사</option>
                    <option value="staff">운영진</option>
                  </select>
                </div>
                {writeType === "staff" && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">공개:</span>
                    <select
                      value={writeVisibility}
                      onChange={(e) => setWriteVisibility(e.target.value as typeof writeVisibility)}
                      className="rounded-md border bg-white px-2 py-1 text-sm"
                    >
                      <option value="public">공개</option>
                      <option value="internal">비공개 (운영진만)</option>
                    </select>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">평점:</span>
                  <StarRating value={writeRating} onChange={setWriteRating} />
                </div>
              </div>
              <textarea
                value={writeContent}
                onChange={(e) => setWriteContent(e.target.value)}
                rows={3}
                placeholder="후기를 작성해주세요."
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <Button onClick={handleWrite} disabled={submitting || !writeContent.trim()} size="sm">
                {submitting ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Send size={14} className="mr-1" />}
                등록
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 질문 모아보기 */}
      {section === "memos" && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">신청 시 작성된 질문/요청사항 ({memos.length}건)</p>
          {memos.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">질문이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {memos.map((r) => (
                <div key={r.id} className="rounded-lg border bg-white px-4 py-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-sm font-medium">{r.name}</span>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{r.memo}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 폼 질문 설정 */}
      {section === "questions" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">후기 유형별로 폼에 표시할 질문을 설정합니다.</p>

          {/* 유형 선택 */}
          <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
            {SUB_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setQuestionType(tab.value)}
                className={cn(
                  "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm",
                  questionType === tab.value
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {currentQuestions.map((q, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2">
                <span className="flex-1 text-sm">{q}</span>
                <button onClick={() => removeQuestion(i)} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-500">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="새 질문 입력 (예: 가장 인상적이었던 내용은?)"
              onKeyDown={(e) => e.key === "Enter" && addQuestion()}
            />
            <Button size="sm" variant="outline" onClick={addQuestion} disabled={!newQuestion.trim()}>
              <Plus size={14} className="mr-1" />
              추가
            </Button>
          </div>
        </div>
      )}

      {/* 후기 목록 */}
      {section === "reviews" && (
        <div className="space-y-3">
          {/* 서브탭 */}
          <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
            {SUB_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setReviewSubTab(tab.value)}
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  reviewSubTab === tab.value
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
                <span className="ml-1 text-xs text-muted-foreground">
                  ({allReviews.filter((r) => r.type === tab.value || (!r.type && tab.value === "attendee")).length})
                </span>
              </button>
            ))}
          </div>

          {/* 목록 */}
          {filteredReviews.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">해당 유형의 후기가 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {filteredReviews.map((r) => {
                const isHidden = (r.status ?? "published") === "hidden";
                const isInternal = (r.visibility ?? "public") === "internal";
                return (
                  <div key={r.id} className={cn("rounded-lg border bg-white p-4", isHidden && "opacity-50")}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{r.authorName}</span>
                          {r.authorGeneration ? <span className="text-xs text-muted-foreground">{r.authorGeneration}기</span> : null}
                          {r.rating && <StarRating value={r.rating} readonly />}
                          {isHidden && <Badge variant="secondary" className="text-xs text-red-500">숨김</Badge>}
                          {isInternal && <Badge variant="secondary" className="text-xs text-amber-600">비공개</Badge>}
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{r.content}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {new Date(r.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1 self-end sm:self-start">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleMutation.mutate({ id: r.id, status: isHidden ? "published" : "hidden" })}
                          title={isHidden ? "복원" : "숨기기"}
                        >
                          {isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          onClick={() => deleteMutation.mutate(r.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
