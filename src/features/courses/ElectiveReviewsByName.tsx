"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MessageSquarePlus,
  Search,
  Star,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/features/auth/auth-store";
import { courseOfferingsApi, courseReviewsApi } from "@/lib/bkend";
import { isAtLeast } from "@/lib/permissions";
import {
  ASSIGNMENT_FREQUENCY_LABELS,
  COURSE_CATEGORY_LABELS,
  EXAM_TYPE_LABELS,
  SEMESTER_TERM_LABELS,
  type AssignmentFrequency,
  type CourseCategory,
  type CourseOffering,
  type CourseReview,
  type ExamType,
  type SemesterTerm,
} from "@/types";

const ELECTIVE_CATS: CourseCategory[] = [
  "general",
  "teaching_general",
  "other_major",
];

const TERM_RANK: Record<SemesterTerm, number> = {
  spring: 1,
  summer: 2,
  fall: 3,
  winter: 4,
};

function semesterKey(year: number, term: SemesterTerm) {
  return `${year}-${term}`;
}

function semesterRank(year: number, term: SemesterTerm) {
  return year * 10 + TERM_RANK[term];
}

interface NameGroup {
  /** 강의명 (그룹 키) */
  name: string;
  /** 가장 최근 개설된 offering — defaults·교수 표기에 사용 */
  latest: CourseOffering;
  /** 모든 개설 (year+term DESC) */
  offerings: CourseOffering[];
  /** 학기별 후기: key = `${year}-${term}` */
  reviewsBySemester: Map<string, CourseReview[]>;
  /** 누적 후기 수 */
  reviewCount: number;
  /** 평균 평점 */
  avgRating: number;
  /** 추천율 (%) */
  recommendRate: number;
  /** 카테고리 (latest) */
  category: CourseCategory;
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
            className={
              n <= value
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/40"
            }
          />
        </button>
      ))}
    </div>
  );
}

