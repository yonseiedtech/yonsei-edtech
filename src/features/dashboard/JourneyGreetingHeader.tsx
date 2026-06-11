"use client";

/**
 * 대시보드 여정 인사 헤더 (체감 스프린트, 2026-06-11)
 *
 * 리브랜딩 시그니처("연구 성장 동반자")를 회원이 매일 보는 대시보드 최상단에 반영.
 * 입학 학기 기반 현재 논문 단계와 "오늘의 다음 한 걸음"(단계 목표)을 인사와 함께 보여준다.
 * 학기 정보가 없으면 여정 설정 유도로 폴백.
 */

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, Gauge } from "lucide-react";
import { JOURNEY_STAGES } from "@/features/research/ThesisJourney";
import { useWritingPaper } from "@/features/research/useWritingPaper";
import { computeThesisProgress } from "@/features/research/thesis-progress";
import { getEffectiveSemesterCount } from "@/lib/interview-target";
import type { User } from "@/types";

function greetingByHour(): string {
  const h = new Date().getHours();
  if (h < 6) return "늦은 밤까지 고생 많으세요";
  if (h < 12) return "좋은 아침이에요";
  if (h < 18) return "좋은 오후예요";
  return "오늘 하루도 수고하셨어요";
}

export default function JourneyGreetingHeader({ user }: { user: User }) {
  // 코크핏 연동: 에디터 본문 기반 진행률 (장별 레벨 합산 %)
  const { paper } = useWritingPaper(user.id);
  const writingPercent = useMemo(
    () => computeThesisProgress({ paper: paper ?? null, hasProposal: false }).percent,
    [paper],
  );

  const stage = useMemo(() => {
    const override = user.thesisJourneyStage;
    if (typeof override === "number" && override >= 1 && override <= 5) {
      return JOURNEY_STAGES[override - 1];
    }
    const sem = getEffectiveSemesterCount(user);
    if (sem == null) return null;
    return JOURNEY_STAGES[Math.min(Math.max(sem, 1), 5) - 1];
  }, [user]);

  return (
    <section
      aria-label="여정 인사"
      className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-primary/10 via-sky-500/5 to-transparent p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            {greetingByHour()}, <span className="font-semibold text-foreground">{user.name}</span>님 👋
          </p>
          {stage ? (
            <p className="mt-1 text-base font-bold tracking-tight sm:text-lg">
              지금은{" "}
              <span className="bg-gradient-to-r from-primary to-sky-500 bg-clip-text text-transparent">
                {stage.semesterLabel} · {stage.title}
              </span>{" "}
              단계 — {stage.goal}
            </p>
          ) : (
            <p className="mt-1 text-base font-bold tracking-tight sm:text-lg">
              나의 논문 여정을 설정하고 학기별 다음 한 걸음을 안내받으세요.
            </p>
          )}
          {/* 코크핏 연동: 논문 본문 진행률 — 작성분이 있을 때만 노출 */}
          {writingPercent > 0 && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Gauge size={12} className="text-primary" />
              논문 진행률 <span className="font-semibold tabular-nums text-foreground">{writingPercent}%</span>
              <span className="inline-block h-1.5 w-24 overflow-hidden rounded-full bg-muted align-middle">
                <span
                  className="block h-full rounded-full bg-gradient-to-r from-primary to-sky-500"
                  style={{ width: `${writingPercent}%` }}
                />
              </span>
            </p>
          )}
        </div>
        <Link
          href="/mypage/research"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-card/80 px-4 py-2 text-xs font-semibold text-primary shadow-sm backdrop-blur transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          {stage ? "나의 논문 여정" : "여정 시작하기"}
          <ArrowRight size={13} />
        </Link>
      </div>
    </section>
  );
}
