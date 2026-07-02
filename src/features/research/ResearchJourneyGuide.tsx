"use client";

/**
 * 연구 여정 안내 (M3 — 2026-06-16)
 *
 * 분산돼 있던 "연구 계획서 / 연구 보고서 / 논문" 진입점을 단일 "연구 여정" 허브로
 * 묶어, 각 단계가 무엇이고 어떤 순서로 이어지는지(보고서 → 계획서 → 논문) 안내한다.
 * 세 에디터(ResearchProposalEditor·ResearchReportEditor·WritingPaperEditor) 상단에
 * 공통으로 얹어 어디서 시작했든 동일한 단계 지도를 보게 한다.
 *
 * 라우팅·데이터 구조는 기존 그대로 재사용한다
 * (/mypage/research?tab=writing&sub=proposal|report|thesis).
 * MyResearchView 의 서브탭 전환과 동일한 URL 규약을 따르므로 기존 기능 회귀 없음.
 */

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList,
  FileEdit,
  FileText,
  ChevronRight,
  Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  researchProposalsApi,
  researchReportsApi,
  writingPapersApi,
} from "@/lib/bkend";
import type {
  ResearchProposal,
  ResearchReport,
  WritingPaper,
} from "@/types";

export type ResearchJourneyStep = "proposal" | "report" | "thesis";

interface StepMeta {
  key: ResearchJourneyStep;
  order: number;
  label: string;
  /** 한 줄 목적 설명 — "무엇을 위한 단계인지" */
  purpose: string;
  icon: typeof ClipboardList;
}

// 순서(2026-07-03 사용자 확정): 보고서 → 계획서 → 논문.
// 연구 보고서 = 계획서 작성에 필요한 정보·연구자의 사고를 먼저 구조화하는 단계,
// 연구 계획서 = 실제 제출 양식 기준 문서. (MyResearchView 서브탭 순서와 동일)
const STEPS: StepMeta[] = [
  {
    key: "report",
    order: 1,
    label: "연구 보고서",
    purpose: "문제 정의·이론·선행연구 등 연구자의 사고를 먼저 구조화합니다",
    icon: FileEdit,
  },
  {
    key: "proposal",
    order: 2,
    label: "연구 계획서",
    purpose: "제출 양식 기준으로 주제·목적·범위·방법을 확정합니다",
    icon: ClipboardList,
  },
  {
    key: "thesis",
    order: 3,
    label: "논문",
    purpose: "장별 본문을 집필하고 다듬습니다",
    icon: FileText,
  },
];

type StepStatus = "empty" | "started" | "rich";

const STATUS_LABEL: Record<StepStatus, string> = {
  empty: "작성 전",
  started: "작성 중",
  rich: "충실",
};

function proposalChars(p: ResearchProposal | undefined): number {
  if (!p) return 0;
  return (
    (p.titleKo?.length ?? 0) +
    (p.titleEn?.length ?? 0) +
    (p.purpose?.length ?? 0) +
    (p.scope?.length ?? 0) +
    (p.method?.length ?? 0) +
    (p.content?.length ?? 0)
  );
}

function reportChars(r: ResearchReport | undefined): number {
  if (!r) return 0;
  // ResearchReport 는 자유 텍스트 필드가 많아 주요 서술 필드 길이의 합으로 충실도를 추정한다.
  const keys: (keyof ResearchReport)[] = [
    "fieldDescription",
    "fieldProblem",
    "problemDefinition",
    "theoryDefinition",
    "theoryConnection",
    "priorResearchAnalysis",
  ];
  return keys.reduce((sum, k) => {
    const v = r[k];
    return sum + (typeof v === "string" ? v.length : 0);
  }, 0);
}

function thesisChars(w: WritingPaper | undefined): number {
  if (!w?.chapters) return 0;
  return Object.values(w.chapters).reduce(
    (sum, v) => sum + (typeof v === "string" ? v.length : 0),
    0,
  );
}

function statusOf(chars: number): StepStatus {
  if (chars <= 0) return "empty";
  if (chars < 300) return "started";
  return "rich";
}

interface Props {
  userId: string;
  /** 현재 보고 있는 단계 — 호출한 에디터가 지정 */
  current: ResearchJourneyStep;
  /** 본인이 아니거나 읽기 전용이면 네비게이션만 노출(상태 조회는 동일) */
  readOnly?: boolean;
}

