"use client";

/**
 * 회원 페이지 접속 이력 — Sprint 63
 * /console/insights/user-activity 와 /admin/insights "활동 로그" 탭에서 공유.
 * Admin only — firestore.rules 로 read 차단.
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Eye,
  Search,
  RefreshCw,
  AlertCircle,
  Calendar as CalendarIcon,
} from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { userActivityLogsApi, profilesApi } from "@/lib/bkend";
import type { UserActivityLog, User } from "@/types";
import { cn } from "@/lib/utils";

const PATH_GROUP_FILTER_OPTIONS = [
  { value: "", label: "전체" },
  { value: "dashboard", label: "대시보드" },
  { value: "mypage", label: "마이페이지" },
  { value: "seminars", label: "세미나" },
  { value: "courses", label: "강의" },
  { value: "research", label: "연구" },
  { value: "activities", label: "학술활동" },
  { value: "board", label: "게시판" },
  { value: "newsletter", label: "학회보" },
  { value: "calendar", label: "일정" },
  { value: "console", label: "운영콘솔" },
  { value: "admin", label: "관리자" },
  { value: "profile", label: "프로필" },
  { value: "alumni", label: "졸업생" },
  { value: "steppingstone", label: "인지디딤판" },
  { value: "archive", label: "아카이브" },
];

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const dd = d.getDate().toString().padStart(2, "0");
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${m}/${dd} ${hh}:${mm}`;
}

export default function UserActivityLogView() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin" || user?.role === "sysadmin";

  const [nameFilter, setNameFilter] = useState("");
  const [pathFilter, setPathFilter] = useState<string>("");

  const { data: logsRes, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-user-activity-logs", pathFilter],
    queryFn: () =>
      userActivityLogsApi.list(
        pathFilter
          ? { "filter[pathGroup]": pathFilter, sort: "createdAt:desc", limit: 500 }
          : { sort: "createdAt:desc", limit: 500 },
      ),
    enabled: isAdmin,
    staleTime: 30_000,
  });

  const userIds = useMemo(() => {
    const set = new Set<string>();
    for (const log of (logsRes?.data ?? []) as UserActivityLog[]) {
      if (log.userId) set.add(log.userId);
    }
    return Array.from(set);
  }, [logsRes]);

  const { data: usersMap = {} } = useQuery({
    queryKey: ["admin-user-activity-users", userIds.sort().join(",")],
    queryFn: async () => {
      const map: Record<string, { name: string; role?: string }> = {};
      await Promise.all(
        userIds.map(async (uid) => {
          try {
            const u = (await profilesApi.get(uid)) as unknown as User;
            map[uid] = { name: u?.name ?? "(이름 없음)", role: u?.role };
          } catch {
            map[uid] = { name: "(조회 실패)" };
          }
        }),
      );
      return map;
    },
    enabled: isAdmin && userIds.length > 0,
    staleTime: 5 * 60_000,
  });

  const filtered = useMemo(() => {
    const all = (logsRes?.data ?? []) as UserActivityLog[];
    const q = nameFilter.trim().toLowerCase();
    if (!q) return all;
    return all.filter((log) => {
      const display = (usersMap[log.userId]?.name ?? log.userName ?? "").toLowerCase();
      return display.includes(q);
    });
  }, [logsRes, nameFilter, usersMap]);

  const perUserCount = useMemo(() => {
    const m: Record<string, number> = {};
    for (const log of filtered) m[log.userId] = (m[log.userId] ?? 0) + 1;
    return m;
  }, [filtered]);

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-6">
        <div className="flex items-center gap-2 text-rose-900">
          <AlertCircle size={20} />
          <p className="font-semibold">관리자만 접근 가능합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Eye size={18} className="text-primary" aria-hidden="true" />
        <p className="text-sm font-bold">회원 페이지 접속 이력</p>
        <span className="ml-auto text-[11px] text-muted-foreground">
          🔒 admin 전용 · 동일 회원·그룹 30초 throttle · 90일 retention 예정
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            placeholder="회원 이름으로 검색"
            className="h-9 pl-7 text-sm"
          />
        </div>
        <select
          value={pathFilter}
          onChange={(e) => setPathFilter(e.target.value)}
          className="h-9 rounded-md border bg-card px-2 text-sm"
          aria-label="경로 그룹 필터"
        >
          {PATH_GROUP_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-9"
        >
          <RefreshCw size={14} className={cn("mr-1", isFetching && "animate-spin")} />
          새로고침
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span>총 <strong className="text-foreground">{filtered.length.toLocaleString()}</strong>건</span>
        <span>고유 회원 <strong className="text-foreground">{Object.keys(perUserCount).length}</strong>명</span>
        <span className="ml-auto text-[11px]">최근 500건 노출</span>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50/50 p-3 text-sm text-rose-900">
          {(error as Error).message}
        </div>
      )}

      <div className="mt-3 overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">시간</th>
              <th className="px-3 py-2 text-left font-semibold">회원</th>
              <th className="px-3 py-2 text-left font-semibold">경로 그룹</th>
              <th className="px-3 py-2 text-left font-semibold">전체 경로</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                  <RefreshCw size={16} className="mx-auto mb-2 animate-spin" />
                  로그 불러오는 중…
                </td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                  조건에 맞는 로그가 없습니다.
                </td>
              </tr>
            )}
            {filtered.map((log) => {
              const userInfo = usersMap[log.userId];
              const name = userInfo?.name ?? log.userName ?? log.userId;
              return (
                <tr key={log.id} className="border-t hover:bg-muted/20">
                  <td className="px-3 py-2 align-top text-xs text-muted-foreground tabular-nums">
                    <CalendarIcon size={11} className="mr-1 inline-block" aria-hidden="true" />
                    {fmtTime(log.createdAt)}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <span className="font-medium">{name}</span>
                    {userInfo?.role && userInfo.role !== "member" && (
                      <Badge variant="outline" className="ml-1.5 text-[10px]">
                        {userInfo.role}
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <Badge variant="secondary" className="text-[11px]">
                      {log.pathLabel}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <a
                      href={log.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[11px] text-primary hover:underline"
                      title={log.path}
                    >
                      {log.path}
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
