"use client";

import { Children, useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform, useInView, useMotionValue, useSpring, useAnimationFrame } from "framer-motion";

/** 스크롤에 따라 등장하는 섹션 래퍼. */
export function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** 페이지 전체에 깔리는 인터랙티브 배경 (스크롤 패럴랙스 + 마우스 반응 블롭 + 그리드). */
export function InteractiveBackdrop() {
  const { scrollYProgress } = useScroll();
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const rot = useTransform(scrollYProgress, [0, 1], [0, 45]);

  const mx = useSpring(useMotionValue(0), { stiffness: 50, damping: 20 });
  const my = useSpring(useMotionValue(0), { stiffness: 50, damping: 20 });

  useAnimationFrame((t) => {
    const s = t / 1000;
    mx.set(Math.sin(s * 0.15) * 60);
    my.set(Math.cos(s * 0.2) * 40);
  });

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* grid */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(15,23,42,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.05) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 85%)",
        }}
      />
      {/* floating blobs */}
      <motion.div
        style={{ y: y1, x: mx }}
        className="absolute left-[8%] top-[10%] h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-[100px]"
      />
      <motion.div
        style={{ y: y2, x: my, rotate: rot }}
        className="absolute right-[-4%] top-[45%] h-[32rem] w-[32rem] rounded-full bg-sky-300/20 blur-[120px]"
      />
      <motion.div
        style={{ y: y1 }}
        className="absolute bottom-[-6rem] left-[30%] h-[24rem] w-[24rem] rounded-full bg-amber-200/20 blur-[100px]"
      />
    </div>
  );
}

/** 스크롤 진행률 상단 바. */
export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 20, mass: 0.3 });
  return (
    <motion.div
      style={{ scaleX, transformOrigin: "0%" }}
      className="fixed left-0 right-0 top-0 z-[60] h-[2px] bg-gradient-to-r from-primary via-sky-400 to-indigo-500"
    />
  );
}

/** 섹션들을 감싸고 스태거드 reveal 적용. */
export default function InteractiveHome({ children }: { children: ReactNode }) {
  const arr = Children.toArray(children);
  return (
    <>
      <ScrollProgressBar />
      <InteractiveBackdrop />
      <div className="relative">
        {arr.map((c, i) => (
          <Reveal key={i} delay={i === 0 ? 0 : 0.05}>
            {c}
          </Reveal>
        ))}
      </div>
    </>
  );
}
