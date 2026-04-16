"use client";

import type { PaperVariables } from "@/types";
import TagInput from "./TagInput";

interface Props {
  value: PaperVariables;
  onChange: (next: PaperVariables) => void;
}

const CATEGORIES: { key: keyof PaperVariables; label: string; color: string; placeholder: string }[] = [
  { key: "independent", label: "독립변인", color: "bg-blue-50 text-blue-700", placeholder: "예: 자기조절학습" },
  { key: "dependent", label: "종속변인", color: "bg-emerald-50 text-emerald-700", placeholder: "예: 학업성취도" },
  { key: "mediator", label: "매개변인", color: "bg-violet-50 text-violet-700", placeholder: "예: 학습몰입" },
  { key: "moderator", label: "조절변인", color: "bg-amber-50 text-amber-700", placeholder: "예: 학년" },
  { key: "control", label: "통제변인", color: "bg-slate-100 text-slate-700", placeholder: "예: 사전학업성취도" },
];

export default function VariablesInput({ value, onChange }: Props) {
  function patch(key: keyof PaperVariables, next: string[]) {
    onChange({
      ...value,
      [key]: next.length > 0 ? next : undefined,
    });
  }

  return (
    <div className="space-y-3">
      {CATEGORIES.map((c) => (
        <div key={c.key}>
          <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold">
            <span className={`rounded-full px-2 py-0.5 ${c.color}`}>{c.label}</span>
          </label>
          <TagInput
            value={value[c.key] ?? []}
            onChange={(next) => patch(c.key, next)}
            placeholder={c.placeholder}
            chipClassName={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs ${c.color}`}
          />
        </div>
      ))}
    </div>
  );
}
