"use client";

import { cn } from "@/lib/utils";
import { COLLAB_MEMBER_ROLE_LABELS, COLLAB_MEMBER_ROLE_COLORS } from "../lib/research-status";
import type { CollabMemberRole } from "@/types";

interface Props {
  role: CollabMemberRole;
  size?: "sm" | "md";
  className?: string;
}

export default function CollabResearchRoleBadge({ role, size = "md", className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        COLLAB_MEMBER_ROLE_COLORS[role],
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        className,
      )}
    >
      {COLLAB_MEMBER_ROLE_LABELS[role]}
    </span>
  );
}
