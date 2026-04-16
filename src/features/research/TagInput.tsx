"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  className?: string;
  chipClassName?: string;
}

export default function TagInput({
  value,
  onChange,
  placeholder = "입력 후 Enter",
  suggestions,
  className,
  chipClassName,
}: Props) {
  const [draft, setDraft] = useState("");

  function add(v: string) {
    const t = v.trim();
    if (!t) return;
    if (value.includes(t)) return;
    onChange([...value, t]);
    setDraft("");
  }

  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  const remainingSuggestions = (suggestions ?? []).filter(
    (s) => !value.includes(s) && (!draft || s.toLowerCase().includes(draft.toLowerCase()))
  ).slice(0, 6);

  return (
    <div className={className}>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && value.length > 0) {
              remove(value.length - 1);
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => add(draft)}
        >
          <Plus size={14} className="mr-1" />추가
        </Button>
      </div>
      {remainingSuggestions.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {remainingSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-full border border-dashed px-2 py-0.5 text-[11px] text-muted-foreground hover:border-primary hover:text-primary"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {value.map((tag, i) => (
            <span
              key={`${tag}-${i}`}
              className={
                chipClassName ??
                "inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary"
              }
            >
              {tag}
              <button
                type="button"
                onClick={() => remove(i)}
                className="hover:text-destructive"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
