import type { ResearchPaper, WritingPaperHistory } from "@/types";
import { isPaperInPeriod, periodStartTs, periodEndTs } from "./research-period";

/** 안전한 ISO 파싱. 실패 시 NaN. */
function parseIso(v: string | undefined | null): number {
  if (!v) return NaN;
  return Date.parse(v);
}

/** YYYY-MM-DD 추출 (타임존 영향 최소화 — toISOString 사용) */
function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

interface PeriodOpts {
  periodStart?: string | null;
  periodEnd?: string | null;
}

function inPeriod(savedAt: string, opts: PeriodOpts): boolean {
  const start = periodStartTs(opts.periodStart ?? undefined);
  const end = periodEndTs(opts.periodEnd ?? undefined);
  if (start === null && end === null) return true;
  const ts = parseIso(savedAt);
  if (!Number.isFinite(ts)) return false;
  if (start !== null && ts < start) return false;
  if (end !== null && ts >= end) return false;
  return true;
}

function periodTotalDays(opts: PeriodOpts, fallbackHistory: WritingPaperHistory[]): number {
  const start = periodStartTs(opts.periodStart ?? undefined);
  const end = periodEndTs(opts.periodEnd ?? undefined);
  if (start !== null && end !== null) {
    return Math.max(1, Math.round((end - start) / 86400000));
  }
  if (start !== null) {
    return Math.max(1, Math.round((Date.now() - start) / 86400000));
  }
  if (end !== null) {
    // start 없음: history 시작점부터 end까지
    if (fallbackHistory.length === 0) return 1;
    const earliest = fallbackHistory.reduce(
      (min, h) => Math.min(min, parseIso(h.savedAt) || Infinity),
      Infinity
    );
    return Math.max(1, Math.round((end - earliest) / 86400000));
  }
  // 둘 다 없으면 history span (없으면 1)
  if (fallbackHistory.length === 0) return 1;
  const tsList = fallbackHistory
    .map((h) => parseIso(h.savedAt))
    .filter((t) => Number.isFinite(t));
  if (tsList.length === 0) return 1;
  const min = Math.min(...tsList);
  const max = Math.max(...tsList);
  return Math.max(1, Math.round((max - min) / 86400000) + 1);
}

// ── 작성 통계 ──

export function computeWritingDays(
  history: WritingPaperHistory[],
  opts: PeriodOpts = {}
): number {
  const set = new Set<string>();
  for (const h of history) {
    if (!h.savedAt) continue;
    if (!inPeriod(h.savedAt, opts)) continue;
    set.add(dateKey(h.savedAt));
  }
  return set.size;
}

export function computeParticipationRate(
  history: WritingPaperHistory[],
  opts: PeriodOpts = {}
): number {
  const days = computeWritingDays(history, opts);
  const total = periodTotalDays(opts, history);
  if (total <= 0) return 0;
  return Math.round((days / total) * 1000) / 10; // 1자리 소수
}

export function computeLongestStreak(
  history: WritingPaperHistory[],
  opts: PeriodOpts = {}
): number {
  const days = new Set<string>();
  for (const h of history) {
    if (!h.savedAt) continue;
    if (!inPeriod(h.savedAt, opts)) continue;
    days.add(dateKey(h.savedAt));
  }
  if (days.size === 0) return 0;
  const sorted = [...days].sort();
  let best = 1;
  let cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + "T00:00:00Z").getTime();
    const now = new Date(sorted[i] + "T00:00:00Z").getTime();
    if (now - prev === 86400000) {
      cur += 1;
      if (cur > best) best = cur;
    } else {
      cur = 1;
    }
  }
  return best;
}

/** 0~23시 분포 (저장 시각의 시) */
export function computeHourBuckets(
  history: WritingPaperHistory[],
  opts: PeriodOpts = {}
): number[] {
  const buckets = new Array(24).fill(0);
  for (const h of history) {
    if (!h.savedAt) continue;
    if (!inPeriod(h.savedAt, opts)) continue;
    const t = parseIso(h.savedAt);
    if (!Number.isFinite(t)) continue;
    const hr = new Date(t).getHours(); // 로컬(KST) 시
    buckets[hr] += 1;
  }
  return buckets;
}

/** 일~토 (0~6) 분포 */
export function computeWeekdayBuckets(
  history: WritingPaperHistory[],
  opts: PeriodOpts = {}
): number[] {
  const buckets = new Array(7).fill(0);
  for (const h of history) {
    if (!h.savedAt) continue;
    if (!inPeriod(h.savedAt, opts)) continue;
    const t = parseIso(h.savedAt);
    if (!Number.isFinite(t)) continue;
    const d = new Date(t).getDay();
    buckets[d] += 1;
  }
  return buckets;
}

