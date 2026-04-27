import type { TimelinePhase } from "@/types";
import { todayYmdLocal } from "@/lib/dday";

/** D-day offset → actual date string (YYYY-MM-DD) */
export function resolveDate(seminarDate: string, dDay: number): string {
  const base = new Date(seminarDate + "T00:00:00");
  base.setDate(base.getDate() + dDay);
  return todayYmdLocal(base);
}

/** Check if a phase is overdue (past its target date and not done) */
export function isOverdue(seminarDate: string, phase: TimelinePhase): boolean {
  if (phase.done) return false;
  const target = resolveDate(seminarDate, phase.dDay);
  const today = todayYmdLocal();
  return today > target;
}

/** Format D-day label */
export function formatDDay(dDay: number): string {
  if (dDay === 0) return "D-Day";
  return dDay < 0 ? `D${dDay}` : `D+${dDay}`;
}
