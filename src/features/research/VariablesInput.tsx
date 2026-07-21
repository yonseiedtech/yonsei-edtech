"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { PaperVariables, ArchiveVariable } from "@/types";
import { archiveVariablesApi } from "@/lib/bkend";
import TagInput from "./TagInput";

interface Props {
  value: PaperVariables;
  onChange: (next: PaperVariables) => void;
}

const CATEGORIES: { key: keyof PaperVariables; label: string; color: string; placeholder: string }[] = [
  { key: "independent", label: "독립변인", color: "bg-cat-1/5 text-cat-1", placeholder: "예: 자기조절학습" },
  { key: "dependent", label: "종속변인", color: "bg-success/5 text-success", placeholder: "예: 학업성취도" },
  { key: "mediator", label: "매개변인", color: "bg-cat-1/5 text-cat-1", placeholder: "예: 학습몰입" },
  { key: "moderator", label: "조절변인", color: "bg-warning/5 text-warning", placeholder: "예: 학년" },
  { key: "control", label: "통제변인", color: "bg-muted text-muted-foreground", placeholder: "예: 사전학업성취도" },
];

export default function VariablesInput({ value, onChange }: Props) {
  // Phase 4-B: 아카이브 변인 사전(archive_variables) 자동완성 — 입력 시작 시에만 제안.
  // 자유 입력은 그대로 허용(공용 어휘를 '권장'하되 강제하지 않음).
  const { data: archiveVarsRes } = useQuery({
    queryKey: ["archive-variables-for-input"],
    queryFn: () => archiveVariablesApi.list(),
    staleTime: 10 * 60_000,
  });
  const variableNames = useMemo(() => {
    const vars = (archiveVarsRes?.data ?? []) as ArchiveVariable[];
    return [...new Set(vars.map((v) => v.name).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "ko"),
    );
  }, [archiveVarsRes]);

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
            suggestions={variableNames}
            suggestOnlyWhenTyping
            chipClassName={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs ${c.color}`}
          />
        </div>
      ))}
    </div>
  );
}
