"use client";

/**
 * ThesisProgressWidget — "내 논문 X%" 상시 가시화 위젯 (백로그 v2 M1).
 *
 * 에디터 안에서만 보이던 보고서 완성도 3개 지표를 마이페이지·대시보드로 끌어낸다:
 *   1. 장별 작성 진행률 — computeThesisProgress (레벨 기반)
 *   2. 분량 균형 — chapterBalance (권장 비중 범위 ok/low/high)
 *   3. writing-lint 통과율 — lintThesis warn 0건 장 / 본문 있는 장
 *
 * 데이터는 모두 기존 read-only hook/순수 함수 재사용 (writing_paper·proposal).
 * 진행률 계산은 thesis-progress.computeReportCompletion (순수 함수)에 위임 — 표시·연결만.
 * 본문이 전혀 없으면 "논문 작성 시작" CTA 를 표시한다. 클릭 시 /research 로 이동.
 *
 * 변형(variant):
 *   - "card"    : 마이페이지용 풀 카드 (장별 막대 + 균형/lint 요약)
 *   - "compact" : 대시보드 인접용 간결 카드 (핵심 지표만)
 */

import Link from "next/link";
import { useMemo } from "react";
import { FileText, ArrowRight, CheckCircle2, AlertTriangle, PenLine } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import { useWritingPaper } from "@/features/research/useWritingPaper";
import { useResearchProposal } from "@/features/research/useResearchProposal";
import {
  computeThesisProgress,
  chapterBalance,
  computeReportCompletion,
  THESIS_CHAPTER_KEYS,
  THESIS_CHAPTER_SHORT_LABELS,
  BALANCE_MIN_CHARS,
  type ChapterProgress,
} from "@/features/research/thesis-progress";
import { lintThesis } from "@/features/research/writing-lint";
import type { WritingPaperChapterKey } from "@/types";

const LEVEL_PCT: Record<number, number> = { 0: 0, 1: 33, 2: 66, 3: 100 };
const LEVEL_LABEL: Record<number, string> = {
  0: "미작성",
  1: "시작",
  2: "진행",
  3: "본궤도",
};

interface Props {
  /** "card"(마이페이지) | "compact"(대시보드). 기본 card */
  variant?: "card" | "compact";
}

export default function ThesisProgressWidget({ variant = "card" }: Props) {
  const { user } = useAuthStore();
  const userId = user?.id;

  const { paper } = useWritingPaper(userId);
  const { proposal } = useResearchProposal(userId);

  const data = useMemo(() => {
    const progress = computeThesisProgress({
      paper: paper ?? null,
      hasProposal: !!(
        proposal &&
        (proposal.titleKo || proposal.purpose || proposal.content)
      ),
    });
    const balance =
      progress.totalChars >= BALANCE_MIN_CHARS
        ? chapterBalance(
            progress.chapters.map((c) => ({ key: c.key, chars: c.chars })),
            progress.totalChars,
          )
        : [];

    // writing-lint warn 집계 — sections(구조화 본문)가 있을 때만 의미.
    const writtenKeys = progress.chapters.filter((c) => c.level >= 1).map((c) => c.key);
    let cleanChapters = 0;
    if (paper?.sections && writtenKeys.length > 0) {
      const issues = lintThesis(paper.sections);
      const warnByChapter = new Set<WritingPaperChapterKey>();
      for (const i of issues) {
        if (i.severity === "warn") warnByChapter.add(i.chapter);
      }
      cleanChapters = writtenKeys.filter((k) => !warnByChapter.has(k)).length;
    } else {
      // 구조화 본문이 없으면 lint 대상 아님 → 통과율 미측정(분모 0)
      cleanChapters = 0;
    }
    const writtenChapters = paper?.sections ? writtenKeys.length : 0;

    const completion = computeReportCompletion({
      progress,
      balance,
      cleanChapters,
      writtenChapters,
    });

    return { progress, balance, completion };
  }, [paper, proposal]);

  if (!userId) return null;

  const { progress, completion } = data;
  const hasContent = progress.totalChars > 0;

  // 본문 0자 — 작성 시작 CTA
  if (!hasContent) {
    return (
      <Link
        href="/research"
        className="group block rounded-2xl border-2 border-dashed border-warning/20 bg-warning/5 p-5 transition-colors hover:border-warning/30"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warning/20 text-warning">
            <PenLine size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold">내 논문 진행도</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              아직 작성한 본문이 없어요. 5장 작성을 시작하면 완성도를 한눈에 추적할 수 있어요.
            </p>
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-warning">
              논문 작성 시작 <ArrowRight size={12} />
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href="/research"
      className="group block rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:bg-muted/30 sm:p-5"
    >
      <div className="flex items-center gap-2">
        <FileText size={18} className="text-warning" aria-hidden="true" />
        <h3 className="font-bold">내 논문 진행도</h3>
        <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors group-hover:text-foreground">
          보고서로 이동 <ArrowRight size={11} />
        </span>
      </div>

      {/* 종합 완성도 */}
      <div className="mt-3 flex items-end gap-2">
        <span className="text-3xl font-bold leading-none tabular-nums text-warning">
          {completion.overallPercent}
          <span className="ml-0.5 text-base font-normal text-muted-foreground">%</span>
        </span>
        <span className="pb-0.5 text-xs text-muted-foreground">
          보고서 완성도
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-warning transition-all"
          style={{ width: `${Math.max(0, Math.min(100, completion.overallPercent))}%` }}
        />
      </div>

      {/* 보조 지표 요약 칩 */}
      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
          작성률 {completion.writingPercent}%
        </span>
        {completion.balancePercent !== null && (
          <span
            className={
              completion.balanceFlagged > 0
                ? "inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-warning"
                : "inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-success"
            }
          >
            {completion.balanceFlagged > 0 ? (
              <AlertTriangle size={10} />
            ) : (
              <CheckCircle2 size={10} />
            )}
            분량 균형 {completion.balancePercent}%
          </span>
        )}
        {completion.lintPassPercent !== null && (
          <span
            className={
              completion.lintPassPercent < 100
                ? "inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-warning"
                : "inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-success"
            }
          >
            {completion.lintPassPercent < 100 ? (
              <AlertTriangle size={10} />
            ) : (
              <CheckCircle2 size={10} />
            )}
            점검 통과 {completion.lintPassPercent}%
          </span>
        )}
      </div>

      {/* 장별 막대 — card 변형에서만 */}
      {variant === "card" && (
        <div className="mt-4 grid grid-cols-5 gap-1.5">
          {THESIS_CHAPTER_KEYS.map((key) => {
            const ch = progress.chapters.find((c) => c.key === key) as ChapterProgress;
            const pct = LEVEL_PCT[ch.level];
            return (
              <div key={key} className="flex flex-col items-center gap-1">
                <div className="flex h-16 w-full items-end overflow-hidden rounded-md bg-muted">
                  <div
                    className="w-full rounded-md bg-warning transition-all"
                    style={{ height: `${Math.max(6, pct)}%` }}
                    aria-hidden="true"
                  />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">
                  {THESIS_CHAPTER_SHORT_LABELS[key]}
                </span>
                <span className="text-[9px] text-muted-foreground/70">
                  {LEVEL_LABEL[ch.level]}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Link>
  );
}
