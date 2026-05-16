"use client";

/**
 * 스터디 자료 아카이브 탭 (Sprint 4 — Study Enhancement)
 * 활동 전 회차의 materials + preReadMaterials 를 한곳에서 검색·다운로드.
 */

import { useMemo, useState } from "react";
import { Archive, Download, FileText, Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { ActivityProgress } from "@/types";
import { cn } from "@/lib/utils";

type Material = {
  url: string;
  name: string;
  size?: number;
  type?: string;
};

type ArchiveItem = Material & {
  week: number;
  weekTitle: string;
  weekDate?: string;
  category: "session" | "pre-read";
};

interface Props {
  progressList: ActivityProgress[];
}

export default function StudyMaterialArchive({ progressList }: Props) {
  const [query, setQuery] = useState("");
  const [filterWeek, setFilterWeek] = useState<number | "all">("all");
  const [filterCategory, setFilterCategory] = useState<"all" | "session" | "pre-read">(
    "all",
  );

  const items: ArchiveItem[] = useMemo(() => {
    const out: ArchiveItem[] = [];
    progressList
      .slice()
      .sort((a, b) => (a.week ?? 0) - (b.week ?? 0))
      .forEach((p, idx) => {
        const week = idx + 1;
        const weekTitle = p.title ?? `Week ${week}`;
        const weekDate = p.date;
        (p.materials ?? []).forEach((m) =>
          out.push({ ...m, week, weekTitle, weekDate, category: "session" }),
        );
        (p.preReadMaterials ?? []).forEach((m) =>
          out.push({ ...m, week, weekTitle, weekDate, category: "pre-read" }),
        );
      });
    return out;
  }, [progressList]);

  const weeks = useMemo(
    () => Array.from(new Set(items.map((i) => i.week))).sort((a, b) => a - b),
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (filterWeek !== "all" && i.week !== filterWeek) return false;
      if (filterCategory !== "all" && i.category !== filterCategory) return false;
      if (q && !`${i.name} ${i.weekTitle}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, query, filterWeek, filterCategory]);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <Archive className="mx-auto mb-2 text-muted-foreground" size={32} />
        <p className="text-sm font-medium">아카이브된 자료가 없습니다.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          회차별 자료 또는 Pre-read 자료를 업로드하면 여기에서 한눈에 확인할 수 있습니다.
        </p>
      </div>
    );
  }

  const totalSize = items.reduce((sum, i) => sum + (i.size ?? 0), 0);
  const sessionCount = items.filter((i) => i.category === "session").length;
  const preReadCount = items.filter((i) => i.category === "pre-read").length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Archive size={16} className="text-primary" />
            <h2 className="text-sm font-semibold">자료 아카이브</h2>
            <Badge variant="outline" className="text-[10px]">
              총 {items.length}개 · 회차 {sessionCount} · Pre-read {preReadCount}
            </Badge>
          </div>
          <span className="text-[10px] text-muted-foreground">
            전체 용량 {(totalSize / 1024 / 1024).toFixed(2)} MB
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search
              size={12}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="자료 / 회차명 검색"
              className="h-8 pl-7 text-sm"
            />
          </div>
          <select
            value={String(filterWeek)}
            onChange={(e) =>
              setFilterWeek(e.target.value === "all" ? "all" : Number(e.target.value))
            }
            className="h-8 rounded-md border bg-background px-2 text-xs"
          >
            <option value="all">전체 회차</option>
            {weeks.map((w) => (
              <option key={w} value={w}>
                Week {w}
              </option>
            ))}
          </select>
          <select
            value={filterCategory}
            onChange={(e) =>
              setFilterCategory(e.target.value as typeof filterCategory)
            }
            className="h-8 rounded-md border bg-background px-2 text-xs"
          >
            <option value="all">전체 자료</option>
            <option value="session">회차 자료</option>
            <option value="pre-read">Pre-read</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-xs text-muted-foreground">
          검색 조건에 해당하는 자료가 없습니다.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {filtered.map((i, idx) => (
            <li
              key={`${i.url}-${idx}`}
              className={cn(
                "flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-xs",
                i.category === "pre-read" && "border-blue-200 bg-blue-50/30",
              )}
            >
              <FileText
                size={14}
                className={cn(
                  "shrink-0",
                  i.category === "pre-read" ? "text-blue-700" : "text-muted-foreground",
                )}
              />
              <div className="flex-1 min-w-0">
                <a
                  href={i.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate font-medium text-foreground hover:text-primary hover:underline"
                >
                  {i.name}
                </a>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Badge variant="outline" className="text-[9px]">
                    Week {i.week}
                  </Badge>
                  <span className="truncate">{i.weekTitle}</span>
                  {i.weekDate && <span>· {i.weekDate}</span>}
                  {i.category === "pre-read" && (
                    <Badge className="bg-blue-100 text-[9px] text-blue-800">
                      <Sparkles size={9} className="mr-0.5" /> Pre-read
                    </Badge>
                  )}
                  {typeof i.size === "number" && (
                    <span>· {(i.size / 1024).toFixed(1)} KB</span>
                  )}
                </div>
              </div>
              <a
                href={i.url}
                target="_blank"
                rel="noreferrer"
                download={i.name}
                className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="다운로드"
              >
                <Download size={14} />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
