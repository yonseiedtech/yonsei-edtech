"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { auditLogsApi } from "@/lib/bkend";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Shield, Users, CalendarDays, FileText, Settings, Tag, Server } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AuditLog } from "@/types";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import EmptyState from "@/components/ui/empty-state";

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  member: { label: "회원", icon: Users, color: "bg-blue-100 text-blue-700" },
  role: { label: "역할", icon: Shield, color: "bg-purple-100 text-purple-700" },
  seminar: { label: "세미나", icon: CalendarDays, color: "bg-green-100 text-green-700" },
  post: { label: "게시글", icon: FileText, color: "bg-amber-100 text-amber-700" },
  settings: { label: "설정", icon: Settings, color: "bg-slate-100 text-slate-700" },
  system: { label: "시스템", icon: Server, color: "bg-red-100 text-red-700" },
};

type CategoryFilter = "all" | AuditLog["category"];

export default function AuditLogPage() {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const res = await auditLogsApi.list({ limit: 500 });
      return res.data as AuditLog[];
    },
  });

  const logs = data ?? [];

  const filtered = useMemo(() => {
    if (categoryFilter === "all") return logs;
    return logs.filter((l) => l.category === categoryFilter);
  }, [logs, categoryFilter]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={Shield}
        title="감사 로그"
        description="회원·역할·세미나·설정 등 주요 관리 작업 기록을 카테고리별로 조회합니다."
      />

      {/* 필터 */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategoryFilter("all")}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            categoryFilter === "all" ? "bg-primary text-white" : "hover:bg-muted",
          )}
        >
          전체 ({logs.length})
        </button>
        {Object.entries(CATEGORY_CONFIG).map(([key, { label, color }]) => {
          const count = logs.filter((l) => l.category === key).length;
          return (
            <button
              key={key}
              onClick={() => setCategoryFilter(key as CategoryFilter)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                categoryFilter === key ? color : "hover:bg-muted",
              )}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* 로그 목록 */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="기록된 감사 로그가 없습니다"
          description="시스템 활동이 발생하면 이곳에 자동으로 기록됩니다."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left font-medium">시각</th>
                <th className="px-4 py-3 text-left font-medium">분류</th>
                <th className="px-4 py-3 text-left font-medium">작업</th>
                <th className="px-4 py-3 text-left font-medium">상세</th>
                <th className="px-4 py-3 text-left font-medium">수행자</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((log) => {
                const cat = CATEGORY_CONFIG[log.category] ?? CATEGORY_CONFIG.system;
                return (
                  <tr key={log.id} className="hover:bg-muted/20">
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={cn("text-[10px]", cat.color)}>
                        {cat.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-medium">{log.action}</td>
                    <td className="max-w-[300px] truncate px-4 py-3 text-muted-foreground">
                      {log.detail}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{log.userName}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
