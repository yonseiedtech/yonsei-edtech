"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Seminar, SeminarStatus } from "@/types";
import { SEMINAR_STATUS_LABELS } from "@/types";
import { getComputedStatus } from "@/lib/seminar-utils";
import { Calendar, MapPin, Users, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAttendees } from "@/features/seminar/useSeminar";
import { formatSemester } from "@/lib/semester";

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

const STATUS_STYLES: Record<SeminarStatus, string> = {
  draft: "bg-gray-100 text-gray-500",
  upcoming: "bg-primary/10 text-primary",
  ongoing: "bg-amber-100 text-amber-700",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

export default function SeminarList({ seminars, viewMode = "list" }: Props) {
  const router = useRouter();

  if (seminars.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-12 text-center text-muted-foreground">
        세미나가 없습니다.
      </div>
    );
  }

  if (viewMode === "gallery") {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {seminars.map((seminar) => {
          const computed = getComputedStatus(seminar);
          const badge = { label: SEMINAR_STATUS_LABELS[computed], className: STATUS_STYLES[computed] };
          return (
            <Link
              key={seminar.id}
              href={`/seminars/${seminar.id}`}
              className="flex flex-col rounded-xl border bg-white p-5 transition-colors hover:bg-muted/30"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge className={cn("text-xs", badge.className)} variant="secondary">
                  {badge.label}
                </Badge>
                {(seminar.year || seminar.semester) && (
                  <Badge variant="secondary" className="bg-blue-50 text-[10px] text-blue-700">
                    {formatSemester(seminar.year, seminar.semester)}
                  </Badge>
                )}
              </div>
              <h3 className="mt-2 text-base font-semibold leading-snug line-clamp-2">
                {seminar.title}
              </h3>
              <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">
                {seminar.description}
              </p>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar size={12} />
                  {seminar.date} {seminar.time}
                </div>
                <div className="flex items-center gap-1">
                  <MapPin size={12} />
                  {seminar.location}
                </div>
                <div className="flex items-center gap-1">
                  <Users size={12} />
                  <ParticipantCount seminar={seminar} />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t pt-3">
                <span className="text-xs font-medium text-primary">발표: {seminar.speaker}</span>
                {computed !== "cancelled" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      router.push(`/seminars/${seminar.id}/lms`);
                    }}
                  >
                    <BookOpen size={12} />
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

  return (
    <div className="grid gap-4">
      {seminars.map((seminar) => {
        const computed = getComputedStatus(seminar);
        const badge = { label: SEMINAR_STATUS_LABELS[computed], className: STATUS_STYLES[computed] };
        return (
          <Link
            key={seminar.id}
            href={`/seminars/${seminar.id}`}
            className="block rounded-xl border bg-white p-4 transition-colors hover:bg-muted/30 sm:p-6"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <Badge className={cn("text-xs", badge.className)} variant="secondary">
                  {badge.label}
                </Badge>
                {(seminar.year || seminar.semester) && (
                  <Badge variant="secondary" className="bg-blue-50 text-[10px] text-blue-700">
                    {formatSemester(seminar.year, seminar.semester)}
                  </Badge>
                )}
                <h3 className="text-base font-semibold leading-snug sm:text-lg">{seminar.title}</h3>
              </div>
              <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground sm:mt-2 sm:text-sm">
                {seminar.description}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground sm:mt-3 sm:gap-x-4 sm:text-sm">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {seminar.date} {seminar.time}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={14} />
                  {seminar.location}
                </span>
                <span className="flex items-center gap-1">
                  <Users size={14} />
                  <ParticipantCount seminar={seminar} />
                </span>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-primary font-medium">
                발표: {seminar.speaker}
              </span>
              {computed !== "cancelled" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/seminars/${seminar.id}/lms`);
                  }}
                >
                  <BookOpen size={14} />
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
