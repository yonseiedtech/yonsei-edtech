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
  PenLine,
  XCircle,
  CheckCircle2,
  Info,
  Tag,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/page-header";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { writingTipsApi, archiveFavoritesApi } from "@/lib/bkend";
import {
  WRITING_TIP_CATEGORY_COLORS,
  WRITING_TIP_CATEGORY_LABELS,
  type WritingTip,
} from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ArchiveStickyToc, { type ArchiveTocSection } from "@/components/archive/ArchiveStickyToc";

export default function WritingTipDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const canManage = isAtLeast(user, "staff");

  const [tip, setTip] = useState<WritingTip | null>(null);
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
        const t = await writingTipsApi.get(params.id);
        if (cancelled) return;
        setTip(t);
        // 검수 게이트 3중 — 비-staff 인데 draft 인 경우 차단
        if (!t.published && !canManage) {
          setError("비공개 항목입니다.");
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
    if (!tip || !canManage) return;
    const next = !tip.published;
    try {
      await writingTipsApi.update(tip.id, { published: next });
      setTip({ ...tip, published: next });
      toast.success(next ? "공개로 전환했습니다." : "비공개(draft) 로 전환했습니다.");
    } catch (err) {
      console.error("[writing-tip-detail] toggle publish failed", err);
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
            (f) => f.itemType === "writing-tip" && f.itemId === params.id,
          ),
        );
      } catch (err) {
        console.error("[writing-tip-detail] favorites check failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, params?.id]);

  async function handleToggleFav() {
    if (!user || !tip) {
      toast.error("로그인이 필요합니다");
      return;
    }
    setFavPending(true);
    const favId = archiveFavoritesApi.makeId(user.id, "writing-tip", tip.id);
    try {
      if (isFav) {
        await archiveFavoritesApi.delete(favId);
        setIsFav(false);
        toast.success("관심 해제");
      } else {
        await archiveFavoritesApi.upsert(favId, {
          userId: user.id,
          itemType: "writing-tip",
          itemId: tip.id,
          itemName: tip.title,
        });
        setIsFav(true);
        toast.success("관심 저장");
      }
    } catch (err) {
      console.error("[writing-tip-detail] favorite toggle failed", err);
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

  if (error || !tip) {
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

  // ToC 섹션 — 본문 실제 렌더 항목만 포함
  const hasRelatedTips =
    (tip.tags && tip.tags.length > 0) ||
    (tip.additionalExamples && tip.additionalExamples.length > 0);

  const tocSections: ArchiveTocSection[] = [
    { id: "overview", label: "개요" },
    { id: "wrong-correct-examples", label: "❌↔✅ 대비" },
    ...(tip.accessibleSummary && tip.accessibleSummary.trim() !== ""
      ? [{ id: "summary", label: "쉽게 이해하기" }]
      : []),
    ...(hasRelatedTips ? [{ id: "related-tips", label: "태그·추가 예시" }] : []),
    ...(tip.references && tip.references.length > 0
      ? [{ id: "references", label: "참고 자료" }]
      : []),
  ];

  return (
    <div className="py-10">
      <div className="mx-auto max-w-6xl px-4">
        <Link
          href="/archive/writing-tips"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3 w-3" /> 학술 글쓰기 가이드 목록
        </Link>

        <div className="lg:grid lg:grid-cols-[1fr_200px] lg:gap-6">
          <div className="min-w-0 lg:max-w-4xl">

        <div id="overview" className="mt-3 flex flex-wrap items-start justify-between gap-3 scroll-mt-24">
          <div className="min-w-0 flex-1">
            <PageHeader icon={PenLine} title={tip.title} />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn("text-xs", WRITING_TIP_CATEGORY_COLORS[tip.category])}
              >
                {WRITING_TIP_CATEGORY_LABELS[tip.category]}
              </Badge>
              {!tip.published && (
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
            {canManage && (
              <>
                <Button variant="outline" size="sm" onClick={togglePublish}>
                  {tip.published ? (
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
                <Link href={`/console/archive/writing-tips/${tip.id}/edit`}>
                  <Button size="sm">
                    <Pencil className="mr-1 h-4 w-4" />
                    편집
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* ❌ 잘못된 예 ↔ ✅ 권장 예 대비 카드 */}
        <section id="wrong-correct-examples" className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2 scroll-mt-24">
          <article className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900 dark:bg-rose-950/30">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-rose-800 dark:text-rose-200">
              <XCircle className="h-4 w-4" aria-hidden />
              ❌ 잘못된 예
            </h3>
            <p className="whitespace-pre-wrap font-serif text-sm italic leading-relaxed text-rose-900 dark:text-rose-100">
              “{tip.wrongExample}”
            </p>
          </article>
          <article className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              ✅ 권장 예
            </h3>
            <p className="whitespace-pre-wrap font-serif text-sm italic leading-relaxed text-emerald-900 dark:text-emerald-100">
              “{tip.correctExample}”
            </p>
          </article>
        </section>

        {/* 💡 쉽게 이해하기 (한 줄 비유·요점) */}
        {tip.accessibleSummary && tip.accessibleSummary.trim() !== "" && (
          <section id="summary" className="mt-6 scroll-mt-24">
            <div
              className="rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50 to-emerald-50 p-4 dark:border-sky-900 dark:from-sky-950/30 dark:to-emerald-950/30"
              aria-label="쉽게 이해하기"
            >
              <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-sky-900 dark:text-sky-200">
                <Lightbulb className="h-4 w-4" aria-hidden />
                💡 쉽게 이해하기
              </h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                {tip.accessibleSummary}
              </p>
            </div>
          </section>
        )}

        {/* 설명 */}
        {tip.explanation && (
          <section className="mt-8">
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
              <Info className="h-4 w-4" aria-hidden />
              왜 이렇게 쓰면 좋은가
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {tip.explanation}
            </p>
          </section>
        )}

        {hasRelatedTips && <div id="related-tips" className="scroll-mt-24" aria-hidden />}

        {/* 태그 */}
        {tip.tags && tip.tags.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
              <Tag className="h-4 w-4" aria-hidden />
              태그
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {tip.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          </section>
        )}

        {/* 추가 예시 */}
        {tip.additionalExamples && tip.additionalExamples.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">추가 예시</h2>
            <ul className="space-y-2">
              {tip.additionalExamples.map((ex) => (
                <li
                  key={ex.id}
                  className="rounded-md border-l-4 border-blue-300 bg-blue-50/40 px-3 py-2 text-sm leading-relaxed text-foreground/85 dark:border-blue-700 dark:bg-blue-950/20"
                >
                  {ex.text}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 참고 자료 */}
        {tip.references && tip.references.length > 0 && (
          <section id="references" className="mt-10 scroll-mt-24">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <BookOpen className="h-4 w-4" aria-hidden />
              참고 자료
            </h2>
            <ul className="space-y-1.5 text-sm">
              {tip.references.map((r) => (
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
            본 가이드는 참고용입니다. 최종 표기·문체·인용 형식은 지도교수와 해당 학술지
            지침을 우선 상의·확인하시기 바랍니다.
          </p>
        </div>

          </div>
          <ArchiveStickyToc sections={tocSections} />
        </div>
      </div>
    </div>
  );
}
