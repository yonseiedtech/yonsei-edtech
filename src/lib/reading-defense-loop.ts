// ── 읽기·심사 환류 (증명 루프 확장 · M5 / v2 L4) — 순수 집계 ──
//
// 두 가지 "개인 증거" 지표를 기존 데이터만 읽어 계산한다(새 컬렉션·rules 없음):
//  1) 읽기 환류: paper_reading_logs 를 최근 N주 주별(편수·집중 시간)로 버킷팅해
//     "읽기가 쌓이는 중"인지 경향을 본다.
//  2) 심사 환류: defense_practice_sets 의 회차별 평균 점수(attempts[].averageScore)를
//     시간순 시계열로 모아 "첫 연습 → 최근" 변화를 본다.
//
// ⚠️ 인과·과장 금지 — 상관/경향 수준만. "복습·연습 덕분에" 같은 인과 주장을 하지 않는다.
// 표본이 부족하면(읽기 0편 · 심사 시도 <2회) 각각 empty/single 상태로 반환해 UI 가
// 조용히 숨기거나 CTA 를 노출하도록 한다.

import type { PaperReadingLog } from "@/types/paper-reading";
import type { DefensePracticeSet } from "@/types/defense";

// ───────────────────────── 읽기 환류 ─────────────────────────

/** 한 주(월~일) 버킷 — 그 주의 읽은 편수·집중 시간. */
export interface WeeklyReadingBucket {
  /** 주 시작일(월요일) YYYY-MM-DD (로컬) */
  weekStart: string;
  /** 표시용 라벨 (예: "6/2") */
  label: string;
  /** 그 주에 읽은(readAt 기준) 편수 */
  count: number;
  /** 그 주 집중 시간 합(분) — durationMin 없는 기록은 0 */
  minutes: number;
}

export interface WeeklyReadingTrend {
  /** ok = 창(window) 안에 읽기 기록이 1건 이상, empty = 0건 */
  status: "ok" | "empty";
  /** 과거 → 최근 순으로 항상 weeks 개. */
  weeks: WeeklyReadingBucket[];
  /** 창 안 총 편수 */
  totalCount: number;
  /** 창 안 총 집중 시간(분) */
  totalMinutes: number;
  /** 최근 절반 편수가 이전 절반 이상이고 총 편수>0 이면 true("쌓이는 중" 경향). */
  accumulating: boolean;
}

function ymdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 그 날짜가 속한 주의 월요일(로컬 자정). */
function mondayOf(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (r.getDay() + 6) % 7; // 월=0 … 일=6
  r.setDate(r.getDate() - dow);
  return r;
}

/**
 * 최근 N주 주별 읽기 추이 — paper_reading_logs 의 readAt(YYYY-MM-DD, 로컬 KST 키) 기준.
 * @param logs  본인 읽기 기록들 (정렬 무관).
 * @param weeks 버킷 수 (기본 4주).
 * @param now   기준 시각 (테스트 주입용, 기본 현재).
 */
export function computeWeeklyReadingTrend(
  logs: PaperReadingLog[],
  weeks = 4,
  now: Date = new Date(),
): WeeklyReadingTrend {
  const w = Math.max(1, Math.floor(weeks));
  const curMon = mondayOf(now);

  // 과거 → 최근 순 버킷 (weeks[w-1] 이 이번 주).
  const buckets: WeeklyReadingBucket[] = [];
  for (let i = 0; i < w; i += 1) {
    const start = new Date(curMon);
    start.setDate(curMon.getDate() - (w - 1 - i) * 7);
    buckets.push({
      weekStart: ymdLocal(start),
      label: `${start.getMonth() + 1}/${start.getDate()}`,
      count: 0,
      minutes: 0,
    });
  }
  const windowStart = buckets[0].weekStart; // 창 하한 (YYYY-MM-DD 문자열 사전순 비교)

  for (const l of Array.isArray(logs) ? logs : []) {
    const readAt = l?.readAt ?? "";
    if (!readAt || readAt < windowStart) continue; // 창 밖(과거) 제외
    // readAt 이상인 가장 큰 weekStart 버킷을 찾는다(뒤에서부터).
    for (let j = w - 1; j >= 0; j -= 1) {
      if (readAt >= buckets[j].weekStart) {
        buckets[j].count += 1;
        buckets[j].minutes += Math.max(0, l?.durationMin ?? 0);
        break;
      }
    }
  }

  const totalCount = buckets.reduce((s, b) => s + b.count, 0);
  const totalMinutes = buckets.reduce((s, b) => s + b.minutes, 0);

  // 이전 절반 vs 최근 절반 편수 비교로 "쌓이는 중" 경향 판정.
  const mid = Math.floor(w / 2);
  const earlierCount = buckets.slice(0, mid).reduce((s, b) => s + b.count, 0);
  const recentCount = buckets.slice(mid).reduce((s, b) => s + b.count, 0);
  const accumulating = totalCount > 0 && recentCount >= earlierCount;

  return {
    status: totalCount > 0 ? "ok" : "empty",
    weeks: buckets,
    totalCount,
    totalMinutes,
    accumulating,
  };
}

// ───────────────────────── 심사 환류 ─────────────────────────

export interface DefenseTrendPoint {
  /** 시도 시각 ISO */
  at: string;
  /** 그 회차 평균 점수(0~100) */
  score: number;
}

export interface DefenseScoreTrend {
  /** ok = 시도 2회 이상, single = 1회, none = 0회. */
  status: "ok" | "single" | "none";
  /** at 오름차순(과거 → 최근) 유효 점수 시계열. */
  points: DefenseTrendPoint[];
  /** 유효 시도 수 */
  attemptCount: number;
  /** 첫 시도 점수 (none 이면 null) */
  firstScore: number | null;
  /** 최근 시도 점수 (none 이면 null) */
  recentScore: number | null;
  /** recentScore − firstScore 반올림 (ok 아닐 때 null) */
  delta: number | null;
}

/**
 * 심사 연습 점수 시계열 — 여러 세트의 attempts[](구버전은 lastAttempt 단건)를
 * 하나의 at 오름차순 시계열로 병합. 유효 점수(finite)만 채택.
 * @param sets 본인 심사 연습 세트들.
 */
export function computeDefenseScoreTrend(
  sets: DefensePracticeSet[],
): DefenseScoreTrend {
  const points: DefenseTrendPoint[] = [];
  for (const s of Array.isArray(sets) ? sets : []) {
    const attempts =
      Array.isArray(s?.attempts) && s.attempts.length > 0
        ? s.attempts
        : s?.lastAttempt
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
  points.sort((a, b) => a.at.localeCompare(b.at));

  const attemptCount = points.length;
  if (attemptCount === 0) {
    return { status: "none", points, attemptCount, firstScore: null, recentScore: null, delta: null };
  }
  const firstScore = points[0].score;
  const recentScore = points[attemptCount - 1].score;
  if (attemptCount < 2) {
    return { status: "single", points, attemptCount, firstScore, recentScore, delta: null };
  }
  return {
    status: "ok",
    points,
    attemptCount,
    firstScore,
    recentScore,
    delta: Math.round(recentScore - firstScore),
  };
}
