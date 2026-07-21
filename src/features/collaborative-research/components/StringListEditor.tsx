"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  /** 항목 표시 prefix (예: "RQ"). 있으면 "RQ1. ..." 형태로 라벨링 */
  itemPrefix?: string;
  emptyLabel?: string;
}

/** 문자열 다중 항목 inline editor — 연구문제·연구대상에 사용. */
export default function StringListEditor({
  value,
  onChange,
  placeholder,
  itemPrefix,
  emptyLabel,
}: Props) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...value, v]);
    setDraft("");
  };

  const removeAt = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const updateAt = (idx: number, next: string) => {
    onChange(value.map((v, i) => (i === idx ? next : v)));
  };

  return (
    <div className="space-y-2">
      {value.length === 0 && emptyLabel && (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      )}
      {value.map((item, idx) => (
        <div key={idx} className="flex items-start gap-2">
          {itemPrefix && (
            <span className="mt-2.5 shrink-0 text-xs font-medium text-muted-foreground">
              {itemPrefix}
              {idx + 1}.
            </span>
          )}
          <Input
            value={item}
            onChange={(e) => updateAt(idx, e.target.value)}
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => removeAt(idx)}
            className="shrink-0"
            title="제거"
          >
            <X size={14} />
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
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
    </div>
  );
}
