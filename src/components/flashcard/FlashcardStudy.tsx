"use client";

/**
 * FlashcardStudy — 암기카드 학습 러너.
 *
 * - flashcardsApi.listByUser 로드 → 오늘 복습 대상(dueAt<=today) 우선, 신규(reviewCount===0), 나머지 순.
 *   정렬은 클라이언트(복합 인덱스 회피).
 * - 카드 1장: 앞면(front + area 배지 + frontHint) → 탭/스페이스로 뒤집기 → 뒷면(back + 개념 링크).
 * - 뒷면 노출 후 [맞음]/[틀림] → flashcard-srs.nextReview → flashcardsApi.update → 다음 카드.
 * - 상단 진행률 바 + "오늘 복습 N장 / 전체 M장".
 * - 빈 상태: 진단평가 CTA.
 * - 세션 중 1회 streakEventsApi.add(flashcard-study, refId=todayYmdKst) — 1일 1회 멱등 +2.
 *
 * 채점/준비도 로직과 독립 — 암기카드 자체 복습 메타만 갱신한다.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  ArrowRight,
  Check,
  X,
  RotateCw,
  Sparkles,
  PartyPopper,
  BookOpen,
  AlertCircle,
  Variable,
  Ruler,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/features/auth/auth-store";
import { flashcardsApi, streakEventsApi } from "@/lib/bkend";
import { nextReview, isDueToday } from "@/lib/flashcard-srs";
import { todayYmdKst } from "@/lib/dday";
import {
  DIAGNOSTIC_AREA_COLORS,
  DIAGNOSTIC_AREA_LABELS,
} from "@/types";
import type { Flashcard, FlashcardSource } from "@/types/flashcard";
import { cn } from "@/lib/utils";

/** 출처 배지 메타 — concept(교육공학 개념) / diagnostic_wrong(진단 오답) 시각 구분. */
const SOURCE_META: Record<
  FlashcardSource,
  { label: string; icon: typeof BookOpen; className: string }
> = {
  concept: {
    label: "교육공학 개념",
    icon: BookOpen,
    className:
      "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300",
  },
  diagnostic_wrong: {
    label: "진단 오답",
    icon: AlertCircle,
    className:
      "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
  },
  foundation_term: {
    label: "기초 용어",
    icon: BookOpen,
    className:
      "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-300",
  },
  variable: {
    label: "변인",
    icon: Variable,
    className:
      "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300",
  },
  measurement: {
    label: "측정도구",
    icon: Ruler,
    className:
      "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
  },
};

/** 출처 필터 — 클라이언트 필터(복합 인덱스 회피). */
type SourceFilter = "all" | FlashcardSource;
const FILTER_TABS: { value: SourceFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "diagnostic_wrong", label: "진단 오답" },
  { value: "concept", label: "개념" },
  { value: "foundation_term", label: "기초 용어" },
  { value: "variable", label: "변인" },
  { value: "measurement", label: "측정도구" },
];

/** 학습 순서 정렬 — 오늘 복습 대상 → 신규(미학습) → 나머지(dueAt 오름차순). */
function sortForStudy(cards: Flashcard[]): Flashcard[] {
  return [...cards].sort((a, b) => {
    const aDue = isDueToday(a) ? 0 : 1;
    const bDue = isDueToday(b) ? 0 : 1;
    if (aDue !== bDue) return aDue - bDue;
    const aNew = (a.reviewCount ?? 0) === 0 ? 0 : 1;
    const bNew = (b.reviewCount ?? 0) === 0 ? 0 : 1;
    if (aNew !== bNew) return aNew - bNew;
    return (a.dueAt ?? "").localeCompare(b.dueAt ?? "");
  });
}

