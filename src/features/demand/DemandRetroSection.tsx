"use client";

/**
 * 수요조사 학기 회고 뷰 (v17-M6) — staff+ 전용 (console/demand 페이지 내 탭).
 *
 * 학기별 demand 보드(`demand-{YYYY}-{1|2}`)는 학기가 바뀌면 분리 저장된다.
 * 이 섹션은 지난 학기 보드를 읽어(집계만) 다음 학기 기획 근거를 제공한다.
 *
 * 원칙:
 *  - 읽기 전용 집계. 신규 컬렉션/필드/cron 없음. DB/rules 무변경.
 *  - 학기 선택 UI는 "실제로 존재하는 보드 키"에서만 구성한다.
 *  - 지난 학기 보드가 하나도 없으면(첫 학기) 크래시 없이 안전 표시.
 *
 * 집계:
 *  - 수요 건수 = 해당 학기 등록 항목 수
 *  - 개설 전환율 = opened / 전체 수요
 *  - 미개설 상위 = opened 안 된 수요 중 관심(관심있어요 likeCount) 많은 순 상위 5
 *    · 상위 5에 한해 "참여할래요"(demand-join) 반응 수를 보조 지표로 병기(N+1 방지 위해 5건으로 제한).
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  History,
  Loader2,
  Inbox,
  TrendingUp,
  Flame,
  Heart,
  Users,
  BarChart3,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { commBoardsApi, commQuestionsApi, commLikesApi } from "@/lib/bkend";
import { listSemesterKeys, currentSemesterKey, semesterLabelFromKey } from "@/lib/semester";
import { DOMAIN_OPTIONS } from "./useDemandCampaign";
import type { CommBoard, CommQuestion } from "@/types";

/** demandPref.status 부재 시 "collecting". 개설 판정은 "opened". */
function stageOf(q: CommQuestion): string {
  return q.demandPref?.status ?? "collecting";
}

/** 차트 카테고리 색상 — 시맨틱 CAT 토큰(라이트/다크 자동 대응, raw color 미도입). */
const CAT_COLORS = [
  "var(--color-cat-1)",
  "var(--color-cat-2)",
  "var(--color-cat-3)",
  "var(--color-cat-4)",
  "var(--color-cat-5)",
  "var(--color-cat-6)",
];

/** 분야 스택 색상 — "미분류"는 중립색, 나머지는 CAT 순환. */
function domainColor(domain: string, i: number): string {
  return domain === "미분류"
    ? "var(--color-muted-foreground)"
    : CAT_COLORS[i % CAT_COLORS.length];
}

/** 학기 키를 시간순(오래된→최신)으로 — "YYYY-N" 형식은 사전식 정렬이 곧 시간순. */
function chronoSort(keys: string[]): string[] {
  return [...keys].sort();
}

