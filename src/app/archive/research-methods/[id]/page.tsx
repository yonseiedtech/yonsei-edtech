"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ListOrdered,
  BookOpen,
  GraduationCap,
  ExternalLink,
  Wrench,
  Pencil,
  Eye,
  EyeOff,
  BarChart3,
  Lightbulb,
  Star,
  Network,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/page-header";
import ConceptLinkedText from "@/components/archive/ConceptLinkedText";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import ResearchDesignDiagram, { hasDesignDiagram } from "@/features/archive/ResearchDesignDiagram";
import {
  researchMethodsApi,
  alumniThesesApi,
  statisticalMethodsApi,
  archiveFavoritesApi,
  archiveConceptsApi,
  archiveVariablesApi,
} from "@/lib/bkend";
import {
  findStatMethodsLinkingToResearch,
  mergeById,
} from "@/lib/archive-reverse-link";
import {
  RESEARCH_METHOD_KIND_COLORS,
  RESEARCH_METHOD_KIND_LABELS,
  RESEARCH_METHOD_TOOL_LABELS,
  STATISTICAL_METHOD_CATEGORY_COLORS,
  STATISTICAL_METHOD_CATEGORY_LABELS,
  type ResearchMethod,
  type AlumniThesis,
  type StatisticalMethod,
} from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ArchiveStickyToc, { type ArchiveTocSection } from "@/components/archive/ArchiveStickyToc";
import ArchiveMobileToc from "@/components/archive/ArchiveMobileToc";
import PageContainer from "@/components/ui/page-container";
import { recordRecentView } from "@/lib/archive-recent-views";

