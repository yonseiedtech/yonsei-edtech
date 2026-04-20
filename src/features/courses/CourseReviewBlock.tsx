"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, MessageSquarePlus, ThumbsUp, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/features/auth/auth-store";
import { courseReviewsApi } from "@/lib/bkend";
import { isAtLeast } from "@/lib/permissions";
import {
  SEMESTER_TERM_LABELS,
  type CourseCategory,
  type CourseReview,
  type SemesterTerm,
} from "@/types";

interface Props {
  courseOfferingId: string;
  courseName: string;
  professor?: string;
  category?: CourseCategory;
  /** 강의 개설 학기 (기본값) */
  defaultYear: number;
  defaultTerm: SemesterTerm;
}

function StarRow({
  value,
  onChange,
  size = 14,
  readonly,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  readonly?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(n)}
          className={readonly ? "cursor-default" : "cursor-pointer"}
          aria-label={`${n}점`}
        >
          <Star
            size={size}
            className={n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}
          />
        </button>
      ))}
    </div>
  );
}

export default function CourseReviewBlock({
  courseOfferingId,
  courseName,
  professor,
  category,
  defaultYear,
  defaultTerm,
}: Props) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["course-reviews", courseOfferingId],
    queryFn: async () => {
      const res = await courseReviewsApi.listByCourse(courseOfferingId);
      return res.data;
    },
    staleTime: 30_000,
  });

  const summary = useMemo(() => {
    const n = reviews.length;
    if (n === 0) return { n, avg: 0, recommendRate: 0 };
    const sum = reviews.reduce((a, r) => a + (r.rating || 0), 0);
    const recCount = reviews.filter((r) => r.recommend).length;
    return { n, avg: sum / n, recommendRate: Math.round((recCount / n) * 100) };
  }, [reviews]);

  const myReview = useMemo(
    () => (user ? reviews.find((r) => r.authorId === user.id) : null),
    [reviews, user],
  );

  const canDelete = (r: CourseReview) =>
    !!user && (r.authorId === user.id || isAtLeast(user, "admin"));

  async function handleHelpful(r: CourseReview) {
    if (!user) return;
    const helpfulBy = Array.isArray(r.helpfulBy) ? r.helpfulBy : [];
    if (helpfulBy.includes(user.id)) return; // 중복 방지
    const next = [...helpfulBy, user.id];
    await courseReviewsApi.update(r.id, {
      helpfulBy: next,
      helpfulCount: next.length,
      updatedAt: new Date().toISOString(),
    });
    qc.invalidateQueries({ queryKey: ["course-reviews", courseOfferingId] });
  }

  async function handleDelete(r: CourseReview) {
    if (!confirm("후기를 삭제하시겠습니까?")) return;
    await courseReviewsApi.delete(r.id);
    qc.invalidateQueries({ queryKey: ["course-reviews", courseOfferingId] });
  }

  return (
    <div className="mt-2 rounded-md border border-dashed border-primary/20 bg-primary/[0.02] p-2">
      {/* 요약 + 토글 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px]">
          {summary.n === 0 ? (
            <span className="text-muted-foreground">아직 후기가 없습니다.</span>
          ) : (
            <>
              <span className="inline-flex items-center gap-0.5 font-semibold text-amber-600">
                <Star size={12} className="fill-amber-400 text-amber-400" />
                {summary.avg.toFixed(1)}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">후기 {summary.n}개</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">추천 {summary.recommendRate}%</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          {user && !myReview && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[10px]"
              onClick={() => setComposeOpen(true)}
            >
              <MessageSquarePlus size={11} className="mr-1" />
              후기 작성
            </Button>
          )}
          {summary.n > 0 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px]"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              {expanded ? "접기" : "펼치기"}
            </Button>
          )}
        </div>
      </div>

      {/* 후기 목록 */}
      {expanded && (
        <div className="mt-2 space-y-1.5 border-t pt-2">
          {isLoading ? (
            <p className="text-[11px] text-muted-foreground">불러오는 중…</p>
          ) : (
            reviews.map((r) => (
              <div key={r.id} className="rounded border bg-white p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <StarRow value={r.rating} readonly size={11} />
                      {r.recommend && (
                        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[9px] text-emerald-700">
                          추천
                        </Badge>
                      )}
                      <span className="text-muted-foreground">
                        {r.year}년 {SEMESTER_TERM_LABELS[r.term]} ·{" "}
                        {r.anonymous ? "익명" : r.authorName}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-[11px] text-foreground/80">
                      {r.comment}
                    </p>
                    {(r.workload != null || r.difficulty != null) && (
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                        {r.workload != null && <span>과제량 {r.workload}/5</span>}
                        {r.difficulty != null && <span>난이도 {r.difficulty}/5</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <button
                      type="button"
                      onClick={() => handleHelpful(r)}
                      disabled={!user || (r.helpfulBy ?? []).includes(user?.id ?? "")}
                      className="inline-flex items-center gap-0.5 rounded-md border bg-white px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted disabled:opacity-50"
                    >
                      <ThumbsUp size={10} />
                      {r.helpfulCount ?? 0}
                    </button>
                    {canDelete(r) && (
                      <button
                        type="button"
                        onClick={() => handleDelete(r)}
                        className="inline-flex items-center gap-0.5 rounded-md border border-destructive/30 bg-white px-1.5 py-0.5 text-[10px] text-destructive hover:bg-destructive/5"
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <ReviewComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        courseOfferingId={courseOfferingId}
        courseName={courseName}
        professor={professor}
        category={category}
        defaultYear={defaultYear}
        defaultTerm={defaultTerm}
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 * 후기 작성 Dialog
 * ──────────────────────────────────────────────────────────── */

function ReviewComposeDialog({
  open,
  onOpenChange,
  courseOfferingId,
  courseName,
  professor,
  category,
  defaultYear,
  defaultTerm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  courseOfferingId: string;
  courseName: string;
  professor?: string;
  category?: CourseCategory;
  defaultYear: number;
  defaultTerm: SemesterTerm;
}) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [rating, setRating] = useState(4);
  const [workload, setWorkload] = useState(3);
  const [difficulty, setDifficulty] = useState(3);
  const [recommend, setRecommend] = useState(true);
  const [anonymous, setAnonymous] = useState(true);
  const [comment, setComment] = useState("");
  const [year, setYear] = useState<number>(defaultYear);
  const [term, setTerm] = useState<SemesterTerm>(defaultTerm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!user) return;
    if (!comment.trim()) {
      setError("후기 본문을 입력해주세요.");
      return;
    }
    if (comment.length < 10) {
      setError("후기는 10자 이상 작성해주세요.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      await courseReviewsApi.create({
        courseOfferingId,
        courseName,
        professor: professor ?? "",
        category: category ?? "general",
        authorId: user.id,
        authorName: user.name,
        anonymous,
        rating,
        workload,
        difficulty,
        comment: comment.trim(),
        recommend,
        year,
        term,
        helpfulCount: 0,
        helpfulBy: [],
        createdAt: now,
        updatedAt: now,
      });
      qc.invalidateQueries({ queryKey: ["course-reviews", courseOfferingId] });
      qc.invalidateQueries({ queryKey: ["course-reviews-aggregate"] });
      onOpenChange(false);
      setComment("");
    } catch (e) {
      setError((e as Error).message ?? "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{courseName} 강의 후기</DialogTitle>
          <DialogDescription>
            {professor ? `${professor} · ` : ""}수강 경험을 다른 학우와 공유해주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div>
            <label className="text-xs font-medium text-muted-foreground">전반 평점</label>
            <div className="mt-1">
              <StarRow value={rating} onChange={setRating} size={20} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                과제량 ({workload}/5)
              </label>
              <input
                type="range"
                min={1}
                max={5}
                value={workload}
                onChange={(e) => setWorkload(Number(e.target.value))}
                className="mt-1 w-full"
              />
              <p className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
                <span>적음</span>
                <span>많음</span>
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                난이도 ({difficulty}/5)
              </label>
              <input
                type="range"
                min={1}
                max={5}
                value={difficulty}
                onChange={(e) => setDifficulty(Number(e.target.value))}
                className="mt-1 w-full"
              />
              <p className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
                <span>쉬움</span>
                <span>어려움</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">수강 연도</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="mt-1 h-9 w-full rounded-md border bg-white px-2 text-sm"
                min={2000}
                max={2100}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">수강 학기</label>
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value as SemesterTerm)}
                className="mt-1 h-9 w-full rounded-md border bg-white px-2 text-sm"
              >
                <option value="spring">봄학기 (전기)</option>
                <option value="fall">가을학기 (후기)</option>
                <option value="summer">계절학기(여름)</option>
                <option value="winter">계절학기(겨울)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">후기</label>
            <Textarea
              rows={5}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="강의 진행, 과제 부담, 추천 대상 등을 자유롭게 작성해주세요."
              className="mt-1"
            />
            <p className="mt-0.5 text-right text-[10px] text-muted-foreground">
              {comment.length}자 (10자 이상)
            </p>
          </div>

          <div className="flex items-center justify-between rounded-md border bg-muted/20 p-2">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={recommend}
                onChange={(e) => setRecommend(e.target.checked)}
              />
              이 강의를 추천합니다
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
              />
              익명으로 작성
            </label>
          </div>

          {error && <p className="text-xs text-destructive">⚠ {error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "저장 중…" : "후기 등록"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
