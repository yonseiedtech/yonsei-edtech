/**
 * cron stale(침묵) 감지 유틸 — v9-M1 (2026-07-20)
 *
 * vercel.json 의 crons 배열을 단일 소스로 삼아 kind별 기대 최대 간격(ms)을 제공한다.
 * cron-parser 외부 의존 없이 간단한 규칙으로 일/주 주기를 구분:
 *   - dow(5번째 필드) = "*" → daily (25h 여유 포함)
 *   - dow ≠ "*"        → weekly (8일 여유 포함)
 *
 * 사용처:
 *   - cron-watchdog route.ts (서버 cron 알림)
 *   - /api/console/cron-runs route.ts (UI isStale 플래그)
 */

import vercelConfig from "../../vercel.json";

interface VercelCron {
  path: string;
  schedule: string;
}

/** cron 표현식에서 최대 기대 간격(ms) 계산 — 외부 라이브러리 없음. */
function cronMaxIntervalMs(schedule: string): number {
  const parts = schedule.trim().split(/\s+/);
  const dow = parts[4] ?? "*"; // 5번째 필드: day-of-week
  if (dow !== "*") {
    // 주 단위 (예: "0 0 * * 1") → 8일 여유
    return 8 * 24 * 60 * 60 * 1000;
  }
  // 일 단위 (예: "0 0 * * *") → 25h 여유
  return 25 * 60 * 60 * 1000;
}

/** "/api/cron/weekly-digest" → "weekly-digest" */
function pathToKind(path: string): string {
  return path.replace(/^\/api\/cron\//, "");
}

/**
 * vercel.json crons 배열에서 생성된 kind → 최대 기대 간격(ms) 맵.
 *
 * stale 판정 기준: elapsed > maxIntervalMs × 2
 */
export const CRON_KIND_INTERVALS: ReadonlyMap<string, number> = new Map<string, number>(
  (vercelConfig.crons as VercelCron[]).map(({ path, schedule }) => [
    pathToKind(path),
    cronMaxIntervalMs(schedule),
  ]),
);

/**
 * kind의 마지막 실행 시각이 기대 주기 × 2를 초과했는지(stale) 판정.
 * kind가 맵에 없으면 false (비관리 cron).
 */
export function isStaleKind(kind: string, lastRunAtIso: string): boolean {
  const maxMs = CRON_KIND_INTERVALS.get(kind);
  if (maxMs === undefined) return false;
  const elapsed = Date.now() - new Date(lastRunAtIso).getTime();
  return elapsed > maxMs * 2;
}
