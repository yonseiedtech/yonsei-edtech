"use client";

/** 1. 연구 유형·접근 (2026-07-13, M1 분리 — 동작·UI 불변) */

import Link from "next/link";
import { Wand2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ResearchMethod } from "@/types";
import {
  RESEARCH_DESIGN_APPROACH_LABELS,
  type ResearchDesignApproach,
} from "@/types/research-design";
import { RESEARCH_METHOD_KIND_LABELS } from "@/types/research-method";
import type { FormState } from "./types";

export function ApproachSection({
  form,
  readOnly,
  methodOptions,
  selectedMethod,
  showAllMethods,
  onShowAllMethodsChange,
  onApproachChange,
  onRationaleChange,
  onMethodChange,
  onOpenMethodGuide,
}: {
  form: FormState;
  readOnly: boolean;
  methodOptions: ResearchMethod[];
  selectedMethod: ResearchMethod | null;
  showAllMethods: boolean;
  onShowAllMethodsChange: (v: boolean) => void;
  onApproachChange: (a: ResearchDesignApproach) => void;
  onRationaleChange: (v: string) => void;
  onMethodChange: (name: string) => void;
  onOpenMethodGuide: () => void;
}) {
  return (
    <>
      <p className="mb-3 text-xs text-muted-foreground">
        양적·질적·혼합 중 연구의 기본 접근을 고르면 이후 섹션(절차·도구·분석)이 그에 맞게 분기합니다.
      </p>
      <div className="flex flex-wrap gap-2">
        {(["quantitative", "qualitative", "mixed"] as const).map((a) => (
          <button
            key={a}
            type="button"
            disabled={readOnly}
            onClick={() => onApproachChange(a)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              form.approach === a
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:border-primary/40",
            )}
          >
            {RESEARCH_DESIGN_APPROACH_LABELS[a]}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <label className="block text-xs font-medium text-muted-foreground">
            연구방법 선택 (표준 절차 프리필)
          </label>
          {!readOnly && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={onOpenMethodGuide}
            >
              <Wand2 size={12} className="mr-1" /> 가이드로 내 연구에 맞는 방법 찾기
            </Button>
          )}
        </div>
        <select
          value={form.methodName}
          disabled={readOnly}
          onChange={(e) => onMethodChange(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
        >
          <option value="">— 연구방법 선택 —</option>
          {methodOptions.map((m) => (
            <option key={m.id} value={m.name}>
              {m.name} ({RESEARCH_METHOD_KIND_LABELS[m.kind]})
            </option>
          ))}
        </select>
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/archive/research-methods"
            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
          >
            연구방법 가이드 보기 <ExternalLink size={10} />
          </Link>
          {form.approach && !readOnly && (
            <label className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <input
                type="checkbox"
                checked={showAllMethods}
                onChange={(e) => onShowAllMethodsChange(e.target.checked)}
                className="h-3 w-3 accent-primary"
              />
              다른 접근의 방법도 보기
            </label>
          )}
        </div>

        {/* 선택 방법 즉시 설명 카드 */}
        {selectedMethod && (
          <div className="mt-2.5 rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">
                {selectedMethod.name}
              </span>
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                {RESEARCH_METHOD_KIND_LABELS[selectedMethod.kind]}
              </span>
            </div>
            {selectedMethod.summary && (
              <p className="mt-1.5 text-[11px] leading-relaxed text-foreground/85">
                {selectedMethod.summary}
              </p>
            )}
            {selectedMethod.accessibleSummary && (
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                <span className="font-medium text-primary">쉽게 이해하기 · </span>
                {selectedMethod.accessibleSummary}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          접근·방법 선택 이유
        </label>
        <Textarea
          value={form.approachRationale}
          onChange={(e) => onRationaleChange(e.target.value)}
          placeholder="예: 처치 효과를 인과적으로 검증하기 위해 준실험 설계를 선택하였다."
          rows={3}
          disabled={readOnly}
        />
      </div>
    </>
  );
}
