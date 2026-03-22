"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getComputedStatus } from "@/lib/seminar-utils";
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
  const computedStatus = getComputedStatus(seminar);
  const badge = {
    label: SEMINAR_STATUS_LABELS[computedStatus],
    className: STATUS_STYLES[computedStatus],
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-white">
      <div className="relative h-48 sm:h-64 w-full">
        {seminar.posterUrl ? (
          <>
            <img
              src={seminar.posterUrl}
              alt={seminar.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5">
            <div className="text-center">
              <BookOpen size={48} className="mx-auto text-primary/30" />
              <p className="mt-2 text-sm text-primary/40 font-medium">세미나 포스터</p>
              {isStaff && (
                <button
                  onClick={onEditInfo}
                  className="mt-2 inline-flex items-center gap-1 rounded-md bg-white/80 px-3 py-1.5 text-xs text-muted-foreground shadow-sm hover:bg-white transition-colors"
                >
                  <Pencil size={12} />
                  포스터 이미지 등록
                </button>
              )}
            </div>
          </div>
        )}
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

        <h1 className={cn("mt-3 text-2xl font-bold sm:text-3xl", seminar.posterUrl ? "text-white drop-shadow-sm" : "text-foreground")}>
          {seminar.title}
        </h1>

        <div className={cn("mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm", seminar.posterUrl ? "text-white/90" : "text-muted-foreground")}>
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
              참석 {seminar.attendeeIds.length}
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
