"use client";

import MemberCard from "@/components/members/MemberCard";
import GenerationTabs from "@/components/members/GenerationTabs";
import { useMembers } from "@/features/member/useMembers";

export default function MembersPage() {
  const { members, isLoading } = useMembers();

  return (
    <div className="py-16">
      <section className="mx-auto max-w-6xl px-4 text-center">
        <h1 className="text-3xl font-bold md:text-4xl">멤버 소개</h1>
        <p className="mt-4 text-muted-foreground">
          교육의 미래를 함께 만들어가는 멤버들을 소개합니다.
        </p>
      </section>

      <section className="mx-auto mt-12 max-w-6xl px-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : members.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            등록된 회원이 없습니다.
          </p>
        ) : (
          <GenerationTabs members={members} />
        )}
      </section>
    </div>
  );
}
