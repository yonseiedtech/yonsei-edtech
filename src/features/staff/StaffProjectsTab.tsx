"use client";

import { useState } from "react";
import {
  Plus, ArrowLeft, Trash2, Pencil, Check, X,
  AlertTriangle, Clock, User2, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAdminOrSysadmin } from "@/lib/permissions";
import MemberAutocomplete, { type SelectedMember } from "@/components/ui/MemberAutocomplete";
import {
  useStaffProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useStaffTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  getDueDateStatus,
  TASK_STATUS_LABELS,
  TASK_STATUS_CHIP,
  TASK_STATUS_ORDER,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_CHIP,
  type StaffProject,
  type StaffTask,
  type TaskStatus,
  type TaskChecklist,
} from "./staff-store";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDateShort(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.slice(0, 10);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function diffDays(dueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function checklistProgress(checklist: TaskChecklist[] | undefined): { done: number; total: number } {
  if (!checklist || checklist.length === 0) return { done: 0, total: 0 };
  return { done: checklist.filter((c) => c.done).length, total: checklist.length };
}

// ── Project Summary Dashboard ──────────────────────────────────────────────────

function ProjectSummary({ tasks }: { tasks: StaffTask[] }) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const delayed = tasks.filter((t) => t.status !== "done" && getDueDateStatus(t.dueDate) === "overdue").length;
  const unassigned = tasks.filter((t) => !t.assigneeId && t.status !== "done").length;
  const completionPct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mb-4">
      <div className="rounded-xl border bg-card p-3 text-center">
        <p className="text-2xl font-bold text-foreground">{completionPct}%</p>
        <p className="text-xs text-muted-foreground mt-0.5">완료율 ({done}/{total})</p>
      </div>
      <div className={cn("rounded-xl border p-3 text-center", delayed > 0 ? "border-destructive/30 bg-destructive/5" : "bg-card")}>
        <p className={cn("text-2xl font-bold", delayed > 0 ? "text-destructive" : "text-foreground")}>{delayed}</p>
        <p className="text-xs text-muted-foreground mt-0.5">지연 건수</p>
      </div>
      <div className={cn("rounded-xl border p-3 text-center", unassigned > 0 ? "border-warning/30 bg-warning/5" : "bg-card")}>
        <p className={cn("text-2xl font-bold", unassigned > 0 ? "text-warning" : "text-foreground")}>{unassigned}</p>
        <p className="text-xs text-muted-foreground mt-0.5">미배정 건수</p>
      </div>
      <div className="rounded-xl border bg-card p-3 text-center">
        <div className="flex justify-center gap-1">
          {TASK_STATUS_ORDER.map((s) => (
            <span key={s} className="text-xs font-semibold">
              {tasks.filter((t) => t.status === s).length}
            </span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1">할일/진행/검토/완료</p>
      </div>
    </div>
  );
}

// ── Task Card ──────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  projectId,
  onEdit,
}: {
  task: StaffTask;
  projectId: string;
  onEdit: (task: StaffTask) => void;
}) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const dueSt = getDueDateStatus(task.dueDate);
  const { done: clDone, total: clTotal } = checklistProgress(task.checklist);
  const isUnassigned = !task.assigneeId;

  const moveStatus = (direction: "prev" | "next") => {
    const idx = TASK_STATUS_ORDER.indexOf(task.status);
    const nextIdx = direction === "next" ? idx + 1 : idx - 1;
    if (nextIdx < 0 || nextIdx >= TASK_STATUS_ORDER.length) return;
    updateTask.mutate(
      { id: task.id, projectId, data: { status: TASK_STATUS_ORDER[nextIdx] } },
      { onError: () => toast.error("상태 변경 실패") },
    );
  };

  const handleDelete = () => {
    if (!confirm("이 태스크를 삭제하시겠습니까?")) return;
    deleteTask.mutate(
      { id: task.id, projectId },
      {
        onSuccess: () => toast.success("태스크가 삭제되었습니다."),
        onError: () => toast.error("삭제에 실패했습니다."),
      },
    );
  };

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-3 space-y-2 shadow-sm",
        isUnassigned && task.status !== "done" && "border-warning/30",
      )}
    >
      {/* Title + actions */}
      <div className="flex items-start gap-1.5">
        <p className="flex-1 text-sm font-medium leading-snug">{task.title}</p>
        <button
          type="button"
          onClick={() => onEdit(task)}
          className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          title="편집"
        >
          <Pencil size={12} />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/5 hover:text-destructive"
          title="삭제"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Assignee */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <User2 size={11} />
        {task.assigneeName ? (
          <span>{task.assigneeName}</span>
        ) : (
          <span className="font-semibold text-warning">미배정</span>
        )}
      </div>

      {/* Due date */}
      {task.dueDate && (
        <div
          className={cn(
            "flex items-center gap-1 text-xs",
            dueSt === "overdue" && "text-destructive",
            dueSt === "warn" && "text-warning",
            !dueSt && "text-muted-foreground",
          )}
        >
          {dueSt === "overdue" && <AlertTriangle size={11} />}
          {dueSt === "warn" && <Clock size={11} />}
          <span>
            {formatDateShort(task.dueDate)}
            {dueSt === "overdue" && " (기한 초과)"}
            {dueSt === "warn" && ` (D-${diffDays(task.dueDate)})`}
          </span>
        </div>
      )}

      {/* Checklist progress */}
      {clTotal > 0 && (
        <div className="space-y-0.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>체크리스트</span>
            <span>{clDone}/{clTotal}</span>
          </div>
          <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: clTotal > 0 ? `${(clDone / clTotal) * 100}%` : "0%" }}
            />
          </div>
        </div>
      )}

      {/* Status move buttons */}
      <div className="flex items-center gap-1 pt-0.5">
        <button
          type="button"
          disabled={task.status === "todo" || updateTask.isPending}
          onClick={() => moveStatus("prev")}
          className="flex-1 rounded border px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted disabled:opacity-30"
        >
          ← 이전
        </button>
        <span className={cn("rounded px-2 py-0.5 text-[11px] font-semibold", TASK_STATUS_CHIP[task.status])}>
          {TASK_STATUS_LABELS[task.status]}
        </span>
        <button
          type="button"
          disabled={task.status === "done" || updateTask.isPending}
          onClick={() => moveStatus("next")}
          className="flex-1 rounded border px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted disabled:opacity-30"
        >
          다음 →
        </button>
      </div>
    </div>
  );
}

