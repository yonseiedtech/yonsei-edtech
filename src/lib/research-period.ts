/**
 * 연구활동 기간 필터 유틸리티
 * 입력: YYYY-MM 문자열 (예: "2026-01")
 * 매칭: paper.createdAt 기준 (사용자가 연구활동을 기록한 시점)
 *      createdAt이 없으면 paper.year로 fallback (월=1로 가정)
 */

/** YYYY-MM 문자열을 (year, month) 튜플로. 잘못되면 null */
export function parseYearMonth(s: string | undefined | null): { year: number; month: number } | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{1,2})$/.exec(s.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isFinite(year) || year < 1900 || year > 2100) return null;
  if (!Number.isFinite(month) || month < 1 || month > 12) return null;
  return { year, month };
}

/** YYYY-MM → 시작 시각 (그달 1일 00:00) */
export function periodStartTs(s: string | undefined | null): number | null {
  const ym = parseYearMonth(s);
  if (!ym) return null;
  return Date.UTC(ym.year, ym.month - 1, 1, 0, 0, 0);
}

/** YYYY-MM → 종료 시각 (다음달 1일 00:00, exclusive) */
export function periodEndTs(s: string | undefined | null): number | null {
  const ym = parseYearMonth(s);
  if (!ym) return null;
  return Date.UTC(ym.year, ym.month, 1, 0, 0, 0);
}

interface PaperLike {
  createdAt?: string;
  year?: number;
}

/**
 * paper가 [start, end] 기간에 속하는지 판단.
 * - start/end가 모두 비어있으면 true
 * - createdAt 우선, 없으면 year (1월 1일로 가정)
 */
export function isPaperInPeriod(
  paper: PaperLike,
  start?: string | null,
  end?: string | null
): boolean {
  const startTs = periodStartTs(start);
  const endTs = periodEndTs(end);
  if (startTs === null && endTs === null) return true;

  let ts: number | null = null;
  if (paper.createdAt) {
    const t = Date.parse(paper.createdAt);
    if (Number.isFinite(t)) ts = t;
  }
  if (ts === null && paper.year) {
    ts = Date.UTC(paper.year, 0, 1);
  }
  if (ts === null) return false; // 매칭할 시점이 없으면 제외 (보수적)

  if (startTs !== null && ts < startTs) return false;
  if (endTs !== null && ts >= endTs) return false;
  return true;
}

/** 라벨용 포맷 — "2026.01 ~ 2026.04" / "2026.01 ~ " 등 */
export function formatPeriodLabel(start?: string | null, end?: string | null): string {
  const fmt = (s: string | undefined | null) => {
    const ym = parseYearMonth(s);
    return ym ? `${ym.year}.${String(ym.month).padStart(2, "0")}` : "";
  };
  const a = fmt(start);
  const b = fmt(end);
  if (!a && !b) return "전체 기간";
  return `${a || "처음"} ~ ${b || "현재"}`;
}
