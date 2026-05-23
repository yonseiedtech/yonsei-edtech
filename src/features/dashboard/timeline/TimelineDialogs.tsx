"use client";

/**
 * TimelineDialogs — 시간대 설정 / 빠른 메모 / 빠른 할 일 Dialog 3종.
 * `DailyClassTimelineWidget` 에서 분할 (Phase B 단순 추출 — 기능 변경 X).
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  COURSE_TODO_TYPE_LABELS,
  COURSE_TODO_TYPE_COLORS,
  type CourseTodoType,
} from "@/types";
import { DEFAULT_HOUR_END, DEFAULT_HOUR_START, formatHour } from "./types";

const TODO_TYPE_OPTIONS: CourseTodoType[] = [
  "assignment",
  "paper_reading",
  "paper_writing",
  "presentation_prep",
  "other",
];

export interface QuickMemoDraft {
  courseOfferingId: string;
  courseName: string;
  date: string;
  content: string;
}

export interface QuickTodoDraft {
  courseOfferingId: string;
  courseName: string;
  sessionDate: string;
  type: CourseTodoType;
  content: string;
  dueDate: string;
}

export function HourRangeSettingsDialog({
  open,
  onOpenChange,
  hourStart,
  hourEnd,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hourStart: number;
  hourEnd: number;
  onSave: (start: number, end: number) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>일간 타임라인 시간대 설정</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-xs text-muted-foreground">
            일간 뷰에서 표시할 시간대를 선택하세요. 설정은 이 브라우저에만 저장됩니다.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-muted-foreground">시작 시간</span>
              <select
                value={hourStart}
                onChange={(e) => {
                  const s = Number(e.target.value);
                  const newEnd = hourEnd <= s ? Math.min(24, s + 1) : hourEnd;
                  onSave(s, newEnd);
                }}
                className="rounded border px-2 py-1.5 text-sm"
              >
                {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                  <option key={h} value={h}>{formatHour(h)}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-muted-foreground">종료 시간</span>
              <select
                value={hourEnd}
                onChange={(e) => onSave(hourStart, Number(e.target.value))}
                className="rounded border px-2 py-1.5 text-sm"
              >
                {Array.from({ length: 24 - hourStart }, (_, i) => hourStart + 1 + i).map((h) => (
                  <option key={h} value={h}>{formatHour(h)}</option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="button"
            onClick={() => onSave(DEFAULT_HOUR_START, DEFAULT_HOUR_END)}
            className="text-[11px] text-muted-foreground underline hover:text-foreground"
          >
            기본값(17:00~00:00)으로 되돌리기
          </button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function QuickMemoDialog({
  draft,
  onChange,
  onClose,
  onSave,
  saving,
}: {
  draft: QuickMemoDraft | null;
  onChange: (next: QuickMemoDraft) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <Dialog open={!!draft} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{draft?.courseName} — 수업 메모</DialogTitle>
        </DialogHeader>
        {draft && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {draft.date} 수업에 대한 개인 메모입니다.
            </p>
            <textarea
              value={draft.content}
              onChange={(e) =>
                onChange({ ...draft, content: e.target.value })
              }
              rows={6}
              autoFocus
              className="w-full rounded-md border bg-card px-3 py-2 text-sm"
              placeholder="오늘 수업에서 배운 내용, 느낀 점, 질문 등을 자유롭게 기록하세요."
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function QuickTodoDialog({
  draft,
  onChange,
  onClose,
  onSave,
  saving,
}: {
  draft: QuickTodoDraft | null;
  onChange: (next: QuickTodoDraft) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <Dialog open={!!draft} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{draft?.courseName} — 할 일 추가</DialogTitle>
        </DialogHeader>
        {draft && (
          <div className="space-y-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">유형</span>
              <div className="flex flex-wrap gap-1">
                {TODO_TYPE_OPTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onChange({ ...draft, type: t })}
                    className={`rounded-md px-2 py-1 text-[11px] ${
                      draft.type === t
                        ? COURSE_TODO_TYPE_COLORS[t] + " ring-1 ring-offset-1 ring-primary/40"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {COURSE_TODO_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">내용</span>
              <Input
                value={draft.content}
                onChange={(e) => onChange({ ...draft, content: e.target.value })}
                autoFocus
                placeholder="예) Dewey 챕터 2 읽기"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">기한 (선택)</span>
              <Input
                type="date"
                value={draft.dueDate}
                onChange={(e) => onChange({ ...draft, dueDate: e.target.value })}
              />
            </label>
            <p className="text-[10px] text-muted-foreground">
              이 할 일은 {draft.sessionDate} 수업({draft.courseName})에 연결됩니다.
            </p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
