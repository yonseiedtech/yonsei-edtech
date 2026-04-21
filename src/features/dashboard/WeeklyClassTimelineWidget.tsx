"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarRange } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  courseEnrollmentsApi,
  courseOfferingsApi,
} from "@/lib/bkend";
import type { CourseOffering } from "@/types";
import { inferCurrentSemester } from "@/lib/semester";
import {
  parseSchedule,
  fmtTimeRange,
  type ParsedSchedule,
} from "@/lib/courseSchedule";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"] as const;
// 화면에 그릴 요일 인덱스 (0=일~6=토 의 카운터 매핑이 아니라 표시 순서)
const DISPLAY_DAYS: { label: string; jsDay: number }[] = [
  { label: "월", jsDay: 1 },
  { label: "화", jsDay: 2 },
  { label: "수", jsDay: 3 },
  { label: "목", jsDay: 4 },
  { label: "금", jsDay: 5 },
  { label: "토", jsDay: 6 },
  { label: "일", jsDay: 0 },
];

const HOUR_START = 17; // 17:00
const HOUR_END = 23; // 23:00
const MIN_START = HOUR_START * 60;
const MIN_END = HOUR_END * 60;
const TOTAL_MIN = MIN_END - MIN_START;
const ROW_HEIGHT_PX = 48; // 시간당 48px

const COLORS = [
  "bg-blue-100 text-blue-800 border-blue-300",
  "bg-emerald-100 text-emerald-800 border-emerald-300",
  "bg-amber-100 text-amber-800 border-amber-300",
  "bg-purple-100 text-purple-800 border-purple-300",
  "bg-rose-100 text-rose-800 border-rose-300",
  "bg-cyan-100 text-cyan-800 border-cyan-300",
];

function semesterToTerm(semester: "first" | "second"): "spring" | "fall" {
  return semester === "first" ? "spring" : "fall";
}

interface PlacedClass {
  offering: CourseOffering;
  parsed: ParsedSchedule;
  jsDay: number;
  topPx: number;
  heightPx: number;
  colorIdx: number;
}

