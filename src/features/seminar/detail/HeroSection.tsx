"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getComputedStatus } from "@/lib/seminar-utils";
import { useAttendees } from "@/features/seminar/useSeminar";
import { SEMINAR_STATUS_LABELS } from "@/types";
import type { Seminar, SeminarStatus } from "@/types";
import {
  Calendar,
  MapPin,
  Users,
  Video,
  BookOpen,
  AlertCircle,
  Pencil,
} from "lucide-react";

const STATUS_STYLES: Record<SeminarStatus, string> = {
  upcoming: "bg-primary/10 text-primary",
  ongoing: "bg-amber-100 text-amber-700",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

interface Props {
  seminar: Seminar;
  isStaff: boolean;
  onEditInfo: () => void;
}

export default function HeroSection({ seminar, isStaff, onEditInfo }: Props) {
  const { attendees } = useAttendees(seminar.id);
  const attendeeCount = attendees.length > 0 ? attendees.length : seminar.attendeeIds.length;
  const computedStatus = getComputedStatus(seminar);
  const badge = {
    label: SEMINAR_STATUS_LABELS[computedStatus],
    className: STATUS_STYLES[computedStatus],
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-white">
      <div className="relative h-48 sm:h-64 w-full">
        <>
          <img
            src={seminar.posterUrl || "/yonsei-campus.jpg"}
            alt={seminar.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
          {isStaff && !seminar.posterUrl && (
            <button
              onClick={onEditInfo}
              className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-md bg-white/80 px-3 py-1.5 text-xs text-muted-foreground shadow-sm hover:bg-white transition-colors"
            >
              <Pencil size={12} />
              포스터 변경
            </button>
          )}
        </>
      </div>

      <div className="p-8 relative -mt-20 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={cn("text-xs", badge.className, "shadow-sm")} variant="secondary">
              {badge.label}
            </Badge>
            {seminar.isOnline && (
              <Badge variant="secondary" className="bg-blue-50 text-xs text-blue-700">
                ONLINE
              </Badge>
            )}
          </div>
          {isStaff && (
            <button
              onClick={onEditInfo}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="편집"
            >
              <Pencil size={14} />
            </button>
          )}
        </div>

        {computedStatus === "cancelled" && seminar.cancelReason && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertCircle size={16} className="shrink-0 text-red-500" />
            <span>취소 사유: {seminar.cancelReason}</span>
          </div>
        )}

        <h1 className="mt-3 text-2xl font-bold sm:text-3xl text-white" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
          {seminar.title}
        </h1>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/90" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
          <div className="flex items-center gap-2">
            <Calendar size={16} />
            <span>{seminar.date} {seminar.time}</span>
          </div>
          <div className="flex items-center gap-2">
            {seminar.isOnline ? <Video size={16} className="text-blue-400" /> : <MapPin size={16} />}
            <span>{seminar.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users size={16} />
            <span>
              참석 {attendeeCount}
              {seminar.maxAttendees ? ` / ${seminar.maxAttendees}` : ""}명
            </span>
          </div>
        </div>

        {seminar.isOnline && seminar.onlineUrl && (
          <div className="mt-2">
            <a
              href={seminar.onlineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 underline hover:text-blue-800"
            >
              <Video size={14} />
              ZOOM 접속 링크
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
