"use client";

import { cn } from "@/lib/utils";
import { CATEGORY_LABELS, type PostCategory } from "@/types";

const CATEGORIES: (PostCategory | "all")[] = [
  "all",
  "notice",
  "free",
  "promotion",
  "press",
  "seminar",
];
const ALL_LABELS: Record<string, string> = { all: "전체", ...CATEGORY_LABELS };

interface Props {
  active: PostCategory | "all";
  onChange: (category: PostCategory | "all") => void;
}

export default function CategoryTabs({ active, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            active === cat
              ? "bg-primary text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          {ALL_LABELS[cat]}
        </button>
      ))}
    </div>
  );
}
