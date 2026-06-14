"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertTriangle,
  ListOrdered,
  BookOpen,
  GraduationCap,
  ExternalLink,
  Pencil,
  Eye,
  EyeOff,
  BarChart3,
  Sparkles,
  GitCompare,
  Lightbulb,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/page-header";
import ConceptLinkedText from "@/components/archive/ConceptLinkedText";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import StatModelDiagram, { hasStatDiagram } from "@/features/archive/StatModelDiagram";
import {
  researchMethodsApi,
  alumniThesesApi,
  statisticalMethodsApi,
  archiveFavoritesApi,
} from "@/lib/bkend";
import {
  findResearchMethodsLinkingToStat,
  mergeById,
} from "@/lib/archive-reverse-link";
import {
  RESEARCH_METHOD_KIND_COLORS,
  RESEARCH_METHOD_KIND_LABELS,
  STATISTICAL_METHOD_CATEGORY_COLORS,
  STATISTICAL_METHOD_CATEGORY_LABELS,
  GROUP_COUNT_LABELS,
  DV_COUNT_LABELS,
  IV_COUNT_LABELS,
  DESIGN_TYPE_LABELS,
  type ResearchMethod,
  type AlumniThesis,
  type StatisticalMethod,
} from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ArchiveStickyToc, { type ArchiveTocSection } from "@/components/archive/ArchiveStickyToc";
import PageContainer from "@/components/ui/page-container";

