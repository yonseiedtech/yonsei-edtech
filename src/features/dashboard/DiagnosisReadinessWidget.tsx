"use client";

/**
 * DiagnosisReadinessWidget — 대시보드용 연구 준비도 요약 (H1 진단→학습 루프).
 * MyPageView 진단 카드의 준비도 점수를 컴팩트하게 재사용한다.
 * - diagnosticResultsApi.listByUser 최근 1건의 paperReadiness/analysisReadiness 게이지.
 * - 이력 0건이면 "진단 시작" CTA 폴백.
 * 신규 컬렉션·잔디 가중치 없음 (표시·연결만). 진단 채점 로직 불변.
 */

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, ArrowRight, Sparkles } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import { diagnosticResultsApi } from "@/lib/bkend";
import { formatDate } from "@/lib/utils";
import type { DiagnosticResult } from "@/types/diagnostic";

function ReadinessGauge({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm font-bold tabular-nums text-violet-700 dark:text-violet-300">
          {pct}
          <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">/ 100</span>
        </p>
      </div>
      <div
        className="mt-1 h-1.5 overflow-hidden rounded-full bg-violet-100 dark:bg-violet-900/40"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full bg-violet-500 transition-all dark:bg-violet-400"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function DiagnosisReadinessWidget() {
  const { user } = useAuthStore();
  const userId = user?.id;

  const { data: latest, isLoading } = useQuery({
    queryKey: ["dashboard-diagnosis-readiness", userId],
    queryFn: async (): Promise<DiagnosticResult | null> => {
      if (!userId) return null;
      const res = await diagnosticResultsApi.listByUser(userId);
      const list = Array.isArray(res.data) ? res.data : [];
      return list[0] ?? null;
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return (
      <div
        className="h-28 animate-pulse rounded-2xl border bg-card"
        aria-busy="true"
        aria-label="연구 준비도 불러오는 중"
      />
    );
  }

  // 진단 이력 0건 → 진단 시작 CTA
  if (!latest) {
    return (
      <Link
        href="/diagnosis"
        className="flex items-center gap-3 rounded-2xl border-2 border-violet-200/60 bg-gradient-to-br from-violet-50 to-violet-100/60 p-4 transition-colors hover:border-violet-300 dark:border-violet-800/40 dark:from-violet-950/20 dark:to-violet-900/10"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-200/40 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
          <ClipboardCheck size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">내 연구 준비도 진단하기</p>
          <p className="text-xs text-muted-foreground">
            통계·연구방법·핵심개념을 진단해 준비도를 확인하세요.
          </p>
        </div>
        <ArrowRight size={16} className="shrink-0 text-violet-700 dark:text-violet-300" />
      </Link>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-violet-200/60 bg-gradient-to-br from-violet-50 to-violet-100/60 p-4 dark:border-violet-800/40 dark:from-violet-950/20 dark:to-violet-900/10">
      <div className="flex items-center gap-2">
        <ClipboardCheck size={16} className="text-violet-700 dark:text-violet-300" />
        <h2 className="text-sm font-bold">내 연구 준비도</h2>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {formatDate(latest.createdAt || "")}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <ReadinessGauge label="논문 작성" value={latest.paperReadiness} />
        <ReadinessGauge label="연구 분석" value={latest.analysisReadiness} />
      </div>
      {/* 추가 평가 유도 — 준비도 100% 미만이면 은은한 펄스로 더 풀도록 권장 */}
      {Math.min(latest.paperReadiness, latest.analysisReadiness) < 100 && (
        <Link
          href="/diagnosis"
          className="mt-3 flex animate-in fade-in items-center gap-2 rounded-xl bg-violet-100/70 px-3 py-2 text-[11px] font-medium text-violet-800 transition-colors hover:bg-violet-200/70 dark:bg-violet-900/30 dark:text-violet-200 dark:hover:bg-violet-900/50"
        >
          <Sparkles size={13} className="shrink-0 animate-pulse" />
          <span className="min-w-0 flex-1">더 풀어 준비도를 높여보세요</span>
          <ArrowRight size={12} className="shrink-0" />
        </Link>
      )}
      <Link
        href="/mypage"
        className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-violet-700 hover:underline dark:text-violet-300"
      >
        약점 개념 학습 경로 보기
        <ArrowRight size={11} />
      </Link>
    </div>
  );
}
