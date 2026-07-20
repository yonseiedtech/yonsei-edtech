"use client";

/**
 * 해커톤 단계별 상태 + D-day 카운트다운 (v8-H6, 2026-07-20)
 *
 * - 4단계 스테퍼(참가 접수→산출물 제출→심사→수상 발표)에서 현재 단계 강조.
 * - 행사 시작(10:00 KST)까지의 실시간 카운트다운(일·시간·분·초)을 1초마다 갱신.
 * - 행사가 시작된 이후에는 카운트다운 숨김.
 * - SSR/hydration 안전: 초기값은 서버와 동일하게 계산(Date.now 대신 mount 후 갱신).
 */

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import { hackathonSubmissionsApi } from "@/lib/bkend";
import type { HackathonSubmission } from "@/types";
import {
  HACKATHON_PHASE_TIMELINE,
  HACKATHON_EVENT,
  HACKATHON_CONTEXT_ID,
  resolveHackathonPhaseGuarded,
} from "./config";
import { useHackathonOps } from "./useHackathonOps";

/** 행사 시작 시각 UTC ms (2026-08-22 10:00 KST = 01:00 UTC) */
function getEventStartMs(): number {
  const [y, m, d] = HACKATHON_EVENT.date.split("-").map(Number);
  return Date.UTC(y, m - 1, d, 1, 0, 0); // 10:00 KST
}

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
}

function calcCountdown(): Countdown {
  const diff = getEventStartMs() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  const totalSec = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
    done: false,
  };
}

export default function HackathonPhaseTimeline() {
  const { phase: rawPhase, override, isManual } = useHackathonOps();
  const user = useAuthStore((s) => s.user);

  // R4 가드: 자동 폴백으로 "수상 발표"에 진입했으나 공개 수상작이 0건이면 심사 단계로 유지.
  // hackathon_submissions list 규칙이 로그인 회원 전용이므로 로그인 사용자만 실측한다
  // (비로그인·수동 지정 시엔 원본 단계 유지 — publishedCount 를 1로 넘겨 가드 비활성).
  const needGuard = rawPhase === "awards" && !isManual && !!user;
  const { data: publishedCount } = useQuery({
    queryKey: ["hackathon-published-count", HACKATHON_CONTEXT_ID],
    enabled: needGuard,
    queryFn: async () => {
      const res = await hackathonSubmissionsApi.listByContext(HACKATHON_CONTEXT_ID);
      return (res.data as HackathonSubmission[]).filter((s) => s.published && s.award).length;
    },
    staleTime: 60 * 1000,
  });
  const phase = needGuard
    ? resolveHackathonPhaseGuarded(override, publishedCount ?? 1)
    : rawPhase;

  const currentIdx = HACKATHON_PHASE_TIMELINE.findIndex((p) => p.key === phase);
  const currentPhase = HACKATHON_PHASE_TIMELINE[currentIdx];

  // Hydration 안전: mount 전에는 null → 카운트다운 미렌더
  const [countdown, setCountdown] = useState<Countdown | null>(null);

  useEffect(() => {
    const tick = () => setCountdown(calcCountdown());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="mt-8 rounded-2xl border bg-card p-5 sm:p-6">
      {/* 4단계 스테퍼 */}
      <div className="flex flex-wrap items-center gap-y-1">
        {HACKATHON_PHASE_TIMELINE.map((p, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div key={p.key} className="flex items-center">
              <div className="flex items-center gap-1">
                <span aria-hidden="true">
                  {done ? (
                    <CheckCircle2
                      size={14}
                      className="text-success"
                    />
                  ) : (
                    <Circle
                      size={14}
                      className={
                        active ? "text-primary" : "text-muted-foreground/40"
                      }
                    />
                  )}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    active
                      ? "text-primary"
                      : done
                        ? "text-success"
                        : "text-muted-foreground/50"
                  }`}
                >
                  {p.label}
                </span>
              </div>
              {i < HACKATHON_PHASE_TIMELINE.length - 1 && (
                <ChevronRight
                  size={12}
                  className="mx-1.5 shrink-0 text-muted-foreground/30 sm:mx-2"
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* 현재 단계 설명 */}
      {currentPhase && (
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-semibold text-primary">
            현재: {currentPhase.label}
          </span>
          {" · "}
          {currentPhase.description}
        </p>
      )}

      {/* D-day 카운트다운 (행사 전 단계만, hydration 후 노출) */}
      {countdown && !countdown.done && (phase === "registration") && (
        <div className="mt-5">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            행사 시작까지
          </p>
          <div className="flex flex-wrap items-end gap-4 sm:gap-6">
            <CountUnit value={countdown.days} label="일" />
            <CountUnit value={countdown.hours} label="시간" />
            <CountUnit value={countdown.minutes} label="분" />
            <CountUnit value={countdown.seconds} label="초" />
          </div>
        </div>
      )}
    </section>
  );
}

function CountUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-2xl font-bold tabular-nums leading-none sm:text-3xl">
        {String(value).padStart(2, "0")}
      </span>
      <span className="mt-1 text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}
