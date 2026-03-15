"use client";

import { useSeminars } from "@/features/seminar/useSeminar";
import { Mic } from "lucide-react";

export default function GuestSpeakersSection() {
  const { seminars } = useSeminars();
  const guestSeminars = seminars
    .filter((s) => s.speakerType === "guest")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);

  if (guestSeminars.length === 0) return null;

  return (
    <section className="border-b py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center gap-2">
          <Mic size={20} className="text-amber-600" />
          <h2 className="text-xl font-bold">우리 학회에 도움을 주신 연사분들</h2>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {guestSeminars.map((s) => (
            <div
              key={s.id}
              className="flex items-start gap-4 rounded-xl border bg-white p-5 shadow-sm"
            >
              {s.speakerPhotoUrl ? (
                <img
                  src={s.speakerPhotoUrl}
                  alt={s.speaker}
                  className="h-14 w-14 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                  <Mic size={20} />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-medium">{s.speaker}</p>
                <p className="text-xs text-muted-foreground">
                  {[s.speakerAffiliation, s.speakerPosition].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {s.date} · {s.title}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
