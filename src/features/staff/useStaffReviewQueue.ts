"use client";

/**
 * 운영진 처리 대기 집계 (2026-07-27)
 * 홈 대시보드에서 "지금 처리할 것"을 한눈에 보이도록, 콘솔 레이아웃의
 * 검토 배지 소스 중 신뢰도 높은 3종(회원 승인·미답변 문의·아카이브 검수)을 집계한다.
 * DB/rules 무변경 — 기존 API/훅 재사용.
 */

import { useQuery } from "@tanstack/react-query";
import { useInquiries } from "@/features/inquiry/useInquiry";
import {
  profilesApi,
  researchMethodsApi,
  statisticalMethodsApi,
  foundationTermsApi,
  writingTipsApi,
  commBoardsApi,
  commQuestionsApi,
} from "@/lib/bkend";
import { currentDemandContextId } from "@/features/demand/ensure-demand-board";
import type { CommBoard, CommQuestion } from "@/types";

export interface ReviewQueueItem {
  label: string;
  count: number;
  href: string;
}

const isPendingReview = (i: { published?: boolean; reviewStatus?: string }) =>
  !i.published && i.reviewStatus !== "held";

/** 개설 진행 중(운영진이 처리해야 할) 스터디 수요 단계 */
const OPENING_STAGES = new Set(["reviewing", "leader", "designing"]);

export function useStaffReviewQueue(enabled: boolean): ReviewQueueItem[] {
  const { inquiries } = useInquiries();
  const unansweredCount = inquiries.filter((i) => i.status === "pending").length;

  const { data: pendingData } = useQuery({
    queryKey: ["staff-home", "member-pending"],
    queryFn: () => profilesApi.list({ "filter[approved]": "false", limit: 0 }),
    retry: false,
    enabled,
  });
  const pendingCount = pendingData?.total ?? 0;

  const { data: rmData } = useQuery({
    queryKey: ["staff-home", "rm-draft"],
    queryFn: () => researchMethodsApi.list(),
    retry: false,
    enabled,
  });
  const { data: smData } = useQuery({
    queryKey: ["staff-home", "sm-draft"],
    queryFn: () => statisticalMethodsApi.list(),
    retry: false,
    enabled,
  });
  const { data: ftData } = useQuery({
    queryKey: ["staff-home", "ft-draft"],
    queryFn: () => foundationTermsApi.list(),
    retry: false,
    enabled,
  });
  const { data: wtData } = useQuery({
    queryKey: ["staff-home", "wt-draft"],
    queryFn: () => writingTipsApi.list(),
    retry: false,
    enabled,
  });
  const archiveDraftCount =
    (rmData?.data ?? []).filter(isPendingReview).length +
    (smData?.data ?? []).filter(isPendingReview).length +
    (ftData?.data ?? []).filter(isPendingReview).length +
    (wtData?.data ?? []).filter(isPendingReview).length;

  // ── 개설 대기 스터디 수요 (검토중·모임장·설계중) ──
  const { data: demandOpeningCount = 0 } = useQuery({
    queryKey: ["staff-home", "demand-opening"],
    queryFn: async () => {
      const boardRes = await commBoardsApi.listByContext("demand", currentDemandContextId());
      const board = (boardRes.data as unknown as CommBoard[])[0];
      if (!board) return 0;
      const qRes = await commQuestionsApi.listByBoard(board.id);
      const questions = qRes.data as CommQuestion[];
      return questions.filter(
        (q) =>
          q.presenter === "스터디 희망" &&
          OPENING_STAGES.has((q.demandPref?.status as string | undefined) ?? "collecting"),
      ).length;
    },
    retry: false,
    enabled,
  });

  return [
    { label: "회원 승인 대기", count: pendingCount, href: "/console/members" },
    { label: "미답변 문의", count: unansweredCount, href: "/console/inquiries" },
    { label: "아카이브 검수 대기", count: archiveDraftCount, href: "/console/archive/review-queue" },
    { label: "개설 대기 수요", count: demandOpeningCount, href: "/console/demand" },
  ];
}
