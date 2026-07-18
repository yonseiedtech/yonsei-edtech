"use client";

/**
 * 학습 잔디 Leaderboard
 *
 * streak_events 컬렉션을 1회 전체 fetch → 클라이언트 그룹·합산 (N+1 회피).
 * showInLeaderboard=false 인 회원은 이름 대신 "ㅇㅇ" 익명 처리.
 *
 * 탭: 최근 30일 / 이번 학기 / 전체
 * Top 50 표시 + 본인이 Top 50 밖이면 별도 row 강조.
 * "더 보기" 버튼으로 51~100위 추가 노출.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Medal, Flame, ChevronDown, ArrowLeft } from "lucide-react";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import { dataApi, profilesApi } from "@/lib/bkend";
import PageHeader from "@/components/ui/page-header";
import PageContainer from "@/components/ui/page-container";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getMemberStage, type MemberStage } from "@/lib/member-stage";
import type { StreakEvent, User } from "@/types";

// ── 탭 정의 ────────────────────────────────────────────────────────────────
type RangeKey = "30d" | "semester" | "all";

const RANGE_TABS: { key: RangeKey; label: string }[] = [
  { key: "30d", label: "최근 30일" },
  { key: "semester", label: "이번 학기" },
  { key: "all", label: "전체" },
];

// ── 코호트(회원 단계) 분해 ──────────────────────────────────────────────────
// 전역 원점수 순위는 상·하위 소수만 동기부여 → 같은 단계끼리의 "동류 비교"를 제공.
// 단계 판정은 member-stage.getMemberStage 재사용. 리더보드는 회원별 진단 이력을
// 추가 fetch(N+1)하지 않으므로 diagnosticCount는 undefined로 두어 가입일·퍼소나
// 기준(신입=가입 60일 이내 / 졸업생=alumni 퍼소나 / 그 외=재학·논문)으로만 나눈다.
type CohortKey = "all" | "mine";

const STAGE_LABEL: Record<MemberStage, string> = {
  newcomer: "신입",
  researcher: "재학·논문",
  alumni: "졸업생",
};

// ── 학기 시작 날짜 계산 ─────────────────────────────────────────────────────
function currentSemesterStartYmd(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1; // 1-based
  // 전기: 3월 / 후기: 9월 / 1~2월: 작년 후기(9월)
  if (m >= 3 && m <= 8) return `${y}-03-01`;
  if (m >= 9) return `${y}-09-01`;
  return `${y - 1}-09-01`;
}

// ── 메달 ───────────────────────────────────────────────────────────────────
function MedalBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span title="1위" aria-label="1위">🥇</span>;
  if (rank === 2) return <span title="2위" aria-label="2위">🥈</span>;
  if (rank === 3) return <span title="3위" aria-label="3위">🥉</span>;
  return <span className="tabular-nums text-muted-foreground">{rank}</span>;
}

// ── 메인 컴포넌트 (AuthGuard 래핑) ─────────────────────────────────────────
export default function LeaderboardPage() {
  return (
    <AuthGuard>
      <LeaderboardContent />
    </AuthGuard>
  );
}

// ── 집계 결과 타입 ──────────────────────────────────────────────────────────
interface RankedEntry {
  userId: string;
  displayName: string;
  isAnon: boolean;
  totalScore: number;
  rank: number;
  stage: MemberStage;
}

// ── 정렬된 점수 → 순위 배열 (동점 처리 공통 헬퍼) ───────────────────────────
// [userId, score] 내림차순 배열을 받아 rank(동점 동순위)를 매긴다.
// 전역·코호트 두 곳에서 재사용.
function assignRanks(
  sorted: [string, number][],
  userMap: Map<string, User>,
  now: number,
): RankedEntry[] {
  const result: RankedEntry[] = [];
  let rank = 1;
  for (let i = 0; i < sorted.length; i++) {
    const [userId, totalScore] = sorted[i];
    if (i > 0 && sorted[i - 1][1] !== totalScore) rank = i + 1;
    const u = userMap.get(userId);
    const isAnon = !u || u.showInLeaderboard === false;
    const displayName = isAnon ? "ㅇㅇ" : u.name;
    // 진단 이력은 리더보드에서 미조회 → undefined(가입일·퍼소나 기준 판정).
    const stage = getMemberStage(u, undefined, now);
    result.push({ userId, displayName, isAnon, totalScore, rank, stage });
  }
  return result;
}

function LeaderboardContent() {
  const { user: authUser } = useAuthStore();
  const myId = authUser?.id ?? "";

  const [range, setRange] = useState<RangeKey>("30d");
  const [cohort, setCohort] = useState<CohortKey>("all");
  const [showMore, setShowMore] = useState(false);

  // 내 단계 판정 — 코호트 필터·백분위 서사의 기준.
  const myStage = getMemberStage(authUser, undefined);

  // ── 1. streak_events 전체 1회 fetch ─────────────────────────────────────
  const { data: eventsRes, isLoading: eventsLoading } = useQuery({
    queryKey: ["leaderboard", "streak_events"],
    queryFn: () => dataApi.list<StreakEvent>("streak_events", { limit: 10000 }),
    staleTime: 3 * 60_000,
  });

  // ── 2. 관련 userId 수집 → profilesApi.listByIds 일괄 fetch ──────────────
  const userIds = useMemo(() => {
    const events = eventsRes?.data ?? [];
    return Array.from(new Set(events.map((e) => e.userId).filter(Boolean)));
  }, [eventsRes]);

  const { data: usersRaw = [], isLoading: usersLoading } = useQuery({
    queryKey: ["leaderboard", "users", userIds.join(",")],
    queryFn: () => profilesApi.listByIds(userIds),
    enabled: userIds.length > 0,
    staleTime: 5 * 60_000,
  });

  const userMap = useMemo(() => {
    const m = new Map<string, User>();
    for (const u of usersRaw) m.set(u.id, u);
    return m;
  }, [usersRaw]);

  // ── 3. 기간 필터 ymd 경계 ────────────────────────────────────────────────
  const cutoffYmd = useMemo(() => {
    if (range === "all") return "";
    if (range === "semester") return currentSemesterStartYmd();
    // 30d
    const d = new Date();
    d.setDate(d.getDate() - 30);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${mo}-${da}`;
  }, [range]);

  // ── 4. 전역 집계 ─────────────────────────────────────────────────────────
  const rankedGlobal = useMemo<RankedEntry[]>(() => {
    const events = eventsRes?.data ?? [];
    const scores = new Map<string, number>();

    for (const ev of events) {
      if (!ev.userId) continue;
      if (cutoffYmd && ev.ymd < cutoffYmd) continue;
      scores.set(ev.userId, (scores.get(ev.userId) ?? 0) + ev.points);
    }

    const sorted = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
    return assignRanks(sorted, userMap, Date.now());
  }, [eventsRes, cutoffYmd, userMap]);

  // ── 4b. 내 단계 코호트(재순위) — 백분위 서사·"내 단계" 탭의 기준 ─────────
  // 전역과 무관하게 항상 내 단계 안에서의 순위를 계산(카드 백분위 안정).
  const myCohortRanked = useMemo<RankedEntry[]>(() => {
    const inStage = rankedGlobal
      .filter((r) => r.stage === myStage)
      .map((r) => [r.userId, r.totalScore] as [string, number]);
    // 이미 점수 내림차순 → 코호트 내부에서 rank 재부여.
    return assignRanks(inStage, userMap, Date.now());
  }, [rankedGlobal, myStage, userMap]);

  // 활성 탭에 따른 표시 목록.
  const ranked = cohort === "mine" ? myCohortRanked : rankedGlobal;

  // ── 5. 본인 위치(활성 탭 기준) ───────────────────────────────────────────
  const myEntry = useMemo(
    () => ranked.find((r) => r.userId === myId),
    [ranked, myId],
  );
  const myRank = myEntry?.rank ?? null;
  const isMyInTop50 = myRank !== null && myRank <= 50;

  // ── 5b. 내 단계 백분위 + 주간 추세(원점수 대신 백분위 중심 서사) ─────────
  const myStageEntry = useMemo(
    () => myCohortRanked.find((r) => r.userId === myId),
    [myCohortRanked, myId],
  );
  // 상위 N% = 내 단계 코호트 안에서의 순위 백분위(1~100, 낮을수록 상위).
  const myPercentile = useMemo(() => {
    if (!myStageEntry || myCohortRanked.length === 0) return null;
    return Math.max(
      1,
      Math.min(100, Math.round((myStageEntry.rank / myCohortRanked.length) * 100)),
    );
  }, [myStageEntry, myCohortRanked]);

  // 이번 주(최근 7일) 내가 획득한 점수 — 기간 탭과 무관한 주간 추세.
  const myWeeklyGain = useMemo(() => {
    if (!myId) return 0;
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    const week = `${y}-${mo}-${da}`;
    let sum = 0;
    for (const ev of eventsRes?.data ?? []) {
      if (ev.userId === myId && ev.ymd >= week) sum += ev.points;
    }
    return sum;
  }, [eventsRes, myId]);

  // ── 6. 표시 목록 ─────────────────────────────────────────────────────────
  const top50 = ranked.slice(0, 50);
  const top100 = ranked.slice(0, 100);
  const displayList = showMore ? top100 : top50;

  const isLoading = eventsLoading || (userIds.length > 0 && usersLoading);

  return (
    <PageContainer width="default">
      <PageHeader
        icon={Trophy}
        title="학습 잔디 순위"
        actions={
          <Link
            href="/mypage"
            className="inline-flex items-center gap-1.5 rounded-md border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-xs hover:bg-muted"
          >
            <ArrowLeft size={14} />
            마이페이지
          </Link>
        }
      />

      {/* 탭 */}
      <nav className="mt-6 flex gap-1 overflow-x-auto border-b" aria-label="기간 탭">
        {RANGE_TABS.map((tab) => {
          const isActive = range === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => { setRange(tab.key); setShowMore(false); }}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-none items-center gap-1 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* 코호트(단계) 탭 — 전역 vs 내 단계 동류 비교 */}
      <nav
        className="mt-3 flex gap-1 overflow-x-auto"
        aria-label="비교 대상 탭"
      >
        {([
          { key: "all" as CohortKey, label: "전체" },
          { key: "mine" as CohortKey, label: `내 단계 · ${STAGE_LABEL[myStage]}` },
        ]).map((tab) => {
          const isActive = cohort === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => { setCohort(tab.key); setShowMore(false); }}
              aria-pressed={isActive}
              className={cn(
                "flex flex-none items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* 내 위치 카드 — 원점수 대신 "내 단계 기준 백분위 + 주간 추세" 서사 */}
      {!isLoading && myStageEntry && myPercentile !== null && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-primary/30 bg-primary/5 px-5 py-3.5">
          <Flame size={18} className="shrink-0 text-primary" />
          <p className="text-sm">
            {STAGE_LABEL[myStage]} 동료 중{" "}
            <strong className="text-primary">상위 {myPercentile}%</strong>
            <span className="ml-1 text-muted-foreground">
              ({myCohortRanked.length}명 중 {myStageEntry.rank}위)
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            이번 주{" "}
            <strong className="text-primary">
              +{myWeeklyGain.toLocaleString()}점
            </strong>
          </p>
        </div>
      )}

      {/* 순위표 */}
      <div className="mt-4 rounded-2xl border bg-card">
        {isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 10 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-xl" />
            ))}
          </div>
        ) : ranked.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-sm text-muted-foreground">
            <Medal size={36} className="text-muted-foreground/40" />
            <p>이 기간에 아직 기록이 없습니다.</p>
          </div>
        ) : (
          <>
            {/* 헤더 */}
            <div className="grid grid-cols-[48px_1fr_80px] gap-2 border-b px-5 py-2.5 text-xs font-semibold text-muted-foreground">
              <span>순위</span>
              <span>회원</span>
              <span className="text-right">점수</span>
            </div>

            {/* 목록 */}
            <ol>
              {displayList.map((entry) => {
                const isMe = entry.userId === myId;
                return (
                  <li
                    key={entry.userId}
                    className={cn(
                      "grid grid-cols-[48px_1fr_80px] items-center gap-2 border-b px-5 py-3 last:border-0",
                      isMe && "bg-primary/5",
                    )}
                  >
                    <span className="flex items-center text-sm font-semibold">
                      <MedalBadge rank={entry.rank} />
                    </span>
                    <span
                      className={cn(
                        "truncate text-sm font-medium",
                        entry.isAnon && "text-muted-foreground",
                        isMe && "text-primary",
                      )}
                    >
                      {entry.displayName}
                      {isMe && (
                        <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          나
                        </span>
                      )}
                    </span>
                    <span className="text-right text-sm tabular-nums font-semibold">
                      {entry.totalScore.toLocaleString()}
                    </span>
                  </li>
                );
              })}
            </ol>

            {/* 본인이 Top 50 밖일 때 별도 row */}
            {myEntry && !isMyInTop50 && (
              <>
                <div className="flex items-center gap-2 px-5 py-1.5 text-[11px] text-muted-foreground">
                  <span className="flex-1 border-t" />
                  <span>…</span>
                  <span className="flex-1 border-t" />
                </div>
                <div className="grid grid-cols-[48px_1fr_80px] items-center gap-2 border-t bg-primary/5 px-5 py-3">
                  <span className="text-sm font-semibold text-primary">
                    {myEntry.rank}
                  </span>
                  <span className="truncate text-sm font-medium text-primary">
                    {myEntry.displayName}
                    <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                      나
                    </span>
                  </span>
                  <span className="text-right text-sm tabular-nums font-semibold">
                    {myEntry.totalScore.toLocaleString()}
                  </span>
                </div>
              </>
            )}

            {/* 더 보기 */}
            {!showMore && ranked.length > 50 && (
              <div className="border-t p-3 text-center">
                <button
                  type="button"
                  onClick={() => setShowMore(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <ChevronDown size={14} />
                  더 보기 (51~{Math.min(ranked.length, 100)}위)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">
        {/* RT-2(2026-07-04): 실제 집계 기준(streak_events 합산)으로 문구 정정 — 기존 안내는 잔디 점수원을 나열해 사실과 달랐음 */}
        점수 = 활동 이벤트 합산 — 세미나 출석 +10 · 논문 작성 +6 · 글/후기/진단 +5 · 읽기 +4 · 타이머 30분 +3 ·
        댓글 +1 · 온보딩/공동 연구/연구지 출판/모임 참석/매트릭스·모형·스튜디오/방학 목표 등
        <span className="ml-1">(세미나 출석·집필 등 일반 활동은 2026-07 이후 기록부터 반영)</span>
      </p>
    </PageContainer>
  );
}