// ── Task Edit Modal ────────────────────────────────────────────────────────────

function TaskModal({
  projectId,
  task,
  maxOrder,
  currentUserId,
  onClose,
}: {
  projectId: string;
  task?: StaffTask;
  maxOrder: number;
  currentUserId: string;
  onClose: () => void;
}) {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const isEdit = !!task;

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "todo");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? "");
  const [assigneeName, setAssigneeName] = useState(task?.assigneeName ?? "");
  const [checklist, setChecklist] = useState<TaskChecklist[]>(task?.checklist ?? []);
  const [newCheckItem, setNewCheckItem] = useState("");

  const handleAssignee = (m: SelectedMember) => {
    setAssigneeId(m.id);
    setAssigneeName(m.name);
  };

  const handleClearAssignee = () => {
    setAssigneeId("");
    setAssigneeName("");
  };

  const addCheckItem = () => {
    const label = newCheckItem.trim();
    if (!label) return;
    setChecklist((prev) => [...prev, { label, done: false }]);
    setNewCheckItem("");
  };

  const toggleCheckItem = (i: number) => {
    setChecklist((prev) => prev.map((c, idx) => idx === i ? { ...c, done: !c.done } : c));
  };

  const removeCheckItem = (i: number) => {
    setChecklist((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (isEdit && task) {
      updateTask.mutate(
        {
          id: task.id,
          projectId,
          data: {
            title: title.trim(),
            description: description.trim() || undefined,
            status,
            dueDate: dueDate || undefined,
            assigneeId: assigneeId || undefined,
            assigneeName: assigneeName || undefined,
            checklist: checklist.length > 0 ? checklist : undefined,
          },
        },
        {
          onSuccess: () => { toast.success("태스크가 수정되었습니다."); onClose(); },
          onError: () => toast.error("수정에 실패했습니다."),
        },
      );
    } else {
      createTask.mutate(
        {
          projectId,
          title: title.trim(),
          description: description.trim() || undefined,
          status,
          dueDate: dueDate || undefined,
          assigneeId: assigneeId || undefined,
          assigneeName: assigneeName || undefined,
          checklist: checklist.length > 0 ? checklist : undefined,
          order: maxOrder + 1,
          createdBy: currentUserId,
        },
        {
          onSuccess: () => { toast.success("태스크가 추가되었습니다."); onClose(); },
          onError: () => toast.error("추가에 실패했습니다."),
        },
      );
    }
  };

  const isPending = createTask.isPending || updateTask.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-card shadow-2xl border overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="font-bold">{isEdit ? "태스크 편집" : "태스크 추가"}</h3>
          <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-muted">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">제목 *</label>
            <input
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="태스크 제목"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">설명</label>
            <textarea
              className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="상세 내용 (선택)"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">상태</label>
              <select
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
              >
                {TASK_STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>{TASK_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">마감일</label>
              <input
                type="date"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">담당자</label>
            <MemberAutocomplete
              value={assigneeId}
              displayName={assigneeName || undefined}
              onSelect={handleAssignee}
              onClear={handleClearAssignee}
              approvedOnly
              placeholder="회원 이름을 입력하세요"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">체크리스트</label>
            <div className="space-y-1 mb-2">
              {checklist.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleCheckItem(i)}
                    className={cn(
                      "h-4 w-4 shrink-0 rounded border flex items-center justify-center",
                      item.done ? "bg-primary border-primary" : "border-border",
                    )}
                  >
                    {item.done && <Check size={10} className="text-white" />}
                  </button>
                  <span className={cn("flex-1 text-sm", item.done && "line-through text-muted-foreground")}>
                    {item.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeCheckItem(i)}
                    className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={newCheckItem}
                onChange={(e) => setNewCheckItem(e.target.value)}
                placeholder="항목 추가"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCheckItem(); } }}
              />
              <button
                type="button"
                onClick={addCheckItem}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
              >
                추가
              </button>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isPending || !title.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? "저장 중..." : isEdit ? "저장" : "추가"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Kanban Column ──────────────────────────────────────────────────────────────

function KanbanColumn({
  status,
  tasks,
  projectId,
  onAddTask,
  onEditTask,
}: {
  status: TaskStatus;
  tasks: StaffTask[];
  projectId: string;
  onAddTask: (status: TaskStatus) => void;
  onEditTask: (task: StaffTask) => void;
}) {
  const overdueCount = tasks.filter((t) => getDueDateStatus(t.dueDate) === "overdue").length;

  return (
    <div className="flex min-w-[220px] flex-1 flex-col rounded-xl border bg-muted/30">
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className={cn("rounded px-2 py-0.5 text-xs font-semibold", TASK_STATUS_CHIP[status])}>
            {TASK_STATUS_LABELS[status]}
          </span>
          <span className="text-xs text-muted-foreground">{tasks.length}</span>
          {overdueCount > 0 && (
            <span className="flex items-center gap-0.5 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
              <AlertTriangle size={9} />
              {overdueCount}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onAddTask(status)}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          title="태스크 추가"
        >
          <Plus size={14} />
        </button>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-xs text-muted-foreground">태스크 없음</p>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              projectId={projectId}
              onEdit={onEditTask}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Kanban Board (project detail) ──────────────────────────────────────────────

function KanbanBoard({
  project,
  onBack,
}: {
  project: StaffProject;
  onBack: () => void;
}) {
  const { user } = useAuthStore();
  const isAdmin = isAdminOrSysadmin(user);
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const { data: tasks = [], isLoading } = useStaffTasks(project.id);

  const [myOnly, setMyOnly] = useState(false);
  const [modalStatus, setModalStatus] = useState<TaskStatus | null>(null);
  const [editTask, setEditTask] = useState<StaffTask | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(project.name);

  const currentUserId = user?.id ?? "";
  const filteredTasks = myOnly ? tasks.filter((t) => t.assigneeId === currentUserId) : tasks;
  const maxOrder = tasks.reduce((m, t) => Math.max(m, t.order), 0);

  const handleDeleteProject = () => {
    if (!confirm(`프로젝트 "${project.name}"을 삭제하시겠습니까? 관련 태스크도 모두 삭제됩니다.`)) return;
    deleteProject.mutate(project.id, {
      onSuccess: () => { toast.success("프로젝트가 삭제되었습니다."); onBack(); },
      onError: () => toast.error("삭제에 실패했습니다."),
    });
  };

  const handleRenameProject = () => {
    if (!newName.trim() || newName.trim() === project.name) { setEditingName(false); return; }
    updateProject.mutate(
      { id: project.id, data: { name: newName.trim() } },
      {
        onSuccess: () => { toast.success("프로젝트 이름이 변경되었습니다."); setEditingName(false); },
        onError: () => toast.error("변경에 실패했습니다."),
      },
    );
  };

  const handleStatusChange = (newStatus: StaffProject["status"]) => {
    updateProject.mutate({ id: project.id, data: { status: newStatus } });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
        >
          <ArrowLeft size={14} />
          목록
        </button>
        {editingName ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              className="flex-1 rounded-lg border bg-background px-3 py-1.5 text-sm font-bold outline-none focus:ring-2 focus:ring-ring"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleRenameProject(); if (e.key === "Escape") setEditingName(false); }}
              autoFocus
            />
            <button type="button" onClick={handleRenameProject} className="rounded p-1 text-primary hover:bg-muted"><Check size={15} /></button>
            <button type="button" onClick={() => setEditingName(false)} className="rounded p-1 text-muted-foreground hover:bg-muted"><X size={15} /></button>
          </div>
        ) : (
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <h2 className="truncate text-lg font-bold">{project.name}</h2>
            <button type="button" onClick={() => { setNewName(project.name); setEditingName(true); }} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              <Pencil size={13} />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={project.status}
            onChange={(e) => handleStatusChange(e.target.value as StaffProject["status"])}
            className="rounded-lg border bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="planning">기획 중</option>
            <option value="active">진행 중</option>
            <option value="done">완료</option>
          </select>
          {isAdmin && (
            <button type="button" onClick={handleDeleteProject} className="rounded-lg border px-2 py-1.5 text-xs text-destructive hover:bg-destructive/5">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <ProjectSummary tasks={tasks} />

      {/* Controls */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={myOnly}
            onChange={(e) => setMyOnly(e.target.checked)}
            className="accent-primary"
          />
          내 담당만 보기
        </label>
        <button
          type="button"
          onClick={() => setModalStatus("todo")}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90"
        >
          <Plus size={14} />
          태스크 추가
        </button>
      </div>

      {/* Kanban */}
      {isLoading ? (
        <div className="flex gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 flex-1 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {TASK_STATUS_ORDER.map((s) => (
            <KanbanColumn
              key={s}
              status={s}
              tasks={filteredTasks.filter((t) => t.status === s)}
              projectId={project.id}
              onAddTask={(st) => setModalStatus(st)}
              onEditTask={(t) => setEditTask(t)}
            />
          ))}
        </div>
      )}

      {/* Assignee load breakdown */}
      {tasks.length > 0 && (() => {
        const assigneeMap: Record<string, { name: string; count: number }> = {};
        tasks.forEach((t) => {
          if (t.assigneeId && t.assigneeName) {
            if (!assigneeMap[t.assigneeId]) assigneeMap[t.assigneeId] = { name: t.assigneeName, count: 0 };
            assigneeMap[t.assigneeId].count++;
          }
        });
        const entries = Object.entries(assigneeMap);
        if (entries.length === 0) return null;
        return (
          <div className="rounded-xl border bg-card p-3">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">담당자별 태스크 수</p>
            <div className="flex flex-wrap gap-2">
              {entries.map(([id, { name, count }]) => (
                <span key={id} className="rounded-full bg-muted px-2.5 py-1 text-xs">
                  {name}: {count}건
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Task modal */}
      {(modalStatus !== null || editTask !== null) && (
        <TaskModal
          projectId={project.id}
          task={editTask ?? undefined}
          maxOrder={maxOrder}
          currentUserId={currentUserId}
          onClose={() => { setModalStatus(null); setEditTask(null); }}
        />
      )}
    </div>
  );
}

// ── Project List ───────────────────────────────────────────────────────────────

function CreateProjectForm({ onClose }: { onClose: () => void }) {
  const { user } = useAuthStore();
  const createProject = useCreateProject();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;
    createProject.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        ownerId: user.id,
        ownerName: user.name,
        status: "planning",
        dueDate: dueDate || undefined,
        createdBy: user.id,
      },
      {
        onSuccess: () => { toast.success("프로젝트가 생성되었습니다."); onClose(); },
        onError: () => toast.error("생성에 실패했습니다."),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-4 space-y-3">
      <p className="font-semibold text-sm">새 프로젝트 생성</p>
      <input
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        placeholder="프로젝트명 *"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <textarea
        className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        placeholder="설명 (선택)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
      />
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">마감일 (선택)</label>
        <input
          type="date"
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="rounded-lg border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted">취소</button>
        <button
          type="submit"
          disabled={createProject.isPending || !name.trim()}
          className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {createProject.isPending ? "생성 중..." : "생성"}
        </button>
      </div>
    </form>
  );
}

export default function StaffProjectsTab() {
  const { data: projects = [], isLoading } = useStaffProjects();
  const [selectedProject, setSelectedProject] = useState<StaffProject | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  if (selectedProject) {
    return (
      <KanbanBoard
        project={selectedProject}
        onBack={() => setSelectedProject(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">프로젝트 운영</h2>
        <button
          type="button"
          onClick={() => setShowCreateForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90"
        >
          <Plus size={15} />
          새 프로젝트
        </button>
      </div>

      {showCreateForm && <CreateProjectForm onClose={() => setShowCreateForm(false)} />}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
          <p className="text-sm text-muted-foreground">등록된 프로젝트가 없습니다.</p>
          <p className="mt-1 text-xs text-muted-foreground">새 프로젝트 버튼으로 시작하세요.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((proj) => (
            <button
              key={proj.id}
              type="button"
              onClick={() => setSelectedProject(proj)}
              className="flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/30"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{proj.name}</span>
                  <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-semibold", PROJECT_STATUS_CHIP[proj.status])}>
                    {PROJECT_STATUS_LABELS[proj.status]}
                  </span>
                </div>
                {proj.description && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{proj.description}</p>
                )}
                <p className="mt-0.5 text-xs text-muted-foreground">
                  담당: {proj.ownerName}
                  {proj.dueDate && ` · 마감 ${proj.dueDate}`}
                </p>
              </div>
              <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
