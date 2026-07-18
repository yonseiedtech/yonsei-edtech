"use client";

/**
 * 졸업생 멘토링 Q&A 보드 (v5-M2, 2026-07-18)
 *
 * 졸업생 멘토 토글·단발 조언요청(쪽지)만 있던 골격을 구조화 Q&A로 심화.
 * 기존 소통 보드(comm_boards, contextType="mentoring") 인프라를 재사용 — 신규 컬렉션 없음.
 *  - 보드는 ensure-mentoring-board 로 단일 전역 보드 자동 프로비저닝(세미나 라이브 패턴 재사용)
 *  - 분야 태그는 board.presenters(= MENTORING_TOPICS) 슬롯 재사용 → 질문 presenter 필드에 담김
 *  - 질문 작성·답변·채택·좋아요는 기존 QuestionComposer / QuestionItem 재사용
 *
 * 진입: 졸업생 홈 위젯 · 회원 명부/프로필의 "공개 질문으로 남기기"(?topic=&to= 프리필)
 */

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HeartHandshake, MessageCircleQuestion, Tag } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/page-header";
import PageContainer from "@/components/ui/page-container";
import EmptyState from "@/components/ui/empty-state";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/features/auth/auth-store";
import { commQuestionsApi, commLikesApi } from "@/lib/bkend";
import { sortQuestions } from "@/features/comm-board/comm-helpers";
import QuestionComposer from "@/features/comm-board/QuestionComposer";
import QuestionItem from "@/features/comm-board/QuestionItem";
import type { CommBoard, CommQuestion } from "@/types";
import { ensureMentoringBoard } from "@/features/mentoring/ensure-mentoring-board";
import { MENTORING_TOPICS } from "@/features/mentoring/topics";

function MentoringBoard() {
  const user = useAuthStore((s) => s.user);
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // 프리필: /mentoring?topic=논문·연구방법&to=선배이름
  const initialTopic = searchParams.get("topic") ?? "";
  const toName = searchParams.get("to") ?? "";

  const [topic, setTopic] = useState<string>(
    MENTORING_TOPICS.includes(initialTopic) ? initialTopic : "",
  );
  const [filter, setFilter] = useState<string>("all");

  // 보드 프로비저닝 — 로그인 사용자만(rules: create 는 ownerId==auth.uid).
  const { data: board, isLoading: boardLoading } = useQuery<CommBoard | null>({
    queryKey: ["mentoring-board"],
    queryFn: () => (user ? ensureMentoringBoard(user.id, user.name) : Promise.resolve(null)),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: questions = [] } = useQuery({
    queryKey: ["comm-questions", board?.id ?? ""],
    enabled: !!board,
    queryFn: async () => {
      const res = await commQuestionsApi.listByBoard(board!.id);
      return res.data as CommQuestion[];
    },
  });

  const { data: likedSet = new Set<string>() } = useQuery({
    queryKey: ["comm-likes", user?.id ?? "anon"],
    enabled: !!user,
    queryFn: () => commLikesApi.listMineSet(user!.id),
  });

  function refresh() {
    if (board) queryClient.invalidateQueries({ queryKey: ["comm-questions", board.id] });
    queryClient.invalidateQueries({ queryKey: ["comm-likes", user?.id ?? "anon"] });
  }

  const visible = useMemo(() => {
    const sorted = sortQuestions(questions, "recent");
    if (filter === "all") return sorted;
    return sorted.filter((q) => (q.presenter ?? "") === filter);
  }, [questions, filter]);

  // 분야별 질문 수 (필터 배지)
  const topicCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const q of questions) {
      const t = q.presenter ?? "";
      if (t) map.set(t, (map.get(t) ?? 0) + 1);
    }
    return map;
  }, [questions]);

  return (
    <PageContainer width="default">
      <div className="animate-in fade-in slide-in-from-bottom-2 py-8 duration-300 sm:py-14">
        <PageHeader
          icon={HeartHandshake}
          title="졸업생 멘토링 Q&A"
          description="논문·진로·유학·실무 등 분야별로 선배 졸업생에게 공개 질문을 남기고, 답변·채택으로 지식을 함께 쌓아가세요."
        />

        <Separator className="mt-6" />

        {!user ? (
          <div className="mt-6">
            <EmptyState
              icon={MessageCircleQuestion}
              title="로그인 후 참여할 수 있습니다"
              description="멘토링 Q&A는 회원 전용입니다. 로그인하면 질문을 남기고 선배의 답변을 받을 수 있어요."
            />
          </div>
        ) : boardLoading || !board ? (
          <div className="mt-6 space-y-2">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {/* ── 질문 작성 (분야 태그 선택) ── */}
            <section className="rounded-2xl border bg-card p-4">
              <h2 className="flex items-center gap-1.5 text-sm font-bold">
                <MessageCircleQuestion size={15} className="text-primary" />
                질문 남기기
                {toName && (
                  <span className="text-xs font-normal text-muted-foreground">
                    · {toName} 선배님께
                  </span>
                )}
              </h2>
              <div className="mt-3">
                <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Tag size={12} /> 분야 태그
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTopic("")}
                    aria-pressed={topic === ""}
                    className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                      topic === ""
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    분야 없음
                  </button>
                  {MENTORING_TOPICS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTopic(t)}
                      aria-pressed={topic === t}
                      className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                        topic === t
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="mt-3">
                  <QuestionComposer
                    board={board}
                    user={user}
                    presenter={topic || undefined}
                    onCreated={refresh}
                  />
                </div>
              </div>
            </section>

            {/* ── 분야 필터 ── */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilter("all")}
                aria-pressed={filter === "all"}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  filter === "all"
                    ? "border-primary bg-primary/10 font-medium text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                전체 {questions.length}
              </button>
              {MENTORING_TOPICS.filter((t) => (topicCounts.get(t) ?? 0) > 0).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilter(t)}
                  aria-pressed={filter === t}
                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    filter === t
                      ? "border-primary bg-primary/10 font-medium text-primary"
                      : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {t} {topicCounts.get(t)}
                </button>
              ))}
            </div>

            {/* 분야 필터 변경 시 결과 수를 스크린리더에 알림 */}
            <p className="sr-only" aria-live="polite">
              {filter === "all" ? "전체" : filter} 분야 질문 {visible.length}건
            </p>

            {/* ── 질문 목록 ── */}
            {visible.length === 0 ? (
              <EmptyState
                icon={MessageCircleQuestion}
                title="아직 질문이 없습니다"
                description="첫 질문을 남겨보세요. 선배 졸업생이 답변하고 채택하면 지식으로 남습니다."
              />
            ) : (
              <div className="space-y-2.5">
                {visible.map((q) => (
                  <div key={q.id}>
                    {q.presenter && (
                      <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        <Tag size={10} /> {q.presenter}
                      </span>
                    )}
                    <QuestionItem
                      board={board}
                      question={q}
                      user={user}
                      likedSet={likedSet}
                      onChanged={refresh}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </PageContainer>
  );
}

export default function MentoringPage() {
  return (
    <Suspense fallback={null}>
      <MentoringBoard />
    </Suspense>
  );
}
