"use client";

/**
 * ArchiveConceptRecommend — 관심 주제·진단 약점 기반 개념 추천 (M5 콘텐츠 발견성)
 *
 * 읽기 전용 매칭:
 *  1) 로그인 + 최근 진단 약점(weakConceptIds) 이 있으면 → 그 개념을 우선 추천 (학습 루프 연결).
 *  2) 로그인 + 관심 주제(researchInterests / interestKeywords / researchTopics) 가 있으면
 *     → 키워드를 개념의 name·altNames·tags·description 에 부분 일치시켜 추천.
 *  3) 둘 다 없으면(비로그인 포함) → 핵심/대표 개념을 폴백으로 추천 (인기 진입점).
 *
 * 모든 데이터는 archive_concepts 단일 list 1회 조회. 추가 쓰기·변경 없음.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles, Target, Compass, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/features/auth/auth-store";
import { archiveConceptsApi, diagnosticResultsApi } from "@/lib/bkend";
import type { ArchiveConcept } from "@/types";

/**
 * 폴백 추천 — 신입·관심정보 미보유 사용자에게 보여줄 대표 핵심 개념 seedKey.
 * 교육공학 입문 시 가장 먼저 접하는 분야 정의·설계 개념 위주.
 */
const FALLBACK_SEED_KEYS = [
  "concept:educational-technology",
  "concept:instructional-design",
  "concept:addie-model",
  "concept:self-efficacy",
  "concept:learning-motivation",
  "concept:cognitive-load",
];

const MAX_ITEMS = 6;

interface Recommendation {
  concept: ArchiveConcept;
  reason?: string;
}

/** 사용자 관심 키워드 수집 — researchInterests + interestKeywords + researchTopics 합집합. */
function collectInterestKeywords(
  user: ReturnType<typeof useAuthStore.getState>["user"],
): string[] {
  if (!user) return [];
  const raw = [
    ...(user.researchInterests ?? []),
    ...(user.interestKeywords ?? []),
    ...(user.researchTopics ?? []),
  ];
  return raw
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter((s) => s.length > 0);
}

/** 개념이 키워드와 일치하는지 — name·altNames·tags·description 부분 일치(대소문자 무시). */
function conceptMatchesKeyword(concept: ArchiveConcept, kw: string): boolean {
  const q = kw.toLowerCase();
  if (!q) return false;
  const haystacks: string[] = [
    concept.name,
    concept.description ?? "",
    ...(concept.altNames ?? []),
    ...(concept.tags ?? []),
  ];
  return haystacks.some((h) => h.toLowerCase().includes(q));
}

