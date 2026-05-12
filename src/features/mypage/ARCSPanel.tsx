"use client";

/**
 * ARCSPanel — Keller's ARCS Motivation Model (1987) 시각화
 *
 * 마이페이지 홈 탭에 삽입. 본인 User 객체 + 이미 로드된 카운트를
 * props 로 받아 4축(Attention·Relevance·Confidence·Satisfaction) 점수를
 * 메타인지 자각 패널로 표시.
 *
 * 점수 산정 (각 축 0 ~ 100):
 *  A (Attention)     — interestKeywords 개수 (5개 = 만점 기준)
 *  R (Relevance)     — researchTopics 개수 + researchInterests 유무 (3개 = 만점 기준)
 *  C (Confidence)    — 활동 수 + 수료증 수 (10건 = 만점 기준)
 *  S (Satisfaction)  — 인터뷰 응답 수 + 게시글 수 (8건 = 만점 기준)
 *
 * 각 축:
 *  - 컬러 코딩 (blue / emerald / amber / rose)
 *  - 5단계 도트 진행 표시
 *  - 점수 낮은 축: 빈 상태 + 보강 액션 링크
 *  - 클릭 시 관련 페이지 이동
 */

import Link from "next/link";
import { Brain, Target, TrendingUp, Star, ChevronRight, BookOpen } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import EmptyState from "@/components/ui/empty-state";

// ─── 타입 ────────────────────────────────────────────────────

export interface ARCSInputs {
  /** interestKeywords 배열 길이 */
  interestKeywordCount: number;
  /** researchTopics 배열 길이 */
  researchTopicCount: number;
  /** researchInterests 배열 길이 (관심 연구분야) */
  researchInterestCount: number;
  /** 참여한 학술활동 + 세미나 총 수 */
  activityCount: number;
  /** 보유 수료증 수 */
  certificateCount: number;
  /** 제출된 인터뷰 응답 수 */
  interviewCount: number;
  /** 작성한 게시글 수 */
  postCount: number;
}

// ─── 점수 계산 ───────────────────────────────────────────────

const ATTENTION_FULL = 5;
const RELEVANCE_FULL = 4; // researchTopics(3) + researchInterests(1)
const CONFIDENCE_FULL = 10;
const SATISFACTION_FULL = 8;

function clampScore(raw: number, full: number): number {
  return Math.min(100, Math.round((raw / full) * 100));
}

function computeScores(inputs: ARCSInputs): {
  attention: number;
  relevance: number;
  confidence: number;
  satisfaction: number;
} {
  const attention = clampScore(inputs.interestKeywordCount, ATTENTION_FULL);
  const relevance = clampScore(
    inputs.researchTopicCount + (inputs.researchInterestCount > 0 ? 1 : 0),
    RELEVANCE_FULL,
  );
  const confidence = clampScore(
    inputs.activityCount + inputs.certificateCount,
    CONFIDENCE_FULL,
  );
  const satisfaction = clampScore(
    inputs.interviewCount + inputs.postCount,
    SATISFACTION_FULL,
  );
  return { attention, relevance, confidence, satisfaction };
}

// ─── 도트 진행 표시 (5단계) ──────────────────────────────────

const DOT_COUNT = 5;

interface DotsProps {
  score: number; // 0-100
  activeClass: string;
  inactiveClass: string;
  ariaLabel: string;
}

function ScoreDots({ score, activeClass, inactiveClass, ariaLabel }: DotsProps) {
  const filled = Math.round((score / 100) * DOT_COUNT);
  return (
    <div
      className="flex items-center gap-1"
      role="meter"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
    >
      {Array.from({ length: DOT_COUNT }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-2.5 w-2.5 rounded-full transition-colors",
            i < filled ? activeClass : inactiveClass,
          )}
        />
      ))}
    </div>
  );
}

// ─── 축 카드 정의 ─────────────────────────────────────────────

interface AxisDef {
  key: "A" | "R" | "C" | "S";
  label: string;
  korLabel: string;
  description: string;
  Icon: LucideIcon;
  /** 도트 채워진 색 */
  dotActive: string;
  dotInactive: string;
  /** 카드 테두리 + 배경 */
  border: string;
  bg: string;
  /** 아이콘 래퍼 배경 */
  iconBg: string;
  iconFg: string;
  /** 라벨 텍스트 색 */
  labelColor: string;
  /** 보강 액션 href */
  actionHref: string;
  actionLabel: string;
  /** 약한 상태 설명 */
  weakTitle: string;
  weakDesc: string;
}

