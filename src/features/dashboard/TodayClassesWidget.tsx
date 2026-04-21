"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { CalendarClock, ExternalLink } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  courseEnrollmentsApi,
  courseOfferingsApi,
  classSessionsApi,
} from "@/lib/bkend";
import {
  CLASS_SESSION_MODE_LABELS,
  type ClassSession,
  type ClassSessionMode,
  type CourseOffering,
} from "@/types";
import { inferCurrentSemester } from "@/lib/semester";
import { parseSchedule, fmtTimeRange } from "@/lib/courseSchedule";
import { cn } from "@/lib/utils";

const DAY_CHARS = ["일", "월", "화", "수", "목", "금", "토"] as const;

const MODE_COLORS: Record<ClassSessionMode, string> = {
  in_person: "bg-emerald-50 text-emerald-700 border-emerald-200",
  zoom: "bg-blue-50 text-blue-700 border-blue-200",
  assignment: "bg-amber-50 text-amber-700 border-amber-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  field: "bg-purple-50 text-purple-700 border-purple-200",
  exam: "bg-rose-50 text-rose-700 border-rose-200",
};

function todayYmd(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function semesterToTerm(semester: "first" | "second"): "spring" | "fall" {
  return semester === "first" ? "spring" : "fall";
}

function pickLatestSession(sessions: ClassSession[]): ClassSession | null {
  if (sessions.length === 0) return null;
  return sessions.reduce((a, b) =>
    new Date(b.updatedAt ?? b.createdAt).getTime() >
    new Date(a.updatedAt ?? a.createdAt).getTime()
      ? b
      : a,
  );
}

export default function TodayClassesWidget() {
  const { user } = useAuthStore();
  const userId = user?.id;

  const now = new Date();
  const today = todayYmd(now);
  const todayDayIndex = now.getDay();
  const dayChar = DAY_CHARS[todayDayIndex];
  const { year, semester } = inferCurrentSemester(now);
  const term = semesterToTerm(semester);
  const dateLabel = `${now.getMonth() + 1}월 ${now.getDate()}일 (${dayChar})`;
  const semesterLabel = `${year}년 ${term === "spring" ? "1학기" : "2학기"}`;

  // 1) 본인의 수강 이력 (전체)
  const { data: enrollmentsRes, isLoading: loadingEnrollments } = useQuery({
    queryKey: ["my-enrollments", userId],
    queryFn: async () => {
      if (!userId) return { data: [], total: 0 };
      return await courseEnrollmentsApi.listByUser(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  // 현재 학기 enrollment 만 추리고 courseOfferingId 수집
  const currentEnrollments = useMemo(() => {
    const items = enrollmentsRes?.data ?? [];
    return items.filter((e) => e.year === year && e.term === term);
  }, [enrollmentsRes, year, term]);

  const courseIds = useMemo(
    () => currentEnrollments.map((e) => e.courseOfferingId),
    [currentEnrollments],
  );

  // 2) 해당 학기 모든 offering 한 번에 (필터로 좁히면 query는 같음, 캐시 공유)
  const { data: offeringsRes, isLoading: loadingOfferings } = useQuery({
    queryKey: ["course-offerings", year, term],
    queryFn: () => courseOfferingsApi.listBySemester(year, term),
    staleTime: 1000 * 60 * 5,
  });

  const offerings: CourseOffering[] = useMemo(
    () => offeringsRes?.data ?? [],
    [offeringsRes],
  );

  // 3) 오늘 요일에 해당하는 본인 수강과목 + 파싱된 스케줄
  const todaysCourses = useMemo(() => {
    return offerings
      .filter((o) => courseIds.includes(o.id))
      .map((o) => ({ offering: o, parsed: parseSchedule(o.schedule) }))
      .filter(({ parsed }) => parsed.weekdays.includes(todayDayIndex))
      .sort((a, b) => {
        // 시작 시각 오름차순, 시간 미정은 뒤로
        const sa = a.parsed.startMin ?? Number.POSITIVE_INFINITY;
        const sb = b.parsed.startMin ?? Number.POSITIVE_INFINITY;
        return sa - sb;
      });
  }, [offerings, courseIds, todayDayIndex]);

  // 4) 오늘 날짜의 class_sessions (오버라이드 정보)
  const { data: sessionsRes } = useQuery({
    queryKey: ["class-sessions", today],
    queryFn: () => classSessionsApi.listByDate(today),
    staleTime: 1000 * 60,
    enabled: todaysCourses.length > 0,
  });

  const sessionsByCourse = useMemo(() => {
    const map = new Map<string, ClassSession[]>();
    (sessionsRes?.data ?? []).forEach((s) => {
      if (!map.has(s.courseOfferingId)) map.set(s.courseOfferingId, []);
      map.get(s.courseOfferingId)!.push(s);
    });
    return map;
  }, [sessionsRes]);

  if (!userId) return null;

  const isLoading = loadingEnrollments || loadingOfferings;

  return (
    <div className="rounded-2xl border bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarClock size={18} className="text-primary" />
          <div className="leading-tight">
            <h2 className="font-bold">오늘의 수업</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {dateLabel} · {semesterLabel}
            </p>
          </div>
        </div>
        <Link
          href="/courses?tab=mine"
          className="text-xs text-muted-foreground hover:text-primary"
        >
          내 수강기록 →
        </Link>
      </div>

      {isLoading ? (
        <div className="mt-4 h-16 animate-pulse rounded-lg bg-muted" />
      ) : todaysCourses.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          오늘({dayChar})에 해당하는 수강과목이 없습니다.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {todaysCourses.map(({ offering: c, parsed }) => {
            const session = pickLatestSession(sessionsByCourse.get(c.id) ?? []);
            const mode: ClassSessionMode = session?.mode ?? "in_person";
            const timeLabel = fmtTimeRange(parsed) || c.schedule || "시간 미정";
            return (
              <li
                key={c.id}
                className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {c.courseName}
                    {c.professor && (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        · {c.professor}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {timeLabel}
                    {c.classroom && ` · ${c.classroom}`}
                  </p>
                  {session?.notes && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      📝 {session.notes}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                      MODE_COLORS[mode],
                    )}
                  >
                    {CLASS_SESSION_MODE_LABELS[mode]}
                  </span>
                  {session?.link && (
                    <a
                      href={session.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] text-primary hover:bg-primary/5"
                    >
                      입장 <ExternalLink size={11} />
                    </a>
                  )}
                  <Link
                    href={`/courses/${c.id}/schedule`}
                    className="rounded-md border px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted"
                  >
                    스케쥴
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
