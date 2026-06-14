"use client";

/**
 * PaperReadingSection — 마이페이지 "내 논문 읽기" (사이클 120)
 * 읽은 논문 통계(총·이번주·집중시간) + 최근 타임라인 + 즉시 기록.
 * 데이터: usePaperReadingLogs (paper_reading_logs).
 */

import { useEffect, useMemo, useState } from "react";
import { BookOpenCheck, Plus, Star, Clock } from "lucide-react";
import { usePaperReadingLogs } from "../usePaperReadingLogs";
import ReadingLogModal from "./ReadingLogModal";
import { PAPER_READING_SOURCE_LABELS } from "@/types/paper-reading";
import { DEFAULT_WEEKLY_READING_GOAL } from "@/types/paper-reading";
import { todayYmdLocal } from "@/lib/dday";
import { cn } from "@/lib/utils";

function weekStartYmd(): string {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // 월=0
  d.setDate(d.getDate() - day);
  return todayYmdLocal(d);
}

export default function PaperReadingSection() {
  const { logs, isLoading } = usePaperReadingLogs();
  const [modalOpen, setModalOpen] = useState(false);
  const [owlOff, setOwlOff] = useState(false);

  useEffect(() => {
    setOwlOff(localStorage.getItem("omcReadingOwlOff") === "true");
  }, []);

  function reactivateOwl() {
    localStorage.removeItem("omcReadingOwlOff");
    localStorage.removeItem("omcReadingOwlHideUntil");
    setOwlOff(false);
  }

  const { total, thisWeek, totalMin } = useMemo(() => {
    const ws = weekStartYmd();
    return {
      total: logs.length,
      thisWeek: logs.filter((l) => (l.readAt ?? "") >= ws).length,
      totalMin: logs.reduce((s, l) => s + (l.durationMin ?? 0), 0),
    };
  }, [logs]);

  const goalPct = Math.min(100, Math.round((thisWeek / DEFAULT_WEEKLY_READING_GOAL) * 100));

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <BookOpenCheck className="h-4 w-4 text-teal-700" />
          내 논문 읽기
        </h3>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1 rounded-full bg-teal-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-teal-700"
        >
          <Plus className="h-3.5 w-3.5" />
          읽기 기록
        </button>
      </div>

      {owlOff && (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <span>🦉 떠다니는 읽기 타이머 부엉이가 꺼져 있어요</span>
          <button
            type="button"
            onClick={reactivateOwl}
            className="shrink-0 rounded-full bg-amber-600 px-2.5 py-1 font-medium text-white hover:bg-amber-700"
          >
            다시 켜기
          </button>
        </div>
      )}

      {/* 통계 3카드 + 주간 목표 */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border bg-background p-2 text-center">
          <p className="text-lg font-bold tabular-nums">{total}</p>
          <p className="text-[11px] text-muted-foreground">총 읽음(편)</p>
        </div>
        <div className="rounded-xl border bg-background p-2 text-center">
          <p className="text-lg font-bold tabular-nums text-teal-700">{thisWeek}</p>
          <p className="text-[11px] text-muted-foreground">이번 주(편)</p>
        </div>
        <div className="rounded-xl border bg-background p-2 text-center">
          <p className="text-lg font-bold tabular-nums">{totalMin}</p>
          <p className="text-[11px] text-muted-foreground">집중(분)</p>
        </div>
      </div>

      {/* 주간 목표 진행 바 */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>주간 목표</span>
          <span>
            {thisWeek} / {DEFAULT_WEEKLY_READING_GOAL}편
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              goalPct >= 100 ? "bg-emerald-500" : "bg-teal-500",
            )}
            style={{ width: `${goalPct}%` }}
          />
        </div>
      </div>

      {/* 최근 타임라인 */}
      <div className="mt-3 space-y-1.5">
        {isLoading ? (
          <p className="py-3 text-center text-xs text-muted-foreground">불러오는 중…</p>
        ) : logs.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            아직 읽기 기록이 없어요. 논문을 읽고 첫 기록을 남겨보세요 📖
          </p>
        ) : (
          logs.slice(0, 8).map((l) => (
            <div
              key={l.id}
              className="flex items-start justify-between gap-2 rounded-lg border bg-background px-2.5 py-1.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{l.title}</p>
                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="rounded bg-muted px-1">
                    {PAPER_READING_SOURCE_LABELS[l.source]}
                  </span>
                  <span>{l.readAt}</span>
                  {l.durationMin != null && (
                    <span className="inline-flex items-center gap-0.5">
                      <Clock className="h-3 w-3" />
                      {l.durationMin}분
                    </span>
                  )}
                </p>
                {l.oneLine && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">“{l.oneLine}”</p>
                )}
              </div>
              {l.rating ? (
                <span className="flex shrink-0 items-center gap-0.5 text-xs text-amber-500">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {l.rating}
                </span>
              ) : null}
            </div>
          ))
        )}
      </div>

      <ReadingLogModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        source="external"
      />
    </section>
  );
}
