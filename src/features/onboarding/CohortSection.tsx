"use client";

/**
 * "우리 기수" 코호트 섹션 (M1 — 8월 신입 코호트 장치)
 *
 * 같은 가입 학기(코호트)에 속한 승인 회원을 묶어 신입의 소속감을 높인다.
 *  - 코호트 산정: cohortKeyOf(member) 순수 함수(src/lib/semester) — 신규 컬렉션 없음.
 *  - 진행률 요약: 같은 코호트의 온보딩 체크리스트 완료율 "평균"만 노출(익명화 —
 *    개인 식별 순위·개인 퍼센트 미노출, 평균·시작 인원 수만).
 *  - 동기 명단: 같은 코호트 승인 회원 이름 + 프로필 링크(기존 /profile/[id] 노출 수준).
 *  - 버디 추천: 같은 코호트 내 관심분야 겹침 상위 1~3명(없으면 카드 미노출).
 *
 * 이미 로드된 승인 회원 목록(useMembers)으로 순수 클라이언트 계산한다.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users, Sparkles, ArrowRight, Info, GraduationCap, PartyPopper, Check, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMembers } from "@/features/member/useMembers";
import { guideProgressApi, kudosApi, streakEventsApi } from "@/lib/bkend";
import { cohortKeyOf, semesterLabelFromKey } from "@/lib/semester";
import { currentWeekKey } from "@/lib/weekly-goal";
import { notifyKudos } from "@/features/notifications/notify";
import { recommendCollaborators, type CollaboratorMatch } from "@/lib/collaborator-match";
import type { User } from "@/types";

interface Props {
  me: User;
  /** 온보딩 트랙 id (진행률 평균 집계 대상) — 미구성 시 null */
  onboardingTrackId: string | null;
  /** 온보딩 체크리스트 항목 수 (완료율 분모) */
  totalItems: number;
}

/** 매칭 근거 중 관심 주제 교집합(키워드·연구 주제) 칩만 추출 */
function overlapItems(match: CollaboratorMatch): string[] {
  const items = match.reasons
    .filter((r) => r.kind === "interest_keyword" || r.kind === "research_topic")
    .flatMap((r) => r.items);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const it of items) {
    const key = it.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(it.trim());
  }
  return out;
}

