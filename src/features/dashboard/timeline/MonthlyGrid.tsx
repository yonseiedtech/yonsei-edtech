"use client";

/**
 * MonthlyGrid — 월간 캘린더 (사이클 114, 사용자 요청 — 안 A)
 * 시간표 위젯 월간 뷰. 수업(요일 반복)과 세미나(특정 날짜)를 한 달력에 점으로 표시.
 * 하단에 덩그러니 있던 세미나 캘린더(miniCalendar)를 시간표 영역으로 통합.
 *
 * UI 개선:
 *  - 날짜 셀 hover(데스크톱)/tap(모바일) 시 그날의 수업·세미나 상세를 팝오버로 표시.
 *  - 세미나 항목에 온/오프(대면/온라인) 배지 노출.
 *  - 콘텐츠 최소 높이를 주간 뷰 기준(TIMELINE_MIN_CONTENT_PX)으로 맞춰 뷰 전환 시 점프 방지.
 */

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SEMINAR_MODE_BADGE,
  SEMINAR_MODE_LABEL,
  TIMELINE_MIN_CONTENT_PX,
  type MonthSeminar,
} from "./types";

const WD = ["일", "월", "화", "수", "목", "금", "토"];

function fmtYmd(y: number, m0: number, d: number): string {
  return `${y}-${String(m0 + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

interface MonthlyGridProps {
  /** 수업이 있는 요일 집합 (0=일 ~ 6=토) — parsedOfferings.parsed.weekdays 플랫 */
  classWeekdays: number[];
  /**
   * 수업 기간 목록 (선택) — 제공되면 요일+날짜가 개강~종강 기간 안일 때만 마커 표시.
   * (방학 달에 수업 점이 계속 찍히던 문제의 기간 인지 버전)
   */
  classPeriods?: { weekdays: number[]; start: string; end: string }[];
  /** 세미나 날짜(YYYY-MM-DD) → 세미나 항목(제목 + 온/오프 모드) 배열 */
  seminarsByDate: Map<string, MonthSeminar[]>;
  /** 오늘 YYYY-MM-DD */
  todayYmd: string;
  /** 날짜 클릭 시 (일간 전환 등) */
  onPickDate?: (ymd: string) => void;
}

export function MonthlyGrid({
  classWeekdays,
  classPeriods,
  seminarsByDate,
  todayYmd,
  onPickDate,
}: MonthlyGridProps) {
  const [ty, tm] = todayYmd.split("-").map(Number);
  const [cur, setCur] = useState({ y: ty, m: tm - 1 }); // m: 0-based
  // 모바일 탭 토글용 — 현재 상세가 열린 날짜(YYYY-MM-DD). null 이면 닫힘.
  const [openYmd, setOpenYmd] = useState<string | null>(null);

  const classWd = useMemo(() => new Set(classWeekdays), [classWeekdays]);

  const cells = useMemo(() => {
    const startWd = new Date(cur.y, cur.m, 1).getDay();
    const daysInMonth = new Date(cur.y, cur.m + 1, 0).getDate();
    const out: { ymd: string; day: number; inMonth: boolean; wd: number }[] = [];
    // 앞 패딩 (이전 달 말일들)
    for (let i = 0; i < startWd; i++) {
      const d = new Date(cur.y, cur.m, 1 - (startWd - i));
      out.push({
        ymd: fmtYmd(d.getFullYear(), d.getMonth(), d.getDate()),
        day: d.getDate(),
        inMonth: false,
        wd: d.getDay(),
      });
    }
    // 이번 달
    for (let d = 1; d <= daysInMonth; d++) {
      out.push({
        ymd: fmtYmd(cur.y, cur.m, d),
        day: d,
        inMonth: true,
        wd: new Date(cur.y, cur.m, d).getDay(),
      });
    }
    // 뒤 패딩 (다음 달 초)
    const trailing = (7 - (out.length % 7)) % 7;
    for (let i = 1; i <= trailing; i++) {
      const d = new Date(cur.y, cur.m + 1, i);
      out.push({
        ymd: fmtYmd(d.getFullYear(), d.getMonth(), d.getDate()),
        day: i,
        inMonth: false,
        wd: d.getDay(),
      });
    }
    return out;
  }, [cur]);

  const monthLabel = `${cur.y}년 ${cur.m + 1}월`;

  function shift(delta: number) {
    setOpenYmd(null);
    setCur((c) => {
      const nm = c.m + delta;
      return { y: c.y + Math.floor(nm / 12), m: ((nm % 12) + 12) % 12 };
    });
  }

  return (
    <div
      className="mt-3 flex flex-col"
      style={{ minHeight: TIMELINE_MIN_CONTENT_PX }}
    >
      {/* 월 네비 */}
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted"
          aria-label="이전 달"
        >
          <ChevronLeft size={15} />
        </button>
        <p className="text-sm font-semibold">{monthLabel}</p>
        <button
          type="button"
          onClick={() => shift(1)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted"
          aria-label="다음 달"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted-foreground">
        {WD.map((w, i) => (
          <div key={w} className={cn(i === 0 && "text-rose-500", i === 6 && "text-blue-500")}>
            {w}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 — flex-1 로 남은 높이를 채워 주간 뷰와 바닥 라인 정렬 */}
      <div className="mt-1 grid flex-1 grid-cols-7 gap-1">
        {cells.map((c) => {
          const hasClass =
            c.inMonth &&
            (classPeriods
              ? classPeriods.some(
                  (pd) => pd.weekdays.includes(c.wd) && c.ymd >= pd.start && c.ymd <= pd.end,
                )
              : classWd.has(c.wd));
          const seminars = seminarsByDate.get(c.ymd);
          const hasSeminar = !!seminars && seminars.length > 0;
          const isToday = c.ymd === todayYmd;
          const interactive = !!onPickDate && c.inMonth;
          const hasDetail = c.inMonth && (hasClass || hasSeminar);
          const isOpen = openYmd === c.ymd;
          // 접근성/툴팁 폴백 — 호버 팝오버를 못 쓰는 환경 대비 native title
          const titleText = hasDetail
            ? [
                hasClass ? "수업 있음" : null,
                hasSeminar
                  ? seminars!
                      .map((s) => `세미나: ${s.title} (${SEMINAR_MODE_LABEL[s.mode]})`)
                      .join(", ")
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")
            : undefined;
          return (
            <div key={c.ymd} className="group relative">
              <button
                type="button"
                disabled={!interactive}
                onClick={() => {
                  // 모바일: 상세가 있으면 먼저 탭으로 펼치고, 다시 누르면 날짜 선택
                  if (hasDetail && !isOpen) {
                    setOpenYmd(c.ymd);
                    return;
                  }
                  setOpenYmd(null);
                  interactive && onPickDate?.(c.ymd);
                }}
                title={titleText}
                aria-expanded={hasDetail ? isOpen : undefined}
                className={cn(
                  "flex min-h-[42px] w-full flex-col items-center rounded-lg border p-1 text-[11px] transition-colors",
                  c.inMonth ? "bg-card" : "bg-muted/20 text-muted-foreground/50",
                  isToday && "border-primary ring-1 ring-primary/40",
                  interactive && "hover:bg-primary/5",
                )}
              >
                <span
                  className={cn(
                    "font-medium",
                    c.wd === 0 && c.inMonth && "text-rose-500",
                    c.wd === 6 && c.inMonth && "text-blue-500",
                    isToday && "text-primary",
                  )}
                >
                  {c.day}
                </span>
                <span className="mt-auto flex items-center gap-0.5 pt-1">
                  {hasClass && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-label="수업" />
                  )}
                  {hasSeminar && (
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-500" aria-label="세미나" />
                  )}
                </span>
              </button>

              {/* 상세 팝오버 — 데스크톱 hover(group-hover) + 모바일 tap(isOpen) */}
              {hasDetail && (
                <div
                  className={cn(
                    "pointer-events-none absolute left-1/2 top-full z-20 mt-1 w-44 -translate-x-1/2 rounded-lg border bg-card p-2 text-left shadow-lg transition-opacity",
                    "opacity-0 group-hover:pointer-events-auto group-hover:opacity-100",
                    isOpen && "pointer-events-auto opacity-100",
                  )}
                  role="tooltip"
                >
                  <p className="mb-1 text-[10px] font-semibold text-muted-foreground">
                    {Number(c.ymd.slice(5, 7))}월 {Number(c.ymd.slice(8, 10))}일
                  </p>
                  {hasClass && (
                    <div className="flex items-center gap-1 py-0.5">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span className="text-[11px] text-foreground">수업 있음</span>
                    </div>
                  )}
                  {hasSeminar &&
                    seminars!.map((s) => (
                      <div key={s.id} className="flex items-center gap-1 py-0.5">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                        <span className="truncate text-[11px] text-foreground" title={s.title}>
                          {s.title}
                        </span>
                        <span
                          className={cn(
                            "ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium",
                            SEMINAR_MODE_BADGE[s.mode],
                          )}
                        >
                          {SEMINAR_MODE_LABEL[s.mode]}
                        </span>
                      </div>
                    ))}
                  {interactive && (
                    <p className="mt-1 border-t pt-1 text-[9px] text-muted-foreground">
                      한 번 더 누르면 이 날로 이동
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="mt-2 flex items-center justify-center gap-3 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" /> 수업
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500" /> 세미나
        </span>
        <span className="inline-flex items-center gap-1">
          <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-medium", SEMINAR_MODE_BADGE.online)}>
            온라인
          </span>
          <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-medium", SEMINAR_MODE_BADGE.offline)}>
            대면
          </span>
        </span>
      </div>
    </div>
  );
}
