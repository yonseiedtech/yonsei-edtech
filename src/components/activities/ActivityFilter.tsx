"use client";

import { cn } from "@/lib/utils";

const FILTERS = [
  { value: "all", label: "전체" },
  { value: "seminar", label: "세미나" },
  { value: "project", label: "프로젝트" },
  { value: "study", label: "스터디" },
];

interface Props {
  active: string;
  onChange: (value: string) => void;
}

export default function ActivityFilter({ active, onChange }: Props) {
  return (
    <div className="flex justify-center gap-2">
      {FILTERS.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={cn(
            "rounded-full px-5 py-2 text-sm font-medium transition-colors",
            active === f.value
              ? "bg-primary text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
