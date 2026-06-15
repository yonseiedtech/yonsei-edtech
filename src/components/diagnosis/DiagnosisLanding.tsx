"use client";

import { useMemo, useState } from "react";
import {
  ClipboardCheck,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import InlineNotification from "@/components/ui/inline-notification";
import {
  DIAGNOSTIC_AREA_COLORS,
  DIAGNOSTIC_AREA_DESCRIPTIONS,
  DIAGNOSTIC_AREA_LABELS,
  DIAGNOSTIC_AREA_ORDER,
  DIAGNOSTIC_QUESTION_TYPE_LABELS,
  DIAGNOSTIC_QUESTION_TYPE_ORDER,
  type DiagnosticArea,
  type DiagnosticQuestionType,
} from "@/types";
import { cn } from "@/lib/utils";
import DiagnosisHistorySection from "./DiagnosisHistorySection";

/** 개인화 진단 설정 — 사용자가 직접 구성한 진단 조건 */
export interface CustomDiagnosisConfig {
  /** 선택한 영역(1개 이상). 빈 배열이면 호출부에서 전체 영역으로 폴백. */
  areas: DiagnosticArea[];
  /** 선택한 문항 유형. 빈 배열이면 유형 제한 없음(모든 유형). */
  types: DiagnosticQuestionType[];
  /** 출제 문항 수 */
  count: number;
}

interface DiagnosisLandingProps {
  /** 영역별 사용 가능한 문항 수 */
  countsByArea: Record<DiagnosticArea, number>;
  /** 유형별 사용 가능한 문항 수 (개인화 빌더 칩) */
  countsByType: Partial<Record<DiagnosticQuestionType, number>>;
  totalQuestions: number;
  /** 진단 시작 — 전체(all) 또는 특정 영역 */
  onStart: (area: DiagnosticArea | "all") => void;
  /** 개인화 진단 시작 — 사용자 구성 설정 */
  onStartCustom: (config: CustomDiagnosisConfig) => void;
  loading?: boolean;
  /** 로그인 사용자 id — 있으면 하단에 진단 이력·약점 그래프 표시 */
  userId?: string | null;
}

/** 문항 수 프리셋 (슬라이더 대신 칩 — 신규 컴포넌트 의존 회피) */
const COUNT_PRESETS = [5, 10, 15, 20];

export default function DiagnosisLanding({
  countsByArea,
  countsByType,
  totalQuestions,
  onStart,
  onStartCustom,
  loading = false,
  userId = null,
}: DiagnosisLandingProps) {
  // 개인화 빌더 상태
  const [customOpen, setCustomOpen] = useState(false);
  const [selectedAreas, setSelectedAreas] = useState<DiagnosticArea[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<DiagnosticQuestionType[]>([]);
  const [count, setCount] = useState(10);

  // 선택 설정에 맞는 가용 문항 수 — 최소 1영역 강제(빈 선택은 전체 영역으로 간주).
  const effectiveAreas = selectedAreas.length > 0 ? selectedAreas : DIAGNOSTIC_AREA_ORDER;
  const typesWithQuestions = useMemo(
    () => DIAGNOSTIC_QUESTION_TYPE_ORDER.filter((t) => (countsByType[t] ?? 0) > 0),
    [countsByType],
  );

  const toggleArea = (area: DiagnosticArea) => {
    setSelectedAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area],
    );
  };
  const toggleType = (type: DiagnosticQuestionType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const handleCustomStart = () => {
    onStartCustom({
      areas: effectiveAreas,
      types: selectedTypes,
      count,
    });
  };

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

      {/* 개인화 진단 빌더 */}
      <Card className="mt-4 overflow-hidden rounded-2xl shadow-sm">
        <button
          type="button"
          onClick={() => setCustomOpen((o) => !o)}
          aria-expanded={customOpen}
          className="flex w-full items-center justify-between gap-3 px-6 py-5 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
        >
          <span className="flex items-start gap-4">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <SlidersHorizontal className="h-6 w-6" aria-hidden />
            </span>
            <span>
              <span className="block text-lg font-semibold tracking-tight">개인화 진단 만들기</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">
                원하는 영역과 문항 유형, 문항 수를 직접 골라 진단을 구성하세요.
              </span>
            </span>
          </span>
          <ChevronDown
            className={cn(
              "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
              customOpen && "rotate-180",
            )}
            aria-hidden
          />
        </button>

        {customOpen && (
          <CardContent className="border-t pt-5">
            {/* 영역 다중 선택 */}
            <div>
              <p className="mb-1 text-sm font-medium">진단 영역</p>
              <p className="mb-2.5 text-xs text-muted-foreground">
                원하는 영역을 선택하세요. 선택하지 않으면 세 영역을 모두 포함합니다.
              </p>
              <div className="flex flex-wrap gap-2">
                {DIAGNOSTIC_AREA_ORDER.map((area) => {
                  const active = selectedAreas.includes(area);
                  const cnt = countsByArea[area] ?? 0;
                  return (
                    <button
                      key={area}
                      type="button"
                      onClick={() => toggleArea(area)}
                      disabled={loading || cnt === 0}
                      aria-pressed={active}
                      className={cn(
                        "rounded-full border px-3.5 py-1.5 text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40",
                        active
                          ? "border-primary bg-primary/10 font-medium text-primary shadow-sm"
                          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-muted/40",
                      )}
                    >
                      {DIAGNOSTIC_AREA_LABELS[area]}
                      <span className="ml-1.5 text-[11px] tabular-nums opacity-70">{cnt}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 문항 유형 선택 */}
            <div className="mt-5">
              <p className="mb-1 text-sm font-medium">문항 유형</p>
              <p className="mb-2.5 text-xs text-muted-foreground">
                특정 유형만 풀고 싶다면 선택하세요. 선택하지 않으면 모든 유형이 섞여 출제됩니다.
              </p>
              <div className="flex flex-wrap gap-2">
                {typesWithQuestions.map((type) => {
                  const active = selectedTypes.includes(type);
                  const cnt = countsByType[type] ?? 0;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleType(type)}
                      disabled={loading}
                      aria-pressed={active}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40",
                        active
                          ? "border-violet-500 bg-violet-500/10 font-medium text-violet-700 shadow-sm dark:text-violet-300"
                          : "border-border bg-card text-muted-foreground hover:border-violet-400/50 hover:bg-muted/40",
                      )}
                    >
                      {DIAGNOSTIC_QUESTION_TYPE_LABELS[type]}
                      <span className="ml-1.5 tabular-nums opacity-70">{cnt}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 문항 수 */}
            <div className="mt-5">
              <p className="mb-2.5 text-sm font-medium">문항 수</p>
              <div className="flex flex-wrap gap-2">
                {COUNT_PRESETS.map((preset) => {
                  const active = count === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCount(preset)}
                      disabled={loading}
                      aria-pressed={active}
                      className={cn(
                        "min-w-[3.5rem] rounded-lg border px-3 py-1.5 text-sm tabular-nums transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40",
                        active
                          ? "border-primary bg-primary/10 font-semibold text-primary shadow-sm"
                          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-muted/40",
                      )}
                    >
                      {preset}문항
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 시작 버튼 */}
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                선택 영역{" "}
                <strong className="text-foreground">
                  {selectedAreas.length > 0
                    ? selectedAreas.map((a) => DIAGNOSTIC_AREA_LABELS[a]).join(" · ")
                    : "전체"}
                </strong>{" "}
                · 유형{" "}
                <strong className="text-foreground">
                  {selectedTypes.length > 0
                    ? selectedTypes.map((t) => DIAGNOSTIC_QUESTION_TYPE_LABELS[t]).join(" · ")
                    : "전체"}
                </strong>{" "}
                · 최대 <strong className="text-foreground">{count}문항</strong>
              </p>
              <Button onClick={handleCustomStart} disabled={loading || totalQuestions === 0}>
                개인화 진단 시작
                <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              </Button>
            </div>
          </CardContent>
        )}
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
            const areaCount = countsByArea[area] ?? 0;
            return (
              <button
                key={area}
                type="button"
                onClick={() => onStart(area)}
                disabled={loading || areaCount === 0}
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
                    {loading ? "…" : `${areaCount}문항`}
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

      {/* 진단 이력 + 약점 영역 그래프 (로그인 사용자 전용) */}
      {userId && <DiagnosisHistorySection userId={userId} />}
    </div>
  );
}
