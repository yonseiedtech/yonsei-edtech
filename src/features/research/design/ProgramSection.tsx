"use client";

/** 6. 프로그램 설계·개발 (2026-07-13, M1 분리 — 동작·UI 불변) */

import Link from "next/link";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { ADDIE_STEPS, type ResearchDesignProgram } from "@/types/research-design";
import { Field } from "./Section";
import type { FormState } from "./types";

export function ProgramSection({
  form,
  readOnly,
  onProgramChange,
}: {
  form: FormState;
  readOnly: boolean;
  onProgramChange: <K extends keyof ResearchDesignProgram>(
    key: K,
    value: ResearchDesignProgram[K],
  ) => void;
}) {
  return (
    <>
      <label className="flex items-center gap-2 text-xs font-medium">
        <input type="checkbox" checked={form.programDesign.enabled} disabled={readOnly}
          onChange={(e) => onProgramChange("enabled", e.target.checked)}
          className="h-3.5 w-3.5 accent-primary" />
        이 연구는 처치 프로그램(수업·연수·콘텐츠) 개발·효과분석을 포함합니다
      </label>
      {form.programDesign.enabled && (
        <div className="mt-3 space-y-3">
          <Field label="처치 프로그램 개요">
            <Textarea value={form.programDesign.overview} disabled={readOnly}
              onChange={(e) => onProgramChange("overview", e.target.value)}
              placeholder="예: 생성형 AI 튜터를 활용한 논설문 쓰기 피드백 프로그램" rows={2} />
          </Field>
          <Field label="회기 구성">
            <Textarea value={form.programDesign.sessions} disabled={readOnly}
              onChange={(e) => onProgramChange("sessions", e.target.value)}
              placeholder="예: 주 1회 40분, 총 8회기 — 1~2회 도입, 3~6회 핵심 활동, 7~8회 정리·평가" rows={2} />
          </Field>
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">ADDIE 단계 점검 (설계 모델·가네 9절차·과정안은 가이드에서)</p>
            <div className="flex flex-wrap gap-1.5">
              {ADDIE_STEPS.map((s) => {
                const on = form.programDesign.addieChecked.includes(s.id);
                return (
                  <button key={s.id} type="button" disabled={readOnly}
                    onClick={() =>
                      onProgramChange(
                        "addieChecked",
                        on
                          ? form.programDesign.addieChecked.filter((x) => x !== s.id)
                          : [...form.programDesign.addieChecked, s.id],
                      )
                    }
                    className={cn(
                      "rounded-md border px-2 py-1 text-[11px] transition-colors",
                      on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                    )}>
                    {on && <CheckCircle2 size={10} className="mr-1 inline" />}
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
          <Link
            href="/steppingstone/program-development"
            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
          >
            프로그램 설계·개발 가이드(ADDIE·가네 9절차·과정안) 열기 <ExternalLink size={10} />
          </Link>
        </div>
      )}
    </>
  );
}
