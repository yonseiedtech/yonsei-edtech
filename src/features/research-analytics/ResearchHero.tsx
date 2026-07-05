"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion, AnimatePresence } from "framer-motion";
import { BookOpen, Hash, TrendingUp, GraduationCap, Search, Users, Award } from "lucide-react";

/* ──────────────────────────────────────────
   Props
────────────────────────────────────────── */
export type PersonaNavTarget = "keyword" | "lineage" | "method";

export interface ResearchHeroProps {
  total: number;
  yearRange: string;
  keywordCount: number;
  topKeywords: { word: string; count: number }[];
  eras: { label: string; range: string; count: number; highlight: string }[];
  /** QA-v3 H16: 페르소나 CTA — 존재하지 않는 #앵커 대신 페이지가 탭 전환·스크롤을 수행 */
  onPersonaNav?: (target: PersonaNavTarget) => void;
}

/* ──────────────────────────────────────────
   Count-up hook
────────────────────────────────────────── */
function useCountUp(target: number, duration = 1800, active = true) {
  const [value, setValue] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!active) return;
    if (reduced) { setValue(target); return; }
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      // easeOutExpo
      const ease = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setValue(Math.round(ease * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, active, reduced]);

  return value;
}

/* ──────────────────────────────────────────
   Stat card
────────────────────────────────────────── */
interface StatCardProps {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  suffix?: string;
  delay?: number;
  active: boolean;
}

function StatCard({ icon, value, label, suffix = "", delay = 0, active }: StatCardProps) {
  const numeric = typeof value === "number" ? value : 0;
  const counted = useCountUp(numeric, 1600, active);
  const display = typeof value === "number" ? counted.toLocaleString() : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={active ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className="
        relative flex flex-col items-center gap-2 rounded-2xl p-5
        border border-white/15
        bg-white/8 backdrop-blur-md
        shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_32px_rgba(0,0,0,0.25)]
        hover:bg-white/12 hover:border-white/25
        transition-colors duration-300
        dark:bg-white/5 dark:border-white/10
      "
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white/90 dark:bg-white/10">
        {icon}
      </span>
      <span
        className="text-3xl font-black tabular-nums tracking-tight text-white"
        style={{ fontFamily: "'Noto Serif KR', 'Hahmlet', serif" }}
        aria-label={`${display}${suffix}`}
      >
        {display}
        {suffix && <span className="ml-0.5 text-lg font-semibold opacity-75">{suffix}</span>}
      </span>
      <span className="text-center text-[11.5px] font-medium leading-snug text-white/65">
        {label}
      </span>
    </motion.div>
  );
}

/* ──────────────────────────────────────────
   Floating keyword tag
────────────────────────────────────────── */
// UX(2026-07-04): 보라 계열 3종 제거 — 블루·틸·앰버 중심 (히어로가 정신없다는 피드백)
// QA-v3 H9: 흰 12px 글자 기준 대비 4:1+ 확보 — 밝은 sky/amber/teal 톤은 판독 불가였음
const GRADIENT_PAIRS: [string, string][] = [
  ["#1d4ed8", "#0369a1"], // blue-700 → sky-800
  ["#0369a1", "#0e7490"], // sky-800 → cyan-700
  ["#0f766e", "#0369a1"], // teal-700 → sky-800
  ["#b45309", "#92400e"], // amber-700 → amber-800
  ["#2563eb", "#1e40af"], // blue-600 → blue-800
  ["#155e75", "#164e63"], // cyan-800 → cyan-900
];

function pickGradient(word: string): [string, string] {
  let h = 0;
  for (let i = 0; i < word.length; i++) h = (h * 31 + word.charCodeAt(i)) >>> 0;
  return GRADIENT_PAIRS[h % GRADIENT_PAIRS.length];
}

interface FloatingTagProps {
  word: string;
  count: number;
  index: number;
  total: number;
  reduced: boolean | null;
}

function FloatingTag({ word, count, index, total, reduced }: FloatingTagProps) {
  const [from, to] = pickGradient(word);
  // stagger delay: evenly spread the first 12 items, rest collapse
  const delay = (index / Math.min(total, 12)) * 0.6;
  // subtle drift animation offset — deterministic per index
  const driftY = ((index * 37 + 11) % 10) - 5; // -5 to +5 px
  const driftDuration = 2.8 + (index % 5) * 0.4; // 2.8~4.4 s

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: reduced ? 0 : [0, driftY, 0],
      }}
      transition={{
        opacity: { duration: 0.4, delay },
        scale: { duration: 0.4, delay, ease: "backOut" },
        y: reduced
          ? {}
          : {
              duration: driftDuration,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
              delay: delay + 0.5,
            },
      }}
      className="
        inline-flex cursor-default select-none items-center rounded-full
        px-3 py-1 text-[12px] font-semibold text-white shadow-md
        hover:scale-110 hover:shadow-lg
        transition-transform duration-200
      "
      style={{
        background: `linear-gradient(135deg, ${from}, ${to})`,
        boxShadow: `0 2px 12px ${from}55`,
      }}
      title={`${word} · ${count}편`}
    >
      {word}
    </motion.span>
  );
}

