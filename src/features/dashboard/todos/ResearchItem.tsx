"use client";

/**
 * ResearchItem — 연구활동 행(연구 계획서/보고서 이어 작성 진입점).
 * `MyTodosWidget` 에서 분할 (Phase B 단순 추출 — 기능 변경 X).
 */

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ResearchTodo } from "./types";

export function ResearchItem({ item }: { item: ResearchTodo }) {
  return (
    <li>
      <Link
        href={item.href}
        className="flex items-center justify-between gap-2 rounded-md bg-card px-2.5 py-2 text-[12px] transition-colors hover:bg-muted/40"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{item.title}</p>
          {item.note && (
            <p className="mt-0.5 text-[10px] text-muted-foreground">{item.note}</p>
          )}
        </div>
        <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}
