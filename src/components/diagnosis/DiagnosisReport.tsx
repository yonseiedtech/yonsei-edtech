"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  RotateCcw,
  Trophy,
  PenLine,
  BarChart3,
  ArrowRight,
  Lightbulb,
  AlertTriangle,
  Brain,
  Layers,
  Check,
  ChevronDown,
  Loader2,
  Sparkles,
  ListChecks,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { flashcardsApi } from "@/lib/bkend";
import type { WrongCardSeed } from "@/types";
import PeerComparison, {
  type PeerStatsPayload,
} from "@/components/diagnosis/PeerComparison";
import {
  COGNITIVE_LEVEL_COLORS,
  COGNITIVE_LEVEL_DESCRIPTIONS,
  COGNITIVE_LEVEL_LABELS,
  COGNITIVE_LEVEL_ORDER,
  DIAGNOSTIC_AREA_COLORS,
  DIAGNOSTIC_AREA_LABELS,
  DIAGNOSTIC_AREA_ORDER,
  areaScorePercent,
  type AreaScore,
  type CognitiveLevel,
  type CognitiveScore,
  type DiagnosticArea,
} from "@/types";
import { cn } from "@/lib/utils";

/** 약점 개념 — 아카이브 링크용 (id 가 있으면 링크, 없으면 라벨만) */
export interface WeakConcept {
  id?: string;
  name: string;
}

/**
 * 전체 문항 리뷰 항목 — 진단 내부 전용(flashcard.ts 무접촉). 채점 결과·내 답·정답·해설을 담는다.
 * page.tsx 의 handleComplete 채점 루프에서 수집해 전달한다.
 */
export interface ReviewItem {
  questionId: string;
  /** 문항 본문(질문) */
  front: string;
  /** passage 등 본문 앞 지문(선택) */
  frontHint?: string;
  /** 내가 고른 답(사람이 읽을 텍스트). 미응답이면 빈 문자열. */
  myAnswerText: string;
  /** 정답 텍스트 */
  answerText: string;
  /** 해설(선택) */
  explanation?: string;
  /** 채점 결과 — 맞았는지 */
  correct: boolean;
  area: DiagnosticArea;
}

interface DiagnosisReportProps {
  areaScores: Partial<Record<DiagnosticArea, AreaScore>>;
  /** 인지수준(Bloom)별 정답률 — 태깅된 문항만 집계. 비어 있으면 카드 숨김. */
  cognitiveScores?: Partial<Record<CognitiveLevel, CognitiveScore>>;
  paperReadiness: number;
  analysisReadiness: number;
  weakConcepts: WeakConcept[];
  /** 이번 회차 오답 — 암기카드 저장 소재. 비어 있으면 복습 카드 섹션 숨김. */
  wrongItems?: WrongCardSeed[];
  /** 이번 회차 전 문항 리뷰(맞은 문항 포함) — 내 답·정답·해설. 비어 있으면 전체 리뷰 섹션 숨김. */
  reviewItems?: ReviewItem[];
  /** 전체 풀에서 아직 한 번도 맞추지 못한 문항 수 — 추가 평가 유도(0 이면 유도 숨김). */
  remainingQuestions?: number;
  /** 로그인 사용자 id — 없으면 암기카드 저장 버튼 비활성. */
  userId?: string | null;
  onRetry: () => void;
  /** "남은 문항 더 풀기" CTA — 미지정 시 onRetry 로 폴백. */
  onRetryMore?: () => void;
  /** 결과 저장 상태 표시 (선택) */
  saveState?: "idle" | "saving" | "saved" | "error";
  /**
   * 익명 동료 분포(피어 비교, M4). 미지정·null 이면 비교 섹션 숨김(회귀 없음).
   * 개별 회원 식별 정보는 포함하지 않는 집계만.
   */
  peerStats?: PeerStatsPayload | null;
  /** 동료 분포 로딩 중 표시 */
  peerLoading?: boolean;
}

/** 준비도 수준 라벨·색상 */
function readinessLevel(pct: number): { label: string; color: string; ring: string } {
  if (pct >= 80) return { label: "우수", color: "text-emerald-600 dark:text-emerald-400", ring: "stroke-emerald-500" };
  if (pct >= 60) return { label: "양호", color: "text-sky-600 dark:text-sky-400", ring: "stroke-sky-500" };
  if (pct >= 40) return { label: "보통", color: "text-amber-600 dark:text-amber-400", ring: "stroke-amber-500" };
  return { label: "보완 필요", color: "text-rose-600 dark:text-rose-400", ring: "stroke-rose-500" };
}

