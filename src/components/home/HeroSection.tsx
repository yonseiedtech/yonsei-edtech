"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useAnimationFrame, useInView, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { profilesApi, seminarsApi, activitiesApi } from "@/lib/bkend";
import type { User } from "@/types";

function useHeroStats() {
  const users = useQuery({
    queryKey: ["hero", "users"],
    queryFn: () => profilesApi.list({ limit: 500 }),
    staleTime: 1000 * 60 * 10,
  });
  const seminars = useQuery({
    queryKey: ["hero", "seminars"],
    queryFn: () => seminarsApi.list({ limit: 1 }),
    staleTime: 1000 * 60 * 10,
  });
  const projects = useQuery({
    queryKey: ["hero", "projects"],
    queryFn: () => activitiesApi.list("project"),
    staleTime: 1000 * 60 * 10,
  });

  const stats = useMemo(() => {
    const memberCount = users.data?.total ?? 0;
    const maxGen = (users.data?.data ?? []).reduce(
      (max: number, u: User) => (typeof u.generation === "number" && u.generation > max ? u.generation : max),
      0,
    );
    const seminarCount = seminars.data?.total ?? 0;
    const projectCount = projects.data?.total ?? 0;
    return [
      { value: maxGen, suffix: "기", label: "현재 기수" },
      { value: memberCount, suffix: "명", label: "회원" },
      { value: seminarCount, suffix: "회", label: "세미나" },
      { value: projectCount, suffix: "개", label: "프로젝트" },
    ];
  }, [users.data, seminars.data, projects.data]);

  return stats;
}

function CountUp({ target, suffix, inView }: { target: number; suffix: string; inView: boolean }) {
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const controls = { stop: false };
    const start = performance.now();
    const duration = 1200;
    function tick(t: number) {
      if (controls.stop) return;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      mv.set(target * eased);
      setDisplay(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    return () => { controls.stop = true; };
  }, [inView, target, mv]);
  return <span>{display}{suffix}</span>;
}

function AuroraBackground() {
  const b1x = useMotionValue(0);
  const b1y = useMotionValue(0);
  const b2x = useMotionValue(0);
  const b2y = useMotionValue(0);
  useAnimationFrame((t) => {
    const s = t / 1000;
    b1x.set(Math.sin(s * 0.3) * 40);
    b1y.set(Math.cos(s * 0.25) * 30);
    b2x.set(Math.cos(s * 0.2) * 50);
    b2y.set(Math.sin(s * 0.35) * 40);
  });
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        style={{ x: b1x, y: b1y }}
        className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-primary/25 blur-3xl"
      />
      <motion.div
        style={{ x: b2x, y: b2y }}
        className="absolute -right-16 top-20 h-96 w-96 rounded-full bg-sky-300/30 blur-3xl"
      />
      <motion.div
        style={{ x: b2y, y: b1x }}
        className="absolute bottom-[-4rem] left-1/3 h-72 w-72 rounded-full bg-amber-200/30 blur-3xl"
      />
    </div>
  );
}

function MagneticLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useSpring(0, { stiffness: 200, damping: 18 });
  const y = useSpring(0, { stiffness: 200, damping: 18 });
  function onMove(e: React.MouseEvent<HTMLAnchorElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * 0.25);
    y.set((e.clientY - (r.top + r.height / 2)) * 0.25);
  }
  function onLeave() { x.set(0); y.set(0); }
  return (
    <motion.a
      ref={ref}
      href={href}
      style={{ x, y }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={className}
    >
      {children}
    </motion.a>
  );
}

function TiltCard({ children }: { children: React.ReactNode }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-40, 40], [6, -6]);
  const rotateY = useTransform(x, [-40, 40], [-6, 6]);
  const sx = useSpring(rotateX, { stiffness: 200, damping: 18 });
  const sy = useSpring(rotateY, { stiffness: 200, damping: 18 });
  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    x.set(e.clientX - (r.left + r.width / 2));
    y.set(e.clientY - (r.top + r.height / 2));
  }
  function onLeave() { x.set(0); y.set(0); }
  return (
    <motion.div
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: sx, rotateY: sy, transformPerspective: 800 }}
      className="will-change-transform"
    >
      {children}
    </motion.div>
  );
}

export default function HeroSection() {
  const statsRef = useRef<HTMLDivElement>(null);
  const inView = useInView(statsRef, { once: true, amount: 0.4 });
  const stats = useHeroStats();

  return (
    <section className="relative overflow-hidden border-b py-20 md:py-28">
      <AuroraBackground />
      <div className="relative mx-auto max-w-6xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border bg-white/70 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <Sparkles size={12} className="text-primary" />
          이번 학기 세미나·프로젝트 모집 중
        </motion.div>

        <div className="grid items-center gap-12 md:grid-cols-5">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="md:col-span-3"
          >
            <div className="flex items-center gap-2">
              <Image
                src="/yonsei-emblem.svg"
                alt="연세대학교 엠블럼"
                width={24}
                height={24}
                className="h-6 w-6"
              />
              <p className="text-sm font-medium tracking-wide text-primary">
                연세대학교 교육공학 학술 커뮤니티
              </p>
            </div>

            <h1 className="mt-4 text-3xl font-bold leading-snug text-foreground md:text-5xl md:leading-snug">
              교육의 미래를
              <br />
              <span className="bg-gradient-to-r from-primary via-sky-500 to-indigo-500 bg-clip-text text-transparent">
                함께 설계합니다
              </span>
            </h1>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
              에듀테크, 교수설계, 학습과학 분야의 최신 트렌드를 연구하고
              공유합니다. 매 학기 세미나와 프로젝트를 중심으로 활동합니다.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
              <MagneticLink
                href="/about"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90"
              >
                학회 소개
                <ArrowRight size={15} />
              </MagneticLink>
              <Link
                href="/activities"
                className="inline-flex items-center gap-2 rounded-xl border bg-white/80 px-5 py-2.5 text-sm font-medium text-foreground shadow-sm backdrop-blur transition-colors hover:bg-white"
              >
                활동 둘러보기
              </Link>
            </div>
          </motion.div>

          <motion.div
            ref={statsRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="md:col-span-2"
          >
            <TiltCard>
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border/80 shadow-xl shadow-primary/5">
                {stats.map((stat) => (
                  <div key={stat.label} className="bg-white/90 p-6 text-center backdrop-blur">
                    <div className="text-2xl font-bold text-foreground">
                      <CountUp target={stat.value} suffix={stat.suffix} inView={inView} />
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </TiltCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
