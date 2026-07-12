"use client";

/**
 * StaffPriorityPanel — 운영진 홈 모드 상단 우선순위 패널.
 *
 * 노출 조건: `isStaff` 인 경우, NextActionBanner 부근.
 * - 승인 대기 회원 카운트 + /console/members 진입
 * - 미답변 문의 카운트 + /console/inquiries 진입
 * - 운영진 todo (admin_todos status=todo) 핵심 1~3건
 *
 * Codex Phase B 권고:
 * - 운영진 dashboard 의 상단/하단 알림 중복 제거.
 * - 이 패널이 있으면 dashboard 하단의 "관리 알림" 섹션은 숨긴다 (page.tsx 에서 분기).
 */

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Shield,
  ShieldAlert,
  HelpCircle,
  CheckSquare,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SEMANTIC } from "@/lib/design-tokens";
import { usePendingMembers } from "@/features/member/useMembers";
import { useInquiries } from "@/features/inquiry/useInquiry";
import { todosApi } from "@/lib/bkend";

interface AdminTodoLite {
  id: string;
  title: string;
  priority?: "high" | "medium" | "low";
  status?: string;
  dueDate?: string;
}

interface StaffPriorityPanelProps {
  /** D-3c: staffAlerts 위젯 알림 무음 여부. true 면 폴링 staleTime 연장. */
  muted?: boolean;
}

export default function StaffPriorityPanel({ muted = false }: StaffPriorityPanelProps) {
  // 승인 대기 회원
  const { pendingMembers } = usePendingMembers({ enabled: true });
  const pendingCount = pendingMembers.length;

  // 미답변 문의
  const { inquiries } = useInquiries({ enabled: true });
  const unansweredCount = inquiries.filter((q) => q.status === "pending").length;

  // 운영진 todo 핵심 3건 (status === "todo", priority high 우선)
  // D-3c: muted 시 staleTime 연장 (180s), 토스트 알림은 이 컴포넌트에 없으므로 staleTime만 조정
  const { data: adminTodosRes } = useQuery({
    queryKey: ["admin-todos"],
    queryFn: () => todosApi.list(),
    staleTime: muted ? 180_000 : 60_000,
  });
  const adminTodos = ((adminTodosRes?.data ?? []) as AdminTodoLite[])
    .filter((t) => (t.status ?? "todo") === "todo")
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 } as const;
      const pa = order[(a.priority ?? "medium") as keyof typeof order] ?? 1;
      const pb = order[(b.priority ?? "medium") as keyof typeof order] ?? 1;
      if (pa !== pb) return pa - pb;
      return (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31");
    })
    .slice(0, 3);

  const totalPriorityCount = pendingCount + unansweredCount + adminTodos.length;
  if (totalPriorityCount === 0) return null;

  return (
    <section className={cn("rounded-2xl border p-4 shadow-sm", SEMANTIC.warning.border, SEMANTIC.warning.bg)}>
      <div className="flex items-center gap-2">
        <Shield size={16} className={SEMANTIC.warning.accent} />
        <h2 className={cn("text-sm font-bold", SEMANTIC.warning.titleStrong)}>운영진 우선순위</h2>
        <Badge className={cn(SEMANTIC.warning.chipBg, SEMANTIC.warning.chipText)}>{totalPriorityCount}건</Badge>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {pendingCount > 0 && (
          <Link
            href="/console/members"
            className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 transition-colors hover:bg-amber-50"
          >
            <span className="flex items-center gap-2">
              <ShieldAlert size={14} className={SEMANTIC.warning.accent} />
              <span className="text-sm font-medium">
                승인 대기 회원 {pendingCount}명
              </span>
            </span>
            <ChevronRight size={14} className="text-muted-foreground" />
          </Link>
        )}
        {unansweredCount > 0 && (
          <Link
            href="/console/inquiries"
            className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 transition-colors hover:bg-amber-50"
          >
            <span className="flex items-center gap-2">
              <HelpCircle size={14} className={SEMANTIC.danger.accent} />
              <span className="text-sm font-medium">
                미답변 문의 {unansweredCount}건
              </span>
            </span>
            <ChevronRight size={14} className="text-muted-foreground" />
          </Link>
        )}
      </div>

      {adminTodos.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <CheckSquare size={12} /> 운영 업무 우선 {adminTodos.length}건
          </p>
          <ul className="space-y-1">
            {adminTodos.map((t) => (
              <li key={t.id}>
                <Link
                  href="/console/todos"
                  className="flex items-center justify-between gap-2 rounded-md bg-card px-2.5 py-1.5 text-[12px] hover:bg-amber-50"
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    {t.priority === "high" && (
                      <Badge className={cn("shrink-0 text-[10px]", SEMANTIC.danger.chipBg, SEMANTIC.danger.chipText)}>
                        높음
                      </Badge>
                    )}
                    <span className="truncate font-medium">{t.title}</span>
                  </span>
                  {t.dueDate && (
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {t.dueDate}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
