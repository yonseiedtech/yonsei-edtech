"use client";

import { ClipboardCheck, Sparkles, ArrowRight, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import InlineNotification from "@/components/ui/inline-notification";
import {
  DIAGNOSTIC_AREA_COLORS,
  DIAGNOSTIC_AREA_DESCRIPTIONS,
  DIAGNOSTIC_AREA_LABELS,
  DIAGNOSTIC_AREA_ORDER,
  type DiagnosticArea,
} from "@/types";
import { cn } from "@/lib/utils";

interface DiagnosisLandingProps {
  /** 영역별 사용 가능한 문항 수 */
  countsByArea: Record<DiagnosticArea, number>;
  totalQuestions: number;
  /** 진단 시작 — 전체(all) 또는 특정 영역 */
  onStart: (area: DiagnosticArea | "all") => void;
  loading?: boolean;
}

export default function DiagnosisLanding({
  countsByArea,
  totalQuestions,
  onStart,
  loading = false,
}: DiagnosisLandingProps) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <InlineNotification
        kind="info"
        title="진단평가란?"
        description={
          <span>
            교육공학 아카이브의 <strong>통계방법 · 연구방법 · 핵심개념</strong>을 객관식으로 진단해
            <strong> 논문 작성 준비도</strong>와 <strong>연구 분석 준비도</strong>를 점수로 보여드립니다.
            틀린 문항의 개념은 아카이브로 바로 연결되어 약점을 보완할 수 있습니다.
          </span>
        }
      />

      {/* 전체 진단 시작 카드 */}
      <Card className="mt-6 overflow-hidden rounded-2xl border-l-4 border-l-primary shadow-sm">
        <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">전체 진단 시작</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                세 영역을 모두 진단하고 두 가지 준비도를 종합 리포트로 받아보세요.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                총 {loading ? "…" : totalQuestions}문항 · 약 {loading ? "…" : Math.max(3, Math.round(totalQuestions * 0.5))}분 소요
              </p>
            </div>
          </div>
          <Button
            size="lg"
            onClick={() => onStart("all")}
            disabled={loading || totalQuestions === 0}
            className="shrink-0"
          >
            전체 진단 시작
            <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
          </Button>
        </CardContent>
      </Card>

      {/* 영역별 선택 진단 */}
      <div className="mt-8">
        <h3 className="mb-1 flex items-center gap-2 text-base font-semibold tracking-tight">
          <ClipboardCheck className="h-4 w-4 text-primary" aria-hidden />
          영역만 골라 진단하기
        </h3>
        <p className="mb-4 text-xs text-muted-foreground">
          특정 영역만 빠르게 점검하고 싶다면 아래에서 선택하세요.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {DIAGNOSTIC_AREA_ORDER.map((area) => {
            const count = countsByArea[area] ?? 0;
            return (
              <button
                key={area}
                type="button"
                onClick={() => onStart(area)}
                disabled={loading || count === 0}
                className="group h-full rounded-2xl border bg-card p-5 text-left shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <Badge
                    variant="outline"
                    className={cn("text-[11px]", DIAGNOSTIC_AREA_COLORS[area])}
                  >
                    {DIAGNOSTIC_AREA_LABELS[area]}
                  </Badge>
                  <span className="text-sm font-semibold tabular-nums text-muted-foreground/80">
                    {loading ? "…" : `${count}문항`}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {DIAGNOSTIC_AREA_DESCRIPTIONS[area]}
                </p>
                <div className="mt-3 flex items-center gap-1 text-sm font-medium text-primary">
                  이 영역 진단
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 학술 책임 고지 */}
      <div className="mt-10 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>
          본 진단은 학습 보조용 자기점검 도구입니다. 점수는 절대적 평가가 아니며, 연구 설계·통계
          분석의 최종 판단은 지도교수와 상의하시기 바랍니다.
        </p>
      </div>
    </div>
  );
}