const AXES: AxisDef[] = [
  {
    key: "A",
    label: "Attention",
    korLabel: "주의",
    description: "학회 활동의 관심사·키워드",
    Icon: Brain,
    dotActive: "bg-blue-500",
    dotInactive: "bg-blue-100 dark:bg-blue-900/40",
    border: "border-blue-200/70 dark:border-blue-800/60",
    bg: "bg-blue-50/40 dark:bg-blue-950/20",
    iconBg: "bg-blue-100 dark:bg-blue-900/50",
    iconFg: "text-blue-600 dark:text-blue-300",
    labelColor: "text-blue-700 dark:text-blue-300",
    actionHref: "/mypage?tab=profile",
    actionLabel: "관심 키워드 추가하기",
    weakTitle: "관심 키워드가 없습니다",
    weakDesc: "관심 분야를 키워드로 추가하면 맞춤 활동을 추천받을 수 있습니다.",
  },
  {
    key: "R",
    label: "Relevance",
    korLabel: "관련성",
    description: "연구 주제와 학회 자원의 연결",
    Icon: Target,
    dotActive: "bg-emerald-500",
    dotInactive: "bg-emerald-100 dark:bg-emerald-900/40",
    border: "border-emerald-200/70 dark:border-emerald-800/60",
    bg: "bg-emerald-50/40 dark:bg-emerald-950/20",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
    iconFg: "text-emerald-600 dark:text-emerald-300",
    labelColor: "text-emerald-700 dark:text-emerald-300",
    actionHref: "/mypage/research",
    actionLabel: "연구 주제 정리하기",
    weakTitle: "연구 주제가 비어 있습니다",
    weakDesc: "관심 연구분야와 연구 주제를 등록하면 관련 자원을 연결할 수 있습니다.",
  },
  {
    key: "C",
    label: "Confidence",
    korLabel: "자신감",
    description: "누적 활동 참여 수·수료증",
    Icon: TrendingUp,
    dotActive: "bg-amber-500",
    dotInactive: "bg-amber-100 dark:bg-amber-900/40",
    border: "border-amber-200/70 dark:border-amber-800/60",
    bg: "bg-amber-50/40 dark:bg-amber-950/20",
    iconBg: "bg-amber-100 dark:bg-amber-900/50",
    iconFg: "text-amber-600 dark:text-amber-300",
    labelColor: "text-amber-700 dark:text-amber-300",
    actionHref: "/activities",
    actionLabel: "학술활동 참여하기",
    weakTitle: "참여한 활동이 아직 없습니다",
    weakDesc: "프로젝트·스터디·세미나에 참여하고 수료증을 쌓아보세요.",
  },
  {
    key: "S",
    label: "Satisfaction",
    korLabel: "만족",
    description: "인정·리액션·게시글·인터뷰",
    Icon: Star,
    dotActive: "bg-rose-500",
    dotInactive: "bg-rose-100 dark:bg-rose-900/40",
    border: "border-rose-200/70 dark:border-rose-800/60",
    bg: "bg-rose-50/40 dark:bg-rose-950/20",
    iconBg: "bg-rose-100 dark:bg-rose-900/50",
    iconFg: "text-rose-600 dark:text-rose-300",
    labelColor: "text-rose-700 dark:text-rose-300",
    actionHref: "/board",
    actionLabel: "게시판에 글 작성하기",
    weakTitle: "아직 공유한 활동이 없습니다",
    weakDesc: "게시글이나 인터뷰 응답을 남기면 동료와의 연결이 깊어집니다.",
  },
];

// ─── 축 카드 ─────────────────────────────────────────────────

interface AxisCardProps {
  axis: AxisDef;
  score: number;
}

const WEAK_THRESHOLD = 40; // 이 미만이면 약한 상태