export default function FlashcardStudy() {
  const { user } = useAuthStore();
  const userId = user?.id;

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [filter, setFilter] = useState<SourceFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [grading, setGrading] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [done, setDone] = useState(false);
  // 세션 1회 잔디 가산 가드(중복 add 방지 — refId=ymd 라 서버도 멱등이지만 호출 절약)
  const streakAddedRef = useRef(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await flashcardsApi.listByUser(userId);
        if (!cancelled) setCards(sortForStudy(res.data ?? []));
      } catch (err) {
        console.error("[flashcard] load failed", err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // 출처별 카드 수(탭 카운트 표시용) — 전체 로드분 기준.
  const sourceCounts = useMemo(() => {
    let dx = 0;
    let concept = 0;
    let foundationTerm = 0;
    let variable = 0;
    let measurement = 0;
    for (const c of cards) {
      if (c.source === "concept") concept += 1;
      else if (c.source === "foundation_term") foundationTerm += 1;
      else if (c.source === "variable") variable += 1;
      else if (c.source === "measurement") measurement += 1;
      else dx += 1;
    }
    return {
      all: cards.length,
      diagnostic_wrong: dx,
      concept,
      foundation_term: foundationTerm,
      variable,
      measurement,
    };
  }, [cards]);

  // 선택된 출처로 필터링한 학습 대상(복합 인덱스 회피 — 클라이언트 필터).
  const studyCards = useMemo(
    () => (filter === "all" ? cards : cards.filter((c) => c.source === filter)),
    [cards, filter],
  );

  const total = studyCards.length;
  const dueCount = useMemo(
    () => studyCards.filter((c) => isDueToday(c)).length,
    [studyCards],
  );
  const current = studyCards[index];
  const progress = total > 0 ? Math.round((reviewedCount / total) * 100) : 0;

  // 필터 변경 시 학습 세션 초기화(인덱스·뒤집기·완료·복습수 리셋).
  const changeFilter = (next: SourceFilter) => {
    if (next === filter) return;
    setFilter(next);
    setIndex(0);
    setFlipped(false);
    setDone(false);
    setReviewedCount(0);
  };

  // 세션 시작(카드 1장 이상 로드) 시 잔디 1회 가산 — refId=오늘(KST) 1일 1회 멱등.
  useEffect(() => {
    if (!userId || streakAddedRef.current || total === 0) return;
    streakAddedRef.current = true;
    streakEventsApi
      .add({ userId, type: "flashcard-study", refId: todayYmdKst(), points: 2 })
      .catch((err) => console.error("[flashcard] streak add failed", err));
  }, [userId, total]);

  const grade = async (correct: boolean) => {
    if (!current || !userId || grading) return;
    setGrading(true);
    const meta = nextReview(current, correct);
    try {
      await flashcardsApi.update(current.id, meta as unknown as Record<string, unknown>);
    } catch (err) {
      console.error("[flashcard] update failed", err);
      // 실패해도 학습 흐름은 진행(다음 카드로) — 메타만 미반영.
    }
    const nextReviewed = reviewedCount + 1;
    setReviewedCount(nextReviewed);
    setFlipped(false);
    setGrading(false);
    if (index + 1 >= total) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
    }
  };

  // 키보드: 스페이스=뒤집기, 1/←=틀림, 2/→=맞음 (뒷면일 때)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done || !current) return;
      if (e.key === " ") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (flipped && (e.key === "1" || e.key === "ArrowLeft")) {
        e.preventDefault();
        void grade(false);
      } else if (flipped && (e.key === "2" || e.key === "ArrowRight")) {
        e.preventDefault();
        void grade(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped, current, done, grading, index, total]);

  // ── 로그인 안내 ──
  if (!userId) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <ClipboardCheck className="h-10 w-10 text-muted-foreground/40" aria-hidden />
          <p className="text-sm font-medium">로그인 후 이용할 수 있어요.</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            진단평가에서 틀린 문항을 암기카드로 저장하면 여기서 복습할 수 있습니다.
          </p>
          <Link href="/login">
            <Button variant="outline" size="sm">로그인</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-3 w-full rounded-full" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <div className="flex justify-center gap-3">
          <Skeleton className="h-10 w-28 rounded-md" />
          <Skeleton className="h-10 w-28 rounded-md" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="py-10 text-center text-sm text-muted-foreground" role="alert">
          암기카드를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </CardContent>
      </Card>
    );
  }

  // ── 빈 상태 ──
  if (total === 0) {
    return (
      <Card className="rounded-2xl border-dashed shadow-sm">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" aria-hidden />
          </div>
          <p className="text-sm font-medium">아직 저장한 암기카드가 없어요.</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            진단평가에서 틀린 문항을 암기카드로 저장하면 여기서 뒤집기·간격반복으로 복습할 수 있습니다.
          </p>
          <Link href="/diagnosis">
            <Button size="sm">
              진단평가로 새 카드 만들기
              <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // ── 세션 완료 ──
  if (done) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <PartyPopper className="h-6 w-6" aria-hidden />
          </div>
          <p className="text-sm font-semibold">오늘의 복습을 마쳤어요! ({reviewedCount}장)</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            맞춘 카드는 복습 간격이 늘어나고, 틀린 카드는 내일 다시 만나요.
          </p>
          <div className="mt-1 flex flex-wrap justify-center gap-2">
            <Link href="/diagnosis">
              <Button variant="outline" size="sm">
                진단평가 더 풀기
                <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              </Button>
            </Link>
            <Link href="/mypage">
              <Button variant="ghost" size="sm">마이페이지</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!current) return null;

  const distinctSources = [
    sourceCounts.diagnostic_wrong,
    sourceCounts.concept,
    sourceCounts.foundation_term,
    sourceCounts.variable,
    sourceCounts.measurement,
  ].filter((n) => n > 0).length;
  const showFilterTabs = distinctSources >= 2;

  return (
    <div>
      {/* 출처 필터 탭 — 두 출처가 모두 있을 때만 노출(클라이언트 필터) */}
      {showFilterTabs && (
        <div
          className="mb-4 flex flex-wrap gap-1.5"
          role="tablist"
          aria-label="암기카드 출처 필터"
        >
          {FILTER_TABS.map((tab) => {
            const active = filter === tab.value;
            const count = sourceCounts[tab.value];
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => changeFilter(tab.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                {tab.label}
                <span className="tabular-nums opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 진행률 */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span className="tabular-nums">
            {reviewedCount} / {total} 복습
          </span>
          <span className="tabular-nums">오늘 복습 대상 {dueCount}장</span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="복습 진행률"
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 카드 — 클릭/스페이스로 뒤집기 */}
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-pressed={flipped}
        aria-label={flipped ? "카드 앞면 보기" : "카드 뒤집어 정답 보기"}
        className="w-full text-left focus-visible:outline-none"
      >
        <Card
          className={cn(
            "min-h-[16rem] rounded-2xl shadow-sm transition-colors",
            flipped
              ? "border-sky-300 bg-sky-50/50 dark:border-sky-800 dark:bg-sky-950/20"
              : "hover:border-primary/40",
          )}
        >
          <CardContent className="flex min-h-[16rem] flex-col py-6">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {(() => {
                const meta = SOURCE_META[current.source] ?? SOURCE_META.diagnostic_wrong;
                const SourceIcon = meta.icon;
                return (
                  <Badge
                    variant="outline"
                    className={cn("gap-1 text-[10px]", meta.className)}
                  >
                    <SourceIcon className="h-3 w-3" aria-hidden />
                    {meta.label}
                  </Badge>
                );
              })()}
              {current.area && (
                <Badge
                  variant="outline"
                  className={cn("text-[10px]", DIAGNOSTIC_AREA_COLORS[current.area])}
                >
                  {DIAGNOSTIC_AREA_LABELS[current.area]}
                </Badge>
              )}
              <Badge variant="secondary" className="gap-1 text-[10px]">
                {flipped ? "정답" : "문제"}
              </Badge>
              {(current.reviewCount ?? 0) > 0 && (
                <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
                  복습 {current.reviewCount}회 · 연속 {current.streak ?? 0}
                </span>
              )}
            </div>

            {!flipped ? (
              <div className="flex flex-1 flex-col justify-center">
                <p className="whitespace-pre-line text-base font-semibold leading-relaxed sm:text-lg">
                  {current.front || "(문항 본문 없음)"}
                </p>
                {current.frontHint && (
                  <p className="mt-3 whitespace-pre-line border-l-2 border-muted-foreground/30 pl-3 text-xs text-muted-foreground">
                    {current.frontHint}
                  </p>
                )}
                <p className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
                  <RotateCw className="h-3.5 w-3.5" aria-hidden />
                  카드를 눌러 정답을 확인하세요 (스페이스)
                </p>
              </div>
            ) : (
              <div className="flex flex-1 flex-col justify-center">
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90 sm:text-base">
                  {current.back || "(정답 정보 없음)"}
                </p>
                {current.foundationTermId && (
                  <Link
                    href={`/archive/foundation-terms/${current.foundationTermId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-4 inline-flex w-fit items-center gap-1 text-xs font-medium text-violet-700 hover:underline dark:text-violet-300"
                  >
                    <BookOpen className="h-3 w-3" aria-hidden />
                    용어 정의 바로가기
                    <ArrowRight className="h-3 w-3" aria-hidden />
                  </Link>
                )}
                {current.conceptId && (
                  <Link
                    href={`/archive/concept/${current.conceptId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-4 inline-flex w-fit items-center gap-1 text-xs font-medium text-violet-700 hover:underline dark:text-violet-300"
                  >
                    <BookOpen className="h-3 w-3" aria-hidden />
                    {current.source === "concept"
                      ? "개념 정의 바로가기"
                      : "관련 개념 아카이브 보기"}
                    <ArrowRight className="h-3 w-3" aria-hidden />
                  </Link>
                )}
                {current.variableId && (
                  <Link
                    href={`/archive/variable/${current.variableId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-4 inline-flex w-fit items-center gap-1 text-xs font-medium text-blue-700 hover:underline dark:text-blue-300"
                  >
                    <Variable className="h-3 w-3" aria-hidden />
                    변인 정의 바로가기
                    <ArrowRight className="h-3 w-3" aria-hidden />
                  </Link>
                )}
                {current.measurementId && (
                  <Link
                    href={`/archive/measurement/${current.measurementId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-4 inline-flex w-fit items-center gap-1 text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-300"
                  >
                    <Ruler className="h-3 w-3" aria-hidden />
                    측정도구 정의 바로가기
                    <ArrowRight className="h-3 w-3" aria-hidden />
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </button>

      {/* 채점 — 뒷면일 때만 */}
      <div className="mt-5 flex items-center justify-center gap-3">
        {flipped ? (
          <>
            <Button
              variant="outline"
              size="lg"
              onClick={() => grade(false)}
              disabled={grading}
              className="min-w-[7rem] border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/30"
            >
              <X className="mr-1.5 h-4 w-4" aria-hidden />
              틀림
            </Button>
            <Button
              size="lg"
              onClick={() => grade(true)}
              disabled={grading}
              className="min-w-[7rem] bg-emerald-600 hover:bg-emerald-700"
            >
              <Check className="mr-1.5 h-4 w-4" aria-hidden />
              맞음
            </Button>
          </>
        ) : (
          <Button size="lg" onClick={() => setFlipped(true)} className="min-w-[10rem]">
            <RotateCw className="mr-1.5 h-4 w-4" aria-hidden />
            정답 확인
          </Button>
        )}
      </div>
    </div>
  );
}