export default function CohortSection({ me, onboardingTrackId, totalItems }: Props) {
  const { members, isLoading } = useMembers();

  const myCohort = useMemo(() => cohortKeyOf(me), [me]);

  // 같은 코호트(같은 가입 학기) 승인 회원 — useMembers 는 승인 회원만 반환.
  const cohortMembers = useMemo(
    () => (myCohort ? members.filter((m) => cohortKeyOf(m) === myCohort) : []),
    [members, myCohort],
  );
  const peers = useMemo(
    () => cohortMembers.filter((m) => m.id !== me.id),
    [cohortMembers, me.id],
  );

  // 코호트 온보딩 진행 상태 (완료율 평균 집계용) — 트랙·항목이 있을 때만.
  const progressEnabled = !!onboardingTrackId && totalItems > 0 && cohortMembers.length > 0;
  const { data: progressDocs } = useQuery({
    queryKey: ["cohort-guide-progress", onboardingTrackId],
    queryFn: () => guideProgressApi.listByTrack(onboardingTrackId as string),
    enabled: progressEnabled,
    staleTime: 5 * 60_000,
  });

  // 익명 집계: 코호트 구성원별 완료율 → 평균 + 시작 인원(개인 퍼센트·순위 미노출)
  const cohortProgress = useMemo(() => {
    if (!progressEnabled || !progressDocs) return null;
    const doneByUser = new Map<string, number>();
    for (const p of progressDocs) {
      doneByUser.set(p.userId, Object.keys(p.completedItems ?? {}).length);
    }
    let sumRate = 0;
    let started = 0;
    for (const m of cohortMembers) {
      const done = doneByUser.get(m.id) ?? 0;
      if (done > 0) started += 1;
      sumRate += Math.min(1, done / totalItems);
    }
    return {
      avgPct: Math.round((sumRate / cohortMembers.length) * 100),
      started,
    };
  }, [progressEnabled, progressDocs, cohortMembers, totalItems]);

  // 버디: 같은 코호트 내 관심분야 겹침 상위 1~3명(cohort/신분만 겹치는 경우는 제외)
  const buddies = useMemo(() => {
    if (cohortMembers.length === 0) return [];
    return recommendCollaborators(me, cohortMembers, 20)
      .filter((m) =>
        m.reasons.some(
          (r) => r.kind === "interest_keyword" || r.kind === "research_topic",
        ),
      )
      .slice(0, 3);
  }, [me, cohortMembers]);

  // ── 학습 활동 kudos (v7-H5) — 코호트 동기의 이번 주 학습 활동에 응원 ──
  // "활동 사실"만 사용: streak_events 이번 주 존재 여부로 대상만 추린다(점수·수치 비노출).
  const activityWeekKey = useMemo(() => currentWeekKey(), []);

  // 이번 주 학습 활동이 있는 회원 id 집합 (범위 쿼리로 이번 주만 좁혀 읽음)
  const { data: activeIds } = useQuery({
    queryKey: ["cohort-kudos-active", activityWeekKey],
    queryFn: async () => {
      const events = await streakEventsApi.listSince(activityWeekKey);
      return new Set(events.map((e) => e.userId).filter(Boolean));
    },
    enabled: peers.length > 0,
    staleTime: 5 * 60_000,
    retry: false,
  });

  // 내가 이번 주에 이미 보낸 응원 대상(본인 발신분만 read 됨)
  const { data: sentDocs } = useQuery({
    queryKey: ["cohort-kudos-sent", me.id, activityWeekKey],
    queryFn: () => kudosApi.listSentByUser(me.id),
    enabled: peers.length > 0,
    staleTime: 60_000,
    retry: false,
  });
  const sentThisWeek = useMemo(() => {
    const s = new Set<string>();
    for (const k of sentDocs?.data ?? []) {
      if (k.weekKey === activityWeekKey) s.add(k.toUserId);
    }
    return s;
  }, [sentDocs, activityWeekKey]);

  // 응원 대상: 이번 주 학습 활동 있음 + 리더보드 비공개(showInLeaderboard=false) 아님 + 나 제외.
  // peers 는 useMembers(승인 회원)에서 온 동기이며 나를 이미 제외한다.
  const kudosTargets = useMemo(
    () =>
      activeIds
        ? peers.filter((p) => activeIds.has(p.id) && p.showInLeaderboard !== false)
        : [],
    [peers, activeIds],
  );

  const [optimisticSent, setOptimisticSent] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState<string | null>(null);

  async function sendKudos(peer: User) {
    if (!me.id) return;
    setSending(peer.id);
    try {
      await kudosApi.send(me.id, me.name, peer.id, activityWeekKey);
      void notifyKudos(peer.id, me.name);
      setOptimisticSent((prev) => new Set(prev).add(peer.id));
      toast.success(`${peer.name}님에게 응원을 보냈어요 👏`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "응원 전송에 실패했어요.");
    } finally {
      setSending(null);
    }
  }

  // 코호트를 산정할 수 없으면(가입 학기 정보 없음) 섹션 미노출
  if (!myCohort) return null;

  const cohortLabel = semesterLabelFromKey(myCohort);

  return (
    <section
      aria-label="우리 기수"
      className="mb-8 rounded-2xl border border-primary/20 bg-primary/[0.03] p-5 dark:bg-primary/[0.06]"
    >
      <div className="flex items-start gap-3">
        <div
          aria-hidden
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
        >
          <Users size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-foreground">우리 기수</h2>
            {cohortLabel && (
              <Badge variant="secondary" className="text-[10px]">
                {cohortLabel} 입학
              </Badge>
            )}
            {typeof me.generation === "number" && me.generation > 0 && (
              <Badge variant="outline" className="gap-1 text-[10px]">
                <GraduationCap size={10} aria-hidden /> {me.generation}기
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {isLoading
              ? "같은 기수 동기를 불러오는 중..."
              : `같은 학기에 입학한 동기 ${cohortMembers.length}명과 함께 시작해요.`}
          </p>
        </div>
      </div>

      {/* 코호트 진행률 평균 (익명 — 평균·시작 인원만) */}
      {cohortProgress && (
        <div className="mt-4 rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              우리 기수 평균 진행률
            </p>
            <p className="text-sm font-bold text-primary">{cohortProgress.avgPct}%</p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${cohortProgress.avgPct}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            동기 {cohortMembers.length}명 중 {cohortProgress.started}명이 온보딩을 시작했어요.
            (개인 진행률은 공개되지 않습니다.)
          </p>
        </div>
      )}

      {/* 동기 명단 */}
      {peers.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-semibold text-muted-foreground">
            동기 명단
          </p>
          <ul className="flex flex-wrap gap-2">
            {peers.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/profile/${p.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <Avatar className="h-5 w-5 shrink-0">
                    {p.profileImage && <AvatarImage src={p.profileImage} alt={p.name} />}
                    <AvatarFallback className="text-[9px]">
                      {p.name?.[0] ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="max-w-[8rem] truncate font-medium">{p.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isLoading && peers.length === 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-dashed bg-card/60 p-4 text-sm text-muted-foreground">
          <Info size={15} className="mt-0.5 shrink-0" aria-hidden />
          <p className="leading-relaxed">
            아직 같은 학기에 입학한 동기가 없어요. 곧 합류할 동기들을 기다려 주세요.
          </p>
        </div>
      )}

      {/* 버디 추천 (관심분야 겹침) */}
      {buddies.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 flex items-center gap-1 text-[11px] font-semibold text-primary">
            <Sparkles size={11} aria-hidden /> 관심사가 비슷한 동기 버디
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {buddies.map((match) => {
              const overlap = overlapItems(match);
              return (
                <li
                  key={match.user.id}
                  className="flex flex-col rounded-xl border bg-card p-3 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-9 w-9 shrink-0">
                      {match.user.profileImage && (
                        <AvatarImage src={match.user.profileImage} alt={match.user.name} />
                      )}
                      <AvatarFallback>{match.user.name?.[0] ?? "?"}</AvatarFallback>
                    </Avatar>
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                      {match.user.name}
                    </p>
                  </div>
                  {overlap.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {overlap.slice(0, 4).map((item) => (
                        <Badge
                          key={item}
                          variant="secondary"
                          className="text-[10px] font-normal"
                        >
                          {item}
                        </Badge>
                      ))}
                      {overlap.length > 4 && (
                        <span className="text-[10px] text-muted-foreground">
                          외 {overlap.length - 4}개
                        </span>
                      )}
                    </div>
                  )}
                  <div className="mt-2 flex justify-end">
                    <Link href={`/profile/${match.user.id}`}>
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        프로필 보기
                        <ArrowRight size={11} className="ml-1" />
                      </Button>
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* 학습 활동 kudos (v7-H5) — 이번 주 학습 활동을 이어간 동기에게 응원 1클릭 */}
      {kudosTargets.length > 0 && (
        <div className="mt-5">
          <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-primary">
            <PartyPopper size={11} aria-hidden /> 이번 주 학습 응원
          </p>
          <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">
            이번 주 학습 활동을 이어간 동기예요. 가볍게 응원을 보내보세요. (동기당 주 1회)
          </p>
          <ul className="flex flex-wrap gap-2">
            {kudosTargets.map((p) => {
              const already = sentThisWeek.has(p.id) || optimisticSent.has(p.id);
              const isSending = sending === p.id;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => sendKudos(p)}
                    disabled={already || isSending}
                    aria-label={`${p.name}님에게 응원 보내기`}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                      already
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-input bg-card text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
                    } ${isSending ? "opacity-60" : ""}`}
                  >
                    <Avatar className="h-5 w-5 shrink-0">
                      {p.profileImage && <AvatarImage src={p.profileImage} alt={p.name} />}
                      <AvatarFallback className="text-[9px]">
                        {p.name?.[0] ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="max-w-[8rem] truncate font-medium">{p.name}</span>
                    {isSending ? (
                      <Loader2 size={11} className="animate-spin" aria-hidden />
                    ) : already ? (
                      <span className="inline-flex items-center gap-0.5 font-medium">
                        <Check size={11} aria-hidden /> 응원함
                      </span>
                    ) : (
                      <span aria-hidden>👏</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
