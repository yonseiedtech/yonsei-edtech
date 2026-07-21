"use client";

/**
 * MentoringPoolCard — 멘토 풀 현황 집계 카드 (PM GAP-H)
 *
 * - 멘토 토글 ON 회원 수 (profiles where mentorOpen=true)
 * - 멘토링 Q&A 요청 수 (mentoring comm_board 질문 수)
 * - 수락 수 (resolved=true 질문 수)
 *
 * 읽기 전용. 기존 컬렉션 집계만 사용, 신규 컬렉션 없음.
 */

import { useQuery } from "@tanstack/react-query";
import { Users, MessageSquare, CheckCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { profilesApi, commBoardsApi, commQuestionsApi } from "@/lib/bkend";
import { MENTORING_CONTEXT_ID } from "@/features/mentoring/topics";
import { cn } from "@/lib/utils";
import type { User, CommBoard, CommQuestion } from "@/types";

function StatTile({
  icon: Icon,
  label,
  value,
  color = "text-primary",
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl border bg-card p-4 text-center shadow-xs">
      <Icon className={cn("h-5 w-5", color)} aria-hidden />
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export default function MentoringPoolCard() {
  // 1. 승인 회원 전체 조회 → mentorOpen=true 필터링 (소규모 커뮤니티, 클라이언트 필터)
  const { data: profilesRes, isLoading: loadingProfiles } = useQuery({
    queryKey: ["insights", "mentoring-pool", "profiles"],
    queryFn: () => profilesApi.list({ "filter[approved]": "true", limit: 500 }),
    staleTime: 5 * 60_000,
  });
  const mentorCount = (profilesRes?.data as User[] ?? []).filter(
    (u) => u.mentorOpen,
  ).length;

  // 2. 멘토링 comm_board 조회
  const { data: boardsRes, isLoading: loadingBoards } = useQuery({
    queryKey: ["insights", "mentoring-pool", "boards"],
    queryFn: () => commBoardsApi.listByContext("mentoring", MENTORING_CONTEXT_ID),
    staleTime: 5 * 60_000,
  });
  const board = (boardsRes?.data as CommBoard[] ?? [])[0];

  // 3. 질문(멘토링 요청) + resolved(수락) 집계
  const { data: questionsRes, isLoading: loadingQuestions } = useQuery({
    queryKey: ["insights", "mentoring-pool", "questions", board?.id],
    queryFn: () => commQuestionsApi.listByBoard(board!.id),
    enabled: !!board?.id,
    staleTime: 5 * 60_000,
  });
  const questions = (questionsRes?.data as CommQuestion[] ?? []);
  const requestCount = questions.length;
  const acceptedCount = questions.filter((q) => q.resolved).length;

  const isLoading =
    loadingProfiles || loadingBoards || (!!board?.id && loadingQuestions);

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-primary" aria-hidden />
          멘토링 풀 현황
          {isLoading && (
            <Loader2
              className="h-3.5 w-3.5 animate-spin text-muted-foreground"
              aria-hidden
            />
          )}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          멘토 토글 ON 회원 · 멘토링 Q&A 요청 · 수락 현황 (읽기 전용)
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <StatTile
            icon={Users}
            label="멘토 풀"
            value={isLoading ? "—" : mentorCount}
            color="text-primary"
          />
          <StatTile
            icon={MessageSquare}
            label="멘토링 요청"
            value={isLoading ? "—" : requestCount}
            color="text-cat-1"
          />
          <StatTile
            icon={CheckCircle}
            label="수락됨"
            value={isLoading ? "—" : acceptedCount}
            color="text-success"
          />
        </div>
        {!isLoading && mentorCount < 5 && (
          <p className="text-xs text-warning">
            멘토 풀이 5명 미만입니다. 졸업생 섭외를 고려해 보세요.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
