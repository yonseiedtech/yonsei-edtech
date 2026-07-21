"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  ChevronRight,
  ClipboardList,
  PenLine,
  DraftingCompass,
  FileText,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { UserResearchSummary } from "./types";
import { formatDate, formatHours } from "./utils";
import { MiniProgress } from "./components/MiniProgress";
import { WritingTab } from "./tabs/WritingTab";
import { ReadingTab } from "./tabs/ReadingTab";
import { ProposalTab } from "./tabs/ProposalTab";
import { DesignTab } from "./tabs/DesignTab";
import { ReportTab } from "./tabs/ReportTab";

export function ResearchRow({ summary }: { summary: UserResearchSummary }) {
  const [open, setOpen] = useState(false);
  const {
    user,
    report,
    proposal,
    design,
    writing,
    papers,
    sessions,
    totalMinutes,
    reportProgress,
    proposalProgress,
    designProgress,
    writingCharCount,
    lastActivityAt,
  } = summary;

  const writingSessions = sessions.filter((s) => s.type === "writing");
  const readingSessions = sessions.filter((s) => s.type === "reading");
  const writingMinutes = writingSessions.reduce((a, s) => a + (s.durationMinutes ?? 0), 0);
  const readingMinutes = readingSessions.reduce((a, s) => a + (s.durationMinutes ?? 0), 0);

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition hover:bg-muted/40"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {user.name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold">{user.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{user.username}</span>
            {user.field && (
              <Badge variant="outline" className="hidden shrink-0 text-[10px] sm:inline-flex">
                {user.field}
              </Badge>
            )}
            <Link
              href={`/profile/${user.id}`}
              onClick={(e) => e.stopPropagation()}
              className="ml-1 inline-flex h-6 shrink-0 items-center justify-center rounded-md border border-input bg-background px-2 text-[11px] font-medium text-foreground hover:bg-accent"
            >
              프로필 보기
            </Link>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <PenLine size={11} /> 논문 {writingCharCount.toLocaleString()}자
            </span>
            <span className="inline-flex items-center gap-1">
              <BookOpen size={11} /> 읽기 {papers.length}편
            </span>
            <span className="inline-flex items-center gap-1">
              <DraftingCompass size={11} /> 설계 {designProgress}%
            </span>
            <span className="inline-flex items-center gap-1">
              <ClipboardList size={11} /> 계획서 {proposalProgress}%
            </span>
            <span className="inline-flex items-center gap-1">
              <FileText size={11} /> 보고서 {reportProgress}%
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock size={11} /> {formatHours(totalMinutes)}
            </span>
            <span>최근: {formatDate(lastActivityAt)}</span>
          </div>
        </div>
        <ChevronRight
          size={16}
          className={cn("shrink-0 text-muted-foreground transition-transform", open && "rotate-90")}
        />
      </div>

      {open && (
        <div className="border-t bg-muted/20 px-4 py-4 text-sm">
          {/* 진행 현황 미니 요약 — 내 연구활동 페이지와 동일 순서 */}
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <MiniProgress label="연구 보고서" value={reportProgress} hint={report ? "작성 중" : "미작성"} icon={FileText} />
            <MiniProgress label="연구 설계" value={designProgress} hint={design ? "작성 중" : "미작성"} icon={DraftingCompass} />
            <MiniProgress label="연구 계획서" value={proposalProgress} hint={proposal ? "작성 중" : "미작성"} icon={ClipboardList} />
            <MiniProgress label="논문 작성" value={Math.min(100, Math.round((writingCharCount / 7500) * 100))} hint={`${writingCharCount.toLocaleString()}자`} icon={PenLine} />
            <MiniProgress label="논문 읽기" value={Math.min(100, papers.length * 10)} hint={`${papers.length}편`} icon={BookOpen} />
          </div>

          <Tabs defaultValue="report" className="w-full">
            <TabsList className="grid w-full grid-cols-2 gap-1 sm:grid-cols-5 sm:max-w-3xl">
              <TabsTrigger value="report" className="flex items-center gap-1.5 text-xs">
                <FileText size={12} />
                연구 보고서
              </TabsTrigger>
              <TabsTrigger value="design" className="flex items-center gap-1.5 text-xs">
                <DraftingCompass size={12} />
                연구 설계
              </TabsTrigger>
              <TabsTrigger value="proposal" className="flex items-center gap-1.5 text-xs">
                <ClipboardList size={12} />
                연구 계획서
              </TabsTrigger>
              <TabsTrigger value="writing" className="flex items-center gap-1.5 text-xs">
                <PenLine size={12} />
                논문 작성
              </TabsTrigger>
              <TabsTrigger value="reading" className="flex items-center gap-1.5 text-xs">
                <BookOpen size={12} />
                논문 읽기
              </TabsTrigger>
            </TabsList>

            <TabsContent value="report" className="mt-3 space-y-3">
              <ReportTab report={report} reportProgress={reportProgress} />
            </TabsContent>

            <TabsContent value="design" className="mt-3 space-y-3">
              <DesignTab design={design} designProgress={designProgress} />
            </TabsContent>

            <TabsContent value="proposal" className="mt-3 space-y-3">
              <ProposalTab proposal={proposal} proposalProgress={proposalProgress} />
            </TabsContent>

            <TabsContent value="writing" className="mt-3 space-y-3">
              <WritingTab
                writing={writing}
                charCount={writingCharCount}
                writingMinutes={writingMinutes}
                writingSessionCount={writingSessions.length}
              />
            </TabsContent>

            <TabsContent value="reading" className="mt-3 space-y-3">
              <ReadingTab
                papers={papers}
                readingMinutes={readingMinutes}
                readingSessionCount={readingSessions.length}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </li>
  );
}
