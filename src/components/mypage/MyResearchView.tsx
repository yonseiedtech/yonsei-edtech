"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/auth-store";
import { profilesApi } from "@/lib/bkend";
import ResearchPaperList from "@/features/research/ResearchPaperList";
import type { User } from "@/types";
import { BookOpen } from "lucide-react";

interface Props {
  userId: string;
  readOnly?: boolean;
}

export default function MyResearchView({ userId, readOnly = false }: Props) {
  const { user: authUser } = useAuthStore();
  const isSelf = authUser?.id === userId;

  const { data: fetchedUser } = useQuery({
    queryKey: ["mypage-user", userId],
    queryFn: async () => {
      const res = await profilesApi.get(userId);
      return res as unknown as User;
    },
    enabled: !isSelf,
  });
  const user = isSelf ? authUser : fetchedUser;

  if (!user) return null;

  return (
    <div className="py-12">
      <div className="mx-auto max-w-3xl px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={22} className="text-primary" />
            <h1 className="text-2xl font-bold">내 연구활동</h1>
          </div>
          <Link
            href="/mypage"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            마이페이지로 돌아가기
          </Link>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          관심 연구분야와 분석한 논문을 한 곳에서 정리하세요.
        </p>

        <div className="mt-6">
          <ResearchPaperList user={user} readOnly={!isSelf || readOnly} />
        </div>
      </div>
    </div>
  );
}
