"use client";

import { cn } from "@/lib/utils";
import type { Seminar } from "@/types";

type StatusFilter = Seminar["status"] | "all";

const TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "upcoming", label: "예정" },
  { value: "completed", label: "완료" },
];

interface Props {
  active: StatusFilter;
  onChange: (status: StatusFilter) => void;
}

export default function SeminarStatusTabs({ active, onChange }: Props) {
  return (
    <div className="flex gap-2">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            active === tab.value
              ? "bg-primary text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
