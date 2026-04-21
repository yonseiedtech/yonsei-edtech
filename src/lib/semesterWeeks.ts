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
