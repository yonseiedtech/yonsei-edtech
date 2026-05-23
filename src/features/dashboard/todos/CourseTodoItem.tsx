"use client";

/**
 * CourseTodoItem — 수업 할 일 단일 행 렌더.
 * `MyTodosWidget` 에서 분할 (Phase B 단순 추출 — 기능 변경 X).
 */

import Link from "next/link";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDday } from "@/lib/dday";
import { fmtMin } from "@/lib/courseSchedule";
import {
  COURSE_TODO_TYPE_COLORS,
  COURSE_TODO_TYPE_LABELS,
  type CourseTodo,
  type CourseCategory,
  type SemesterTerm,
} from "@/types";
import { cn } from "@/lib/utils";
import { LectureReviewItem } from "./LectureReviewItem";

export interface CourseInfo {
  name: string;
  startMin: number | null;
  year?: number;
  term?: SemesterTerm;
  category?: CourseCategory;
  professor?: string;
}

export interface CourseTodoItemProps {
  t: CourseTodo;
  info?: CourseInfo;
  userId: string;
  userName?: string;
  editingCourseTodoId: string | null;
  editingContent: string;
  onEditingContentChange: (next: string) => void;
  onToggle: (t: CourseTodo) => void | Promise<void>;
  onStartEdit: (t: CourseTodo) => void;
  onCancelEdit: () => void;
  onSaveEdit: (t: CourseTodo) => void | Promise<void>;
  onDelete: (t: CourseTodo) => void | Promise<void>;
}

export function CourseTodoItem({
  t,
  info,
  userId,
  userName,
  editingCourseTodoId,
  editingContent,
  onEditingContentChange,
  onToggle,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: CourseTodoItemProps) {
  const courseName = info?.name ?? "(과목)";
  const dueTime = info?.startMin != null ? fmtMin(info.startMin) : undefined;
  const sessionLabel = t.sessionDate
    ? (() => {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t.sessionDate);
        if (!m) return null;
        return `${Number(m[2])}/${Number(m[3])} 수업`;
      })()
    : null;

  // Sprint 52: 미완료 lecture_review 는 인라인 후기 폼으로 렌더
  if (t.type === "lecture_review" && !t.completed) {
    return (
      <LectureReviewItem
        t={t}
        courseName={courseName}
        sessionLabel={sessionLabel}
        info={info}
        userId={userId}
        userName={userName}
        onToggle={onToggle}
      />
    );
  }

  const isEditing = editingCourseTodoId === t.id;
  return (
    <li className="group flex items-center gap-2 rounded-md bg-card px-2.5 py-1.5 text-[12px]">
      <input
        type="checkbox"
        checked={!!t.completed}
        onChange={() => void onToggle(t)}
        className="shrink-0"
        aria-label="완료 토글"
        disabled={isEditing}
      />
      <Badge
        variant="secondary"
        className={cn("text-[10px]", COURSE_TODO_TYPE_COLORS[t.type])}
      >
        {COURSE_TODO_TYPE_LABELS[t.type]}
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
      {isEditing ? (
        <Input
          value={editingContent}
          onChange={(e) => onEditingContentChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void onSaveEdit(t);
            } else if (e.key === "Escape") {
              e.preventDefault();
              onCancelEdit();
            }
          }}
          autoFocus
          className="h-6 flex-1 px-2 py-0 text-[12px]"
        />
      ) : (
        <span
          className={cn(
            "flex-1 truncate",
            t.completed && "text-muted-foreground line-through",
          )}
        >
          {t.content}
        </span>
      )}
      {!isEditing && t.dueDate &&
        (() => {
          const dd = formatDday(t.dueDate, dueTime);
          if (!dd) return null;
          const cls =
            dd.kind === "past"
              ? "bg-rose-50 text-rose-700 border border-rose-200"
              : dd.kind === "today"
                ? "bg-amber-50 text-amber-800 border border-amber-200"
                : dd.diffDays <= 3
                  ? "bg-orange-50 text-orange-700 border border-orange-200"
                  : "bg-muted/60 text-muted-foreground border";
          return (
            <span
              className={cn(
                "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
                cls,
              )}
              title={`기한 ${t.dueDate}`}
            >
              {dd.label}
            </span>
          );
        })()}
      {isEditing ? (
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => void onSaveEdit(t)}
            className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
            title="저장 (Enter)"
            aria-label="저장"
          >
            <Check size={12} />
          </button>
          <button
            type="button"
            onClick={onCancelEdit}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            title="취소 (Esc)"
            aria-label="취소"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-0.5 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
          <button
            type="button"
            onClick={() => onStartEdit(t)}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-primary"
            title="수정"
            aria-label="수정"
          >
            <Pencil size={11} />
          </button>
          <button
            type="button"
            onClick={() => void onDelete(t)}
            className="rounded p-1 text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
            title="삭제"
            aria-label="삭제"
          >
            <Trash2 size={11} />
          </button>
        </div>
      )}
    </li>
  );
}
