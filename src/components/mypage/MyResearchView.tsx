"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/auth-store";
import { profilesApi } from "@/lib/bkend";
import ResearchPaperList from "@/features/research/ResearchPaperList";
import WritingPaperEditor from "@/features/research/WritingPaperEditor";
import WritingHeatmap from "@/features/research/WritingHeatmap";
import WritingHistoryList from "@/features/research/WritingHistoryList";
import ResearchDashboard from "@/features/research/ResearchDashboard";
import ResearchReportPrint from "@/features/research/ResearchReportPrint";
import { useResearchPapers } from "@/features/research/useResearchPapers";
import { useWritingPaper } from "@/features/research/useWritingPaper";
import { useWritingPaperHistory } from "@/features/research/useWritingPaperHistory";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import type { User } from "@/types";
import { BookOpen, FileText, BookOpenCheck, FileBarChart2, X, CalendarRange } from "lucide-react";
import { formatPeriodLabel } from "@/lib/research-period";
import {
  currentSemesterRange,
  previousSemesterRange,
  thisYearRange,
} from "@/lib/semester";

interface Props {
  userId: string;
  readOnly?: boolean;
}

type ResearchTab = "writing" | "reading" | "report";

function isResearchTab(v: string | null): v is ResearchTab {
  return v === "writing" || v === "reading" || v === "report";
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

  const { data: fetchedUser } = useQuery({
    queryKey: ["mypage-user", userId],
    queryFn: async () => {
      const res = await profilesApi.get(userId);
      return res as unknown as User;
    },
    enabled: !isSelf,
  });
  const user = isSelf ? authUser : fetchedUser;

  // 데이터 소스
  const { papers } = useResearchPapers(userId);
  const { paper: writingPaper } = useWritingPaper(userId);
  const { history } = useWritingPaperHistory(userId);

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

  function applyRange(from: string, to: string) {
    setPeriodStart(from);
    setPeriodEnd(to);
    syncPeriodToUrl(from, to);
  }

  function resetPeriod() {
    setPeriodStart("");
    setPeriodEnd("");
    syncPeriodToUrl("", "");
  }

  const hasPeriod = !!(periodStart || periodEnd);

  // 학기 빠른 선택
  const cur = currentSemesterRange();
  const prev = previousSemesterRange();
  const ty = thisYearRange();

  return (
    <div className="py-12">
      <div className="mx-auto max-w-3xl px-4">
        <div className="flex items-center justify-between print-hide">
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
        <p className="mt-1 text-sm text-muted-foreground print-hide">
          직접 쓰는 논문과 분석한 논문을 한 곳에서 관리하세요.
        </p>

        {/* 기간 필터 + 학기 빠른 선택 */}
        <section className="mt-5 rounded-2xl border bg-white p-4 print-hide">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <CalendarRange size={12} />
                빠른 선택
              </span>
              <QuickBtn label={cur.label} onClick={() => applyRange(cur.from, cur.to)} active={periodStart === cur.from && periodEnd === cur.to} />
              <QuickBtn label={prev.label} onClick={() => applyRange(prev.from, prev.to)} active={periodStart === prev.from && periodEnd === prev.to} />
              <QuickBtn label={ty.label} onClick={() => applyRange(ty.from, ty.to)} active={periodStart === ty.from && periodEnd === ty.to} />
            </div>
            <div className="flex flex-wrap items-end gap-3">
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
            <p className="text-[11px] text-muted-foreground">
              기간: <span className="font-medium text-foreground">{periodLabel}</span>
              {" · "}연구 리포트 / 논문 읽기 발행본 목록에 적용됩니다.
            </p>
          </div>
        </section>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-6 print-hide">
          <TabsList variant="line" className="w-full justify-start gap-2 border-b">
            <TabsTrigger value="writing" className="flex-none">
              <FileText size={14} />내 논문 작성
            </TabsTrigger>
            <TabsTrigger value="reading" className="flex-none">
              <BookOpenCheck size={14} />논문 읽기
            </TabsTrigger>
            <TabsTrigger value="report" className="flex-none">
              <FileBarChart2 size={14} />연구 리포트
            </TabsTrigger>
          </TabsList>

          <TabsContent value="writing" className="mt-5">
            <div className="space-y-5">
              <WritingHeatmap history={history} />
              <WritingHistoryList history={history} />
              <WritingPaperEditor user={user} readOnly={!isSelf || readOnly} />
            </div>
          </TabsContent>

          <TabsContent value="reading" className="mt-5">
            <ResearchPaperList
              user={user}
              readOnly={!isSelf || readOnly}
              periodStart={periodStart}
              periodEnd={periodEnd}
            />
          </TabsContent>

          <TabsContent value="report" className="mt-5">
            <div className="space-y-6">
              <div className="print-hide">
                <ResearchDashboard
                  papers={papers}
                  history={history}
                  periodStart={periodStart}
                  periodEnd={periodEnd}
                />
              </div>
              <ResearchReportPrint
                user={user}
                papers={papers}
                writingPaper={writingPaper ?? null}
                history={history}
                periodStart={periodStart}
                periodEnd={periodEnd}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function QuickBtn({ label, onClick, active }: { label: string; onClick: () => void; active: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-white text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
