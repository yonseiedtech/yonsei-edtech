"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo, Suspense } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import MemberCard from "@/components/members/MemberCard";
import OrgChart from "@/features/member/OrgChart";
import { useMembers } from "@/features/member/useMembers";
import { useProfessor } from "@/features/site-settings/useSiteContent";
import { Mail, Globe, BookOpen, Users, Search } from "lucide-react";
import PageHeader from "@/components/ui/page-header";
import EmptyState from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import type { User } from "@/types";

const ROLE_TABS = [
  { key: "professor", label: "주임교수" },
  { key: "staff", label: "운영진", roles: ["president", "staff"] },
  { key: "student", label: "재학생 회원", roles: ["member", "president", "staff"] },
  { key: "alumni", label: "졸업생 회원", roles: ["alumni"] },
] as const;

function filterByTab(members: User[], tabKey: string): User[] {
  const tab = ROLE_TABS.find((t) => t.key === tabKey);
  if (!tab || !("roles" in tab)) return [];
  const roles = tab.roles as readonly string[];
  return members.filter((m) => {
    if (!roles.includes(m.role)) return false;
    // 재학생 탭: 운영진 중 졸업생 제외 (graduated 또는 alumni 식별)
    if (tabKey === "student") {
      const status = m.enrollmentStatus ?? "enrolled";
      if (status === "graduated") return false;
    }
    return true;
  });
}

