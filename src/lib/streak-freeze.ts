// ────────────────────────────────────────────────────────────
// streak-freeze.ts — 잔디 스트릭 "연구 쉼표"(freeze) 자비 인프라
//
// 벤치마크 H2 (Duolingo 원리 — 손실회피 완화 + mercy). 순수 개인용:
// 공개 리더보드·랭킹과 무관하며, 소셜 압박(프렌드 스트릭 등)은 도입하지 않는다.
// 저장은 본인 users 문서의 옵션 필드 `streakFreezes`(배열)만 사용 —
// firestore.rules 변경 없이 self-update(role/approved 외 필드) 범위 안에서 동작한다.
//
// 시험·마감 등 주기적 과부하가 상수인 대학원생 맥락에서, "이번 주"를 얼려
// 잔디 연속(streak)이 끊기지 않게 보호한다. 월 한도 내에서만 사용 가능.
// ────────────────────────────────────────────────────────────

/** 월별 사용 한도 (달력 월 기준) */
export const STREAK_FREEZE_MONTHLY_LIMIT = 2;

export interface StreakFreeze {
  /** 얼린 주의 시작일(일요일) YYYY-MM-DD (로컬) */
  week: string;
  /** 사용 시각 ISO */
  usedAt: string;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Date → 로컬 YYYY-MM-DD */
export function ymdLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** 주어진 날짜가 속한 주의 일요일(주 시작) YYYY-MM-DD (로컬) */
export function weekStartYmd(d: Date): string {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  s.setDate(s.getDate() - s.getDay()); // 일요일로 정렬
  return ymdLocal(s);
}

/** users 문서의 streakFreezes(unknown) 를 관대하게 파싱 */
export function parseFreezes(raw: unknown): StreakFreeze[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (f): f is StreakFreeze =>
      !!f &&
      typeof f === "object" &&
      typeof (f as StreakFreeze).week === "string" &&
      typeof (f as StreakFreeze).usedAt === "string",
  );
}

/** 얼린 주 시작일(일요일 ymd) 집합 — 스트릭 판정용 */
export function frozenWeekSet(freezes: StreakFreeze[]): Set<string> {
  return new Set(freezes.map((f) => f.week));
}

/** 이번 달(usedAt 로컬 기준) 사용 횟수 */
export function usedThisMonth(freezes: StreakFreeze[], now: Date = new Date()): number {
  return freezes.filter((f) => {
    const d = new Date(f.usedAt);
    return (
      !Number.isNaN(d.getTime()) &&
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth()
    );
  }).length;
}

/** 이번 달 남은 사용 횟수 */
export function remainingThisMonth(freezes: StreakFreeze[], now: Date = new Date()): number {
  return Math.max(0, STREAK_FREEZE_MONTHLY_LIMIT - usedThisMonth(freezes, now));
}

/** 특정 주(주 시작 ymd)가 얼려져 있는지 */
export function isWeekFrozen(freezes: StreakFreeze[], weekStart: string): boolean {
  return freezes.some((f) => f.week === weekStart);
}
