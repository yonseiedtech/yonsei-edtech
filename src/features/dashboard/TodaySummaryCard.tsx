"use client";

/**
 * TodaySummaryCard — 모바일 상단 "오늘 요약" 통합 카드.
 *
 * 데스크톱(`sm:hidden`)에서는 숨기고 모바일에서만 노출.
 * NextActionBanner + 오늘 수업 1줄 + 오늘 마감 todo 1줄 을 한 카드로 통합.
 *
 * 데이터 공유:
 * - 강의 todos       : ["my-course-todos", userId]   (NextActionBanner·MyTodosWidget 와 동일 캐시)
 * - 강의 수강         : ["my-enrollments", userId]    (위와 동일)
 * - 학기 강의         : ["course-offerings", year, term]
 * - 신청 세미나       : ["seminars", undefined]
 */

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, GraduationCap, ListTodo, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  courseEnrollmentsApi,
  courseOfferingsApi,
  courseTodosApi,
  seminarsApi,
} from "@/lib/bkend";
import { parseSchedule } from "@/lib/courseSchedule";
import { inferCurrentSemester } from "@/lib/semester";
import {
  type CourseEnrollment,
  type CourseOffering,
  type CourseTodo,
  type Seminar,
} from "@/types";
import { cn } from "@/lib/utils";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function extractStartHHMM(s: string | undefined | null): { h: number; m: number } | null {
  if (!s) return null;
  const m = /(\d{1,2})\s*[:시]\s*(\d{2})/.exec(s);
  if (!m) {
    const hOnly = /(\d{1,2})\s*시/.exec(s);
    if (!hOnly) return null;
    const h = Number(hOnly[1]);
    if (h < 0 || h > 23) return null;
    return { h, m: 0 };
  }
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return { h, m: mm };
}

interface TodayClass {
  id: string;
  name: string;
  startLabel: string; // "HH:MM"
  href: string;
}

interface TodayTodo {
  id: string;
  content: string;
}

