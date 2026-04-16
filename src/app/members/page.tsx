"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import MemberCard from "@/components/members/MemberCard";
import { useMembers } from "@/features/member/useMembers";
import { useProfessor } from "@/features/site-settings/useSiteContent";
import { Mail, Globe, BookOpen, Users } from "lucide-react";
import PageHeader from "@/components/ui/page-header";
import EmptyState from "@/components/ui/empty-state";
import LoadingSpinner from "@/components/ui/loading-spinner";
import OrgChart from "@/features/member/OrgChart";
import type { User } from "@/types";

const ROLE_TABS = [
  { key: "professor", label: "주임교수" },
  { key: "staff", label: "운영진", roles: ["president", "staff"] },
  { key: "student", label: "재학생 회원", roles: ["member"] },
  { key: "alumni", label: "졸업생 회원", roles: ["alumni"] },
] as const;

function filterByTab(members: User[], tabKey: string): User[] {
  const tab = ROLE_TABS.find((t) => t.key === tabKey);
  if (!tab || !("roles" in tab)) return [];
  return members.filter((m) => (tab.roles as readonly string[]).includes(m.role));
}

function ProfessorView() {
  const { value: prof, isLoading } = useProfessor();

  if (isLoading) return <LoadingSpinner />;
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

  useEffect(() => {
    if (tabParam && ROLE_TABS.some((t) => t.key === tabParam)) setActiveTab(tabParam);
  }, [tabParam]);

  function handleTabChange(key: string) {
    setActiveTab(key);
    const qs = new URLSearchParams(searchParams.toString());
    if (key === "professor") qs.delete("tab");
    else qs.set("tab", key);
    const next = qs.toString();
    router.replace(next ? `/members?${next}` : "/members", { scroll: false });
  }

  const filtered = filterByTab(members, activeTab);

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
            <LoadingSpinner />
          ) : (
            <>
              {activeTab === "staff" && <div className="mb-8"><OrgChart /></div>}
              {filtered.length === 0 ? (
                <EmptyState icon={Users} title="해당 구성원이 없습니다" description="조건에 맞는 회원이 아직 등록되지 않았습니다." />
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{filtered.map((m) => <MemberCard key={m.id} member={m} />)}</div>
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
    <Suspense fallback={<LoadingSpinner className="py-24" />}>
      <MembersContent />
    </Suspense>
  );
}
