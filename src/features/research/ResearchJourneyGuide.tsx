"use client";

/**
 * 연구 여정 안내 (M3 — 2026-06-16 · R6 통합 확장 2026-07-03)
 *
 * v1: 보고서 → 계획서 → 논문 3단계 문서 스텝퍼.
 * v2(R6): 학위 과정 전체를 하나의 지도로 — 산출물 3단계 사이에 지원 단계 4개를 삽입해
 *   주제 탐색 → 문헌 고찰 → 연구 보고서 → 연구 계획서 → 윤리·도구 확정 → 논문 집필 → 심사 대응
 * 7단계로 통합했다. 학기 기반 ThesisJourney(5학기)와 학기 라벨로 정렬된다.
 *
 * 산출물 단계(실선 카드)는 에디터 서브탭으로, 지원 단계(점선 카드)는 해당 도구로 이동.
 * 라우팅·데이터 구조는 기존 그대로 재사용 (/mypage/research?tab=writing&sub=…).
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
  BookOpen,
  DraftingCompass,
  MessageSquareQuote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  researchProposalsApi,
  researchReportsApi,
  writingPapersApi,
  researchPapersApi,
  researchDesignsApi,
  advisorFeedbackApi,
} from "@/lib/bkend";
import { computeDesignProgress } from "@/types/research-design";
import type {
  ResearchProposal,
  ResearchReport,
  ResearchDesign,
  WritingPaper,
  AdvisorFeedbackNote,
} from "@/types";

export type ResearchJourneyStep = "proposal" | "report" | "design" | "thesis";

type JourneyKey =
  | "topic"
  | "literature"
  | "report"
  | "design"
  | "proposal"
  | "thesis"
  | "defense";

interface StepMeta {
  key: JourneyKey;
  label: string;
  /** ThesisJourney(5학기)와의 정렬 라벨 */
  semester: string;
  /** 한 줄 목적 설명 — "무엇을 위한 단계인지" */
  purpose: string;
  icon: typeof ClipboardList;
  /** editor = 산출물 단계(에디터 서브탭), support = 지원 단계(도구로 이동) */
  kind: "editor" | "support";
  /** kind=editor 일 때 서브탭 키 */
  editorSub?: ResearchJourneyStep;
  /** kind=support 일 때 이동 경로 */
  href?: string;
}

// R6(2026-07-03): 7단계 통합 여정 — 산출물(보고서→계획서→논문) 사이에 지원 단계 삽입
const STEPS: StepMeta[] = [
  {
    key: "topic",
    label: "주제 탐색",
    semester: "1학기",
    purpose: "인터뷰로 주제 방향을 잡고, 선행 논문으로 지형을 파악합니다",
    icon: Compass,
    kind: "support",
    href: "/mypage/research?tab=explore",
  },
  {
    key: "literature",
    label: "문헌 고찰",
    semester: "1~2학기",
    purpose: "읽은 논문을 완독·정리해 선행연구 재료를 쌓습니다",
    icon: BookOpen,
    kind: "support",
    href: "/mypage/research?tab=reading",
  },
  {
    key: "report",
    label: "연구 보고서",
    semester: "2학기",
    purpose: "문제 정의·이론·선행연구 등 연구자의 사고를 먼저 구조화합니다",
    icon: FileEdit,
    kind: "editor",
    editorSub: "report",
  },
  {
    key: "design",
    label: "연구 설계",
    semester: "2~3학기",
    purpose: "연구 모형·대상·방법·도구·분석 계획을 설계합니다",
    icon: DraftingCompass,
    kind: "editor",
    editorSub: "design",
  },
  {
    key: "proposal",
    label: "연구 계획서",
    semester: "3학기",
    purpose: "제출 양식 기준으로 주제·목적·범위·방법을 확정합니다",
    icon: ClipboardList,
    kind: "editor",
    editorSub: "proposal",
  },
  {
    key: "thesis",
    label: "논문 집필",
    semester: "4~5학기",
    purpose: "장별 본문을 집필하고 다듬습니다",
    icon: FileText,
    kind: "editor",
    editorSub: "thesis",
  },
  {
    key: "defense",
    label: "심사 대응",
    semester: "5학기",
    purpose: "지도 노트로 피드백을 관리하고 심사 발표를 연습합니다",
    icon: MessageSquareQuote,
    kind: "support",
    href: "/steppingstone/thesis-defense",
  },
];

