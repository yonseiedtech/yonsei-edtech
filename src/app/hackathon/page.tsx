import type { Metadata } from "next";
import {
  CalendarDays,
  Clock,
  MapPin,
  Sparkles,
  Rocket,
  HelpCircle,
  Users,
} from "lucide-react";
import PageContainer from "@/components/ui/page-container";
import { formatDday } from "@/lib/dday";
import HackathonBoard from "@/features/hackathon/HackathonBoard";
import HackathonPhaseTimeline from "@/features/hackathon/HackathonPhaseTimeline";
import HackathonLiveBanner from "@/features/hackathon/HackathonLiveBanner";
import HackathonSectionGate from "@/features/hackathon/HackathonSectionGate";
import {
  HACKATHON_EVENT,
  HACKATHON_TIMELINE,
  HACKATHON_FAQ,
} from "@/features/hackathon/config";

// D-day·색상 임계값이 빌드 시점에 고정되지 않도록 1시간 주기 재생성 (리뷰 M-2)
export const revalidate = 3600;

export const metadata: Metadata = {
  title: HACKATHON_EVENT.title,
  description:
    "교육 현장의 문제를 함께 정의하고 에듀테크로 해법을 만드는 하루. 개발이 처음이어도, 아이디어만 있어도 괜찮은 부담 없는 미니 학술대회. 2026년 8월 22일.",
};

export default function HackathonHubPage() {
  const dday = formatDday(HACKATHON_EVENT.date);

  return (
    <PageContainer width="default">
      <div className="animate-in fade-in slide-in-from-bottom-2 py-8 duration-300 sm:py-12">
        {/* ── 히어로 ── */}
        <section className="overflow-hidden rounded-3xl border bg-primary/5 p-6 sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles size={12} />
            {HACKATHON_EVENT.tagline}
          </div>
          <h1 className="mt-4 text-2xl font-bold leading-tight tracking-tight sm:text-4xl">
            {HACKATHON_EVENT.title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {HACKATHON_EVENT.intro}
          </p>

          {/* 핵심 메타 */}
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-xl border bg-card px-3 py-2 text-sm font-medium">
              <CalendarDays size={15} className="text-primary" />
              2026. 8. 22. ({HACKATHON_EVENT.dayLabel})
              {dday && (
                <span
                  className={`ml-1 rounded-md px-1.5 py-0.5 text-xs font-bold ${
                    dday.diffDays <= 3
                      ? "bg-destructive text-destructive-foreground"
                      : dday.diffDays <= 7
                        ? "bg-warning text-white"
                        : "bg-primary text-primary-foreground"
                  }`}
                >
                  {dday.label}
                </span>
              )}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl border bg-card px-3 py-2 text-sm font-medium">
              <Clock size={15} className="text-primary" />
              {HACKATHON_EVENT.timeLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl border bg-card px-3 py-2 text-sm font-medium">
              <MapPin size={15} className="text-primary" />
              {HACKATHON_EVENT.place}
            </span>
          </div>

          {/* 하이라이트 */}
          <ul className="mt-6 space-y-2">
            {HACKATHON_EVENT.highlights.map((h) => (
              <li
                key={h}
                className="flex items-start gap-2 text-sm text-foreground"
              >
                <Sparkles
                  size={14}
                  className="mt-0.5 shrink-0 text-primary"
                />
                {h}
              </li>
            ))}
          </ul>

          {/* v14-H2: 참가 현황 카운터 + 제출 마감 D-day 강조 (client) */}
          <HackathonLiveBanner />
        </section>

        {/* ── 단계별 진행 상태 + D-day 카운트다운 (v8-H6) ── */}
        <HackathonPhaseTimeline />

        {/* ── 수상작·팀 현황·산출물 제출 — 운영진 콘솔 공개 토글 시 노출 ── */}
        <HackathonSectionGate />

        {/* ── 참가 신청 · 아이디어 보드 ── */}
        <section id="hackathon-board" className="mt-12">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Rocket size={18} className="text-primary" />
            참가 신청 · 아이디어 보드
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            풀고 싶은 교육 현장의 문제를 한 줄로 남기면 참가 신청이 됩니다. 서로의 문제에 공감하며 팀을 찾아보세요.
          </p>
          <div className="mt-5">
            <HackathonBoard />
          </div>
        </section>

        {/* ── 당일 타임라인 ── */}
        <section className="mt-12">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Clock size={18} className="text-primary" />
            당일 타임라인
            <span className="text-xs font-normal text-muted-foreground">
              (잠정 · 확정 시 갱신)
            </span>
          </h2>
          <ol className="mt-4 space-y-0">
            {HACKATHON_TIMELINE.map((slot, i) => (
              <li key={slot.time} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                  {i < HACKATHON_TIMELINE.length - 1 && (
                    <span className="w-px flex-1 bg-border" />
                  )}
                </div>
                <div className="pb-5">
                  <span className="text-sm font-bold tabular-nums text-primary">
                    {slot.time}
                  </span>
                  <p className="text-sm text-foreground">{slot.label}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ── FAQ ── */}
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <HelpCircle size={18} className="text-primary" />
            자주 묻는 질문
          </h2>
          <div className="mt-4 space-y-2.5">
            {HACKATHON_FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl border bg-card p-4"
              >
                <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold marker:content-none">
                  <Users size={14} className="shrink-0 text-primary" />
                  {item.q}
                </summary>
                <p className="mt-2 pl-6 text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        <p className="mt-10 rounded-2xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 p-4 text-center text-xs text-muted-foreground">
          일정·장소·발표 방식 등 세부 사항은 운영진 준비 상황에 따라 업데이트됩니다.
        </p>
      </div>
    </PageContainer>
  );
}
