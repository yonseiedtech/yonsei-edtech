"use client";

/**
 * 연구 코크핏 (2026-06-11) — 흩어진 연구 데이터의 단일 계기판
 *
 * 에디터 본문(장별 글자수) · 연구계획서 · 미반영 지도 노트 · 집필 타이머 · 버전 수를
 * thesis-progress 엔진으로 합산해 한 줄 스트립으로 보여준다.
 * 활동 기반 여정 단계 신호가 현재 설정 단계와 다르면 갱신을 제안한다.
 */

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Gauge, GraduationCap, History, Timer, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  advisorFeedbackApi,
  researchProposalsApi,
  writingPaperVersionsApi,
} from "@/lib/bkend";
import {
  computeThesisProgress,
  formatMinutes,
  THESIS_CHAPTER_SHORT_LABELS,
} from "./thesis-progress";
import { JOURNEY_STAGES } from "./ThesisJourney";
import type {
  AdvisorFeedbackNote,
  FeedbackChapter,
  User,
  WritingPaper,
  WritingPaperVersion,
} from "@/types";

const LEVEL_COLORS = [
  "bg-muted",                 // 0 미작성
  "bg-primary/30",            // 1 시작
  "bg-primary/60",            // 2 진행
  "bg-primary",               // 3 본궤도
];

interface Props {
  user: User;
  paper: WritingPaper | null | undefined;
  /** 누적 집필(타이머) 분 — 부모(MyResearchView)가 보유한 세션에서 합산 전달 */
  writingMinutes: number;
}

export default function ResearchCockpit({ user, paper, writingMinutes }: Props) {
  const { data: proposals = [] } = useQuery({
    queryKey: ["research-proposals", user.id],
    queryFn: async () => (await researchProposalsApi.listByUser(user.id)).data,
  });

  const { data: feedbackNotes = [] } = useQuery({
    queryKey: ["advisor-feedback", user.id],
    queryFn: async () => (await advisorFeedbackApi.listByUser(user.id)).data as AdvisorFeedbackNote[],
  });

  const { data: versions = [] } = useQuery({
    queryKey: ["writing_paper_versions", user.id],
    queryFn: async () => (await writingPaperVersionsApi.listByUser(user.id)).data as WritingPaperVersion[],
  });

  const progress = useMemo(() => {
    const pendingByChapter: Partial<Record<FeedbackChapter, number>> = {};
    for (const n of feedbackNotes) {
      if (n.status !== "pending") continue;
      pendingByChapter[n.chapter] = (pendingByChapter[n.chapter] ?? 0) + 1;
    }
    return computeThesisProgress({
      paper: paper ?? null,
      hasProposal: proposals.length > 0,
      pendingFeedbackByChapter: pendingByChapter,
      writingMinutes,
    });
  }, [paper, proposals.length, feedbackNotes, writingMinutes]);

  // 현재 설정된 여정 단계 (오버라이드 우선 — ThesisJourney 와 동일 규칙의 단순화)
  const currentStage =
    typeof user.thesisJourneyStage === "number" &&
    user.thesisJourneyStage >= 1 &&
    user.thesisJourneyStage <= 5
      ? user.thesisJourneyStage
      : null;
  const showStageHint =
    currentStage != null && progress.activityStage > currentStage && progress.totalChars > 0;

  return (
    <section
      aria-label="연구 코크핏"
      className="rounded-2xl border bg-card p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* 진행률 + 장별 세그먼트 */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex shrink-0 items-center gap-1.5">
            <Gauge size={15} className="text-primary" />
            <span className="text-sm font-bold tabular-nums">{progress.percent}%</span>
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-1">
            {progress.chapters.map((c) => (
              <div key={c.key} className="min-w-0 flex-1" title={`${THESIS_CHAPTER_SHORT_LABELS[c.key]} ${c.chars.toLocaleString()}자`}>
                <div className={cn("h-2 rounded-full", LEVEL_COLORS[c.level])} />
                <p className="mt-0.5 truncate text-center text-[9px] text-muted-foreground">
                  {THESIS_CHAPTER_SHORT_LABELS[c.key]}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 핵심 숫자 */}
        <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="tabular-nums">{progress.totalChars.toLocaleString()}자</span>
          {writingMinutes > 0 && (
            <span className="flex items-center gap-0.5">
              <Timer size={11} />
              {formatMinutes(writingMinutes)}
            </span>
          )}
          {versions.length > 0 && (
            <span className="flex items-center gap-0.5">
              <History size={11} />
              버전 {versions.length}
            </span>
          )}
          <Link
            href="/mypage/research?tab=feedback"
            className={cn(
              "flex items-center gap-0.5 hover:underline",
              progress.pendingFeedbackTotal > 0 ? "font-semibold text-amber-600 dark:text-amber-400" : "",
            )}
          >
            <GraduationCap size={11} />
            미반영 지도 {progress.pendingFeedbackTotal}
          </Link>
        </div>
      </div>

      {/* 활동 기반 단계 신호 — 설정 단계보다 앞서 있으면 갱신 제안 */}
      {showStageHint && (
        <p className="mt-2.5 flex flex-wrap items-center gap-1 rounded-lg bg-primary/5 px-3 py-1.5 text-[11px] text-muted-foreground">
          실제 작성 활동은{" "}
          <span className="font-semibold text-primary">
            {progress.activityStage}단계({JOURNEY_STAGES[progress.activityStage - 1].title})
          </span>{" "}
          신호입니다 — 여정 단계({currentStage}단계)를 갱신해보세요.
          <ArrowRight size={11} className="text-primary" />
        </p>
      )}
    </section>
  );
}
