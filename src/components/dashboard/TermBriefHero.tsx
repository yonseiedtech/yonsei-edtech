"use client";

/**
 * 학기 진행 Hero (Sprint 67-AP Phase 2)
 *
 * 토스 패턴 — "이번 학기 / N학기차 / 할 일 N가지" 큰 hero 카드.
 * 외부 피드백("학기별 로드맵 자동 안내")의 핵심 요구를 대시보드에서 직접 해결.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Sparkles, Target } from "lucide-react";
import type { User } from "@/types";
import { getUserCumulativeSemesterCount, getUserEntryYear, getUserEntrySemester } from "@/lib/interview-target";

interface Props {
  user: User;
  /**
   * Sprint 67-AP Phase 2-B: 학사일정 진행률 영역 통합.
   * dashboard 에서 AcademicCalendarProgress 를 children 으로 전달하면
   * hero 카드 내부에 통합 표시.
   */
  academicCalendarSlot?: ReactNode;
}

export default function TermBriefHero({ user, academicCalendarSlot }: Props) {
  const entryYear = getUserEntryYear(user);
  const entrySem = getUserEntrySemester(user);
  const cumulativeSem = getUserCumulativeSemesterCount(user) ?? null;

  // 현재 학기 라벨
  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;
  const nowSemester = nowMonth >= 3 && nowMonth <= 8 ? "1학기" : "2학기";

  // 신분(role) 한국어 라벨
  const occupation = (user as { occupation?: string }).occupation;
  const role = (user as { role?: string }).role;
  let identityLabel = "회원";
  if (occupation === "professor" || role === "advisor") identityLabel = "교수님";
  else if ((user as { academicLevel?: string }).academicLevel === "doctoral") identityLabel = "박사과정";
  else if ((user as { academicLevel?: string }).academicLevel === "masters") identityLabel = "석사과정";
  else if ((user as { isAlumni?: boolean }).isAlumni) identityLabel = "졸업생";

  return (
    <section className="relative mt-6 overflow-hidden rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-6 shadow-sm sm:p-10">
      {/* 떠다니는 sparkle 장식 */}
      <Sparkles className="absolute right-6 top-6 h-6 w-6 animate-pulse text-primary/40" />
      <Sparkles className="absolute right-16 top-12 h-4 w-4 animate-pulse text-primary/30 [animation-delay:0.4s]" />

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary/80">
            {nowYear}학년도 {nowSemester} · 학기 진행
          </p>
          <h2 className="mt-2 text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
            {user.name}님,
            <br />
            {cumulativeSem != null ? (
              <>
                <span className="text-primary">{cumulativeSem}학기차</span> {identityLabel}이세요.
              </>
            ) : (
              <>이번 학기도 함께해요.</>
            )}
          </h2>
          <p className="mt-3 max-w-xl text-sm text-foreground/70 sm:text-base">
            이번 학기 해야 할 일을 인지디딤판에서 확인하세요. 학기별 로드맵으로 졸업까지 가는 길을 안내해드려요.
          </p>
          {entryYear && (
            <p className="mt-2 text-xs text-muted-foreground">
              <Target size={11} className="mr-0.5 inline" />
              입학 {entryYear}학년도 {entrySem === "first" ? "1학기" : "2학기"}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <Link
            href="/steppingstone"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <span>인지디딤판 열기</span>
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/mypage/activities?tab=activities"
            className="text-center text-xs text-muted-foreground hover:text-foreground sm:text-right"
          >
            내 학술 활동 →
          </Link>
        </div>
      </div>

      {/* Sprint 67-AP Phase 2-B: 학사일정 진행률 통합 표시 (제공 시) */}
      {academicCalendarSlot && (
        <div className="relative mt-6 border-t border-primary/15 pt-5">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-primary/70">
            학사 일정 진행률
          </p>
          {academicCalendarSlot}
        </div>
      )}
    </section>
  );
}
