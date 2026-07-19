"use client";

/**
 * MyGrowthWidget — "나의 성장" 통합 위젯 (백로그 H3: 회원 가치 대시보드 통합).
 *
 * 흩어진 성장 지표를 한 카드로 묶어 재방문 동기를 부여한다:
 *   1. 진단 준비도 — diagnosticResultsApi.listByUser 최근 1건의 paper/analysis 평균
 *   2. 학습 잔디 요약 — 이번 학기 학습 활동일수(타이머 세션 기준 distinct day)
 *   3. 연구 타이머 누적 — study_sessions 완료 세션 누적 시간·세션 수
 *   4. 연구 진행도 — writing_paper 장별 작성량 기반 진행률(computeThesisProgress)
 *
 * 데이터는 모두 기존 read-only API/hook 재사용 (mypage 컴포넌트 무접촉).
 * 신규 컬렉션·잔디 가중치·진단 채점 로직 변경 없음 — 표시·연결만.
 * 진단 이력 0건이면 진단 게이지 자리에 "진단 시작" CTA 를 표시한다.
 */

import Link from "next/link";
import { useMemo } from "react";
import {
  Sprout,
  ClipboardCheck,
  Clock,
  FileText,
  ArrowRight,
} from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import { useUserDiagnostics } from "@/features/dashboard/useUserDiagnostics";
import { useStudySessions } from "@/features/research/study-timer/useStudySessions";
import { useWritingPaper } from "@/features/research/useWritingPaper";
import { useResearchProposal } from "@/features/research/useResearchProposal";
import { computeThesisProgress, formatMinutes } from "@/features/research/thesis-progress";
import { todayYmdLocal } from "@/lib/dday";
import type { DiagnosticResult } from "@/types/diagnostic";

/** 이번 학기 시작 ymd — 직전 개강일(3/1·9/1) 기준. QA-v3: 방학에 미래 날짜가 되던 오류 교정 */
function semesterStartYmd(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const start =
    m >= 8 ? new Date(y, 8, 1)
    : m >= 2 ? new Date(y, 2, 1)
    : new Date(y - 1, 8, 1);
  return todayYmdLocal(start);
}

interface MetricTileProps {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  /** 0~100 진행률 (있으면 하단 미니 게이지 표시) */
  pct?: number;
  color: string; // 게이지·아이콘 tint (tailwind text/bg 클래스)
  href: string;
}

function MetricTile({ icon: Icon, label, value, sub, pct, color, href }: MetricTileProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 rounded-xl border bg-card/60 p-3 transition-colors hover:bg-muted/40"
    >
      <div className="flex items-center gap-1.5">
        <Icon size={14} className={color} />
        <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-bold leading-none tabular-nums">{value}</span>
        {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
      </div>
      {typeof pct === "number" && (
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-current transition-all"
            style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
          />
        </div>
      )}
    </Link>
  );
}

export default function MyGrowthWidget() {
  const { user } = useAuthStore();
  const userId = user?.id;

  // 1) 진단 준비도 — 최근 1건 (공통 useUserDiagnostics 훅으로 전 위젯과 캐시 공유)
  const { data: latestDiagnostic } = useUserDiagnostics<DiagnosticResult | null>(
    userId,
    (list) => list[0] ?? null,
  );

  // 2)·3) 연구 타이머 누적 + 이번 학기 학습 활동일수 (study_sessions 재사용)
  const { sessions } = useStudySessions();

  // 4) 연구 진행도 — writing_paper + proposal 여부
  const { paper } = useWritingPaper(userId);
  const { proposal } = useResearchProposal(userId);

  const timer = useMemo(() => {
    const semStart = semesterStartYmd();
    const completed = sessions.filter((s) => !!s.endTime);
    let totalMin = 0;
    let writingMin = 0;
    const semDays = new Set<string>();
    for (const s of completed) {
      const dur = s.durationMinutes || 0;
      totalMin += dur;
      if (s.type === "writing") writingMin += dur;
      const day = s.startTime ? todayYmdLocal(new Date(s.startTime)) : "";
      if (day && day >= semStart) semDays.add(day);
    }
    return {
      totalMin,
      writingMin,
      semActiveDays: semDays.size,
      sessionCount: completed.length,
    };
  }, [sessions]);

  const thesis = useMemo(
    () =>
      computeThesisProgress({
        paper: paper ?? null,
        hasProposal: !!(
          proposal &&
          (proposal.titleKo || proposal.purpose || proposal.content)
        ),
        writingMinutes: timer.writingMin,
      }),
    [paper, proposal, timer.writingMin],
  );

  if (!userId) return null;

  const readiness = latestDiagnostic
    ? Math.round(
        (latestDiagnostic.paperReadiness + latestDiagnostic.analysisReadiness) / 2,
      )
    : null;

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-2">
        <Sprout size={18} className="text-success" aria-hidden="true" />
        <h2 className="font-bold">나의 성장</h2>
        <Link
          href="/mypage"
          className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          전체 보기
          <ArrowRight size={11} />
        </Link>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        진단 준비도·학습 활동·연구 진행을 한눈에 모았어요.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {/* 1. 진단 준비도 */}
        {readiness !== null ? (
          <MetricTile
            icon={ClipboardCheck}
            label="연구 준비도"
            value={`${readiness}`}
            sub="/ 100"
            pct={readiness}
            color="text-cat-5"
            href="/mypage"
          />
        ) : (
          <Link
            href="/diagnosis"
            className="group flex flex-col justify-center gap-1 rounded-xl border-2 border-dashed border-cat-5/30 bg-cat-5/5 p-3 transition-colors hover:border-cat-5/50 dark:bg-cat-5/10"
          >
            <div className="flex items-center gap-1.5">
              <ClipboardCheck size={14} className="text-cat-5" />
              <span className="text-[11px] font-medium text-muted-foreground">연구 준비도</span>
            </div>
            <span className="text-xs font-semibold text-cat-5">
              진단 시작 →
            </span>
          </Link>
        )}

        {/* 2. 이번 학기 학습 활동일수 */}
        <MetricTile
          icon={Sprout}
          label="이번 학기 활동"
          value={`${timer.semActiveDays}`}
          sub="일"
          color="text-success"
          href="/mypage"
        />

        {/* 3. 연구 타이머 누적 */}
        <MetricTile
          icon={Clock}
          label="타이머 누적"
          value={formatMinutes(timer.totalMin)}
          sub={timer.sessionCount > 0 ? `· ${timer.sessionCount}회` : undefined}
          color="text-info"
          href="/mypage/research?tab=report&focus=timer"
        />

        {/* 4. 연구 진행도 */}
        <MetricTile
          icon={FileText}
          label="연구 진행도"
          value={`${thesis.percent}%`}
          pct={thesis.percent}
          color="text-warning"
          href="/mypage/research?tab=writing"
        />
      </div>
    </div>
  );
}
