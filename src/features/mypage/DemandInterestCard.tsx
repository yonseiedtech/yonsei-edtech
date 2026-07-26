"use client";

/**
 * 마이페이지 "내가 관심 밝힌 수요" 위젯 (v16 H4)
 *
 * 로그인 회원이 '관심있어요(question)' 또는 '참여할래요(demand-join)'를 누른
 * 현재 학기 수요 항목의 진행 단계를 되짚는다.
 *
 * 제약: DB/rules 무변경(읽기 전용). 브랜드 시맨틱 토큰만. 반응 없으면 렌더 안 함.
 */

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ClipboardList, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { commLikesApi, commBoardsApi, commQuestionsApi } from "@/lib/bkend";
import { currentDemandContextId } from "@/features/demand/ensure-demand-board";
import type { CommQuestion, CommBoard } from "@/types";

type DemandStage =
  | "collecting"
  | "reviewing"
  | "leader"
  | "designing"
  | "opened"
  | "declined";

const STAGE_LABELS: Record<DemandStage, string> = {
  collecting: "수집중",
  reviewing: "검토중",
  leader: "모임장",
  designing: "설계중",
  opened: "개설됨",
  declined: "보류",
};

const STAGE_BADGE: Record<DemandStage, string> = {
  collecting: "bg-muted text-muted-foreground",
  reviewing: "bg-primary/10 text-primary",
  leader: "bg-primary/10 text-primary",
  designing: "bg-primary/10 text-primary",
  opened: "bg-success/10 text-success",
  declined: "bg-muted text-muted-foreground",
};

function stageOf(q: CommQuestion): DemandStage {
  return (q.demandPref?.status as DemandStage | undefined) ?? "collecting";
}

function demandHref(q: CommQuestion): string {
  const stage = stageOf(q);
  if (stage === "opened" && q.demandPref?.linkedActivityId) {
    return `/activities/studies/${q.demandPref.linkedActivityId}`;
  }
  return "/activities/studies?tab=demand";
}

interface Props {
  userId: string;
}

export default function DemandInterestCard({ userId }: Props) {
  const { data: items = [] } = useQuery({
    queryKey: ["mypage", "demand-interest", userId],
    queryFn: async (): Promise<CommQuestion[]> => {
      const contextId = currentDemandContextId();
      const [mineSet, boardRes] = await Promise.all([
        commLikesApi.listMineSet(userId),
        commBoardsApi.listByContext("demand", contextId),
      ]);

      const board = (boardRes.data as unknown as CommBoard[])[0] ?? null;
      if (!board) return [];

      // question__ 또는 demand-join__ 키에서 질문 id 추출 (중복 제거)
      const likedQIds = new Set<string>();
      for (const key of mineSet) {
        if (key.startsWith("question__")) {
          likedQIds.add(key.slice("question__".length));
        } else if (key.startsWith("demand-join__")) {
          likedQIds.add(key.slice("demand-join__".length));
        }
      }
      if (likedQIds.size === 0) return [];

      const questionsRes = await commQuestionsApi.listByBoard(board.id);
      const questions = questionsRes.data as CommQuestion[];

      return questions
        .filter((q) => likedQIds.has(q.id))
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
        .slice(0, 5);
    },
    retry: false,
  });

  if (items.length === 0) return null;

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4 text-primary" aria-hidden />
            내가 관심 밝힌 수요
          </CardTitle>
          <Link
            href="/activities/studies?tab=demand"
            className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
          >
            수요조사 <ArrowRight className="h-3 w-3" aria-hidden />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {items.map((q) => {
          const stage = stageOf(q);
          return (
            <Link
              key={q.id}
              href={demandHref(q)}
              className="flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">
                  {q.body}
                </span>
                {q.presenter && (
                  <span className="block text-[11px] text-muted-foreground">
                    {q.presenter}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                  STAGE_BADGE[stage],
                )}
              >
                {STAGE_LABELS[stage]}
              </span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
