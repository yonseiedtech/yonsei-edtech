"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DIAGNOSTIC_AREA_COLORS,
  DIAGNOSTIC_AREA_LABELS,
  type DiagnosticQuestion,
} from "@/types";
import { cn } from "@/lib/utils";

interface DiagnosisRunnerProps {
  /** 출제 순서대로 정렬된 문항 */
  questions: DiagnosticQuestion[];
  /** 모든 문항 응답 완료 — 문항 id → 선택한 보기 인덱스 */
  onComplete: (answers: Record<string, number>) => void;
  /** 진단 취소 (랜딩으로 복귀) */
  onCancel: () => void;
}

export default function DiagnosisRunner({
  questions,
  onComplete,
  onCancel,
}: DiagnosisRunnerProps) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const total = questions.length;
  const current = questions[index];
  const selected = current ? answers[current.id] : undefined;
  const isLast = index === total - 1;
  const progress = total > 0 ? Math.round(((index + 1) / total) * 100) : 0;

  const answeredCount = useMemo(
    () => questions.filter((q) => answers[q.id] !== undefined).length,
    [questions, answers],
  );

  if (!current) return null;

  const select = (optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [current.id]: optionIndex }));
  };

  const goNext = () => {
    if (selected === undefined) return;
    if (isLast) {
      onComplete(answers);
    } else {
      setIndex((i) => Math.min(i + 1, total - 1));
    }
  };

  const goPrev = () => {
    if (index === 0) {
      onCancel();
    } else {
      setIndex((i) => Math.max(i - 1, 0));
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* 진행바 */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn("text-[10px]", DIAGNOSTIC_AREA_COLORS[current.area])}
            >
              {DIAGNOSTIC_AREA_LABELS[current.area]}
            </Badge>
            <span className="tabular-nums">
              {index + 1} / {total}
            </span>
          </span>
          <span className="tabular-nums">응답 {answeredCount} / {total}</span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="진단 진행률"
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 문항 카드 */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="py-6">
          <p className="text-base font-semibold leading-relaxed sm:text-lg">
            {current.question}
          </p>

          <div className="mt-5 flex flex-col gap-2.5">
            {current.options.map((option, i) => {
              const isSelected = selected === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => select(i)}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3.5 text-left text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1",
                    isSelected
                      ? "border-primary bg-primary/5 font-medium shadow-sm"
                      : "border-border bg-card hover:border-primary/40 hover:bg-muted/40",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30 text-muted-foreground",
                    )}
                    aria-hidden
                  >
                    {isSelected ? <Check className="h-3.5 w-3.5" /> : String.fromCharCode(65 + i)}
                  </span>
                  <span className="leading-relaxed">{option}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 네비게이션 */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={goPrev}>
          <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
          {index === 0 ? "그만두기" : "이전"}
        </Button>
        <Button onClick={goNext} disabled={selected === undefined}>
          {isLast ? "채점하기" : "다음"}
          {!isLast && <ArrowRight className="ml-1 h-4 w-4" aria-hidden />}
        </Button>
      </div>
    </div>
  );
}
