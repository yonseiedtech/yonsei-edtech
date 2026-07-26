"use client";

/**
 * 개설 대기 스터디 수요 목록 (M8, 2026-07-27)
 * 운영진 홈 대시보드에서 "개설 대기" 상태(reviewing·leader·designing)의
 * 스터디 수요를 공감순·최신순 상위 5건 배열로 반환한다.
 * useStaffReviewQueue 의 카운트와 동일 필터를 사용.
 */

import { useQuery } from "@tanstack/react-query";
import { commBoardsApi, commQuestionsApi } from "@/lib/bkend";
import { currentDemandContextId } from "@/features/demand/ensure-demand-board";
import type { CommBoard, CommQuestion } from "@/types";

export type OpeningDemandStage = "reviewing" | "leader" | "designing";

export interface OpeningDemandItem {
  id: string;
  body: string;
  status: OpeningDemandStage;
  likeCount: number;
}

const OPENING_STAGES = new Set<string>(["reviewing", "leader", "designing"]);

export function useOpeningDemands(enabled: boolean): OpeningDemandItem[] {
  const { data = [] } = useQuery<OpeningDemandItem[]>({
    queryKey: ["staff-home", "demand-opening-list"],
    queryFn: async () => {
      const boardRes = await commBoardsApi.listByContext("demand", currentDemandContextId());
      const board = (boardRes.data as unknown as CommBoard[])[0];
      if (!board) return [];
      const qRes = await commQuestionsApi.listByBoard(board.id);
      const questions = qRes.data as CommQuestion[];
      return questions
        .filter(
          (q) =>
            q.presenter === "스터디 희망" &&
            OPENING_STAGES.has((q.demandPref?.status as string | undefined) ?? "collecting"),
        )
        .sort((a, b) => {
          const diff = (b.likeCount ?? 0) - (a.likeCount ?? 0);
          if (diff !== 0) return diff;
          return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
        })
        .slice(0, 5)
        .map((q) => ({
          id: q.id,
          body: q.body ?? "",
          status: (q.demandPref?.status as OpeningDemandStage) ?? "reviewing",
          likeCount: q.likeCount ?? 0,
        }));
    },
    retry: false,
    enabled,
  });

  return data;
}
