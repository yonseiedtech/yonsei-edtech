"use client";

/**
 * 해커톤 참가 신청 + 아이디어 보드 (v6-H6, 2026-07-18)
 *
 * 기존 소통 보드(comm_boards, contextType="hackathon") 인프라를 재사용 — 신규 컬렉션 없음.
 *  - 참가 신청 = "풀고 싶은 교육 현장의 문제" 한 줄 등록 (= comm_question)
 *  - 팀 참여 희망 여부 = question.presenter 슬롯 (HACKATHON_TEAM_PREFS)
 *  - 공감 = commLikesApi.toggle (question 좋아요)
 *  - 1인 1신청 — 본인(authorId) 질문 존재 여부로 판정
 * 게스트는 가입 유도(로그인 CTA).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Lightbulb,
  Loader2,
  Heart,
  Users,
  CheckCircle2,
  Send,
  LogIn,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/empty-state";
import { useAuthStore } from "@/features/auth/auth-store";
import { commQuestionsApi, commLikesApi } from "@/lib/bkend";
import type { CommBoard, CommQuestion } from "@/types";
import { ensureHackathonBoard } from "./ensure-hackathon-board";
import {
  HACKATHON_INTEREST_AREAS,
  HACKATHON_TEAM_PREFS,
  HACKATHON_TEAM_PREF_LIST,
  type HackathonTeamPref,
} from "./config";

const MAX_LEN = 140;

export default function HackathonBoard() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [problem, setProblem] = useState("");
  const [teamPref, setTeamPref] = useState<HackathonTeamPref>(
    HACKATHON_TEAM_PREFS.undecided,
  );
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  // 보드 프로비저닝 — 로그인 사용자만 (rules: create 는 ownerId==auth.uid)
  const { data: board, isLoading: boardLoading } = useQuery<CommBoard | null>({
    queryKey: ["hackathon-board"],
    queryFn: () =>
      user ? ensureHackathonBoard(user.id, user.name) : Promise.resolve(null),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["hackathon-entries", board?.id ?? ""],
    enabled: !!board,
    queryFn: async () => {
      const res = await commQuestionsApi.listByBoard(board!.id);
      return res.data as CommQuestion[];
    },
  });

  const { data: likedSet = new Set<string>() } = useQuery({
    queryKey: ["hackathon-likes", user?.id ?? "anon"],
    enabled: !!user,
    queryFn: () => commLikesApi.listMineSet(user!.id),
  });

  const myEntry = useMemo(
    () => (user ? entries.find((e) => e.authorId === user.id) : undefined),
    [entries, user],
  );

  const sorted = useMemo(
    () =>
      [...entries].sort((a, b) =>
        (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
      ),
    [entries],
  );

  const visible = useMemo(() => {
    if (filter === "all") return sorted;
    return sorted.filter((e) => (e.presenter ?? "") === filter);
  }, [sorted, filter]);

  const prefCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      const p = e.presenter ?? "";
      if (p) map.set(p, (map.get(p) ?? 0) + 1);
    }
    return map;
  }, [entries]);

  function refresh() {
    if (board)
      queryClient.invalidateQueries({
        queryKey: ["hackathon-entries", board.id],
      });
    queryClient.invalidateQueries({
      queryKey: ["hackathon-likes", user?.id ?? "anon"],
    });
  }

  async function handleRegister() {
    if (!board || !user) return;
    const body = problem.trim();
    if (!body) {
      toast.error("풀고 싶은 문제를 한 줄 입력하세요.");
      return;
    }
    setSaving(true);
    try {
      await commQuestionsApi.create({
        boardId: board.id,
        contextId: board.contextId,
        authorId: user.id,
        authorName: user.name,
        anonymous: false,
        presenter: teamPref,
        body,
      });
      setProblem("");
      refresh();
      toast.success("참가 신청이 완료되었습니다. 현장에서 만나요!");
    } catch (e) {
      console.error("[hackathon/register]", e);
      toast.error("신청 실패 — 잠시 후 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLike(entry: CommQuestion) {
    if (!user) return;
    try {
      await commLikesApi.toggle(user.id, "question", entry.id);
      refresh();
    } catch (e) {
      console.error("[hackathon/like]", e);
      toast.error("공감 처리 실패 — 잠시 후 다시 시도해주세요.");
    }
  }

  // ── 비로그인: 가입 유도 ──
  if (!user) {
    return (
      <EmptyState
        icon={LogIn}
        title="로그인하고 참가 신청하기"
        description="참가 신청과 아이디어 등록은 회원 전용입니다. 로그인하면 풀고 싶은 문제를 남기고 팀원을 찾을 수 있어요."
        actions={[
          { label: "로그인", href: "/login" },
          { label: "회원가입", href: "/signup", variant: "outline" },
        ]}
      />
    );
  }

  if (boardLoading || !board) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── 참가 신청 / 신청 완료 ── */}
      {myEntry ? (
        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-primary">
            <CheckCircle2 size={16} />
            참가 신청 완료
          </h3>
          <p className="mt-2 text-sm text-foreground">
            <span className="font-medium">내가 남긴 문제 </span>
            {myEntry.body}
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
              <Users size={11} /> {myEntry.presenter}
            </span>
            <span className="inline-flex items-center gap-1">
              <Heart size={11} /> 공감 {myEntry.likeCount}
            </span>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border bg-card p-4">
          <h3 className="flex items-center gap-1.5 text-sm font-bold">
            <Lightbulb size={16} className="text-primary" />
            참가 신청 — 풀고 싶은 교육 현장의 문제 한 줄
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            거창하지 않아도 좋아요. 평소 궁금했던 교육 현장의 문제를 한 줄로 남기면 신청이 됩니다.
          </p>

          {/* 관심 영역 빠른 입력 (선택) */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {HACKATHON_INTEREST_AREAS.map((area) => (
              <button
                key={area}
                type="button"
                onClick={() =>
                  setProblem((prev) => (prev.trim() ? prev : `${area}: `))
                }
                className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent"
              >
                {area}
              </button>
            ))}
          </div>

          <textarea
            value={problem}
            onChange={(e) => setProblem(e.target.value.slice(0, MAX_LEN))}
            rows={2}
            placeholder="예: 학생마다 이해 속도가 다른데 한 명의 교사가 모두를 챙기기 어렵다"
            className="mt-3 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <div className="mt-0.5 text-right text-[11px] text-muted-foreground">
            {problem.length}/{MAX_LEN}
          </div>

          {/* 팀 참여 희망 여부 */}
          <div className="mt-2">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
              팀 참여 희망
            </span>
            <div className="flex flex-wrap gap-1.5">
              {HACKATHON_TEAM_PREF_LIST.map((pref) => (
                <button
                  key={pref}
                  type="button"
                  onClick={() => setTeamPref(pref)}
                  aria-pressed={teamPref === pref}
                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    teamPref === pref
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {pref}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <Button
              size="sm"
              onClick={handleRegister}
              disabled={saving || !problem.trim()}
            >
              {saving ? (
                <Loader2 size={14} className="mr-1 animate-spin" />
              ) : (
                <Send size={14} className="mr-1" />
              )}
              참가 신청하기
            </Button>
          </div>
        </section>
      )}

      {/* ── 아이디어 보드 ── */}
      <section>
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <h3 className="mr-1 flex items-center gap-1.5 text-sm font-bold">
            <Lightbulb size={15} className="text-primary" />
            아이디어 보드
          </h3>
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
            전체 {entries.length}
          </button>
          {HACKATHON_TEAM_PREF_LIST.filter(
            (p) => (prefCounts.get(p) ?? 0) > 0,
          ).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setFilter(p)}
              aria-pressed={filter === p}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                filter === p
                  ? "border-primary bg-primary/10 font-medium text-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              {p} {prefCounts.get(p)}
            </button>
          ))}
        </div>

        <p className="sr-only" aria-live="polite">
          {filter === "all" ? "전체" : filter} {visible.length}건
        </p>

        {visible.length === 0 ? (
          <EmptyState
            icon={Lightbulb}
            title="아직 등록된 문제가 없습니다"
            description="첫 참가자가 되어 풀고 싶은 교육 현장의 문제를 남겨보세요."
          />
        ) : (
          <ul className="space-y-2.5">
            {visible.map((entry) => {
              const liked = likedSet.has(`question__${entry.id}`);
              const mine = entry.authorId === user.id;
              return (
                <li
                  key={entry.id}
                  className="rounded-2xl border bg-card p-4 transition-shadow hover:shadow-sm"
                >
                  <p className="text-sm leading-relaxed text-foreground">
                    {entry.body}
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {entry.authorName ?? "회원"}
                      {mine && (
                        <span className="ml-1 text-primary">· 나</span>
                      )}
                    </span>
                    {entry.presenter && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                        <Users size={11} /> {entry.presenter}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleLike(entry)}
                      disabled={mine}
                      aria-pressed={liked}
                      title={mine ? "본인 아이디어에는 공감할 수 없습니다" : "공감하기"}
                      className={`ml-auto inline-flex items-center gap-1 rounded-full border px-2.5 py-1 transition-colors ${
                        liked
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-accent"
                      } ${mine ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      <Heart
                        size={12}
                        className={liked ? "fill-current" : ""}
                      />
                      공감 {entry.likeCount}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
