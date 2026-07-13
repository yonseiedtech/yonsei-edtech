"use client";

/** 4. 연구 절차 (2026-07-13, M1 분리 — 동작·UI 불변) */

import { Wand2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ResearchDesignProcedureStep } from "@/types/research-design";
import type { FormState } from "./types";

export function ProcedureSection({
  form,
  readOnly,
  onRefill,
  onUpdateStep,
  onAddStep,
  onRemoveStep,
}: {
  form: FormState;
  readOnly: boolean;
  onRefill: () => void;
  onUpdateStep: (i: number, patch: Partial<ResearchDesignProcedureStep>) => void;
  onAddStep: () => void;
  onRemoveStep: (i: number) => void;
}) {
  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {form.methodName
            ? `'${form.methodName}'의 표준 절차를 바탕으로 단계별 계획을 구체화하세요.`
            : "연구방법을 선택하면 표준 절차가 자동으로 채워집니다."}
        </p>
        {!readOnly && form.methodName && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onRefill}>
            <Wand2 size={12} className="mr-1" /> 표준 절차 다시 채우기
          </Button>
        )}
      </div>
      <ol className="space-y-2">
        {form.procedureSteps.map((s, i) => (
          <li key={i} className="rounded-lg border bg-card/60 p-2.5">
            <div className="flex items-start gap-2">
              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1 space-y-1.5">
                <Input value={s.step} disabled={readOnly}
                  onChange={(e) => onUpdateStep(i, { step: e.target.value })}
                  placeholder="단계 이름 (예: 사전검사)" className="h-8 text-sm" />
                <Textarea value={s.detail} disabled={readOnly}
                  onChange={(e) => onUpdateStep(i, { detail: e.target.value })}
                  placeholder="단계별 계획 상세" rows={2} className="text-xs" />
              </div>
              {!readOnly && (
                <button type="button" onClick={() => onRemoveStep(i)}
                  className="mt-1 rounded-md p-1 text-muted-foreground hover:bg-rose-50 hover:text-rose-600">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
      {!readOnly && (
        <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={onAddStep}>
          <Plus size={12} className="mr-1" /> 단계 추가
        </Button>
      )}
    </>
  );
}
