"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/auth-store";
import { profilesApi } from "@/lib/bkend";
import ResearchPaperList from "@/features/research/ResearchPaperList";
import WritingPaperEditor from "@/features/research/WritingPaperEditor";
import ResearchReportDialog from "@/features/research/ResearchReportDialog";
import { useResearchPapers } from "@/features/research/useResearchPapers";
import { useWritingPaper } from "@/features/research/useWritingPaper";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { User } from "@/types";
import { BookOpen, FileText, BookOpenCheck, FileBarChart2, X } from "lucide-react";
import { formatPeriodLabel } from "@/lib/research-period";

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
  const fromParam = searchParams.get("from") || "";
  const toParam = searchParams.get("to") || "";

  const [periodStart, setPeriodStart] = useState<string>(fromParam);
  const [periodEnd, setPeriodEnd] = useState<string>(toParam);
  const [reportOpen, setReportOpen] = useState(false);

  const { data: fetchedUser } = useQuery({
    queryKey: ["mypage-user", userId],
    queryFn: async () => {
      const res = await profilesApi.get(userId);
      return res as unknown as User;
    },
    enabled: !isSelf,
  });
  const user = isSelf ? authUser : fetchedUser;

  // 리포트용 데이터 (전체 페이퍼 + writing paper)
  const { papers } = useResearchPapers(userId);
  const { paper: writingPaper } = useWritingPaper(userId);

  const periodLabel = useMemo(
    () => formatPeriodLabel(periodStart, periodEnd),
    [periodStart, periodEnd]
  );

  if (!user) return null;

  function handleTabChange(next: string) {
    if (!isResearchTab(next)) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`/mypage/research?${params.toString()}`, { scroll: false });
  }

  function syncPeriodToUrl(start: string, end: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (start) params.set("from", start); else params.delete("from");
    if (end) params.set("to", end); else params.delete("to");
    router.replace(`/mypage/research?${params.toString()}`, { scroll: false });
  }

  function handleStartChange(v: string) {
    setPeriodStart(v);
    syncPeriodToUrl(v, periodEnd);
  }

  function handleEndChange(v: string) {
    setPeriodEnd(v);
    syncPeriodToUrl(periodStart, v);
  }

  function resetPeriod() {
    setPeriodStart("");
    setPeriodEnd("");
    syncPeriodToUrl("", "");
  }

  const hasPeriod = !!(periodStart || periodEnd);

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

        {/* 기간 필터 + 리포트 */}
        <section className="mt-5 rounded-2xl border bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-1 flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">시작 (YYYY-MM)</label>
                <Input
                  type="month"
                  value={periodStart}
                  onChange={(e) => handleStartChange(e.target.value)}
                  className="w-40"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">종료 (YYYY-MM)</label>
                <Input
                  type="month"
                  value={periodEnd}
                  onChange={(e) => handleEndChange(e.target.value)}
                  className="w-40"
                />
              </div>
              {hasPeriod && (
                <button
                  type="button"
                  onClick={resetPeriod}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-destructive"
                >
                  <X size={12} />
                  초기화
                </button>
              )}
            </div>
            <Button size="sm" onClick={() => setReportOpen(true)}>
              <FileBarChart2 size={14} className="mr-1" />
              연구 리포트 보기
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            기간: <span className="font-medium text-foreground">{periodLabel}</span>
            {" · "}논문 읽기 탭의 발행본 목록과 리포트 출력에 적용됩니다.
          </p>
        </section>

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
            <ResearchPaperList
              user={user}
              readOnly={!isSelf || readOnly}
              periodStart={periodStart}
              periodEnd={periodEnd}
            />
          </TabsContent>
        </Tabs>

        <ResearchReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          user={user}
          papers={papers}
          writingPaper={writingPaper ?? null}
          periodStart={periodStart}
          periodEnd={periodEnd}
        />
      </div>
    </div>
  );
}
