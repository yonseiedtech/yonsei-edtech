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

/**
 * 일/주/월 뷰 전환 시 콘텐츠 영역 높이가 달라 레이아웃이 점프하는 문제를 막기 위한
 * 공통 최소 높이 기준. 주간 뷰의 기본 시간 범위(17~24시 = 7시간) 높이를 기준값으로 삼는다.
 * daily/weekly 그리드는 실제 totalHeight 가 이보다 클 수 있으므로 min-height 로만 적용,
 * monthly(달력)는 별도 콘텐츠라 같은 min-height 로 바닥 라인을 맞춘다.
 */
export const TIMELINE_MIN_CONTENT_PX =
  ROW_HEIGHT_PX * (DEFAULT_HOUR_END - DEFAULT_HOUR_START); // 64 * 7 = 448

export const VIEW_STORAGE_KEY = "dashboard.classTimeline.view";
export const HOUR_RANGE_STORAGE_KEY = "dashboard.classTimeline.hourRange";
export type ViewMode = "daily" | "weekly" | "monthly";

export const MODE_BORDER: Record<ClassSessionMode, string> = {
  in_person: "border-l-success/70 bg-success/5",
  zoom: "border-l-info/70 bg-info/5",
  assignment: "border-l-warning/70 bg-warning/5",
  cancelled: "border-l-destructive/70 bg-destructive/5",
  field: "border-l-cat-5/70 bg-cat-5/5",
  exam: "border-l-destructive bg-destructive/5",
};

export const MODE_BADGE: Record<ClassSessionMode, string> = {
  in_person: "bg-success/10 text-success",
  zoom: "bg-info/10 text-info",
  assignment: "bg-warning/10 text-warning",
  cancelled: "bg-destructive/10 text-destructive",
  field: "bg-cat-5/10 text-cat-5",
  exam: "bg-destructive/10 text-destructive",
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
  in_person: "border-l-cat-5/70 bg-cat-5/5",
  zoom: "border-l-info/70 bg-info/5",
};

export const ACTIVITY_MODE_BADGE: Record<ActivityProgressMode, string> = {
  in_person: "bg-cat-5/10 text-cat-5",
  zoom: "bg-info/10 text-info",
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

// ── 세미나 온라인/오프라인(대면/비대면) 구분 ──
export type SeminarMode = "online" | "offline";

/** location 문자열에 비대면 키워드가 있으면 online 으로 추론 (보수적) */
const ONLINE_LOCATION_RE = /온라인|비대면|zoom|줌|webex|웹엑스|구글\s*미트|google\s*meet|teams|유튜브|youtube|라이브|live|화상/i;

/**
 * 세미나의 온/오프라인 모드 판정.
 *  1) isOnline 플래그가 명시되어 있으면 그대로 사용 (true→online, false→offline)
 *  2) onlineUrl 이 채워져 있으면 online
 *  3) location 문자열에 비대면 키워드가 있으면 online
 *  4) 그 외 모두 offline(대면)으로 간주 — 보수적 폴백
 */
export function inferSeminarMode(s: {
  isOnline?: boolean;
  onlineUrl?: string;
  location?: string;
}): SeminarMode {
  if (typeof s.isOnline === "boolean") return s.isOnline ? "online" : "offline";
  if (s.onlineUrl && s.onlineUrl.trim()) return "online";
  if (s.location && ONLINE_LOCATION_RE.test(s.location)) return "online";
  return "offline";
}

export const SEMINAR_MODE_LABEL: Record<SeminarMode, string> = {
  online: "온라인",
  offline: "대면",
};

export const SEMINAR_MODE_BADGE: Record<SeminarMode, string> = {
  online: "bg-info/10 text-info",
  offline: "bg-success/10 text-success",
};

/** 월간 그리드에 넘기는 세미나 항목 (제목 + 온/오프 모드) */
export interface MonthSeminar {
  id: string;
  title: string;
  mode: SeminarMode;
}


/**
 * QA-v2(2026-07-03): 시간 겹침 레인 배정 — 겹치는 일정이 서로를 완전히 가리지 않도록
 * 클러스터(연결된 겹침 그룹) 단위로 lane(0..n-1)과 lane 총수를 계산한다.
 * minHeight 는 렌더 시 최소 높이 보정(Math.max)과 동일 값을 넘겨 시각적 겹침 기준을 맞춘다.
 */
export function computeLanes(
  items: { key: string; top: number; height: number }[],
  minHeight: number,
): Map<string, { lane: number; lanes: number }> {
  const sorted = [...items].sort((a, b) => a.top - b.top || b.height - a.height);
  const result = new Map<string, { lane: number; lanes: number }>();
  type PlacedLane = { key: string; top: number; bottom: number; lane: number };
  let cluster: PlacedLane[] = [];
  let clusterEnd = -Infinity;
  const flush = () => {
    if (cluster.length === 0) return;
    const lanes = Math.max(...cluster.map((c) => c.lane)) + 1;
    for (const c of cluster) result.set(c.key, { lane: c.lane, lanes });
    cluster = [];
  };
  for (const it of sorted) {
    const top = it.top;
    const bottom = it.top + Math.max(it.height, minHeight);
    if (cluster.length > 0 && top >= clusterEnd) {
      flush();
      clusterEnd = -Infinity;
    }
    const used = new Set(cluster.filter((c) => c.bottom > top).map((c) => c.lane));
    let lane = 0;
    while (used.has(lane)) lane += 1;
    cluster.push({ key: it.key, top, bottom, lane });
    clusterEnd = Math.max(clusterEnd, bottom);
  }
  flush();
  return result;
}