export default function WeeklyClassTimelineWidget() {
  const { user } = useAuthStore();
  const userId = user?.id;
  const now = new Date();
  const todayJsDay = now.getDay();
  const { year, semester } = inferCurrentSemester(now);
  const term = semesterToTerm(semester);

  const { data: enrollmentsRes } = useQuery({
    queryKey: ["my-enrollments", userId],
    queryFn: async () => {
      if (!userId) return { data: [], total: 0 };
      return await courseEnrollmentsApi.listByUser(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  const { data: offeringsRes, isLoading } = useQuery({
    queryKey: ["course-offerings", year, term],
    queryFn: () => courseOfferingsApi.listBySemester(year, term),
    staleTime: 1000 * 60 * 5,
  });

  const myOfferings: CourseOffering[] = useMemo(() => {
    const courseIds = new Set(
      (enrollmentsRes?.data ?? [])
        .filter((e) => e.year === year && e.term === term)
        .map((e) => e.courseOfferingId),
    );
    return (offeringsRes?.data ?? []).filter((o) => courseIds.has(o.id));
  }, [enrollmentsRes, offeringsRes, year, term]);

  // 색상은 강의ID 기준 안정적으로 매핑
  const colorMap = useMemo(() => {
    const m = new Map<string, number>();
    myOfferings.forEach((o, i) => m.set(o.id, i % COLORS.length));
    return m;
  }, [myOfferings]);

  // 요일×시간 그리드에 배치할 수 있는 강의만 필터·확장
  const placed: PlacedClass[] = useMemo(() => {
    const result: PlacedClass[] = [];
    for (const offering of myOfferings) {
      const parsed = parseSchedule(offering.schedule);
      if (
        parsed.startMin === null ||
        parsed.endMin === null ||
        parsed.weekdays.length === 0
      )
        continue;
      // 시간이 17~23 외라면 가시 영역에 클램프해서 표시
      const s = Math.max(MIN_START, parsed.startMin);
      const e = Math.min(MIN_END, parsed.endMin);
      if (e <= s) continue;
      const topPx = ((s - MIN_START) / 60) * ROW_HEIGHT_PX;
      const heightPx = ((e - s) / 60) * ROW_HEIGHT_PX;
      for (const jsDay of parsed.weekdays) {
        result.push({
          offering,
          parsed,
          jsDay,
          topPx,
          heightPx,
          colorIdx: colorMap.get(offering.id) ?? 0,
        });
      }
    }
    return result;
  }, [myOfferings, colorMap]);

  // 시간 미정 강의 (그리드에 배치 못함)
  const undated = useMemo(() => {
    return myOfferings.filter((o) => {
      const p = parseSchedule(o.schedule);
      return p.startMin === null || p.endMin === null || p.weekdays.length === 0;
    });
  }, [myOfferings]);

  if (!userId) return null;

  // 토/일 칼럼은 해당 요일에 강의가 있을 때만 표시
  const visibleDays = DISPLAY_DAYS.filter((d) => {
    if (d.jsDay !== 0 && d.jsDay !== 6) return true;
    return placed.some((p) => p.jsDay === d.jsDay);
  });

  const hourRows = Array.from(
    { length: HOUR_END - HOUR_START + 1 },
    (_, i) => HOUR_START + i,
  );

  return (
    <div className="rounded-2xl border bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarRange size={18} className="text-primary" />
          <div className="leading-tight">
            <h2 className="font-bold">주간 수업 타임라인</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {year}년 {term === "spring" ? "1학기" : "2학기"} · {HOUR_START}~
              {HOUR_END}시
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
        <div className="mt-4 h-72 animate-pulse rounded-lg bg-muted" />
      ) : myOfferings.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          이번 학기 수강 신청한 과목이 없습니다.
        </p>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto">
            <div
              className="grid min-w-[480px]"
              style={{
                gridTemplateColumns: `40px repeat(${visibleDays.length}, minmax(72px, 1fr))`,
              }}
            >
              {/* 헤더: 요일 칼럼 */}
              <div />
              {visibleDays.map((d) => (
                <div
                  key={d.label}
                  className={cn(
                    "border-b pb-1 text-center text-xs font-semibold",
                    d.jsDay === todayJsDay
                      ? "text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  {d.label}
                  {d.jsDay === todayJsDay && (
                    <span className="ml-1 inline-block rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] text-primary">
                      오늘
                    </span>
                  )}
                </div>
              ))}

              {/* 시간 라벨 칼럼 + 요일별 그리드 (단일 row, relative 컨테이너로 절대 배치) */}
              <div className="relative" style={{ height: ROW_HEIGHT_PX * (HOUR_END - HOUR_START) }}>
                {hourRows.slice(0, -1).map((h) => (
                  <div
                    key={h}
                    className="absolute right-1 -translate-y-2 text-[10px] text-muted-foreground"
                    style={{ top: (h - HOUR_START) * ROW_HEIGHT_PX }}
                  >
                    {h}
                  </div>
                ))}
                <div
                  key="last-hour"
                  className="absolute right-1 -translate-y-2 text-[10px] text-muted-foreground"
                  style={{ top: (HOUR_END - HOUR_START) * ROW_HEIGHT_PX }}
                >
                  {HOUR_END}
                </div>
              </div>

              {visibleDays.map((d) => {
                const dayItems = placed.filter((p) => p.jsDay === d.jsDay);
                return (
                  <div
                    key={d.label}
                    className={cn(
                      "relative border-l",
                      d.jsDay === todayJsDay && "bg-primary/5",
                    )}
                    style={{ height: ROW_HEIGHT_PX * (HOUR_END - HOUR_START) }}
                  >
                    {/* 시간 가이드 라인 */}
                    {hourRows.slice(1, -1).map((h) => (
                      <div
                        key={h}
                        className="absolute left-0 right-0 border-t border-dashed border-muted"
                        style={{ top: (h - HOUR_START) * ROW_HEIGHT_PX }}
                      />
                    ))}

                    {/* 강의 블럭 */}
                    {dayItems.map(({ offering, parsed, topPx, heightPx, colorIdx }) => (
                      <Link
                        key={`${offering.id}-${d.jsDay}`}
                        href={`/courses/${offering.id}/schedule`}
                        className={cn(
                          "absolute inset-x-1 overflow-hidden rounded-md border px-1.5 py-1 text-[10px] leading-tight shadow-sm transition-shadow hover:shadow",
                          COLORS[colorIdx],
                        )}
                        style={{
                          top: topPx,
                          height: Math.max(heightPx, 28),
                        }}
                        title={`${offering.courseName} · ${fmtTimeRange(parsed) || offering.schedule || ""}${offering.classroom ? ` · ${offering.classroom}` : ""}`}
                      >
                        <p className="truncate font-semibold">
                          {offering.courseName}
                        </p>
                        <p className="truncate text-[9px] opacity-80">
                          {fmtTimeRange(parsed)}
                        </p>
                        {offering.classroom && (
                          <p className="truncate text-[9px] opacity-70">
                            {offering.classroom}
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {undated.length > 0 && (
            <div className="mt-4 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <p className="font-medium">시간 미정 ({undated.length}개)</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                {undated.map((o) => (
                  <li key={o.id} className="truncate">
                    {o.courseName}
                    {o.schedule && ` · ${o.schedule}`}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
