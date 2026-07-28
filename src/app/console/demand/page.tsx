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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { commBoardsApi, commQuestionsApi, commLikesApi, activityParticipationsApi } from "@/lib/bkend";
import { DEMAND_CONTEXT_ID } from "@/features/demand/ensure-demand-board";
import DemandRetroSection from "@/features/demand/DemandRetroSection";
import DemandCampaignEditor from "@/features/demand/DemandCampaignEditor";
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

export default function DemandConsolePage() {
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [view, setView] = useState<"campaign" | "current" | "retro">("current");

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

  // ── 필터 + 정렬 (공감순) ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const base =
      filterTab === "all"
        ? questions
        : questions.filter((q) => q.presenter === filterTab);
    return [...base].sort((a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0));
  }, [questions, filterTab]);

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
            { key: "retro", label: "지난 학기 회고" },
          ] as { key: "campaign" | "current" | "retro"; label: string }[]
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