type StepStatus = "empty" | "started" | "rich";

const STATUS_LABEL: Record<StepStatus, string> = {
  empty: "시작 전",
  started: "진행 중",
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

/** 개수 기반 상태 — 지원 단계용 (startAt 1개, rich 는 단계별 임계) */
function statusOfCount(n: number, richAt: number): StepStatus {
  if (n <= 0) return "empty";
  if (n < richAt) return "started";
  return "rich";
}

interface Props {
  userId: string;
  /** 현재 보고 있는 단계 — 호출한 에디터가 지정 */
  current: ResearchJourneyStep;
  /** 본인이 아니거나 읽기 전용이면 네비게이션만 노출(상태 조회는 동일) */
  readOnly?: boolean;
}

export default function ResearchJourneyGuide({ userId, current, readOnly }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data: proposal } = useQuery({
    queryKey: ["journey-guide", "research_proposal", userId],
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
    queryKey: ["journey-guide", "research_report", userId],
    queryFn: async () => {
      const res = await researchReportsApi.listByUser(userId);
      const sorted = [...res.data].sort((a, b) =>
        (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
      );
      return (sorted[0] ?? null) as ResearchReport | null;
    },
    staleTime: 1000 * 30,
  });

  const { data: design } = useQuery({
    queryKey: ["journey-guide", "research_design", userId],
    queryFn: async () => {
      const res = await researchDesignsApi.listByUser(userId);
      return (res.data[0] ?? null) as ResearchDesign | null;
    },
    staleTime: 1000 * 30,
  });

  const { data: paper } = useQuery({
    queryKey: ["journey-guide", "writing_paper", userId],
    queryFn: async () => {
      const res = await writingPapersApi.listByUser(userId);
      const sorted = [...res.data].sort((a, b) =>
        (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
      );
      return (sorted[0] ?? null) as WritingPaper | null;
    },
    staleTime: 1000 * 30,
  });

  // R6: 지원 단계 상태 — ThesisJourney·에디터와 동일 캐시 키 재사용
  const { data: myPapers = [] } = useQuery({
    queryKey: ["research_papers", userId],
    queryFn: async () => (await researchPapersApi.list(userId)).data,
    staleTime: 5 * 60_000,
  });
  const { data: feedbackNotes = [] } = useQuery({
    queryKey: ["advisor-feedback", userId],
    queryFn: async () =>
      (await advisorFeedbackApi.listByUser(userId)).data as AdvisorFeedbackNote[],
    // QA-v2: 지도 노트는 rules 상 본인 전용 — 콘솔(readOnly) 열람에서 쿼리하면 거부 에러만 남
    enabled: !readOnly,
    staleTime: 5 * 60_000,
  });

  const statusByStep = useMemo<Record<JourneyKey, StepStatus>>(() => {
    const papers = myPapers as { isDraft?: boolean; readStatus?: string }[];
    const registered = papers.filter((pp) => !pp.isDraft).length;
    const completed = papers.filter((pp) => !pp.isDraft && pp.readStatus === "completed").length;
    // 연구 설계: 완성도(%)를 started/rich 로 환산 — 문서 존재 + 섹션 완성도
    const designProgress = computeDesignProgress(design ?? null);
    const designStatus: StepStatus =
      designProgress <= 0 ? "empty" : designProgress < 60 ? "started" : "rich";
    return {
      topic: statusOfCount(registered, 3),
      literature: statusOfCount(completed, 3),
      report: statusOf(reportChars(report ?? undefined)),
      design: designStatus,
      proposal: statusOf(proposalChars(proposal ?? undefined)),
      thesis: statusOf(thesisChars(paper ?? undefined)),
      defense: statusOfCount(feedbackNotes.length, 3),
    };
  }, [myPapers, proposal, report, design, paper, feedbackNotes]);

  // "지금 무엇부터" — 비어 있는 첫 단계를 다음 권장 단계로 안내
  const nextRecommended = useMemo<JourneyKey | null>(() => {
    const firstEmpty = STEPS.find((s) => statusByStep[s.key] === "empty");
    return firstEmpty ? firstEmpty.key : null;
  }, [statusByStep]);

  function go(step: StepMeta) {
    // QA-v2: 콘솔 열람(readOnly) 중 클릭 시 내 마이페이지로 이탈하던 문제 — 네비 비활성
    if (readOnly) return;
    if (step.kind === "support") {
      if (step.href) router.push(step.href);
      return;
    }
    if (step.editorSub === current) return;
    // QA-v3 L: 개편된 평탄화 탭 키로 직접 발행 (legacy writing&sub= shim 의존 제거)
    const flatTab =
      step.editorSub === "report"
        ? "reportdoc"
        : step.editorSub === "design"
          ? "design"
          : step.editorSub === "proposal"
            ? "proposal"
            : "writing";
    const params = new URLSearchParams(searchParams.toString());
    params.delete("sub");
    params.set("tab", flatTab);
    router.replace(`/mypage/research?${params.toString()}`, { scroll: false });
  }

  const currentMeta = STEPS.find((s) => s.editorSub === current)!;

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
            주제 탐색부터 심사 대응까지 — 산출물은{" "}
            <span className="font-medium">보고서 → 설계 → 계획서 → 논문</span> 순으로 이어집니다. 지금은{" "}
            <span className="font-semibold text-primary">{currentMeta.label}</span> 단계 —{" "}
            {currentMeta.purpose}.
          </p>
        </div>
      </div>

      {/* 7단계 스텝퍼 — 산출물(실선)·지원(점선), 모바일은 가로 스크롤 */}
      <ol className="mt-4 flex items-stretch gap-0 overflow-x-auto pb-1">
        {STEPS.map((step, i) => {
          const status = statusByStep[step.key];
          const isCurrent = step.kind === "editor" && step.editorSub === current;
          const isNext = step.key === nextRecommended && !isCurrent;
          const Icon = step.icon;
          return (
            <li key={step.key} className="flex min-w-0 flex-1 items-stretch gap-0">
              <button
                type="button"
                onClick={() => go(step)}
                aria-current={isCurrent ? "step" : undefined}
                title={`${step.label} (${step.semester}) — ${step.purpose}`}
                className={cn(
                  "flex w-full min-w-[118px] flex-col gap-1 rounded-xl border p-2.5 text-left transition-colors",
                  isCurrent
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                    : step.kind === "support"
                      ? "border-dashed border-border bg-card/60 hover:border-primary/40 hover:bg-muted/40"
                      : "border-border bg-card hover:border-primary/40 hover:bg-muted/40",
                )}
              >
                <div className="flex items-center gap-1">
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
                    {i + 1}
                  </span>
                  <Icon
                    size={12}
                    className={cn("shrink-0", isCurrent ? "text-primary" : "text-muted-foreground")}
                  />
                  <span
                    className={cn(
                      "truncate text-[11px] font-semibold",
                      isCurrent ? "text-primary" : "text-foreground",
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                    {step.semester}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium",
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
                {isCurrent && (
                  <p className="text-[10px] leading-snug text-muted-foreground">{step.purpose}</p>
                )}
                {isNext && (
                  <p className="text-[10px] font-medium text-primary">여기부터 시작해보세요</p>
                )}
              </button>

              {/* 단계 사이 연결 화살표 (마지막 제외) */}
              {i < STEPS.length - 1 && (
                <span className="flex items-center justify-center px-0.5 text-muted-foreground">
                  <ChevronRight size={13} aria-hidden />
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-[10px] text-muted-foreground">
        점선 카드는 지원 단계 — 누르면 해당 도구(논문 읽기·연구윤리 체크리스트·심사 연습)로 이동합니다. 학기 라벨은
        &lsquo;나의 논문 여정&rsquo;(5학기 지도)과 같은 기준입니다.
      </p>
    </section>
  );
}
