"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { siteSettingsApi } from "@/lib/bkend";

export interface AcademicCalendarEntry {
  year: number;
  semester: "first" | "second";
  semesterStart: string;   // YYYY-MM-DD 개강
  midtermStart: string;    // 중간고사 시작
  midtermEnd: string;      // 중간고사 종료
  finalStart: string;      // 기말고사 시작
  finalEnd: string;        // 기말고사 종료
  semesterEnd: string;     // 종강
  breakEnd: string;        // 방학 종료(다음 학기 개강 전날)
  notes?: string;
}

export interface AcademicCalendarData {
  entries: AcademicCalendarEntry[];
}

const KEY = "academic_calendar";
const DEFAULT: AcademicCalendarData = { entries: [] };

export function useAcademicCalendar() {
  const queryKey = ["site_settings", KEY];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await siteSettingsApi.getByKey(KEY);
      if (res.data.length === 0) return { id: null as string | null, value: DEFAULT };
      const row = res.data[0];
      return {
        id: row.id as string,
        value: JSON.parse(row.value as string) as AcademicCalendarData,
      };
    },
    staleTime: 1000 * 60 * 5,
  });

  return {
    value: data?.value ?? DEFAULT,
    recordId: data?.id ?? null,
    isLoading,
  };
}

export function useUpdateAcademicCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      recordId,
      value,
    }: {
      recordId: string | null;
      value: AcademicCalendarData;
    }) => {
      const payload = { key: KEY, value: JSON.stringify(value) };
      if (recordId) {
        await siteSettingsApi.update(recordId, payload);
      } else {
        await siteSettingsApi.create(payload);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site_settings", KEY] }),
  });
}

// ── 진행도 계산 ──

export type SemesterPhase =
  | "before"
  | "regular_pre_midterm"
  | "midterm"
  | "regular_post_midterm"
  | "final"
  | "post_final"
  | "break"
  | "after";

export interface SemesterProgress {
  entry: AcademicCalendarEntry;
  phase: SemesterPhase;
  phaseLabel: string;
  percent: number; // 학기 전체 0~100
  daysElapsed: number;
  daysTotal: number;
  daysRemaining: number;
  nextMilestone: { label: string; date: string } | null;
}

const PHASE_LABELS: Record<SemesterPhase, string> = {
  before: "개강 전",
  regular_pre_midterm: "수업 (중간 전)",
  midterm: "중간고사 기간",
  regular_post_midterm: "수업 (중간 후)",
  final: "기말고사 기간",
  post_final: "기말 후·종강 전",
  break: "방학",
  after: "학기 종료",
};

function parseYmd(s: string | undefined | null): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s.trim());
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function pickActiveEntry(
  entries: AcademicCalendarEntry[],
  now: Date = new Date(),
): AcademicCalendarEntry | null {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  // 우선순위: 현재 시점이 semesterStart~breakEnd 사이인 학기
  const ranged = entries
    .map((e) => ({
      e,
      start: parseYmd(e.semesterStart),
      end: parseYmd(e.breakEnd) ?? parseYmd(e.semesterEnd),
    }))
    .filter((x) => x.start && x.end) as {
    e: AcademicCalendarEntry;
    start: Date;
    end: Date;
  }[];

  const within = ranged.find((x) => x.start <= today && today <= x.end);
  if (within) return within.e;

  // 가장 가까운 미래 학기
  const upcoming = ranged
    .filter((x) => x.start > today)
    .sort((a, b) => a.start.getTime() - b.start.getTime())[0];
  if (upcoming) return upcoming.e;

  // 가장 최근 과거 학기
  const past = ranged
    .filter((x) => x.end < today)
    .sort((a, b) => b.end.getTime() - a.end.getTime())[0];
  return past ? past.e : null;
}

export function computeProgress(
  entry: AcademicCalendarEntry,
  now: Date = new Date(),
): SemesterProgress | null {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const semStart = parseYmd(entry.semesterStart);
  const midStart = parseYmd(entry.midtermStart);
  const midEnd = parseYmd(entry.midtermEnd);
  const finStart = parseYmd(entry.finalStart);
  const finEnd = parseYmd(entry.finalEnd);
  const semEnd = parseYmd(entry.semesterEnd);
  const breakEnd = parseYmd(entry.breakEnd);

  if (!semStart || !semEnd) return null;

  const totalEnd = breakEnd ?? semEnd;
  const daysTotal = Math.max(1, diffDays(semStart, totalEnd));
  const daysElapsed = Math.max(0, Math.min(daysTotal, diffDays(semStart, today)));
  const percent = Math.round((daysElapsed / daysTotal) * 1000) / 10;
  const daysRemaining = Math.max(0, daysTotal - daysElapsed);

  let phase: SemesterPhase = "regular_pre_midterm";
  if (today < semStart) phase = "before";
  else if (midStart && midEnd && today >= midStart && today <= midEnd) phase = "midterm";
  else if (finStart && finEnd && today >= finStart && today <= finEnd) phase = "final";
  else if (midEnd && today > midEnd && (!finStart || today < finStart)) phase = "regular_post_midterm";
  else if (finEnd && today > finEnd && today <= semEnd) phase = "post_final";
  else if (today > semEnd && breakEnd && today <= breakEnd) phase = "break";
  else if (breakEnd && today > breakEnd) phase = "after";

  // 다음 마일스톤
  const milestones: { label: string; date: Date | null }[] = [
    { label: "개강", date: semStart },
    { label: "중간고사 시작", date: midStart },
    { label: "중간고사 종료", date: midEnd },
    { label: "기말고사 시작", date: finStart },
    { label: "기말고사 종료", date: finEnd },
    { label: "종강", date: semEnd },
    { label: "방학 종료", date: breakEnd },
  ];
  const next = milestones
    .filter((m): m is { label: string; date: Date } => m.date != null && m.date > today)
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

  return {
    entry,
    phase,
    phaseLabel: PHASE_LABELS[phase],
    percent,
    daysElapsed,
    daysTotal,
    daysRemaining,
    nextMilestone: next
      ? {
          label: next.label,
          date: `${next.date.getUTCFullYear()}-${String(next.date.getUTCMonth() + 1).padStart(2, "0")}-${String(next.date.getUTCDate()).padStart(2, "0")}`,
        }
      : null,
  };
}