export default function ResearchJourneyGuide({ userId, current }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data: proposal } = useQuery({
    queryKey: ["research_proposal", userId],
    queryFn: async () => {
      const res = await researchProposalsApi.listByUser(userId);
      const sorted = [...res.data].sort((a, b) =>
        (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
      );
      return (sorted[0] ?? null) as ResearchProposal | null;
    },
    staleTime: 1000 * 30,
  });

  const { data: report } = useQuery({
    queryKey: ["research_report", userId],
    queryFn: async () => {
      const res = await researchReportsApi.listByUser(userId);
      const sorted = [...res.data].sort((a, b) =>
        (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
      );
      return (sorted[0] ?? null) as ResearchReport | null;
    },
    staleTime: 1000 * 30,
  });

  const { data: paper } = useQuery({
    queryKey: ["writing_paper", userId],
    queryFn: async () => {
      const res = await writingPapersApi.listByUser(userId);
      const sorted = [...res.data].sort((a, b) =>
        (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
      );
      return (sorted[0] ?? null) as WritingPaper | null;
    },
    staleTime: 1000 * 30,
  });

  const statusByStep = useMemo<Record<ResearchJourneyStep, StepStatus>>(
    () => ({
      proposal: statusOf(proposalChars(proposal ?? undefined)),
      report: statusOf(reportChars(report ?? undefined)),
      thesis: statusOf(thesisChars(paper ?? undefined)),
    }),
    [proposal, report, paper],
  );

  // "지금 무엇부터" — 비어 있는 첫 단계를 다음 권장 단계로 안내
  const nextRecommended = useMemo<ResearchJourneyStep | null>(() => {
    const firstEmpty = STEPS.find((s) => statusByStep[s.key] === "empty");
    return firstEmpty ? firstEmpty.key : null;
  }, [statusByStep]);

  function go(step: ResearchJourneyStep) {
    if (step === current) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "writing");
    params.set("sub", step);
    router.replace(`/mypage/research?${params.toString()}`, { scroll: false });
  }

  const currentMeta = STEPS.find((s) => s.key === current)!;

  return (
    <section
      aria-label="연구 여정 안내"
      className="mb-5 rounded-2xl border bg-gradient-to-br from-primary/5 via-card to-card p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Compass size={15} />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-bold tracking-tight">연구 여정</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            보고서 → 계획서 → 논문 순으로 이어집니다. 지금은{" "}
            <span className="font-semibold text-primary">{currentMeta.label}</span>{" "}
            단계 — {currentMeta.purpose}.
          </p>
        </div>
      </div>

      {/* 단계 스텝퍼 */}
      <ol className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-0">
        {STEPS.map((step, i) => {
          const status = statusByStep[step.key];
          const isCurrent = step.key === current;
          const isNext = step.key === nextRecommended && !isCurrent;
          const Icon = step.icon;
          return (
            <li
              key={step.key}
              className="flex flex-1 items-stretch gap-0"
            >
              <button
                type="button"
                onClick={() => go(step.key)}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "flex w-full flex-col gap-1 rounded-xl border p-3 text-left transition-colors",
                  isCurrent
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                    : "border-border bg-card hover:border-primary/40 hover:bg-muted/40",
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tabular-nums",
                      isCurrent
                        ? "bg-primary text-primary-foreground"
                        : status === "rich"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {step.order}
                  </span>
                  <Icon
                    size={13}
                    className={cn(
                      "shrink-0",
                      isCurrent ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <span
                    className={cn(
                      "truncate text-xs font-semibold",
                      isCurrent ? "text-primary" : "text-foreground",
                    )}
                  >
                    {step.label}
                  </span>
                  <span
                    className={cn(
                      "ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                      status === "rich"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : status === "started"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {STATUS_LABEL[status]}
                  </span>
                </div>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  {step.purpose}
                </p>
                {isNext && (
                  <p className="text-[10px] font-medium text-primary">
                    여기부터 시작해보세요
                  </p>
                )}
              </button>

              {/* 단계 사이 연결 화살표 (마지막 제외) — 데스크톱만 */}
              {i < STEPS.length - 1 && (
                <span className="hidden items-center justify-center px-1 text-muted-foreground sm:flex">
                  <ChevronRight size={16} aria-hidden />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
