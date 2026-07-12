"use client";

import { useEffect, useState } from "react";
import { notFound, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star, ExternalLink, BookText, Network, Tag, Pencil, GraduationCap, BookmarkPlus, BookmarkCheck, Compass, Layers, Check, ArrowRight } from "lucide-react";
import { JOURNEY_STAGES } from "@/features/research/ThesisJourney";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import {
  archiveConceptsApi,
  archiveVariablesApi,
  archiveMeasurementsApi,
  archiveFavoritesApi,
  alumniThesesApi,
  profilesApi,
  flashcardsApi,
} from "@/lib/bkend";
import {
  ARCHIVE_ITEM_TYPE_COLORS,
  ARCHIVE_ITEM_TYPE_LABELS,
  VARIABLE_TYPE_LABELS,
  type ArchiveConcept,
  type ArchiveVariable,
  type ArchiveMeasurementTool,
  type ArchiveItemType,
  type AlumniThesis,
} from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ArchiveStickyToc, { type ArchiveTocSection } from "@/components/archive/ArchiveStickyToc";
import PageContainer from "@/components/ui/page-container";
import ConceptLinkedText from "@/components/archive/ConceptLinkedText";

export default function ArchiveDetailPage() {
  const params = useParams<{ type: string; id: string }>();
  const type = params?.type as ArchiveItemType;
  const id = params?.id as string;
  const { user } = useAuthStore();

  const [item, setItem] = useState<ArchiveConcept | ArchiveVariable | ArchiveMeasurementTool | null>(null);
  const [variables, setVariables] = useState<ArchiveVariable[]>([]);
  const [measurements, setMeasurements] = useState<ArchiveMeasurementTool[]>([]);
  const [concepts, setConcepts] = useState<ArchiveConcept[]>([]);
  const [relatedTheses, setRelatedTheses] = useState<AlumniThesis[]>([]);
  const [relatedConcepts, setRelatedConcepts] = useState<ArchiveConcept[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [readingPending, setReadingPending] = useState<string | null>(null);
  // 개념 → 암기카드 저장 (개념 상세 한정). 멱등·중복 가드 + idle→saving→saved.
  const [flashcardState, setFlashcardState] = useState<"idle" | "saving" | "saved">("idle");

  const canManage = isAtLeast(user, "staff");

  if (type !== "concept" && type !== "variable" && type !== "measurement") {
    notFound();
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (type === "concept") {
          const c = await archiveConceptsApi.get(id);
          if (cancelled) return;
          setItem(c);
          let linkedVars: ArchiveVariable[] = [];
          if (c.variableIds?.length) {
            const v = await archiveVariablesApi.list();
            if (cancelled) return;
            linkedVars = v.data.filter((x) => c.variableIds!.includes(x.id));
            setVariables(linkedVars);
            // 변인의 측정도구도 함께 로드
            const measurementIds = new Set<string>();
            linkedVars.forEach((x) => x.measurementIds?.forEach((mid) => measurementIds.add(mid)));
            if (measurementIds.size > 0) {
              const m = await archiveMeasurementsApi.list();
              if (cancelled) return;
              setMeasurements(m.data.filter((x) => measurementIds.has(x.id)));
            }
          }
          // 사이클 109: 관련 개념 — 같은 변인 공유(variable.conceptIds 역참조) ∪ 같은 태그(주제) 공유
          const relIds = new Set<string>();
          linkedVars.forEach((x) =>
            x.conceptIds?.forEach((cid) => {
              if (cid !== id) relIds.add(cid);
            }),
          );
          const myTags = new Set((c.tags ?? []).filter(Boolean));
          if (relIds.size > 0 || myTags.size > 0) {
            const allC = await archiveConceptsApi.list();
            if (cancelled) return;
            setRelatedConcepts(
              allC.data.filter((x) => {
                if (x.id === id) return false;
                if (relIds.has(x.id)) return true;
                return (x.tags ?? []).some((t) => myTags.has(t));
              }),
            );
          }
        } else if (type === "variable") {
          const v = await archiveVariablesApi.get(id);
          if (cancelled) return;
          setItem(v);
          if (v.conceptIds?.length) {
            const c = await archiveConceptsApi.list();
            if (cancelled) return;
            setConcepts(c.data.filter((x) => v.conceptIds!.includes(x.id)));
          }
          if (v.measurementIds?.length) {
            const m = await archiveMeasurementsApi.list();
            if (cancelled) return;
            setMeasurements(m.data.filter((x) => v.measurementIds!.includes(x.id)));
          }
        } else {
          const m = await archiveMeasurementsApi.get(id);
          if (cancelled) return;
          setItem(m);
          if (m.variableIds?.length) {
            const v = await archiveVariablesApi.list();
            if (cancelled) return;
            const linkedV = v.data.filter((x) => m.variableIds!.includes(x.id));
            setVariables(linkedV);
            const conceptIds = new Set<string>();
            linkedV.forEach((x) => x.conceptIds?.forEach((cid) => conceptIds.add(cid)));
            if (conceptIds.size > 0) {
              const c = await archiveConceptsApi.list();
              if (cancelled) return;
              setConcepts(c.data.filter((x) => conceptIds.has(x.id)));
            }
          }
        }
      } catch (err) {
        console.error("[archive-detail] load failed", err);
        toast.error("불러오기 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [type, id]);

  useEffect(() => {
    if (!user) {
      setIsFav(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await archiveFavoritesApi.listByUser(user.id);
        if (cancelled) return;
        setIsFav(res.data.some((f) => f.itemType === type && f.itemId === id));
      } catch (err) {
        console.error("[archive-detail] favorites check failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, type, id]);

  // 관련 졸업생 논문 로드 (variableIds/measurementIds/conceptIds로 매칭)
  useEffect(() => {
    if (!id || !type) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await alumniThesesApi.list();
        if (cancelled) return;
        const key: keyof AlumniThesis =
          type === "concept" ? "conceptIds" : type === "variable" ? "variableIds" : "measurementIds";
        const matched = res.data.filter((t) => {
          const arr = (t[key] as string[] | undefined) ?? [];
          return arr.includes(id);
        });
        // 최근 졸업(학위수여년월 YYYY-MM) 순으로 정렬 — 문자열 내림차순 = 최신순
        matched.sort((a, b) =>
          (b.awardedYearMonth || "").localeCompare(a.awardedYearMonth || ""),
        );
        setRelatedTheses(matched);
      } catch (err) {
        console.error("[archive-detail] related theses load failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [type, id]);

  const handleToggleReading = async (thesisId: string) => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      return;
    }
    setReadingPending(thesisId);
    const current = user.thesisReadingList ?? [];
    const isInList = current.includes(thesisId);
    const next = isInList
      ? current.filter((x) => x !== thesisId)
      : [...current, thesisId];
    try {
      await profilesApi.update(user.id, {
        thesisReadingList: next /* QA-v3: undefined 는 strip 되어 필드가 안 지워짐 — 빈 배열로 저장 */,
      });
      const authState = useAuthStore.getState();
      if (authState.user && authState.user.id === user.id) {
        authState.setUser({
          ...authState.user,
          thesisReadingList: next /* QA-v3: undefined 는 strip 되어 필드가 안 지워짐 — 빈 배열로 저장 */,
        });
      }
      toast.success(isInList ? "읽기 리스트에서 제거" : "읽기 리스트에 추가");
    } catch (err) {
      console.error("[archive-detail] reading list toggle failed", err);
      toast.error("읽기 리스트 갱신 실패");
    } finally {
      setReadingPending(null);
    }
  };

  const handleSaveFlashcard = async () => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      return;
    }
    if (type !== "concept" || !item || flashcardState !== "idle") return;
    setFlashcardState("saving");
    try {
      await flashcardsApi.saveFromConcept(user.id, item as ArchiveConcept);
      setFlashcardState("saved");
      toast.success("암기카드에 저장했어요");
    } catch (err) {
      console.error("[archive-detail] flashcard save failed", err);
      setFlashcardState("idle");
      toast.error("암기카드 저장 실패");
    }
  };

  const handleToggleFav = async () => {
    if (!user || !item) {
      toast.error("로그인이 필요합니다");
      return;
    }
    const favId = archiveFavoritesApi.makeId(user.id, type, id);
    try {
      if (isFav) {
        await archiveFavoritesApi.delete(favId);
        setIsFav(false);
        toast.success("관심 해제");
      } else {
        await archiveFavoritesApi.upsert(favId, {
          userId: user.id,
          itemType: type,
          itemId: id,
          itemName: item.name,
        });
        setIsFav(true);
        toast.success("관심 저장");
      }
    } catch (err) {
      console.error("[archive-detail] favorite toggle failed", err);
      toast.error("관심 저장 실패");
    }
  };

  if (loading) {
    return (
      <PageContainer width="default">
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (!item) {
    return (
      <PageContainer width="default">
        <div className="py-4 text-center">
          <p className="text-muted-foreground">항목을 찾을 수 없습니다.</p>
          <Link href="/archive">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              아카이브로 돌아가기
            </Button>
          </Link>
        </div>
      </PageContainer>
    );
  }

  const tags = (item as { tags?: string[] }).tags ?? [];
  const altNames = (item as { altNames?: string[] }).altNames ?? [];
  // 순화어 — 노션 용어사전집 병기 (개념에만 존재하나 generic read 안전)
  const purifiedName = (item as { purifiedName?: string }).purifiedName?.trim();
  // AECT 공식 역어 — 『교육공학 용어해설』(학지사 2020). name 과 다를 때만 병기.
  const aectTermRaw = (item as { aectTerm?: string }).aectTerm?.trim();
  const aectTerm = aectTermRaw && aectTermRaw !== item.name ? aectTermRaw : undefined;
  // 이 항목을 추천 개념으로 포함하는 논문 여정 단계 (개념 한정)
  const journeyStagesForItem =
    type === "concept" && item.name
      ? JOURNEY_STAGES.filter((st) => st.archiveTopics?.some((t) => t.label === item.name))
      : [];
  const references = (item as { references?: string[] }).references ?? [];
  // 이론 개념의 대표 학자·원전 — 시드 시 URL 전수 검증됨 (사이클 47)
  const keyScholars = (item as { keyScholars?: string[] }).keyScholars ?? [];
  const seminalWorks =
    (item as { seminalWorks?: { citation: string; url: string | null; openAccess: boolean }[] })
      .seminalWorks ?? [];

  // 목차 섹션 — type 별 차이 반영. id 는 본문 섹션과 일치해야 함.
  // 본문 카드가 통합형이라 일부 sub-id 는 본문 카드 내부의 anchor span 으로 부여한다.
  const tocSections: ArchiveTocSection[] = (() => {
    const base: ArchiveTocSection[] = [{ id: "overview", label: "개요" }];
    if (type === "concept") {
      base.push({ id: "definition", label: "정의" });
      base.push({ id: "related-variables", label: "연결된 변인·측정도구" });
    } else if (type === "variable") {
      base.push({ id: "definition", label: "정의" });
      base.push({ id: "related-concepts", label: "연결된 개념·측정도구" });
    } else {
      base.push({ id: "items", label: "문항 예시" });
      if ((item as ArchiveMeasurementTool).scaleType) base.push({ id: "scale", label: "척도" });
      if ((item as ArchiveMeasurementTool).reliability)
        base.push({ id: "reliability", label: "신뢰도" });
      if ((item as ArchiveMeasurementTool).validity)
        base.push({ id: "validity", label: "타당도" });
      base.push({ id: "measurements", label: "연결된 변인·개념" });
    }
    base.push({ id: "related-theses", label: "관련 졸업생 논문" });
    if (keyScholars.length > 0 || seminalWorks.length > 0)
      base.push({ id: "seminal-works", label: "대표 학자·원전" });
    if (references.length > 0) base.push({ id: "references", label: "참고문헌" });
    return base;
  })();

  return (
    <PageContainer width="default">
      {/* Back */}
      <Link href="/archive">
        <Button variant="ghost" size="sm" className="mb-3">
          <ArrowLeft className="mr-1 h-4 w-4" />
          아카이브
        </Button>
      </Link>

      <div className="lg:grid lg:grid-cols-[1fr_200px] lg:gap-6">
        <div className="min-w-0 lg:max-w-4xl">

      {/* Header */}
      <Card id="overview" className="border-l-4 scroll-mt-24" style={{
        borderLeftColor:
          type === "concept" ? "rgb(167 139 250)" :
          type === "variable" ? "rgb(96 165 250)" : "rgb(52 211 153)",
      }}>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <Badge variant="outline" className={cn("mb-2", ARCHIVE_ITEM_TYPE_COLORS[type])}>
                {ARCHIVE_ITEM_TYPE_LABELS[type]}
              </Badge>
              <CardTitle className="text-2xl">{item.name}</CardTitle>
              {(purifiedName || aectTerm) && (
                <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {purifiedName && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-800 dark:border-teal-400/30 dark:bg-teal-950/30 dark:text-teal-300">
                      순화어 · {purifiedName}
                    </span>
                  )}
                  {aectTerm && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-800 dark:border-indigo-400/30 dark:bg-indigo-950/30 dark:text-indigo-300">
                      AECT · {aectTerm}
                    </span>
                  )}
                </p>
              )}
              {altNames.length > 0 && (
                <p className="mt-1 text-sm text-muted-foreground italic">
                  {altNames.join(" · ")}
                </p>
              )}
              {/* 논문 여정 역링크 — 이 개념을 추천하는 여정 단계 */}
              {type === "concept" && journeyStagesForItem.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {journeyStagesForItem.map((st) => (
                    <Link
                      key={st.stage}
                      href="/mypage/research"
                      className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[11px] text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                    >
                      <Compass size={11} />
                      논문 여정 {st.semesterLabel} · {st.title} 추천 개념
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {canManage && (
                <Link href={`/archive/${type}/${id}/edit`}>
                  <Button variant="outline" size="sm">
                    <Pencil className="mr-1 h-4 w-4" />
                    수정
                  </Button>
                </Link>
              )}
              {type === "concept" && (
                <Button
                  variant={flashcardState === "saved" ? "default" : "outline"}
                  size="sm"
                  onClick={handleSaveFlashcard}
                  disabled={!user || flashcardState !== "idle"}
                  title={!user ? "로그인 후 저장할 수 있어요" : undefined}
                  className={cn(
                    flashcardState === "saved" &&
                      "border-violet-500 bg-violet-600 hover:bg-violet-700",
                  )}
                >
                  {flashcardState === "saved" ? (
                    <Check className="mr-1 h-4 w-4" />
                  ) : (
                    <Layers className="mr-1 h-4 w-4" />
                  )}
                  {flashcardState === "saving"
                    ? "저장 중…"
                    : flashcardState === "saved"
                      ? "저장됨"
                      : "암기카드로 저장"}
                </Button>
              )}
              {user && (
                <Button
                  variant={isFav ? "default" : "outline"}
                  size="sm"
                  onClick={handleToggleFav}
                  className={cn(isFav && "bg-amber-500 hover:bg-amber-600 border-amber-500")}
                >
                  <Star className={cn("mr-1 h-4 w-4", isFav && "fill-current")} />
                  {isFav ? "관심 저장됨" : "관심 저장"}
                </Button>
              )}
            </div>
          </div>
          {type === "concept" && flashcardState === "saved" && (
            <Link
              href="/flashcards"
              className="mt-2 inline-flex w-fit items-center gap-1 text-sm font-medium text-violet-700 hover:underline dark:text-violet-300"
            >
              암기카드 학습하기
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {item.description && (
            <>
              <span id="definition" className="block scroll-mt-24" aria-hidden />
              <p className="max-w-[65ch] text-base text-foreground whitespace-pre-wrap leading-relaxed">
                <ConceptLinkedText
                  text={item.description}
                  excludeConceptId={type === "concept" ? id : undefined}
                />
              </p>
            </>
          )}

          {/* type별 메타 */}
          {type === "variable" && (item as ArchiveVariable).type && (
            <div className="text-sm">
              <span className="font-medium">유형:</span>{" "}
              <Badge variant="outline">
                {VARIABLE_TYPE_LABELS[(item as ArchiveVariable).type!]}
              </Badge>
            </div>
          )}

          {type === "measurement" && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              {(item as ArchiveMeasurementTool).originalName && (
                <div>
                  <span className="text-muted-foreground">원어명: </span>
                  <span className="italic">{(item as ArchiveMeasurementTool).originalName}</span>
                </div>
              )}
              {(item as ArchiveMeasurementTool).author && (
                <div>
                  <span className="text-muted-foreground">저자: </span>
                  {(item as ArchiveMeasurementTool).author}
                </div>
              )}
              {(item as ArchiveMeasurementTool).itemCount && (
                <div>
                  <span className="text-muted-foreground">문항 수: </span>
                  {(item as ArchiveMeasurementTool).itemCount}
                </div>
              )}
              {(item as ArchiveMeasurementTool).scaleType && (
                <div id="scale" className="scroll-mt-24">
                  <span className="text-muted-foreground">척도: </span>
                  {(item as ArchiveMeasurementTool).scaleType}
                </div>
              )}
              {(item as ArchiveMeasurementTool).reliability && (
                <div id="reliability" className="col-span-2 scroll-mt-24">
                  <span className="text-muted-foreground">신뢰도: </span>
                  {(item as ArchiveMeasurementTool).reliability}
                </div>
              )}
              {(item as ArchiveMeasurementTool).validity && (
                <div id="validity" className="col-span-2 scroll-mt-24">
                  <span className="text-muted-foreground">타당도: </span>
                  {(item as ArchiveMeasurementTool).validity}
                </div>
              )}
            </div>
          )}

          {type === "measurement" && ((item as ArchiveMeasurementTool).sampleItems?.length ?? 0) > 0 && (
            <div id="items" className="scroll-mt-24">
              <p className="font-medium text-sm mb-1">문항 예시</p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                {(item as ArchiveMeasurementTool).sampleItems!.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((t) => (
                <Badge key={t} variant="outline" className="text-[10px]">
                  <Tag className="mr-0.5 h-2.5 w-2.5" />
                  {t}
                </Badge>
              ))}
            </div>
          )}

          {(type === "measurement" && (item as ArchiveMeasurementTool).resourceUrl) && (
            <a
              href={(item as ArchiveMeasurementTool).resourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              외부 자료
            </a>
          )}

          {(keyScholars.length > 0 || seminalWorks.length > 0) && (
            <div id="seminal-works" className="scroll-mt-24">
              <p className="font-medium text-sm mb-1.5 flex items-center gap-1">
                <GraduationCap className="h-3.5 w-3.5" />
                대표 학자·원전
              </p>
              {keyScholars.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {keyScholars.map((sch) => (
                    <span
                      key={sch}
                      className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:border-indigo-400/30 dark:bg-indigo-950/30 dark:text-indigo-300"
                    >
                      {sch}
                    </span>
                  ))}
                </div>
              )}
              {seminalWorks.length > 0 && (
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {seminalWorks.map((w, i) => (
                    <li key={i} className="flex flex-wrap items-baseline gap-x-1.5">
                      <span>{w.citation}</span>
                      {w.url && (
                        <a
                          href={w.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-0.5 whitespace-nowrap text-blue-600 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {w.openAccess ? "원문 보기" : "출판사 링크"}
                        </a>
                      )}
                      {w.openAccess && (
                        <span className="inline-flex items-center rounded bg-emerald-100 px-1 py-px text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          무료 공개
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {references.length > 0 && (
            <div id="references" className="scroll-mt-24">
              <p className="font-medium text-sm mb-1 flex items-center gap-1">
                <BookText className="h-3.5 w-3.5" />
                참고문헌
              </p>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {references.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 연결 트리 */}
      <Card
        id={
          type === "concept"
            ? "related-variables"
            : type === "variable"
            ? "related-concepts"
            : "measurements"
        }
        className="mt-6 scroll-mt-24"
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Network className="h-4 w-4 text-muted-foreground" />
            연결 관계
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {concepts.length > 0 && (
            <RelationGroup
              type="concept"
              label="연결된 개념"
              items={concepts.map((c) => ({ id: c.id, name: c.name }))}
            />
          )}
          {variables.length > 0 && (
            <RelationGroup
              type="variable"
              label="연결된 변인"
              items={variables.map((v) => ({
                id: v.id,
                name: v.name,
                meta: v.type ? VARIABLE_TYPE_LABELS[v.type] : undefined,
              }))}
            />
          )}
          {measurements.length > 0 && (
            <RelationGroup
              type="measurement"
              label="연결된 측정도구"
              items={measurements.map((m) => ({
                id: m.id,
                name: m.name,
                meta: m.author,
              }))}
            />
          )}
          {concepts.length === 0 && variables.length === 0 && measurements.length === 0 && (
            <p className="text-sm text-muted-foreground">아직 연결된 항목이 없습니다.</p>
          )}
        </CardContent>
      </Card>

      {/* 사이클 107: 관련 개념 — 같은 변인을 공유하는 개념 (개념 상세 한정) */}
      {type === "concept" && relatedConcepts.length > 0 && (
        <Card className="mt-6 scroll-mt-24">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Network className="h-4 w-4 text-muted-foreground" />
              관련 개념
              <span className="text-xs font-normal text-muted-foreground">
                · 같은 변인·주제 공유
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              이 개념과 같은 변인 또는 주제(태그)로 연결되는 개념입니다. 함께 살펴보면 개념 간 관계를 이해하는 데 도움이 됩니다.
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {relatedConcepts.slice(0, 18).map((c) => (
                <Link key={c.id} href={`/archive/concept/${c.id}`}>
                  <Badge
                    variant="outline"
                    className={cn(
                      "cursor-pointer transition-shadow hover:shadow-sm",
                      ARCHIVE_ITEM_TYPE_COLORS.concept,
                    )}
                  >
                    {c.name}
                  </Badge>
                </Link>
              ))}
              {relatedConcepts.length > 18 && (
                <span className="text-xs text-muted-foreground">
                  외 {relatedConcepts.length - 18}개
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 관련 졸업생 논문 */}
      <Card id="related-theses" className="mt-6 scroll-mt-24">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
            이 {ARCHIVE_ITEM_TYPE_LABELS[type]}을(를) 활용한 졸업생 논문
            {relatedTheses.length > 0 && (
              <span className="text-xs text-muted-foreground font-normal">
                · {relatedTheses.length}편
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {relatedTheses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              아직 이 {ARCHIVE_ITEM_TYPE_LABELS[type]}과(와) 연결된 졸업생 논문이 없습니다.
            </p>
          ) : (
            <ul className="space-y-2">
              {relatedTheses.map((t) => {
                const inList = !!user?.thesisReadingList?.includes(t.id);
                return (
                  <li
                    key={t.id}
                    className="flex items-start justify-between gap-3 rounded-md border p-3 hover:bg-muted/40 transition-colors"
                  >
                    <Link href={`/alumni/thesis/${t.id}`} className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground line-clamp-2 hover:underline">
                        {t.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {[t.authorName, t.awardedYearMonth, t.graduationType]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {t.keywords && t.keywords.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {t.keywords.slice(0, 5).map((k) => (
                            <Badge
                              key={k}
                              variant="outline"
                              className="text-[10px] font-normal"
                            >
                              {k}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </Link>
                    {user && (
                      <Button
                        type="button"
                        size="sm"
                        variant={inList ? "default" : "outline"}
                        disabled={readingPending === t.id}
                        onClick={() => handleToggleReading(t.id)}
                        className={cn(
                          "shrink-0",
                          inList && "bg-emerald-600 hover:bg-emerald-700 border-emerald-600",
                        )}
                      >
                        {inList ? (
                          <BookmarkCheck className="mr-1 h-4 w-4" />
                        ) : (
                          <BookmarkPlus className="mr-1 h-4 w-4" />
                        )}
                        {inList ? "저장됨" : "읽기 리스트"}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

        </div>
        <ArchiveStickyToc sections={tocSections} />
      </div>

    </PageContainer>
  );
}

function RelationGroup({
  type,
  label,
  items,
}: {
  type: ArchiveItemType;
  label: string;
  items: { id: string; name: string; meta?: string }[];
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => (
          <Link key={it.id} href={`/archive/${type}/${it.id}`}>
            <Badge
              variant="outline"
              className={cn(
                "cursor-pointer transition-shadow hover:shadow-sm",
                ARCHIVE_ITEM_TYPE_COLORS[type],
              )}
            >
              {it.name}
              {it.meta && <span className="ml-1 opacity-70">· {it.meta}</span>}
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}
