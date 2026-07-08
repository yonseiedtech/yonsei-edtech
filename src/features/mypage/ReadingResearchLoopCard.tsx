"use client";

// ── 읽기 → 연구 진척 병치 카드 (M5 / v2 L4) ──
//
// "최근 4주 논문 읽기"(paper_reading_logs)와 "같은 기간 논문 작성 글자 증가"
// (writing_paper_history.charCount 시계열)를 나란히 보여주는 소형 증명 카드.
//
// ⚠️ 인과 주장 금지 — 두 활동을 같은 기간에 병치할 뿐, "읽어서 늘었다"가 아니라
//   "함께 나타난 흐름"으로만 표현한다. 표본이 없으면 조용히 숨긴다.
//
// 데이터 원천 주의(실재 스키마 반영):
//   - 진척 지표로 "+X%p"(진행률 퍼센트포인트)는 과거 시점의 진행률 스냅샷이 없어
//     정직하게 산출 불가하다. writing_paper_history 는 charCount(글자수)만 적재하므로,
//     기간 내 "글자 증가량(+N자)"으로 병치한다(honest period metric).

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { paperReadingLogsApi, writingPaperHistoryApi } from "@/lib/bkend";
import type { PaperReadingLog } from "@/types/paper-reading";
import type { WritingPaperHistory } from "@/types";
import { BookOpenCheck, PenLine, ArrowRight } from "lucide-react";

const WINDOW_DAYS = 28;

interface LoopSummary {
  /** 최근 4주 읽은(readAt 기준) 논문 편수 */
  readingCount: number;
  /** 최근 4주 논문 작성 글자 증가량 (>0 만 유효 신호) */
  writingCharDelta: number;
}

function ymdDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function summarize(logs: PaperReadingLog[], history: WritingPaperHistory[]): LoopSummary {
  const windowYmd = ymdDaysAgo(WINDOW_DAYS);
  const windowMs = Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000;

  // 읽기 — readAt(YYYY-MM-DD)이 창(window) 안인 기록 수.
  const readingCount = (Array.isArray(logs) ? logs : []).filter(
    (l) => (l.readAt ?? "") >= windowYmd,
  ).length;

  // 작성 — history 를 savedAt 오름차순으로 보고, 창 시작 직전의 charCount 를 기준선으로.
  // 기준선이 없으면(창 안이 전부) 창 안 첫 스냅샷을 기준선으로 삼아 창 내 증가만 본다(보수적).
  let writingCharDelta = 0;
  const sorted = (Array.isArray(history) ? [...history] : []).sort((a, b) =>
    (a.savedAt ?? "").localeCompare(b.savedAt ?? ""),
  );
  if (sorted.length >= 2) {
    const latest = sorted[sorted.length - 1];
    let baseline: WritingPaperHistory | undefined;
    for (const h of sorted) {
      const t = Date.parse(h.savedAt ?? "");
      if (Number.isFinite(t) && t < windowMs) baseline = h; // 창 시작 직전까지 갱신
    }
    // 창 밖 기준선이 없으면 창 안 첫 스냅샷을 기준선으로.
    if (!baseline) baseline = sorted.find((h) => (h.savedAt ?? "") !== latest.savedAt);
    if (baseline && baseline !== latest) {
      writingCharDelta = (latest.charCount ?? 0) - (baseline.charCount ?? 0);
    }
  }

  return { readingCount, writingCharDelta: Math.max(0, writingCharDelta) };
}

export default function ReadingResearchLoopCard({ userId }: { userId: string }) {
  const { data } = useQuery({
    queryKey: ["mypage-reading-research-loop", userId],
    queryFn: async (): Promise<LoopSummary> => {
      const [logsRes, histRes] = await Promise.all([
        paperReadingLogsApi.listByUser(userId),
        writingPaperHistoryApi.listByUser(userId),
      ]);
      const logs = Array.isArray(logsRes.data) ? logsRes.data : [];
      const history = Array.isArray(histRes.data) ? histRes.data : [];
      return summarize(logs, history);
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });

  if (!data) return null;

  const { readingCount, writingCharDelta } = data;
  const hasReading = readingCount > 0;
  const hasWriting = writingCharDelta > 0;

  // 두 활동 모두 없으면 조용히 숨김.
  if (!hasReading && !hasWriting) return null;

  return (
    <div className="rounded-2xl border-2 border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-emerald-100/60 p-5 dark:border-emerald-800/40 dark:from-emerald-950/20 dark:to-emerald-900/10">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-200/40 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
          <BookOpenCheck size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold">읽기 → 연구 진척</h3>

          {/* 기간 병치 한 줄 — 인과 아님, 경향만 */}
          <p className="mt-1 text-sm text-emerald-900 dark:text-emerald-200">
            최근 4주 읽기{" "}
            <b className="tabular-nums">{readingCount}</b>편
            {hasWriting && (
              <>
                {" · "}논문 작성{" "}
                <b className="tabular-nums">+{writingCharDelta.toLocaleString()}</b>자
              </>
            )}
          </p>

          <p className="mt-1 text-[12px] text-muted-foreground">
            {hasReading && hasWriting
              ? "같은 기간의 두 활동을 나란히 본 흐름이에요. 인과가 아니라 함께 나타난 경향입니다."
              : hasReading
                ? "이번 4주 논문 읽기 기록이에요. 읽은 내용을 연구 작성으로 이어가 보세요."
                : "이번 4주 논문 작성 흐름이에요. 관련 논문 읽기를 함께 기록하면 진척과 나란히 볼 수 있어요."}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/mypage/research"
              className="inline-flex items-center gap-1 rounded-full border border-emerald-300 px-3 py-1.5 text-[12px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
            >
              <BookOpenCheck size={12} />
              읽기 기록
            </Link>
            <Link
              href="/research"
              className="inline-flex items-center gap-1 rounded-full border border-emerald-300 px-3 py-1.5 text-[12px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
            >
              <PenLine size={12} />
              논문 작성
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
