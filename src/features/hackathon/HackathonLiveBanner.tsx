"use client";

/**
 * v14-H2: 해커톤 실시간 소통 허브 — 참가 현황 카운터 + 제출 마감 D-day 강조
 *
 * - 참가 신청 수(comm_questions in hackathon board) 실시간 집계 → "N팀 참가 신청 중"
 * - 제출 마감 D-day ≤7일: amber 강조, ≤3일: red 강조 (비로그인 포함 공개)
 * - 신규 컬렉션 없음 — 기존 commBoardsApi / commQuestionsApi 재사용.
 */

import { useQuery } from "@tanstack/react-query";
import { Users, Flame } from "lucide-react";
import { commBoardsApi, commQuestionsApi } from "@/lib/bkend";
import { HACKATHON_CONTEXT_ID } from "./config";
import { cn } from "@/lib/utils";

/** KST 기준 D-day 계산 (양수=미래, 0=오늘, 음수=과거) */
function kstDday(targetDate: string): number {
  const nowMs = Date.now() + 9 * 3_600_000;
  const todayKst = new Date(nowMs).toISOString().slice(0, 10);
  const diffMs = new Date(targetDate).getTime() - new Date(todayKst).getTime();
  return Math.ceil(diffMs / 86_400_000);
}

/** 제출 마감일 (당일 행사 = 2026-08-22) */
const SUBMISSION_DATE = "2026-08-22";

export default function HackathonLiveBanner() {
  // hackathon 보드 조회 (미프로비저닝이면 boardId = undefined → count 쿼리 스킵)
  const { data: boards } = useQuery({
    queryKey: ["hackathon-board-meta", HACKATHON_CONTEXT_ID],
    queryFn: () => commBoardsApi.listByContext("hackathon", HACKATHON_CONTEXT_ID),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const boardId = boards?.data?.[0]?.id;

  // 참가 신청 수 집계
  const { data: questions } = useQuery({
    queryKey: ["hackathon-q-count", boardId],
    queryFn: () => commQuestionsApi.listByBoard(boardId!),
    enabled: !!boardId,
    staleTime: 5 * 60_000,
    retry: false,
  });
  const participantCount = questions?.data?.length ?? 0;

  // 제출 마감 D-day 계산
  const subDday = kstDday(SUBMISSION_DATE);
  const ddayLabel = subDday === 0 ? "D-DAY" : subDday > 0 ? `D-${subDday}` : null;

  // 아무것도 표시할 게 없으면 숨김
  if (participantCount === 0 && !ddayLabel) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {/* 참가 현황 배지 */}
      {participantCount > 0 && (
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary">
          <Users size={12} />
          {participantCount}팀 참가 신청 중
        </span>
      )}

      {/* 제출 마감 D-day 강조 (7일 이내에만 표시) */}
      {ddayLabel && subDday <= 7 && (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold",
            subDday <= 3
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-warning/30 bg-warning/10 text-warning",
          )}
        >
          <Flame size={12} />
          산출물 제출 마감 {ddayLabel}
        </span>
      )}
    </div>
  );
}
