/**
 * 대내 학술대회(미니 학술대회) 목록 — 대외 학술대회 `/activities/external` 미러.
 *
 * 대외는 Firestore activities(type=external) 문서를 렌더하지만, 대내 학술대회는
 * 현재 코드 레지스트리(INTERNAL_CONFERENCES) 기반이다. 해커톤(8/22)이 activities
 * 문서가 아니므로 문서 기반으로 하면 빈 목록이 되어 "첫 행사로 해커톤 노출" 요구를
 * 위반한다. 운영진 문서 기반 생성으로의 확장은
 * docs/plans/internal-conference-2026-07-21.md 참조.
 */

import Link from "next/link";
import { CalendarDays, Clock, MapPin, Trophy, ArrowRight } from "lucide-react";
import PageContainer from "@/components/ui/page-container";
import PageHeader from "@/components/ui/page-header";
import { Separator } from "@/components/ui/separator";
import EmptyState from "@/components/ui/empty-state";
import { formatDday } from "@/lib/dday";
import { cn } from "@/lib/utils";
import {
  INTERNAL_CONFERENCES,
  getConferenceStatus,
  type InternalConference,
  type InternalConferenceStatus,
} from "@/features/internal-conference/conferences";

export const metadata = {
  title: "대내 학술대회",
  description:
    "연세교육공학회가 주최하는 대내 학술대회(미니 학술대회). 해커톤·심포지엄 등 구성원과 함께 만드는 학술 행사입니다.",
};

const STATUS_LABELS: Record<InternalConferenceStatus, string> = {
  upcoming: "예정",
  ongoing: "진행 중",
  completed: "완료",
};

const STATUS_COLORS: Record<InternalConferenceStatus, string> = {
  upcoming: "bg-primary/10 text-primary",
  ongoing: "bg-accent/10 text-accent",
  completed: "bg-muted text-muted-foreground",
};

function ConferenceCard({ conference }: { conference: InternalConference }) {
  const status = getConferenceStatus(conference);
  const dday = status === "completed" ? null : formatDday(conference.date);

  return (
    <Link
      href={conference.hubHref}
      className="group flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
          <Trophy size={12} />
          {conference.tagline}
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
            STATUS_COLORS[status],
          )}
        >
          {STATUS_LABELS[status]}
        </span>
      </div>

      <h3 className="mt-3 text-lg font-bold leading-snug">{conference.title}</h3>
      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
        {conference.description}
      </p>

      <div className="mt-4 flex flex-col gap-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CalendarDays size={12} className="shrink-0 text-primary" />
          {conference.date}
          {conference.dayLabel ? ` (${conference.dayLabel})` : ""}
          {dday && (
            <span className="ml-1 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
              {dday.label}
            </span>
          )}
        </span>
        {conference.timeLabel && (
          <span className="flex items-center gap-1.5">
            <Clock size={12} className="shrink-0 text-primary" />
            {conference.timeLabel}
          </span>
        )}
        {conference.place && (
          <span className="flex items-center gap-1.5">
            <MapPin size={12} className="shrink-0 text-primary" />
            {conference.place}
          </span>
        )}
      </div>

      <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
        행사 허브 보기 <ArrowRight size={12} />
      </span>
    </Link>
  );
}

export default function InternalConferencesPage() {
  // 예정·진행 우선(가까운 날짜순) → 완료(최근순)
  const conferences = [...INTERNAL_CONFERENCES].sort((a, b) => {
    const aDone = getConferenceStatus(a) === "completed";
    const bDone = getConferenceStatus(b) === "completed";
    if (aDone !== bDone) return aDone ? 1 : -1;
    return aDone
      ? b.date.localeCompare(a.date)
      : a.date.localeCompare(b.date);
  });

  return (
    <PageContainer width="wide">
      <div className="animate-in fade-in slide-in-from-bottom-2 py-8 duration-300 sm:py-14">
        <div className="mx-auto max-w-6xl px-4">
          <PageHeader
            icon={<Trophy size={24} />}
            title="대내 학술대회"
            description="연세교육공학회가 주최하는 미니 학술대회입니다. 해커톤·심포지엄 등 구성원과 함께 문제를 정의하고 해법을 나눕니다."
          />

          <Separator className="mt-6" />

          {conferences.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="예정된 대내 학술대회가 없어요"
              description="새로운 미니 학술대회가 준비되면 이곳에 표시됩니다. 다른 학술활동을 둘러보세요."
              className="mt-6"
              actions={[
                { label: "대외 학술대회 보기", href: "/activities/external", variant: "default" },
                { label: "세미나 둘러보기", href: "/seminars", variant: "outline" },
              ]}
            />
          ) : (
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {conferences.map((c) => (
                <ConferenceCard key={c.slug} conference={c} />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
