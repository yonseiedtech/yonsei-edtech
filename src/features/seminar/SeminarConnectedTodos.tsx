"use client";

/**
 * 세미나 호스트 대시보드에서 보여주는 연동 운영 업무 리스트.
 *
 * 세미나 운영 워크플로우(D-day 타임라인)와 비정형 업무를 묶기 위한 컴포넌트.
 * MyTodosWidget의 +추가 다이얼로그에서 "세미나" 카테고리로 추가하면
 * admin_todos 컬렉션에 relatedSeminarId 필드와 함께 저장된다.
 *
 * 양방향 연동: 같은 항목이 /console/todos 운영 업무수행철에도 표시되고,
 * 대시보드 "나의 할 일" 위젯에도 노출된다.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ListChecks, Trash2, ExternalLink, Plus, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { todosApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import type { AdminTodo } from "@/types";
import { cn } from "@/lib/utils";

const PRIORITY_LABELS: Record<AdminTodo["priority"], string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};

const PRIORITY_COLORS: Record<AdminTodo["priority"], string> = {
  high: "bg-rose-50 text-rose-700",
  medium: "bg-amber-50 text-amber-700",
  low: "bg-slate-50 text-slate-700",
};

const STATUS_LABELS: Record<AdminTodo["status"], string> = {
  todo: "할 일",
  in_progress: "진행중",
  done: "완료",
};

interface Props {
  seminarId: string;
  seminarTitle: string;
  /** 세미나 개최일 (YYYY-MM-DD) — denorm 저장용 */
  seminarDate?: string;
}

