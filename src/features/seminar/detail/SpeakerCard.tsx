"use client";

import { Badge } from "@/components/ui/badge";
import { Pencil, UserCircle } from "lucide-react";
import type { Seminar } from "@/types";

interface Props {
  seminar: Seminar;
  isStaff: boolean;
  onEdit: () => void;
}

export default function SpeakerCard({ seminar, isStaff, onEdit }: Props) {
  return (
    <div className="mt-6 rounded-2xl border bg-white p-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          <UserCircle size={16} />
          연사 소개
        </h2>
        {isStaff && (
          <button
            onClick={onEdit}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="편집"
          >
            <Pencil size={14} />
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-start gap-6">
        {seminar.speakerPhotoUrl ? (
          <img
            src={seminar.speakerPhotoUrl}
            alt={seminar.speaker}
            className="h-24 w-24 shrink-0 rounded-full object-cover ring-4 ring-primary/10"
          />
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-4 ring-primary/5">
            <UserCircle size={40} />
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">{seminar.speaker}</span>
            {seminar.speakerType === "guest" ? (
              <Badge variant="secondary" className="bg-amber-50 text-xs text-amber-700">
                GUEST SPEAKER
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                MEMBER
              </Badge>
            )}
          </div>
          {(seminar.speakerAffiliation || seminar.speakerPosition) && (
            <p className="mt-1 text-sm text-muted-foreground">
              {[seminar.speakerAffiliation, seminar.speakerPosition].filter(Boolean).join(" · ")}
            </p>
          )}
          {seminar.speakerBio && (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {seminar.speakerBio}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
