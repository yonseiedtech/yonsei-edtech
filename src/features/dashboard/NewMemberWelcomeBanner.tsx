"use client";

/**
 * 신규 회원 환영 배너 (Sprint 67-AR — 온보딩 MVP)
 *
 * 가입 후 7일 이내 회원에게 디딤판 진입을 안내. 닫기 가능, localStorage 기억.
 */

import Link from "next/link";
import { useState } from "react";
import { Compass, X, ArrowRight, Sparkles } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";

const DISMISS_KEY = "yedu_welcome_banner_dismissed_v1";
const WELCOME_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function parseTimestamp(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number") {
    const t = new Date(value).getTime();
    return Number.isFinite(t) ? t : null;
  }
  // Firestore Timestamp shape
  if (typeof value === "object" && value && "seconds" in (value as Record<string, unknown>)) {
    const seconds = (value as { seconds?: number }).seconds;
    if (typeof seconds === "number") return seconds * 1000;
  }
  return null;
}

export default function NewMemberWelcomeBanner() {
  const { user } = useAuthStore();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (!user || dismissed) return null;

  const createdAtMs = parseTimestamp((user as { createdAt?: unknown }).createdAt);
  if (createdAtMs == null) return null;

  const ageMs = Date.now() - createdAtMs;
  if (ageMs > WELCOME_WINDOW_MS) return null;

  function handleDismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  }

  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-sky-500/5 to-primary/5 p-5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="환영 배너 닫기"
        className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
      >
        <X size={14} />
      </button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Sparkles size={22} />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            환영합니다
          </p>
          <h3 className="mt-1 text-base font-bold tracking-tight sm:text-lg">
            {user.name}님, 본인 학기에 맞는 가이드가 준비되어 있어요.
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            인지디딤판에서 학기별 로드맵·재학생 가이드·학술대회 대비를 한 번에 살펴보세요.
          </p>
        </div>
        <Link
          href="/steppingstone"
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Compass size={14} />
          디딤판 가기
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
