"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Seminar, SeminarStatus } from "@/types";
import { SEMINAR_STATUS_LABELS } from "@/types";
import { getComputedStatus } from "@/lib/seminar-utils";
import { Calendar, MapPin, Users, BookOpen, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAttendees } from "@/features/seminar/useSeminar";
import { formatSemester } from "@/lib/semester";
import EmptyState from "@/components/ui/empty-state";

interface Props {
  seminars: Seminar[];
  viewMode?: "list" | "gallery";
}

/**
 * 세미나 카드 1건의 참가자 수 라벨.
 * - 우선순위: 실시간 attendees(체크인 + 신청 통합) → seminars.attendeeIds (denorm fallback)
 * - HeroSection 과 동일한 로직으로 일관성 유지.
 */
function ParticipantCount({ seminar }: { seminar: Seminar }) {
  const { attendees } = useAttendees(seminar.id);
  const count = attendees.length > 0 ? attendees.length : seminar.attendeeIds.length;
  return (
    <>
      {count}
      {seminar.maxAttendees ? `/${seminar.maxAttendees}` : ""}명
    </>
  );
}

/**
 * 세미나 카드의 발표자 표시 — 다중 연사 지원.
 * speakers 배열이 비어있으면 legacy speaker 단일 필드로 폴백.
 */
function speakerDisplay(s: Seminar): string {
  const list = s.speakers ?? [];
  const names = list
    .map((sp) => sp.name?.trim())
    .filter((n): n is string => !!n);
  if (names.length > 0) return names.join(", ");
  return s.speaker;
}

/** 상태 배지 스타일: light + dark 모두 명시 */
const STATUS_STYLES: Record<SeminarStatus, string> = {
  draft:
    "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  upcoming:
    "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary",
  ongoing:
    "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  completed:
    "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  cancelled:
    "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400",
};

/** 학기 배지 — light + dark */
const SEMESTER_BADGE_CLASS =
  "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300";

/** 카드 좌측 액센트 — 진행 중인 세미나만 */
const LEFT_ACCENT: Partial<Record<SeminarStatus, string>> = {
  upcoming: "border-l-2 border-l-primary",
  ongoing: "border-l-2 border-l-amber-400",
};

export default function SeminarList({ seminars, viewMode = "list" }: Props) {
  const router = useRouter();

  if (seminars.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="해당하는 세미나가 없습니다"
        description="다른 필터를 선택하거나 검색어를 바꿔보세요."
      />
    );
  }

  /* ── 갤러리 모드 ── */
  if (viewMode === "gallery") {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {seminars.map((seminar) => {
          const computed = getComputedStatus(seminar);
          const badgeClass = STATUS_STYLES[computed];
          const accentClass = LEFT_ACCENT[computed] ?? "";
          const speaker = speakerDisplay(seminar);

          return (
            <Link
              key={seminar.id}
              href={`/seminars/${seminar.id}`}
              className={cn(
                "group flex flex-col rounded-2xl border bg-card p-5 shadow-sm",
                "transition-shadow duration-200 hover:shadow-md",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                accentClass,
              )}
            >
              {/* 배지 행 */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    badgeClass,
                  )}
                >
                  {SEMINAR_STATUS_LABELS[computed]}
                </span>
                {(seminar.year || seminar.semester) && (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                      SEMESTER_BADGE_CLASS,
                    )}
                  >
                    {formatSemester(seminar.year, seminar.semester)}
                  </span>
                )}
              </div>

              {/* 제목 */}
              <h3 className="mt-2.5 line-clamp-2 text-sm font-semibold leading-snug tracking-tight text-foreground sm:text-base">
                {seminar.title}
              </h3>

              {/* 설명 */}
              {seminar.description && (
                <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                  {seminar.description}
                </p>
              )}

              {/* 메타 정보 */}
              <div className="mt-auto pt-3 space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar size={11} aria-hidden />
                  <span>{seminar.date}{seminar.time ? ` ${seminar.time}` : ""}</span>
                </div>
                {seminar.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin size={11} aria-hidden />
                    <span className="truncate">{seminar.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Users size={11} aria-hidden />
                  <ParticipantCount seminar={seminar} />
                </div>
              </div>

              {/* 발표자 + 학습공간 */}
              <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
                {speaker && (
                  <span className="flex min-w-0 items-center gap-1 text-xs font-medium text-primary">
                    <Mic size={11} aria-hidden className="shrink-0" />
                    <span className="truncate">{speaker}</span>
                  </span>
                )}
                {computed !== "cancelled" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 shrink-0 gap-1 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      router.push(`/seminars/${seminar.id}/lms`);
                    }}
                  >
                    <BookOpen size={11} aria-hidden />
                    학습공간
                  </Button>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    );
  }

  /* ── 리스트 모드 ── */
  return (
    <div className="grid gap-3">
      {seminars.map((seminar) => {
        const computed = getComputedStatus(seminar);
        const badgeClass = STATUS_STYLES[computed];
        const accentClass = LEFT_ACCENT[computed] ?? "";
        const speaker = speakerDisplay(seminar);

        return (
          <Link
            key={seminar.id}
            href={`/seminars/${seminar.id}`}
            className={cn(
              "group block rounded-2xl border bg-card shadow-sm",
              "transition-shadow duration-200 hover:shadow-md",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              accentClass,
            )}
          >
            <div className="p-4 sm:p-5">
              {/* 배지 행 */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    badgeClass,
                  )}
                >
                  {SEMINAR_STATUS_LABELS[computed]}
                </span>
                {(seminar.year || seminar.semester) && (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                      SEMESTER_BADGE_CLASS,
                    )}
                  >
                    {formatSemester(seminar.year, seminar.semester)}
                  </span>
                )}
              </div>

              {/* 제목 */}
              <h3 className="mt-2 text-sm font-semibold leading-snug tracking-tight text-foreground sm:text-base lg:text-lg">
                {seminar.title}
              </h3>

              {/* 설명 */}
              {seminar.description && (
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  {seminar.description}
                </p>
              )}

              {/* 메타 정보 행 */}
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground sm:mt-3 sm:text-sm">
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} aria-hidden />
                  {seminar.date}{seminar.time ? ` ${seminar.time}` : ""}
                </span>
                {seminar.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={13} aria-hidden />
                    {seminar.location}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Users size={13} aria-hidden />
                  <ParticipantCount seminar={seminar} />
                </span>
              </div>

              {/* 발표자 + 학습공간 */}
              <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
                {speaker && (
                  <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-primary">
                    <Mic size={12} aria-hidden className="shrink-0" />
                    <span className="truncate">{speaker}</span>
                  </span>
                )}
                {computed !== "cancelled" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 shrink-0 gap-1.5 px-2.5 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/seminars/${seminar.id}/lms`);
                    }}
                  >
                    <BookOpen size={13} aria-hidden />
                    학습공간
                  </Button>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
