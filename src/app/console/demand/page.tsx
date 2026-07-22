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
import {
  ClipboardList,
  Download,
  Loader2,
  Inbox,
  BarChart3,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { commBoardsApi, commQuestionsApi } from "@/lib/bkend";
import { DEMAND_CONTEXT_ID } from "@/features/demand/ensure-demand-board";
import type { CommQuestion, CommBoard } from "@/types";

type FilterTab = "all" | "스터디 희망" | "세미나 희망";
const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "스터디 희망", label: "스터디" },
  { key: "세미나 희망", label: "세미나" },
];

/** 수식 인젝션 방어 — HackathonDdayConsole 패턴 동일 */
function escapeCell(v: string): string {
  const flat = v.replace(/\r?\n/g, " ");
  const safe = /^[=+\-@\t\r]/.test(flat) ? `'${flat}` : flat;
  return `"${safe.replace(/"/g, '""')}"`;
}

export default function DemandConsolePage() {
  const [filterTab, setFilterTab] = useState<FilterTab>("all");

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
    return { total, totalLikes, studyCount, seminarCount, top3 };
  }, [questions]);

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
    </div>
  );
}
