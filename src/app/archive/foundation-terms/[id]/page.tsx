"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertTriangle,
  BookOpen,
  ExternalLink,
  Pencil,
  Eye,
  EyeOff,
  Lightbulb,
  Sparkles,
  Split,
  Link2,
  PenLine,
  Star,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/page-header";
import ConceptLinkedText from "@/components/archive/ConceptLinkedText";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import {
  foundationTermsApi,
  archiveConceptsApi,
  researchMethodsApi,
  statisticalMethodsApi,
  archiveFavoritesApi,
  flashcardsApi,
} from "@/lib/bkend";
import {
  FOUNDATION_TERM_CATEGORY_COLORS,
  FOUNDATION_TERM_CATEGORY_LABELS,
  type FoundationTerm,
  type ArchiveConcept,
  type ResearchMethod,
  type StatisticalMethod,
} from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ArchiveStickyToc, { type ArchiveTocSection } from "@/components/archive/ArchiveStickyToc";
import PageContainer from "@/components/ui/page-container";

export default function FoundationTermDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const canManage = isAtLeast(user, "staff");

  const [term, setTerm] = useState<FoundationTerm | null>(null);
  const [relatedTerms, setRelatedTerms] = useState<FoundationTerm[]>([]);
  const [relatedConcepts, setRelatedConcepts] = useState<ArchiveConcept[]>([]);
  const [relatedResearchMethods, setRelatedResearchMethods] = useState<
    ResearchMethod[]
  >([]);
  const [relatedStatisticalMethods, setRelatedStatisticalMethods] = useState<
    StatisticalMethod[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFav, setIsFav] = useState(false);
  const [favPending, setFavPending] = useState(false);
  const [cardPending, setCardPending] = useState(false);
  const [cardSaved, setCardSaved] = useState(false);

  useEffect(() => {
    if (!params?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const t = await foundationTermsApi.get(params.id);
        if (cancelled) return;
        setTerm(t);
        // 비-staff 인데 draft 인 경우 — rules 가 차단하지만 방어적으로 한 번 더 가드
        if (!t.published && !canManage) {
          setError("비공개 항목입니다.");
          return;
        }

        // 관련 용어 (같은 컬렉션 내)
        const termIds = t.relatedTermIds ?? [];
        if (termIds.length > 0) {
          const results = await Promise.allSettled(
            termIds.map((id) => foundationTermsApi.get(id)),
          );
          if (cancelled) return;
          const ok: FoundationTerm[] = [];
          for (const r of results) {
            // 검수 게이트 3중 적용 — 비-staff 에게 draft 노출 차단
            if (r.status === "fulfilled" && (canManage || r.value.published)) {
              ok.push(r.value);
            }
          }
          setRelatedTerms(ok);
        }

        // 외부 archive_concepts 단방향 chip
        const conceptIds = t.relatedConceptIds ?? [];
        if (conceptIds.length > 0) {
          const results = await Promise.allSettled(
            conceptIds.map((id) => archiveConceptsApi.get(id)),
          );
          if (cancelled) return;
          const ok: ArchiveConcept[] = [];
          for (const r of results) {
            if (r.status === "fulfilled") ok.push(r.value);
          }
          setRelatedConcepts(ok);
        }

        const rmIds = t.relatedResearchMethodIds ?? [];
        if (rmIds.length > 0) {
          const results = await Promise.allSettled(
            rmIds.map((id) => researchMethodsApi.get(id)),
          );
          if (cancelled) return;
          const ok: ResearchMethod[] = [];
          for (const r of results) {
            if (r.status === "fulfilled" && (canManage || r.value.published)) {
              ok.push(r.value);
            }
          }
          setRelatedResearchMethods(ok);
        }

        const smIds = t.relatedStatisticalMethodIds ?? [];
        if (smIds.length > 0) {
          const results = await Promise.allSettled(
            smIds.map((id) => statisticalMethodsApi.get(id)),
          );
          if (cancelled) return;
          const ok: StatisticalMethod[] = [];
          for (const r of results) {
            if (r.status === "fulfilled" && (canManage || r.value.published)) {
              ok.push(r.value);
            }
          }
          setRelatedStatisticalMethods(ok);
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
    if (!term || !canManage) return;
    const next = !term.published;
    try {
      await foundationTermsApi.update(term.id, { published: next });
      setTerm({ ...term, published: next });
      toast.success(next ? "공개로 전환했습니다." : "비공개(draft) 로 전환했습니다.");
    } catch (err) {
      console.error("[foundation-term-detail] toggle publish failed", err);
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
            (f) => f.itemType === "foundation-term" && f.itemId === params.id,
          ),
        );
      } catch (err) {
        console.error("[foundation-term-detail] favorites check failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, params?.id]);

  async function handleToggleFav() {
    if (!user || !term) {
      toast.error("로그인이 필요합니다");
      return;
    }
    setFavPending(true);
    const favId = archiveFavoritesApi.makeId(user.id, "foundation-term", term.id);
    try {
      if (isFav) {
        await archiveFavoritesApi.delete(favId);
        setIsFav(false);
        toast.success("관심 해제");
      } else {
        await archiveFavoritesApi.upsert(favId, {
          userId: user.id,
          itemType: "foundation-term",
          itemId: term.id,
          itemName: term.term,
        });
        setIsFav(true);
        toast.success("관심 저장");
      }
    } catch (err) {
      console.error("[foundation-term-detail] favorite toggle failed", err);
      toast.error("관심 저장 실패");
    } finally {
      setFavPending(false);
    }
  }

  // Phase 4-A: 기초 용어 → 암기카드 저장 (멱등 — 재저장 시 복습 진척 보존)
  async function handleSaveFlashcard() {
    if (!user || !term || cardPending) return;
    setCardPending(true);
    try {
      await flashcardsApi.saveFromFoundationTerm(user.id, {
        id: term.id,
        term: term.term,
        englishName: term.englishName,
        summary: term.summary,
        accessibleSummary: term.accessibleSummary,
      });
      setCardSaved(true);
      toast.success("암기카드에 저장했습니다. /flashcards 에서 복습하세요!");
    } catch (err) {
      console.error("[foundation-term-detail] flashcard save failed", err);
      toast.error("암기카드 저장 실패");
    } finally {
      setCardPending(false);
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

  if (error || !term) {
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

  // ToC 섹션 — 본문에 실제 렌더되는 항목만 포함
  const hasRelatedChips =
    relatedTerms.length > 0 ||
    relatedConcepts.length > 0 ||
    relatedResearchMethods.length > 0 ||
    relatedStatisticalMethods.length > 0;

  const tocSections: ArchiveTocSection[] = [
    { id: "overview", label: "개요" },
    ...(term.accessibleSummary && term.accessibleSummary.trim() !== ""
      ? [{ id: "accessibleSummary", label: "쉽게 이해하기" }]
      : []),
    ...(term.definition ? [{ id: "definition", label: "정의" }] : []),
    ...(term.examples && term.examples.length > 0
      ? [{ id: "research-sentences", label: "연구 문장 예시" }]
      : []),
    ...(term.confusedWith && term.confusedWith.length > 0
      ? [{ id: "confused-with", label: "비슷한 용어" }]
      : []),
    ...(hasRelatedChips ? [{ id: "examples", label: "관련 항목" }] : []),
    ...(term.references && term.references.length > 0
      ? [{ id: "references", label: "참고 자료" }]
      : []),
  ];

  return (
    <PageContainer width="default">
      <div>
        <Link
          href="/archive/foundation-terms"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3 w-3" /> 기초 용어 가이드 목록
        </Link>

        <div className="lg:grid lg:grid-cols-[1fr_200px] lg:gap-6">
          <div className="min-w-0 lg:max-w-4xl">

        <div id="overview" className="mt-3 flex flex-wrap items-start justify-between gap-3 scroll-mt-24">
          <div className="min-w-0 flex-1">
            <PageHeader
              icon={BookOpen}
              title={
                term.abbreviation
                  ? `${term.term} (${term.abbreviation})`
                  : term.term
              }
              description={term.summary}
            />
            {term.englishName && (
              <p className="mt-1 text-sm text-muted-foreground">{term.englishName}</p>
            )}
            {term.purifiedName?.trim() && (
              <p className="mt-1.5">
                <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-800 dark:border-teal-400/30 dark:bg-teal-950/30 dark:text-teal-300">
                  순화어 · {term.purifiedName.trim()}
                </span>
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  FOUNDATION_TERM_CATEGORY_COLORS[term.category],
                )}
              >
                {FOUNDATION_TERM_CATEGORY_LABELS[term.category]}
              </Badge>
              {!term.published && (
                <Badge
                  variant="outline"
                  className="bg-rose-50 text-rose-700 border-rose-200 text-xs"
                >
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
                  isFav && "bg-amber-500 hover:bg-amber-600 border-amber-500",
                )}
                aria-pressed={isFav}
              >
                <Star className={cn("mr-1 h-4 w-4", isFav && "fill-current")} />
                {isFav ? "관심 저장됨" : "관심 저장"}
              </Button>
            )}
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveFlashcard}
                disabled={cardPending}
                title="용어·요약을 암기카드로 저장해 간격 반복으로 복습"
              >
                <Layers className="mr-1 h-4 w-4" />
                {cardSaved ? "암기카드 저장됨" : "암기카드에 저장"}
              </Button>
            )}
            {canManage && (
              <>
                <Button variant="outline" size="sm" onClick={togglePublish}>
                  {term.published ? (
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
                <Link href={`/console/archive/foundation-terms/${term.id}/edit`}>
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
        {term.accessibleSummary && term.accessibleSummary.trim() !== "" && (
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
                <ConceptLinkedText text={term.accessibleSummary ?? ""} />
              </p>
            </div>
          </section>
        )}

        {/* 정의 */}
        {term.definition && (
          <section id="definition" className="mt-8 scroll-mt-24">
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">정의</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              <ConceptLinkedText text={term.definition ?? ""} />
            </p>
          </section>
        )}

        {/* 어원·유래 */}
        {term.etymology && (
          <section className="mt-8">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Sparkles className="h-4 w-4" aria-hidden />
              어원·유래
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
              {term.etymology}
            </p>
          </section>
        )}

        {/* 연구 문장 예시 — "📝 연구에서는 이렇게 쓰입니다" */}
        {term.examples && term.examples.length > 0 && (
          <section id="research-sentences" className="mt-8 scroll-mt-24">
            <div
              className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-slate-50 p-4 dark:border-blue-900 dark:from-blue-950/30 dark:to-slate-900/40"
              aria-label="연구에서는 이렇게 쓰입니다"
            >
              <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-blue-900 dark:text-blue-200">
                <PenLine className="h-4 w-4" aria-hidden />
                📝 연구에서는 이렇게 쓰입니다
              </h3>
              <ul className="space-y-2">
                {term.examples.map((ex) => (
                  <li
                    key={ex.id}
                    className="rounded-md border-l-4 border-blue-300 bg-white/70 px-3 py-2 font-serif text-sm italic leading-relaxed text-slate-700 dark:border-blue-700 dark:bg-slate-900/40 dark:text-slate-200"
                  >
                    “{ex.text}”
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* "비슷하지만 다른" 용어 페어 */}
        {term.confusedWith && term.confusedWith.length > 0 && (
          <section id="confused-with" className="mt-10 scroll-mt-24">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-rose-800 dark:text-rose-200">
              <Split className="h-4 w-4" aria-hidden />
              비슷하지만 다른 용어
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {term.confusedWith.map((c) => {
                const inner = (
                  <article className="h-full rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50 to-amber-50 p-4 dark:border-rose-900 dark:from-rose-950/30 dark:to-amber-950/30">
                    <div className="flex items-start gap-2">
                      <AlertTriangle
                        className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-300"
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-rose-900 dark:text-rose-100">
                          {c.confusedTermLabel ?? "(연결된 용어)"}
                        </p>
                        <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-foreground/85">
                          {c.distinction}
                        </p>
                      </div>
                    </div>
                  </article>
                );
                return c.confusedTermId ? (
                  <Link
                    key={c.id}
                    href={`/archive/foundation-terms/${c.confusedTermId}`}
                    className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 rounded-xl"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div key={c.id}>{inner}</div>
                );
              })}
            </div>
          </section>
        )}

        {hasRelatedChips && <div id="examples" className="scroll-mt-24" aria-hidden />}

        {/* 관련 용어 */}
        {relatedTerms.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Link2 className="h-4 w-4" aria-hidden />
              관련 용어
            </h2>
            <div className="flex flex-wrap gap-2">
              {relatedTerms.map((rt) => (
                <Link
                  key={rt.id}
                  href={`/archive/foundation-terms/${rt.id}`}
                  className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
                >
                  <Badge
                    variant="outline"
                    className={cn(
                      "cursor-pointer hover:shadow-sm",
                      FOUNDATION_TERM_CATEGORY_COLORS[rt.category],
                    )}
                  >
                    {rt.term}
                  </Badge>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 관련 개념 (외부 archive_concepts 단방향 chip) */}
        {relatedConcepts.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
              관련 개념
            </h2>
            <div className="flex flex-wrap gap-2">
              {relatedConcepts.map((c) => (
                <Link
                  key={c.id}
                  href={`/archive/concept/${c.id}`}
                  className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
                >
                  <Badge
                    variant="outline"
                    className="cursor-pointer bg-violet-50 text-violet-800 border-violet-200 hover:shadow-sm dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800"
                  >
                    {c.name}
                  </Badge>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 관련 연구방법 */}
        {relatedResearchMethods.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
              관련 연구방법
            </h2>
            <div className="flex flex-wrap gap-2">
              {relatedResearchMethods.map((rm) => (
                <Link
                  key={rm.id}
                  href={`/archive/research-methods/${rm.id}`}
                  className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
                >
                  <Badge
                    variant="outline"
                    className="cursor-pointer bg-sky-50 text-sky-800 border-sky-200 hover:shadow-sm dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800"
                  >
                    {rm.name}
                  </Badge>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 관련 통계방법 */}
        {relatedStatisticalMethods.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
              관련 통계방법
            </h2>
            <div className="flex flex-wrap gap-2">
              {relatedStatisticalMethods.map((sm) => (
                <Link
                  key={sm.id}
                  href={`/archive/statistical-methods/${sm.id}`}
                  className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
                >
                  <Badge
                    variant="outline"
                    className="cursor-pointer bg-indigo-50 text-indigo-800 border-indigo-200 hover:shadow-sm dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800"
                  >
                    {sm.name}
                  </Badge>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 참고 자료 */}
        {term.references && term.references.length > 0 && (
          <section id="references" className="mt-10 scroll-mt-24">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <BookOpen className="h-4 w-4" aria-hidden />
              참고 자료
            </h2>
            <ul className="space-y-1.5 text-sm">
              {term.references.map((r) => (
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
          <p>
            본 가이드는 참고용입니다. 최종 학술 정의·연구설계는 지도교수와 상의하시기
            바랍니다.
          </p>
        </div>

          </div>
          <ArchiveStickyToc sections={tocSections} />
        </div>
      </div>
    </PageContainer>
  );
}
