"use client";

// ── 심사 연습 추세 카드 (M5 / v2 L4) ──
//
// 논문 심사 연습(defense_practice_sets)의 회차별 평균 점수(attempts[].averageScore)를
// 시간순으로 모아 미니 라인 차트로 보여준다. 순수 SVG(신규 라이브러리 없음).
//
// 표본 규칙: 시도 2회 미만이면 차트 대신 안내 문구. 세트도 시도도 없으면 조용히 숨김.
//
// 데이터 원천: DefensePracticeSet.attempts[] (구버전은 lastAttempt 단건). 여러 세트의
//   시도를 모두 합쳐 at(ISO) 오름차순으로 정렬한 하나의 시계열로 본다.

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { defensePracticesApi } from "@/lib/bkend";
import type { DefensePracticeSet } from "@/types/defense";
import { Mic, ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TrendPoint {
  at: string;
  score: number;
}

/** 여러 세트의 시도를 하나의 시계열로 병합 (at 오름차순, 유효 점수만). */
function collectPoints(sets: DefensePracticeSet[]): TrendPoint[] {
  const points: TrendPoint[] = [];
  for (const s of Array.isArray(sets) ? sets : []) {
    const attempts =
      Array.isArray(s.attempts) && s.attempts.length > 0
        ? s.attempts
        : s.lastAttempt
          ? [s.lastAttempt]
          : [];
    for (const a of attempts) {
      const t = Date.parse(a?.at ?? "");
      const score = a?.averageScore;
      if (Number.isFinite(t) && typeof score === "number" && Number.isFinite(score)) {
        points.push({ at: a.at, score });
      }
    }
  }
  return points.sort((a, b) => a.at.localeCompare(b.at));
}

const W = 300;
const H = 84;
const PAD_X = 8;
const PAD_Y = 12;
const MAX_POINTS = 12;

export default function DefensePracticeTrendCard({ userId }: { userId: string }) {
  const { data: points } = useQuery({
    queryKey: ["mypage-defense-trend", userId],
    queryFn: async (): Promise<TrendPoint[]> => {
      const res = await defensePracticesApi.listByUser(userId);
      const sets = Array.isArray(res.data) ? res.data : [];
      return collectPoints(sets);
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });

  if (!points) return null;

  // 시도가 전혀 없으면 조용히 숨김 (심사 연습을 시작하지 않은 상태).
  if (points.length === 0) return null;

  // 1회만 있으면 안내 문구.
  if (points.length < 2) {
    return (
      <div className="rounded-2xl border-2 border-cat-1/20 bg-gradient-to-br from-cat-1/5 to-cat-1/10 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cat-1/10 text-cat-1">
            <Mic size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold">심사 연습 추세</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              한 번 더 연습하면 회차별 점수 추세를 그래프로 보여드려요. 지금 점수는{" "}
              <b className="tabular-nums text-cat-1">
                {Math.round(points[0].score)}
              </b>
              점이에요.
            </p>
            <Link
              href="/steppingstone/thesis-defense"
              className="mt-3 inline-flex items-center gap-1 rounded-full bg-cat-1 px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-cat-1/90"
            >
              심사 연습하러 가기
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 최근 MAX_POINTS 개만 표시.
  const recent = points.slice(-MAX_POINTS);
  const n = recent.length;
  const first = recent[0].score;
  const last = recent[n - 1].score;
  const delta = Math.round(last - first);

  // Y축 고정 0~100 (점수 스케일). X는 등간격.
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y * 2;
  const xAt = (i: number) => PAD_X + (n === 1 ? innerW / 2 : (innerW * i) / (n - 1));
  const yAt = (score: number) =>
    PAD_Y + innerH - (Math.max(0, Math.min(100, score)) / 100) * innerH;

  const linePath = recent.map((p, i) => `${xAt(i)},${yAt(p.score)}`).join(" ");
  const areaPath =
    `${xAt(0)},${PAD_Y + innerH} ` +
    recent.map((p, i) => `${xAt(i)},${yAt(p.score)}`).join(" ") +
    ` ${xAt(n - 1)},${PAD_Y + innerH}`;

  const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const trendColor =
    delta > 0
      ? "text-success"
      : delta < 0
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <div className="rounded-2xl border-2 border-cat-1/20 bg-gradient-to-br from-cat-1/5 to-cat-1/10 p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cat-1/10 text-cat-1">
          <Mic size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h3 className="text-base font-bold">심사 연습 추세</h3>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              최근 {n}회
            </span>
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-cat-1">
            최근 점수 <b className="tabular-nums">{Math.round(last)}</b>점
            <span className={`inline-flex items-center gap-0.5 text-[12px] font-semibold ${trendColor}`}>
              <TrendIcon size={13} />
              <span className="tabular-nums">
                {delta > 0 ? `+${delta}` : delta}점
              </span>
            </span>
          </p>
        </div>
      </div>

      {/* 미니 라인 차트 — 순수 SVG. 폭은 컨테이너에 맞춰 스케일. */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-3 w-full"
        role="img"
        aria-label={`심사 연습 최근 ${n}회 평균 점수 추세, 최근 ${Math.round(last)}점`}
        preserveAspectRatio="none"
      >
        {/* 기준선(50점) */}
        <line
          x1={PAD_X}
          y1={yAt(50)}
          x2={W - PAD_X}
          y2={yAt(50)}
          className="stroke-cat-1/20"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <polygon points={areaPath} className="fill-cat-1/10" />
        <polyline
          points={linePath}
          fill="none"
          className="stroke-cat-1"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {recent.map((p, i) => (
          <circle
            key={`${p.at}-${i}`}
            cx={xAt(i)}
            cy={yAt(p.score)}
            r={i === n - 1 ? 3.5 : 2.5}
            className={
              i === n - 1
                ? "fill-cat-1"
                : "fill-cat-1/60"
            }
          />
        ))}
      </svg>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">
          회차별 평균 점수(0~100)입니다. 점선은 50점 기준입니다.
        </p>
        <Link
          href="/steppingstone/thesis-defense"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-cat-1/30 px-3 py-1.5 text-[12px] font-semibold text-cat-1 transition-colors hover:bg-cat-1/10"
        >
          <Mic size={12} />
          연습 이어가기
        </Link>
      </div>
    </div>
  );
}