/** 원형 게이지 (SVG) */
function ReadinessGauge({
  label,
  pct,
  icon: Icon,
  hint,
}: {
  label: string;
  pct: number;
  icon: typeof PenLine;
  hint: string;
}) {
  const level = readinessLevel(pct);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="flex flex-col items-center py-6 text-center">
        <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <Icon className="h-4 w-4" aria-hidden />
          {label}
        </div>
        <div className="relative mt-3 h-28 w-28">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="fill-none stroke-muted"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              className={cn("fill-none transition-all duration-700", level.ring)}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-2xl font-bold tabular-nums", level.color)}>{pct}</span>
            <span className="text-[10px] text-muted-foreground">/ 100</span>
          </div>
        </div>
        <Badge variant="outline" className={cn("mt-3", level.color)}>
          {level.label}
        </Badge>
        <p className="mt-2 max-w-[14rem] text-xs leading-relaxed text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

export default function DiagnosisReport({
  areaScores,
  cognitiveScores = {},
  paperReadiness,
  analysisReadiness,
  weakConcepts,
  wrongItems = [],
  reviewItems = [],
  remainingQuestions = 0,
  userId = null,
  onRetry,
  onRetryMore,
  saveState = "idle",
  peerStats = null,
  peerLoading = false,
}: DiagnosisReportProps) {
  // 오답 카드의 "내 답" 표시용 — questionId → 내가 고른 답 텍스트(전체 리뷰에서 도출)
  const myAnswerById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of reviewItems) map[r.questionId] = r.myAnswerText;
    return map;
  }, [reviewItems]);

  // 인지수준 집계가 1개 이상 있을 때만 인지수준 카드 노출
  const hasCognitive = COGNITIVE_LEVEL_ORDER.some(
    (lv) => (cognitiveScores[lv]?.total ?? 0) > 0,
  );
  const minReadiness = Math.min(paperReadiness, analysisReadiness);
  // 준비도 100% 미만 + 남은 문항이 있으면 추가 평가 유도
  const showNudge = remainingQuestions > 0 && minReadiness < 100;
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Trophy className="h-6 w-6" aria-hidden />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">진단 결과 리포트</h2>
          <p className="text-sm text-muted-foreground">
            영역별 정답률과 두 가지 준비도를 확인하세요.
          </p>
        </div>
      </div>

      {/* 두 준비도 게이지 — 준비도 = 영역 전체 문항 풀 대비 맞춘 비율(누적) */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ReadinessGauge
          label="논문 작성 준비도"
          pct={paperReadiness}
          icon={PenLine}
          hint="핵심개념·연구방법 전체 문항 중 맞춘 비율 — 더 풀어 맞출수록 올라갑니다."
        />
        <ReadinessGauge
          label="연구 분석 준비도"
          pct={analysisReadiness}
          icon={BarChart3}
          hint="통계방법·연구방법 전체 문항 중 맞춘 비율 — 더 풀어 맞출수록 올라갑니다."
        />
      </div>

      {/* 추가 평가 유도 — 준비도 100% 미만일 때 절제된 애니메이션으로 노출 */}
      {showNudge && (
        <button
          type="button"
          onClick={onRetryMore ?? onRetry}
          className="animate-in fade-in slide-in-from-bottom-1 duration-500 mt-4 flex w-full items-center gap-3 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-violet-100/50 p-4 text-left transition-all hover:border-violet-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:ring-offset-2 dark:border-violet-800/50 dark:from-violet-950/30 dark:to-violet-900/20"
        >
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-200/50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-xl bg-violet-300/40 opacity-60 dark:bg-violet-700/30" />
            <Sparkles className="relative h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-violet-900 dark:text-violet-200">
              남은 {remainingQuestions}문항을 더 풀어 준비도를 높여보세요
            </span>
            <span className="mt-0.5 block text-xs text-violet-700/80 dark:text-violet-300/70">
              아직 맞추지 못한 문항을 추가로 진단하면 영역 숙련도가 올라갑니다.
            </span>
          </span>
          <ArrowRight className="h-5 w-5 shrink-0 text-violet-700 dark:text-violet-300" aria-hidden />
        </button>
      )}

      {/* 영역별 정답률 막대 */}
      <Card className="mt-6 rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">영역별 정답률</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          {DIAGNOSTIC_AREA_ORDER.map((area) => {
            const score = areaScores[area];
            if (!score || score.total === 0) return null;
            const pct = areaScorePercent(score);
            return (
              <div key={area}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn("text-[10px]", DIAGNOSTIC_AREA_COLORS[area])}
                    >
                      {DIAGNOSTIC_AREA_LABELS[area]}
                    </Badge>
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {score.correct} / {score.total}
                    <span className="ml-2 font-semibold text-foreground">{pct}%</span>
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      pct >= 80
                        ? "bg-emerald-500"
                        : pct >= 60
                          ? "bg-sky-500"
                          : pct >= 40
                            ? "bg-amber-500"
                            : "bg-rose-500",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* 피어 비교 — 익명 동료 분포 대비 내 위치 (M4). peerStats 미지정/로딩 시에만 노출 판단 */}
      {(peerStats || peerLoading) && (
        <PeerComparison
          areaScores={areaScores}
          paperReadiness={paperReadiness}
          analysisReadiness={analysisReadiness}
          peer={peerStats}
          loading={peerLoading}
        />
      )}

      {/* 인지수준(Bloom)별 정답률 — 태깅 문항이 있을 때만 */}
      {hasCognitive && (
        <Card className="mt-6 rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-4 w-4 text-primary" aria-hidden />
              인지수준별 정답률
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">
              문항이 요구하는 사고 수준(기억·이해·적용·분석)별 정답률입니다. 낮은 정답률 수준은 그
              유형의 학습이 더 필요함을 시사합니다.
            </p>
            {COGNITIVE_LEVEL_ORDER.map((level) => {
              const score = cognitiveScores[level];
              if (!score || score.total === 0) return null;
              const pct = areaScorePercent(score);
              return (
                <div key={level}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn("text-[10px]", COGNITIVE_LEVEL_COLORS[level])}
                      >
                        {COGNITIVE_LEVEL_LABELS[level]}
                      </Badge>
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        {COGNITIVE_LEVEL_DESCRIPTIONS[level]}
                      </span>
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {score.correct} / {score.total}
                      <span className="ml-2 font-semibold text-foreground">{pct}%</span>
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700",
                        pct >= 80
                          ? "bg-emerald-500"
                          : pct >= 60
                            ? "bg-sky-500"
                            : pct >= 40
                              ? "bg-amber-500"
                              : "bg-rose-500",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* 약점 개념 → 아카이브 연결 */}
      {weakConcepts.length > 0 && (
        <Card className="mt-6 rounded-2xl border-amber-200 bg-amber-50/40 shadow-sm dark:border-amber-800 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4 text-amber-500" aria-hidden />
              보완하면 좋은 개념 ({weakConcepts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              틀린 문항과 연결된 개념입니다. 아카이브에서 정의·관련 변인·측정도구를 확인해 보세요.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {weakConcepts.map((c, i) =>
                c.id ? (
                  <Link key={c.id} href={`/archive/concept/${c.id}`}>
                    <Badge
                      variant="outline"
                      className="cursor-pointer gap-1 border-violet-200 bg-violet-50 text-violet-800 transition-shadow hover:shadow-sm dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300"
                    >
                      {c.name}
                      <ArrowRight className="h-3 w-3" aria-hidden />
                    </Badge>
                  </Link>
                ) : (
                  <Badge
                    key={`${c.name}-${i}`}
                    variant="outline"
                    className="border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300"
                  >
                    {c.name}
                  </Badge>
                ),
              )}
            </div>
            <div className="mt-4">
              <Link href="/archive">
                <Button variant="outline" size="sm">
                  아카이브 전체 둘러보기
                  <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 틀린 문항 복습 카드 — 오답을 암기카드로 저장 */}
      {wrongItems.length > 0 && (
        <WrongCardsSection
          wrongItems={wrongItems}
          userId={userId}
          myAnswerById={myAnswerById}
        />
      )}

      {/* 전체 문항 리뷰 — 맞은 문항 포함 내 답·정답·해설(틀린 문항 우선·강조, 맞은 문항 접기 기본) */}
      {reviewItems.length > 0 && <FullReviewSection reviewItems={reviewItems} />}

      {/* 저장 상태 + 재진단 */}
      <div className="mt-8 flex flex-col items-center gap-3">
        {saveState === "saved" && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400">
            결과가 저장되었습니다. 마이페이지에서 다시 확인할 수 있습니다.
          </p>
        )}
        {saveState === "error" && (
          <p className="flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            결과 저장에 실패했습니다. (진단 점수는 위에 그대로 표시됩니다)
          </p>
        )}
        <Button onClick={onRetry} variant="default" size="lg">
          <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden />
          다시 진단하기
        </Button>
      </div>
    </div>
  );
}

/** 카드별 저장 상태 */
type CardSaveState = "idle" | "saving" | "saved" | "error";

/**
 * 틀린 문항 복습 카드 섹션 — 오답을 암기카드(flashcards)로 저장.
 * 개별/전체 저장 버튼 + 정답·해설 접기. 비로그인 시 버튼 비활성.
 * 멱등 저장(flashcardsApi.saveFromWrong) — 같은 문항 재저장 시 복습 진척 보존.
 */
function WrongCardsSection({
  wrongItems,
  userId,
  myAnswerById,
}: {
  wrongItems: WrongCardSeed[];
  userId: string | null;
  /** questionId → 내가 고른 답 텍스트(오답 대비 표시용) */
  myAnswerById: Record<string, string>;
}) {
  const [stateById, setStateById] = useState<Record<string, CardSaveState>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const loggedIn = !!userId;

  const saveOne = async (seed: WrongCardSeed) => {
    if (!userId) return;
    setStateById((p) => ({ ...p, [seed.questionId]: "saving" }));
    try {
      await flashcardsApi.saveFromWrong(userId, seed);
      setStateById((p) => ({ ...p, [seed.questionId]: "saved" }));
    } catch (err) {
      console.error("[flashcard] save failed", err);
      setStateById((p) => ({ ...p, [seed.questionId]: "error" }));
      toast.error("암기카드 저장에 실패했습니다.");
    }
  };

  const saveAll = async () => {
    if (!userId || savingAll) return;
    setSavingAll(true);
    const targets = wrongItems.filter((s) => stateById[s.questionId] !== "saved");
    setStateById((p) => {
      const next = { ...p };
      for (const s of targets) next[s.questionId] = "saving";
      return next;
    });
    const results = await Promise.allSettled(
      targets.map((s) => flashcardsApi.saveFromWrong(userId, s)),
    );
    setStateById((p) => {
      const next = { ...p };
      results.forEach((r, i) => {
        next[targets[i].questionId] = r.status === "fulfilled" ? "saved" : "error";
      });
      return next;
    });
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) toast.error(`${failed}개 카드 저장에 실패했습니다.`);
    else toast.success(`${targets.length}개 카드를 저장했어요.`);
    setSavingAll(false);
  };

  const savedCount = wrongItems.filter((s) => stateById[s.questionId] === "saved").length;
  const allSaved = savedCount === wrongItems.length;

  return (
    <Card className="mt-6 rounded-2xl border-sky-200 bg-sky-50/40 shadow-sm dark:border-sky-800 dark:bg-sky-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="h-4 w-4 text-sky-500" aria-hidden />
          틀린 문항 복습 카드 ({wrongItems.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            틀린 문항을 암기카드로 저장하면 <strong>내 암기카드</strong>에서 뒤집기·간격반복으로
            복습할 수 있어요.
          </p>
          <Button
            size="sm"
            onClick={saveAll}
            disabled={!loggedIn || savingAll || allSaved}
            className="shrink-0"
          >
            {savingAll ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
            ) : allSaved ? (
              <Check className="mr-1.5 h-4 w-4" aria-hidden />
            ) : (
              <Layers className="mr-1.5 h-4 w-4" aria-hidden />
            )}
            {allSaved ? "전체 저장됨" : "전체 저장"}
          </Button>
        </div>

        {!loggedIn && (
          <p className="mb-3 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            로그인하면 암기카드로 저장할 수 있어요.
          </p>
        )}

        <ul className="space-y-2">
          {wrongItems.map((seed) => {
            const st = stateById[seed.questionId] ?? "idle";
            const open = openId === seed.questionId;
            return (
              <li
                key={seed.questionId}
                className="rounded-xl border border-border bg-card/70 p-3"
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-relaxed line-clamp-2">
                      {seed.front || "(문항 본문 없음)"}
                    </p>
                    {seed.conceptName && (
                      <Badge
                        variant="outline"
                        className="mt-1.5 border-violet-200 bg-violet-50 text-[10px] text-violet-800 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300"
                      >
                        {seed.conceptName}
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={st === "saved" ? "secondary" : "outline"}
                    onClick={() => saveOne(seed)}
                    disabled={!loggedIn || st === "saving" || st === "saved"}
                    className="shrink-0"
                  >
                    {st === "saving" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : st === "saved" ? (
                      <>
                        <Check className="mr-1 h-3.5 w-3.5" aria-hidden />
                        저장됨
                      </>
                    ) : st === "error" ? (
                      "재시도"
                    ) : (
                      "저장"
                    )}
                  </Button>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : seed.questionId)}
                  aria-expanded={open}
                  className="mt-2 flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  정답·해설 {open ? "접기" : "보기"}
                  <ChevronDown
                    className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
                    aria-hidden
                  />
                </button>
                {open && (
                  <div className="mt-2 rounded-lg border border-border bg-muted/40 p-3">
                    {seed.frontHint && (
                      <p className="mb-2 whitespace-pre-line border-l-2 border-muted-foreground/30 pl-2 text-xs text-muted-foreground">
                        {seed.frontHint}
                      </p>
                    )}
                    {myAnswerById[seed.questionId] && (
                      <p className="mb-2 whitespace-pre-line rounded-md bg-rose-50 px-2 py-1.5 text-sm leading-relaxed text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                        내 답 (오답): {myAnswerById[seed.questionId]}
                      </p>
                    )}
                    <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                      {seed.back || "(정답 정보 없음)"}
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {savedCount > 0 && (
          <div className="mt-4">
            <Link href="/flashcards">
              <Button variant="outline" size="sm">
                저장한 카드 학습하기
                <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 전체 문항 리뷰 — 맞은 문항 포함 모든 문항의 내 답·정답·해설을 확인.
 * 틀린 문항은 펼친 상태로 강조, 맞은 문항은 접어 두고 토글로 노출(기본 숨김).
 * 채점·전달 데이터만 사용 — 별도 저장/네트워크 없음.
 */
function FullReviewSection({ reviewItems }: { reviewItems: ReviewItem[] }) {
  const [showCorrect, setShowCorrect] = useState(false);
  const wrong = reviewItems.filter((r) => !r.correct);
  const correct = reviewItems.filter((r) => r.correct);
  const visible = showCorrect ? reviewItems : wrong;

  return (
    <Card className="mt-6 rounded-2xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListChecks className="h-4 w-4 text-primary" aria-hidden />
          전체 문항 보기 ({reviewItems.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            내가 고른 답과 정답·해설을 한눈에 비교하세요. 틀린 문항을 먼저 보여줍니다.
          </p>
          {correct.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCorrect((v) => !v)}
              className="shrink-0"
            >
              {showCorrect ? "맞은 문항 접기" : `맞은 문항 보기 (${correct.length})`}
              <ChevronDown
                className={cn("ml-1 h-3.5 w-3.5 transition-transform", showCorrect && "rotate-180")}
                aria-hidden
              />
            </Button>
          )}
        </div>

        {visible.length === 0 ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300">
            틀린 문항이 없습니다. 모두 정답이에요!
          </p>
        ) : (
          <ul className="space-y-2">
            {visible.map((item, i) => (
              <li
                key={item.questionId}
                className={cn(
                  "rounded-xl border p-3",
                  item.correct
                    ? "border-border bg-card/70"
                    : "border-rose-200 bg-rose-50/40 dark:border-rose-800/60 dark:bg-rose-950/20",
                )}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                      item.correct
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
                    )}
                    aria-hidden
                  >
                    {item.correct ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-relaxed">
                      <span className="mr-1 text-muted-foreground tabular-nums">{i + 1}.</span>
                      {item.front || "(문항 본문 없음)"}
                    </p>
                    {item.frontHint && (
                      <p className="mt-1.5 whitespace-pre-line border-l-2 border-muted-foreground/30 pl-2 text-xs text-muted-foreground">
                        {item.frontHint}
                      </p>
                    )}
                    <div className="mt-2 space-y-1.5">
                      <p
                        className={cn(
                          "whitespace-pre-line rounded-md px-2 py-1.5 text-sm leading-relaxed",
                          item.correct
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300",
                        )}
                      >
                        내 답{item.correct ? " (정답)" : " (오답)"}: {item.myAnswerText || "(미응답)"}
                      </p>
                      {!item.correct && (
                        <p className="whitespace-pre-line rounded-md bg-emerald-50 px-2 py-1.5 text-sm leading-relaxed text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                          정답: {item.answerText || "(정답 정보 없음)"}
                        </p>
                      )}
                      {item.explanation && (
                        <p className="whitespace-pre-line px-2 text-xs leading-relaxed text-muted-foreground">
                          {item.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