function ProfessorView() {
  const { value: prof, isLoading } = useProfessor();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl" aria-busy="true" aria-label="주임교수 정보 불러오는 중">
        <div className="flex flex-col items-center gap-8 rounded-2xl border bg-white p-8 shadow-sm md:flex-row md:items-start md:p-10">
          <Skeleton className="h-52 w-40 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-7 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <div className="mt-4 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-10/12" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (!prof.name) return <EmptyState icon={Users} title="주임교수 정보가 등록되지 않았습니다" description="운영진이 정보를 등록할 때까지 기다려주세요." />;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-col items-center gap-8 rounded-2xl border bg-white p-8 shadow-sm md:flex-row md:items-start md:p-10">
        {prof.photo ? (
          <div className="relative h-52 w-40 shrink-0 overflow-hidden rounded-xl bg-muted">
            <Image src={prof.photo} alt={prof.name} fill className="object-cover" />
          </div>
        ) : (
          <div className="flex h-52 w-40 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-5xl font-bold text-primary/30">{prof.name[0]}</div>
        )}
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{prof.name}</h2>
          <p className="mt-1 text-muted-foreground">{prof.title} · {prof.department}</p>
          <p className="text-sm text-muted-foreground">{prof.affiliation}</p>
          {prof.bio && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{prof.bio}</p>}
          {prof.research.length > 0 && (
            <div className="mt-4">
              <h4 className="flex items-center gap-1 text-sm font-semibold"><BookOpen size={14} /> 연구 분야</h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {prof.research.map((r) => <span key={r} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{r}</span>)}
              </div>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            {prof.email && <a href={`mailto:${prof.email}`} className="flex items-center gap-1 text-primary hover:underline"><Mail size={14} /> {prof.email}</a>}
            {prof.website && <a href={prof.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline"><Globe size={14} /> 홈페이지</a>}
          </div>
        </div>
      </div>
    </div>
  );
}

function MembersContent() {
  const { members, isLoading } = useMembers();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "professor");

  // 검색/필터 상태 (학생/졸업생 탭 공용)
  const [search, setSearch] = useState("");
  const [generationFilter, setGenerationFilter] = useState<string>("all");
  const [enrollmentFilter, setEnrollmentFilter] = useState<string>("all");

  useEffect(() => {
    if (tabParam && ROLE_TABS.some((t) => t.key === tabParam)) setActiveTab(tabParam);
  }, [tabParam]);

  function handleTabChange(key: string) {
    setActiveTab(key);
    setSearch("");
    setGenerationFilter("all");
    setEnrollmentFilter("all");
    const qs = new URLSearchParams(searchParams.toString());
    if (key === "professor") qs.delete("tab");
    else qs.set("tab", key);
    const next = qs.toString();
    router.replace(next ? `/members?${next}` : "/members", { scroll: false });
  }

  const filteredByTab = filterByTab(members, activeTab);

  // 기수 옵션 (현재 탭 기준)
  const generations = useMemo(() => {
    const set = new Set<number>();
    filteredByTab.forEach((m) => { if (m.generation) set.add(m.generation); });
    return Array.from(set).sort((a, b) => b - a);
  }, [filteredByTab]);

  // 검색/필터 적용
  const visible = useMemo(() => {
    let list = filteredByTab;
    if (generationFilter !== "all") {
      list = list.filter((m) => String(m.generation ?? "") === generationFilter);
    }
    if (enrollmentFilter !== "all" && activeTab === "student") {
      list = list.filter((m) => (m.enrollmentStatus ?? "enrolled") === enrollmentFilter);
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
        ].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(q);
      });
    }
    return list;
  }, [filteredByTab, generationFilter, enrollmentFilter, search, activeTab]);

  const showFilters = activeTab === "student" || activeTab === "alumni" || activeTab === "staff";

  return (
    <div className="py-16">
      <section className="mx-auto max-w-6xl px-4">
        <PageHeader
          icon={<Users size={24} />}
          title="구성원"
          description="교육의 미래를 함께 만들어가는 구성원들을 소개합니다."
        />
      </section>
      <section className="mx-auto mt-12 max-w-6xl px-4">
        <nav className="flex gap-1 overflow-x-auto border-b" aria-label="구성원 분류">
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
        <div className="mt-8">
          {activeTab === "professor" ? <ProfessorView /> : isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true" aria-label="구성원 불러오는 중">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl border bg-white p-6 text-center shadow-sm">
                  <Skeleton className="mx-auto h-16 w-16 rounded-full" />
                  <Skeleton className="mx-auto mt-4 h-5 w-24" />
                  <Skeleton className="mx-auto mt-2 h-3 w-32" />
                  <Skeleton className="mx-auto mt-3 h-3 w-20" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {activeTab === "staff" && (
                <div className="mb-8">
                  <OrgChart />
                </div>
              )}
              {showFilters && (
                <div className="mb-6 flex flex-col gap-3 rounded-xl border bg-white p-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="이름·학번·관심분야·소속 검색"
                      className="pl-9"
                    />
                  </div>
                  <div className="flex gap-2">
                    {generations.length > 0 && (
                      <select
                        value={generationFilter}
                        onChange={(e) => setGenerationFilter(e.target.value)}
                        className="rounded-md border bg-white px-3 py-2 text-sm"
                        aria-label="기수 필터"
                      >
                        <option value="all">전체 기수</option>
                        {generations.map((g) => (
                          <option key={g} value={String(g)}>{g}기</option>
                        ))}
                      </select>
                    )}
                    {activeTab === "student" && (
                      <select
                        value={enrollmentFilter}
                        onChange={(e) => setEnrollmentFilter(e.target.value)}
                        className="rounded-md border bg-white px-3 py-2 text-sm"
                        aria-label="재학 상태 필터"
                      >
                        <option value="all">재학·휴학</option>
                        <option value="enrolled">재학</option>
                        <option value="on_leave">휴학</option>
                      </select>
                    )}
                  </div>
                </div>
              )}

              {showFilters && (
                <p className="mb-3 text-xs text-muted-foreground">
                  총 {visible.length}명{search && ` · "${search}" 검색 결과`}
                </p>
              )}

              {visible.length === 0 ? (
                <EmptyState icon={Users} title="해당 구성원이 없습니다" description={search ? "검색 조건에 맞는 회원이 없습니다." : "조건에 맞는 회원이 아직 등록되지 않았습니다."} />
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{visible.map((m) => <MemberCard key={m.id} member={m} />)}</div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default function MembersPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24" aria-busy="true" aria-label="회원 정보 불러오는 중">
          <div className="mx-auto max-w-5xl space-y-3 px-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <MembersContent />
    </Suspense>
  );
}
