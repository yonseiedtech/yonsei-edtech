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
  ASSIGNMENT_FREQUENCY_LABELS,
  EXAM_TYPE_LABELS,
  SEMESTER_TERM_LABELS,
  type AssignmentFrequency,
  type CourseCategory,
  type CourseReview,
  type ExamType,
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
              <div key={r.id} className="rounded border bg-card p-2">
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
                    {r.ratingReason && (
                      <p className="mt-1 text-[10px] italic text-amber-700/80">
                        ★ {r.ratingReason}
                      </p>
                    )}
                    <p className="mt-1 whitespace-pre-wrap text-[11px] text-foreground/80">
                      {r.comment}
                    </p>
                    {(r.workload != null || r.difficulty != null) && (
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                        {r.workload != null && <span>과제량 {r.workload}/5</span>}
                        {r.difficulty != null && <span>난이도 {r.difficulty}/5</span>}
                      </div>
                    )}
                    {(r.midtermType || r.finalType || r.examNotes) && (
                      <div className="mt-1.5 rounded border border-blue-100 bg-blue-50/40 p-1.5 text-[10px] text-blue-900/80">
                        <div className="flex flex-wrap gap-2">
                          {r.midtermType && (
                            <span>
                              <strong>중간:</strong> {EXAM_TYPE_LABELS[r.midtermType]}
                            </span>
                          )}
                          {r.finalType && (
                            <span>
                              <strong>기말:</strong> {EXAM_TYPE_LABELS[r.finalType]}
                            </span>
                          )}
                        </div>
                        {r.examNotes && (
                          <p className="mt-0.5 whitespace-pre-wrap text-blue-900/70">
                            {r.examNotes}
                          </p>
                        )}
                      </div>
                    )}
                    {(r.assignmentType || r.assignmentFrequency || r.assignmentNotes) && (
                      <div className="mt-1 rounded border border-violet-100 bg-violet-50/40 p-1.5 text-[10px] text-violet-900/80">
                        <div className="flex flex-wrap gap-2">
                          {r.assignmentType && (
                            <span>
                              <strong>과제:</strong> {r.assignmentType}
                            </span>
                          )}
                          {r.assignmentFrequency && (
                            <span>
                              <strong>빈도:</strong>{" "}
                              {ASSIGNMENT_FREQUENCY_LABELS[r.assignmentFrequency]}
                            </span>
                          )}
                        </div>
                        {r.assignmentNotes && (
                          <p className="mt-0.5 whitespace-pre-wrap text-violet-900/70">
                            {r.assignmentNotes}
                          </p>
                        )}
                      </div>
                    )}
                    {r.recommendedFor && (
                      <p className="mt-1 text-[10px] text-emerald-800/80">
                        🎯 추천 대상: {r.recommendedFor}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <button
                      type="button"
                      onClick={() => handleHelpful(r)}
                      disabled={!user || (r.helpfulBy ?? []).includes(user?.id ?? "")}
                      className="inline-flex items-center gap-0.5 rounded-md border bg-card px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted disabled:opacity-50"
                    >
                      <ThumbsUp size={10} />
                      {r.helpfulCount ?? 0}
                    </button>
                    {canDelete(r) && (
                      <button
                        type="button"
                        onClick={() => handleDelete(r)}
                        className="inline-flex items-center gap-0.5 rounded-md border border-destructive/30 bg-card px-1.5 py-0.5 text-[10px] text-destructive hover:bg-destructive/5"
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
  const [profName, setProfName] = useState<string>(professor ?? "");
  const [ratingReason, setRatingReason] = useState("");
  const [midtermType, setMidtermType] = useState<ExamType>("exam");
  const [finalType, setFinalType] = useState<ExamType>("exam");
  const [examNotes, setExamNotes] = useState("");
  const [assignmentType, setAssignmentType] = useState("");
  const [assignmentFrequency, setAssignmentFrequency] =
    useState<AssignmentFrequency>("weekly");
  const [assignmentNotes, setAssignmentNotes] = useState("");
  const [recommendedFor, setRecommendedFor] = useState("");
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
        professor: profName.trim() || professor || "",
        category: category ?? "general",
        authorId: user.id,
        authorName: user.name,
        anonymous,
        rating,
        ratingReason: ratingReason.trim() || undefined,
        workload,
        difficulty,
        comment: comment.trim(),
        recommend,
        year,
        term,
        midtermType,
        finalType,
        examNotes: examNotes.trim() || undefined,
        assignmentType: assignmentType.trim() || undefined,
        assignmentFrequency,
        assignmentNotes: assignmentNotes.trim() || undefined,
        recommendedFor: recommendedFor.trim() || undefined,
        helpfulCount: 0,
        helpfulBy: [],
        createdAt: now,
        updatedAt: now,
      });
      qc.invalidateQueries({ queryKey: ["course-reviews", courseOfferingId] });
      qc.invalidateQueries({ queryKey: ["course-reviews-aggregate"] });
      qc.invalidateQueries({ queryKey: ["course-reviews-by-name", courseName] });
      onOpenChange(false);
      setComment("");
      setRatingReason("");
      setExamNotes("");
      setAssignmentType("");
      setAssignmentNotes("");
      setRecommendedFor("");
    } catch (e) {
      setError((e as Error).message ?? "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{courseName} 강의 후기</DialogTitle>
          <DialogDescription>
            {professor ? `${professor} · ` : ""}수강 경험을 다른 학우와 공유해주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">과목명</label>
              <input
                type="text"
                value={courseName}
                readOnly
                className="mt-1 h-9 w-full rounded-md border bg-muted/30 px-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">교수</label>
              <input
                type="text"
                value={profName}
                onChange={(e) => setProfName(e.target.value)}
                placeholder="담당 교수"
                className="mt-1 h-9 w-full rounded-md border bg-card px-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">전반 평점</label>
            <div className="mt-1">
              <StarRow value={rating} onChange={setRating} size={20} />
            </div>
            <Textarea
              rows={2}
              value={ratingReason}
              onChange={(e) => setRatingReason(e.target.value)}
              placeholder="평점 평가 이유 (예: 강의 구성이 체계적이었음)"
              className="mt-2"
            />
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
                className="mt-1 h-9 w-full rounded-md border bg-card px-2 text-sm"
                min={2000}
                max={2100}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">수강 학기</label>
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value as SemesterTerm)}
                className="mt-1 h-9 w-full rounded-md border bg-card px-2 text-sm"
              >
                <option value="spring">봄학기 (전기)</option>
                <option value="fall">가을학기 (후기)</option>
                <option value="summer">계절학기(여름)</option>
                <option value="winter">계절학기(겨울)</option>
              </select>
            </div>
          </div>

          <fieldset className="rounded-md border border-blue-200 bg-blue-50/30 p-3">
            <legend className="px-1 text-xs font-semibold text-blue-900">시험 운영</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">중간고사</label>
                <select
                  value={midtermType}
                  onChange={(e) => setMidtermType(e.target.value as ExamType)}
                  className="mt-1 h-9 w-full rounded-md border bg-card px-2 text-sm"
                >
                  {Object.entries(EXAM_TYPE_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">기말고사</label>
                <select
                  value={finalType}
                  onChange={(e) => setFinalType(e.target.value as ExamType)}
                  className="mt-1 h-9 w-full rounded-md border bg-card px-2 text-sm"
                >
                  {Object.entries(EXAM_TYPE_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Textarea
              rows={2}
              value={examNotes}
              onChange={(e) => setExamNotes(e.target.value)}
              placeholder="시험에 대한 추가 의견 (예: 오픈북, 서술형 위주)"
              className="mt-2"
            />
          </fieldset>

          <fieldset className="rounded-md border border-violet-200 bg-violet-50/30 p-3">
            <legend className="px-1 text-xs font-semibold text-violet-900">과제 운영</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">과제 유형</label>
                <input
                  type="text"
                  value={assignmentType}
                  onChange={(e) => setAssignmentType(e.target.value)}
                  placeholder="개인 보고서 / 팀 프로젝트 / 발표 등"
                  className="mt-1 h-9 w-full rounded-md border bg-card px-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">과제 빈도</label>
                <select
                  value={assignmentFrequency}
                  onChange={(e) => setAssignmentFrequency(e.target.value as AssignmentFrequency)}
                  className="mt-1 h-9 w-full rounded-md border bg-card px-2 text-sm"
                >
                  {Object.entries(ASSIGNMENT_FREQUENCY_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Textarea
              rows={2}
              value={assignmentNotes}
              onChange={(e) => setAssignmentNotes(e.target.value)}
              placeholder="과제에 대한 추가 의견 (예: 매주 발제문 제출)"
              className="mt-2"
            />
          </fieldset>

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              추천 대상 (학기·특성)
            </label>
            <input
              type="text"
              value={recommendedFor}
              onChange={(e) => setRecommendedFor(e.target.value)}
              placeholder="예: 1학기 신입생 / 통계 배경 있는 학생 / 학부 청강생"
              className="mt-1 h-9 w-full rounded-md border bg-card px-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">총평</label>
            <Textarea
              rows={5}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="강의 진행, 분위기, 추천 이유 등을 자유롭게 작성해주세요."
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

          {error && <p className="text-xs text-destructive" role="alert">⚠ {error}</p>}
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
