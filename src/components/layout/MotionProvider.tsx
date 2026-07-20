"use client";

/**
 * framer-motion 전역 모션 설정 — a11y M4-v9
 * reducedMotion="user" : OS의 prefers-reduced-motion 설정을 자동 감지하여
 * 모든 framer-motion 애니메이션(motion.div, AnimatePresence, useSpring 등)의
 * 움직임을 즉시 비활성화한다. 개별 컴포넌트 useReducedMotion 가드와 병존 가능.
 */
import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

export default function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
