"use client";

import Link from "next/link";
import { useSeminars } from "@/features/seminar/useSeminar";
import type { Seminar } from "@/types";
import { Calendar, MapPin, ArrowRight } from "lucide-react";

function speakerDisplay(s: Seminar): string {
  const names =
    s.speakers
      ?.map((sp) => sp.name?.trim())
      .filter((n): n is string => !!n) ?? [];
  if (names.length > 0) return names.join(", ");
  return s.speaker;
}

export default function SeminarPreview() {
  const { seminars, isLoading } = useSeminars("upcoming");

  const upcoming = [...seminars]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 2);

  if (!isLoading && upcoming.length === 0) return null;

  return (
    <section className="border-b py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <Calendar size={18} aria-hidden />
            </div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">예정 세미나</h2>
          </div>
          <Link
            href="/seminars"
            className="group inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
          >
            전체보기
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {upcoming.map((seminar) => (
            <Link
              key={seminar.id}
              href={`/seminars/${seminar.id}`}
              className="group rounded-2xl border bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <h3 className="text-lg font-bold tracking-tight transition-colors group-hover:text-primary">{seminar.title}</h3>
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {seminar.description}
              </p>
              <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar size={14} aria-hidden />
                  <span>{seminar.date} {seminar.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={14} aria-hidden />
                  <span>{seminar.location}</span>
                </div>
              </div>
              <div className="mt-3 text-xs font-semibold text-primary">
                발표: {speakerDisplay(seminar)}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
