"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, ArrowRight, Library } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { archiveConceptsApi } from "@/lib/bkend";
import { AECT_TERMS, AECT_DOMAINS, type AectTerm } from "@/lib/aect-terminology";
import { cn } from "@/lib/utils";

/** 공백·대소문자 무시 정규화 */
function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export default function AectTerminologyBrowser() {
  const [domain, setDomain] = useState<string | "all">("all");
  const [query, setQuery] = useState("");
  // 개념 매칭: normalize(name/altName/aectTerm) → conceptId
  const [conceptIndex, setConceptIndex] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await archiveConceptsApi.list();
        if (cancelled) return;
        const idx = new Map<string, string>();
        for (const c of res.data) {
          const keys = [c.name, c.aectTerm, ...(c.altNames ?? [])].filter(
            (x): x is string => !!x && x.trim().length > 0,
          );
          for (const k of keys) {
            const nk = normalize(k);
            if (nk && !idx.has(nk)) idx.set(nk, c.id);
          }
        }
        setConceptIndex(idx);
      } catch (err) {
        console.error("[aect-terminology] concept load failed", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = normalize(query);
    return AECT_TERMS.filter((t) => {
      if (domain !== "all" && t.domain !== domain) return false;
      if (!q) return true;
      return normalize(t.en).includes(q) || normalize(t.ko).includes(q);
    });
  }, [domain, query]);

  /** 이 AECT 용어와 일치하는 아카이브 개념 id (없으면 undefined) */
  function matchedConceptId(t: AectTerm): string | undefined {
    return conceptIndex.get(normalize(t.ko)) ?? conceptIndex.get(normalize(t.en));
  }

  return (
    <div>
      {/* 검색 */}
      <div className="relative mt-6 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="영문 표제어·국문 역어로 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
          aria-label="AECT 용어 검색"
        />
      </div>

      {/* 영역 필터 칩 */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setDomain("all")}
          aria-pressed={domain === "all"}
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
            domain === "all"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-muted-foreground hover:border-primary/40",
          )}
        >
          전체
        </button>
        {AECT_DOMAINS.map((d) => {
          const selected = domain === d;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDomain(d)}
              aria-pressed={selected}
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40",
              )}
            >
              {d}
            </button>
          );
        })}
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        총 {filtered.length}개
        {(query || domain !== "all") && ` (전체 ${AECT_TERMS.length})`}
      </div>

      {/* 표 */}
      <div className="mt-3 overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[36rem] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">영문 표제어</th>
              <th className="px-3 py-2 font-medium">공식 역어</th>
              <th className="px-3 py-2 font-medium">영역 · 하위범주</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-10 text-center text-sm text-muted-foreground"
                >
                  검색 결과가 없습니다.
                </td>
              </tr>
            ) : (
              filtered.map((t) => {
                const conceptId = loading ? undefined : matchedConceptId(t);
                return (
                  <tr
                    key={`${t.domain}:${t.en}`}
                    className="border-b last:border-0 align-top transition-colors hover:bg-muted/30"
                  >
                    <td className="px-3 py-2 font-medium">{t.en}</td>
                    <td className="px-3 py-2">{t.ko}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-[10px] font-normal">
                          {t.domain}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {t.subcategory}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {conceptId ? (
                        <Link
                          href={`/archive/concept/${conceptId}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          아카이브에서 보기
                          <ArrowRight className="h-3 w-3" aria-hidden />
                        </Link>
                      ) : loading ? (
                        <Skeleton className="h-4 w-20" />
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 아카이브 연결 안내 */}
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Library className="h-3.5 w-3.5" aria-hidden />
        &ldquo;아카이브에서 보기&rdquo; 는 해당 표제어·역어와 이름·별칭·공식역어가 일치하는 아카이브 개념이 있을 때 표시됩니다.
      </p>
    </div>
  );
}
