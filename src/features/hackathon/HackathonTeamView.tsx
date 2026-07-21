"use client";

/**
 * 해커톤 팀 현황 뷰 (M6-v9, 2026-07-20)
 *
 * "누구와 한 팀인지" 를 한눈에 볼 수 있는 경량 팀 목록 표면.
 *
 * - 확정 팀: hackathon_submissions(teamName·members)
 * - 팀원 모집 중: comm_questions(presenter="팀원 찾는 중") + hackathon_team_joins 합류자
 *
 * 게스트는 가입 유도. 데이터 없으면 빈 상태.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, UserCheck, CheckCircle2, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/empty-state";
import { useAuthStore } from "@/features/auth/auth-store";
import { hackathonSubmissionsApi, commQuestionsApi, hackathonTeamJoinsApi } from "@/lib/bkend";
import type { HackathonSubmission, CommQuestion, HackathonTeamJoin, CommBoard } from "@/types";
import KudosSendBlock from "@/features/kudos/KudosSendBlock";
import type { KudosTarget } from "@/features/kudos/useKudosSend";
import { HACKATHON_CONTEXT_ID, HACKATHON_TEAM_PREFS } from "./config";
import { ensureHackathonBoard } from "./ensure-hackathon-board";

export default function HackathonTeamView() {
  const user = useAuthStore((s) => s.user);

  // 보드 id 자동 조회 — HackathonBoard 와 동일 쿼리 키 공유(React Query dedupe)
  const { data: board } = useQuery<CommBoard | null>({
    queryKey: ["hackathon-board"],
    queryFn: () =>
      user ? ensureHackathonBoard(user.id, user.name) : Promise.resolve(null),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: submissions = [], isLoading: subLoading } = useQuery({
    queryKey: ["hackathon-submissions"],
    enabled: !!user,
    queryFn: async () => {
      const res = await hackathonSubmissionsApi.listByContext(HACKATHON_CONTEXT_ID);
      return res.data as HackathonSubmission[];
    },
  });

  const { data: entries = [], isLoading: entryLoading } = useQuery({
    queryKey: ["hackathon-entries", board?.id ?? ""],
    enabled: !!user && !!board?.id,
    queryFn: async () => {
      const res = await commQuestionsApi.listByBoard(board!.id);
      return res.data as CommQuestion[];
    },
  });

  const { data: allJoins = [], isLoading: joinLoading } = useQuery({
    queryKey: ["hackathon-joins", HACKATHON_CONTEXT_ID],
    enabled: !!user,
    queryFn: async () => {
      const res = await hackathonTeamJoinsApi.listByContext(HACKATHON_CONTEXT_ID);
      return res.data as HackathonTeamJoin[];
    },
    staleTime: 30 * 1000,
  });

  const joinsByQuestion = useMemo(() => {
    const map = new Map<string, HackathonTeamJoin[]>();
    for (const j of allJoins) {
      const list = map.get(j.questionId) ?? [];
      list.push(j);
      map.set(j.questionId, list);
    }
    return map;
  }, [allJoins]);

  /** "팀원 찾는 중" 아이디어 + 합류자 있는 항목만 */
  const recruiting = useMemo(
    () =>
      entries.filter(
        (e) =>
          e.presenter === HACKATHON_TEAM_PREFS.wantTeam &&
          (joinsByQuestion.get(e.id)?.length ?? 0) > 0,
      ),
    [entries, joinsByQuestion],
  );

  const confirmedTeams = useMemo(
    () =>
      [...submissions].sort((a, b) =>
        (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
      ),
    [submissions],
  );

  // v11-H2: 내가 속한 팀(내가 올린 아이디어의 합류자 + 내가 합류한 아이디어의 작성자·공동 합류자)
  // 팀원에게 응원. 확정 팀 submissions.members 는 이름 문자열이라 userId 가 없어 대상에서 제외
  // (응원은 결정적 docId 상 수신자 userId 필수) — join(userId 보유) 관계만 대상으로 산정한다.
  const myTeammates = useMemo<KudosTarget[]>(() => {
    if (!user) return [];
    const map = new Map<string, KudosTarget>();
    for (const e of entries) {
      const joiners = joinsByQuestion.get(e.id) ?? [];
      const isAuthor = e.authorId === user.id;
      const iJoined = joiners.some((j) => j.userId === user.id);
      if (!isAuthor && !iJoined) continue;
      if (e.authorId && e.authorId !== user.id && e.authorName) {
        map.set(e.authorId, { id: e.authorId, name: e.authorName });
      }
      for (const j of joiners) {
        if (j.userId && j.userId !== user.id) {
          map.set(j.userId, { id: j.userId, name: j.userName });
        }
      }
    }
    return Array.from(map.values());
  }, [entries, joinsByQuestion, user]);

  const loading = subLoading || entryLoading || joinLoading;

  if (!user) return null;

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
    );
  }

  const hasAny = confirmedTeams.length > 0 || recruiting.length > 0;

  return (
    <div className="space-y-5">
      {/* ── 요약 배지 ── */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 font-medium">
          <CheckCircle2 size={12} className="text-success" />
          확정 팀 {confirmedTeams.length}건
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 font-medium">
          <Search size={12} className="text-primary" />
          합류 희망 진행 중 {recruiting.length}건
        </span>
      </div>

      {/* v11-H2: 내 팀원에게 응원 (양성 전용·주 1회) — 팀 관계가 있을 때만 노출 */}
      <KudosSendBlock
        me={user}
        targets={myTeammates}
        context="hackathon"
        title="내 팀원에게 응원"
        description="함께 팀을 이룬 동료예요. 가볍게 응원을 보내보세요. (팀원당 주 1회)"
      />

      {!hasAny && (
        <EmptyState
          icon={Users}
          title="아직 팀 정보가 없습니다"
          description="아이디어 보드에서 팀원을 찾거나, 산출물 제출 섹션에서 팀을 확정하면 여기에 표시됩니다."
        />
      )}

      {/* ── 확정 팀 목록 ── */}
      {confirmedTeams.length > 0 && (
        <section>
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <CheckCircle2 size={12} className="text-success" />
            확정 팀 ({confirmedTeams.length})
          </h4>
          <ul className="space-y-2">
            {confirmedTeams.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-4 py-3"
              >
                <span className="text-sm font-semibold text-foreground">
                  {s.teamName}
                </span>
                {s.members.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {s.members.map((m) => (
                      <span
                        key={m}
                        className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── 합류 희망 진행 중 ── */}
      {recruiting.length > 0 && (
        <section>
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <Users size={12} className="text-primary" />
            팀원 모집 중 — 합류 희망 있음 ({recruiting.length})
          </h4>
          <ul className="space-y-2">
            {recruiting.map((e) => {
              const joiners = joinsByQuestion.get(e.id) ?? [];
              return (
                <li
                  key={e.id}
                  className="rounded-xl border bg-card px-4 py-3"
                >
                  <p className="text-xs font-medium text-foreground line-clamp-2">
                    {e.body}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="font-medium">{e.authorName ?? "회원"}</span>
                    <span>·</span>
                    <div className="flex flex-wrap gap-1">
                      {joiners.map((j) => (
                        <span
                          key={j.id}
                          className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary"
                        >
                          <UserCheck size={10} />
                          {j.userName}
                        </span>
                      ))}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
