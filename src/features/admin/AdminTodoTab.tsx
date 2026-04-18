"use client";

import { useState, useMemo } from "react";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { useAuthStore } from "@/features/auth/auth-store";
import { useTodos, useCreateTodo, useUpdateTodo, useDeleteTodo } from "./useTodos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { cn, formatDate } from "@/lib/utils";
import {
  Plus, Trash2, CheckCircle, Circle, Clock, AlertTriangle,
  ArrowUp, ArrowRight, ArrowDown, CheckSquare,
} from "lucide-react";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { toast } from "sonner";
import type { AdminTodo } from "@/types";

type StatusFilter = "all" | "todo" | "in_progress" | "done";

const STATUS_CONFIG = {
  todo: { label: "할 일", icon: Circle, color: "bg-slate-100 text-slate-600" },
  in_progress: { label: "진행 중", icon: Clock, color: "bg-blue-100 text-blue-700" },
  done: { label: "완료", icon: CheckCircle, color: "bg-green-100 text-green-700" },
} as const;

const PRIORITY_CONFIG = {
  high: { label: "높음", icon: ArrowUp, color: "text-red-600" },
  medium: { label: "보통", icon: ArrowRight, color: "text-amber-600" },
  low: { label: "낮음", icon: ArrowDown, color: "text-blue-500" },
} as const;

export default function AdminTodoTab() {
  const { user } = useAuthStore();
  const { todos, isLoading } = useTodos();
  const { createTodo } = useCreateTodo();
  const { updateTodo } = useUpdateTodo();
  const { deleteTodo } = useDeleteTodo();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium" as AdminTodo["priority"],
    dueDate: "",
    assigneeName: "",
  });

  const filtered = useMemo(() => {
    if (statusFilter === "all") return todos;
    return todos.filter((t) => t.status === statusFilter);
  }, [todos, statusFilter]);

  const counts = useMemo(() => ({
    all: todos.length,
    todo: todos.filter((t) => t.status === "todo").length,
    in_progress: todos.filter((t) => t.status === "in_progress").length,
    done: todos.filter((t) => t.status === "done").length,
  }), [todos]);

  async function handleCreate() {
    if (!form.title.trim()) { toast.error("제목을 입력해주세요."); return; }
    try {
      await createTodo({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
        status: "todo",
        dueDate: form.dueDate || undefined,
        assigneeName: form.assigneeName.trim() || undefined,
        createdBy: user?.id ?? "",
        createdByName: user?.name ?? "",
      });
      toast.success("할 일이 추가되었습니다.");
      setShowCreate(false);
      setForm({ title: "", description: "", priority: "medium", dueDate: "", assigneeName: "" });
    } catch {
      toast.error("추가에 실패했습니다.");
    }
  }

  async function handleStatusChange(todo: AdminTodo, newStatus: AdminTodo["status"]) {
    try {
      await updateTodo({ id: todo.id, status: newStatus });
      toast.success(newStatus === "done" ? "완료 처리되었습니다." : "상태가 변경되었습니다.");
    } catch {
      toast.error("상태 변경에 실패했습니다.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTodo(id);
      toast.success("삭제되었습니다.");
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <ConsolePageHeader
          icon={CheckSquare}
          title="할 일 관리"
          description="운영진 할 일을 등록하고 진행 상황을 추적합니다."
        />
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={CheckSquare}
        title="할 일 관리"
        description="운영진 할 일을 등록하고 진행 상황을 추적합니다."
      />
      {/* 상단: 통계 카드 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([
          { key: "all" as const, label: "전체", count: counts.all, color: "bg-slate-50 text-slate-700" },
          { key: "todo" as const, label: "할 일", count: counts.todo, color: "bg-amber-50 text-amber-700" },
          { key: "in_progress" as const, label: "진행 중", count: counts.in_progress, color: "bg-blue-50 text-blue-700" },
          { key: "done" as const, label: "완료", count: counts.done, color: "bg-green-50 text-green-700" },
        ]).map(({ key, label, count, color }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={cn(
              "rounded-xl border p-4 text-left transition-all",
              statusFilter === key ? "ring-2 ring-primary/30 shadow-sm" : "hover:shadow-sm",
              color,
            )}
          >
            <p className="text-2xl font-bold">{count}</p>
            <p className="text-sm">{label}</p>
          </button>
        ))}
      </div>

      {/* 추가 버튼 */}
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus size={14} className="mr-1" />
          할 일 추가
        </Button>
      </div>

      {/* 할 일 목록 */}
      {filtered.length === 0 ? (
        <AdminEmptyState
          icon={CheckCircle}
          title={statusFilter === "all" ? "등록된 할 일이 없습니다." : "해당 상태의 할 일이 없습니다."}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((todo) => {
            const status = STATUS_CONFIG[todo.status];
            const priority = PRIORITY_CONFIG[todo.priority];
            const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date() && todo.status !== "done";

            return (
              <div
                key={todo.id}
                className={cn(
                  "flex items-start gap-3 rounded-xl border bg-white p-4 transition-colors",
                  todo.status === "done" && "opacity-60",
                )}
              >
                {/* 상태 토글 */}
                <button
                  onClick={() => {
                    const next = todo.status === "todo" ? "in_progress" : todo.status === "in_progress" ? "done" : "todo";
                    handleStatusChange(todo, next);
                  }}
                  className="mt-0.5 shrink-0"
                  title="상태 변경"
                >
                  <status.icon
                    size={20}
                    className={cn(
                      todo.status === "done" ? "text-green-600" : todo.status === "in_progress" ? "text-blue-600" : "text-slate-400",
                    )}
                  />
                </button>

                {/* 내용 */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("font-medium", todo.status === "done" && "line-through")}>{todo.title}</span>
                    <Badge variant="outline" className={cn("text-[10px]", status.color)}>{status.label}</Badge>
                    <span className={cn("flex items-center gap-0.5 text-[10px]", priority.color)}>
                      <priority.icon size={10} />
                      {priority.label}
                    </span>
                  </div>
                  {todo.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{todo.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    {todo.assigneeName && <span>담당: {todo.assigneeName}</span>}
                    {todo.dueDate && (
                      <span className={cn("flex items-center gap-1", isOverdue && "font-medium text-red-600")}>
                        {isOverdue && <AlertTriangle size={10} />}
                        마감: {formatDate(todo.dueDate)}
                      </span>
                    )}
                    <span>작성: {todo.createdByName}</span>
                  </div>
                </div>

                {/* 삭제 */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(todo.id)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* 추가 Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>할 일 추가</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">제목 *</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="할 일 제목"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">상세 설명</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="자세한 내용 (선택사항)"
                className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">우선순위</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as AdminTodo["priority"] })}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="high">높음</option>
                  <option value="medium">보통</option>
                  <option value="low">낮음</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">마감일</label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">담당자</label>
              <Input
                value={form.assigneeName}
                onChange={(e) => setForm({ ...form, assigneeName: e.target.value })}
                placeholder="담당자 이름 (선택사항)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>취소</Button>
            <Button onClick={handleCreate}>추가</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
