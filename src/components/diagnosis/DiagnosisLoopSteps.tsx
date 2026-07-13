"use client";

/**
 * 진단↔학습↔증명 순환 안내 배너 (H3) — 링크 중심 저위험.
 *
 * "진단 → 학습(개념·이론·카드) → 재진단 → 효과 확인" 4단계를 스텝/화살표로 안내해,
 * 오늘 만든 학습 자산(이론 가계도·용어 사전·암기카드)이 '학습' 단계에 편입됐음을
 * 보여준다. 표시 전용 — 계산·네트워크 없음.
 */

import {
  ClipboardCheck,
  BookOpen,
  RotateCcw,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** 현재 단계 강조 — 리포트에서는 학습(learn)을 다음 단계로 부각. */
type LoopStepKey = "diagnose" | "learn" | "rediagnose" | "prove";

const STEPS: {
  key: LoopStepKey;
  label: string;
  hint: string;
  icon: typeof ClipboardCheck;
}[] = [
  { key: "diagnose", label: "진단", hint: "약점 개념 파악", icon: ClipboardCheck },
  { key: "learn", label: "학습", hint: "개념·이론·암기카드", icon: BookOpen },
  { key: "rediagnose", label: "재진단", hint: "다시 진단하기", icon: RotateCcw },
  { key: "prove", label: "효과 확인", hint: "학습효과 증명", icon: TrendingUp },
];

interface DiagnosisLoopStepsProps {
  /** 강조할 현재/다음 단계 (기본 learn). */
  active?: LoopStepKey;
  className?: string;
}

export default function DiagnosisLoopSteps({
  active = "learn",
  className,
}: DiagnosisLoopStepsProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-primary/20 bg-primary/5 p-4 dark:bg-primary/10",
        className,
      )}
    >
      <p className="mb-3 text-sm font-medium text-foreground">
        학습 순환 — 약점을 학습 자산으로 잇고 재진단으로 효과를 확인하세요
      </p>
      <ol className="flex flex-wrap items-stretch gap-2" aria-label="진단 학습 순환 4단계">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = step.key === active;
          return (
            <li
              key={step.key}
              className="flex min-w-0 flex-1 basis-[7rem] items-center gap-2"
            >
              <div
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-3 py-2 transition-colors",
                  isActive
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border bg-card/70",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block truncate text-sm font-semibold",
                      isActive ? "text-primary" : "text-foreground",
                    )}
                  >
                    {step.label}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {step.hint}
                  </span>
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <ArrowRight
                  className="hidden h-4 w-4 shrink-0 text-muted-foreground/60 sm:block"
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
