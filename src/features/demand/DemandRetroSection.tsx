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
import { History, Loader2, Inbox, TrendingUp, Flame, Heart, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { commBoardsApi, commQuestionsApi, commLikesApi } from "@/lib/bkend";
import { listSemesterKeys, currentSemesterKey, semesterLabelFromKey } from "@/lib/semester";
import type { CommBoard, CommQuestion } from "@/types";

/** demandPref.status 부재 시 "collecting". 개설 판정은 "opened". */
function stageOf(q: CommQuestion): string {
  return q.demandPref?.status ?? "collecting";
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

  // ── 로딩 ──────────────────────────────────────────────────────────────────
  if (boardsLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  // ── 지난 학기 데이터 없음 (첫 학기 등) — 안전 표시 ─────────────────────────
  if (boards.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed py-16 text-muted-foreground">
        <History size={28} />
        <p className="text-sm">회고할 지난 학기 데이터가 아직 없습니다.</p>
        <p className="text-xs text-muted-foreground/70">
          한 학기 사이클이 완료되면 여기서 지난 학기 수요·개설 전환을 돌아볼 수 있습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
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
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      ) : stats.total === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed py-16 text-muted-foreground">
          <Inbox size={28} />
          <p className="text-sm">
            {activeKey ? semesterLabelFromKey(activeKey) : "해당 학기"}에 등록된 수요가 없습니다.
          </p>
        </div>
      ) : (
        <>
          {/* ── 회고 요약 (절대값 + 비율) ──────────────────────────────────── */}
          <div className="rounded-2xl border bg-card p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <TrendingUp size={14} className="text-primary" />
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
                <Flame size={14} className="text-primary" />
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
                      <span className="flex items-center gap-0.5">
                        <Heart size={11} className="text-primary" />
                        {q.likeCount ?? 0}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Users size={11} />
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
