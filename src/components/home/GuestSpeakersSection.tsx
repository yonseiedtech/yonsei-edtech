"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useSeminars } from "@/features/seminar/useSeminar";
import { Mic, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import type { Seminar } from "@/types";

function SpeakerCard({ s }: { s: Seminar }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-60, 60], [8, -8]);
  const rotateY = useTransform(x, [-60, 60], [-8, 8]);
  const sx = useSpring(rotateX, { stiffness: 200, damping: 18 });
  const sy = useSpring(rotateY, { stiffness: 200, damping: 18 });
  const glowX = useTransform(x, [-60, 60], ["20%", "80%"]);
  const glowY = useTransform(y, [-60, 60], ["20%", "80%"]);
  const glowBg = useMotionTemplate`radial-gradient(280px circle at ${glowX} ${glowY}, rgba(251,191,36,0.18), transparent 60%)`;

  function onMove(e: React.MouseEvent<HTMLAnchorElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    x.set(e.clientX - (r.left + r.width / 2));
    y.set(e.clientY - (r.top + r.height / 2));
  }
  function onLeave() { x.set(0); y.set(0); }

  return (
    <motion.a
      ref={ref}
      href={`/seminars/${s.id}`}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: sx, rotateY: sy, transformPerspective: 1000 }}
      className="group relative flex h-[360px] w-[260px] shrink-0 snap-center flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-2xl hover:shadow-amber-200/40"
    >
      {/* glow follows cursor */}
      <motion.div
        aria-hidden
        style={{ background: glowBg }}
        className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />

      {/* photo */}
      <div className="relative h-[60%] w-full overflow-hidden bg-gradient-to-br from-amber-50 via-white to-sky-50">
        {s.speakerPhotoUrl ? (
          <Image
            src={s.speakerPhotoUrl}
            alt={s.speaker}
            fill
            unoptimized
            className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-amber-400">
            <Mic size={64} strokeWidth={1.2} />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 z-20 text-white">
          <p className="text-base font-semibold leading-tight drop-shadow">{s.speaker}</p>
          <p className="mt-0.5 text-[11px] opacity-90">
            {[s.speakerAffiliation, s.speakerPosition].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      {/* meta */}
      <div className="flex flex-1 flex-col justify-between p-3.5">
        <p className="line-clamp-2 text-xs font-medium text-foreground">{s.title}</p>
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Calendar size={11} />
          {s.date}
        </div>
      </div>
    </motion.a>
  );
}

export default function GuestSpeakersSection() {
  const { seminars } = useSeminars();
  const scrollRef = useRef<HTMLDivElement>(null);
  const guests = seminars
    .filter((s) => s.speakerType === "guest")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12);

  if (guests.length === 0) return null;

  function scroll(dir: -1 | 1) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 280, behavior: "smooth" });
  }

  return (
    <section className="border-b py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Mic size={20} className="text-amber-600" />
              <h2 className="text-xl font-bold">우리 학회에 도움을 주신 연사분들</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              초청 연사 {guests.length}명 · 카드를 클릭하면 세미나 상세로 이동합니다.
            </p>
          </div>
          <div className="hidden gap-1 md:flex">
            <button
              onClick={() => scroll(-1)}
              aria-label="이전"
              className="rounded-full border bg-card p-2 shadow-sm transition-colors hover:bg-muted"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => scroll(1)}
              aria-label="다음"
              className="rounded-full border bg-card p-2 shadow-sm transition-colors hover:bg-muted"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="mt-6 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 pl-1 pr-4 [scrollbar-width:thin]"
        >
          {guests.map((s) => (
            <SpeakerCard key={s.id} s={s} />
          ))}
        </div>

        <div className="mt-2 text-right">
          <Link
            href="/seminars"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            전체 세미나 보기 →
          </Link>
        </div>
      </div>
    </section>
  );
}
