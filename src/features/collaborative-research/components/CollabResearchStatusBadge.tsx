"use client";

import { cn } from "@/lib/utils";
import { COLLAB_STATUS_LABELS, COLLAB_STATUS_COLORS } from "../lib/research-status";
import type { CollaborativeResearchStatus } from "@/types";

interface Props {
  status: CollaborativeResearchStatus;
  size?: "sm" | "md";
  className?: string;
}

export default function CollabResearchStatusBadge({ status, size = "md", className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        COLLAB_STATUS_COLORS[status],
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        className,
      )}
    >
      {COLLAB_STATUS_LABELS[status]}
    </span>
  );
}
