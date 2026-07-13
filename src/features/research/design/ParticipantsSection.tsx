"use client";

/** 3. 연구 대상 (2026-07-13, M1 분리 — 동작·UI 불변) */

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ResearchDesignParticipants } from "@/types/research-design";
import EthicsChecklistPanel from "../EthicsChecklistPanel";
import { Field } from "./Section";
import type { FormState } from "./types";

export function ParticipantsSection({
  form,
  readOnly,
  onParticipantChange,
  onEthicsChange,
}: {
  form: FormState;
  readOnly: boolean;
  onParticipantChange: (key: keyof ResearchDesignParticipants, value: string) => void;
  onEthicsChange: (next: string[]) => void;
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="모집단">
          <Input value={form.participants.population} disabled={readOnly}
            onChange={(e) => onParticipantChange("population", e.target.value)}
            placeholder="예: 서울 소재 중학교 2학년" />
        </Field>
        <Field label="표본 크기">
          <Input value={form.participants.sampleSize} disabled={readOnly}
            onChange={(e) => onParticipantChange("sampleSize", e.target.value)}
            placeholder="예: 실험·통제 각 60명(총 120명)" />
        </Field>
        <Field label="표집 방법">
          <Input value={form.participants.samplingMethod} disabled={readOnly}
            onChange={(e) => onParticipantChange("samplingMethod", e.target.value)}
            placeholder="예: 층화표집 / 편의표집 / 의도적 표집" />
        </Field>
        <Field label="표본 크기 산정 근거">
          <Input value={form.participants.sizeRationale} disabled={readOnly}
            onChange={(e) => onParticipantChange("sizeRationale", e.target.value)}
            placeholder="예: 검정력 .80·중간 효과크기 / 이론적 포화" />
        </Field>
      </div>
      <Field label="참여자 보호 (동의·익명화·IRB)" className="mt-3">
        <Textarea value={form.participants.protection} disabled={readOnly}
          onChange={(e) => onParticipantChange("protection", e.target.value)}
          placeholder="예: 연구 목적·절차 설명 후 서면 동의, 식별정보 익명 처리, IRB 승인."
          rows={2} />
      </Field>
      {/* 윤리 체크리스트(윤리 단계 흡수) */}
      <EthicsChecklistPanel
        checked={form.ethicsChecked}
        readOnly={readOnly}
        onChange={onEthicsChange}
        onInsert={(text) =>
          onParticipantChange(
            "protection",
            form.participants.protection
              ? `${form.participants.protection}\n${text}`
              : text,
          )
        }
      />
    </>
  );
}
