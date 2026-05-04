"use client";

/**
 * NextActionBanner
 * 대시보드 최상단 sticky 배너 — "지금 가장 가까운 액션 1건"을 노출.
 * 후보: 오늘의 수업(시작 시각 파싱) · 신청한 다가오는 세미나 · 마감 임박 강의 todo.
 * 우선순위: 시작/마감까지 남은 시간이 가장 짧은 항목 1건.
 *
 * - localStorage(`dashboard.nextActionBanner.hiddenUntil.<userId>`)로 "오늘 그만 보기"
 * - 30초마다 now 갱신 → 카운트다운 자연스럽게 갱신
 * - 24시간 안 후보 없으면 미노출
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  GraduationCap,
  ListTodo,
  Bell,
  BellOff,
  ChevronRight,
} from "lucide-react";
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

const HIDE_KEY_PREFIX = "dashboard.nextActionBanner.hiddenUntil";

/** 24h 이내 후보만 후보군에 포함 (지나간 것·매우 먼 것 제외) */
const LOOKAHEAD_MS = 24 * 60 * 60 * 1000;
/** 시작/마감 직전·직후 ±2h 까지는 "임박" 으로 취급 */
const IMMINENT_GRACE_MS = 2 * 60 * 60 * 1000;

type NextActionKind = "class" | "seminar" | "todo";

interface NextAction {
  id: string;
  kind: NextActionKind;
  title: string;
  subtitle: string;
  /** 기준 시각 (수업/세미나=시작, todo=마감) */
  startAt: Date;
  href: string;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function ymdToDate(ymd: string, h = 0, m = 0): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), h, m, 0);
}

