/**
 * Shared types and constants for MyTodosWidget sub-components.
 * Extracted from `src/features/dashboard/MyTodosWidget.tsx` (Phase B 단순 분할).
 */

import type { Activity, ActivityType } from "@/types";

export type AddCategory = "course" | "activity" | "seminar" | "staff";

export type StatusFilter = "all" | "open" | "done";

export type TabKey = "all" | "course" | "research" | "activity" | "staff";

export const POPUP_PREF_KEY = "dashboard_today_popup_enabled";

export const TYPE_ROUTE: Record<ActivityType, string> = {
  study: "/activities/studies",
  project: "/activities/projects",
  external: "/activities/external",
};

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  study: "스터디",
  project: "프로젝트",
  external: "대외활동",
};

export interface ActivityFlat extends Activity {
  participants?: string[];
  members?: string[];
}

export type ResearchTodo = {
  id: string;
  title: string;
  href: string;
  note?: string;
};

export function isUserInvolved(a: ActivityFlat, userId: string): boolean {
  if (a.leaderId === userId) return true;
  if (Array.isArray(a.members) && a.members.includes(userId)) return true;
  if (Array.isArray(a.participants) && a.participants.includes(userId)) return true;
  return false;
}

export function readPopupPref(): boolean {
  if (typeof window === "undefined") return true;
  const v = window.localStorage.getItem(POPUP_PREF_KEY);
  return v !== "false";
}

export function writePopupPref(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(POPUP_PREF_KEY, enabled ? "true" : "false");
  window.dispatchEvent(new Event("dashboard-popup-pref-changed"));
}
