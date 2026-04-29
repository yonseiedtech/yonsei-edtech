"use client";

/**
 * 학술활동 상세 페이지(staff 탭)에서 보여주는 연동 운영 업무 리스트.
 *
 * MyTodosWidget의 +추가 다이얼로그에서 "학술활동" 탭으로 추가하면
 * admin_todos 컬렉션에 relatedActivityId 필드와 함께 저장된다.
 * 본 컴포넌트는 그 활동에 연동된 todo만 모아 보여주고 상태 토글/삭제를 지원한다.
 *
 * 양방향 연동: 같은 항목이 /staff-admin/todos 운영 업무수행철에도 표시된다.
 */

import { useMemo } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ListChecks, Trash2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  activityId: string;
}

export default function ActivityConnectedTodos({ activityId }: Props) {
  const { user } = useAuthStore();
  const isStaff = isAtLeast(user, "staff");
  const qc = useQueryClient();

  const { data: res, isLoading } = useQuery({
    queryKey: ["activity-todos", activityId],
    queryFn: () => todosApi.listByActivity(activityId),
    enabled: !!activityId,
    staleTime: 30_000,
  });
  const todos = useMemo(() => {
    const arr = ((res?.data ?? []) as AdminTodo[]).slice();
    // API에서 sort 옵션을 빼서 (인덱스 회피) 클라이언트에서 createdAt desc 정렬.
    arr.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    return arr;
  }, [res]);

  async function cycleStatus(t: AdminTodo) {
    const next: AdminTodo["status"] =
      t.status === "todo" ? "in_progress" : t.status === "in_progress" ? "done" : "todo";
    try {
      await todosApi.update(t.id, { status: next });
      await qc.invalidateQueries({ queryKey: ["activity-todos", activityId] });
      await qc.invalidateQueries({ queryKey: ["admin-todos"] });
    } catch (e) {
      toast.error(`상태 변경 실패: ${(e as Error).message}`);
    }
  }

  async function remove(t: AdminTodo) {
    if (!confirm(`"${t.title}" 업무를 삭제하시겠습니까?\n/staff-admin/todos 운영 업무수행철에서도 사라집니다.`)) {
      return;
    }
    try {
      await todosApi.delete(t.id);
      await qc.invalidateQueries({ queryKey: ["activity-todos", activityId] });
      await qc.invalidateQueries({ queryKey: ["admin-todos"] });
      toast.success("삭제되었습니다.");
    } catch (e) {
      toast.error(`삭제 실패: ${(e as Error).message}`);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-white p-4">
        <p className="text-sm text-muted-foreground">연동된 업무 불러오는 중…</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white">
      <div className="flex items-center justify-between gap-2 border-b bg-slate-50 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <ListChecks size={14} className="text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-700">
            연동된 운영 업무 ({todos.length})
          </h3>
        </div>
        <Link
          href="/console/todos"
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <ExternalLink size={11} />
          운영 업무수행철
        </Link>
      </div>
      {todos.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">
          이 활동에 연동된 업무가 아직 없습니다.
          <br />
          <span className="mt-1 inline-block text-[11px]">
            대시보드의 <b>나의 할 일 → + 추가 → 학술활동</b> 탭에서 추가할 수 있어요.
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
                  <Badge variant="secondary" className={cn("text-[10px]", PRIORITY_COLORS[t.priority])}>
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
