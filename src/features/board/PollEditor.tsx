"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PostPoll, PostPollOption } from "@/types";

interface Props {
  value: PostPoll | null;
  onChange: (v: PostPoll | null) => void;
}

function emptyOption(): PostPollOption {
  return { id: crypto.randomUUID(), label: "", voteCount: 0 };
}

function emptyPoll(): PostPoll {
  return {
    question: "",
    options: [emptyOption(), emptyOption()],
    multi: false,
    anonymous: false,
    totalVotes: 0,
    hideResultsBeforeDeadline: false,
    hideResultsAfterDeadline: false,
  };
}

export default function PollEditor({ value, onChange }: Props) {
  if (!value) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-center">
        <p className="mb-2 text-sm text-muted-foreground">투표를 첨부하여 회원 의견을 수렴할 수 있습니다.</p>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange(emptyPoll())}>
          <Plus size={14} className="mr-1" />
          투표 추가
        </Button>
      </div>
    );
  }

  function update<K extends keyof PostPoll>(key: K, v: PostPoll[K]) {
    onChange({ ...(value as PostPoll), [key]: v });
  }

  function updateOption(id: string, label: string) {
    update("options", value!.options.map((o) => (o.id === id ? { ...o, label } : o)));
  }

  function addOption() {
    update("options", [...value!.options, emptyOption()]);
  }

  function removeOption(id: string) {
    if (value!.options.length <= 2) return;
    update("options", value!.options.filter((o) => o.id !== id));
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">투표</h4>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
          <Trash2 size={14} className="mr-1" />
          제거
        </Button>
      </div>

      <Input
        placeholder="투표 질문을 입력하세요"
        value={value.question}
        onChange={(e) => update("question", e.target.value)}
      />

      <div className="space-y-2">
        {value.options.map((opt, idx) => (
          <div key={opt.id} className="flex items-center gap-2">
            <span className="w-6 text-xs text-muted-foreground">{idx + 1}.</span>
            <Input
              placeholder={`선택지 ${idx + 1}`}
              value={opt.label}
              onChange={(e) => updateOption(opt.id, e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeOption(opt.id)}
              disabled={value.options.length <= 2}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addOption}>
          <Plus size={14} className="mr-1" />
          선택지 추가
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={value.multi} onChange={(e) => update("multi", e.target.checked)} />
          복수선택 허용
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={value.anonymous} onChange={(e) => update("anonymous", e.target.checked)} />
          익명 투표 (로그인 필요, UID 미저장)
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={value.hideResultsBeforeDeadline}
            onChange={(e) => update("hideResultsBeforeDeadline", e.target.checked)}
          />
          마감 전 결과 숨김
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={value.hideResultsAfterDeadline}
            onChange={(e) => update("hideResultsAfterDeadline", e.target.checked)}
          />
          마감 후에도 결과 비공개
        </label>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">마감일시</label>
          <Input
            type="datetime-local"
            value={value.deadline ?? ""}
            onChange={(e) => update("deadline", e.target.value || undefined)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">투표 수정 가능 시한</label>
          <Input
            type="datetime-local"
            value={value.editableUntil ?? ""}
            onChange={(e) => update("editableUntil", e.target.value || undefined)}
          />
        </div>
      </div>
    </div>
  );
}
