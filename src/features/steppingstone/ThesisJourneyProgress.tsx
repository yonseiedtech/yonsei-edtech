"use client";

/**
 * ThesisJourneyProgress — 논문 여정 4단계 산출물 퍼널 진행률 (v17 L2).
 *
 * 마이페이지 "논문 여정" 영역에서 계획서→설계→작성→보고서 4단계 산출물의
 * 완료 여부와 현재 위치를 한 줄 퍼널로 시각화한다. H3 JourneyStepperWidget 과
 * 동일한 시맨틱 토큰(primary 진행 바 · success 완료 · muted 예정)으로 시각 일관성을 맞춘다.
 *
 * 단계 판정은 전부 기존 read-only 훅 재사용(DB/rules 무변경):
 *   1) 계획서 → useResearchProposal (제목·목적·본문 중 1개+ 작성)
 *   2) 설계   → useResearchDesign (접근 방식 또는 절차 단계 1개+)
 *   3) 작성   → useWritingPaper + computeThesisProgress (장별 작성률 10%+)
 *   4) 보고서 → useResearchReport (분야·문제정의·이론정의 등 핵심 필드 1개+)
 *
 * 산출물이 하나도 없으면(논문 미시작) 크래시 없이 "논문 여정을 시작해보세요" 안내를 표시한다.
 * 훅 캐시 키는 에디터·ThesisProgressWidget 과 공유해 추가 read 를 만들지 않는다.
 */

import { Fragment, useMemo } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Check, Compass, ClipboardList, DraftingCompass, FileText, FileEdit, ArrowRight } from "lucide-react";
import WidgetCard from "@/components/ui/widget-card";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/auth-store";
import { useResearchProposal } from "@/features/research/useResearchProposal";
import { useResearchDesign } from "@/features/research/useResearchDesign";
import { useWritingPaper } from "@/features/research/useWritingPaper";
import { useResearchReport } from "@/features/research/useResearchReport";
import { computeThesisProgress } from "@/features/research/thesis-progress";

interface FunnelStage {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  done: boolean;
}

export default function ThesisJourneyProgress() {
  const { user } = useAuthStore();
  const userId = user?.id;

  const { proposal } = useResearchProposal(userId);
  const { design } = useResearchDesign(userId);
  const { paper } = useWritingPaper(userId);
  const { report } = useResearchReport(userId);

  const stages = useMemo<FunnelStage[]>(() => {
    const proposalDone = !!(
      proposal && (proposal.titleKo || proposal.purpose || proposal.content)
    );
    const designDone = !!(
      design &&
      ((design.approach ?? "").trim() || (design.procedureSteps?.length ?? 0) > 0)
    );
    const writingDone =
      computeThesisProgress({ paper: paper ?? null, hasProposal: proposalDone }).percent >= 10;
    const reportDone = !!(
      report &&
      (report.fieldDescription ||
        report.problemDefinition ||
        report.fieldProblem ||
        report.theoryDefinition ||
        report.priorResearchAnalysis)
    );

    return [
      { key: "proposal", label: "계획서", href: "/mypage/research?tab=proposal", icon: ClipboardList, done: proposalDone },
      { key: "design", label: "설계", href: "/mypage/research?tab=design", icon: DraftingCompass, done: designDone },
      { key: "writing", label: "작성", href: "/mypage/research?tab=writing", icon: FileText, done: writingDone },
      { key: "report", label: "보고서", href: "/mypage/research?tab=reportdoc", icon: FileEdit, done: reportDone },
    ];
  }, [proposal, design, paper, report]);

  const total = stages.length;
  const doneCount = stages.filter((s) => s.done).length;
  const pct = Math.round((doneCount / total) * 100);
  const activeIdx = stages.findIndex((s) => !s.done); // 첫 미완 단계 = 현재 위치 (-1이면 완주)
  const allDone = doneCount === total;

  if (!userId) return null;

  // 논문 미시작 — 크래시 없이 안전 안내
  if (doneCount === 0) {
    return (
      <WidgetCard title="논문 여정" icon={Compass} semantic="info">
        <p className="mt-2 text-sm text-muted-foreground">
          아직 작성한 논문 산출물이 없어요. 계획서부터 시작하면 계획서→설계→작성→보고서 여정 진행률을 한눈에 추적할 수 있어요.
        </p>
        <Link
          href="/mypage/research?tab=proposal"
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          논문 여정을 시작해보세요
          <ArrowRight size={12} aria-hidden />
        </Link>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard
      title="논문 여정"
      icon={Compass}
      semantic={allDone ? "success" : "info"}
      actions={
        <span
          className={cn(
            "text-xs font-semibold tabular-nums",
            allDone ? "text-success" : "text-muted-foreground",
          )}
        >
          {doneCount}/{total}
        </span>
      }
    >
      {/* 전체 진행률 바 — H3 스텝퍼와 동일 시각(primary 채움) */}
      <div className="mt-3" aria-label={`논문 여정 진행률 ${pct}%`}>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          계획서부터 보고서까지, 4단계 산출물의 진행 위치를 보여줘요.
        </p>
      </div>

      {/* 4단계 노드 — 색만이 아니라 아이콘·상태 텍스트 병기(a11y) */}
      <ol className="mt-4 flex items-start gap-0" aria-label="논문 산출물 4단계">
        {stages.map((stage, i) => {
          const isDone = stage.done;
          const isCurrent = !isDone && i === activeIdx;
          const StageIcon = stage.icon;
          const statusText = isDone ? "완료" : isCurrent ? "진행 중" : "예정";

          return (
            <Fragment key={stage.key}>
              <li className="flex min-w-0 flex-1 flex-col items-center">
                <Link
                  href={stage.href}
                  title={`${stage.label} 탭으로 이동`}
                  aria-label={`${stage.label} — ${statusText}`}
                  className="flex flex-col items-center gap-1 text-center transition-opacity hover:opacity-80"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                      isDone
                        ? "border-success bg-success/15 text-success"
                        : isCurrent
                          ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                          : "border-muted bg-muted/60 text-muted-foreground/50",
                    )}
                  >
                    {isDone ? <Check size={15} strokeWidth={3} /> : <StageIcon size={15} />}
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-semibold leading-tight",
                      isDone ? "text-success" : isCurrent ? "text-primary" : "text-muted-foreground/60",
                    )}
                  >
                    {stage.label}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] leading-tight",
                      isCurrent ? "font-medium text-primary" : "text-muted-foreground/50",
                    )}
                  >
                    {statusText}
                  </span>
                </Link>
              </li>
              {i < total - 1 && (
                <span
                  aria-hidden
                  className={cn(
                    "mt-4 h-0.5 flex-1 rounded-full",
                    isDone ? "bg-success/40" : "bg-muted",
                  )}
                />
              )}
            </Fragment>
          );
        })}
      </ol>

      {/* 완주 축하 · 다음 단계 CTA */}
      {allDone ? (
        <p className="mt-3 text-center text-xs font-semibold text-success">
          4단계 산출물을 모두 작성했어요 🎉
        </p>
      ) : activeIdx >= 0 ? (
        <Link
          href={stages[activeIdx].href}
          className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <span className="min-w-0 truncate">다음: {stages[activeIdx].label} 이어가기</span>
          <ArrowRight size={15} className="shrink-0" aria-hidden />
        </Link>
      ) : null}
    </WidgetCard>
  );
}
