"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  ClipboardList,
  Check,
  Star,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  workbookTasksApi,
  workbookSubmissionsApi,
  workbookReviewsApi,
} from "@/lib/bkend";
import { uploadToStorage } from "@/lib/storage";
import type {
  ConferenceWorkbookTask,
  ConferenceWorkbookSubmission,
  ConferenceWorkbookReview,
} from "@/types";
import { WORKBOOK_TASK_TYPE_LABELS } from "@/types";
import { cn } from "@/lib/utils";

// ── Star rating ────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
  readOnly,
}: {
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => !readOnly && setHover(n)}
          onMouseLeave={() => !readOnly && setHover(0)}
          className={cn(
            "transition-colors",
            readOnly ? "cursor-default" : "cursor-pointer",
          )}
          aria-label={`${n}점`}
        >
          <Star
            size={22}
            className={cn(
              (hover || value) >= n
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground",
            )}
          />
        </button>
      ))}
    </div>
  );
}

// ── Chip input ─────────────────────────────────────────────────

function ChipInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  function add() {
    const trimmed = input.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setInput("");
  }

  function remove(item: string) {
    onChange(value.filter((v) => v !== item));
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="text-sm"
        />
        <Button type="button" variant="outline" size="sm" onClick={add}>
          추가
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs"
            >
              {item}
              <button
                type="button"
                onClick={() => remove(item)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="삭제"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Single task widget ─────────────────────────────────────────

function TaskWidget({
  task,
  submission,
  userId,
  activityId,
  onSaved,
}: {
  task: ConferenceWorkbookTask;
  submission: ConferenceWorkbookSubmission | undefined;
  userId: string;
  activityId: string;
  onSaved: () => void;
}) {
  const [text, setText] = useState(submission?.text ?? "");
  const [rating, setRating] = useState(submission?.rating ?? 0);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const subId = `${userId}_${task.id}`;

  async function save(extraData?: Record<string, unknown>) {
    setIsSaving(true);
    try {
      await workbookSubmissionsApi.upsert(subId, {
        userId,
        taskId: task.id,
        activityId,
        status: "completed",
        submittedAt: new Date().toISOString(),
        ...extraData,
      });
      onSaved();
      toast.success("저장했습니다.");
    } catch {
      toast.error("저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCheckbox(checked: boolean) {
    await save({ checked });
  }

  async function handlePhoto(file: File) {
    setIsUploading(true);
    try {
      const { url } = await uploadToStorage(file, "workbook-photos");
      await save({ photoUrl: url });
    } catch {
      toast.error("사진 업로드에 실패했습니다.");
    } finally {
      setIsUploading(false);
    }
  }

  const isCompleted = submission?.status === "completed";

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-3">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-sm">{task.title}</span>
            <Badge variant="secondary" className="text-[10px]">
              {WORKBOOK_TASK_TYPE_LABELS[task.type]}
            </Badge>
            {task.required && (
              <Badge variant="secondary" className="bg-red-50 text-red-700 text-[10px]">
                필수
              </Badge>
            )}
          </div>
          {task.description && (
            <p className="mt-1 text-xs text-muted-foreground">{task.description}</p>
          )}
          {task.dueAt && (
            <p className="mt-1 text-xs text-muted-foreground">
              마감: {new Date(task.dueAt).toLocaleString("ko-KR")}
            </p>
          )}
        </div>
        {isCompleted && (
          <div className="shrink-0 flex items-center gap-1 text-emerald-600 text-xs font-medium">
            <Check size={14} />
            완료
          </div>
        )}
      </div>

      {/* 입력 위젯 */}
      {task.type === "checkbox" && (
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={submission?.checked ?? false}
            onChange={(e) => handleCheckbox(e.target.checked)}
            className="h-5 w-5 rounded border-input"
          />
          <span className="text-sm">{isCompleted ? "완료했습니다" : "완료로 표시하기"}</span>
        </label>
      )}

      {task.type === "text" && (
        <div className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="답변 입력"
            className="text-sm"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={isSaving}
            onClick={() => save({ text })}
          >
            {isSaving ? "…" : "저장"}
          </Button>
        </div>
      )}

      {task.type === "long_text" && (
        <div className="space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="답변을 자세히 입력하세요"
            rows={4}
            className="text-sm"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={isSaving}
            onClick={() => save({ text })}
          >
            {isSaving ? "저장 중…" : "저장"}
          </Button>
        </div>
      )}

      {task.type === "rating" && (
        <div className="space-y-2">
          <StarRating
            value={rating}
            onChange={(v) => {
              setRating(v);
              save({ rating: v });
            }}
          />
          {submission?.rating && (
            <p className="text-xs text-muted-foreground">{submission.rating}점 선택됨</p>
          )}
        </div>
      )}

      {task.type === "photo" && (
        <div className="space-y-2">
          {submission?.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={submission.photoUrl}
              alt="제출 사진"
              className="max-h-48 rounded-lg object-contain"
            />
          )}
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={isUploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePhoto(file);
                e.target.value = "";
              }}
            />
            <span className="inline-flex items-center gap-1.5 rounded border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent cursor-pointer">
              <Upload size={14} />
              {isUploading ? "업로드 중…" : submission?.photoUrl ? "사진 변경" : "사진 업로드"}
            </span>
          </label>
        </div>
      )}

      {/* 피드백 */}
      {submission?.feedback && (
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3">
          <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200 mb-1">
            운영진 피드백
          </p>
          <p className="text-sm text-emerald-900 dark:text-emerald-100">{submission.feedback}</p>
          {submission.feedbackByName && submission.feedbackAt && (
            <p className="mt-1 text-[10px] text-emerald-700 dark:text-emerald-300">
              {submission.feedbackByName} ·{" "}
              {new Date(submission.feedbackAt).toLocaleDateString("ko-KR")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Review section ─────────────────────────────────────────────

function ReviewSection({
  userId,
  activityId,
  existing,
  onSaved,
}: {
  userId: string;
  activityId: string;
  existing: ConferenceWorkbookReview | undefined;
  onSaved: () => void;
}) {
  const [overallReview, setOverallReview] = useState(existing?.overallReview ?? "");
  const [highlights, setHighlights] = useState<string[]>(existing?.highlights ?? []);
  const [suggestions, setSuggestions] = useState<string[]>(existing?.suggestions ?? []);
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [isSaving, setIsSaving] = useState(false);

  const { user } = useAuthStore();

  async function handleSave() {
    if (!overallReview.trim()) {
      toast.error("전체 후기를 입력해 주세요.");
      return;
    }
    setIsSaving(true);
    try {
      const reviewId = `${userId}_${activityId}`;
      await workbookReviewsApi.upsert(reviewId, {
        userId,
        userName: user?.name,
        activityId,
        overallReview: overallReview.trim(),
        highlights,
        suggestions,
        rating: rating || undefined,
        submittedAt: existing?.submittedAt ?? new Date().toISOString(),
      });
      onSaved();
      toast.success("후기를 저장했습니다.");
    } catch {
      toast.error("후기 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mt-8 rounded-2xl border bg-card p-5 shadow-sm space-y-4">
      <h2 className="text-base font-bold">학술대회 전체 후기</h2>

      <div className="space-y-1">
        <label className="text-sm font-medium">
          전체 후기 <span className="text-destructive">*</span>
        </label>
        <Textarea
          value={overallReview}
          onChange={(e) => setOverallReview(e.target.value)}
          placeholder="학술대회에 대한 전반적인 후기를 작성해 주세요"
          rows={4}
          className="text-sm"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">인상 깊었던 점</label>
        <ChipInput
          value={highlights}
          onChange={setHighlights}
          placeholder="항목 입력 후 Enter 또는 추가"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">운영진에게 제안</label>
        <ChipInput
          value={suggestions}
          onChange={setSuggestions}
          placeholder="개선 제안 입력 후 Enter 또는 추가"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">만족도 (1-5점)</label>
        <StarRating value={rating} onChange={setRating} />
      </div>

      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? "저장 중…" : existing ? "후기 수정" : "후기 제출"}
      </Button>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────

function WorkbookPage({ activityId }: { activityId: string }) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const userId = user?.id ?? "";

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["workbook-tasks", activityId],
    queryFn: async () => {
      const res = await workbookTasksApi.listByActivity(activityId);
      const all = res.data as ConferenceWorkbookTask[];
      // QA-D2: order undefined 방어 (admin 페이지와 일관)
      return all
        .filter((t) => t.active)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    },
    enabled: !!activityId,
  });

  const { data: submissions = [], isLoading: subsLoading } = useQuery({
    queryKey: ["workbook-submissions", userId, activityId],
    queryFn: async () => {
      const res = await workbookSubmissionsApi.listByUser(userId, activityId);
      return res.data as ConferenceWorkbookSubmission[];
    },
    enabled: !!userId && !!activityId,
  });

  const { data: review } = useQuery({
    queryKey: ["workbook-review", userId, activityId],
    queryFn: async () => {
      try {
        const res = await workbookReviewsApi.get(`${userId}_${activityId}`);
        return res as ConferenceWorkbookReview | undefined;
      } catch {
        return undefined;
      }
    },
    enabled: !!userId && !!activityId,
  });

  const subMap = new Map(submissions.map((s) => [s.taskId, s]));
  const completedCount = tasks.filter((t) => subMap.get(t.id)?.status === "completed").length;
  const total = tasks.length;
  const progressPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["workbook-submissions", userId, activityId] });
  }

  function invalidateReview() {
    qc.invalidateQueries({ queryKey: ["workbook-review", userId, activityId] });
  }

  const isLoading = tasksLoading || subsLoading;

  return (
    <div className="py-16">
      <div className="mx-auto max-w-3xl px-4">
        <Link
          href={`/activities/external/${activityId}`}
          className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} /> 학술대회 상세로
        </Link>

        <div className="flex items-center gap-2 mb-1">
          <ClipboardList size={20} className="text-primary" />
          <h1 className="text-xl font-bold">워크북</h1>
        </div>
        <p className="text-sm text-muted-foreground">과제를 완료하고 학술대회 참여를 기록하세요.</p>

        {/* 진행률 */}
        {total > 0 && (
          <div className="mt-5 rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium">진행률</span>
              <span className="text-muted-foreground">
                {completedCount}/{total} 완료 ({progressPct}%)
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* 과제 목록 */}
        <div className="mt-6 space-y-3">
          {isLoading ? (
            <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
              불러오는 중…
            </div>
          ) : tasks.length === 0 ? (
            <div className="rounded-2xl border bg-card p-8 text-center">
              <ClipboardList size={32} className="mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                아직 등록된 과제가 없습니다.
              </p>
            </div>
          ) : (
            tasks.map((task) => (
              <TaskWidget
                key={task.id}
                task={task}
                submission={subMap.get(task.id)}
                userId={userId}
                activityId={activityId}
                onSaved={invalidate}
              />
            ))
          )}
        </div>

        {/* 전체 후기 */}
        {!isLoading && (
          <ReviewSection
            userId={userId}
            activityId={activityId}
            existing={review}
            onSaved={invalidateReview}
          />
        )}
      </div>
    </div>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AuthGuard>
      <WorkbookPage activityId={id} />
    </AuthGuard>
  );
}
