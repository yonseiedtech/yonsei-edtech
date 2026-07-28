"use client";

/**
 * 수요 조사 집계 콘솔 (2026-07-23) — staff+ 전용 (console/layout AuthGuard 로 보호)
 *
 * - 전체 수요 항목 목록 (공감순·유형별 필터)
 * - 요약 (총 건수·공감 합계·Top3)
 * - CSV 내보내기 (수식 인젝션 escape — HackathonDdayConsole 패턴)
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ClipboardList,
  Download,
  Loader2,
  Inbox,
  BarChart3,
  Heart,
  TrendingUp,
  Lightbulb,
  BookOpen,
  PlusCircle,
  LayoutGrid,
  Clock,
  Users,
  Target,
  Megaphone,
  CalendarDays,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { commBoardsApi, commQuestionsApi, commLikesApi, activityParticipationsApi } from "@/lib/bkend";
import { DEMAND_CONTEXT_ID } from "@/features/demand/ensure-demand-board";
import DemandRetroSection from "@/features/demand/DemandRetroSection";
import DemandCampaignEditor from "@/features/demand/DemandCampaignEditor";
import {
  useDemandCampaign,
  daysBetweenYmd,
  DOMAIN_OPTIONS,
  DIFFICULTY_OPTIONS,
  TIME_OPTIONS,
} from "@/features/demand/useDemandCampaign";
import { useEffectiveSemesterKey } from "@/features/site-settings/useCurrentSemester";
import type { CommQuestion, CommBoard } from "@/types";

type FilterTab = "all" | "스터디 희망" | "세미나 희망";
const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "스터디 희망", label: "스터디" },
  { key: "세미나 희망", label: "세미나" },
];

type DemandStage = "collecting" | "reviewing" | "leader" | "designing" | "opened" | "declined";
const STAGE_LABELS: Record<DemandStage, string> = {
  collecting: "수집중",
  reviewing: "검토중",
  leader: "모임장",
  designing: "설계중",
  opened: "개설됨",
  declined: "보류",
};
/** 개설 퍼널 순서(보류 제외) */
const FUNNEL_ORDER: DemandStage[] = ["collecting", "reviewing", "leader", "designing", "opened"];
function stageOf(q: CommQuestion): DemandStage {
  return (q.demandPref?.status as DemandStage | undefined) ?? "collecting";
}
const STAGE_BADGE: Record<DemandStage, string> = {
  collecting: "bg-muted text-muted-foreground",
  reviewing: "bg-primary/10 text-primary",
  leader: "bg-primary/10 text-primary",
  designing: "bg-primary/10 text-primary",
  opened: "bg-success/10 text-success",
  declined: "bg-muted text-muted-foreground",
};

