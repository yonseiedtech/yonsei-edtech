"use client";

import { Badge } from "@/components/ui/badge";
import { Pencil, UserCircle } from "lucide-react";
import type { Seminar, SeminarSpeaker } from "@/types";

interface Props {
  seminar: Seminar;
  isStaff: boolean;
  onEdit: () => void;
}

function speakersFromSeminar(seminar: Seminar): SeminarSpeaker[] {
  if (seminar.speakers && seminar.speakers.length > 0) return seminar.speakers;
  if (!seminar.speaker) return [];
  return [
    {
      type: seminar.speakerType ?? "member",
      name: seminar.speaker,
      bio: seminar.speakerBio,
      affiliation: seminar.speakerAffiliation,
      position: seminar.speakerPosition,
      photoUrl: seminar.speakerPhotoUrl,
    },
  ];
}

function SpeakerBlock({ s, single }: { s: SeminarSpeaker; single: boolean }) {
  return (
    <div className={single ? "flex flex-col sm:flex-row items-start gap-6" : "flex items-start gap-4"}>
      {s.photoUrl ? (
        <img
          src={s.photoUrl}
          alt={s.name}
          className={
            single
              ? "h-24 w-24 shrink-0 rounded-full object-cover ring-4 ring-primary/10"
              : "h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-primary/10"
          }
        />
      ) : (
        <div
          className={
            single
              ? "flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-4 ring-primary/5"
              : "flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-2 ring-primary/5"
          }
        >
          <UserCircle size={single ? 40 : 28} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={single ? "text-lg font-bold" : "text-base font-semibold"}>{s.name}</span>
          {s.type === "guest" ? (
            <Badge variant="secondary" className="bg-amber-50 text-xs text-amber-700">
              GUEST SPEAKER
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">MEMBER</Badge>
          )}
          {s.studentId && (
            <span className="text-xs text-muted-foreground">학번 {s.studentId}</span>
          )}
        </div>
        {(s.affiliation || s.position) && (
          <p className="mt-1 text-sm text-muted-foreground">
            {[s.affiliation, s.position].filter(Boolean).join(" · ")}
          </p>
        )}
        {s.bio && (
          <p className={single ? "mt-3 text-sm leading-relaxed text-muted-foreground" : "mt-2 text-sm leading-relaxed text-muted-foreground"}>
            {s.bio}
          </p>
        )}
      </div>
    </div>
  );
}

export default function SpeakerCard({ seminar, isStaff, onEdit }: Props) {
  const speakers = speakersFromSeminar(seminar);
  if (speakers.length === 0) return null;
  const single = speakers.length === 1;

  return (
    <div className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          <UserCircle size={16} />
          연사 소개{!single && ` (${speakers.length}명)`}
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

      {single ? (
        <SpeakerBlock s={speakers[0]} single />
      ) : (
        <div className="space-y-5 divide-y divide-muted/40 [&>*+*]:pt-5">
          {speakers.map((s, i) => (
            <SpeakerBlock key={`${s.studentId ?? s.userId ?? s.name}-${i}`} s={s} single={false} />
          ))}
        </div>
      )}
    </div>
  );
}
