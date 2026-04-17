"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import SeminarList from "@/features/seminar/SeminarList";
import SeminarStatusTabs from "@/features/seminar/SeminarStatusTabs";
import { useSeminars } from "@/features/seminar/useSeminar";
import { useAuthStore } from "@/features/auth/auth-store";
import { isStaffOrAbove } from "@/lib/permissions";
import { getComputedStatus } from "@/lib/seminar-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Calendar, Search, AlertCircle } from "lucide-react";
import type { SeminarStatus } from "@/types";

type StatusFilter = SeminarStatus | "all";

export default function SeminarsPage() {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const { user } = useAuthStore();
  const { seminars: allSeminars, isLoading, error } = useSeminars();

  const filtered = useMemo(() => {
    // 임시저장 세미나는 운영진만 볼 수 있음
    let result = isStaffOrAbove(user)
      ? allSeminars
      : allSeminars.filter((s) => s.status !== "draft");

    // Status filter
    if (status !== "all") {
      result = result.filter((s) => getComputedStatus(s) === status);
    }

    // Search filter (title, speaker)
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.speaker.toLowerCase().includes(q) ||
          s.location?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [allSeminars, status, search]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.date.localeCompare(a.date)),
    [filtered]
  );

  return (
    <div className="py-8 sm:py-16">
      <div className="mx-auto max-w-4xl px-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-12 sm:w-12">
              <Calendar size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">정기 세미나</h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                매주 교육공학/에듀테크 관련 최신 논문이나 트렌드를 발제하고 토론합니다.
              </p>
            </div>
          </div>
          {isStaffOrAbove(user) && (
            <Link href="/seminars/create">
              <Button size="sm" className="w-full shrink-0 sm:w-auto">
                <Plus size={16} className="mr-1" />
                세미나 등록
              </Button>
            </Link>
          )}
        </div>

        {/* Search */}
        <div className="mt-4 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="제목, 발표자, 장소 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-full sm:max-w-sm"
          />
        </div>

        <div className="mt-4">
          <SeminarStatusTabs active={status} onChange={setStatus} />
        </div>

        <div className="mt-6">
          {isLoading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border bg-white p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-12 rounded-full" />
                        <Skeleton className="h-6 w-64" />
                      </div>
                      <Skeleton className="mt-2 h-4 w-full" />
                      <Skeleton className="mt-1 h-4 w-3/4" />
                      <div className="mt-3 flex gap-4">
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
            <div className="rounded-xl border bg-white p-12 text-center">
              <AlertCircle size={32} className="mx-auto text-destructive/50" />
              <p className="mt-2 text-muted-foreground">세미나를 불러오는 중 오류가 발생했습니다.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => window.location.reload()}>
                다시 시도
              </Button>
            </div>
          ) : (
            <SeminarList seminars={sorted} />
          )}
        </div>
      </div>
    </div>
  );
}