/** 수식 인젝션 방어 — HackathonDdayConsole 패턴 동일 */
function escapeCell(v: string): string {
  const flat = v.replace(/\r?\n/g, " ");
  const safe = /^[=+\-@\t\r]/.test(flat) ? `'${flat}` : flat;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** 개설 정족수 — DemandSurveySection JOIN_THRESHOLD 와 동일 값(미export 상수 재선언) */
const JOIN_THRESHOLD = 3;
const UNCLASSIFIED = "미분류";

/** demandPref 구조화 필드를 옵션 집합으로 정규화(미입력·미지 값 → 미분류) */
function normDomain(q: CommQuestion): string {
  const d = q.demandPref?.domain;
  return d && (DOMAIN_OPTIONS as readonly string[]).includes(d) ? d : UNCLASSIFIED;
}
function normDifficulty(q: CommQuestion): string {
  const d = q.demandPref?.difficulty;
  return d && (DIFFICULTY_OPTIONS as readonly string[]).includes(d) ? d : UNCLASSIFIED;
}
function normTime(q: CommQuestion): string {
  const t = q.demandPref?.preferredTime;
  return t && (TIME_OPTIONS as readonly string[]).includes(t) ? t : UNCLASSIFIED;
}

/** 히트맵 셀 강도 — 시맨틱 토큰 + opacity(raw color 미도입) */
function heatClass(count: number, max: number): string {
  if (count <= 0) return "bg-muted/20 text-muted-foreground";
  const r = max <= 0 ? 0 : count / max;
  if (r > 0.75) return "bg-primary/40 text-foreground";
  if (r > 0.5) return "bg-primary/30 text-foreground";
  if (r > 0.25) return "bg-primary/20 text-foreground";
  return "bg-primary/10 text-foreground";
}

export default function DemandConsolePage() {
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [view, setView] = useState<"campaign" | "current" | "insights" | "retro">("current");
  // M2 히트맵 셀 클릭 → 목록 필터(domain × difficulty). insights 탭에서 클릭 시 current 로 이동.
  const [cellFilter, setCellFilter] = useState<{ domain: string; difficulty: string } | null>(null);
  const semesterKey = useEffectiveSemesterKey();
  const { campaign } = useDemandCampaign(semesterKey);

  // ── 보드 조회 (ensure 불필요 — 콘솔은 읽기 전용) ────────────────────────
  const { data: board } = useQuery({
    queryKey: ["demand-board-console"],
    queryFn: async () => {
      const res = await commBoardsApi.listByContext("demand", DEMAND_CONTEXT_ID);
      return (res.data as unknown as CommBoard[])[0] ?? null;
    },
  });

  // ── 수요 항목 목록 ───────────────────────────────────────────────────────
  const { data: questions = [], isLoading } = useQuery({
    queryKey: ["demand-questions-console", board?.id],
    queryFn: () =>
      commQuestionsApi.listByBoard(board!.id).then((r) => r.data as CommQuestion[]),
    enabled: !!board,
  });

  // ── 참여 의사(demand-join) 카운트 — targetId(질문 id)별 (M3·M7·집계 공용) ──
  const { data: joinCounts = {} } = useQuery({
    queryKey: ["demand-joins-console", board?.id],
    queryFn: () => commLikesApi.countsByType("demand-join"),
    enabled: !!board,
  });

  // ── 필터 + 정렬 (공감순) ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let base =
      filterTab === "all"
        ? questions
        : questions.filter((q) => q.presenter === filterTab);
    if (cellFilter) {
      base = base.filter(
        (q) =>
          normDomain(q) === cellFilter.domain &&
          normDifficulty(q) === cellFilter.difficulty,
      );
    }
    return [...base].sort((a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0));
  }, [questions, filterTab, cellFilter]);

  // ── Phase 2 집계 (M2 히트맵 · M3 시간대 · M7 캠페인 대시보드) ───────────────
  const insights = useMemo(() => {
    const all = questions ?? [];
    const join = (id: string) => joinCounts[id] ?? 0;

    // KPI
    const total = all.length;
    const quorumReached = all.filter((q) => join(q.id) >= JOIN_THRESHOLD).length;
    const openedCount = all.filter((q) => stageOf(q) === "opened").length;

    // M2-1 캠페인 주제(topicId)별 집계 — 자유 입력은 미분류
    const topics = campaign?.topics ?? [];
    const topicIdSet = new Set(topics.map((t) => t.id));
    const topicRows = [
      ...topics.map((t) => ({ id: t.id, label: t.label })),
      { id: "__none__", label: UNCLASSIFIED },
    ].map((t) => {
      const items =
        t.id === "__none__"
          ? all.filter(
              (q) =>
                !q.demandPref?.campaignTopicId ||
                !topicIdSet.has(q.demandPref.campaignTopicId),
            )
          : all.filter((q) => q.demandPref?.campaignTopicId === t.id);
      return {
        id: t.id,
        label: t.label,
        count: items.length,
        likes: items.reduce((s, q) => s + (q.likeCount ?? 0), 0),
        joins: items.reduce((s, q) => s + join(q.id), 0),
      };
    });
    const topicMax = Math.max(0, ...topicRows.map((r) => r.count));

    // M2-2 domain × difficulty 매트릭스
    const domainRows = [...DOMAIN_OPTIONS, UNCLASSIFIED];
    const diffCols = [...DIFFICULTY_OPTIONS, UNCLASSIFIED];
    const matrix: Record<string, Record<string, number>> = {};
    for (const dr of domainRows) {
      matrix[dr] = {};
      for (const dc of diffCols) matrix[dr][dc] = 0;
    }
    for (const q of all) matrix[normDomain(q)][normDifficulty(q)] += 1;
    // 값이 있는 행/열만 노출(과밀 방지)
    const activeDomains = domainRows.filter((dr) =>
      diffCols.some((dc) => matrix[dr][dc] > 0),
    );
    const activeDiffs = diffCols.filter((dc) =>
      domainRows.some((dr) => matrix[dr][dc] > 0),
    );
    const matrixMax = Math.max(
      0,
      ...domainRows.flatMap((dr) => diffCols.map((dc) => matrix[dr][dc])),
    );

    // M3 시간대별 수요·참여 인원
    const timeSlots = [...TIME_OPTIONS, UNCLASSIFIED];
    const timeRows = timeSlots
      .map((slot) => {
        const items = all.filter((q) => normTime(q) === slot);
        return {
          slot,
          count: items.length,
          joins: items.reduce((s, q) => s + join(q.id), 0),
        };
      })
      .filter((r) => r.count > 0);

    // M7 캠페인 기간 내 일별 등록 추이 (createdAt 기준)
    let campaignDaily: { date: string; count: number }[] = [];
    let focusPct: number | null = null;
    if (campaign && campaign.startDate && campaign.endDate) {
      const span = daysBetweenYmd(campaign.startDate, campaign.endDate);
      if (span !== null && span >= 0 && span <= 90) {
        const perDay: Record<string, number> = {};
        for (const q of all) {
          const d = (q.createdAt ?? "").slice(0, 10);
          if (d >= campaign.startDate && d <= campaign.endDate) {
            perDay[d] = (perDay[d] ?? 0) + 1;
          }
        }
        campaignDaily = Array.from({ length: span + 1 }, (_, i) => {
          const ms = Date.parse(`${campaign.startDate}T00:00:00Z`) + i * 86400000;
          const date = new Date(ms).toISOString().slice(0, 10);
          return { date, count: perDay[date] ?? 0 };
        });
      }
      const withTopic = all.filter(
        (q) =>
          q.demandPref?.campaignTopicId &&
          topicIdSet.has(q.demandPref.campaignTopicId),
      ).length;
      focusPct = total === 0 ? null : Math.round((withTopic / total) * 100);
    }
    const dailyMax = Math.max(0, ...campaignDaily.map((d) => d.count));

    return {
      kpi: { total, quorumReached, openedCount },
      topicRows,
      topicMax,
      matrix,
      activeDomains,
      activeDiffs,
      matrixMax,
      timeRows,
      campaignDaily,
      dailyMax,
      focusPct,
    };
  }, [questions, joinCounts, campaign]);

  // ── 요약 통계 ─────────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const total = questions.length;
    const totalLikes = questions.reduce((s, q) => s + (q.likeCount ?? 0), 0);
    const studyCount = questions.filter((q) => q.presenter === "스터디 희망").length;
    const seminarCount = questions.filter((q) => q.presenter === "세미나 희망").length;
    const top3 = [...questions]
      .sort((a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0))
      .slice(0, 3);
    // 스터디 개설 퍼널 단계별 카운트
    const studyItems = questions.filter((q) => q.presenter === "스터디 희망");
    const funnel = FUNNEL_ORDER.reduce(
      (acc, s) => {
        acc[s] = studyItems.filter((q) => stageOf(q) === s).length;
        return acc;
      },
      {} as Record<DemandStage, number>,
    );
    const declined = studyItems.filter((q) => stageOf(q) === "declined").length;
    return { total, totalLikes, studyCount, seminarCount, top3, funnel, declined };
  }, [questions]);

  // ── H3 퍼널 지표 (statusHistory 기반) ─────────────────────────────────────
  // 리드타임(등록→개설)·단계별 평균 체류·이탈률. statusHistory 없는 레거시는 제외(가드).
  // 순수 데이터 파생(useMemo 내 계산 — 렌더 경로 Date.now 없음).
  const funnelMetrics = useMemo(() => {
    const studyItems = questions.filter((q) => q.presenter === "스터디 희망");
    const daysBetween = (a: string, b: string): number | null => {
      const ta = Date.parse(a);
      const tb = Date.parse(b);
      if (Number.isNaN(ta) || Number.isNaN(tb)) return null;
      return (tb - ta) / 86400000;
    };
    const avg = (xs: number[]): number | null =>
      xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null;

    // 리드타임: createdAt → statusHistory 의 opened at
    const leadDays: number[] = [];
    // 단계별 체류: 인접 단계 첫 발생 시각 차 (collecting→…→opened)
    const pairs: [DemandStage, DemandStage][] = [
      ["collecting", "reviewing"],
      ["reviewing", "leader"],
      ["leader", "designing"],
      ["designing", "opened"],
    ];
    const dwell: Record<string, number[]> = {};
    let tracked = 0; // statusHistory 보유(비레거시) 수

    for (const q of studyItems) {
      const hist = q.demandPref?.statusHistory;
      if (!hist || hist.length === 0) continue;
      tracked += 1;
      // 상태별 최초 발생 시각
      const firstAt: Record<string, string> = {};
      for (const h of hist) if (!(h.status in firstAt)) firstAt[h.status] = h.at;

      const openedAt = firstAt["opened"];
      if (openedAt && q.createdAt) {
        const d = daysBetween(q.createdAt, openedAt);
        if (d !== null && d >= 0) leadDays.push(d);
      }
      for (const [from, to] of pairs) {
        const a = firstAt[from];
        const b = firstAt[to];
        if (a && b) {
          const d = daysBetween(a, b);
          if (d !== null && d >= 0) (dwell[`${from}>${to}`] ??= []).push(d);
        }
      }
    }

    const stageDwell = pairs.map(([from, to]) => ({
      from,
      to,
      avgDays: avg(dwell[`${from}>${to}`] ?? []),
      n: (dwell[`${from}>${to}`] ?? []).length,
    }));

    const total = studyItems.length;
    const declined = studyItems.filter((q) => stageOf(q) === "declined").length;

    return {
      tracked,
      avgLeadDays: avg(leadDays),
      leadN: leadDays.length,
      stageDwell,
      dropRate: total > 0 ? Math.round((declined / total) * 100) : null,
      declined,
      total,
    };
  }, [questions]);

  // ── 개설 후 전환 집계 ─────────────────────────────────────────────────────
  const openedStudies = useMemo(
    () =>
      questions.filter(
        (q) =>
          q.presenter === "스터디 희망" &&
          stageOf(q) === "opened" &&
          !!q.demandPref?.linkedActivityId,
      ),
    [questions],
  );

  const { data: conversionData } = useQuery({
    queryKey: ["demand-conversion", openedStudies.map((q) => q.id).join(",")],
    queryFn: async () => {
      const results = await Promise.all(
        openedStudies.map(async (q) => {
          const activityId = q.demandPref!.linkedActivityId!;
          const [responders, participations] = await Promise.all([
            commLikesApi.respondersOf("demand-join", q.id),
            activityParticipationsApi.listByActivity(activityId).then((r) => r.data),
          ]);
          const intendedIds = new Set(responders.map((r) => r.userId));
          const actualCount = participations.filter((p) => intendedIds.has(p.userId)).length;
          return {
            questionId: q.id,
            topic: q.body ?? "",
            intendedCount: responders.length,
            actualCount,
          };
        }),
      );
      return results;
    },
    enabled: openedStudies.length > 0,
  });

  // ── 세미나 수요 상위 5개 (M7) ─────────────────────────────────────────────
  const topSeminarDemands = useMemo(
    () =>
      [...questions]
        .filter((q) => q.presenter === "세미나 희망")
        .sort((a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0))
        .slice(0, 5),
    [questions],
  );

  // ── CSV 내보내기 ──────────────────────────────────────────────────────────
  function exportCsv() {
    const header = "주제,유형,형태,메모,공감수,작성자,작성일";
    const rows = filtered.map((q) => {
      const pref = q.demandPref;
      return [
        escapeCell(q.body ?? ""),
        escapeCell(q.presenter ?? ""),
        escapeCell(pref?.format ?? "무관"),
        escapeCell(pref?.note ?? ""),
        String(q.likeCount ?? 0),
        escapeCell(q.authorName ?? ""),
        (q.createdAt ?? "").slice(0, 10),
      ].join(",");
    });
    const csv = "﻿" + [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `demand-survey-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <ConsolePageHeader
        icon={ClipboardList}
        title="수요 조사 집계"
        description="회원이 등록한 스터디·세미나 개설 희망 수요를 집계합니다."
        actions={
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download size={13} className="mr-1" />
            CSV
          </Button>
        }
      />

      {/* ── 모드 탭 (현재 수요 / 지난 학기 회고) ──────────────────────────── */}
      <div className="flex gap-2">
        {(
          [
            { key: "campaign", label: "수요조사 캠페인" },
            { key: "current", label: "현재 수요" },
            { key: "insights", label: "집계·인사이트" },
            { key: "retro", label: "지난 학기 회고" },
          ] as { key: "campaign" | "current" | "insights" | "retro"; label: string }[]
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              view === key
                ? "border-primary bg-primary/10 text-primary"
                : "border-transparent bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "campaign" ? (
        <DemandCampaignEditor />
      ) : view === "retro" ? (
        <DemandRetroSection />
      ) : view === "insights" ? (
        <>
          {/* ── Phase 2 KPI 카드 ─────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { label: "총 수요", value: insights.kpi.total, unit: "건", icon: ClipboardList },
                { label: "정족수 도달", value: insights.kpi.quorumReached, unit: `건 (${JOIN_THRESHOLD}명+)`, icon: Target },
                { label: "개설 전환", value: insights.kpi.openedCount, unit: `/ ${insights.kpi.total}건`, icon: TrendingUp },
              ] as { label: string; value: number; unit: string; icon: typeof Target }[]
            ).map(({ label, value, unit, icon: Icon }) => (
              <div key={label} className="flex flex-col items-center rounded-2xl border bg-card px-2 py-3">
                <Icon size={14} className="text-primary" />
                <p className="mt-1.5 text-2xl font-bold tabular-nums text-foreground">
                  {value === 0 ? "—" : value}
                </p>
                <p className="text-[11px] font-medium text-foreground">{label}</p>
                <p className="text-[10px] text-muted-foreground">{unit}</p>
              </div>
            ))}
          </div>

          {/* ── M2-1 캠페인 주제별 수요 ──────────────────────────────────── */}
          {insights.topicRows.length > 1 && (
            <div className="rounded-2xl border bg-card p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Megaphone size={14} className="text-primary" />
                캠페인 주제별 수요
                <span className="text-[11px] font-normal text-muted-foreground">· 관심·참여 집계</span>
              </p>
              <div className="space-y-1.5">
                {insights.topicRows.map((r) => (
                  <div key={r.id} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 truncate text-xs text-foreground" title={r.label}>
                      {r.label}
                    </span>
                    <div className="flex h-5 flex-1 items-center overflow-hidden rounded-full bg-muted/30">
                      <div
                        className="h-full rounded-full bg-primary/30"
                        style={{
                          width: `${insights.topicMax > 0 ? Math.max(r.count > 0 ? 8 : 0, (r.count / insights.topicMax) * 100) : 0}%`,
                        }}
                        aria-hidden
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">
                      {r.count}
                    </span>
                    <span className="flex w-24 shrink-0 items-center justify-end gap-2 text-[10px] tabular-nums text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Heart size={9} className="text-primary" />
                        {r.likes}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Users size={9} />
                        {r.joins}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── M2-2 분야 × 난이도 히트맵 ────────────────────────────────── */}
          {insights.activeDomains.length > 0 && (
            <div className="rounded-2xl border bg-card p-4">
              <p className="mb-1 flex items-center gap-2 text-sm font-semibold">
                <LayoutGrid size={14} className="text-primary" />
                분야 × 난이도 히트맵
              </p>
              <p className="mb-3 text-[11px] text-muted-foreground">
                셀을 클릭하면 해당 조건의 수요 목록으로 이동합니다.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-1 text-xs">
                  <thead>
                    <tr>
                      <th className="p-1 text-left font-medium text-muted-foreground" />
                      {insights.activeDiffs.map((dc) => (
                        <th key={dc} className="p-1 text-center font-medium text-muted-foreground">
                          {dc}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {insights.activeDomains.map((dr) => (
                      <tr key={dr}>
                        <td className="whitespace-nowrap p-1 pr-2 text-right font-medium text-foreground">
                          {dr}
                        </td>
                        {insights.activeDiffs.map((dc) => {
                          const c = insights.matrix[dr][dc];
                          return (
                            <td key={dc} className="p-0">
                              <button
                                type="button"
                                disabled={c === 0}
                                onClick={() => {
                                  setCellFilter({ domain: dr, difficulty: dc });
                                  setFilterTab("all");
                                  setView("current");
                                }}
                                className={cn(
                                  "flex h-9 w-full min-w-[44px] items-center justify-center rounded-md text-xs font-semibold tabular-nums transition-opacity",
                                  heatClass(c, insights.matrixMax),
                                  c > 0 ? "cursor-pointer hover:opacity-80" : "cursor-default",
                                )}
                                aria-label={`${dr} · ${dc} 수요 ${c}건`}
                              >
                                {c === 0 ? "" : c}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── M3 시간대 겹침 분석 ──────────────────────────────────────── */}
          {insights.timeRows.length > 0 && (
            <div className="rounded-2xl border bg-card p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Clock size={14} className="text-primary" />
                시간대 겹침 분석
                <span className="text-[11px] font-normal text-muted-foreground">· 참여 의사 기준</span>
              </p>
              <div className="space-y-2">
                {insights.timeRows.map((r) => {
                  const feasible = r.joins >= JOIN_THRESHOLD;
                  return (
                    <div
                      key={r.slot}
                      className={cn(
                        "flex flex-col gap-1 rounded-xl border px-3 py-2.5",
                        feasible ? "border-success/30 bg-success/5" : "bg-muted/20",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-16 shrink-0 text-sm font-medium text-foreground">
                          {r.slot}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          수요 <span className="font-semibold tabular-nums text-foreground">{r.count}</span>건 ·
                          참여 의사 <span className="font-semibold tabular-nums text-foreground">{r.joins}</span>명
                        </span>
                        {feasible && (
                          <span className="ml-auto rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                            성사 가능
                          </span>
                        )}
                      </div>
                      {feasible && (
                        <p className="pl-[4.5rem] text-[11px] text-success">
                          이 시간대로 개설하면 {r.joins}명 참여 가능
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── M7 캠페인 결과 대시보드 (캠페인 있을 때만) ──────────────── */}
          {campaign ? (
            <div className="rounded-2xl border bg-card p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Megaphone size={14} className="text-primary" />
                <span className="text-sm font-semibold text-foreground">{campaign.title || "수요조사 캠페인"}</span>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px]",
                    campaign.status === "active" && "bg-success/10 text-success",
                    campaign.status === "closed" && "bg-muted text-muted-foreground",
                  )}
                >
                  {campaign.status === "active" ? "진행중" : campaign.status === "closed" ? "마감" : "초안"}
                </Badge>
                {campaign.startDate && campaign.endDate && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <CalendarDays size={11} />
                    {campaign.startDate} ~ {campaign.endDate}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <div className="flex flex-col items-center rounded-xl border bg-muted/20 px-2 py-3">
                  <p className="text-[11px] text-muted-foreground">등록 수(응답)</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                    {insights.kpi.total === 0 ? "—" : insights.kpi.total}
                  </p>
                </div>
                <div className="flex flex-col items-center rounded-xl border bg-muted/20 px-2 py-3">
                  <p className="text-[11px] text-muted-foreground">주제 집중도</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                    {insights.focusPct === null ? "—" : `${insights.focusPct}%`}
                  </p>
                  <p className="text-[10px] text-muted-foreground">사전 주제 선택 비율</p>
                </div>
                <div className="flex flex-col items-center rounded-xl border bg-muted/20 px-2 py-3">
                  <p className="text-[11px] text-muted-foreground">개설 전환</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                    {insights.kpi.openedCount === 0 ? "—" : insights.kpi.openedCount}
                  </p>
                  <p className="text-[10px] text-muted-foreground">/ {insights.kpi.total}건</p>
                </div>
              </div>

              {/* 기간 내 일별 등록 추이 */}
              {insights.campaignDaily.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">기간 내 일별 등록 추이</p>
                  <div className="flex items-end gap-0.5" style={{ height: 64 }}>
                    {insights.campaignDaily.map((d) => (
                      <div
                        key={d.date}
                        className="flex flex-1 flex-col items-center justify-end"
                        title={`${d.date}: ${d.count}건`}
                      >
                        <div
                          className={cn("w-full rounded-t", d.count > 0 ? "bg-primary/40" : "bg-muted/40")}
                          style={{
                            height: `${insights.dailyMax > 0 && d.count > 0 ? Math.max(6, (d.count / insights.dailyMax) * 56) : 2}px`,
                          }}
                          aria-hidden
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
                    <span>{insights.campaignDaily[0]?.date.slice(5)}</span>
                    <span>{insights.campaignDaily[insights.campaignDaily.length - 1]?.date.slice(5)}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed bg-card p-4 text-center text-sm text-muted-foreground">
              이번 학기 캠페인이 설정되지 않았습니다. 캠페인 결과 대시보드는 캠페인 설정 후 표시됩니다.
            </div>
          )}
        </>
      ) : (
        <>
      {/* ── 요약 통계 ──────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border bg-card p-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <BarChart3 size={14} className="text-primary" />
          수요 요약
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(
            [
              { label: "총 건수", value: summary.total, unit: "건" },
              { label: "공감 합계", value: summary.totalLikes, unit: "회" },
              { label: "스터디 희망", value: summary.studyCount, unit: "건" },
              { label: "세미나 희망", value: summary.seminarCount, unit: "건" },
            ] as { label: string; value: number; unit: string }[]
          ).map(({ label, value, unit }) => (
            <div
              key={label}
              className="flex flex-col items-center rounded-xl border bg-muted/20 px-2 py-3"
            >
              <p className="text-[11px] text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                {value === 0 ? "—" : value}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {value === 0 ? "없음" : unit}
              </p>
            </div>
          ))}
        </div>

        {/* Top 3 */}
        {summary.top3.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">공감 Top 3</p>
            <ol className="space-y-1.5">
              {summary.top3.map((q, i) => (
                <li key={q.id} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-foreground">{q.body}</span>
                  <span className="flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground">
                    <Heart size={11} className="text-primary" />
                    {q.likeCount ?? 0}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* ── 스터디 개설 퍼널 ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border bg-card p-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <BarChart3 size={14} className="text-primary" />
          스터디 개설 퍼널
          {summary.declined > 0 && (
            <span className="ml-1 text-[11px] font-normal text-muted-foreground">
              · 보류 {summary.declined}
            </span>
          )}
        </p>
        <div className="flex items-stretch gap-1.5 overflow-x-auto">
          {FUNNEL_ORDER.map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              <div
                className={cn(
                  "flex min-w-[68px] flex-col items-center rounded-xl border px-3 py-2",
                  s === "opened" && "border-success/30",
                )}
              >
                <span className={cn("text-xl font-bold tabular-nums", s === "opened" ? "text-success" : "text-foreground")}>
                  {summary.funnel[s] || 0}
                </span>
                <span className="text-[10px] text-muted-foreground">{STAGE_LABELS[s]}</span>
              </div>
              {i < FUNNEL_ORDER.length - 1 && (
                <span className="text-muted-foreground/40" aria-hidden>›</span>
              )}
            </div>
          ))}
        </div>

        {/* ── H3 퍼널 지표 (리드타임·단계별 체류·이탈률) ──────────────────── */}
        <div className="mt-4 border-t pt-4">
          {funnelMetrics.tracked === 0 ? (
            <p className="text-xs text-muted-foreground">
              이력(statusHistory) 기반 지표는 새 상태 전환이 쌓인 후 표시됩니다.
              <span className="text-muted-foreground/70"> 기존 수요는 이력이 없어 집계에서 제외됩니다.</span>
            </p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center rounded-xl border bg-muted/20 px-2 py-3">
                  <Clock size={13} className="text-primary" />
                  <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
                    {funnelMetrics.avgLeadDays === null
                      ? "—"
                      : `${funnelMetrics.avgLeadDays.toFixed(1)}일`}
                  </p>
                  <p className="text-[10px] text-muted-foreground">개설 리드타임</p>
                  <p className="text-[9px] text-muted-foreground/70">
                    {funnelMetrics.leadN === 0 ? "개설 이력 없음" : `개설 ${funnelMetrics.leadN}건`}
                  </p>
                </div>
                <div className="flex flex-col items-center rounded-xl border bg-muted/20 px-2 py-3">
                  <TrendingUp size={13} className="text-primary" />
                  <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
                    {funnelMetrics.dropRate === null ? "—" : `${funnelMetrics.dropRate}%`}
                  </p>
                  <p className="text-[10px] text-muted-foreground">이탈률</p>
                  <p className="text-[9px] text-muted-foreground/70">
                    보류 {funnelMetrics.declined} / {funnelMetrics.total}건
                  </p>
                </div>
                <div className="flex flex-col items-center rounded-xl border bg-muted/20 px-2 py-3">
                  <Target size={13} className="text-primary" />
                  <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
                    {funnelMetrics.tracked}
                  </p>
                  <p className="text-[10px] text-muted-foreground">이력 추적 수요</p>
                  <p className="text-[9px] text-muted-foreground/70">statusHistory 보유</p>
                </div>
              </div>

              {/* 단계별 평균 체류 */}
              <div>
                <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">
                  단계별 평균 체류
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {funnelMetrics.stageDwell.map((d) => (
                    <span
                      key={`${d.from}>${d.to}`}
                      className="inline-flex items-center gap-1 rounded-lg border bg-muted/20 px-2 py-1 text-[10px] text-muted-foreground"
                    >
                      {STAGE_LABELS[d.from]}
                      <span className="text-muted-foreground/50">›</span>
                      {STAGE_LABELS[d.to]}
                      <span className="font-semibold tabular-nums text-foreground">
                        {d.avgDays === null ? "—" : `${d.avgDays.toFixed(1)}일`}
                      </span>
                      {d.n > 0 && <span className="text-muted-foreground/60">({d.n})</span>}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 세미나 수요 상위 주제 → 콘텐츠 전환 힌트 (M7) ──────────────────── */}
      {topSeminarDemands.length > 0 && (
        <div className="rounded-2xl border bg-card p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Lightbulb size={14} className="text-primary" />
            세미나 수요 상위 주제
            <span className="text-[11px] font-normal text-muted-foreground">· 콘텐츠 전환 힌트</span>
          </p>
          <ol className="space-y-2">
            {topSeminarDemands.map((q, i) => (
              <li
                key={q.id}
                className="flex flex-col gap-1.5 rounded-xl border bg-muted/20 px-3 py-2.5"
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium text-foreground">{q.body}</span>
                  <span className="flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground">
                    <Heart size={11} className="text-primary" />
                    {q.likeCount ?? 0}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 pl-7">
                  <Link
                    href={`/console/learning-guides?draftTitle=${encodeURIComponent(q.body ?? "")}`}
                    className="flex items-center gap-1 rounded-lg border bg-background px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/5"
                  >
                    <BookOpen size={11} />
                    러닝 가이드 초안 만들기
                  </Link>
                  <Link
                    href="/console/academic/seminars/create"
                    className="flex items-center gap-1 rounded-lg border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                  >
                    <PlusCircle size={11} />
                    세미나 개설 검토
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ── 개설 후 전환 집계 ───────────────────────────────────────────────── */}
      {openedStudies.length > 0 && (
        <div className="rounded-2xl border bg-card p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <TrendingUp size={14} className="text-primary" />
            개설 후 전환
          </p>
          {!conversionData ? (
            <div className="flex justify-center py-4">
              <Loader2 className="animate-spin text-muted-foreground" size={18} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-semibold text-muted-foreground">
                    <th className="pb-2 pr-3 font-semibold">주제</th>
                    <th className="pb-2 pr-3 font-semibold">참여 의사</th>
                    <th className="pb-2 pr-3 font-semibold">실참여</th>
                    <th className="pb-2 font-semibold">전환율</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {conversionData.map((row) => {
                    const rate =
                      row.intendedCount === 0
                        ? null
                        : Math.round((row.actualCount / row.intendedCount) * 100);
                    return (
                      <tr key={row.questionId} className="hover:bg-muted/30">
                        <td className="py-2.5 pr-3 font-medium text-foreground">
                          {row.topic}
                        </td>
                        <td className="py-2.5 pr-3 tabular-nums text-foreground">
                          {row.intendedCount === 0 ? "—" : `${row.intendedCount}명`}
                        </td>
                        <td className="py-2.5 pr-3 tabular-nums text-foreground">
                          {row.intendedCount === 0 ? "—" : `${row.actualCount}명`}
                        </td>
                        <td className="py-2.5 tabular-nums">
                          {rate === null ? (
                            <span className="text-xs text-muted-foreground">데이터 부족</span>
                          ) : (
                            <span
                              className={cn(
                                "font-semibold",
                                rate >= 50 ? "text-success" : "text-primary",
                              )}
                            >
                              {rate}%
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── 히트맵 셀 필터 칩 (M2 연동) ─────────────────────────────────────── */}
      {cellFilter && (
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {cellFilter.domain} × {cellFilter.difficulty}
            <button
              type="button"
              onClick={() => setCellFilter(null)}
              className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-primary/20"
              aria-label="히트맵 필터 해제"
            >
              <X size={11} />
            </button>
          </span>
          <span className="text-xs text-muted-foreground">{filtered.length}건</span>
        </div>
      )}

      {/* ── 필터 탭 ────────────────────────────────────────────────────────── */}
      <div className="flex gap-0 border-b">
        {FILTER_TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilterTab(key)}
            className={cn(
              "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              filterTab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
            <span
              className={cn(
                "ml-1.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
                filterTab === key
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {key === "all"
                ? questions.length
                : questions.filter((q) => q.presenter === key).length}
            </span>
          </button>
        ))}
      </div>

      {/* ── 목록 ───────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed py-16 text-muted-foreground">
          <Inbox size={28} />
          <p className="text-sm">등록된 수요 항목이 없습니다.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs font-semibold text-muted-foreground">
                <th className="pb-2 pr-3 font-semibold">공감</th>
                <th className="pb-2 pr-3 font-semibold">주제</th>
                <th className="pb-2 pr-3 font-semibold">유형</th>
                <th className="pb-2 pr-3 font-semibold">단계</th>
                <th className="pb-2 pr-3 font-semibold">형태</th>
                <th className="pb-2 pr-3 font-semibold">메모</th>
                <th className="pb-2 pr-3 font-semibold">작성자</th>
                <th className="pb-2 font-semibold">작성일</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((q) => {
                const pref = q.demandPref;
                return (
                  <tr key={q.id} className="hover:bg-muted/30">
                    <td className="py-2.5 pr-3">
                      <span className="flex items-center gap-1 font-semibold tabular-nums text-primary">
                        <Heart size={12} className="fill-primary" />
                        {q.likeCount ?? 0}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 font-medium text-foreground">
                      {q.body}
                    </td>
                    <td className="py-2.5 pr-3">
                      <Badge variant="secondary" className="text-[10px]">
                        {q.presenter ?? "기타"}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", STAGE_BADGE[stageOf(q)])}>
                        {STAGE_LABELS[stageOf(q)]}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">
                      {pref?.format ?? "—"}
                    </td>
                    <td className="max-w-[180px] py-2.5 pr-3 text-xs text-muted-foreground">
                      {pref?.note ?? "—"}
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">
                      {q.authorName ?? "—"}
                    </td>
                    <td className="py-2.5 text-muted-foreground">
                      {(q.createdAt ?? "").slice(0, 10)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
        </>
      )}
    </div>
  );
}