export default function TodaySummaryCard({ variant = "card" }: { variant?: "card" | "inline" } = {}) {
  const { user } = useAuthStore();
  const userId = user?.id;

  // ── 오늘 ──
  // 모듈 호출은 1회만 — useMemo 로 안정화 (deps=[] : 페이지 진입 시점 기준 "오늘")
  const { todayWeekday, todayYmd, nowMin, sem } = useMemo(() => {
    const n = new Date();
    const ymd = `${n.getFullYear()}-${pad2(n.getMonth() + 1)}-${pad2(n.getDate())}`;
    return {
      todayWeekday: n.getDay(),
      todayYmd: ymd,
      nowMin: n.getHours() * 60 + n.getMinutes(),
      sem: inferCurrentSemester(n),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const term = sem.semester === "first" ? "spring" : "fall";

  // ── 강의 todos ──
  const { data: courseTodosRes } = useQuery({
    queryKey: ["my-course-todos", userId],
    queryFn: async () => {
      if (!userId) return { data: [], total: 0 };
      return await courseTodosApi.listByUser(userId);
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
  const courseTodos = useMemo(
    () => (courseTodosRes?.data ?? []) as CourseTodo[],
    [courseTodosRes],
  );

  // ── 수강 + 학기 강의 ──
  const { data: enrollmentsRes } = useQuery({
    queryKey: ["my-enrollments", userId],
    queryFn: async () => {
      if (!userId) return { data: [], total: 0 };
      return await courseEnrollmentsApi.listByUser(userId);
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });
  const myCourseIds = useMemo(
    () =>
      ((enrollmentsRes?.data ?? []) as CourseEnrollment[])
        .filter((e) => e.year === sem.year && e.term === term)
        .map((e) => e.courseOfferingId),
    [enrollmentsRes, sem.year, term],
  );

  const { data: offeringsRes } = useQuery({
    queryKey: ["course-offerings", sem.year, term],
    queryFn: () => courseOfferingsApi.listBySemester(sem.year, term),
    staleTime: 5 * 60_000,
  });
  const myOfferings: CourseOffering[] = useMemo(
    () =>
      ((offeringsRes?.data ?? []) as CourseOffering[]).filter((o) =>
        myCourseIds.includes(o.id),
      ),
    [offeringsRes, myCourseIds],
  );

  // ── 세미나 ──
  const { data: seminarsAll } = useQuery({
    queryKey: ["seminars", undefined],
    queryFn: async () => {
      const res = await seminarsApi.list({ limit: 200 });
      return res.data as unknown as Seminar[];
    },
    staleTime: 5 * 60_000,
  });

  // ── 오늘 수업 1건 ──
  const todayClass: TodayClass | null = useMemo(() => {
    if (!userId) return null;
    const candidates: { offering: CourseOffering; startMin: number }[] = [];
    for (const o of myOfferings) {
      const parsed = parseSchedule(o.schedule);
      if (parsed.startMin == null || parsed.weekdays.length === 0) continue;
      if (!parsed.weekdays.includes(todayWeekday)) continue;
      candidates.push({ offering: o, startMin: parsed.startMin });
    }
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => a.startMin - b.startMin);
    // 미래 우선, 모두 지났으면 가장 늦은 것
    const upcoming = candidates.find((c) => c.startMin >= nowMin) ?? candidates[0];
    const h = Math.floor(upcoming.startMin / 60);
    const m = upcoming.startMin % 60;
    return {
      id: upcoming.offering.id,
      name: upcoming.offering.courseName,
      startLabel: `${pad2(h)}:${pad2(m)}`,
      href: `/courses/${upcoming.offering.id}/schedule`,
    };
  }, [myOfferings, userId, todayWeekday, nowMin]);

  // ── 오늘 세미나 1건 (날짜 일치) ──
  const todaySeminar = useMemo(() => {
    if (!userId || !seminarsAll) return null;
    const mine = (seminarsAll ?? []).filter(
      (s) => Array.isArray(s.attendeeIds) && s.attendeeIds.includes(userId),
    );
    const todayList = mine.filter((s) => s.date === todayYmd);
    if (todayList.length === 0) return null;
    const top = todayList[0];
    const hhmm = extractStartHHMM(top.time);
    const startLabel = hhmm ? `${pad2(hhmm.h)}:${pad2(hhmm.m)}` : "";
    return {
      id: top.id,
      title: top.title,
      startLabel,
      href: `/seminars/${top.id}`,
    };
  }, [seminarsAll, userId, todayYmd]);

  // ── 오늘 마감 todo 1건 (미완료, dueDate==today) ──
  const todayDueTodo: TodayTodo | null = useMemo(() => {
    const open = courseTodos.filter((t) => !t.completed && t.dueDate === todayYmd);
    if (open.length === 0) return null;
    const top = open[0];
    return { id: top.id, content: top.content };
  }, [courseTodos, todayYmd]);

  if (!user) return null;

  // 표시할 데이터 0건이면 카드 자체 숨김
  if (!todayClass && !todaySeminar && !todayDueTodo) return null;

  return (
    <section
      className={variant === "inline" ? "mt-3 border-t pt-3 sm:hidden" : "sm:hidden"}
      aria-label="오늘 요약"
    >
      <div className={variant === "inline" ? "" : "rounded-2xl border bg-card p-3 shadow-sm"}>
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
          <CalendarClock size={12} className="text-primary" />
          오늘 요약
        </div>
        <ul className="space-y-1">
          {todayClass && (
            <li>
              <Link
                href={todayClass.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg border bg-emerald-50/50 px-2.5 py-1.5",
                  "text-[12px] transition-colors hover:bg-emerald-50",
                )}
              >
                <GraduationCap size={14} className="shrink-0 text-emerald-700" />
                <span className="shrink-0 font-mono text-[11px] tabular-nums text-emerald-800">
                  {todayClass.startLabel}
                </span>
                <span className="flex-1 truncate font-medium">{todayClass.name}</span>
                <ChevronRight
                  size={12}
                  className="shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </Link>
            </li>
          )}
          {todaySeminar && (
            <li>
              <Link
                href={todaySeminar.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg border bg-blue-50/50 px-2.5 py-1.5",
                  "text-[12px] transition-colors hover:bg-blue-50",
                )}
              >
                <CalendarClock size={14} className="shrink-0 text-blue-700" />
                {todaySeminar.startLabel && (
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-blue-800">
                    {todaySeminar.startLabel}
                  </span>
                )}
                <span className="flex-1 truncate font-medium">{todaySeminar.title}</span>
                <ChevronRight
                  size={12}
                  className="shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </Link>
            </li>
          )}
          {todayDueTodo && (
            <li>
              <Link
                href="/dashboard"
                className={cn(
                  "flex items-center gap-2 rounded-lg border bg-amber-50/50 px-2.5 py-1.5",
                  "text-[12px] transition-colors hover:bg-amber-50",
                )}
                aria-label={`오늘 마감 할 일: ${todayDueTodo.content}`}
              >
                <ListTodo size={14} className="shrink-0 text-amber-700" />
                <span className="shrink-0 text-[10px] font-semibold text-amber-800">
                  오늘 마감
                </span>
                <span className="flex-1 truncate font-medium">{todayDueTodo.content}</span>
                <ChevronRight
                  size={12}
                  className="shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </Link>
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}
