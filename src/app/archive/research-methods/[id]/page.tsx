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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/page-header";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { researchMethodsApi, alumniThesesApi } from "@/lib/bkend";
import {
  RESEARCH_METHOD_KIND_COLORS,
  RESEARCH_METHOD_KIND_LABELS,
  RESEARCH_METHOD_TOOL_LABELS,
  type ResearchMethod,
  type AlumniThesis,
} from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ResearchMethodDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const canManage = isAtLeast(user, "staff");

  const [method, setMethod] = useState<ResearchMethod | null>(null);
  const [theses, setTheses] = useState<AlumniThesis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      await researchMethodsApi.update(method.id, { published: next });
      setMethod({ ...method, published: next });
      toast.success(next ? "공개로 전환했습니다." : "비공개(draft) 로 전환했습니다.");
    } catch (err) {
      console.error("[research-method-detail] toggle publish failed", err);
      toast.error("공개 상태 변경 실패");
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

  return (
    <div className="py-10">
      <div className="mx-auto max-w-4xl px-4">
        <Link
          href="/archive/research-methods"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3 w-3" /> 연구방법 가이드 목록
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <PageHeader
              icon={GraduationCap}
              title={method.name}
              description={method.summary}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn("text-xs", RESEARCH_METHOD_KIND_COLORS[method.kind])}
              >
                {RESEARCH_METHOD_KIND_LABELS[method.kind]} 연구
              </Badge>
              {!method.published && (
                <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-xs">
                  비공개 (draft)
                </Badge>
              )}
            </div>
          </div>
          {canManage && (
            <div className="flex flex-wrap items-center gap-2">
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
            </div>
          )}
        </div>

        {/* 상세 설명 */}
        {method.description && (
          <section className="mt-8">
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">개요</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {method.description}
            </p>
          </section>
        )}

        {/* 교육공학 활용 예 */}
        {method.educationalTechExamples && method.educationalTechExamples.length > 0 && (
          <section className="mt-8">
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
          <section className="mt-8">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <ListOrdered className="h-4 w-4" aria-hidden />
              연구 절차
            </h2>
            <ol className="space-y-2">
              {method.procedures.map((p, i) => (
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

        {/* 강점·약점 */}
        {((method.strengths && method.strengths.length > 0) ||
          (method.limitations && method.limitations.length > 0)) && (
          <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            {method.strengths && method.strengths.length > 0 && (
              <Card className="rounded-xl border-l-4 border-l-emerald-400">
                <CardContent className="py-4">
                  <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
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
              <Card className="rounded-xl border-l-4 border-l-rose-400">
                <CardContent className="py-4">
                  <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-rose-800 dark:text-rose-300">
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
          <section className="mt-8">
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

        {/* 학술 책임 고지 */}
        <div className="mt-10 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            본 가이드는 참고용입니다. 최종 연구설계는 지도교수와 상의하시기 바랍니다.
          </p>
        </div>
      </div>
    </div>
  );
}
