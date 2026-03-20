"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import MemberCard from "@/components/members/MemberCard";
import { useMembers } from "@/features/member/useMembers";
import { useProfessor } from "@/features/site-settings/useSiteContent";
import { Mail, Globe, BookOpen } from "lucide-react";
import OrgChart from "@/features/member/OrgChart";
import type { User } from "@/types";

const ROLE_TABS = [
  { key: "professor", label: "주임교수" },
  { key: "staff", label: "운영진", roles: ["president", "staff", "admin"] },
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

  if (isLoading) return <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (!prof.name) return <p className="py-12 text-center text-muted-foreground">주임교수 정보가 등록되지 않았습니다.</p>;

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
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "professor");

  useEffect(() => {
    if (tabParam && ROLE_TABS.some((t) => t.key === tabParam)) setActiveTab(tabParam);
  }, [tabParam]);

  const filtered = filterByTab(members, activeTab);

  return (
    <div className="py-16">
      <section className="mx-auto max-w-6xl px-4 text-center">
        <h1 className="text-3xl font-bold md:text-4xl">구성원</h1>
        <p className="mt-4 text-muted-foreground">교육의 미래를 함께 만들어가는 구성원들을 소개합니다.</p>
      </section>
      <section className="mx-auto mt-12 max-w-6xl px-4">
        <div className="flex justify-center gap-2">
          {ROLE_TABS.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={cn("rounded-full px-5 py-2 text-sm font-medium transition-colors", activeTab === tab.key ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80")}>{tab.label}</button>
          ))}
        </div>
        <div className="mt-8">
          {activeTab === "professor" ? <ProfessorView /> : isLoading ? (
            <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
          ) : (
            <>
              {activeTab === "staff" && <div className="mb-8"><OrgChart /></div>}
              {filtered.length === 0 ? (
                <p className="py-12 text-center text-muted-foreground">해당 구성원이 없습니다.</p>
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
  return <Suspense fallback={<div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}><MembersContent /></Suspense>;
}
