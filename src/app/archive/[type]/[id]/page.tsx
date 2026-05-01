"use client";

import { useEffect, useState } from "react";
import { notFound, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star, ExternalLink, BookText, Network, Tag, Pencil, GraduationCap, BookmarkPlus, BookmarkCheck } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [readingPending, setReadingPending] = useState<string | null>(null);

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
          if (c.variableIds?.length) {
            const v = await archiveVariablesApi.list();
            if (cancelled) return;
            const linked = v.data.filter((x) => c.variableIds!.includes(x.id));
            setVariables(linked);
            // 변인의 측정도구도 함께 로드
            const measurementIds = new Set<string>();
            linked.forEach((x) => x.measurementIds?.forEach((mid) => measurementIds.add(mid)));
            if (measurementIds.size > 0) {
              const m = await archiveMeasurementsApi.list();
              if (cancelled) return;
              setMeasurements(m.data.filter((x) => measurementIds.has(x.id)));
            }
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
        thesisReadingList: next.length > 0 ? next : undefined,
      });
      const authState = useAuthStore.getState();
      if (authState.user && authState.user.id === user.id) {
        authState.setUser({
          ...authState.user,
          thesisReadingList: next.length > 0 ? next : undefined,
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
      <div className="container mx-auto max-w-4xl py-8 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="container mx-auto max-w-4xl py-12 text-center">
        <p className="text-muted-foreground">항목을 찾을 수 없습니다.</p>
        <Link href="/archive">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            아카이브로 돌아가기
          </Button>
        </Link>
      </div>
    );
  }

  const tags = (item as { tags?: string[] }).tags ?? [];
  const altNames = (item as { altNames?: string[] }).altNames ?? [];
  const references = (item as { references?: string[] }).references ?? [];

  return (
    <div className="container mx-auto max-w-4xl py-8">
      {/* Back */}
      <Link href="/archive">
        <Button variant="ghost" size="sm" className="mb-3">
          <ArrowLeft className="mr-1 h-4 w-4" />
          아카이브
        </Button>
      </Link>

      {/* Header */}
      <Card className="border-l-4" style={{
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
              {altNames.length > 0 && (
                <p className="mt-1 text-sm text-muted-foreground italic">
                  {altNames.join(" · ")}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {canManage && (
                <Link href={`/archive/${type}/${id}/edit`}>
                  <Button variant="outline" size="sm">
                    <Pencil className="mr-1 h-4 w-4" />
                    수정
                  </Button>
                </Link>
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
        </CardHeader>
        <CardContent className="space-y-4">
          {item.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {item.description}
            </p>
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
                <div>
                  <span className="text-muted-foreground">척도: </span>
                  {(item as ArchiveMeasurementTool).scaleType}
                </div>
              )}
              {(item as ArchiveMeasurementTool).reliability && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">신뢰도: </span>
                  {(item as ArchiveMeasurementTool).reliability}
                </div>
              )}
              {(item as ArchiveMeasurementTool).validity && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">타당도: </span>
                  {(item as ArchiveMeasurementTool).validity}
                </div>
              )}
            </div>
          )}

          {type === "measurement" && ((item as ArchiveMeasurementTool).sampleItems?.length ?? 0) > 0 && (
            <div>
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

          {references.length > 0 && (
            <div>
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
      <Card className="mt-6">
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

      {/* 관련 졸업생 논문 */}
      <Card className="mt-6">
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