export default function ElectiveReviewsByName() {
  const { user } = useAuthStore();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<CourseCategory | "all">(
    "all",
  );

  // 모든 교양·타전공 개설(연도 무관)
  const { data: offerings = [], isLoading: loadingOfferings } = useQuery({
    queryKey: ["elective-offerings-all"],
    queryFn: async () => {
      const res = await courseOfferingsApi.list({ limit: 2000 });
      return res.data.filter(
        (o) => o.active !== false && ELECTIVE_CATS.includes(o.category),
      );
    },
    staleTime: 60_000,
  });

  // 모든 강의 후기
  const { data: reviews = [], isLoading: loadingReviews } = useQuery({
    queryKey: ["elective-reviews-all"],
    queryFn: async () => {
      const res = await courseReviewsApi.list({ limit: 2000 });
      return res.data;
    },
    staleTime: 30_000,
  });

  const groups = useMemo<NameGroup[]>(() => {
    // 1) 강의명 → offerings (year+term DESC)
    const byName = new Map<string, CourseOffering[]>();
    for (const o of offerings) {
      const key = (o.courseName ?? "").trim();
      if (!key) continue;
      const arr = byName.get(key) ?? [];
      arr.push(o);
      byName.set(key, arr);
    }
    for (const [k, arr] of byName) {
      arr.sort((a, b) => semesterRank(b.year, b.term) - semesterRank(a.year, a.term));
      byName.set(k, arr);
    }

    // 2) 강의명 → 모든 review (offering 한정 X — courseName 일치 우선, fallback courseOfferingId)
    const reviewsByName = new Map<string, CourseReview[]>();
    for (const r of reviews) {
      let key = (r.courseName ?? "").trim();
      if (!key) {
        // courseName 누락 후기: offering 으로 역추적
        const o = offerings.find((x) => x.id === r.courseOfferingId);
        if (o) key = o.courseName;
      }
      if (!key) continue;
      const arr = reviewsByName.get(key) ?? [];
      arr.push(r);
      reviewsByName.set(key, arr);
    }

    // 3) 그룹 build (offering 이 있는 강의명만)
    const out: NameGroup[] = [];
    for (const [name, offs] of byName) {
      const revs = reviewsByName.get(name) ?? [];
      const bySem = new Map<string, CourseReview[]>();
      for (const r of revs) {
        const k = semesterKey(r.year, r.term);
        const a = bySem.get(k) ?? [];
        a.push(r);
        bySem.set(k, a);
      }
      const ratingSum = revs.reduce((s, r) => s + (r.rating || 0), 0);
      const recCount = revs.filter((r) => r.recommend).length;
      out.push({
        name,
        latest: offs[0]!,
        offerings: offs,
        reviewsBySemester: bySem,
        reviewCount: revs.length,
        avgRating: revs.length ? ratingSum / revs.length : 0,
        recommendRate: revs.length
          ? Math.round((recCount / revs.length) * 100)
          : 0,
        category: offs[0]!.category,
      });
    }
    out.sort((a, b) => {
      // 후기 많은 순 → 강의명 가나다순
      if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
      return a.name.localeCompare(b.name);
    });
    return out;
  }, [offerings, reviews]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups.filter((g) => {
      if (filterCategory !== "all" && g.category !== filterCategory) return false;
      if (!q) return true;
      const hay = [
        g.name,
        g.latest.professor,
        g.latest.courseCode,
        ...g.offerings.map((o) => o.professor ?? ""),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [groups, search, filterCategory]);

  if (loadingOfferings || loadingReviews) {
    return (
      <div className="mt-12 space-y-3" aria-busy="true" aria-label="강의 후기 불러오는 중">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-[11px] text-emerald-800">
        💬 강의명을 기준으로 학기별 수강 후기를 모아 보여드립니다. 본인이 수강한
        학기를 선택해 후기를 남겨주세요. 익명 작성도 가능합니다.
      </div>

      {/* 검색 + 필터 */}
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="relative sm:col-span-2">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="강의명·교수·과목코드로 검색"
            className="h-9 w-full rounded-md border bg-white pl-8 pr-2 text-sm"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) =>
            setFilterCategory(e.target.value as CourseCategory | "all")
          }
          className="h-9 rounded-md border bg-white px-2 text-sm"
        >
          <option value="all">전체 카테고리</option>
          {ELECTIVE_CATS.map((c) => (
            <option key={c} value={c}>
              {COURSE_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border bg-muted/20 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            조건에 맞는 강의가 없습니다.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((g) => (
            <NameCard key={g.name} group={g} currentUserId={user?.id ?? null} />
          ))}
        </ul>
      )}
    </div>
  );
}

function NameCard({
  group,
  currentUserId,
}: {
  group: NameGroup;
  currentUserId: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const semesterKeys = useMemo(
    () =>
      Array.from(group.reviewsBySemester.keys()).sort((a, b) => {
        const [ay, at] = a.split("-") as [string, SemesterTerm];
        const [by, bt] = b.split("-") as [string, SemesterTerm];
        return semesterRank(Number(by), bt) - semesterRank(Number(ay), at);
      }),
    [group],
  );

  return (
    <li className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {group.latest.courseCode && (
              <span className="font-mono text-[11px] text-muted-foreground">
                {group.latest.courseCode}
              </span>
            )}
            <h3 className="text-base font-semibold">{group.name}</h3>
            <Badge variant="outline" className="text-[10px]">
              {COURSE_CATEGORY_LABELS[group.category]}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              개설 {group.offerings.length}회
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            최근 개설: {group.latest.year}년{" "}
            {SEMESTER_TERM_LABELS[group.latest.term]}
            {group.latest.professor ? ` · ${group.latest.professor}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {group.reviewCount === 0 ? (
            <span className="text-[11px] text-muted-foreground">후기 없음</span>
          ) : (
            <div className="text-right">
              <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-amber-600">
                <Star size={13} className="fill-amber-400 text-amber-400" />
                {group.avgRating.toFixed(1)}
              </span>
              <p className="text-[10px] text-muted-foreground">
                후기 {group.reviewCount}개 · 추천 {group.recommendRate}%
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {currentUserId && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[11px]"
            onClick={() => setComposeOpen(true)}
          >
            <MessageSquarePlus size={12} className="mr-1" />
            후기 작성
          </Button>
        )}
        {group.reviewCount > 0 && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[11px]"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? "후기 접기" : "학기별 후기 펼치기"}
          </Button>
        )}
        {group.latest.syllabusUrl && (
          <a
            href={group.latest.syllabusUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
          >
            강의계획서 <ExternalLink size={11} />
          </a>
        )}
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 border-t pt-3">
          {semesterKeys.map((sk) => {
            const [yStr, t] = sk.split("-") as [string, SemesterTerm];
            const list = group.reviewsBySemester.get(sk) ?? [];
            return (
              <div key={sk}>
                <h4 className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                  {yStr}년 {SEMESTER_TERM_LABELS[t]}
                  <span className="text-muted-foreground">·</span>
                  <span>{list.length}건</span>
                </h4>
                <div className="space-y-2">
                  {list.map((r) => (
                    <ReviewItem key={r.id} review={r} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        group={group}
      />
    </li>
  );
}

function ReviewItem({ review }: { review: CourseReview }) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isMine = !!user && review.authorId === user.id;
  const canDelete = isMine || isAtLeast(user, "admin");
  const helpfulBy = Array.isArray(review.helpfulBy) ? review.helpfulBy : [];
  const alreadyHelpful = !!user && helpfulBy.includes(user.id);

  async function handleHelpful() {
    if (!user || alreadyHelpful) return;
    const next = [...helpfulBy, user.id];
    await courseReviewsApi.update(review.id, {
      helpfulBy: next,
      helpfulCount: next.length,
      updatedAt: new Date().toISOString(),
    });
    qc.invalidateQueries({ queryKey: ["elective-reviews-all"] });
    qc.invalidateQueries({ queryKey: ["course-reviews", review.courseOfferingId] });
  }

  async function handleDelete() {
    if (!confirm("후기를 삭제하시겠습니까?")) return;
    await courseReviewsApi.delete(review.id);
    qc.invalidateQueries({ queryKey: ["elective-reviews-all"] });
    qc.invalidateQueries({ queryKey: ["course-reviews", review.courseOfferingId] });
  }

  return (
    <div className="rounded-md border bg-muted/10 p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <StarRow value={review.rating} readonly size={11} />
            {review.recommend && (
              <Badge
                variant="outline"
                className="border-emerald-200 bg-emerald-50 text-[9px] text-emerald-700"
              >
                추천
              </Badge>
            )}
            {review.professor && (
              <span className="text-muted-foreground">
                · {review.professor}
              </span>
            )}
            <span className="text-muted-foreground">
              · {review.anonymous ? "익명" : review.authorName}
            </span>
          </div>
          {review.ratingReason && (
            <p className="text-[11px] italic text-amber-700/80">
              ★ {review.ratingReason}
            </p>
          )}
          <p className="whitespace-pre-wrap text-[12px] text-foreground/85">
            {review.comment}
          </p>
          {(review.workload != null || review.difficulty != null) && (
            <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
              {review.workload != null && (
                <span>과제량 {review.workload}/5</span>
              )}
              {review.difficulty != null && (
                <span>난이도 {review.difficulty}/5</span>
              )}
            </div>
          )}
          {(review.midtermType || review.finalType || review.examNotes) && (
            <div className="rounded border border-blue-100 bg-blue-50/40 p-1.5 text-[10px] text-blue-900/80">
              <div className="flex flex-wrap gap-2">
                {review.midtermType && (
                  <span>
                    <strong>중간:</strong> {EXAM_TYPE_LABELS[review.midtermType]}
                  </span>
                )}
                {review.finalType && (
                  <span>
                    <strong>기말:</strong> {EXAM_TYPE_LABELS[review.finalType]}
                  </span>
                )}
              </div>
              {review.examNotes && (
                <p className="mt-0.5 whitespace-pre-wrap text-blue-900/70">
                  {review.examNotes}
                </p>
              )}
            </div>
          )}
          {(review.assignmentType ||
            review.assignmentFrequency ||
            review.assignmentNotes) && (
            <div className="rounded border border-violet-100 bg-violet-50/40 p-1.5 text-[10px] text-violet-900/80">
              <div className="flex flex-wrap gap-2">
                {review.assignmentType && (
                  <span>
                    <strong>과제:</strong> {review.assignmentType}
                  </span>
                )}
                {review.assignmentFrequency && (
                  <span>
                    <strong>빈도:</strong>{" "}
                    {ASSIGNMENT_FREQUENCY_LABELS[review.assignmentFrequency]}
                  </span>
                )}
              </div>
              {review.assignmentNotes && (
                <p className="mt-0.5 whitespace-pre-wrap text-violet-900/70">
                  {review.assignmentNotes}
                </p>
              )}
            </div>
          )}
          {review.recommendedFor && (
            <p className="text-[10px] text-emerald-800/80">
              🎯 추천 대상: {review.recommendedFor}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <button
            type="button"
            onClick={handleHelpful}
            disabled={!user || alreadyHelpful}
            className="inline-flex items-center gap-0.5 rounded-md border bg-white px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            <ThumbsUp size={10} />
            {review.helpfulCount ?? 0}
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-0.5 rounded-md border border-destructive/30 bg-white px-1.5 py-0.5 text-[10px] text-destructive hover:bg-destructive/5"
            >
              <Trash2 size={10} />
            </button>
          )}
        </div>
      </div>
      <Link
        href={`/profile/${review.authorId}`}
        className="mt-1 inline-block text-[10px] text-muted-foreground hover:text-primary"
      >
        프로필 보기 →
      </Link>
    </div>
  );
}

function ComposeDialog({
  open,
  onOpenChange,
  group,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  group: NameGroup;
}) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  // 학기 선택 — group.offerings 중 선택. 기본: 가장 최근.
  const [offeringId, setOfferingId] = useState<string>(group.offerings[0]?.id ?? "");
  const offering = useMemo(
    () => group.offerings.find((o) => o.id === offeringId) ?? group.offerings[0],
    [group.offerings, offeringId],
  );
  const [profName, setProfName] = useState<string>(offering?.professor ?? "");
  const [rating, setRating] = useState(4);
  const [ratingReason, setRatingReason] = useState("");
  const [workload, setWorkload] = useState(3);
  const [difficulty, setDifficulty] = useState(3);
  const [recommend, setRecommend] = useState(true);
  const [anonymous, setAnonymous] = useState(true);
  const [midtermType, setMidtermType] = useState<ExamType>("exam");
  const [finalType, setFinalType] = useState<ExamType>("exam");
  const [examNotes, setExamNotes] = useState("");
  const [assignmentType, setAssignmentType] = useState("");
  const [assignmentFrequency, setAssignmentFrequency] =
    useState<AssignmentFrequency>("weekly");
  const [assignmentNotes, setAssignmentNotes] = useState("");
  const [recommendedFor, setRecommendedFor] = useState("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!user || !offering) return;
    if (!comment.trim()) {
      setError("총평을 입력해주세요.");
      return;
    }
    if (comment.length < 10) {
      setError("총평은 10자 이상 작성해주세요.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      await courseReviewsApi.create({
        courseOfferingId: offering.id,
        courseName: group.name,
        professor: profName.trim() || offering.professor || "",
        category: offering.category,
        authorId: user.id,
        authorName: user.name,
        anonymous,
        rating,
        ratingReason: ratingReason.trim() || undefined,
        workload,
        difficulty,
        comment: comment.trim(),
        recommend,
        year: offering.year,
        term: offering.term,
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
      qc.invalidateQueries({ queryKey: ["elective-reviews-all"] });
      qc.invalidateQueries({ queryKey: ["course-reviews", offering.id] });
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
          <DialogTitle>{group.name} 강의 후기</DialogTitle>
          <DialogDescription>
            본인이 수강한 학기를 선택하고 강의 경험을 공유해주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                수강한 학기
              </label>
              <select
                value={offeringId}
                onChange={(e) => {
                  setOfferingId(e.target.value);
                  const o = group.offerings.find((x) => x.id === e.target.value);
                  if (o) setProfName(o.professor ?? "");
                }}
                className="mt-1 h-9 w-full rounded-md border bg-white px-2 text-sm"
              >
                {group.offerings.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.year}년 {SEMESTER_TERM_LABELS[o.term]}
                    {o.professor ? ` · ${o.professor}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">교수</label>
              <input
                type="text"
                value={profName}
                onChange={(e) => setProfName(e.target.value)}
                placeholder="담당 교수"
                className="mt-1 h-9 w-full rounded-md border bg-white px-2 text-sm"
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
                  className="mt-1 h-9 w-full rounded-md border bg-white px-2 text-sm"
                >
                  {Object.entries(EXAM_TYPE_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">기말고사</label>
                <select
                  value={finalType}
                  onChange={(e) => setFinalType(e.target.value as ExamType)}
                  className="mt-1 h-9 w-full rounded-md border bg-white px-2 text-sm"
                >
                  {Object.entries(EXAM_TYPE_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
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
                  className="mt-1 h-9 w-full rounded-md border bg-white px-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">과제 빈도</label>
                <select
                  value={assignmentFrequency}
                  onChange={(e) =>
                    setAssignmentFrequency(e.target.value as AssignmentFrequency)
                  }
                  className="mt-1 h-9 w-full rounded-md border bg-white px-2 text-sm"
                >
                  {Object.entries(ASSIGNMENT_FREQUENCY_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
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
              className="mt-1 h-9 w-full rounded-md border bg-white px-2 text-sm"
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