/** 일자별 집계 — 잔디 히트맵 입력 */
export function computeDailyActivity(
  history: WritingPaperHistory[]
): Map<string, { count: number; lastSavedAt: string }> {
  const map = new Map<string, { count: number; lastSavedAt: string }>();
  for (const h of history) {
    if (!h.savedAt) continue;
    const key = dateKey(h.savedAt);
    const prev = map.get(key);
    if (prev) {
      prev.count += 1;
      if (h.savedAt > prev.lastSavedAt) prev.lastSavedAt = h.savedAt;
    } else {
      map.set(key, { count: 1, lastSavedAt: h.savedAt });
    }
  }
  return map;
}

// ── 읽기 통계 ──

export function computeReadingStats(
  papers: ResearchPaper[],
  opts: PeriodOpts = {}
): { total: number; completed: number; reading: number; toRead: number } {
  const filtered = papers
    .filter((p) => !p.isDraft)
    .filter((p) => isPaperInPeriod(p, opts.periodStart, opts.periodEnd));
  return {
    total: filtered.length,
    completed: filtered.filter((p) => p.readStatus === "completed").length,
    reading: filtered.filter((p) => p.readStatus === "reading").length,
    toRead: filtered.filter((p) => p.readStatus === "to_read").length,
  };
}

export function computeAvgReadDuration(
  papers: ResearchPaper[],
  opts: PeriodOpts = {}
): number | null {
  const durations: number[] = [];
  for (const p of papers) {
    if (p.isDraft) continue;
    if (!isPaperInPeriod(p, opts.periodStart, opts.periodEnd)) continue;
    if (!p.readStartedAt || !p.readCompletedAt) continue;
    const s = Date.parse(p.readStartedAt);
    const e = Date.parse(p.readCompletedAt);
    if (!Number.isFinite(s) || !Number.isFinite(e) || e < s) continue;
    durations.push(Math.round((e - s) / 86400000));
  }
  if (durations.length === 0) return null;
  return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
}

export function computeTotalReadDays(
  papers: ResearchPaper[],
  opts: PeriodOpts = {}
): number | null {
  let total = 0;
  let count = 0;
  for (const p of papers) {
    if (p.isDraft) continue;
    if (!isPaperInPeriod(p, opts.periodStart, opts.periodEnd)) continue;
    if (!p.readStartedAt || !p.readCompletedAt) continue;
    const s = Date.parse(p.readStartedAt);
    const e = Date.parse(p.readCompletedAt);
    if (!Number.isFinite(s) || !Number.isFinite(e) || e < s) continue;
    total += Math.round((e - s) / 86400000);
    count += 1;
  }
  return count > 0 ? total : null;
}

export function computeTopKeywords(
  papers: ResearchPaper[],
  topN = 10,
  opts: PeriodOpts = {}
): Array<{ tag: string; count: number }> {
  const counter = new Map<string, number>();
  for (const p of papers) {
    if (p.isDraft) continue;
    if (!isPaperInPeriod(p, opts.periodStart, opts.periodEnd)) continue;
    for (const t of p.tags ?? []) {
      const k = t.trim();
      if (!k) continue;
      counter.set(k, (counter.get(k) ?? 0) + 1);
    }
  }
  return [...counter.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

export type VariableBreakdownGroup = "independent" | "dependent" | "mediator" | "moderator" | "control";

export function computeVariableBreakdown(
  papers: ResearchPaper[],
  topN = 5,
  opts: PeriodOpts = {}
): Record<VariableBreakdownGroup, Array<{ name: string; count: number }>> {
  const groups: VariableBreakdownGroup[] = ["independent", "dependent", "mediator", "moderator", "control"];
  const result: Record<VariableBreakdownGroup, Array<{ name: string; count: number }>> = {
    independent: [],
    dependent: [],
    mediator: [],
    moderator: [],
    control: [],
  };
  for (const g of groups) {
    const counter = new Map<string, number>();
    for (const p of papers) {
      if (p.isDraft) continue;
      if (!isPaperInPeriod(p, opts.periodStart, opts.periodEnd)) continue;
      const arr = p.variables?.[g] ?? [];
      for (const v of arr) {
        const k = v.trim();
        if (!k) continue;
        counter.set(k, (counter.get(k) ?? 0) + 1);
      }
    }
    result[g] = [...counter.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, topN);
  }
  return result;
}

