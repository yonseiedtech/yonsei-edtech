"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import SeminarList from "@/features/seminar/SeminarList";
import { useSeminars } from "@/features/seminar/useSeminar";
import { useAuthStore } from "@/features/auth/auth-store";
import { isStaffOrAbove } from "@/lib/permissions";
import { getComputedStatus } from "@/lib/seminar-utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import PageHeader from "@/components/ui/page-header";
import { Plus, Calendar, Search, AlertCircle, List, LayoutGrid, X } from "lucide-react";
import { usePageHeader } from "@/features/site-settings/useSiteContent";
import EmptyState from "@/components/ui/empty-state";

type StatusTab = "all" | "active" | "completed";

const TAB_META: { key: StatusTab; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "active", label: "예정·진행" },
  { key: "completed", label: "완료" },
];

export default function SeminarsPage() {
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [viewMode, setViewMode] = useState<"list" | "gallery">("list");
  const [search, setSearch] = useState("");
  const { user } = useAuthStore();
  const { seminars: allSeminars, isLoading, error } = useSeminars();
  const header = usePageHeader("seminars", {
    title: "세미나",
    description: "매주 교육공학/에듀테크 관련 최신 논문이나 트렌드를 발제하고 토론합니다.",
  });

  // 운영진만 임시저장 포함
  const visibleSeminars = useMemo(
    () =>
      isStaffOrAbove(user)
        ? allSeminars
        : allSeminars.filter((s) => s.status !== "draft"),
    [allSeminars, user],
  );

  const ongoingSeminars = useMemo(
    () =>
      visibleSeminars.filter((s) => {
        const cs = getComputedStatus(s);
        return cs === "upcoming" || cs === "ongoing";
      }),
    [visibleSeminars],
  );

  const completedSeminars = useMemo(
    () => visibleSeminars.filter((s) => getComputedStatus(s) === "completed"),
    [visibleSeminars],
  );

  const tabCounts: Record<StatusTab, number> = {
    all: visibleSeminars.length,
    active: ongoingSeminars.length,
    completed: completedSeminars.length,
  };

  const filtered = useMemo(() => {
    let result =
      statusTab === "all"
        ? visibleSeminars
        : statusTab === "active"
          ? ongoingSeminars
          : completedSeminars;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((s) => {
        if (s.title.toLowerCase().includes(q)) return true;
        if (s.speaker?.toLowerCase().includes(q)) return true;
        if (s.location?.toLowerCase().includes(q)) return true;
        // 다중 연사 모두 검색 대상
        if (s.speakers?.some((sp) => sp.name?.toLowerCase().includes(q))) return true;
        return false;
      });
    }

    return result;
  }, [visibleSeminars, ongoingSeminars, completedSeminars, statusTab, search]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.date.localeCompare(a.date)),
    [filtered],
  );

  const staffActions = isStaffOrAbove(user) ? (
    <Link href="/seminars/create">
      <Button size="sm" className="shrink-0">
        <Plus size={15} className="mr-1.5" />
        세미나 등록
      </Button>
    </Link>
  ) : null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 py-8 sm:py-14">
      <div className="mx-auto max-w-4xl px-4">
        {/* ── 페이지 헤더 ── */}
        <PageHeader
          icon={Calendar}
          title={header.title}
          description={header.description}
          actions={staffActions}
        />

        <Separator className="mt-6" />

        {/* ── 검색 + 탭 + 뷰 토글 ── */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* 검색 */}
          <div className="relative w-full sm:max-w-xs">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              placeholder="제목, 발표자, 장소 검색…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-8 text-sm"
              aria-label="세미나 검색"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="검색어 지우기"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* 탭 + 뷰 모드 */}
          <div className="flex items-center gap-2">
            {/* 상태 탭 */}
            <div
              role="tablist"
              aria-label="세미나 상태 필터"
              className="inline-flex rounded-lg border bg-muted/40 p-0.5 text-sm shadow-sm"
            >
              {TAB_META.map(({ key, label }) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={statusTab === key}
                  onClick={() => setStatusTab(key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm",
                    statusTab === key
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                  {!isLoading && (
                    <span
                      className={cn(
                        "inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
                        statusTab === key
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {tabCounts[key]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* 뷰 모드 토글 */}
            <div className="inline-flex rounded-lg border bg-muted/40 p-0.5 shadow-sm">
              <button
                onClick={() => setViewMode("list")}
                aria-label="리스트 보기"
                aria-pressed={viewMode === "list"}
                className={cn(
                  "rounded-md p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  viewMode === "list"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <List size={15} />
              </button>
              <button
                onClick={() => setViewMode("gallery")}
                aria-label="갤러리 보기"
                aria-pressed={viewMode === "gallery"}
                className={cn(
                  "rounded-md p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  viewMode === "gallery"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <LayoutGrid size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* ── 본문 ── */}
        <div className="mt-5">
          {isLoading ? (
            <div className="grid gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border bg-card p-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-14 rounded-full" />
                        <Skeleton className="h-5 w-11 rounded-full" />
                      </div>
                      <Skeleton className="h-5 w-4/5" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                      <div className="flex gap-4 pt-1">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <EmptyState
              icon={AlertCircle}
              title="세미나를 불러오는 중 오류가 발생했습니다"
              description="네트워크 상태를 확인한 뒤 다시 시도해주세요."
              actionLabel="다시 시도"
              onAction={() => window.location.reload()}
            />
          ) : (
            <SeminarList seminars={sorted} viewMode={viewMode} />
          )}
        </div>
      </div>
    </div>
  );
}
