"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import PageContainer from "@/components/ui/page-container";
import ThesisAnalysisCard from "@/features/alumni/ThesisAnalysisCard";
import ReadingStartButton from "@/features/research/study-timer/ReadingStartButton";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  ExternalLink,
  GraduationCap,
  User as UserIcon,
  BookOpen,
  Pencil,
  Save,
  X,
  Lock,
  BarChart3,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import {
  alumniThesesApi,
  profilesApi,
  archiveConceptsApi,
  archiveVariablesApi,
  archiveMeasurementsApi,
  researchMethodsApi,
  statisticalMethodsApi,
} from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type {
  AlumniThesis,
  User,
  ArchiveConcept,
  ArchiveVariable,
  ArchiveMeasurementTool,
  ResearchMethod,
  StatisticalMethod,
} from "@/types";
import {
  ARCHIVE_ITEM_TYPE_COLORS,
  RESEARCH_METHOD_KIND_COLORS,
  RESEARCH_METHOD_KIND_LABELS,
  STATISTICAL_METHOD_CATEGORY_COLORS,
  STATISTICAL_METHOD_CATEGORY_LABELS,
} from "@/types";

function jaccardWithMatches(a: string[], b: string[]): { score: number; matches: string[] } {
  const A = new Map<string, string>();
  a.forEach((s) => {
    const norm = s.trim().toLowerCase();
    if (norm) A.set(norm, s.trim());
  });
  const B = new Set(b.map((s) => s.trim().toLowerCase()).filter(Boolean));
  if (A.size === 0 || B.size === 0) return { score: 0, matches: [] };
  const matches: string[] = [];
  A.forEach((orig, norm) => {
    if (B.has(norm)) matches.push(orig);
  });
  const inter = matches.length;
  const score = inter / (A.size + B.size - inter);
  return { score, matches };
}

interface RelatedThesis {
  thesis: AlumniThesis;
  reason: string;
}

interface RelatedGroups {
  byAdvisor: RelatedThesis[];
  byKeyword: RelatedThesis[];
}

interface EditDraft {
  title: string;
  titleEn: string;
  authorName: string;
  advisorName: string;
  awardedYearMonth: string;
  keywords: string;
  conceptIds: string[];
  variableIds: string[];
  measurementIds: string[];
  researchMethods: string[];
  statisticalMethods: string[];
  abstract: string;
  dcollectionUrl: string;
}

function toDraft(t: AlumniThesis): EditDraft {
  return {
    title: t.title ?? "",
    titleEn: t.titleEn ?? "",
    authorName: t.authorName ?? "",
    advisorName: t.advisorName ?? "",
    awardedYearMonth: t.awardedYearMonth ?? "",
    keywords: (t.keywords ?? []).join(", "),
    conceptIds: t.conceptIds ?? [],
    variableIds: t.variableIds ?? [],
    measurementIds: t.measurementIds ?? [],
    researchMethods: t.researchMethods ?? [],
    statisticalMethods: t.statisticalMethods ?? [],
    abstract: t.abstract ?? "",
    dcollectionUrl: t.dcollectionUrl ?? "",
  };
}

