"use client";

/**
 * SemesterCalendarWidget — 이번 학기 주요 일정 (service-enhancement-plan-v5 M3)
 *
 * 콘솔 academic-calendar(site_settings `academic_calendar`)의 활성 학기 항목에서
 * 다가오는 마일스톤(개강·중간·기말·종강·방학종료)을 D-day 순으로 3~5건 노출한다.
 *
 * 설계 원칙:
 *  - 데이터(활성 학기·다가오는 일정)가 없으면 위젯 자체를 렌더하지 않는다(빈 상태 잔소리 금지).
 *  - 읽기 비용 0: AcademicCalendarProgress 와 동일한 queryKey(useAcademicCalendar)를 재사용해
 *    react-query 캐시를 공유하므로 추가 조회가 발생하지 않는다.
 */

import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  GraduationCap,
  PencilLine,
  FileCheck2,
  PartyPopper,
  Sun,
} from "lucide-react";
import {
  useAcademicCalendar,
  pickActiveEntry,
  type AcademicCalendarEntry,
} from "@/features/site-settings/useAcademicCalendar";
import { cn } from "@/lib/utils";
import { SEMANTIC, type SemanticTone } from "@/lib/design-tokens";
import WidgetCard from "@/components/ui/widget-card";

interface MilestoneDef {
  key: keyof AcademicCalendarEntry;
  label: string;
  icon: LucideIcon;
  tone: SemanticTone;
}

const MILESTONES: MilestoneDef[] = [
  { key: "semesterStart", label: "개강", icon: GraduationCap, tone: "info" },
  { key: "midtermStart", label: "중간고사 시작", icon: PencilLine, tone: "warning" },
  { key: "midtermEnd", label: "중간고사 종료", icon: PencilLine, tone: "warning" },
  { key: "finalStart", label: "기말고사 시작", icon: FileCheck2, tone: "danger" },
  { key: "finalEnd", label: "기말고사 종료", icon: FileCheck2, tone: "danger" },
  { key: "semesterEnd", label: "종강", icon: PartyPopper, tone: "success" },
  { key: "breakEnd", label: "다음 학기 개강", icon: Sun, tone: "info" },
];

/** KST 기준 오늘(자정)을 UTC 앵커 Date 로 — 자정~09시 사이 어제 판정 방지 */
function kstToday(now: Date): Date {
  const kst = new Date(now.getTime() + 9 * 3600000);
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()));
}

function parseYmd(s: string | undefined | null): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s.trim());
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function formatMonthDay(d: Date): string {
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

/** D-day 긴급도에 따른 배지 톤 — 3일 이내 danger, 7일 이내 warning, 그 외 중립 */
function ddayTone(days: number): SemanticTone {
  if (days <= 3) return "danger";
  if (days <= 7) return "warning";
  return "default";
}

interface UpcomingItem {
  label: string;
  icon: LucideIcon;
  tone: SemanticTone;
  date: Date;
  days: number;
}

export default function SemesterCalendarWidget() {
  const { value, isLoading } = useAcademicCalendar();

  // 로딩 중에는 스켈레톤 대신 미노출 — 데이터 확정 후에만 나타나 깜빡임(flash) 방지.
  // (AcademicCalendarProgress 가 동일 쿼리를 이미 채우므로 대개 즉시 확정됨)
  if (isLoading) return null;

  const entry = pickActiveEntry(value.entries);
  if (!entry) return null;

  const today = kstToday(new Date());
  const upcoming: UpcomingItem[] = MILESTONES.map((m) => {
    const date = parseYmd(entry[m.key] as string | undefined);
    if (!date) return null;
    const days = diffDays(today, date);
    if (days < 0) return null; // 이미 지난 일정 제외
    return { label: m.label, icon: m.icon, tone: m.tone, date, days };
  })
    .filter((x): x is UpcomingItem => x !== null)
    .sort((a, b) => a.days - b.days)
    .slice(0, 5);

  // 다가오는 일정이 없으면 위젯 미노출
  if (upcoming.length === 0) return null;

  const semesterLabel = `${entry.year}년 ${entry.semester === "first" ? "1학기" : "2학기"}`;

  return (
    <WidgetCard
      title={`이번 학기 주요 일정 — ${semesterLabel}`}
      icon={CalendarDays}
      priority="secondary"
    >
      <ul className="mt-4 space-y-1.5">
        {upcoming.map((item) => {
          const badgeTone = ddayTone(item.days);
          return (
            <li
              key={item.label}
              className="flex items-center gap-3 rounded-lg px-2 py-2"
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  SEMANTIC[item.tone].chipBg,
                )}
              >
                <item.icon size={16} className={SEMANTIC[item.tone].accent} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{formatMonthDay(item.date)}</p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums",
                  SEMANTIC[badgeTone].chip,
                )}
              >
                {item.days === 0 ? "D-DAY" : `D-${item.days}`}
              </span>
            </li>
          );
        })}
      </ul>
    </WidgetCard>
  );
}
