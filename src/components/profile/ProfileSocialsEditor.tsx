"use client";

import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { SocialLink, SocialPlatform } from "@/types";
import { SOCIAL_PLATFORM_LABELS } from "@/types";

interface Props {
  value?: SocialLink[];
  onChange: (next: SocialLink[]) => void;
  disabled?: boolean;
}

const PLATFORMS: SocialPlatform[] = [
  "instagram",
  "linkedin",
  "github",
  "x",
  "threads",
  "youtube",
  "website",
  "other",
];

export default function ProfileSocialsEditor({ value, onChange, disabled }: Props) {
  const list = value ?? [];

  function update(idx: number, patch: Partial<SocialLink>) {
    const next = list.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onChange(next);
  }
  function remove(idx: number) {
    onChange(list.filter((_, i) => i !== idx));
  }
  function add() {
    onChange([...list, { platform: "instagram", url: "" }]);
  }

  return (
    <div className="space-y-3 rounded-2xl border bg-white p-5">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">SNS · 외부 링크</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            프리셋 7개와 직접 입력(기타)을 추가할 수 있습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={add}
          disabled={disabled}
          className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/20"
        >
          <Plus size={12} />
          링크 추가
        </button>
      </div>
      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
          등록된 링크가 없습니다.
        </p>
      ) : (
        <ul className="space-y-2">
          {list.map((s, i) => (
            <li key={i} className="rounded-lg border bg-muted/20 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={s.platform}
                  onChange={(e) => update(i, { platform: e.target.value as SocialPlatform })}
                  disabled={disabled}
                  className="rounded-md border bg-white px-2 py-1 text-xs"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {SOCIAL_PLATFORM_LABELS[p]}
                    </option>
                  ))}
                </select>
                {s.platform === "other" && (
                  <Input
                    placeholder="라벨 (예: 블로그)"
                    value={s.label ?? ""}
                    onChange={(e) => update(i, { label: e.target.value })}
                    disabled={disabled}
                    className="h-8 max-w-[140px] text-xs"
                  />
                )}
                <Input
                  placeholder="https://..."
                  value={s.url}
                  onChange={(e) => update(i, { url: e.target.value })}
                  disabled={disabled}
                  className="h-8 flex-1 text-xs"
                />
                <button
                  type="button"
                  onClick={() => remove(i)}
                  disabled={disabled}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="삭제"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
