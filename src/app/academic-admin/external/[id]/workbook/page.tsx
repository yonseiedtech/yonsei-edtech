"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  ClipboardList,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  workbookTasksApi,
  workbookSubmissionsApi,
} from "@/lib/bkend";
import type {
  ConferenceWorkbookTask,
  ConferenceWorkbookSubmission,
  WorkbookTaskType,
} from "@/types";
import {
  WORKBOOK_TASK_TYPE_LABELS,
  WORKBOOK_STATUS_LABELS,
  WORKBOOK_STATUS_COLORS,
} from "@/types";

// ── Task form state ────────────────────────────────────────────

type TaskForm = {
  title: string;
  description: string;
  type: WorkbookTaskType;
  required: boolean;
  dueAt: string;
  order: string;
  active: boolean;
};

const EMPTY_TASK_FORM: TaskForm = {
  title: "",
  description: "",
  type: "checkbox",
  required: false,
  dueAt: "",
  order: "0",
  active: true,
};

function taskToForm(task: ConferenceWorkbookTask): TaskForm {
  return {
    title: task.title,
    description: task.description ?? "",
    type: task.type,
    required: task.required,
    dueAt: task.dueAt ?? "",
    order: String(task.order),
    active: task.active,
  };
}

// ── Task form dialog ───────────────────────────────────────────

function TaskFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
  isSaving,
  isEdit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: TaskForm;
  onSubmit: (form: TaskForm) => void;
  isSaving: boolean;
  isEdit: boolean;
}) {
  const [form, setForm] = useState<TaskForm>(initial);

  function patch<K extends keyof TaskForm>(key: K, value: TaskForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleOpenChange(v: boolean) {
    if (v) setForm(initial);
    onOpenChange(v);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("제목은 필수 입력 항목입니다.");
      return;
    }
    onSubmit(form);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "과제 수정" : "과제 추가"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 제목 */}
          <div className="space-y-1">
            <label className="text-sm font-medium">
              제목 <span className="text-destructive">*</span>
            </label>
            <Input
              value={form.title}
              onChange={(e) => patch("title", e.target.value)}
              placeholder="과제 제목 입력"
              required
            />
          </div>

          {/* 설명 */}
          <div className="space-y-1">
            <label className="text-sm font-medium">설명</label>
            <Textarea
              value={form.description}
              onChange={(e) => patch("description", e.target.value)}
              placeholder="과제에 대한 설명 (선택)"
              rows={3}
            />
          </div>

          {/* 유형 */}
          <div className="space-y-1">
            <label className="text-sm font-medium">유형</label>
            <select
              value={form.type}
              onChange={(e) => patch("type", e.target.value as WorkbookTaskType)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {(Object.entries(WORKBOOK_TASK_TYPE_LABELS) as [WorkbookTaskType, string][]).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </div>

          {/* 마감일시 */}
          <div className="space-y-1">
            <label className="text-sm font-medium">마감 일시 (선택)</label>
            <Input
              type="datetime-local"
              value={form.dueAt}
              onChange={(e) => patch("dueAt", e.target.value)}
            />
          </div>

          {/* 순서 */}
          <div className="space-y-1">
            <label className="text-sm font-medium">순서</label>
            <Input
              type="number"
              value={form.order}
              onChange={(e) => patch("order", e.target.value)}
              min={0}
            />
          </div>

          {/* 필수 / 활성 */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.required}
                onChange={(e) => patch("required", e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              필수 과제
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => patch("active", e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              참여자에게 공개
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "저장 중…" : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Submission list for a task ─────────────────────────────────

function TaskSubmissions({
  taskId,
  activityId,
}: {
  taskId: string;
  activityId: string;
}) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["workbook-submissions-task", taskId],
    queryFn: async () => {
      const res = await workbookSubmissionsApi.listByTask(taskId);
      return res.data as ConferenceWorkbookSubmission[];
    },
  });

  const submissions = data ?? [];

  async function saveFeedback(sub: ConferenceWorkbookSubmission) {
    const text = feedbacks[sub.id] ?? sub.feedback ?? "";
    setSavingId(sub.id);
    try {
      await workbookSubmissionsApi.upsert(sub.id, {
        feedback: text,
        feedbackBy: user?.id,
        feedbackByName: user?.name,
        feedbackAt: new Date().toISOString(),
      });
      qc.invalidateQueries({ queryKey: ["workbook-submissions-task", taskId] });
      toast.success("피드백을 저장했습니다.");
    } catch {
      toast.error("피드백 저장에 실패했습니다.");
    } finally {
      setSavingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">불러오는 중…</div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        제출된 답변이 없습니다.
      </div>
    );
  }

  return (
    <div className="divide-y">
      {submissions.map((sub) => (
        <div key={sub.id} className="p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{sub.userName ?? sub.userId}</span>
            <Badge
              variant="secondary"
              className={WORKBOOK_STATUS_COLORS[sub.status]}
            >
              {WORKBOOK_STATUS_LABELS[sub.status]}
            </Badge>
          </div>

          {/* 제출 내용 */}
          <div className="mt-1 text-xs text-muted-foreground">
            {sub.checked !== undefined && (
              <span>{sub.checked ? "✓ 완료" : "미완료"}</span>
            )}
            {sub.text && <p className="mt-0.5">{sub.text}</p>}
            {sub.rating && <span>별점: {sub.rating}/5</span>}
            {sub.photoUrl && (
              <a
                href={sub.photoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                사진 보기
              </a>
            )}
          </div>

          {/* 피드백 */}
          <div className="mt-2 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              운영진 피드백
            </label>
            <Textarea
              rows={2}
              className="text-xs"
              value={feedbacks[sub.id] ?? sub.feedback ?? ""}
              onChange={(e) =>
                setFeedbacks((prev) => ({ ...prev, [sub.id]: e.target.value }))
              }
              placeholder="피드백 내용 입력"
            />
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={savingId === sub.id}
              onClick={() => saveFeedback(sub)}
            >
              {savingId === sub.id ? "저장 중…" : "저장"}
            </Button>
            {sub.feedbackAt && (
              <p className="text-[10px] text-muted-foreground">
                {sub.feedbackByName ?? sub.feedbackBy}가{" "}
                {new Date(sub.feedbackAt).toLocaleString("ko-KR")} 작성
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Task card ──────────────────────────────────────────────────

function TaskCard({
  task,
  onEdit,
  onDelete,
  activityId,
}: {
  task: ConferenceWorkbookTask;
  onEdit: (task: ConferenceWorkbookTask) => void;
  onDelete: (id: string) => void;
  activityId: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="flex items-start gap-3 p-4">
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
            {!task.active && (
              <Badge variant="secondary" className="text-[10px]">비공개</Badge>
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

        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => onEdit(task)}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="수정"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="삭제"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="제출현황 펼치기"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t bg-muted/30">
          <p className="px-4 py-2 text-xs font-medium text-muted-foreground">제출현황</p>
          <TaskSubmissions taskId={task.id} activityId={activityId} />
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────

function WorkbookAdminPage({ activityId }: { activityId: string }) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ConferenceWorkbookTask | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["workbook-tasks", activityId],
    queryFn: async () => {
      const res = await workbookTasksApi.listByActivity(activityId);
      return res.data as ConferenceWorkbookTask[];
    },
    enabled: !!activityId,
  });

  const tasks = data ?? [];

  const createMutation = useMutation({
    mutationFn: (form: TaskForm) =>
      workbookTasksApi.create({
        activityId,
        title: form.title.trim(),
        ...(form.description.trim() && { description: form.description.trim() }),
        type: form.type,
        required: form.required,
        ...(form.dueAt && { dueAt: form.dueAt }),
        order: Number(form.order) || tasks.length,
        active: form.active,
        createdBy: user?.id ?? "",
        createdByName: user?.name,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workbook-tasks", activityId] });
      setDialogOpen(false);
      toast.success("과제를 추가했습니다.");
    },
    onError: () => toast.error("과제 추가에 실패했습니다."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, form }: { id: string; form: TaskForm }) =>
      workbookTasksApi.update(id, {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        type: form.type,
        required: form.required,
        dueAt: form.dueAt || undefined,
        order: Number(form.order),
        active: form.active,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workbook-tasks", activityId] });
      setEditing(null);
      toast.success("과제를 수정했습니다.");
    },
    onError: () => toast.error("과제 수정에 실패했습니다."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => workbookTasksApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workbook-tasks", activityId] });
      toast.success("과제를 삭제했습니다.");
    },
    onError: () => toast.error("과제 삭제에 실패했습니다."),
  });

  function handleDelete(id: string) {
    if (!confirm("이 과제를 삭제하시겠습니까?")) return;
    deleteMutation.mutate(id);
  }

  function handleSubmit(form: TaskForm) {
    if (editing) {
      updateMutation.mutate({ id: editing.id, form });
    } else {
      createMutation.mutate(form);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const dialogInitial = editing ? taskToForm(editing) : { ...EMPTY_TASK_FORM, order: String(tasks.length) };

  return (
    <div className="py-16">
      <div className="mx-auto max-w-3xl px-4">
        <Link
          href={`/academic-admin/external/${activityId}`}
          className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} /> 학술대회 상세로
        </Link>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardList size={20} className="text-primary" />
            <h1 className="text-xl font-bold">워크북 과제 관리</h1>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus size={15} className="mr-1" />
            과제 추가
          </Button>
        </div>

        <p className="mt-1 text-sm text-muted-foreground">
          참여자에게 과제를 부여하고 제출현황과 피드백을 관리합니다.
        </p>

        <div className="mt-6 space-y-3">
          {isLoading ? (
            <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
              불러오는 중…
            </div>
          ) : tasks.length === 0 ? (
            <div className="rounded-xl border bg-card p-8 text-center">
              <ClipboardList size={32} className="mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                아직 등록된 과제가 없습니다. &ldquo;+ 과제 추가&rdquo; 버튼을 눌러 첫 과제를 만들어 보세요.
              </p>
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                activityId={activityId}
                onEdit={(t) => setEditing(t)}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>

      <TaskFormDialog
        open={dialogOpen || !!editing}
        onOpenChange={(v) => {
          if (!v) {
            setDialogOpen(false);
            setEditing(null);
          }
        }}
        initial={dialogInitial}
        onSubmit={handleSubmit}
        isSaving={isSaving}
        isEdit={!!editing}
      />
    </div>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AuthGuard allowedRoles={["staff", "admin", "sysadmin"]}>
      <WorkbookAdminPage activityId={id} />
    </AuthGuard>
  );
}