export default function ResearchMethodDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const canManage = isAtLeast(user, "staff");

  const [method, setMethod] = useState<ResearchMethod | null>(null);
  const [theses, setTheses] = useState<AlumniThesis[]>([]);
  const [statisticalMethods, setStatisticalMethods] = useState<StatisticalMethod[]>([]);
  // H2 역링크: 이 방법을 쓴 논문의 주요 개념·변인 (관련 논문 데이터 역집계, 상위 6개)
  const [thesisConcepts, setThesisConcepts] = useState<{ id: string; name: string }[]>([]);
  const [thesisVariables, setThesisVariables] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFav, setIsFav] = useState(false);
  const [favPending, setFavPending] = useState(false);

  useEffect(() => {
    if (!params?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const m = await researchMethodsApi.get(params.id);
        if (cancelled) return;
        setMethod(m);
        // 비-staff 인데 draft 인 경우 — rules 가 차단하지만 방어적으로 한 번 더 가드
        if (!m.published && !canManage) {
          setError("비공개 항목입니다.");
          return;
        }
        const ids = m.alumniThesisIds ?? [];
        if (ids.length > 0) {
          const results = await Promise.allSettled(
            ids.map((id) => alumniThesesApi.get(id)),
          );
          if (cancelled) return;
          const ok: AlumniThesis[] = [];
          for (const r of results) {
            if (r.status === "fulfilled") ok.push(r.value);
          }
          setTheses(ok);
        }
        // 양방향 read-time 병합:
        // (1) forward — 본 연구방법의 statisticalMethodIds 가 직접 가리키는 통계방법
        // (2) reverse — archive_statistical_methods.relatedResearchMethodIds 가 본 method.id 를 포함하는 항목
        // 검수 게이트는 forward·reverse 모두 동일 (canManage 면 draft 도, 아니면 published 만)
        const statIds = m.statisticalMethodIds ?? [];
        const forwardResults =
          statIds.length > 0
            ? await Promise.allSettled(
                statIds.map((id) => statisticalMethodsApi.get(id)),
              )
            : [];
        if (cancelled) return;
        const forward: StatisticalMethod[] = [];
        for (const r of forwardResults) {
          if (r.status === "fulfilled" && (canManage || r.value.published)) {
            forward.push(r.value);
          }
        }

        // reverse 조회 — 운영진은 전체 list(), 그 외는 listPublished()
        let reverse: StatisticalMethod[] = [];
        try {
          const allStats = canManage
            ? await statisticalMethodsApi.list()
            : await statisticalMethodsApi.listPublished();
          if (cancelled) return;
          reverse = findStatMethodsLinkingToResearch(allStats.data, m.id);
        } catch (err) {
          console.error("[research-method-detail] reverse stat load failed", err);
        }

        const merged = mergeById(forward, reverse);
        if (merged.length > 0) setStatisticalMethods(merged);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "불러오기 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params?.id, canManage]);

  // H2 역링크: 이미 로드된 theses 데이터에서 개념·변인 id 를 역집계해 상위 항목을 칩으로 노출.
  useEffect(() => {
    if (theses.length === 0) {
      setThesisConcepts([]);
      setThesisVariables([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const cCount = new Map<string, number>();
      const vCount = new Map<string, number>();
      for (const t of theses) {
        new Set(t.conceptIds ?? []).forEach((x) => cCount.set(x, (cCount.get(x) ?? 0) + 1));
        new Set(t.variableIds ?? []).forEach((x) => vCount.set(x, (vCount.get(x) ?? 0) + 1));
      }
      const topC = [...cCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map((e) => e[0]);
      const topV = [...vCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map((e) => e[0]);
      if (topC.length === 0 && topV.length === 0) {
        if (!cancelled) {
          setThesisConcepts([]);
          setThesisVariables([]);
        }
        return;
      }
      try {
        const [cRes, vRes] = await Promise.all([
          Promise.allSettled(topC.map((cid) => archiveConceptsApi.get(cid))),
          Promise.allSettled(topV.map((vid) => archiveVariablesApi.get(vid))),
        ]);
        if (cancelled) return;
        const concepts: { id: string; name: string }[] = [];
        for (const r of cRes) if (r.status === "fulfilled") concepts.push({ id: r.value.id, name: r.value.name });
        const variables: { id: string; name: string }[] = [];
        for (const r of vRes) if (r.status === "fulfilled") variables.push({ id: r.value.id, name: r.value.name });
        setThesisConcepts(concepts);
        setThesisVariables(variables);
      } catch (err) {
        console.error("[research-method-detail] thesis topic aggregate failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [theses]);

  // 최근 본 항목 기록 (스프린트1 H3)
  useEffect(() => {
    if (loading || !method?.name) return;
    recordRecentView({
      type: "research-method",
      id: method.id,
      title: method.name,
      href: `/archive/research-methods/${method.id}`,
    });
  }, [loading, method?.id, method?.name]);

  async function togglePublish() {
    if (!method || !canManage) return;
    const next = !method.published;
    try {
      await researchMethodsApi.update(method.id, { published: next });
      setMethod({ ...method, published: next });
      toast.success(next ? "공개로 전환했습니다." : "비공개(draft) 로 전환했습니다.");
    } catch (err) {
      console.error("[research-method-detail] toggle publish failed", err);
      toast.error("공개 상태 변경 실패");
    }
  }

  // 즐겨찾기 상태 로드
  useEffect(() => {
    if (!user || !params?.id) {
      setIsFav(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await archiveFavoritesApi.listByUser(user.id);
        if (cancelled) return;
        setIsFav(
          res.data.some(
            (f) => f.itemType === "research-method" && f.itemId === params.id,
          ),
        );
      } catch (err) {
        console.error("[research-method-detail] favorites check failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, params?.id]);

  async function handleToggleFav() {
    if (!user || !method) {
      toast.error("로그인이 필요합니다");
      return;
    }
    setFavPending(true);
    const favId = archiveFavoritesApi.makeId(user.id, "research-method", method.id);
    try {
      if (isFav) {
        await archiveFavoritesApi.delete(favId);
        setIsFav(false);
        toast.success("관심 해제");
      } else {
        await archiveFavoritesApi.upsert(favId, {
          userId: user.id,
          itemType: "research-method",
          itemId: method.id,
          itemName: method.name,
        });
        setIsFav(true);
        toast.success("관심 저장");
      }
    } catch (err) {
      console.error("[research-method-detail] favorite toggle failed", err);
      toast.error("관심 저장 실패");
    } finally {
      setFavPending(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-9 w-3/4" />
        <Skeleton className="mt-2 h-4 w-1/2" />
        <div className="mt-8 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-10/12" />
        </div>
      </div>
    );
  }

  if (error || !method) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-sm text-destructive" role="alert">
          ⚠ {error ?? "항목을 찾을 수 없습니다."}
        </p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          뒤로
        </Button>
      </div>
    );
  }

  // 본문에 존재할 가능성이 있는 섹션만 ToC 에 포함 — 빈 섹션은 ToC 에 노출하지 않는다.
  const tocSections: ArchiveTocSection[] = [
    { id: "overview", label: "개요" },
    { id: "summary", label: "요약" },
    ...(method.accessibleSummary && method.accessibleSummary.trim() !== ""
      ? [{ id: "accessibleSummary", label: "쉽게 이해하기" }]
      : []),
    ...(hasDesignDiagram(method.name) ? [{ id: "design-model", label: "설계 모형" }] : []),
    ...(method.procedures && method.procedures.length > 0
      ? [{ id: "procedure", label: "연구 절차" }]
      : []),
    ...(method.statisticalMethodIds && method.statisticalMethodIds.length > 0
      ? [{ id: "related-statistical-methods", label: "관련 통계기법" }]
      : []),
    ...(thesisConcepts.length > 0 || thesisVariables.length > 0
      ? [{ id: "thesis-topics", label: "주요 개념·변인" }]
      : []),
    ...(method.educationalTechExamples && method.educationalTechExamples.length > 0
      ? [{ id: "examples", label: "활용 예" }]
      : []),
    ...(method.references && method.references.length > 0
      ? [{ id: "references", label: "참고 자료" }]
      : []),
  ];

  return (
    <PageContainer width="default">
      <div>
        <Link
          href="/archive/research-methods"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3 w-3" /> 연구방법 가이드 목록
        </Link>

        <div className="lg:grid lg:grid-cols-[1fr_200px] lg:gap-6">
          <div className="min-w-0 lg:max-w-4xl">

        <ArchiveMobileToc sections={tocSections} className="mt-3" />

        <div id="overview" className="mt-3 flex flex-wrap items-start justify-between gap-3 scroll-mt-24">
          <div id="summary" className="min-w-0 flex-1 scroll-mt-24">
            <PageHeader
              icon={GraduationCap}
              title={method.name}
              description={method.summary}
            />
            {method.purifiedName?.trim() && (
              <p className="mt-1.5">
                <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-800 dark:border-teal-400/30 dark:bg-teal-950/30 dark:text-teal-300">
                  순화어 · {method.purifiedName.trim()}
                </span>
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  RESEARCH_METHOD_KIND_COLORS[method.kind] ??
                    "border border-muted-foreground/20 bg-muted text-muted-foreground",
                )}
              >
                {RESEARCH_METHOD_KIND_LABELS[method.kind] ?? method.kind} 연구
              </Badge>
              {!method.published && (
                <Badge variant="outline" className="bg-destructive/5 text-destructive border-destructive/20 text-xs">
                  비공개 (draft)
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {user && (
              <Button
                variant={isFav ? "default" : "outline"}
                size="sm"
                onClick={handleToggleFav}
                disabled={favPending}
                className={cn(
                  isFav && "bg-warning hover:bg-warning/80 border-warning",
                )}
                aria-pressed={isFav}
              >
                <Star className={cn("mr-1 h-4 w-4", isFav && "fill-current")} />
                {isFav ? "관심 저장됨" : "관심 저장"}
              </Button>
            )}
            {canManage && (
              <>
                <Button variant="outline" size="sm" onClick={togglePublish}>
                  {method.published ? (
                    <>
                      <EyeOff className="mr-1 h-4 w-4" />
                      비공개로 전환
                    </>
                  ) : (
                    <>
                      <Eye className="mr-1 h-4 w-4" />
                      공개로 전환
                    </>
                  )}
                </Button>
                <Link href={`/console/archive/research-methods/${method.id}/edit`}>
                  <Button size="sm">
                    <Pencil className="mr-1 h-4 w-4" />
                    편집
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* 쉽게 이해하기 (일상 비유) */}
        {method.accessibleSummary && method.accessibleSummary.trim() !== "" && (
          <section id="accessibleSummary" className="mt-8 scroll-mt-24">
            <div
              className="rounded-xl border border-info/20 bg-gradient-to-br from-info/5 to-success/5 p-4"
              aria-label="쉽게 이해하기"
            >
              <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-info">
                <Lightbulb className="h-4 w-4" aria-hidden />
                쉽게 이해하기
              </h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                <ConceptLinkedText text={method.accessibleSummary ?? ""} />
              </p>
            </div>
          </section>
        )}

        {/* 상세 설명 */}
        {method.description && (
          <section className="mt-8">
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">개요</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              <ConceptLinkedText text={method.description ?? ""} />
            </p>
          </section>
        )}

        {/* 설계 모형 다이어그램 — O-X 표기·절차 순환 시각화 (사이클 56) */}
        {hasDesignDiagram(method.name) && (
          <section id="design-model" className="mt-8 scroll-mt-24">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">설계 모형으로 보기</h2>
            <div className="rounded-xl border bg-card p-4">
              <ResearchDesignDiagram methodName={method.name} />
            </div>
          </section>
        )}

        {/* 교육공학 활용 예 */}
        {method.educationalTechExamples && method.educationalTechExamples.length > 0 && (
          <section id="examples" className="mt-8 scroll-mt-24">
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">교육공학에서의 활용 예</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/85">
              {method.educationalTechExamples.map((ex, i) => (
                <li key={i}>{ex}</li>
              ))}
            </ul>
          </section>
        )}

        {/* 절차 */}
        {method.procedures && method.procedures.length > 0 && (
          <section id="procedure" className="mt-8 scroll-mt-24">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <ListOrdered className="h-4 w-4" aria-hidden />
              연구 절차
            </h2>
            <ol className="space-y-2">
              {(
                method.procedures as Array<
                  | { id?: string; step: string; detail?: string; example?: string }
                  | string
                >
              ).map((raw, i) => {
                // 레거시 호환(사이클 125): procedures 가 문자열 배열로 저장된 항목은
                // "1. 단계명 — 설명" 형태를 step/detail 로 분해해 표시한다.
                let p: { id?: string; step: string; detail?: string; example?: string };
                if (typeof raw === "string") {
                  const cleaned = raw.replace(/^\s*\d+[.)]\s*/, "");
                  const dash = cleaned.search(/\s[—–-]\s/);
                  p =
                    dash > 0
                      ? {
                          id: `p-${i}`,
                          step: cleaned.slice(0, dash).trim(),
                          detail: cleaned.slice(dash).replace(/^\s*[—–-]\s*/, "").trim(),
                        }
                      : { id: `p-${i}`, step: cleaned };
                } else {
                  p = raw;
                }
                return (
                  <li
                    key={p.id ?? `p-${i}`}
                    className="flex gap-3 rounded-lg border bg-card p-3"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{p.step}</p>
                      {p.detail && (
                        <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">
                          {p.detail}
                        </p>
                      )}
                      {p.example && (
                        <p className="mt-1.5 rounded-md border-l-2 border-warning/30 bg-warning/5 px-2 py-1 text-[11px] leading-relaxed text-warning">
                          <span className="font-semibold">논문 예시 · </span>
                          {p.example}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {/* 강점·약점 */}
        {((method.strengths && method.strengths.length > 0) ||
          (method.limitations && method.limitations.length > 0)) && (
          <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            {method.strengths && method.strengths.length > 0 && (
              <Card className="rounded-xl border-l-4 border-l-success">
                <CardContent className="py-4">
                  <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-success">
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    강점
                  </h3>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/85">
                    {method.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            {method.limitations && method.limitations.length > 0 && (
              <Card className="rounded-xl border-l-4 border-l-destructive">
                <CardContent className="py-4">
                  <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-destructive">
                    <XCircle className="h-4 w-4" aria-hidden />
                    한계 / 약점
                  </h3>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/85">
                    {method.limitations.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </section>
        )}

        {/* 기본 가정 (양적 연구의 통계 가정 등) */}
        {method.assumptions && method.assumptions.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
              사용 전 기본 가정
            </h2>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">가정</th>
                    <th className="px-3 py-2 text-left font-medium">설명</th>
                    <th className="px-3 py-2 text-left font-medium">검정 방법</th>
                    <th className="px-3 py-2 text-left font-medium">SPSS</th>
                    <th className="px-3 py-2 text-left font-medium">R</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {method.assumptions.map((a) => (
                    <tr key={a.id} className="align-top">
                      <td className="px-3 py-2 font-medium">{a.name}</td>
                      <td className="px-3 py-2 text-foreground/85">
                        {a.description}
                        {a.threshold && (
                          <span className="mt-1 block text-[11px] text-muted-foreground">
                            기준: {a.threshold}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {a.howToCheck ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        {a.spssCommand ? (
                          <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                            {a.spssCommand}
                          </code>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {a.rCommand ? (
                          <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                            {a.rCommand}
                          </code>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 관련 도구 가이드 (Phase 3 placeholder) */}
        {method.relatedToolGuides && method.relatedToolGuides.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Wrench className="h-4 w-4" aria-hidden />
              관련 도구 가이드
            </h2>
            <div className="flex flex-wrap gap-2">
              {method.relatedToolGuides.map((tool) => (
                <Badge key={tool} variant="outline" className="text-xs">
                  {RESEARCH_METHOD_TOOL_LABELS[tool]}
                </Badge>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              도구별 상세 가이드(Phase 3)는 추후 제공될 예정입니다.
            </p>
          </section>
        )}

        {/* 참고 자료 */}
        {method.references && method.references.length > 0 && (
          <section id="references" className="mt-8 scroll-mt-24">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <BookOpen className="h-4 w-4" aria-hidden />
              참고 자료
            </h2>
            <ul className="space-y-1.5 text-sm">
              {method.references.map((r) => (
                <li key={r.id} className="leading-relaxed">
                  {r.author && <span className="font-medium">{r.author}</span>}
                  {r.year && <span> ({r.year})</span>}
                  {r.author || r.year ? <span>. </span> : null}
                  <span>{r.title}</span>
                  {r.url && (
                    <>
                      {" "}
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-0.5 text-primary hover:underline"
                      >
                        링크 <ExternalLink className="h-3 w-3" aria-hidden />
                      </a>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 자주 쓰는 통계기법 (양방향 연계) */}
        {statisticalMethods.length > 0 && (
          <section id="related-statistical-methods" className="mt-10 scroll-mt-24">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <BarChart3 className="h-4 w-4" aria-hidden />
              이 방법에서 자주 쓰는 통계기법
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {statisticalMethods.map((s) => (
                <Link
                  key={s.id}
                  href={`/archive/statistical-methods/${s.id}`}
                  className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 rounded-xl"
                >
                  <article className="h-full rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-medium leading-snug group-hover:text-primary">
                        {s.name}
                      </h3>
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0 text-[10px]",
                          STATISTICAL_METHOD_CATEGORY_COLORS[s.category],
                        )}
                      >
                        {STATISTICAL_METHOD_CATEGORY_LABELS[s.category]}
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
                      {s.summary}
                    </p>
                    {!s.published && canManage && (
                      <Badge
                        variant="outline"
                        className="mt-2 bg-destructive/5 text-destructive border-destructive/20 text-[10px]"
                      >
                        draft
                      </Badge>
                    )}
                  </article>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* H2 역링크: 이 방법을 쓴 논문의 주요 개념·변인 */}
        {(thesisConcepts.length > 0 || thesisVariables.length > 0) && (
          <section id="thesis-topics" className="mt-10 scroll-mt-24">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Layers className="h-4 w-4" aria-hidden />
              이 방법을 쓴 논문의 주요 개념·변인
            </h2>
            <p className="mb-3 text-xs text-muted-foreground">
              이 연구방법을 사용한 졸업 논문들이 다룬 개념·변인입니다. 방법과 함께 무엇을 연구했는지 살펴보세요.
            </p>
            {thesisConcepts.length > 0 && (
              <div className="mb-3">
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">개념</p>
                <div className="flex flex-wrap gap-1.5">
                  {thesisConcepts.map((c) => (
                    <Link key={c.id} href={`/archive/concept/${c.id}`}>
                      <Badge
                        variant="outline"
                        className="cursor-pointer border-cat-5/20 bg-cat-5/5 text-cat-5 transition-shadow hover:shadow-sm"
                      >
                        {c.name}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {thesisVariables.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">변인</p>
                <div className="flex flex-wrap gap-1.5">
                  {thesisVariables.map((v) => (
                    <Link key={v.id} href={`/archive/variable/${v.id}`}>
                      <Badge
                        variant="outline"
                        className="cursor-pointer border-info/20 bg-info/5 text-info transition-shadow hover:shadow-sm"
                      >
                        {v.name}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* 졸업생 학위논문 연계 */}
        <section className="mt-10">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <GraduationCap className="h-4 w-4" aria-hidden />
            이 방법을 사용한 졸업생 학위논문
          </h2>
          {theses.length === 0 ? (
            <Card className="rounded-xl border-dashed">
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                아직 매칭된 졸업생 논문이 없습니다.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {theses.map((t) => (
                <Link
                  key={t.id}
                  href={`/alumni/thesis/${t.id}`}
                  className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 rounded-xl"
                >
                  <article className="h-full rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm">
                    <p className="text-xs text-muted-foreground">
                      {t.awardedYearMonth?.slice(0, 4) ?? ""}
                      {t.advisorName && ` · 지도 ${t.advisorName}`}
                    </p>
                    <h3 className="mt-1 text-sm font-medium leading-snug group-hover:text-primary">
                      {t.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.authorName}
                    </p>
                    {t.keywords && t.keywords.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {t.keywords.slice(0, 4).map((k, i) => (
                          <Badge key={`${k}-${i}`} variant="secondary" className="text-[10px]">
                            {k}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </article>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* 관계 그래프 딥링크 (L15) */}
        <div className="mt-8">
          <Link
            href={`/archive/graph?focus=${encodeURIComponent(`research-method:${method.id}`)}`}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <Network className="h-4 w-4" aria-hidden />
            관계 그래프에서 보기
          </Link>
        </div>

        {/* 학술 책임 고지 */}
        <div className="mt-10 flex items-start gap-2 rounded-xl border border-warning/20 bg-warning/5 p-4 text-xs text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            본 가이드는 참고용입니다. 최종 연구설계는 지도교수와 상의하시기 바랍니다.
          </p>
        </div>

          </div>
          <ArchiveStickyToc sections={tocSections} />
        </div>
      </div>
    </PageContainer>
  );
}
