"use client";

/**
 * LectureReviewItem — 미완료 lecture_review 강의 후기 인라인 입력 폼.
 * `MyTodosWidget` 에서 분할 (Phase B 단순 추출 — 기능 변경 X).
 */

import Link from "next/link";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { courseReviewsApi, courseTodosApi } from "@/lib/bkend";
import {
  COURSE_TODO_TYPE_COLORS,
  type CourseTodo,
  type CourseCategory,
  type SemesterTerm,
} from "@/types";
import { cn } from "@/lib/utils";
import { SEMANTIC } from "@/lib/design-tokens";

export interface LectureReviewItemProps {
  t: CourseTodo;
  courseName: string;
  sessionLabel: string | null;
  info?: {
    name: string;
    startMin: number | null;
    year?: number;
    term?: SemesterTerm;
    category?: CourseCategory;
    professor?: string;
  };
  userId: string;
  userName?: string;
  onToggle: (t: CourseTodo) => void | Promise<void>;
}

export function LectureReviewItem({
  t,
  courseName,
  sessionLabel,
  info,
  userId,
  userName,
  onToggle,
}: LectureReviewItemProps) {
  const qc = useQueryClient();
  const [rating, setRating] = useState<number>(4);
  const [comment, setComment] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  async function submitReview() {
    const trimmed = comment.trim();
    if (trimmed.length < 5) {
      toast.error("후기를 5자 이상 입력해주세요.");
      return;
    }
    if (!info?.year || !info?.term) {
      toast.error("강의 정보 로드 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      await courseReviewsApi.create({
        courseOfferingId: t.courseOfferingId,
        courseName: info.name,
        professor: info.professor,
        category: info.category,
        authorId: userId,
        authorName: userName ?? "",
        anonymous: false,
        rating,
        comment: trimmed,
        recommend: rating >= 3,
        year: info.year,
        term: info.term,
        helpfulCount: 0,
        helpfulBy: [],
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      await courseTodosApi.update(t.id, {
        completed: true,
        completedAt: nowIso,
      });
      await qc.refetchQueries({
        queryKey: ["my-course-todos", userId],
        type: "active",
      });
      toast.success("후기 등록 완료! 동기들에게 큰 도움이 됩니다.");
    } catch (e) {
      toast.error(`후기 등록 실패: ${(e as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <li className={cn("rounded-md border px-2.5 py-2", SEMANTIC.danger.border, SEMANTIC.danger.bg)}>
      <div className="flex items-center gap-2 text-[12px]">
        <input
          type="checkbox"
          checked={false}
          onChange={() => void onToggle(t)}
          className="shrink-0"
          aria-label="완료 토글"
          title="후기 없이 완료 처리"
        />
        <Badge
          variant="secondary"
          className={cn("text-[10px]", COURSE_TODO_TYPE_COLORS.lecture_review)}
        >
          수업 후기
        </Badge>
        <Link
          href={`/courses/${t.courseOfferingId}/schedule`}
          className="truncate text-[10px] text-muted-foreground hover:text-primary"
          title={courseName}
        >
          {courseName}
        </Link>
        {sessionLabel && (
          <span className="shrink-0 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">
            {sessionLabel}
          </span>
        )}
        <span className={cn("ml-auto truncate text-[11px] font-semibold", SEMANTIC.danger.accent)}>
          한 줄 후기 작성
        </span>
      </div>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div
          className="flex shrink-0 items-center gap-1"
          role="radiogroup"
          aria-label="평점 (1~5)"
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={cn(
                "h-7 w-7 rounded-full text-xs font-bold transition-colors",
                rating >= n
                  ? "bg-amber-400 text-white shadow-sm"
                  : "bg-card text-muted-foreground hover:bg-amber-50",
              )}
              aria-pressed={rating === n}
              aria-label={`${n}점`}
              disabled={submitting}
            >
              {n}
            </button>
          ))}
        </div>
        <Input
          placeholder="이번 수업 어땠나요? 한 줄로 남겨주세요"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submitReview();
            }
          }}
          className="h-9 flex-1 text-[12px]"
          disabled={submitting}
        />
        <Button
          type="button"
          size="sm"
          onClick={() => void submitReview()}
          disabled={submitting || comment.trim().length < 5}
          className="h-9 shrink-0 px-3 text-[12px]"
        >
          {submitting ? "전송…" : "제출"}
        </Button>
      </div>
    </li>
  );
}