/** "19:00", "19:00~21:00", "오후 7시" → 시작 HH:MM */
function extractStartHHMM(s: string | undefined | null): { h: number; m: number } | null {
  if (!s) return null;
  const m = /(\d{1,2})\s*[:시]\s*(\d{2})/.exec(s);
  if (!m) {
    // "19시" 같은 케이스
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

function formatRemaining(diffMs: number): string {
  if (diffMs < -IMMINENT_GRACE_MS) return "지남";
  if (diffMs <= 0) return "지금 시작";
  const totalMin = Math.floor(diffMs / 60_000);
  if (totalMin < 1) return "1분 이내";
  if (totalMin < 60) return `${totalMin}분 후`;
  const h = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  if (h < 24) return mm === 0 ? `${h}시간 후` : `${h}시간 ${mm}분 후`;
  const d = Math.floor(h / 24);
  return `${d}일 후`;
}

/** 잔여 시간에 따른 색상 — 부담 줄이기: 임계값(<=30분)만 강조, 나머지는 중성 */
function urgencyClass(diffMs: number): string {
  if (diffMs <= 30 * 60_000) return "border-rose-200 bg-rose-50/50";
  if (diffMs < 3 * 60 * 60_000) return "border-amber-200 bg-amber-50/40";
  return "border-slate-200 bg-white";
}

const KIND_META: Record<NextActionKind, { label: string; iconClass: string; Icon: typeof CalendarClock }> = {
  class: { label: "다음 수업", iconClass: "bg-emerald-100 text-emerald-700", Icon: GraduationCap },
  seminar: { label: "다음 세미나", iconClass: "bg-blue-100 text-blue-700", Icon: CalendarClock },
  todo: { label: "마감 임박 할 일", iconClass: "bg-amber-100 text-amber-700", Icon: ListTodo },
};

export default function NextActionBanner() {
  const { user } = useAuthStore();
  const userId = user?.id;
  const [now, setNow] = useState<Date>(() => new Date());
  const [hidden, setHidden] = useState<boolean>(false);

  // 30초마다 now 갱신 (카운트다운 자연 표시)
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // 사용자별 "오늘 그만 보기" 상태 복원
  useEffect(() => {
    if (typeof window === "undefined" || !userId) {
      setHidden(false);
      return;
    }
    const key = `${HIDE_KEY_PREFIX}.${userId}`;
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      setHidden(false);
      return;
    }
    const until = Number(raw);
    if (Number.isFinite(until) && until > Date.now()) setHidden(true);
    else {
      window.localStorage.removeItem(key);
      setHidden(false);
    }
  }, [userId]);

  function hideUntilTomorrow() {
    if (!userId) return;
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    t.setDate(t.getDate() + 1);
    window.localStorage.setItem(`${HIDE_KEY_PREFIX}.${userId}`, String(t.getTime()));
    setHidden(true);
  }

  function show() {
    if (!userId) return;
    window.localStorage.removeItem(`${HIDE_KEY_PREFIX}.${userId}`);
    setHidden(false);
  }

  // ── 데이터: 강의 todos (캐시 공유: MyTodosWidget 와 동일 키) ──
  const { data: courseTodosRes } = useQuery({
    queryKey: ["my-course-todos", userId],
    queryFn: async () => {
      if (!userId) return { data: [], total: 0 };
      return await courseTodosApi.listByUser(userId);
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
  const courseTodos = (courseTodosRes?.data ?? []) as CourseTodo[];

  // ── 데이터: 내 수강 + 학기 강의 ──
  const sem = inferCurrentSemester();
  const term = sem.semester === "first" ? "spring" : "fall";
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
    () => ((offeringsRes?.data ?? []) as CourseOffering[]).filter((o) => myCourseIds.includes(o.id)),
    [offeringsRes, myCourseIds],
  );

  // ── 데이터: 세미나 (전체 → 내 attendeeIds 필터) ──
  const { data: seminarsRes } = useQuery({
    queryKey: ["seminars", "next-action-banner"],
    queryFn: async () => await seminarsApi.list({ limit: 50 }),
    staleTime: 5 * 60_000,
  });
  const mySeminars = useMemo(
    () =>
      ((seminarsRes?.data ?? []) as Seminar[]).filter(
        (s) => userId && Array.isArray(s.attendeeIds) && s.attendeeIds.includes(userId),
      ),
    [seminarsRes, userId],
  );

  // ── 후보 계산 ──
  const candidates: NextAction[] = useMemo(() => {
    if (!userId) return [];
    const list: NextAction[] = [];
    const cutoff = now.getTime() + LOOKAHEAD_MS;
    const earliest = now.getTime() - IMMINENT_GRACE_MS;

    // 1) 오늘·내일 수업 (요일 + 시작시각 매칭)
    for (const o of myOfferings) {
      const parsed = parseSchedule(o.schedule);
      if (parsed.startMin == null || parsed.weekdays.length === 0) continue;
      // 오늘부터 1일 후까지 두 번 확인
      for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
        const d = new Date(now);
        d.setDate(d.getDate() + dayOffset);
        const wd = d.getDay();
        if (!parsed.weekdays.includes(wd)) continue;
        const startAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
        startAt.setMinutes(parsed.startMin);
        const t = startAt.getTime();
        if (t < earliest || t > cutoff) continue;
        list.push({
          id: `class:${o.id}:${dayOffset}`,
          kind: "class",
          title: o.courseName,
          subtitle: o.classroom ? `${o.classroom}` : "수업 시작",
          startAt,
          href: `/courses/${o.id}/schedule`,
        });
      }
    }

    // 2) 다가오는 세미나 (date + time 시작 시각 파싱)
    for (const s of mySeminars) {
      const hhmm = extractStartHHMM(s.time);
      const startAt = ymdToDate(s.date, hhmm?.h ?? 9, hhmm?.m ?? 0);
      if (!startAt) continue;
      const t = startAt.getTime();
      if (t < earliest || t > cutoff) continue;
      list.push({
        id: `seminar:${s.id}`,
        kind: "seminar",
        title: s.title,
        subtitle: s.location ?? "세미나",
        startAt,
        href: `/seminars/${s.id}`,
      });
    }

    // 3) 마감 임박 강의 todo (오늘 마감 + 내일 마감, 미완료만)
    for (const t of courseTodos) {
      if (t.completed) continue;
      if (!t.dueDate) continue;
      const due = ymdToDate(t.dueDate, 23, 59);
      if (!due) continue;
      const ts = due.getTime();
      if (ts < earliest || ts > cutoff) continue;
      list.push({
        id: `todo:${t.id}`,
        kind: "todo",
        title: t.content,
        subtitle: "강의 할 일",
        startAt: due,
        href: `/dashboard`,
      });
    }

    list.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
    return list;
  }, [now, userId, myOfferings, mySeminars, courseTodos]);

  const top = candidates[0];

  if (!user) return null;

  // 숨김 상태일 때는 작은 "다시 보기" 버튼만
  if (hidden) {
    return (
      <div className="mx-auto flex max-w-6xl items-center justify-end px-4 pt-1">
        <button
          type="button"
          onClick={show}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/50"
          aria-label="다음 액션 배너 다시 보기"
        >
          <BellOff size={12} />
          다음 액션 배너 숨김
        </button>
      </div>
    );
  }

  if (!top) return null;

  const diffMs = top.startAt.getTime() - now.getTime();
  const remainingLabel = formatRemaining(diffMs);
  const meta = KIND_META[top.kind];
  const Icon = meta.Icon;
  const urgent = urgencyClass(diffMs);
  const timeLabel = `${pad2(top.startAt.getHours())}:${pad2(top.startAt.getMinutes())}`;

  // ≤30분은 chip-bold 색상, 그 외는 부드러운 muted chip
  const remainChipClass =
    diffMs <= 30 * 60_000
      ? "bg-rose-600 text-white"
      : diffMs <= 3 * 60 * 60_000
        ? "bg-amber-100 text-amber-900"
        : "bg-slate-100 text-slate-700";

  return (
    <div className="mx-auto max-w-6xl px-4 pt-1">
      <Link
        href={top.href}
        className={cn(
          "group flex items-center gap-2 rounded-xl border px-3 py-1.5 transition-colors hover:bg-muted/30 sm:gap-3 sm:py-2",
          urgent,
        )}
        role="status"
        aria-label={`${meta.label} 바로가기: ${top.title}`}
      >
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
            meta.iconClass,
          )}
          aria-hidden="true"
        >
          <Icon size={14} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-foreground">
              {top.title}
            </span>
            <span
              className={cn(
                "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                remainChipClass,
              )}
            >
              {remainingLabel}
            </span>
          </div>
          <p className="truncate text-[11px] text-muted-foreground">
            <span>{meta.label}</span>
            <span className="mx-1" aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{timeLabel}</span>
            {top.subtitle && (
              <>
                <span className="mx-1" aria-hidden="true">·</span>
                <span>{top.subtitle}</span>
              </>
            )}
          </p>
        </div>
        <ChevronRight
          size={14}
          className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            hideUntilTomorrow();
          }}
          className="ml-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60"
          aria-label="오늘 하루 이 배너 숨기기"
          title="오늘 하루 숨기기"
        >
          <Bell size={12} />
        </button>
      </Link>
    </div>
  );
}
