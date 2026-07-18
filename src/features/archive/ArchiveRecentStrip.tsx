"use client";

/**
 * ArchiveRecentStrip — 최근 본 항목 이어보기 (스프린트1 H3/이어보기)
 *
 * localStorage(archive-recent-views) 에 쌓인 최근 열람 항목을 랜딩 상단부에 가로 스트립으로
 * 노출한다. 기록이 없으면 렌더하지 않는다. "내 아카이브 전체 보기" 는 /archive/my 로 연결.
 * 클라이언트 전용 — 마운트 후에만 렌더해 SSR 하이드레이션 불일치를 피한다.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { History, ArrowRight } from "lucide-react";
import { getRecentViews, type RecentArchiveView } from "@/lib/archive-recent-views";
import { cn } from "@/lib/utils";

/** 최근 본 항목의 계열(type)별 라벨·색상 — 즐겨찾기 칩과 톤 일치 */
const TYPE_META: Record<string, { label: string; className: string }> = {
  concept: { label: "개념", className: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800" },
  variable: { label: "변인", className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800" },
  measurement: { label: "측정도구", className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" },
  "research-method": { label: "연구방법", className: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800" },
  "statistical-method": { label: "통계방법", className: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800" },
  "foundation-term": { label: "기초 용어", className: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-700" },
  terminology: { label: "AECT", className: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800" },
  "writing-tip": { label: "글쓰기", className: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800" },
};

function typeMeta(type: string) {
  return TYPE_META[type] ?? { label: "자료", className: "bg-muted text-muted-foreground border-border" };
}

export default function ArchiveRecentStrip() {
  const [items, setItems] = useState<RecentArchiveView[] | null>(null);

  useEffect(() => {
    setItems(getRecentViews().slice(0, 8));
  }, []);

  // 마운트 전(SSR) 또는 기록 없음 → 렌더하지 않음
  if (!items || items.length === 0) return null;

  return (
    <section
      aria-labelledby="archive-recent-strip"
      className="mt-4 rounded-2xl border bg-card p-4 shadow-sm"
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            <History className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span id="archive-recent-strip">이어보기 — 최근 본 항목</span>
        </div>
        <Link
          href="/archive/my"
          className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
        >
          내 아카이브 전체 보기
          <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>
      <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((it) => {
          const meta = typeMeta(it.type);
          return (
            <li key={it.href} className="shrink-0">
              <Link
                href={it.href}
                className="group flex w-44 flex-col gap-1.5 rounded-xl border bg-background p-3 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <span
                  className={cn(
                    "inline-flex w-fit items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                    meta.className,
                  )}
                >
                  {meta.label}
                </span>
                <span className="line-clamp-2 text-sm font-medium leading-snug group-hover:text-primary">
                  {it.title}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