export default function AlumniThesisDetailPage() {
  const params = useParams<{ id: string }>();
  const { user: viewer, initialized } = useAuthStore();
  const canEdit = isAtLeast(viewer, "staff");
  const [thesis, setThesis] = useState<AlumniThesis | null>(null);
  const [related, setRelated] = useState<RelatedGroups>({
    byAdvisor: [],
    byKeyword: [],
  });
  const [author, setAuthor] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [readingPending, setReadingPending] = useState(false);
  const [concepts, setConcepts] = useState<ArchiveConcept[]>([]);
  const [variables, setVariables] = useState<ArchiveVariable[]>([]);
  const [measurements, setMeasurements] = useState<ArchiveMeasurementTool[]>([]);
  const [methods, setMethods] = useState<ResearchMethod[]>([]);
  const [statMethods, setStatMethods] = useState<StatisticalMethod[]>([]);

  const inReadingList = !!viewer?.thesisReadingList?.includes(thesis?.id ?? "");

  useEffect(() => {
    const hasLinks =
      !!thesis?.conceptIds?.length ||
      !!thesis?.variableIds?.length ||
      !!thesis?.measurementIds?.length ||
      !!thesis?.researchMethods?.length ||
      !!thesis?.statisticalMethods?.length;
    if (!canEdit && !hasLinks) return;
    let cancelled = false;
    (async () => {
      try {
        const [c, v, m, rm, sm] = await Promise.all([
          archiveConceptsApi.list(),
          archiveVariablesApi.list(),
          archiveMeasurementsApi.list(),
          // staff+ 는 draft 포함, 일반 회원은 published 만 (rules 와 정합)
          canEdit ? researchMethodsApi.list() : researchMethodsApi.listPublished(),
          canEdit ? statisticalMethodsApi.list() : statisticalMethodsApi.listPublished(),
        ]);
        if (cancelled) return;
        setConcepts(c.data);
        setVariables(v.data);
        setMeasurements(m.data);
        setMethods(rm.data);
        // 클라이언트 단 한 번 더 검수 게이트 — 비-staff 에게 draft 노출 차단
        setStatMethods(canEdit ? sm.data : sm.data.filter((x) => x.published));
      } catch (err) {
        console.error("[alumni-thesis] archive load failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    canEdit,
    thesis?.conceptIds,
    thesis?.variableIds,
    thesis?.measurementIds,
    thesis?.researchMethods,
    thesis?.statisticalMethods,
  ]);

  useEffect(() => {
    if (!params?.id) return;
    if (!initialized) return;
    if (!viewer) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const t = await alumniThesesApi.get(params.id);
        if (cancelled) return;
        setThesis(t);

        if (t.authorUserId) {
          try {
            // codex-C1: users 직접 get(타인) 대신 서버 투영(members/basic) 경유
            const list = await profilesApi.listByIds([t.authorUserId]);
            if (!cancelled && list[0]) setAuthor(list[0]);
          } catch {
            // 매핑된 회원 조회 실패는 무시
          }
        }

        const all = await alumniThesesApi.list();
        if (cancelled) return;
        const others = all.data.filter((x) => x.id !== t.id);

        const byAdvisor: RelatedThesis[] = t.advisorName
          ? others
              .filter((x) => x.advisorName && x.advisorName === t.advisorName)
              .sort((a, b) =>
                (b.awardedYearMonth ?? "").localeCompare(a.awardedYearMonth ?? ""),
              )
              .map((x) => ({
                thesis: x,
                reason: `같은 지도교수(${t.advisorName})의 논문`,
              }))
          : [];

        const byKeyword: RelatedThesis[] = others
          .map((x) => {
            const { score, matches } = jaccardWithMatches(
              t.keywords ?? [],
              x.keywords ?? [],
            );
            return { t: x, score, matches };
          })
          .filter((r) => r.matches.length > 0)
          .sort((a, b) => b.score - a.score)
          .map((r) => ({
            thesis: r.t,
            reason: `키워드 ‘${r.matches.slice(0, 3).join(", ")}’ 공유`,
          }));

        setRelated({ byAdvisor, byKeyword });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "불러오지 못했습니다");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params?.id, initialized, viewer]);

  const year = useMemo(() => {
    const m = (thesis?.awardedYearMonth ?? "").match(/^(\d{4})/);
    return m ? m[1] : null;
  }, [thesis]);

  const semester = useMemo(() => {
    const m = (thesis?.awardedYearMonth ?? "").match(/^(\d{4})-(\d{2})/);
    if (!m) return null;
    const y = m[1];
    const mo = Number(m[2]);
    if (mo === 2) return `${y}년 전기`;
    if (mo === 8) return `${y}년 후기`;
    return `${y}년 ${mo}월`;
  }, [thesis]);

  function startEdit() {
    if (!thesis) return;
    setDraft(toDraft(thesis));
    setEditing(true);
    setSaveMsg(null);
  }

  function cancelEdit() {
    setEditing(false);
    setDraft(null);
    setSaveMsg(null);
  }

  async function toggleReadingList() {
    if (!viewer || !thesis) {
      toast.error("로그인이 필요합니다.");
      return;
    }
    setReadingPending(true);
    const current = viewer.thesisReadingList ?? [];
    const next = current.includes(thesis.id)
      ? current.filter((x) => x !== thesis.id)
      : [...current, thesis.id];
    try {
      await profilesApi.update(viewer.id, {
        thesisReadingList: next /* QA-v3: undefined 는 strip 되어 필드가 안 지워짐 — 빈 배열로 저장 */,
      });
      const authState = useAuthStore.getState();
      if (authState.user && authState.user.id === viewer.id) {
        authState.setUser({
          ...authState.user,
          thesisReadingList: next /* QA-v3: undefined 는 strip 되어 필드가 안 지워짐 — 빈 배열로 저장 */,
        });
      }
      toast.success(
        current.includes(thesis.id)
          ? "읽기 리스트에서 제거했습니다."
          : "읽기 리스트에 추가했습니다."
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setReadingPending(false);
    }
  }

  async function saveEdit() {
    if (!thesis || !draft) return;
    if (!draft.title.trim() || !draft.authorName.trim()) {
      setSaveMsg("⚠ 제목과 저자는 필수입니다.");
      return;
    }
    if (draft.awardedYearMonth && !/^\d{4}-(0[1-9]|1[0-2])$/.test(draft.awardedYearMonth)) {
      setSaveMsg("⚠ 졸업시점 형식은 YYYY-MM (예: 2025-02) 입니다.");
      return;
    }
    setSaving(true);
    setSaveMsg(null);
    try {
      const payload = {
        title: draft.title.trim(),
        titleEn: draft.titleEn.trim() || null,
        authorName: draft.authorName.trim(),
        advisorName: draft.advisorName.trim() || null,
        awardedYearMonth: draft.awardedYearMonth.trim() || null,
        keywords: draft.keywords
          .split(/[,\n]+/)
          .map((k) => k.trim())
          .filter(Boolean),
        conceptIds: draft.conceptIds.length > 0 ? draft.conceptIds : null,
        variableIds: draft.variableIds.length > 0 ? draft.variableIds : null,
        measurementIds: draft.measurementIds.length > 0 ? draft.measurementIds : null,
        researchMethods: draft.researchMethods.length > 0 ? draft.researchMethods : null,
        statisticalMethods:
          draft.statisticalMethods.length > 0 ? draft.statisticalMethods : null,
        abstract: draft.abstract.trim() || null,
        dcollectionUrl: draft.dcollectionUrl.trim() || null,
      };
      await alumniThesesApi.update(thesis.id, payload);
      const fresh = await alumniThesesApi.get(thesis.id);
      setThesis(fresh);
      setEditing(false);
      setDraft(null);
      setSaveMsg("✓ 저장되었습니다.");
    } catch (e) {
      setSaveMsg(`⚠ ${e instanceof Error ? e.message : "저장 실패"}`);
    } finally {
      setSaving(false);
    }
  }

  if (initialized && !viewer) {
    return (
      <PageContainer width="narrow">
        <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Lock size={26} />
            </div>
            <h1 className="mt-4 text-xl font-bold">회원 전용 콘텐츠</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              학위논문 상세(저자·지도교수·초록·원문 링크)는 연세교육공학회 회원에게만 공개됩니다.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <Link
                href="/login"
                className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-white hover:bg-primary/90"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-10 items-center rounded-md border border-primary px-5 text-sm font-medium text-primary hover:bg-primary/5"
              >
                회원가입
              </Link>
              <Link
                href="/research"
                className="inline-flex h-10 items-center rounded-md border bg-card px-5 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                <BarChart3 size={14} className="mr-1.5" />
                연구 분석 페이지로
              </Link>
            </div>
        </div>
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer width="narrow">
        <div aria-busy="true" aria-label="졸업 논문 불러오는 중">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-4 h-8 w-3/4" />
          <Skeleton className="mt-2 h-4 w-1/2" />
          <div className="mt-8 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-10/12" />
            <Skeleton className="h-4 w-9/12" />
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      </PageContainer>
    );
  }

  if (error || !thesis) {
    return (
      <PageContainer width="narrow">
        <p className="text-sm text-destructive" role="alert">⚠ {error ?? "논문을 찾을 수 없습니다."}</p>
        <div className="mt-4">
          <BackButton variant="default" fallbackHref="/alumni/thesis" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer width="narrow">
        <BackButton href="/alumni/thesis" label="학위논문 목록" variant="default" />

        <div className="mt-4 rounded-2xl border bg-card p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <GraduationCap size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-primary">
                <Calendar size={12} />
                {semester ?? (year ? `${year}년` : "졸업시점 미상")}
              </p>
              <h1 className="mt-1.5 text-xl font-bold leading-snug sm:text-2xl">
                {thesis.title}
              </h1>
              {thesis.titleEn && (
                <p className="mt-1 text-sm italic text-muted-foreground">
                  {thesis.titleEn}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ReadingStartButton
                source="alumni_thesis"
                refId={thesis.id}
                title={thesis.title}
              />
              {canEdit && !editing && (
                <Button variant="outline" size="sm" onClick={startEdit}>
                  <Pencil size={13} className="mr-1.5" />
                  편집
                </Button>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <UserIcon size={13} className="text-muted-foreground" />
              <span className="font-medium">{thesis.authorName}</span>
              {author ? (
                <Link
                  href={`/profile/${author.id}`}
                  className="ml-1 text-xs text-primary hover:underline"
                >
                  회원 프로필 →
                </Link>
              ) : (
                <Badge variant="outline" className="ml-1 text-[10px]">
                  미매핑
                </Badge>
              )}
            </span>
            {thesis.advisorName && (
              <span className="text-sm">
                <span className="text-muted-foreground">지도:</span>{" "}
                <span className="font-medium">{thesis.advisorName}</span>
              </span>
            )}
          </div>

          {thesis.keywords && thesis.keywords.length > 0 && (
            <div className="mt-5">
              <h2 className="text-xs font-semibold text-muted-foreground">키워드</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {thesis.keywords.map((k, i) => (
                  <Badge key={`${k}-${i}`} variant="secondary" className="text-xs">
                    {k}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {thesis.conceptIds && thesis.conceptIds.length > 0 && (
            <div className="mt-5">
              <h2 className="text-xs font-semibold text-muted-foreground">개념</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {thesis.conceptIds.map((id) => {
                  const c = concepts.find((x) => x.id === id);
                  if (!c) {
                    return (
                      <Badge key={id} variant="outline" className="text-xs opacity-60">
                        ({id.slice(0, 6)}…)
                      </Badge>
                    );
                  }
                  return (
                    <Link key={id} href={`/archive/concept/${id}`}>
                      <Badge
                        variant="outline"
                        className={cn("cursor-pointer text-xs", ARCHIVE_ITEM_TYPE_COLORS.concept)}
                      >
                        {c.name}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {thesis.variableIds && thesis.variableIds.length > 0 && (
            <div className="mt-5">
              <h2 className="text-xs font-semibold text-muted-foreground">변인</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {thesis.variableIds.map((id) => {
                  const v = variables.find((x) => x.id === id);
                  if (!v) {
                    return (
                      <Badge key={id} variant="outline" className="text-xs opacity-60">
                        ({id.slice(0, 6)}…)
                      </Badge>
                    );
                  }
                  return (
                    <Link key={id} href={`/archive/variable/${id}`}>
                      <Badge
                        variant="outline"
                        className={cn("cursor-pointer text-xs", ARCHIVE_ITEM_TYPE_COLORS.variable)}
                      >
                        {v.name}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {thesis.measurementIds && thesis.measurementIds.length > 0 && (
            <div className="mt-5">
              <h2 className="text-xs font-semibold text-muted-foreground">측정도구</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {thesis.measurementIds.map((id) => {
                  const m = measurements.find((x) => x.id === id);
                  if (!m) {
                    return (
                      <Badge key={id} variant="outline" className="text-xs opacity-60">
                        ({id.slice(0, 6)}…)
                      </Badge>
                    );
                  }
                  return (
                    <Link key={id} href={`/archive/measurement/${id}`}>
                      <Badge
                        variant="outline"
                        className={cn(
                          "cursor-pointer text-xs",
                          ARCHIVE_ITEM_TYPE_COLORS.measurement,
                        )}
                      >
                        {m.name}
                        {m.author && (
                          <span className="ml-1 opacity-70">· {m.author}</span>
                        )}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {thesis.researchMethods && thesis.researchMethods.length > 0 && (
            <div className="mt-5">
              <h2 className="text-xs font-semibold text-muted-foreground">연구방법</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {thesis.researchMethods.map((id) => {
                  const rm = methods.find((x) => x.id === id);
                  if (!rm) {
                    return (
                      <Badge key={id} variant="outline" className="text-xs opacity-60">
                        ({id.slice(0, 6)}…)
                      </Badge>
                    );
                  }
                  return (
                    <Link key={id} href={`/archive/research-methods/${id}`}>
                      <Badge
                        variant="outline"
                        className={cn("cursor-pointer text-xs", RESEARCH_METHOD_KIND_COLORS[rm.kind])}
                      >
                        {rm.name}
                        <span className="ml-1 opacity-70">
                          · {RESEARCH_METHOD_KIND_LABELS[rm.kind]}
                        </span>
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {thesis.statisticalMethods && thesis.statisticalMethods.length > 0 && (
            <div className="mt-5">
              <h2 className="text-xs font-semibold text-muted-foreground">통계방법</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {thesis.statisticalMethods.map((id) => {
                  const sm = statMethods.find((x) => x.id === id);
                  if (!sm) {
                    return (
                      <Badge key={id} variant="outline" className="text-xs opacity-60">
                        ({id.slice(0, 6)}…)
                      </Badge>
                    );
                  }
                  return (
                    <Link key={id} href={`/archive/statistical-methods/${id}`}>
                      <Badge
                        variant="outline"
                        className={cn(
                          "cursor-pointer text-xs",
                          STATISTICAL_METHOD_CATEGORY_COLORS[sm.category],
                        )}
                      >
                        {sm.name}
                        <span className="ml-1 opacity-70">
                          · {STATISTICAL_METHOD_CATEGORY_LABELS[sm.category]}
                        </span>
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* 연구 분석 프로필 — 자동 추출 + 운영진 인라인 검수 (사이클 52) */}
          {/* C-4(2026-07-04): 졸업생 논문 열람(월 124뷰)의 후속 루프 — 내 연구로 연결 */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-2.5 text-sm">
            <span className="text-foreground/85">이 논문의 방법을 내 연구에 적용해 보세요 —</span>
            <Link href="/archive/method-finder" className="font-medium text-primary hover:underline">
              통계방법 따라가기 →
            </Link>
            <Link href="/mypage/research?tab=reading" className="font-medium text-primary hover:underline">
              내 문헌 매트릭스에 정리 →
            </Link>
          </div>

          <ThesisAnalysisCard thesis={thesis} canEdit={canEdit} onSaved={setThesis} />

          {thesis.abstract && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold">초록</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                {thesis.abstract}
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            {thesis.dcollectionUrl && (
              <a
                href={thesis.dcollectionUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <ExternalLink size={14} className="mr-1.5" />
                dCollection에서 원문 보기
              </a>
            )}
            <Button
              variant={inReadingList ? "default" : "outline"}
              size="sm"
              onClick={toggleReadingList}
              disabled={readingPending}
              className="h-9"
            >
              {inReadingList ? (
                <>
                  <BookmarkCheck size={14} className="mr-1.5" />
                  읽기 리스트에 추가됨
                </>
              ) : (
                <>
                  <Bookmark size={14} className="mr-1.5" />
                  논문 읽기 리스트에 추가
                </>
              )}
            </Button>
          </div>

          {canEdit && editing && draft && (
            <div className="mt-6 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-5">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-bold text-primary">
                  <Pencil size={14} />
                  운영진 편집 모드
                </h2>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cancelEdit}
                    disabled={saving}
                  >
                    <X size={13} className="mr-1" />
                    취소
                  </Button>
                  <Button size="sm" onClick={saveEdit} disabled={saving}>
                    <Save size={13} className="mr-1" />
                    {saving ? "저장 중..." : "저장"}
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="제목 *">
                  <Input
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  />
                </Field>
                <Field label="영문 제목">
                  <Input
                    value={draft.titleEn}
                    onChange={(e) => setDraft({ ...draft, titleEn: e.target.value })}
                  />
                </Field>
                <Field label="저자명 *">
                  <Input
                    value={draft.authorName}
                    onChange={(e) =>
                      setDraft({ ...draft, authorName: e.target.value })
                    }
                  />
                </Field>
                <Field label="지도교수명">
                  <Input
                    value={draft.advisorName}
                    onChange={(e) =>
                      setDraft({ ...draft, advisorName: e.target.value })
                    }
                    placeholder="예: 이성주"
                  />
                </Field>
                <Field label="졸업시점 (YYYY-MM)">
                  <Input
                    value={draft.awardedYearMonth}
                    onChange={(e) =>
                      setDraft({ ...draft, awardedYearMonth: e.target.value })
                    }
                    placeholder="예: 2025-02 (전기) / 2025-08 (후기)"
                  />
                </Field>
                <Field label="dCollection URL">
                  <Input
                    value={draft.dcollectionUrl}
                    onChange={(e) =>
                      setDraft({ ...draft, dcollectionUrl: e.target.value })
                    }
                    placeholder="https://dcollection.yonsei.ac.kr/..."
                  />
                </Field>
              </div>

              <div className="mt-3">
                <Field label="키워드 (쉼표로 구분)">
                  <Input
                    value={draft.keywords}
                    onChange={(e) =>
                      setDraft({ ...draft, keywords: e.target.value })
                    }
                    placeholder="예: 인공지능, 학습설계, 메타버스"
                  />
                </Field>
              </div>

              <div className="mt-3">
                <Field label="개념 (교육공학 아카이브)">
                  <ArchivePickerField
                    type="concept"
                    items={concepts.map((c) => ({ id: c.id, name: c.name }))}
                    selected={draft.conceptIds}
                    onChange={(ids) => setDraft({ ...draft, conceptIds: ids })}
                    emptyHint="아카이브 개념이 없습니다. /console/archive에서 추가하세요."
                  />
                </Field>
              </div>

              <div className="mt-3">
                <Field label="변인 (교육공학 아카이브)">
                  <ArchivePickerField
                    type="variable"
                    items={variables.map((v) => ({ id: v.id, name: v.name }))}
                    selected={draft.variableIds}
                    onChange={(ids) => setDraft({ ...draft, variableIds: ids })}
                    emptyHint="아카이브 변인이 없습니다. /console/archive에서 추가하세요."
                  />
                </Field>
              </div>

              <div className="mt-3">
                <Field label="측정도구 (교육공학 아카이브)">
                  <ArchivePickerField
                    type="measurement"
                    items={measurements.map((m) => ({
                      id: m.id,
                      name: m.name,
                      meta: m.author,
                    }))}
                    selected={draft.measurementIds}
                    onChange={(ids) => setDraft({ ...draft, measurementIds: ids })}
                    emptyHint="아카이브 측정도구가 없습니다. /console/archive에서 추가하세요."
                  />
                </Field>
              </div>

              <div className="mt-3">
                <Field label="연구방법 (교육공학 아카이브)">
                  <ArchivePickerField
                    type="concept"
                    items={methods.map((m) => ({
                      id: m.id,
                      name: m.name,
                      meta: RESEARCH_METHOD_KIND_LABELS[m.kind],
                    }))}
                    selected={draft.researchMethods}
                    onChange={(ids) => setDraft({ ...draft, researchMethods: ids })}
                    emptyHint="아카이브 연구방법이 없습니다. /console/archive/research-methods에서 추가하세요."
                  />
                </Field>
              </div>

              <div className="mt-3">
                <Field label="통계방법 (교육공학 아카이브)">
                  <ArchivePickerField
                    type="concept"
                    items={statMethods.map((m) => ({
                      id: m.id,
                      name: m.name,
                      meta: STATISTICAL_METHOD_CATEGORY_LABELS[m.category],
                    }))}
                    selected={draft.statisticalMethods}
                    onChange={(ids) => setDraft({ ...draft, statisticalMethods: ids })}
                    emptyHint="아카이브 통계방법이 없습니다. /console/archive/statistical-methods에서 추가하세요."
                  />
                </Field>
              </div>

              <div className="mt-3">
                <Field label="초록">
                  <Textarea
                    value={draft.abstract}
                    onChange={(e) =>
                      setDraft({ ...draft, abstract: e.target.value })
                    }
                    rows={8}
                    placeholder="논문 초록을 입력하세요"
                  />
                </Field>
              </div>

              {saveMsg && (
                <p
                  className={`mt-3 text-xs ${
                    saveMsg.startsWith("✓") ? "text-success" : "text-destructive"
                  }`}
                >
                  {saveMsg}
                </p>
              )}
            </div>
          )}
          {!editing && saveMsg && (
            <p
              className={`mt-3 text-xs ${
                saveMsg.startsWith("✓") ? "text-success" : "text-destructive"
              }`}
            >
              {saveMsg}
            </p>
          )}
        </div>

        {(related.byAdvisor.length > 0 || related.byKeyword.length > 0) && (
          <div className="mt-6 rounded-2xl border bg-card">
            <Tabs defaultValue="advisor" className="w-full">
              <div className="border-b px-3 pt-3">
                <TabsList>
                  <TabsTrigger value="advisor" className="gap-1.5">
                    <UserIcon size={13} />
                    지도교수 기준
                    <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {related.byAdvisor.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="keyword" className="gap-1.5">
                    <BookOpen size={13} />
                    키워드 기준
                    <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {related.byKeyword.length}
                    </span>
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="advisor" className="p-3">
                <RelatedList
                  accent="indigo"
                  items={related.byAdvisor}
                  emptyText={
                    thesis.advisorName
                      ? "같은 지도교수의 다른 논문이 없습니다."
                      : "지도교수 정보가 없습니다."
                  }
                />
              </TabsContent>
              <TabsContent value="keyword" className="p-3">
                <RelatedList
                  accent="amber"
                  items={related.byKeyword}
                  emptyText="공유 키워드가 있는 논문이 없습니다."
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
    </PageContainer>
  );
}

function ArchivePickerField({
  type,
  items,
  selected,
  onChange,
  emptyHint,
}: {
  type: "concept" | "variable" | "measurement";
  items: { id: string; name: string; meta?: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
  emptyHint: string;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        it.name.toLowerCase().includes(q) ||
        (it.meta ?? "").toLowerCase().includes(q),
    );
  }, [items, query]);
  const selectedSet = new Set(selected);

  const toggle = (id: string) => {
    if (selectedSet.has(id)) {
      onChange(selected.filter((x) => x !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  if (items.length === 0) {
    return (
      <p className="rounded-md border border-dashed px-3 py-2 text-[11px] text-muted-foreground">
        {emptyHint}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Input
        placeholder={`${type === "concept" ? "개념" : type === "variable" ? "변인" : "측정도구"} 검색`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-8 text-xs"
      />
      <div className="max-h-48 overflow-y-auto rounded-md border bg-card p-2">
        <div className="flex flex-wrap gap-1.5">
          {filtered.length === 0 ? (
            <span className="text-[11px] text-muted-foreground">검색 결과 없음</span>
          ) : (
            filtered.map((it) => {
              const active = selectedSet.has(it.id);
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => toggle(it.id)}
                  className={cn(
                    "rounded-md border px-2 py-1 text-[11px] transition-colors",
                    active
                      ? type === "concept"
                        ? "border-cat-5/30 bg-cat-5/10 text-cat-5"
                        : type === "variable"
                          ? "border-cat-1/30 bg-cat-1/10 text-cat-1"
                          : "border-success/30 bg-success/10 text-success"
                      : "border-muted bg-card text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  {it.name}
                  {it.meta && <span className="ml-1 opacity-70">· {it.meta}</span>}
                </button>
              );
            })
          )}
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">
        선택됨: {selected.length}개
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function semesterLabelOf(awardedYearMonth?: string): string {
  if (!awardedYearMonth) return "";
  const m = awardedYearMonth.match(/^(\d{4})-(\d{2})/);
  if (!m) return awardedYearMonth.slice(0, 4) + "년";
  const mo = Number(m[2]);
  if (mo === 2) return `${m[1]}년 전기`;
  if (mo === 8) return `${m[1]}년 후기`;
  return `${m[1]}년`;
}

function RelatedList({
  accent,
  items,
  emptyText,
}: {
  accent: "indigo" | "amber";
  items: RelatedThesis[];
  emptyText: string;
}) {
  const accentMap = {
    indigo: { reason: "text-cat-1" },
    amber: { reason: "text-warning" },
  } as const;
  const a = accentMap[accent];
  const PAGE = 5;
  const [visible, setVisible] = useState(PAGE);
  const sliced = items.slice(0, visible);
  const hasMore = items.length > visible;

  if (items.length === 0) {
    return (
      <p className="px-3 py-6 text-center text-xs text-muted-foreground">
        {emptyText}
      </p>
    );
  }

  return (
    <div>
      <ul className="divide-y">
        {sliced.map(({ thesis: r, reason }) => {
          const yearLabel = semesterLabelOf(r.awardedYearMonth);
          return (
            <li key={r.id} className="py-2.5">
              <Link
                href={`/alumni/thesis/${r.id}`}
                className="block rounded-md px-2 py-1.5 hover:bg-muted/50 hover:text-primary"
              >
                <p className="text-sm font-medium leading-snug">{r.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {r.authorName}
                  {r.advisorName && ` · 지도 ${r.advisorName}`}
                  {yearLabel && ` · ${yearLabel}`}
                </p>
                <p className={`mt-1 text-[11px] font-medium ${a.reason}`}>
                  {reason} 이유로 관련되었습니다.
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
      {hasMore && (
        <div className="mt-2 text-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE)}
            className="rounded-md border bg-card px-3 py-1.5 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground"
          >
            추가 추천 보기 ({items.length - visible}건 남음)
          </button>
        </div>
      )}
    </div>
  );
}
