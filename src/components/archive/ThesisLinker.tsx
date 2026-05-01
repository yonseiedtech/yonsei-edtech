"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, GraduationCap, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { alumniThesesApi } from "@/lib/bkend";
import type { AlumniThesis } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  selectedIds: string[];
  onChange: (next: string[]) => void;
}

export default function ThesisLinker({ selectedIds, onChange }: Props) {
  const [theses, setTheses] = useState<AlumniThesis[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await alumniThesesApi.list();
        if (!cancelled) {
          // 최신 졸업 → 과거 순
          const sorted = [...res.data].sort((a, b) =>
            (b.awardedYearMonth ?? "").localeCompare(a.awardedYearMonth ?? ""),
          );
          setTheses(sorted);
        }
      } catch (err) {
        console.error("[ThesisLinker] load failed", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return theses;
    return theses.filter((t) => {
      const haystack = [
        t.title,
        t.authorName ?? "",
        t.awardedYearMonth ?? "",
        ...(t.keywords ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [theses, q]);

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );
  };

  const removeOne = (id: string) => onChange(selectedIds.filter((x) => x !== id));

  // 선택된 항목 우선 + 나머지
  const selectedTheses = theses.filter((t) => selectedSet.has(t.id));

  return (
    <div className="space-y-2">
      {selectedTheses.length > 0 && (
        <div className="rounded-md border bg-muted/30 p-2">
          <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
            선택된 학위논문 ({selectedTheses.length}편)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selectedTheses.map((t) => (
              <Badge
                key={t.id}
                variant="default"
                className="gap-1 pr-1 bg-emerald-600 hover:bg-emerald-700 cursor-default"
              >
                <span className="max-w-[18ch] truncate">{t.authorName ?? "?"}</span>
                <span className="opacity-75">·</span>
                <span className="opacity-75">{t.awardedYearMonth ?? ""}</span>
                <button
                  type="button"
                  onClick={() => removeOne(t.id)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-white/20"
                  aria-label="제거"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="제목·저자·키워드·연월로 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="max-h-72 overflow-y-auto rounded-md border">
        {loading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            {q ? "검색 결과가 없습니다." : "등록된 졸업생 논문이 없습니다."}
          </div>
        ) : (
          <ul className="divide-y">
            {filtered.slice(0, 80).map((t) => {
              const isOn = selectedSet.has(t.id);
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => toggle(t.id)}
                    className={cn(
                      "flex w-full items-start gap-2 px-3 py-2 text-left text-xs transition-colors",
                      isOn ? "bg-emerald-50 hover:bg-emerald-100" : "hover:bg-muted/50",
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        isOn
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "border-input",
                      )}
                    >
                      {isOn && <Check className="h-3 w-3" />}
                    </div>
                    <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 font-medium text-foreground">
                        {t.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {[t.authorName, t.awardedYearMonth, t.graduationType]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {filtered.length > 80 && (
        <p className="text-[11px] text-muted-foreground">
          상위 80편만 표시됩니다. 검색어로 좁혀주세요.
        </p>
      )}
      {selectedIds.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange([])}
          className="text-xs text-muted-foreground"
        >
          전체 선택 해제
        </Button>
      )}
    </div>
  );
}
