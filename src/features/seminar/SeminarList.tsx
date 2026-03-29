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

interface Props {
  seminars: Seminar[];
}

const STATUS_STYLES: Record<SeminarStatus, string> = {
  upcoming: "bg-primary/10 text-primary",
  ongoing: "bg-amber-100 text-amber-700",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

export default function SeminarList({ seminars }: Props) {
  const router = useRouter();

  if (seminars.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-12 text-center text-muted-foreground">
        세미나가 없습니다.
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
            className="block rounded-xl border bg-white p-6 transition-colors hover:bg-muted/30"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge className={cn("text-xs", badge.className)} variant="secondary">
                    {badge.label}
                  </Badge>
                  <h3 className="truncate text-lg font-semibold">{seminar.title}</h3>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {seminar.description}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
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
                    {seminar.attendeeIds.length}
                    {seminar.maxAttendees ? `/${seminar.maxAttendees}` : ""}명
                  </span>
                </div>
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
                  공간
                </Button>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
