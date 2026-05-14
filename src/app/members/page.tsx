"use client";

/**
 * 대학원 생활 → 구성원 (재학생 + 졸업생)
 *
 * 학회 운영 컨텍스트의 주임교수·운영진은 /about/leadership 으로 분리됨.
 * legacy URL ?tab=professor / ?tab=staff 는 /about/leadership 으로 자동 이동.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo, Suspense } from "react";
import { cn } from "@/lib/utils";
import MemberCard from "@/components/members/MemberCard";
import { useMembers } from "@/features/member/useMembers";
import { Users, Search, X } from "lucide-react";
import PageHeader from "@/components/ui/page-header";
import EmptyState from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { User } from "@/types";

const ROLE_TABS = [
  { key: "student", label: "재학생 회원", roles: ["member", "president", "staff"] },
  { key: "alumni", label: "졸업생 회원", roles: ["alumni"] },
] as const;

type MembersTabKey = (typeof ROLE_TABS)[number]["key"];

function isMembersTab(value: string | null): value is MembersTabKey {
  return value === "student" || value === "alumni";
}

function filterByTab(members: User[], tabKey: MembersTabKey): User[] {
  const tab = ROLE_TABS.find((t) => t.key === tabKey);
  if (!tab) return [];
  const roles = tab.roles as readonly string[];
  return members.filter((m) => {
    if (!roles.includes(m.role)) return false;
    // 재학생 탭: 졸업 상태 제외 (graduated 식별)
    if (tabKey === "student") {
      const status = m.enrollmentStatus ?? "enrolled";
      if (status === "graduated") return false;
    }
    return true;
  });
}

function MembersContent() {
  const { members, isLoading } = useMembers();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  // legacy URL 보정 — professor·staff 는 /about/leadership 으로 이동
  useEffect(() => {
    if (tabParam === "professor" || tabParam === "staff") {
      router.replace(`/about/leadership?tab=${tabParam}`);
    }
  }, [tabParam, router]);

  const initialTab: MembersTabKey = isMembersTab(tabParam) ? tabParam : "student";
  const [activeTab, setActiveTab] = useState<MembersTabKey>(initialTab);

  const [search, setSearch] = useState("");
  const [generationFilter, setGenerationFilter] = useState<string>("all");
  const [enrollmentFilter, setEnrollmentFilter] = useState<string>("all");

  useEffect(() => {
    if (isMembersTab(tabParam)) setActiveTab(tabParam);
  }, [tabParam]);

  function handleTabChange(key: MembersTabKey) {
    setActiveTab(key);
    setSearch("");
    setGenerationFilter("all");
    setEnrollmentFilter("all");
    const qs = new URLSearchParams(searchParams.toString());
    if (key === "student") qs.delete("tab");
    else qs.set("tab", key);
    const next = qs.toString();
    router.replace(next ? `/members?${next}` : "/members", { scroll: false });
  }

  const filteredByTab = filterByTab(members, activeTab);

  const generations = useMemo(() => {
    const set = new Set<number>();
    filteredByTab.forEach((m) => {
      if (m.generation) set.add(m.generation);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [filteredByTab]);

  const visible = useMemo(() => {
    let list = filteredByTab;
    if (generationFilter !== "all") {
      list = list.filter((m) => String(m.generation ?? "") === generationFilter);
    }
    if (enrollmentFilter !== "all" && activeTab === "student") {
      list = list.filter(
        (m) => (m.enrollmentStatus ?? "enrolled") === enrollmentFilter,
      );
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((m) => {
        const hay = [
          m.name,
          m.studentId,
          m.field,
          m.affiliation,
          m.position,
          ...(m.researchInterests ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    return list;
  }, [filteredByTab, generationFilter, enrollmentFilter, search, activeTab]);

  const hasActiveFilters =
    search.trim() !== "" ||
    generationFilter !== "all" ||
    (activeTab === "student" && enrollmentFilter !== "all");

  function handleClearFilters() {
    setSearch("");
    setGenerationFilter("all");
    setEnrollmentFilter("all");
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 py-8 sm:py-14">
      <div className="mx-auto max-w-6xl px-4">
        {/* ── 페이지 헤더 ── */}
        <PageHeader
          icon={Users}
          title="구성원"
          description="대학원에서 함께 공부하는 재학생·졸업생 회원입니다."
        />

        <Separator className="mt-6" />

        {/* ── 탭 ── */}
        <nav
          className="mt-6 flex gap-1 overflow-x-auto border-b"
          aria-label="회원 분류"
        >
          {ROLE_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-none items-center border-b-2 px-3 py-2 text-xs font-medium transition-colors sm:px-5 sm:py-2.5 sm:text-sm",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* ── 본문 ── */}
        <div className="mt-6">
          {isLoading ? (
            <MemberGridSkeleton />
          ) : (
            <>
              {/* 필터바 */}
              <div className="mb-5 flex flex-col gap-3 rounded-2xl border bg-card p-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="이름·학번·관심분야·소속 검색"
                    className="pl-9"
                    aria-label="회원 검색"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {generations.length > 0 && (
                    <select
                      value={generationFilter}
                      onChange={(e) => setGenerationFilter(e.target.value)}
                      className="h-10 rounded-md border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      aria-label="기수 필터"
                    >
                      <option value="all">전체 기수</option>
                      {generations.map((g) => (
                        <option key={g} value={String(g)}>
                          {g}기
                        </option>
                      ))}
                    </select>
                  )}
                  {activeTab === "student" && (
                    <select
                      value={enrollmentFilter}
                      onChange={(e) => setEnrollmentFilter(e.target.value)}
                      className="h-10 rounded-md border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      aria-label="재학 상태 필터"
                    >
                      <option value="all">재학·휴학</option>
                      <option value="enrolled">재학</option>
                      <option value="on_leave">휴학</option>
                    </select>
                  )}
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearFilters}
                      className="h-10 gap-1.5 text-muted-foreground hover:text-foreground"
                      aria-label="필터 초기화"
                    >
                      <X size={13} aria-hidden />
                      초기화
                    </Button>
                  )}
                </div>
              </div>

              {/* 결과 카운트 */}
              <p
                className="mb-4 text-xs text-muted-foreground"
                aria-live="polite"
                aria-atomic="true"
              >
                총 {visible.length}명
                {search && (
                  <span className="ml-1">
                    · <span className="font-medium text-foreground">&quot;{search}&quot;</span> 검색 결과
                  </span>
                )}
              </p>

              {/* 빈 상태 or 그리드 */}
              {visible.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title={search ? `"${search}"에 대한 결과 없음` : "해당 회원이 없습니다"}
                  description={
                    search
                      ? "키워드를 다시 확인하거나 필터를 초기화해보세요."
                      : "조건에 맞는 회원이 아직 등록되지 않았습니다."
                  }
                  {...(hasActiveFilters
                    ? { actionLabel: "필터 초기화", onAction: handleClearFilters }
                    : {})}
                />
              ) : (
                <div
                  className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
                  role="list"
                  aria-label="회원 목록"
                >
                  {visible.map((m) => (
                    <MemberCard key={m.id} member={m} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MemberGridSkeleton() {
  return (
    <div
      className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
      aria-busy="true"
      aria-label="구성원 불러오는 중"
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border bg-card p-6 text-center shadow-sm"
        >
          <Skeleton className="mx-auto h-16 w-16 rounded-full" />
          <Skeleton className="mx-auto mt-4 h-5 w-24" />
          <Skeleton className="mx-auto mt-2 h-3 w-28" />
          <Skeleton className="mx-auto mt-1.5 h-3 w-20" />
          <div className="mt-3 flex justify-center gap-1">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MembersPage() {
  return (
    <Suspense
      fallback={
        <div className="py-8 sm:py-14" aria-busy="true" aria-label="회원 정보 불러오는 중">
          <div className="mx-auto max-w-6xl px-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
            <Skeleton className="mt-6 h-px w-full" />
            <div className="mt-6">
              <MemberGridSkeleton />
            </div>
          </div>
        </div>
      }
    >
      <MembersContent />
    </Suspense>
  );
}
