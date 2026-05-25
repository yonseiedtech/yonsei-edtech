"use client";

import { cn } from "@/lib/utils";
import {
  REVIEW_STATUS_LABELS,
  REVIEW_STATUS_COLORS,
  VISIBILITY_LABELS,
  PUBLICATION_TYPE_LABELS,
} from "../lib/article-status";
import type {
  ArticleReviewStatus,
  ArticleVisibility,
  PublicationType,
} from "@/types";

export function ReviewStatusBadge({
  status,
  size = "md",
  className,
}: {
  status: ArticleReviewStatus;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        REVIEW_STATUS_COLORS[status],
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        className,
      )}
    >
      {REVIEW_STATUS_LABELS[status]}
    </span>
  );
}

export function VisibilityBadge({
  visibility,
  size = "md",
}: {
  visibility: ArticleVisibility;
  size?: "sm" | "md";
}) {
  const colors: Record<ArticleVisibility, string> = {
    private: "bg-zinc-100 text-zinc-700",
    society: "bg-blue-100 text-blue-700",
    public: "bg-emerald-100 text-emerald-700",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        colors[visibility],
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
      )}
    >
      {VISIBILITY_LABELS[visibility]}
    </span>
  );
}

export function PublicationTypeBadge({
  type,
  size = "md",
}: {
  type: PublicationType;
  size?: "sm" | "md";
}) {
  const colors: Record<PublicationType, string> = {
    journal: "bg-violet-100 text-violet-700",
    working_paper: "bg-blue-100 text-blue-700",
    note: "bg-zinc-100 text-zinc-700",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        colors[type],
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
      )}
    >
      {PUBLICATION_TYPE_LABELS[type]}
    </span>
  );
}
