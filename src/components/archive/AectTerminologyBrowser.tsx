"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, ArrowRight, Library, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { archiveConceptsApi } from "@/lib/bkend";
import { AECT_TERMS, AECT_DOMAINS, type AectTerm } from "@/lib/aect-terminology";
import { cn } from "@/lib/utils";

interface ConceptInfo {
  id: string;
  description?: string;
  purifiedName?: string;
  aectTerm?: string;
}

/** 공백·대소문자 무시 정규화 */
function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** HTML id 사용 가능한 문자열로 변환 */
function toTermId(key: string): string {
  return key.replace(/[^a-zA-Z0-9]/g, "-");
}

export default function AectTerminologyBrowser() {
  const [domain, setDomain] = useState<string | "all">("all");
  const [query, setQuery] = useState("");
  const [onlyWithDescription, setOnlyWithDescription] = useState(false);
  // 개념 매칭: normalize(name/altName/aectTerm) → ConceptInfo
  const [conceptIndex, setConceptIndex] = useState<Map<string, ConceptInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await archiveConceptsApi.list();
        if (cancelled) return;
        const idx = new Map<string, ConceptInfo>();
        for (const c of res.data) {
          const info: ConceptInfo = {
            id: c.id,
            description: c.description,
            purifiedName: c.purifiedName,
            aectTerm: c.aectTerm,
          };
          const keys = [c.name, c.aectTerm, ...(c.altNames ?? [])].filter(
            (x): x is string => !!x && x.trim().length > 0,
          );
          for (const k of keys) {
            const nk = normalize(k);
            if (nk && !idx.has(nk)) idx.set(nk, info);
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

  /** 이 AECT 용어와 일치하는 아카이브 개념 정보 (없으면 undefined) */
  function matchedConcept(t: AectTerm): ConceptInfo | undefined {
    return conceptIndex.get(normalize(t.ko)) ?? conceptIndex.get(normalize(t.en));
  }

  // 개념 설명 보유 항목 수 (전체 186개 기준)
  const totalWithDescription = useMemo(() => {
    if (loading) return null;
    return AECT_TERMS.filter(
      (t) => conceptIndex.has(normalize(t.ko)) || conceptIndex.has(normalize(t.en)),
    ).length;
  }, [loading, conceptIndex]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    return AECT_TERMS.filter((t) => {
      if (domain !== "all" && t.domain !== domain) return false;
      if (q && !normalize(t.en).includes(q) && !normalize(t.ko).includes(q)) return false;
      if (onlyWithDescription && !loading) {
        return conceptIndex.has(normalize(t.ko)) || conceptIndex.has(normalize(t.en));
      }
      return true;
    });
  }, [domain, query, onlyWithDescription, loading, conceptIndex]);

  function toggleExpand(key: string) {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div>
      {/* 개념 설명 통계 */}
      <div className="mt-6 rounded-lg border bg-card px-4 py-3 text-sm">
        {loading ? (
          <Skeleton className="h-4 w-56" />
        ) : (
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground">{AECT_TERMS.length}개</span> 표제어 중{" "}
            <span className="font-semibold text-primary">{totalWithDescription}개</span>{" "}
            개념 설명 제공 — 나머지 항목은 공식 역어·영역 분류만 표시됩니다.
          </span>
        )}
      </div>

      {/* 검색 */}
      <div className="relative mt-4 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="영문 표제어·국문 역어로 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
          aria-label="AECT 용어 검색"
        />
      </div>

      {/* 영역 필터 + 설명 필터 칩 */}
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
        {/* 개념 설명 있는 항목만 필터 */}
        <button
          type="button"
          onClick={() => setOnlyWithDescription((v) => !v)}
          aria-pressed={onlyWithDescription}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
            onlyWithDescription
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-muted-foreground hover:border-primary/40",
          )}
        >
          <BookOpen className="h-3 w-3" aria-hidden />
          설명 있는 항목만
        </button>
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        총 {filtered.length}개
        {(query || domain !== "all" || onlyWithDescription) && ` (전체 ${AECT_TERMS.length})`}
      </div>

      {/* 아코디언 목록 */}
      <div
        className="mt-3 overflow-hidden rounded-xl border bg-card"
        role="list"
        aria-label="AECT 용어 목록"
      >
        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            검색 결과가 없습니다.
          </div>
        ) : (
          filtered.map((t) => {
            const key = `${t.domain}:${t.en}`;
            const termId = toTermId(key);
            const concept = loading ? undefined : matchedConcept(t);
            const hasMatch = !!concept;
            const isExpanded = expandedKeys.has(key);

            return (
              <div key={key} role="listitem" className="border-b last:border-0">
                {/* 행 토글 버튼 */}
                <button
                  type="button"
                  onClick={() => toggleExpand(key)}
                  aria-expanded={isExpanded}
                  aria-controls={`desc-${termId}`}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60"
                >
                  <div className="min-w-0 flex-1">
                    {/* 영문 표제어 + 상태 배지 */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{t.en}</span>
                      {loading ? (
                        <Skeleton className="h-4 w-16" />
                      ) : hasMatch ? (
                        <Badge
                          variant="outline"
                          className="border-primary/40 bg-primary/5 text-[10px] text-primary"
                        >
                          개념 설명
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-muted-foreground"
                        >
                          설명 준비 중
                        </Badge>
                      )}
                    </div>
                    {/* 국문 역어 + 영역 정보 */}
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <span>{t.ko}</span>
                      <span aria-hidden>·</span>
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {t.domain}
                      </Badge>
                      <span className="text-[11px]">{t.subcategory}</span>
                    </div>
                  </div>
                  {/* 펼치기/접기 아이콘 */}
                  <span className="mt-1 shrink-0 text-muted-foreground" aria-hidden>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </span>
                </button>

                {/* 펼침 패널 — 개념 설명 */}
                {isExpanded && (
                  <div
                    id={`desc-${termId}`}
                    role="region"
                    aria-label={`${t.en} 개념 설명`}
                    className="border-t bg-muted/20 px-4 pb-4 pt-3 text-sm"
                  >
                    {hasMatch && concept?.description ? (
                      <>
                        <p className="leading-relaxed text-foreground/90">
                          {concept.description}
                        </p>
                        <div className="mt-3">
                          <Link
                            href={`/archive/concept/${concept.id}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            아카이브에서 자세히 보기
                            <ArrowRight className="h-3 w-3" aria-hidden />
                          </Link>
                        </div>
                      </>
                    ) : hasMatch ? (
                      /* 아카이브 매칭됐으나 description 필드 없음 */
                      <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                        <span>아카이브에 등록된 개념입니다.</span>
                        <Link
                          href={`/archive/concept/${concept!.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          아카이브에서 보기
                          <ArrowRight className="h-3 w-3" aria-hidden />
                        </Link>
                      </div>
                    ) : (
                      /* 매칭 없음 */
                      <p className="text-muted-foreground">
                        이 표제어에 대한 개념 설명은 아직 준비 중입니다. AECT
                        공식 역어와 영문 표제어 정보만 제공됩니다.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 출처·재서술 고지 */}
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Library className="h-3.5 w-3.5" aria-hidden />
        표제어·공식 역어: Richey (Ed.), 2013 / 이현우 외 공역, 학지사 2020. &ldquo;개념 설명&rdquo; 항목은 원서 해설을 그대로 옮기지 않고 자체 재서술(패러프레이즈)한 내용이며, 아카이브 개념 항목과 연결됩니다.
      </p>
    </div>
  );
}
