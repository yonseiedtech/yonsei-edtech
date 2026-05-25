"use client";

import { useState } from "react";
import { Plus, X, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ScheduleMilestone } from "@/types";

interface Props {
  value: ScheduleMilestone[];
  onChange: (next: ScheduleMilestone[]) => void;
}

function newId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 일정 마일스톤 (킥오프·점검일·발표일) editor. */
export default function CheckpointEditor({ value, onChange }: Props) {
  const [draftDate, setDraftDate] = useState("");
  const [draftLabel, setDraftLabel] = useState("");

  const add = () => {
    if (!draftDate || !draftLabel.trim()) return;
    const next: ScheduleMilestone = {
      id: newId(),
      date: draftDate,
      label: draftLabel.trim(),
    };
    // 날짜 오름차순 정렬
    onChange([...value, next].sort((a, b) => a.date.localeCompare(b.date)));
    setDraftDate("");
    setDraftLabel("");
  };

  const removeAt = (id: string) => {
    onChange(value.filter((m) => m.id !== id));
  };

  const updateLabel = (id: string, label: string) => {
    onChange(value.map((m) => (m.id === id ? { ...m, label } : m)));
  };

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((m) => (
            <div key={m.id} className="flex items-center gap-2 rounded border border-zinc-200 bg-zinc-50 px-2 py-1.5">
              <Calendar size={14} className="shrink-0 text-zinc-500" />
              <span className="shrink-0 text-xs font-mono text-zinc-700">{m.date}</span>
              <Input
                value={m.label}
                onChange={(e) => updateLabel(m.id, e.target.value)}
                className="flex-1 border-0 bg-transparent text-sm focus-visible:ring-0"
              />
              <button
                type="button"
                onClick={() => removeAt(m.id)}
                className="shrink-0 rounded p-1 text-zinc-500 hover:bg-zinc-200"
                title="제거"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          type="date"
          value={draftDate}
          onChange={(e) => setDraftDate(e.target.value)}
          className="w-40 shrink-0"
        />
        <Input
          placeholder="예: 킥오프 미팅, 1차 점검, 분석 완료"
          value={draftLabel}
          onChange={(e) => setDraftLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className="flex-1"
        />
        <Button type="button" size="sm" variant="outline" onClick={add}>
          <Plus size={14} className="mr-1" />
          추가
        </Button>
      </div>
      <p className="text-xs text-zinc-500">
        킥오프·중간점검·발표 등 주요 일정을 등록하세요. 날짜순 자동 정렬됩니다.
      </p>
    </div>
  );
}
