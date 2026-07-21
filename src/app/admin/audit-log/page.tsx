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
  member: { label: "회원", icon: Users, color: "bg-cat-1/10 text-cat-1" },
  role: { label: "역할", icon: Shield, color: "bg-cat-5/10 text-cat-5" },
  seminar: { label: "세미나", icon: CalendarDays, color: "bg-success/10 text-success" },
  post: { label: "게시글", icon: FileText, color: "bg-warning/10 text-warning" },
  settings: { label: "설정", icon: Settings, color: "bg-muted/50 text-muted-foreground" },
  system: { label: "시스템", icon: Server, color: "bg-destructive/10 text-destructive" },
};

type CategoryFilter = "all" | AuditLog["category"];
type PeriodFilter = "all" | "7d" | "30d";

const PERIOD_OPTIONS: { key: PeriodFilter; label: string }[] = [
  { key: "all", label: "전체 기간" },
  { key: "7d", label: "최근 7일" },
  { key: "30d", label: "최근 30일" },
];

export default function AuditLogPage() {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState<PeriodFilter>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const res = await auditLogsApi.list({ limit: 500 });
      return res.data as AuditLog[];
    },
  });

  const logs = data ?? [];

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const now = Date.now();
    const periodMs = period === "7d" ? 7 * 864e5 : period === "30d" ? 30 * 864e5 : 0;
    return logs.filter((l) => {
      if (categoryFilter !== "all" && l.category !== categoryFilter) return false;
      if (periodMs > 0) {
        const ts = new Date(l.createdAt).getTime();
        if (Number.isFinite(ts) && now - ts > periodMs) return false;
      }
      if (term) {
        const haystack = `${l.action} ${l.userName} ${l.detail} ${l.targetName ?? ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [logs, categoryFilter, query, period]);

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

      {/* 액션·행위자 검색 + 기간 필터 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="작업·수행자·상세 검색"
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                period === key ? "bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground sm:ml-auto">{filtered.length}건 표시</span>
      </div>

      {/* 로그 목록 */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="기록된 감사 로그가 없습니다"
          description="시스템 활동이 발생하면 이곳에 자동으로 기록됩니다."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
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
