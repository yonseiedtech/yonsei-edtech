"use client";

import Link from "next/link";
import type { Seminar } from "@/types";
import { Calendar, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  seminars: Seminar[];
}

const STATUS_BADGE: Record<Seminar["status"], { label: string; className: string }> = {
  upcoming: { label: "예정", className: "bg-primary/10 text-primary" },
  completed: { label: "완료", className: "bg-muted text-muted-foreground" },
  cancelled: { label: "취소", className: "bg-destructive/10 text-destructive" },
};

export default function SeminarList({ seminars }: Props) {
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
        const badge = STATUS_BADGE[seminar.status];
        return (
          <Link
            key={seminar.id}
            href={`/seminars/${seminar.id}`}
            className="rounded-xl border bg-white p-6 transition-colors hover:bg-muted/30"
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
            <div className="mt-2 text-xs text-primary font-medium">
              발표: {seminar.speaker}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
