"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/auth-store";
import { profilesApi } from "@/lib/bkend";
import ResearchPaperList from "@/features/research/ResearchPaperList";
import WritingPaperEditor from "@/features/research/WritingPaperEditor";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { User } from "@/types";
import { BookOpen, FileText, BookOpenCheck } from "lucide-react";

interface Props {
  userId: string;
  readOnly?: boolean;
}

type ResearchTab = "writing" | "reading";

function isResearchTab(v: string | null): v is ResearchTab {
  return v === "writing" || v === "reading";
}

export default function MyResearchView({ userId, readOnly = false }: Props) {
  const { user: authUser } = useAuthStore();
  const isSelf = authUser?.id === userId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab: ResearchTab = isResearchTab(rawTab) ? rawTab : "writing";

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

  function handleTabChange(next: string) {
    if (!isResearchTab(next)) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`/mypage/research?${params.toString()}`, { scroll: false });
  }

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
          직접 쓰는 논문과 분석한 논문을 한 곳에서 관리하세요.
        </p>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-6">
          <TabsList variant="line" className="w-full justify-start gap-2 border-b">
            <TabsTrigger value="writing" className="flex-none">
              <FileText size={14} />내 논문 작성
            </TabsTrigger>
            <TabsTrigger value="reading" className="flex-none">
              <BookOpenCheck size={14} />논문 읽기
            </TabsTrigger>
          </TabsList>

          <TabsContent value="writing" className="mt-5">
            <WritingPaperEditor user={user} readOnly={!isSelf || readOnly} />
          </TabsContent>

          <TabsContent value="reading" className="mt-5">
            <ResearchPaperList user={user} readOnly={!isSelf || readOnly} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