/* ──────────────────────────────────────────
   Era timeline
────────────────────────────────────────── */
interface EraNodeProps {
  era: { label: string; range: string; count: number; highlight: string };
  index: number;
  total: number;
  active: boolean;
}

function EraNode({ era, index, total, active }: EraNodeProps) {
  const isLast = index === total - 1;
  return (
    <motion.li
      initial={{ opacity: 0, x: -16 }}
      animate={active ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.45, delay: 0.3 + index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-start gap-3 min-w-0"
    >
      {/* connector */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className="h-3 w-3 rounded-full border-2 border-white/60 bg-white/30 shrink-0 mt-0.5
            ring-2 ring-white/20"
        />
        {!isLast && (
          <div className="w-px flex-1 mt-1 min-h-[24px] bg-gradient-to-b from-white/30 to-white/5" />
        )}
      </div>
      {/* content */}
      <div className="pb-4 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span
            className="text-[11px] font-bold text-white/90 tracking-wide uppercase"
            style={{ fontFamily: "'Noto Serif KR', serif" }}
          >
            {era.label}
          </span>
          <span className="text-[10px] text-white/50 tabular-nums">{era.range}</span>
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-white/80 tabular-nums">
            {era.count}편
          </span>
        </div>
        <p className="mt-0.5 text-[11.5px] leading-snug text-white/60 line-clamp-2">
          {era.highlight}
        </p>
      </div>
    </motion.li>
  );
}

/* ──────────────────────────────────────────
   Persona CTA
────────────────────────────────────────── */
interface PersonaCTAItem {
  icon: React.ReactNode;
  label: string;
  desc: string;
  target: PersonaNavTarget;
  color: string;
}

function PersonaCTA({ item, index, active, onNav }: { item: PersonaCTAItem; index: number; active: boolean; onNav?: (t: PersonaNavTarget) => void }) {
  return (
    <motion.button
      type="button"
      onClick={() => onNav?.(item.target)}
      initial={{ opacity: 0, y: 20 }}
      animate={active ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: 0.55 + index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="
        group flex flex-col gap-2 rounded-2xl p-4
        border border-white/12 bg-white/6 backdrop-blur-sm
        hover:bg-white/12 hover:border-white/25
        transition-colors duration-300 cursor-pointer no-underline
        dark:bg-white/4 dark:border-white/8
      "
      aria-label={item.label}
    >
      <span
        className="flex h-8 w-8 items-center justify-center rounded-xl text-white/90"
        style={{ background: item.color }}
      >
        {item.icon}
      </span>
      <span className="text-[11px] font-bold text-white/90 leading-snug">{item.label}</span>
      <span className="text-[10.5px] text-white/55 leading-snug">{item.desc}</span>
    </motion.button>
  );
}

/* ──────────────────────────────────────────
   Main component
────────────────────────────────────────── */
export default function ResearchHero({
  total,
  yearRange,
  keywordCount,
  topKeywords,
  eras,
  onPersonaNav,
}: ResearchHeroProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const reduced = useReducedMotion();

  // year span number (e.g. "2001 – 2024" → 23)
  const yearSpan = (() => {
    const parts = yearRange.split(/\s*[–—-]\s*/);
    if (parts.length !== 2) return null;
    const [a, b] = parts.map(Number);
    return isNaN(a) || isNaN(b) ? null : b - a + 1;
  })();

  const personas: PersonaCTAItem[] = [
    {
      icon: <GraduationCap size={16} />,
      label: "진학을 고민한다면",
      desc: "우리 전공의 연구 다양성과 역량을 확인하세요",
      target: "lineage",
      color: "linear-gradient(135deg,#1d4ed8,#0ea5e9)",
    },
    {
      icon: <Search size={16} />,
      label: "연구주제를 찾는다면",
      desc: "키워드 트렌드로 공백 주제를 발견하세요",
      target: "keyword",
      color: "linear-gradient(135deg,#0ea5e9,#6366f1)",
    },
    {
      icon: <Users size={16} />,
      label: "동문이라면",
      desc: "내 연구가 계보 어디에 위치하는지 보세요",
      target: "lineage",
      color: "linear-gradient(135deg,#14b8a6,#0ea5e9)",
    },
    {
      icon: <Award size={16} />,
      label: "연구역량이 궁금하다면",
      desc: "시대별 패러다임 변화와 방법론 분포 확인",
      target: "method",
      color: "linear-gradient(135deg,#f59e0b,#ef4444)",
    },
  ];

  return (
    <section
      ref={ref}
      className="relative w-full overflow-hidden rounded-3xl"
      aria-labelledby="research-hero-title"
      style={{
        // UX(2026-07-04 사용자 피드백): 보라 과다 완화 — 연세 네이비 → 블루 → 틸
        background: "linear-gradient(135deg, #001a40 0%, #002d66 35%, #0b4a8f 65%, #0f766e 100%)",
      }}
    >
      {/* Mesh overlay — subtle noise texture feel */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 50% at 20% 30%, rgba(37,99,235,0.45) 0%, transparent 70%)," +
            "radial-gradient(ellipse 50% 60% at 80% 70%, rgba(20,184,166,0.4) 0%, transparent 70%)," +
            "radial-gradient(ellipse 40% 40% at 50% 50%, rgba(14,165,233,0.25) 0%, transparent 60%)",
        }}
      />

      {/* Grid dot pattern */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative z-10 px-5 py-10 sm:px-8 sm:py-14 lg:px-12 lg:py-16">

        {/* ── 헤드라인 ── */}
        <div className="mb-10 max-w-3xl">
          <motion.p
            initial={{ opacity: 0, y: -12 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white/50"
          >
            연세대학교 교육대학원 교육공학전공 · Research Analytics
          </motion.p>

          <motion.h1
            id="research-hero-title"
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl"
            style={{ fontFamily: "'Noto Serif KR', 'Hahmlet', serif" }}
          >
            연세 교육공학 연구의{" "}
            <span
              className="inline-block"
              style={{
                background: "linear-gradient(90deg,#a5f3fc,#60a5fa,#7dd3fc)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {yearSpan != null ? `${yearSpan}년` : yearRange}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.14, ease: "easeOut" }}
            className="mt-4 text-[15px] leading-relaxed text-white/65 sm:text-base"
          >
            {total.toLocaleString()}편의 학위논문이 증명하는 다양성 — e-러닝부터 AI·메타버스까지,
            시대 흐름을 선도한 연구들의 궤적을 데이터로 탐색합니다.
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.22, ease: "easeOut" }}
            className="mt-5 text-lg font-black tracking-tight sm:text-xl"
            style={{
              fontFamily: "'Noto Serif KR', serif",
              backgroundImage: "linear-gradient(90deg,#a5f3fc,#7dd3fc)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            교육공학의 혁신의 시작, 연세교육공학
          </motion.p>
        </div>

        {/* ── 통계 카드 3종 ── */}
        <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <StatCard
            icon={<BookOpen size={18} />}
            value={total}
            label="누적 학위논문"
            suffix="편"
            delay={0.18}
            active={isInView}
          />
          <StatCard
            icon={<Hash size={18} />}
            value={keywordCount}
            label="고유 연구 키워드"
            suffix="개"
            delay={0.26}
            active={isInView}
          />
          <StatCard
            icon={<TrendingUp size={18} />}
            value={yearRange}
            label="연구 기간"
            delay={0.34}
            active={isInView}
          />
        </div>

        {/* ── 부유 키워드 태그 + 시대 타임라인 (2-col) ── */}
        <div className="mb-10 grid gap-6 lg:grid-cols-[1fr_280px]">

          {/* 키워드 클라우드 */}
          <div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-white/40"
            >
              대표 연구 키워드
            </motion.p>
            <div
              className="
                min-h-[120px] rounded-2xl p-4
                border border-white/10 bg-white/5 backdrop-blur-sm
                flex flex-wrap gap-2 content-start
              "
              role="list"
              aria-label="대표 연구 키워드 목록"
            >
              {topKeywords.slice(0, 20).map((kw, i) => (
                <div key={kw.word} role="listitem">
                  <FloatingTag
                    word={kw.word}
                    count={kw.count}
                    index={i}
                    total={topKeywords.length}
                    reduced={reduced}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 시대 타임라인 */}
          {eras.length > 0 && (
            <div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : {}}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-white/40"
              >
                시대별 연구 흐름
              </motion.p>
              <ul
                className="
                  rounded-2xl p-4
                  border border-white/10 bg-white/5 backdrop-blur-sm
                  space-y-0
                "
                aria-label="시대별 연구 흐름 타임라인"
              >
                {eras.map((era, i) => (
                  <EraNode
                    key={era.range}
                    era={era}
                    index={i}
                    total={eras.length}
                    active={isInView}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ── 페르소나 CTA 4종 ── */}
        <div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-white/40"
          >
            어떤 목적으로 방문하셨나요?
          </motion.p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {personas.map((item, i) => (
              <PersonaCTA key={item.label} item={item} index={i} active={isInView} onNav={onPersonaNav} />
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