export default function DemandRetroSection() {
  // ── 1) 후보 지난 학기 키 (현재 학기 제외, 최신순) ──────────────────────────
  const pastKeys = useMemo(() => {
    const cur = currentSemesterKey();
    return listSemesterKeys(6, 0).filter((k) => k !== cur);
  }, []);

  // ── 2) 실제로 존재하는 보드만 (학기 선택 UI 소스) ──────────────────────────
  const { data: boards = [], isLoading: boardsLoading } = useQuery({
    queryKey: ["demand-retro-boards", pastKeys.join(",")],
    queryFn: async () => {
      const results = await Promise.all(
        pastKeys.map(async (key) => {
          const res = await commBoardsApi.listByContext("demand", `demand-${key}`);
          const board = (res.data as CommBoard[])[0];
          return board ? { key, board } : null;
        }),
      );
      return results.filter((r): r is { key: string; board: CommBoard } => r !== null);
    },
  });

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const activeKey = selectedKey ?? boards[0]?.key ?? null;
  const activeBoard = boards.find((b) => b.key === activeKey)?.board ?? null;

  // ── 3) 선택 학기 수요 항목 ─────────────────────────────────────────────────
  const { data: questions = [], isLoading: questionsLoading } = useQuery({
    queryKey: ["demand-retro-questions", activeBoard?.id],
    queryFn: () =>
      commQuestionsApi.listByBoard(activeBoard!.id).then((r) => r.data as CommQuestion[]),
    enabled: !!activeBoard,
  });

  // ── 4) 집계 ───────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = questions.length;
    const opened = questions.filter((q) => stageOf(q) === "opened").length;
    const rate = total > 0 ? Math.round((opened / total) * 100) : null;
    const unopened = [...questions]
      .filter((q) => stageOf(q) !== "opened")
      .sort((a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0))
      .slice(0, 5);
    return { total, opened, rate, unopened };
  }, [questions]);

  // ── 5) 미개설 상위 5건의 "참여할래요" 반응 수 (bounded — N+1 방지) ──────────
  const { data: joinCounts = {} } = useQuery({
    queryKey: ["demand-retro-joins", stats.unopened.map((q) => q.id).join(",")],
    queryFn: async () => {
      const entries = await Promise.all(
        stats.unopened.map(async (q) => {
          const responders = await commLikesApi.respondersOf("demand-join", q.id);
          return [q.id, responders.length] as const;
        }),
      );
      return Object.fromEntries(entries) as Record<string, number>;
    },
    enabled: stats.unopened.length > 0,
  });

  // ── 6) 학기 간 트렌드 (H4) — 존재하는 모든 지난 학기 보드의 수요 (bounded ≤6) ──
  const trendBoardsKey = boards.map((b) => b.board.id).join(",");
  const { data: trendQuestions = {}, isLoading: trendLoading } = useQuery({
    queryKey: ["demand-retro-trend", trendBoardsKey],
    queryFn: async () => {
      const entries = await Promise.all(
        boards.map(async ({ key, board }) => {
          const res = await commQuestionsApi
            .listByBoard(board.id)
            .catch(() => ({ data: [] as CommQuestion[] }));
          return [key, (res.data as CommQuestion[]) ?? []] as const;
        }),
      );
      return Object.fromEntries(entries) as Record<string, CommQuestion[]>;
    },
    enabled: boards.length > 0,
  });

  // 시간순 학기 키 + 학기별 수요/개설 건수 시계열
  const countSeries = useMemo(() => {
    const keys = chronoSort(boards.map((b) => b.key));
    return keys.map((key) => {
      const qs = trendQuestions[key] ?? [];
      return {
        label: semesterLabelFromKey(key),
        수요: qs.length,
        개설: qs.filter((q) => stageOf(q) === "opened").length,
      };
    });
  }, [boards, trendQuestions]);

  // 데이터가 실제로 존재하는 분야만 (순서: DOMAIN_OPTIONS → 미분류)
  const activeDomains = useMemo(() => {
    const set = new Set<string>();
    for (const qs of Object.values(trendQuestions)) {
      for (const q of qs ?? []) {
        const d = q.demandPref?.domain;
        set.add(d && (DOMAIN_OPTIONS as readonly string[]).includes(d) ? d : "미분류");
      }
    }
    const ordered = DOMAIN_OPTIONS.filter((d) => set.has(d)) as string[];
    if (set.has("미분류")) ordered.push("미분류");
    return ordered;
  }, [trendQuestions]);

  // 학기별 분야 분포 (스택 바용)
  const domainSeries = useMemo(() => {
    const keys = chronoSort(boards.map((b) => b.key));
    return keys.map((key) => {
      const qs = trendQuestions[key] ?? [];
      const row: Record<string, string | number> = { label: semesterLabelFromKey(key) };
      for (const d of activeDomains) row[d] = 0;
      for (const q of qs) {
        const d = q.demandPref?.domain;
        const bucket =
          d && (DOMAIN_OPTIONS as readonly string[]).includes(d) ? d : "미분류";
        if (bucket in row) row[bucket] = (row[bucket] as number) + 1;
      }
      return row;
    });
  }, [boards, trendQuestions, activeDomains]);

  // ── 로딩 ──────────────────────────────────────────────────────────────────
  if (boardsLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-muted-foreground" size={24} role="img" aria-label="불러오는 중" />
      </div>
    );
  }

  // ── 지난 학기 데이터 없음 (첫 학기 등) — 안전 표시 ─────────────────────────
  if (boards.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed py-16 text-muted-foreground">
        <History size={28} aria-hidden />
        <p className="text-sm">회고할 지난 학기 데이터가 아직 없습니다.</p>
        <p className="text-xs text-muted-foreground/70">
          한 학기 사이클이 완료되면 여기서 지난 학기 수요·개설 전환을 돌아볼 수 있습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── H4. 학기 간 트렌드 (지난 학기 보드 2개 이상일 때) ─────────────────── */}
      {boards.length >= 2 && (
        <div className="space-y-4">
          {/* 학기별 수요·개설 건수 추이 */}
          <div className="rounded-2xl border bg-card p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <BarChart3 size={14} className="text-primary" aria-hidden />
              학기별 수요·개설 추이
              <span className="text-[11px] font-normal text-muted-foreground">
                · 최근 {countSeries.length}개 학기
              </span>
            </p>
            {trendLoading ? (
              <div className="flex h-[220px] items-center justify-center">
                <Loader2
                  className="animate-spin text-muted-foreground"
                  size={20}
                  role="img"
                  aria-label="불러오는 중"
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <ResponsiveContainer width="100%" height={220} minWidth={280}>
                  <BarChart data={countSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="수요" fill="var(--color-cat-1)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="개설" fill="var(--color-cat-5)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* 분야별 수요 비중 변화 (스택 바) */}
          {activeDomains.length > 0 && (
            <div className="rounded-2xl border bg-card p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Layers size={14} className="text-primary" aria-hidden />
                분야별 수요 비중 변화
                <span className="text-[11px] font-normal text-muted-foreground">
                  · 학기별 분야 분포
                </span>
              </p>
              {trendLoading ? (
                <div className="flex h-[240px] items-center justify-center">
                  <Loader2
                    className="animate-spin text-muted-foreground"
                    size={20}
                    role="img"
                    aria-label="불러오는 중"
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <ResponsiveContainer width="100%" height={240} minWidth={280}>
                    <BarChart data={domainSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                      <Tooltip />
                      <Legend />
                      {activeDomains.map((d, i) => (
                        <Bar
                          key={d}
                          dataKey={d}
                          stackId="domain"
                          fill={domainColor(d, i)}
                          radius={
                            i === activeDomains.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]
                          }
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <p className="mt-2 text-[11px] text-muted-foreground/70">
                분야 미입력 수요는 &quot;미분류&quot;로 집계됩니다.
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <History size={13} className="text-muted-foreground" aria-hidden />
            <p className="text-xs font-semibold text-muted-foreground">학기별 상세 회고</p>
          </div>
        </div>
      )}

      {/* ── 학기 선택 (존재하는 보드 키만) ──────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {boards.map(({ key }) => (
          <button
            key={key}
            type="button"
            onClick={() => setSelectedKey(key)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              key === activeKey
                ? "border-primary bg-primary/10 text-primary"
                : "border-transparent bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {semesterLabelFromKey(key)}
          </button>
        ))}
      </div>

      {questionsLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-muted-foreground" size={24} role="img" aria-label="불러오는 중" />
        </div>
      ) : stats.total === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed py-16 text-muted-foreground">
          <Inbox size={28} aria-hidden />
          <p className="text-sm">
            {activeKey ? semesterLabelFromKey(activeKey) : "해당 학기"}에 등록된 수요가 없습니다.
          </p>
        </div>
      ) : (
        <>
          {/* ── 회고 요약 (절대값 + 비율) ──────────────────────────────────── */}
          <div className="rounded-2xl border bg-card p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <TrendingUp size={14} className="text-primary" aria-hidden />
              {activeKey ? semesterLabelFromKey(activeKey) : ""} 개설 전환 회고
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center rounded-xl border bg-muted/20 px-2 py-3">
                <p className="text-[11px] text-muted-foreground">수요 건수</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                  {stats.total}
                </p>
                <p className="text-[10px] text-muted-foreground">건</p>
              </div>
              <div className="flex flex-col items-center rounded-xl border bg-muted/20 px-2 py-3">
                <p className="text-[11px] text-muted-foreground">개설</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-success">
                  {stats.opened === 0 ? "—" : stats.opened}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {stats.opened === 0 ? "없음" : "건"}
                </p>
              </div>
              <div className="flex flex-col items-center rounded-xl border bg-muted/20 px-2 py-3">
                <p className="text-[11px] text-muted-foreground">개설 전환율</p>
                <p
                  className={cn(
                    "mt-1 text-2xl font-bold tabular-nums",
                    stats.rate === null
                      ? "text-muted-foreground"
                      : stats.rate >= 50
                        ? "text-success"
                        : "text-primary",
                  )}
                >
                  {stats.rate === null ? "—" : `${stats.rate}%`}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {stats.rate === null ? "데이터 부족" : `${stats.opened}/${stats.total}`}
                </p>
              </div>
            </div>
          </div>

          {/* ── 미개설 상위 주제 → 다음 학기 재점화 후보 ─────────────────────── */}
          {stats.unopened.length > 0 && (
            <div className="rounded-2xl border bg-card p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Flame size={14} className="text-primary" aria-hidden />
                미개설 상위 주제
                <span className="text-[11px] font-normal text-muted-foreground">
                  · 다음 학기 재점화 후보
                </span>
              </p>
              <ol className="space-y-2">
                {stats.unopened.map((q, i) => (
                  <li
                    key={q.id}
                    className="flex items-start gap-2 rounded-xl border bg-muted/20 px-3 py-2.5"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm font-medium text-foreground">{q.body}</span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                      <span
                        className="flex items-center gap-0.5"
                        aria-label={`관심있어요 ${q.likeCount ?? 0}명`}
                      >
                        <Heart size={11} className="text-primary" aria-hidden />
                        {q.likeCount ?? 0}
                      </span>
                      <span
                        className="flex items-center gap-0.5"
                        aria-label={`참여할래요 ${joinCounts[q.id] ?? 0}명`}
                      >
                        <Users size={11} aria-hidden />
                        {joinCounts[q.id] ?? 0}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-[11px] text-muted-foreground/70">
                관심있어요·참여할래요 반응이 많았으나 개설되지 못한 주제입니다.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
