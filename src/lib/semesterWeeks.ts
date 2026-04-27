/**
 * 학기 주차 계산 유틸.
 *
 * 운영진(master)은 CourseOffering.semesterStartDate / totalWeeks 로 명시적 설정 가능.
 * 값이 없을 때는 관례 기본값으로 자동 추론:
 *   - 1학기(spring): 3월 첫째 주의 수업 요일을 주차 1의 시작일로
 *   - 2학기(fall):   9월 첫째 주의 수업 요일을 주차 1의 시작일로
 * 주차 N의 범위는 [start+(N-1)*7 일, start+N*7 - 1 일] (7일간).
 */

import type { ParsedSchedule } from "@/lib/courseSchedule";

export const DEFAULT_TOTAL_WEEKS = 15;

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function addDays(d: Date, days: number): Date {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + days);
  return nd;
}

/**
 * 학기+수업요일로부터 기본 개강일(주차 1 시작일) 추론.
 * 한 과목이 여러 요일(월/수)인 경우 가장 이른 요일의 첫 등장일을 반환.
 */
export function inferSemesterStartDate(
  year: number,
  term: "spring" | "fall",
  weekdays: number[],
): string {
  const baseMonth = term === "spring" ? 2 /* 3월 */ : 8 /* 9월 */;
  const firstOfMonth = new Date(year, baseMonth, 1);

  // 월요일부터 탐색해 해당 수업요일의 첫 발생일을 찾음.
  // 수업요일이 없으면 월요일로 폴백.
  const targetDays = weekdays.length > 0 ? [...weekdays].sort((a, b) => a - b) : [1];

  let best: Date | null = null;
  for (const dow of targetDays) {
    const diff = (dow - firstOfMonth.getDay() + 7) % 7;
    const candidate = addDays(firstOfMonth, diff);
    if (!best || candidate < best) best = candidate;
  }
  return ymd(best!);
}

export interface WeekRange {
  weekNo: number;
  /** 주차 시작일 YYYY-MM-DD (수업 요일) */
  startDate: string;
  /** 주차 종료일 YYYY-MM-DD (다음 수업 요일 전날) */
  endDate: string;
}

/**
 * 학기 전체 주차 목록을 생성.
 * semesterStartDate가 있으면 그 날짜부터, 없으면 inferSemesterStartDate() 폴백.
 */
export function buildSemesterWeeks(params: {
  year: number;
  term: "spring" | "fall";
  schedule: ParsedSchedule;
  semesterStartDate?: string;
  totalWeeks?: number;
}): WeekRange[] {
  const totalWeeks = params.totalWeeks ?? DEFAULT_TOTAL_WEEKS;
  const startIso =
    params.semesterStartDate ??
    inferSemesterStartDate(params.year, params.term, params.schedule.weekdays);
  const start = parseYmd(startIso);

  const weeks: WeekRange[] = [];
  for (let i = 0; i < totalWeeks; i++) {
    const ws = addDays(start, i * 7);
    const we = addDays(start, i * 7 + 6);
    weeks.push({
      weekNo: i + 1,
      startDate: ymd(ws),
      endDate: ymd(we),
    });
  }
  return weeks;
}

/**
 * 주차 범위에 특정 일자(YYYY-MM-DD)가 속하는지.
 */
export function isInWeek(range: WeekRange, dateIso: string): boolean {
  return dateIso >= range.startDate && dateIso <= range.endDate;
}

/**
 * 주어진 일자가 속하는 주차 번호를 반환. 범위 밖이면 null.
 */
export function findWeekForDate(
  weeks: WeekRange[],
  dateIso: string,
): WeekRange | null {
  return weeks.find((w) => isInWeek(w, dateIso)) ?? null;
}

/**
 * YYYY-MM-DD를 받아 그 날이 속한 달력 주(월~일) 범위를 반환.
 * 사용자 직관 "이번 주" = 월요일~일요일.
 */
export function getCalendarWeekRange(dateIso: string): {
  mondayYmd: string;
  sundayYmd: string;
} {
  const d = parseYmd(dateIso);
  const dow = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysFromMonday = (dow + 6) % 7; // Mon→0, Sun→6
  const monday = addDays(d, -daysFromMonday);
  const sunday = addDays(monday, 6);
  return { mondayYmd: ymd(monday), sundayYmd: ymd(sunday) };
}

/**
 * 학기 주차 N이 "이번 주(달력 기준 월~일)" 인지 판정.
 * 기준: 그 주차의 수업일(startDate)이 오늘이 속한 달력 주에 포함되는가.
 *
 * 학기 주차 범위(수업일~다음 수업일 전날)와 사용자 직관(월~일)이 어긋날 때
 * 후자를 우선한다. 예) 오늘 월요일이고 수업이 목요일인 경우, 이번 주 목요일 수업은
 * 학기 주차로는 다음 주차에 속하지만 사용자는 "이번 주 수업"으로 인지함.
 */
export function isCurrentCalendarWeek(week: WeekRange, todayIso: string): boolean {
  const { mondayYmd, sundayYmd } = getCalendarWeekRange(todayIso);
  return week.startDate >= mondayYmd && week.startDate <= sundayYmd;
}

/**
 * 오늘 기준 "이번 주" 학기 주차를 반환. 없으면 null.
 */
export function findCurrentCalendarWeek(
  weeks: WeekRange[],
  todayIso: string,
): WeekRange | null {
  const { mondayYmd, sundayYmd } = getCalendarWeekRange(todayIso);
  return (
    weeks.find((w) => w.startDate >= mondayYmd && w.startDate <= sundayYmd) ??
    null
  );
}