function AxisCard({ axis, score }: AxisCardProps) {
  const isWeak = score < WEAK_THRESHOLD;
  const Icon = axis.Icon;

  return (
    <Link
      href={axis.actionHref}
      className={cn(
        "group block rounded-2xl border p-4 transition-shadow hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        axis.border,
        axis.bg,
      )}
      aria-label={`${axis.label} (${axis.korLabel}) — ${score}점. ${axis.actionLabel}으로 이동`}
    >
      <div className="flex items-start gap-3">
        {/* 아이콘 */}
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            axis.iconBg,
          )}
        >
          <Icon size={18} className={axis.iconFg} aria-hidden />
        </div>

        {/* 콘텐츠 */}
        <div className="min-w-0 flex-1">
          {/* 헤더 행 */}
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tracking-wide",
                axis.iconBg,
                axis.iconFg,
              )}
            >
              {axis.key}
            </span>
            <span className="text-sm font-bold leading-tight">{axis.korLabel}</span>
            <span className={cn("text-xs", axis.labelColor)}>{axis.label}</span>
          </div>

          {/* 설명 */}
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            {axis.description}
          </p>

          {/* 도트 진행 + 점수 */}
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <ScoreDots
              score={score}
              activeClass={axis.dotActive}
              inactiveClass={axis.dotInactive}
              ariaLabel={`${axis.korLabel} 점수 ${score}점`}
            />
            <span className={cn("text-xs font-semibold tabular-nums", axis.labelColor)}>
              {score}
              <span className="text-muted-foreground font-normal">/100</span>
            </span>
          </div>

          {/* 약한 상태 보강 안내 */}
          {isWeak && (
            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
              {axis.weakDesc.split("。")[0]}
            </p>
          )}
        </div>

        {/* 화살표 */}
        <ChevronRight
          size={16}
          className="mt-0.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </div>
    </Link>
  );
}

// ─── 메인 패널 ────────────────────────────────────────────────

interface ARCSPanelProps {
  inputs: ARCSInputs;
}

export default function ARCSPanel({ inputs }: ARCSPanelProps) {
  const scores = computeScores(inputs);

  const axisScores: Record<string, number> = {
    A: scores.attention,
    R: scores.relevance,
    C: scores.confidence,
    S: scores.satisfaction,
  };

  const allZero = Object.values(axisScores).every((s) => s === 0);

  // 가장 약한 축 (보강 우선순위)
  const weakestAxis = AXES.reduce((prev, cur) =>
    axisScores[cur.key] < axisScores[prev.key] ? cur : prev,
  );

  return (
    <section
      aria-labelledby="arcs-heading"
      className="rounded-2xl border bg-card p-5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300"
    >
      {/* 헤더 */}
      <div className="flex flex-wrap items-center gap-2">
        <BookOpen size={18} className="text-primary" aria-hidden />
        <h2 id="arcs-heading" className="font-bold tracking-tight">
          ARCS 동기 프로파일
        </h2>
        <span className="ml-auto text-[11px] text-muted-foreground">
          Keller (1987)
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        4개 차원에서 본인의 학습 동기 강점과 공백을 확인하세요.
      </p>

      {/* 전체 0 상태 */}
      {allZero ? (
        <EmptyState
          icon={BookOpen}
          title="ARCS 프로파일을 채워보세요"
          description="관심 키워드·연구 주제 등록과 학술활동 참여로 본인의 동기 프로파일을 완성할 수 있습니다."
          actions={[
            { label: "관심 키워드 추가", href: "/mypage?tab=profile", variant: "default" },
            { label: "학술활동 둘러보기", href: "/activities", variant: "outline" },
          ]}
          className="mt-4"
          compact
        />
      ) : (
        <>
          {/* 4축 그리드 — 모바일 1열, sm 이상 2열 */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {AXES.map((axis) => (
              <AxisCard
                key={axis.key}
                axis={axis}
                score={axisScores[axis.key]}
              />
            ))}
          </div>

          {/* 보강 안내 — 가장 약한 축 */}
          {axisScores[weakestAxis.key] < WEAK_THRESHOLD && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 px-4 py-3">
              <span className="mt-0.5 shrink-0 text-[10px] font-bold text-muted-foreground">
                TIP
              </span>
              <p className="text-xs leading-relaxed text-muted-foreground">
                <strong className="text-foreground">{weakestAxis.korLabel}({weakestAxis.label})</strong> 차원이
                가장 낮습니다.{" "}
                <Link
                  href={weakestAxis.actionHref}
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  {weakestAxis.actionLabel}
                </Link>
                으로 보강해보세요.
              </p>
            </div>
          )}

          {/* 범례 */}
          <p className="mt-3 text-[10px] text-muted-foreground">
            A: 관심 키워드 수 · R: 연구 주제·분야 · C: 활동+수료증 · S: 게시글+인터뷰 응답
          </p>
        </>
      )}
    </section>
  );
}
