/**
 * Shared types and constants for DailyClassTimelineWidget sub-components.
 * Extracted from `src/features/dashboard/DailyClassTimelineWidget.tsx` (Phase B 단순 분할).
 */

import type {
  ActivityProgressMode,
  ClassSessionMode,
} from "@/types";
import type { CourseOffering, ClassSession, Activity, ActivityProgress } from "@/types";
import type { ParsedSchedule } from "@/lib/courseSchedule";

export const DAY_CHARS = ["일", "월", "화", "수", "목", "금", "토"] as const;
// 주간 그리드는 월~일 7일 (학술활동/스터디가 주말에도 일반 수업처럼 인라인 표시되도록)
export const WEEK_DAY_INDICES = [1, 2, 3, 4, 5, 6, 0] as const;

export const DEFAULT_HOUR_START = 17;
export const DEFAULT_HOUR_END = 24; // 24 = 자정 (00:00)
export const ROW_HEIGHT_PX = 64;

export const VIEW_STORAGE_KEY = "dashboard.classTimeline.view";
export const HOUR_RANGE_STORAGE_KEY = "dashboard.classTimeline.hourRange";
export type ViewMode = "daily" | "weekly" | "monthly";

export const MODE_BORDER: Record<ClassSessionMode, string> = {
  in_person: "border-l-emerald-400 bg-emerald-50/40",
  zoom: "border-l-blue-400 bg-blue-50/40",
  assignment: "border-l-amber-400 bg-amber-50/40",
  cancelled: "border-l-rose-400 bg-rose-50/40",
  field: "border-l-purple-400 bg-purple-50/40",
  exam: "border-l-rose-500 bg-rose-50/60",
};

export const MODE_BADGE: Record<ClassSessionMode, string> = {
  in_person: "bg-emerald-100 text-emerald-700",
  zoom: "bg-blue-100 text-blue-700",
  assignment: "bg-amber-100 text-amber-700",
  cancelled: "bg-rose-100 text-rose-700",
  field: "bg-purple-100 text-purple-700",
  exam: "bg-rose-100 text-rose-700",
};

export const ACTIVITY_TYPE_PATH = {
  study: "studies",
  project: "projects",
  external: "external",
} as const;

export const ACTIVITY_TYPE_LABEL = {
  study: "스터디",
  project: "프로젝트",
  external: "대외활동",
} as const;

export const ACTIVITY_MODE_BORDER: Record<ActivityProgressMode, string> = {
  in_person: "border-l-violet-400 bg-violet-50/50",
  zoom: "border-l-indigo-400 bg-indigo-50/50",
};

export const ACTIVITY_MODE_BADGE: Record<ActivityProgressMode, string> = {
  in_person: "bg-violet-100 text-violet-700",
  zoom: "bg-indigo-100 text-indigo-700",
};

export interface PlacedClass {
  offering: CourseOffering;
  parsed: ParsedSchedule;
  session: ClassSession | null;
  mode: ClassSessionMode;
  topPx: number;
  heightPx: number;
}

export interface PlacedActivity {
  activity: Activity;
  progress: ActivityProgress;
  startMin: number;
  endMin: number;
  topPx: number;
  heightPx: number;
  isLeader: boolean;
  mode: ActivityProgressMode;
}

export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** YYYY-MM-DD + n일 */
export function addDaysYmd(dateStr: string, days: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return dateStr;
  const [, y, mo, d] = m;
  const dt = new Date(Number(y), Number(mo) - 1, Number(d));
  dt.setDate(dt.getDate() + days);
  return ymd(dt);
}

export function semesterToTerm(semester: "first" | "second"): "spring" | "fall" {
  return semester === "first" ? "spring" : "fall";
}

export function pickLatestSession(sessions: ClassSession[]): ClassSession | null {
  if (sessions.length === 0) return null;
  return sessions.reduce((a, b) =>
    new Date(b.updatedAt ?? b.createdAt).getTime() >
    new Date(a.updatedAt ?? a.createdAt).getTime()
      ? b
      : a,
  );
}

export function parseHHMM(s?: string): number | null {
  if (!s) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (Number.isNaN(h) || Number.isNaN(mm)) return null;
  return h * 60 + mm;
}

export function formatHour(h: number): string {
  if (h === 24) return "00:00";
  return `${String(h).padStart(2, "0")}:00`;
}
