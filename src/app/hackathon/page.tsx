import type { Metadata } from "next";
import { HelpCircle, Rocket, Users } from "lucide-react";
import PageContainer from "@/components/ui/page-container";
import HackathonBoard from "@/features/hackathon/HackathonBoard";
import HackathonPhaseTimeline from "@/features/hackathon/HackathonPhaseTimeline";
import HackathonSectionGate from "@/features/hackathon/HackathonSectionGate";
import HackathonHeroMeta from "@/features/hackathon/HackathonHeroMeta";
import HackathonDayTimeline from "@/features/hackathon/HackathonDayTimeline";
import { HACKATHON_EVENT, HACKATHON_FAQ } from "@/features/hackathon/config";

// D-day·색상 임계값이 빌드 시점에 고정되지 않도록 1시간 주기 재생성 (리뷰 M-2)
export const revalidate = 3600;

export const metadata: Metadata = {
  title: HACKATHON_EVENT.title,
  description:
    "교육 현장의 문제를 함께 정의하고 에듀테크로 해법을 만드는 하루. 개발이 처음이어도, 아이디어만 있어도 괜찮은 부담 없는 미니 학술대회. 2026년 8월 22일.",
};

export default function HackathonHubPage() {
  return (
    <PageContainer width="default">
      <div className="animate-in fade-in slide-in-from-bottom-2 py-8 duration-300 sm:py-12">
        {/* ── 히어로 (클라이언트 컴포넌트 — Firestore 이벤트 설정 실시간 반영) ── */}
        <HackathonHeroMeta />

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

        {/* ── 당일 타임라인 (클라이언트 컴포넌트 — Firestore 이벤트 설정 실시간 반영) ── */}
        <HackathonDayTimeline />

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
