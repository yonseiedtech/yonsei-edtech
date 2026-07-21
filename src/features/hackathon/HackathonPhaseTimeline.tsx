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
import { CheckCircle2, Circle, ChevronRight, Users } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import { hackathonSubmissionsApi, commBoardsApi, commQuestionsApi } from "@/lib/bkend";
import type { HackathonSubmission, CommBoard, CommQuestion } from "@/types";
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

/** 제출 마감(= 심사 단계 startDate)까지 남은 일수 */
function calcSubmissionDday(): number | null {
  const judging = HACKATHON_PHASE_TIMELINE.find((p) => p.key === "judging");
  if (!judging) return null;
  const deadlineMs = new Date(judging.startDate + "T00:00:00+09:00").getTime();
  const nowMs = Date.now();
  const diff = Math.ceil((deadlineMs - nowMs) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff : null;
}

export default function HackathonPhaseTimeline() {
  const { phase: rawPhase, override, isManual } = useHackathonOps();
  const user = useAuthStore((s) => s.user);

  // v14 new-H2: 참가 신청자 수 (공개 read)
  const { data: participantCount } = useQuery({
    queryKey: ["hackathon-participant-count", HACKATHON_CONTEXT_ID],
    queryFn: async () => {
      const boardRes = await commBoardsApi.listByContext("hackathon", HACKATHON_CONTEXT_ID);
      const board = (boardRes.data as CommBoard[])[0];
      if (!board) return 0;
      const entriesRes = await commQuestionsApi.listByBoard(board.id);
      return (entriesRes.data as CommQuestion[]).length;
    },
    staleTime: 5 * 60 * 1000,
  });

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

      {/* 현재 단계 설명 + v14 new-H2 참가 신청 카운터 */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {currentPhase && (
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-primary">
              현재: {currentPhase.label}
            </span>
            {" · "}
            {currentPhase.description}
          </p>
        )}
        {typeof participantCount === "number" && participantCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
            <Users size={11} />
            {participantCount}명 참가 신청
          </span>
        )}
      </div>

      {/* D-day 카운트다운 (phase별 — hydration 후 노출) */}
      {countdown && !countdown.done && phase === "registration" && (
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

      {/* v14 new-H2: 제출 마감 D-day (제출 단계에서만) */}
      {phase === "submission" && (() => {
        const dday = calcSubmissionDday();
        if (dday === null) return null;
        const urgent = dday <= 3;
        return (
          <div className={`mt-4 flex items-center justify-between gap-2 rounded-xl border px-4 py-2.5 ${urgent ? "border-destructive/30 bg-destructive/5" : "border-warning/40 bg-warning/10"}`}>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold tabular-nums ${urgent ? "text-destructive" : "text-warning"}`}>
                제출 마감 D-{dday}
              </span>
              <span className="text-xs text-muted-foreground">산출물을 제출하세요</span>
            </div>
          </div>
        );
      })()}
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