interface ComparisonRow {
  key: string;
  label: string;
  render: (m: StatisticalMethod) => React.ReactNode;
}

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    key: "groupCount",
    label: "집단 수",
    render: (m) => {
      const v = m.comparisonProfile?.groupCount;
      return v ? GROUP_COUNT_LABELS[v] : "—";
    },
  },
  {
    key: "dependentVariableCount",
    label: "종속변수 수",
    render: (m) => {
      const v = m.comparisonProfile?.dependentVariableCount;
      return v ? DV_COUNT_LABELS[v] : "—";
    },
  },
  {
    key: "independentVariableCount",
    label: "독립변수 수",
    render: (m) => {
      const v = m.comparisonProfile?.independentVariableCount;
      return v ? IV_COUNT_LABELS[v] : "—";
    },
  },
  {
    key: "designType",
    label: "설계 유형",
    render: (m) => {
      const v = m.comparisonProfile?.designType;
      return v ? DESIGN_TYPE_LABELS[v] : "—";
    },
  },
  {
    key: "focus",
    label: "분석 초점",
    render: (m) => m.comparisonProfile?.focus ?? "—",
  },
  {
    key: "dependentVariable",
    label: "종속변수",
    render: (m) => m.comparisonProfile?.dependentVariable ?? "—",
  },
  {
    key: "independentVariable",
    label: "독립변수",
    render: (m) => m.comparisonProfile?.independentVariable ?? "—",
  },
  {
    key: "minSampleSize",
    label: "최소 표본",
    render: (m) => m.comparisonProfile?.minSampleSize ?? "—",
  },
  {
    key: "keyAssumptions",
    label: "핵심 가정",
    render: (m) => {
      const arr = m.comparisonProfile?.keyAssumptions;
      if (!arr || arr.length === 0) return "—";
      return (
        <div className="flex flex-wrap gap-1">
          {arr.map((k, i) => (
            <Badge key={`${k}-${i}`} variant="secondary" className="text-[10px]">
              {k}
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    key: "strengthOneliner",
    label: "강점",
    render: (m) => m.comparisonProfile?.strengthOneliner ?? "—",
  },
  {
    key: "limitationOneliner",
    label: "한계",
    render: (m) => m.comparisonProfile?.limitationOneliner ?? "—",
  },
];

export default function StatisticalMethodDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const canManage = isAtLeast(user, "staff");

  const [method, setMethod] = useState<StatisticalMethod | null>(null);
  const [alternatives, setAlternatives] = useState<StatisticalMethod[]>([]);
  const [researchMethods, setResearchMethods] = useState<ResearchMethod[]>([]);
  const [theses, setTheses] = useState<AlumniThesis[]>([]);
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
        const m = await statisticalMethodsApi.get(params.id);
        if (cancelled) return;
        setMethod(m);
        // 비-staff 인데 draft 인 경우 — rules 가 차단하지만 방어적으로 한 번 더 가드
        if (!m.published && !canManage) {
          setError("비공개 항목입니다.");
          return;
        }

        // 대안 통계방법 일괄 조회 — 검수 게이트 3중 (비-staff 에게 draft 노출 차단)
        const altIds = (m.alternativeMethods ?? []).map((a) => a.methodId);
        if (altIds.length > 0) {
          const aResults = await Promise.allSettled(
            altIds.map((id) => statisticalMethodsApi.get(id)),
          );
          if (cancelled) return;
          const aOk: StatisticalMethod[] = [];
          for (const r of aResults) {
            if (r.status === "fulfilled" && (canManage || r.value.published)) {
              aOk.push(r.value);
            }
          }
          setAlternatives(aOk);
        }

        // 양방향 read-time 병합:
        // (1) forward — 본 통계방법의 relatedResearchMethodIds 가 직접 가리키는 연구방법
        // (2) reverse — archive_research_methods.statisticalMethodIds 가 본 method.id 를 포함하는 항목
        const rmIds = m.relatedResearchMethodIds ?? [];
        const rForwardResults =
          rmIds.length > 0
            ? await Promise.allSettled(
                rmIds.map((id) => researchMethodsApi.get(id)),
              )
            : [];
        if (cancelled) return;
        const rForward: ResearchMethod[] = [];
        for (const r of rForwardResults) {
          if (r.status === "fulfilled" && (canManage || r.value.published)) {
            rForward.push(r.value);
          }
        }

        let rReverse: ResearchMethod[] = [];
        try {
          const allResearch = canManage
            ? await researchMethodsApi.list()
            : await researchMethodsApi.listPublished();
          if (cancelled) return;
          rReverse = findResearchMethodsLinkingToStat(allResearch.data, m.id);
        } catch (err) {
          console.error(
            "[statistical-method-detail] reverse research load failed",
            err,
          );
        }

        const rMerged = mergeById(rForward, rReverse);
        if (rMerged.length > 0) setResearchMethods(rMerged);

        // 졸업생 학위논문 일괄 조회
        const thesisIds = m.alumniThesisIds ?? [];
        if (thesisIds.length > 0) {
          const tResults = await Promise.allSettled(
            thesisIds.map((id) => alumniThesesApi.get(id)),
          );
          if (cancelled) return;
          const tOk: AlumniThesis[] = [];
          for (const r of tResults) {
            if (r.status === "fulfilled") tOk.push(r.value);
          }
          setTheses(tOk);
        }
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

  async function togglePublish() {
    if (!method || !canManage) return;
    const next = !method.published;
    try {
      await statisticalMethodsApi.update(method.id, { published: next });
      setMethod({ ...method, published: next });
      toast.success(next ? "공개로 전환했습니다." : "비공개(draft) 로 전환했습니다.");
    } catch (err) {
      console.error("[statistical-method-detail] toggle publish failed", err);
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
            (f) => f.itemType === "statistical-method" && f.itemId === params.id,
          ),
        );
      } catch (err) {
        console.error("[statistical-method-detail] favorites check failed", err);
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
    const favId = archiveFavoritesApi.makeId(user.id, "statistical-method", method.id);
    try {
      if (isFav) {
        await archiveFavoritesApi.delete(favId);
        setIsFav(false);
        toast.success("관심 해제");
      } else {
        await archiveFavoritesApi.upsert(favId, {
          userId: user.id,
          itemType: "statistical-method",
          itemId: method.id,
          itemName: method.name,
        });
        setIsFav(true);
        toast.success("관심 저장");
      }
    } catch (err) {
      console.error("[statistical-method-detail] favorite toggle failed", err);
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
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/archive/statistical-methods">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-1 h-4 w-4" />
              통계방법 가이드 목록
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            뒤로
          </Button>
        </div>
      </div>
    );
  }

  // 비교표에 들어갈 method 목록 (현재 + 공개된 대안들)
  const comparisonMethods: StatisticalMethod[] = [method, ...alternatives];
  const showComparison = alternatives.length > 0 && !!method.comparisonProfile;

  // ToC 섹션 — 실제 본문에 렌더되는 섹션만 포함
  const tocSections: ArchiveTocSection[] = [
    { id: "overview", label: "개요" },
    { id: "summary", label: "요약" },
    ...(method.accessibleSummary && method.accessibleSummary.trim() !== ""
      ? [{ id: "accessibleSummary", label: "쉽게 이해하기" }]
      : []),
    ...(hasStatDiagram(method.name) ? [{ id: "research-model", label: "연구모형" }] : []),
    ...(method.whenToUse ? [{ id: "when-to-use", label: "언제 사용" }] : []),
    ...(method.interpretationKeys && method.interpretationKeys.length > 0
      ? [{ id: "examples", label: "결과 해석 포인트" }]
      : []),
    ...(alternatives.length > 0
      ? [{ id: "alternative-methods", label: "대안 방법" }]
      : []),
    ...(showComparison ? [{ id: "comparison", label: "비교표" }] : []),
    ...(method.references && method.references.length > 0
      ? [{ id: "references", label: "참고 자료" }]
      : []),
  ];

  return (
    <PageContainer width="default">
      <div>
        <Link
          href="/archive/statistical-methods"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3 w-3" /> 통계방법 가이드 목록
        </Link>

        <div className="lg:grid lg:grid-cols-[1fr_200px] lg:gap-6">
          <div className="min-w-0 lg:max-w-4xl">

        <div id="overview" className="mt-3 flex flex-wrap items-start justify-between gap-3 scroll-mt-24">
          <div id="summary" className="min-w-0 flex-1 scroll-mt-24">
            <PageHeader
              icon={BarChart3}
              title={method.name}
              description={method.summary}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn("text-xs", STATISTICAL_METHOD_CATEGORY_COLORS[method.category])}
              >
                {STATISTICAL_METHOD_CATEGORY_LABELS[method.category]}
              </Badge>
              {!method.published && (
                <Badge
                  variant="outline"
                  className="bg-rose-50 text-rose-700 border-rose-200 text-xs"
                >
                  DRAFT
                </Badge>
              )}
            </div>

            {/* 의사결정 분기 기준 배지 stack */}
            {method.comparisonProfile &&
              (method.comparisonProfile.groupCount ||
                method.comparisonProfile.dependentVariableCount ||
                method.comparisonProfile.independentVariableCount ||
                method.comparisonProfile.designType) && (
                <div
                  className="mt-2 flex flex-wrap items-center gap-1.5"
                  aria-label="의사결정 분기 기준"
                >
                  {method.comparisonProfile.groupCount && (
                    <Badge
                      variant="outline"
                      className="bg-slate-50 text-slate-700 border-slate-200 text-[11px]"
                    >
                      {GROUP_COUNT_LABELS[method.comparisonProfile.groupCount]}
                    </Badge>
                  )}
                  {method.comparisonProfile.dependentVariableCount && (
                    <Badge
                      variant="outline"
                      className="bg-slate-50 text-slate-700 border-slate-200 text-[11px]"
                    >
                      종속변수{" "}
                      {DV_COUNT_LABELS[method.comparisonProfile.dependentVariableCount]}
                    </Badge>
                  )}
                  {method.comparisonProfile.independentVariableCount && (
                    <Badge
                      variant="outline"
                      className="bg-slate-50 text-slate-700 border-slate-200 text-[11px]"
                    >
                      독립변수{" "}
                      {IV_COUNT_LABELS[method.comparisonProfile.independentVariableCount]}
                    </Badge>
                  )}
                  {method.comparisonProfile.designType && (
                    <Badge
                      variant="outline"
                      className="bg-slate-50 text-slate-700 border-slate-200 text-[11px]"
                    >
                      {DESIGN_TYPE_LABELS[method.comparisonProfile.designType]}
                    </Badge>
                  )}
                </div>
              )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {user && (
              <Button
                variant={isFav ? "default" : "outline"}
                size="sm"
                onClick={handleToggleFav}
                disabled={favPending}
                className={cn(
                  isFav && "bg-amber-500 hover:bg-amber-600 border-amber-500",
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
                <Link href={`/console/archive/statistical-methods/${method.id}/edit`}>
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
              className="rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50 to-emerald-50 p-4 dark:border-sky-900 dark:from-sky-950/30 dark:to-emerald-950/30"
              aria-label="쉽게 이해하기"
            >
              <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-sky-900 dark:text-sky-200">
                <Lightbulb className="h-4 w-4" aria-hidden />
                쉽게 이해하기
              </h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                <ConceptLinkedText text={method.accessibleSummary ?? ""} />
              </p>
            </div>
          </section>
        )}

        {/* 기본 정보 — description / 연구모형 / whenToUse */}
        {(method.description || method.whenToUse || hasStatDiagram(method.name)) && (
          <section className="mt-8 space-y-4">
            {method.description && (
              <div>
                <h2 className="mb-2 text-sm font-semibold text-muted-foreground">개요</h2>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  <ConceptLinkedText text={method.description ?? ""} />
                </p>
              </div>
            )}
            {/* 연구모형 다이어그램 — 변인 관계로 "무엇을 보는 분석인지" 시각화 (사이클 55) */}
            {hasStatDiagram(method.name) && (
              <Card id="research-model" className="rounded-xl scroll-mt-24">
                <CardContent className="py-4">
                  <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
                    <GitCompare size={15} className="text-primary" />
                    연구모형으로 보기
                  </p>
                  <StatModelDiagram methodName={method.name} />
                </CardContent>
              </Card>
            )}
            {method.whenToUse && (
              <Card id="when-to-use" className="rounded-xl border-l-4 border-l-blue-400 scroll-mt-24">
                <CardContent className="py-4">
                  <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-blue-800 dark:text-blue-300">
                    <Lightbulb className="h-4 w-4" aria-hidden />
                    언제 사용하는가
                  </h3>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                    {method.whenToUse}
                  </p>
                </CardContent>
              </Card>
            )}
          </section>
        )}

        {/* 가정 테이블 */}
        {method.assumptions && method.assumptions.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">사용 전 기본 가정</h2>
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
                        {a.ifViolated && (
                          <span className="mt-1.5 block rounded-md bg-amber-50 px-2 py-1 text-[11px] leading-relaxed text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                            <span className="font-semibold">깨졌다면:</span> {a.ifViolated}
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

        {/* 절차 */}
        {method.procedure && method.procedure.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <ListOrdered className="h-4 w-4" aria-hidden />
              분석 절차
            </h2>
            <ol className="space-y-2">
              {method.procedure.map((p, i) => (
                <li key={p.id} className="flex gap-3 rounded-lg border bg-card p-3">
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
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* jamovi 실습 절차 — 무료 통계 SW 메뉴 경로 (사이클 65) */}
        {(method.toolGuides ?? [])
          .filter((g) => g.tool === "jamovi")
          .map((g) => (
            <section key={g.tool} id="jamovi-guide" className="mt-8 scroll-mt-24">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Sparkles className="h-4 w-4" aria-hidden />
                jamovi로 따라하기
                <span className="rounded bg-emerald-100 px-1.5 py-px text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  무료 SW
                </span>
              </h2>
              <ol className="space-y-1.5 rounded-lg border bg-card p-4">
                {g.steps.map((s, i) => (
                  <li key={i} className="flex gap-2.5 text-sm">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      {i + 1}
                    </span>
                    <span className="text-foreground/85">{s}</span>
                  </li>
                ))}
              </ol>
              {g.note && (
                <p className="mt-2 text-xs text-muted-foreground">💡 {g.note}</p>
              )}
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                jamovi 는 무료 오픈소스 통계 프로그램입니다 (jamovi.org에서 내려받기). 메뉴 표기는 영문판 기준입니다.
              </p>
            </section>
          ))}

        {/* SPSS 실습 절차 — 메뉴 경로 (사이클 77) */}
        {(method.toolGuides ?? [])
          .filter((g) => g.tool === "spss")
          .map((g) => (
            <section key={g.tool} id="spss-guide" className="mt-8 scroll-mt-24">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Sparkles className="h-4 w-4" aria-hidden />
                SPSS로 따라하기
                <span className="rounded bg-blue-100 px-1.5 py-px text-[10px] font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                  메뉴 경로
                </span>
              </h2>
              <ol className="space-y-1.5 rounded-lg border bg-card p-4">
                {g.steps.map((s, i) => (
                  <li key={i} className="flex gap-2.5 text-sm">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                      {i + 1}
                    </span>
                    <span className="text-foreground/85">{s}</span>
                  </li>
                ))}
              </ol>
              {g.note && (
                <p className="mt-2 text-xs text-muted-foreground">💡 {g.note}</p>
              )}
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                메뉴 표기는 SPSS 영문판 기준입니다. 아래 &lsquo;도구 구문&rsquo;의 명령어를 붙여넣어 실행할 수도 있습니다.
              </p>
            </section>
          ))}

        {/* 도구 구문 — SPSS / AMOS / R */}
        {(method.spssCommand || method.amosCommand || method.rCommand) && (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">도구 구문</h2>
            <div className="space-y-3">
              {method.spssCommand && (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">SPSS</p>
                  <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 text-xs">
                    <code>{method.spssCommand}</code>
                  </pre>
                </div>
              )}
              {method.amosCommand && (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">AMOS</p>
                  <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 text-xs">
                    <code>{method.amosCommand}</code>
                  </pre>
                </div>
              )}
              {method.rCommand && (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">R</p>
                  <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 text-xs">
                    <code>{method.rCommand}</code>
                  </pre>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 결과 해석 핵심 포인트 */}
        {method.interpretationKeys && method.interpretationKeys.length > 0 && (
          <section id="examples" className="mt-8 scroll-mt-24">
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
              결과 해석 핵심 포인트
            </h2>
            <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/85">
              {method.interpretationKeys.map((k, i) => (
                <li key={i}>{k}</li>
              ))}
            </ul>
          </section>
        )}

        {/* 동일한 데이터로 시도해볼 수 있는 다른 통계방법 */}
        {alternatives.length > 0 && (
          <section id="alternative-methods" className="mt-10 scroll-mt-24">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Sparkles className="h-4 w-4" aria-hidden />
              동일한 데이터로 시도해볼 수 있는 다른 통계방법
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {alternatives.map((alt) => {
                const reason =
                  method.alternativeMethods?.find((a) => a.methodId === alt.id)?.reason ?? "";
                return (
                  <Link
                    key={alt.id}
                    href={`/archive/statistical-methods/${alt.id}`}
                    className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 rounded-xl"
                  >
                    <article className="h-full rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-medium leading-snug group-hover:text-primary">
                          {alt.name}
                        </h3>
                        <Badge
                          variant="outline"
                          className={cn(
                            "shrink-0 text-[10px]",
                            STATISTICAL_METHOD_CATEGORY_COLORS[alt.category],
                          )}
                        >
                          {STATISTICAL_METHOD_CATEGORY_LABELS[alt.category]}
                        </Badge>
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
                        {alt.summary}
                      </p>
                      {reason && (
                        <div className="mt-2 rounded-md bg-violet-50 px-2 py-1.5 text-[11px] text-violet-900 dark:bg-violet-950/30 dark:text-violet-200">
                          <span className="font-medium">왜·언제 쓰는가 — </span>
                          {reason}
                        </div>
                      )}
                      {!alt.published && canManage && (
                        <Badge
                          variant="outline"
                          className="mt-2 bg-rose-50 text-rose-700 border-rose-200 text-[10px]"
                        >
                          draft
                        </Badge>
                      )}
                    </article>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* 비교표 — 현재 method + alternatives 의 comparisonProfile */}
        {showComparison && (
          <section id="comparison" className="mt-10 scroll-mt-24">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <GitCompare className="h-4 w-4" aria-hidden />
              비교표 — 동일 데이터에서의 트레이드오프
            </h2>

            {/* 데스크톱 테이블 — 행=비교차원·열=method */}
            <div className="hidden overflow-x-auto rounded-xl border lg:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      비교 차원
                    </th>
                    {comparisonMethods.map((cm, i) => (
                      <th
                        key={cm.id}
                        className="px-3 py-2 text-left font-medium align-bottom"
                      >
                        <Link
                          href={`/archive/statistical-methods/${cm.id}`}
                          className="text-foreground hover:text-primary hover:underline"
                        >
                          {cm.name}
                        </Link>
                        {i === 0 && (
                          <Badge
                            variant="outline"
                            className="ml-1 bg-primary/10 text-primary border-primary/20 text-[10px]"
                          >
                            현재
                          </Badge>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.key} className="align-top">
                      <td className="bg-muted/20 px-3 py-2 text-xs font-medium text-muted-foreground">
                        {row.label}
                      </td>
                      {comparisonMethods.map((cm) => (
                        <td key={cm.id} className="px-3 py-2 text-foreground/85">
                          {row.render(cm)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 모바일 — 카드 stack */}
            <div className="space-y-3 lg:hidden">
              {comparisonMethods.map((cm, i) => (
                <Card key={cm.id} className="rounded-xl">
                  <CardContent className="py-4">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Link
                        href={`/archive/statistical-methods/${cm.id}`}
                        className="text-sm font-semibold hover:text-primary hover:underline"
                      >
                        {cm.name}
                      </Link>
                      {i === 0 && (
                        <Badge
                          variant="outline"
                          className="bg-primary/10 text-primary border-primary/20 text-[10px]"
                        >
                          현재
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          STATISTICAL_METHOD_CATEGORY_COLORS[cm.category],
                        )}
                      >
                        {STATISTICAL_METHOD_CATEGORY_LABELS[cm.category]}
                      </Badge>
                    </div>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-xs">
                      {COMPARISON_ROWS.map((row) => (
                        <div key={row.key} className="contents">
                          <dt className="text-muted-foreground">{row.label}</dt>
                          <dd className="text-foreground/85">{row.render(cm)}</dd>
                        </div>
                      ))}
                    </dl>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* 이 통계기법을 사용한 연구방법 */}
        {researchMethods.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <GraduationCap className="h-4 w-4" aria-hidden />
              이 통계기법을 사용한 연구방법
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {researchMethods.map((r) => (
                <Link
                  key={r.id}
                  href={`/archive/research-methods/${r.id}`}
                  className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 rounded-xl"
                >
                  <article className="h-full rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-medium leading-snug group-hover:text-primary">
                        {r.name}
                      </h3>
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0 text-[10px]",
                          RESEARCH_METHOD_KIND_COLORS[r.kind],
                        )}
                      >
                        {RESEARCH_METHOD_KIND_LABELS[r.kind]}
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
                      {r.summary}
                    </p>
                    {!r.published && canManage && (
                      <Badge
                        variant="outline"
                        className="mt-2 bg-rose-50 text-rose-700 border-rose-200 text-[10px]"
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
                    <p className="mt-1 text-xs text-muted-foreground">{t.authorName}</p>
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

        {/* 참고 자료 */}
        {method.references && method.references.length > 0 && (
          <section id="references" className="mt-10 scroll-mt-24">
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

        {/* 학술 책임 고지 */}
        <div className="mt-10 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>본 가이드는 참고용입니다. 최종 연구설계는 지도교수와 상의하시기 바랍니다.</p>
        </div>

          </div>
          <ArchiveStickyToc sections={tocSections} />
        </div>
      </div>
    </PageContainer>
  );
}
