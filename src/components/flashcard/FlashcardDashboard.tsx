"use client";

/**
 * FlashcardDashboard — 암기카드 학습 대시보드(복습 통계).
 *
 * flashcardsApi.listByUser(읽기 전용) 1회 로드 후 모두 클라이언트 집계(복합 인덱스 회피):
 *  - 총 카드 / 숙달 카드(streak >= 최고 상자 단계) / 오늘 복습 대상(dueAt<=today)
 *  - 전체 정답률 = ΣcorrectCount / ΣreviewCount
 *  - 상자 단계(streak) 분포 — Leitner 박스 0~4+
 *  - 연속 학습일 — lastReviewedAt(KST 날짜) 기준 오늘/어제부터 끊김 없이 이어진 일수
 *  - "오늘 복습 N장" 안내(실제 채점은 아래 FlashcardStudy 러너)
 *
 * /flashcards 상단 섹션. 카드가 0장이면 아무것도 렌더하지 않음(러너 빈 상태가 안내).
 * flashcard-srs 의 SRS_INTERVAL_STEPS / isDueToday / todayYmdKst 메타만 활용.
 */

import { useMemo } from "react";
import {
  Layers,
  CheckCircle2,
  Flame,
  Target,
  CalendarClock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/features/auth/auth-store";
// 실제 복습 채점은 FlashcardStudy 러너가 담당 — 대시보드는 읽기 전용 통계만.
import { useUserFlashcards } from "@/components/flashcard/useUserFlashcards";
import { SRS_INTERVAL_STEPS, isDueToday, addDaysYmd } from "@/lib/flashcard-srs";
import { todayYmdKst } from "@/lib/dday";
import { cn } from "@/lib/utils";
import type { Flashcard } from "@/types/flashcard";

/** streak(연속 정답) = 상자 단계. 최고 단계(마지막 인덱스)에 도달하면 "숙달"로 본다. */
const MASTERED_STREAK = SRS_INTERVAL_STEPS.length - 1; // 4
/** 박스 단계 라벨 — 0~3 단일, 4+ 묶음(상한). */
const BOX_LABELS = ["신규", "1단계", "2단계", "3단계", "숙달"] as const;

interface Stats {
  total: number;
  mastered: number;
  dueToday: number;
  /** 0~100 정수. reviewCount 합이 0이면 null(아직 채점 이력 없음). */
  accuracy: number | null;
  reviewedCount: number;
  /** 길이 5 — index 0~3 단일 streak, index 4 = streak>=4 합. */
  boxDist: number[];
  /** 연속 학습일(오늘 또는 어제부터 끊김 없이). */
  streakDays: number;
}

/** lastReviewedAt(ISO) → KST YYYY-MM-DD 변환. 잘못된 값이면 null. */
function reviewedYmdKst(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return todayYmdKst(d);
}

/** 학습한 날짜(KST) 집합에서 오늘/어제 기준 연속 학습일을 센다. */
function computeStreakDays(reviewDays: Set<string>): number {
  if (reviewDays.size === 0) return 0;
  const today = todayYmdKst();
  const yesterday = addDaysYmd(today, -1);
  // 오늘 학습했으면 오늘부터, 아니면 어제부터(아직 오늘 학습 전이어도 연속 인정) 역방향으로 카운트.
  let cursor = reviewDays.has(today) ? today : reviewDays.has(yesterday) ? yesterday : null;
  if (!cursor) return 0;
  let count = 0;
  while (reviewDays.has(cursor)) {
    count += 1;
    cursor = addDaysYmd(cursor, -1);
  }
  return count;
}

function computeStats(cards: Flashcard[]): Stats {
  let mastered = 0;
  let dueToday = 0;
  let totalReview = 0;
  let totalCorrect = 0;
  const boxDist = [0, 0, 0, 0, 0];
  const reviewDays = new Set<string>();

  for (const c of cards) {
    const streak = c.streak ?? 0;
    if (streak >= MASTERED_STREAK) mastered += 1;
    if (isDueToday(c)) dueToday += 1;
    totalReview += c.reviewCount ?? 0;
    totalCorrect += c.correctCount ?? 0;
    boxDist[Math.min(streak, MASTERED_STREAK)] += 1;
    const day = reviewedYmdKst(c.lastReviewedAt);
    if (day) reviewDays.add(day);
  }

  return {
    total: cards.length,
    mastered,
    dueToday,
    accuracy: totalReview > 0 ? Math.round((totalCorrect / totalReview) * 100) : null,
    reviewedCount: totalReview,
    boxDist,
    streakDays: computeStreakDays(reviewDays),
  };
}

export default function FlashcardDashboard() {
  const { user } = useAuthStore();
  const userId = user?.id;

  // M4: 목록 읽기 캐시 — FlashcardStudy 러너와 동일 queryKey 로 공유(이중 읽기 제거).
  const { data: cards = [], isLoading: loading } = useUserFlashcards(userId);

  const stats = useMemo(() => computeStats(cards), [cards]);

  // 비로그인은 러너가 로그인 안내 — 대시보드는 숨김.
  if (!userId) return null;

  if (loading) {
    return <Skeleton className="h-44 w-full rounded-2xl" />;
  }

  // 카드가 없으면 러너의 빈 상태가 안내 — 대시보드는 숨김.
  if (stats.total === 0) return null;

  const maxBox = Math.max(1, ...stats.boxDist);

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="space-y-5 py-5">
        {/* 요약 통계 4칸 */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            icon={Layers}
            label="총 카드"
            value={stats.total}
            tone="text-sky-700 dark:text-sky-300"
            bg="bg-sky-100 dark:bg-sky-950/40"
          />
          <StatTile
            icon={CheckCircle2}
            label="숙달 카드"
            value={stats.mastered}
            tone="text-emerald-700 dark:text-emerald-300"
            bg="bg-emerald-100 dark:bg-emerald-950/40"
          />
          <StatTile
            icon={Target}
            label="전체 정답률"
            value={stats.accuracy === null ? "—" : `${stats.accuracy}%`}
            tone="text-violet-700 dark:text-violet-300"
            bg="bg-violet-100 dark:bg-violet-950/40"
          />
          <StatTile
            icon={Flame}
            label="연속 학습일"
            value={stats.streakDays > 0 ? `${stats.streakDays}일` : "—"}
            tone="text-amber-700 dark:text-amber-300"
            bg="bg-amber-100 dark:bg-amber-950/40"
          />
        </div>

        {/* 상자 단계(streak) 분포 — Leitner 박스 시각화 */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              상자 단계 분포
              <span className="ml-1.5 text-[11px] font-normal">
                (정답을 거듭할수록 오른쪽 단계로 이동)
              </span>
            </p>
            {stats.accuracy !== null && (
              <p className="text-[11px] tabular-nums text-muted-foreground">
                누적 복습 {stats.reviewedCount}회
              </p>
            )}
          </div>
          <div className="flex items-end gap-2">
            {stats.boxDist.map((count, i) => {
              const heightPct = Math.round((count / maxBox) * 100);
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[11px] font-semibold tabular-nums text-foreground/80">
                    {count}
                  </span>
                  <div
                    className="flex w-full items-end overflow-hidden rounded-md bg-muted"
                    style={{ height: "3.5rem" }}
                    role="img"
                    aria-label={`${BOX_LABELS[i]} ${count}장`}
                  >
                    <div
                      className={cn(
                        "w-full rounded-md transition-all duration-500",
                        i === MASTERED_STREAK ? "bg-emerald-500" : "bg-sky-500",
                      )}
                      style={{ height: `${Math.max(count > 0 ? 8 : 0, heightPct)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{BOX_LABELS[i]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 오늘 복습 안내 — 실제 복습은 아래 러너에서 진행 */}
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-xl border px-4 py-3",
            stats.dueToday > 0
              ? "border-sky-200 bg-sky-50/60 dark:border-sky-900/50 dark:bg-sky-950/20"
              : "bg-muted/40",
          )}
        >
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              stats.dueToday > 0
                ? "bg-sky-200/60 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
                : "bg-primary/10 text-primary",
            )}
          >
            <CalendarClock className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-semibold">
              {stats.dueToday > 0
                ? `오늘 복습 ${stats.dueToday}장`
                : "오늘 복습할 카드가 없어요"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {stats.dueToday > 0
                ? "아래에서 복습하면 간격이 늘어나 더 오래 기억돼요."
                : "예정된 복습은 없지만 미리 둘러볼 수 있어요."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
  bg,
}: {
  icon: typeof Layers;
  label: string;
  value: string | number;
  tone: string;
  bg: string;
}) {
  return (
    <div className="rounded-xl border bg-card px-3 py-3">
      <div className={cn("mb-1.5 inline-flex h-7 w-7 items-center justify-center rounded-lg", bg, tone)}>
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <p className={cn("text-lg font-bold tabular-nums leading-none", tone)}>{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