export default function SeminarConnectedTodos({ seminarId, seminarTitle, seminarDate }: Props) {
  const { user } = useAuthStore();
  const isStaff = isAtLeast(user, "staff");
  const qc = useQueryClient();

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    priority: "medium" as AdminTodo["priority"],
    dueDate: "",
  });
  const [saving, setSaving] = useState(false);

  const { data: res, isLoading } = useQuery({
    queryKey: ["seminar-todos", seminarId],
    queryFn: () => todosApi.listBySeminar(seminarId),
    enabled: !!seminarId,
    staleTime: 30_000,
  });

  const todos = useMemo(() => {
    const arr = ((res?.data ?? []) as AdminTodo[]).slice();
    // 클라이언트 정렬 (인덱스 회피) — 미완료(todo·in_progress) 우선, 그 안에서 createdAt desc
    arr.sort((a, b) => {
      const aDone = a.status === "done" ? 1 : 0;
      const bDone = b.status === "done" ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
    });
    return arr;
  }, [res]);

  async function cycleStatus(t: AdminTodo) {
    const next: AdminTodo["status"] =
      t.status === "todo" ? "in_progress" : t.status === "in_progress" ? "done" : "todo";
    try {
      await todosApi.update(t.id, { status: next, updatedAt: new Date().toISOString() });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["seminar-todos", seminarId] }),
        qc.invalidateQueries({ queryKey: ["admin-todos"] }),
        qc.invalidateQueries({ queryKey: ["my-admin-todos", user?.id] }),
      ]);
    } catch (e) {
      toast.error(`상태 변경 실패: ${(e as Error).message}`);
    }
  }

  async function remove(t: AdminTodo) {
    if (!confirm(`"${t.title}" 업무를 삭제하시겠습니까?\n/console/todos 운영 업무수행철에서도 사라집니다.`)) {
      return;
    }
    try {
      await todosApi.delete(t.id);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["seminar-todos", seminarId] }),
        qc.invalidateQueries({ queryKey: ["admin-todos"] }),
      ]);
      toast.success("삭제되었습니다.");
    } catch (e) {
      toast.error(`삭제 실패: ${(e as Error).message}`);
    }
  }

  async function save() {
    if (!user) return;
    if (!draft.title.trim()) {
      toast.error("제목을 입력하세요.");
      return;
    }
    setSaving(true);
    try {
      await todosApi.create({
        title: draft.title.trim(),
        description: draft.description.trim() || undefined,
        priority: draft.priority,
        status: "todo",
        dueDate: draft.dueDate || undefined,
        createdBy: user.id,
        createdByName: user.name ?? "운영진",
        relatedSeminarId: seminarId,
        relatedSeminarTitle: seminarTitle,
        relatedSeminarDate: seminarDate || undefined,
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["seminar-todos", seminarId] }),
        qc.invalidateQueries({ queryKey: ["admin-todos"] }),
        qc.invalidateQueries({ queryKey: ["my-admin-todos", user.id] }),
      ]);
      toast.success(
        `세미나 "${seminarTitle}"에 업무가 추가되었습니다 — /console/todos 와 대시보드에도 표시됩니다.`,
      );
      setDraft({ title: "", description: "", priority: "medium", dueDate: "" });
      setAdding(false);
    } catch (e) {
      toast.error(`저장 실패: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">연동된 업무 불러오는 중…</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-2 border-b bg-slate-50 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <ListChecks size={14} className="text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-700">
            세미나 운영 업무 ({todos.length})
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/console/todos"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink size={11} />
            운영 업무수행철
          </Link>
          {isStaff && !adding && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => setAdding(true)}
            >
              <Plus size={12} className="mr-1" /> 업무 추가
            </Button>
          )}
        </div>
      </div>

      {adding && (
        <div className="space-y-2 border-b bg-amber-50/40 p-4">
          <Input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="업무 제목 (예: 다과 발주, 연사 인사말 검토)"
          />
          <Textarea
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="설명 (선택)"
            rows={2}
            className="text-sm"
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={draft.priority}
              onChange={(e) =>
                setDraft({ ...draft, priority: e.target.value as AdminTodo["priority"] })
              }
              className="h-9 rounded-md border bg-background px-2 text-xs"
              aria-label="우선순위"
            >
              <option value="high">우선순위 높음</option>
              <option value="medium">우선순위 보통</option>
              <option value="low">우선순위 낮음</option>
            </select>
            <Input
              type="date"
              value={draft.dueDate}
              onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
              className="h-9 w-40 text-xs"
            />
            <div className="ml-auto flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)} disabled={saving}>
                취소
              </Button>
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? (
                  <Loader2 size={12} className="mr-1 animate-spin" />
                ) : (
                  <Plus size={12} className="mr-1" />
                )}
                추가
              </Button>
            </div>
          </div>
        </div>
      )}

      {todos.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">
          이 세미나에 연동된 운영 업무가 아직 없습니다.
          <br />
          <span className="mt-1 inline-block text-[11px]">
            위 <b>업무 추가</b> 또는 대시보드의 <b>나의 할 일 → + 추가 → 세미나</b> 탭에서 추가할 수 있어요.
          </span>
        </div>
      ) : (
        <ul className="divide-y">
          {todos.map((t) => (
            <li key={t.id} className="flex items-start gap-3 px-4 py-3 text-sm">
              <button
                type="button"
                onClick={() => cycleStatus(t)}
                className="mt-0.5 shrink-0"
                title="상태 순환: 할 일 → 진행중 → 완료"
              >
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px]",
                    t.status === "done" && "bg-green-50 text-green-700",
                    t.status === "in_progress" && "bg-blue-50 text-blue-700",
                    t.status === "todo" && "bg-slate-100 text-slate-700",
                  )}
                >
                  {STATUS_LABELS[t.status]}
                </Badge>
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="secondary"
                    className={cn("text-[10px]", PRIORITY_COLORS[t.priority])}
                  >
                    {PRIORITY_LABELS[t.priority]}
                  </Badge>
                  <span
                    className={cn(
                      "font-medium",
                      t.status === "done" && "text-muted-foreground line-through",
                    )}
                  >
                    {t.title}
                  </span>
                </div>
                {t.description && (
                  <p className="mt-1 whitespace-pre-wrap text-[12px] text-muted-foreground">
                    {t.description}
                  </p>
                )}
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {t.createdByName} · {new Date(t.createdAt).toLocaleDateString("ko-KR")}
                  {t.dueDate && ` · 기한 ${t.dueDate}`}
                </p>
              </div>
              {isStaff && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-muted-foreground hover:text-rose-600"
                  onClick={() => remove(t)}
                  title="삭제"
                >
                  <Trash2 size={13} />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
