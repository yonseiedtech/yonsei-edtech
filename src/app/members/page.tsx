"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { cn } from "@/lib/utils";
import MemberCard from "@/components/members/MemberCard";
import { useMembers } from "@/features/member/useMembers";
import type { User } from "@/types";

const ROLE_TABS = [
  { key: "professor", label: "주임교수", roles: ["advisor"] },
  { key: "staff", label: "운영진", roles: ["president", "staff", "admin"] },
  { key: "student", label: "재학생 회원", roles: ["member"] },
  { key: "alumni", label: "졸업생 회원", roles: ["alumni"] },
] as const;

function filterByTab(members: User[], tabKey: string): User[] {
  const tab = ROLE_TABS.find((t) => t.key === tabKey);
  if (!tab) return members;
  return members.filter((m) => (tab.roles as readonly string[]).includes(m.role));
}

function MembersContent() {
  const { members, isLoading } = useMembers();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "professor");

  useEffect(() => {
    if (tabParam && ROLE_TABS.some((t) => t.key === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const filtered = filterByTab(members, activeTab);

  return (
    <div className="py-16">
      <section className="mx-auto max-w-6xl px-4 text-center">
        <h1 className="text-3xl font-bold md:text-4xl">구성원</h1>
        <p className="mt-4 text-muted-foreground">
          교육의 미래를 함께 만들어가는 구성원들을 소개합니다.
        </p>
      </section>

      <section className="mx-auto mt-12 max-w-6xl px-4">
        {/* Role Tabs */}
        <div className="flex justify-center gap-2">
          {ROLE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Member Grid */}
        <div className="mt-8">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              해당 구성원이 없습니다.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {filtered.map((member) => (
                <MemberCard key={member.id} member={member} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function MembersPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <MembersContent />
    </Suspense>
  );
}