export default function ArchiveConceptRecommend() {
  const { user } = useAuthStore();
  const [concepts, setConcepts] = useState<ArchiveConcept[]>([]);
  const [weakConceptIds, setWeakConceptIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // 개념 전체 로드 (검색·랜딩과 동일한 source, react-query 미사용 페이지라 자체 fetch)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await archiveConceptsApi.list();
        if (!cancelled) setConcepts(res.data);
      } catch (err) {
        console.error("[archive-recommend] concepts load failed", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 최근 진단 약점 로드 (로그인 시에만, 읽기 전용)
  useEffect(() => {
    if (!user) {
      setWeakConceptIds([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await diagnosticResultsApi.listByUser(user.id);
        if (cancelled) return;
        // listByUser 는 createdAt desc — 가장 최근 회차의 약점 개념을 사용
        const latest = res.data[0];
        setWeakConceptIds(latest?.weakConceptIds ?? []);
      } catch (err) {
        console.error("[archive-recommend] diagnosis load failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const interestKeywords = useMemo(() => collectInterestKeywords(user), [user]);

  /** 추천 산출: 진단 약점 → 관심 키워드 → 폴백 순으로 채운다. */
  const { recommendations, mode } = useMemo<{
    recommendations: Recommendation[];
    mode: "diagnosis" | "interest" | "fallback";
  }>(() => {
    if (concepts.length === 0) return { recommendations: [], mode: "fallback" };

    const byId = new Map(concepts.map((c) => [c.id, c]));
    const seen = new Set<string>();
    const picked: Recommendation[] = [];

    // 1) 진단 약점 우선
    for (const id of weakConceptIds) {
      const c = byId.get(id);
      if (c && !seen.has(c.id)) {
        seen.add(c.id);
        picked.push({ concept: c, reason: "진단 약점" });
      }
      if (picked.length >= MAX_ITEMS) break;
    }
    const hasDiagnosis = picked.length > 0;

    // 2) 관심 키워드 매칭
    let hasInterest = false;
    if (picked.length < MAX_ITEMS && interestKeywords.length > 0) {
      for (const c of concepts) {
        if (seen.has(c.id)) continue;
        const matchedKw = interestKeywords.find((kw) =>
          conceptMatchesKeyword(c, kw),
        );
        if (matchedKw) {
          seen.add(c.id);
          picked.push({ concept: c, reason: `관심: ${matchedKw}` });
          hasInterest = true;
        }
        if (picked.length >= MAX_ITEMS) break;
      }
    }

    // 3) 폴백 — 대표 핵심 개념 (seedKey 우선, 부족 시 앞에서부터)
    if (picked.length < MAX_ITEMS) {
      const bySeedKey = new Map(
        concepts.filter((c) => c.seedKey).map((c) => [c.seedKey as string, c]),
      );
      for (const key of FALLBACK_SEED_KEYS) {
        const c = bySeedKey.get(key);
        if (c && !seen.has(c.id)) {
          seen.add(c.id);
          picked.push({ concept: c });
        }
        if (picked.length >= MAX_ITEMS) break;
      }
      for (const c of concepts) {
        if (picked.length >= MAX_ITEMS) break;
        if (!seen.has(c.id)) {
          seen.add(c.id);
          picked.push({ concept: c });
        }
      }
    }

    const resolvedMode: "diagnosis" | "interest" | "fallback" = hasDiagnosis
      ? "diagnosis"
      : hasInterest
        ? "interest"
        : "fallback";

    return { recommendations: picked.slice(0, MAX_ITEMS), mode: resolvedMode };
  }, [concepts, weakConceptIds, interestKeywords]);

  if (loading) {
    return (
      <Card className="mt-6 rounded-2xl border bg-card shadow-sm">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) return null;

  const header =
    mode === "diagnosis"
      ? {
          icon: Target,
          title: "진단 약점 기반 추천 개념",
          desc: "최근 진단에서 보강이 필요했던 개념입니다. 정의를 다시 확인해 보세요.",
          accent: "text-rose-600 dark:text-rose-400",
          bg: "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800",
        }
      : mode === "interest"
        ? {
            icon: Sparkles,
            title: "관심 주제 기반 추천 개념",
            desc: "프로필 관심 분야와 닿아 있는 개념을 모았습니다.",
            accent: "text-violet-600 dark:text-violet-400",
            bg: "bg-violet-50/50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800",
          }
        : {
            icon: Compass,
            title: "이 개념부터 살펴보세요",
            desc: "교육공학 연구에서 가장 많이 다루는 핵심 개념입니다.",
            accent: "text-blue-600 dark:text-blue-400",
            bg: "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800",
          };
  const HeaderIcon = header.icon;

  return (
    <Card className={`mt-6 rounded-2xl border shadow-sm ${header.bg}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <HeaderIcon className={`h-4 w-4 ${header.accent}`} aria-hidden />
          {header.title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{header.desc}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {recommendations.map(({ concept, reason }) => (
            <Link
              key={concept.id}
              href={`/archive/concept/${concept.id}`}
              className="group flex items-start gap-3 rounded-xl border bg-card p-3 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label={`개념 ${concept.name} 보기`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold">
                    {concept.name}
                  </span>
                  {concept.purifiedName &&
                    concept.purifiedName !== concept.name && (
                      <span className="truncate text-[11px] text-muted-foreground">
                        ({concept.purifiedName})
                      </span>
                    )}
                </div>
                {reason && (
                  <Badge
                    variant="outline"
                    className="mt-1 text-[10px] font-normal"
                  >
                    {reason}
                  </Badge>
                )}
                {concept.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {concept.description}
                  </p>
                )}
              </div>
              <ArrowRight
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
