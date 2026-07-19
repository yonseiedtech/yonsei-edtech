"use client";

/**
 * 해커톤 참가 CTA 배너 — 대시보드·홈 노출용 (v8-H6, 2026-07-20)
 *
 * - 행사 당일(2026-08-22) 종료 전까지만 표시. 이후 자동 숨김.
 * - D-day 배지 + 짧은 안내 + 상세 링크 + 1회 닫기(localStorage).
 * - hydration 안전: 초기값 dismissed=true → mount 후 localStorage 확인.
 * - src/features/hackathon/ 에 위치 — src/features/dashboard/ 수정 없음.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Rocket, X } from "lucide-react";
import { formatDday } from "@/lib/dday";
import { HACKATHON_EVENT } from "./config";

/** 이 해커톤 회차 전용 dismiss 키. 다음 회차에는 키가 달라지도록 날짜 포함. */
const DISMISS_KEY = `yedu_hackathon_cta_v1_${HACKATHON_EVENT.date}`;

export default function HackathonCtaBanner() {
  // hydration 불일치 방지: 서버는 항상 null → 클라이언트 mount 후만 노출
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      // localStorage 사용 불가 — 그냥 표시
    }
    setVisible(true);
  }, []);

  const dday = formatDday(HACKATHON_EVENT.date);

  // 행사 종료 이후(past) 또는 닫힘이면 렌더하지 않음
  if (!visible || !dday || dday.kind === "past") return null;

  function handleDismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  return (
    <div
      role="banner"
      className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm"
    >
      <Rocket size={15} className="shrink-0 text-primary" aria-hidden="true" />

      <p className="min-w-0 flex-1 leading-snug">
        <span className="font-semibold text-primary">에듀테크 해커톤</span>{" "}
        <span className="inline-flex items-center rounded-md bg-primary px-1.5 py-0.5 text-[11px] font-bold leading-none text-primary-foreground">
          {dday.label}
        </span>{" "}
        <span className="text-muted-foreground">
          · 교육 현장의 문제를 함께 풀어요.
        </span>
      </p>

      <Link
        href="/hackathon"
        className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        자세히 보기
      </Link>

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="해커톤 배너 닫기"
        className="shrink-0 touch-manipulation p-0.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X size={14} />
      </button>
    </div>
  );
}
