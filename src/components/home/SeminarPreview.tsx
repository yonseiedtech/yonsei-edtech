"use client";

import Link from "next/link";
import { useSeminars } from "@/features/seminar/useSeminar";
import { Calendar, MapPin, ArrowRight } from "lucide-react";

export default function SeminarPreview() {
  const { seminars, isLoading } = useSeminars("upcoming");

  const upcoming = [...seminars]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 2);

  if (!isLoading && upcoming.length === 0) return null;

  return (
    <section className="border-b py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-amber-600" />
            <h2 className="text-xl font-bold">예정 세미나</h2>
          </div>
          <Link
            href="/seminars"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            전체보기 <ArrowRight size={14} />
          </Link>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {upcoming.map((seminar) => (
            <Link
              key={seminar.id}
              href={`/seminars/${seminar.id}`}
              className="rounded-xl border bg-white p-6 transition-colors hover:bg-muted/30"
            >
              <h3 className="text-lg font-semibold">{seminar.title}</h3>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                {seminar.description}
              </p>
              <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar size={14} />
                  <span>{seminar.date} {seminar.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={14} />
                  <span>{seminar.location}</span>
                </div>
              </div>
              <div className="mt-3 text-xs text-primary font-medium">
                발표: {seminar.speaker}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
