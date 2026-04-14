"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X, FileText, Calendar, FolderKanban, BookOpen } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface Hit {
  kind: "post" | "seminar" | "activity";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

async function searchApi(q: string): Promise<Hit[]> {
  if (!q) return [];
  const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  const json = await res.json();
  return (json.data ?? []) as Hit[];
}

function useDebounced<T>(value: T, delay = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const debounced = useDebounced(q, 250);
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  const { data: hits = [], isFetching } = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => searchApi(debounced.trim()),
    enabled: open && debounced.trim().length >= 1,
    staleTime: 30_000,
  });

  function iconFor(h: Hit) {
    if (h.kind === "post") return FileText;
    if (h.kind === "seminar") return Calendar;
    return h.subtitle?.startsWith("프로젝트") ? FolderKanban : BookOpen;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="검색"
        className="inline-flex h-9 items-center gap-2 rounded-full border bg-muted/30 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
      >
        <Search size={15} />
        <span className="hidden lg:inline">검색</span>
        <kbd className="hidden rounded border bg-white px-1.5 py-0.5 font-mono text-[10px] lg:inline">Ctrl K</kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl gap-0 p-0">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <Search size={16} className="text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="게시글·세미나·활동 검색..."
              className="flex-1 bg-transparent text-sm outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && hits[0]) {
                  setOpen(false);
                  router.push(hits[0].href);
                }
              }}
            />
            {q && (
              <button onClick={() => setQ("")} className="text-muted-foreground hover:text-foreground">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {!debounced.trim() && (
              <p className="px-3 py-8 text-center text-xs text-muted-foreground">게시글 · 세미나 · 프로젝트 · 스터디 · 대외활동을 한 번에 검색합니다.</p>
            )}
            {debounced.trim() && isFetching && (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">검색 중...</p>
            )}
            {debounced.trim() && !isFetching && hits.length === 0 && (
              <p className="px-3 py-8 text-center text-xs text-muted-foreground">검색 결과가 없습니다.</p>
            )}
            {hits.map((h) => {
              const Icon = iconFor(h);
              return (
                <Link
                  key={`${h.kind}-${h.id}`}
                  href={h.href}
                  onClick={() => setOpen(false)}
                  className={cn("flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted")}
                >
                  <Icon size={16} className="shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{h.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{h.subtitle}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
