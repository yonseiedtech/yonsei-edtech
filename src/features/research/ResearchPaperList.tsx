"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import EmptyState from "@/components/ui/empty-state";
import { Plus, Upload, BookOpen, Search, X, Save, FileEdit, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { ResearchPaper, User, RecentPaper, AlumniThesis } from "@/types";
import {
  useResearchPapers,
  useCreateResearchPaper,
  useUpdateResearchPaper,
  useDeleteResearchPaper,
} from "./useResearchPapers";
import ResearchPaperCard from "./ResearchPaperCard";
import ResearchPaperDialog from "./ResearchPaperDialog";
import RisImporter from "./RisImporter";
import TagInput from "./TagInput";
import { profilesApi, dataApi, alumniThesesApi } from "@/lib/bkend";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, Bookmark, BookmarkCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { isPaperInPeriod, formatPeriodLabel } from "@/lib/research-period";
import { useAuthStore } from "@/features/auth/auth-store";

type FilterType = "all" | "thesis" | "academic";
type FilterStatus = "all" | "to_read" | "reading" | "completed";
type SortKey = "recent" | "year" | "rating";

interface Props {
  user: User;
  readOnly?: boolean;
  /** YYYY-MM 시작 — 비어있으면 무제한 */
  periodStart?: string;
  /** YYYY-MM 종료 — 비어있으면 무제한 */
  periodEnd?: string;
}

export default function ResearchPaperList({ user, readOnly = false, periodStart, periodEnd }: Props) {
  const { papers, isLoading } = useResearchPapers(user.id);
  const createPaper = useCreateResearchPaper();
  const updatePaper = useUpdateResearchPaper();
  const deletePaper = useDeleteResearchPaper();

  const [interests, setInterests] = useState<string[]>(user.researchInterests ?? []);
  const [savingInterests, setSavingInterests] = useState(false);
  const [interestsDirty, setInterestsDirty] = useState(false);

  // user prop이 갱신되면 관심분야 초기값 동기화 (페이지 이동 후 돌아왔을 때)
  useEffect(() => {
    setInterests(user.researchInterests ?? []);
    setInterestsDirty(false);
  }, [user.id, user.researchInterests]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ResearchPaper | null>(null);
  const [risOpen, setRisOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ResearchPaper | null>(null);

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("recent");

  // 1회성 마이그레이션: 기존 user.recentPapers → research_papers 신규 문서
  useEffect(() => {
    async function migrate() {
      if (readOnly) return;
      const userAny = user as User & { migratedRecentPapers?: boolean; recentPapers?: RecentPaper[] };
      if (userAny.migratedRecentPapers) return;
      if (!userAny.recentPapers || userAny.recentPapers.length === 0) {
        // 마이그레이션할 것 없어도 플래그만 세팅
        try {
          await profilesApi.update(user.id, { migratedRecentPapers: true });
        } catch {
          /* ignore */
        }
        return;
      }
      try {
        for (const rp of userAny.recentPapers) {
          if (!rp.title) continue;
          await dataApi.create("research_papers", {
            userId: user.id,
            paperType: "academic",
            title: rp.title,
            authors: rp.authors,
            year: rp.year,
            url: rp.url,
            readStatus: "to_read",
          });
        }
        // 플래그 설정 + 기존 필드 비우기
        await profilesApi.update(user.id, {
          migratedRecentPapers: true,
          recentPapers: [],
        });
        // 마이그레이션 안내 토스트는 표시하지 않음 (자동 이전)
      } catch (e) {
        console.warn("recentPapers migration failed", e);
      }
    }
    migrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  // 임시저장 / 발행본 분리
  const drafts = useMemo(() => papers.filter((p) => p.isDraft), [papers]);
  const published = useMemo(() => papers.filter((p) => !p.isDraft), [papers]);

  const allTags = useMemo(() => {
    const m = new Map<string, number>();
    published.forEach((p) => p.tags?.forEach((t) => m.set(t, (m.get(t) ?? 0) + 1)));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [published]);

  const periodFiltered = useMemo(() => {
    if (!periodStart && !periodEnd) return published;
    return published.filter((p) => isPaperInPeriod(p, periodStart, periodEnd));
  }, [published, periodStart, periodEnd]);

  const filtered = useMemo(() => {
    let arr = [...periodFiltered];
    if (filterType !== "all") arr = arr.filter((p) => p.paperType === filterType);
    if (filterStatus !== "all") arr = arr.filter((p) => p.readStatus === filterStatus);
    if (activeTagFilter) arr = arr.filter((p) => p.tags?.includes(activeTagFilter));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.authors?.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    arr.sort((a, b) => {
      if (sortKey === "year") return (b.year ?? 0) - (a.year ?? 0);
      if (sortKey === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
      return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
    });
    return arr;
  }, [periodFiltered, filterType, filterStatus, activeTagFilter, search, sortKey]);

  const hasPeriodFilter = !!(periodStart || periodEnd);

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(p: ResearchPaper) {
    setEditing(p);
    setDialogOpen(true);
  }

  async function handleSubmit(
    data: Partial<ResearchPaper>,
    opts: { isDraft: boolean }
  ): Promise<ResearchPaper | void> {
    try {
      if (editing) {
        const res = await updatePaper.mutateAsync({
          id: editing.id,
          data: data as Record<string, unknown>,
        });
        if (!opts.isDraft) toast.success("논문이 수정되었습니다.");
        return res as ResearchPaper;
      } else {
        const res = await createPaper.mutateAsync({
          ...data,
          userId: user.id,
        } as Record<string, unknown>);
        // 신규 임시저장 → 다이얼로그가 받은 id로 update 모드 승격하도록 editing 세팅
        if (opts.isDraft && res && typeof res === "object" && "id" in res) {
          setEditing(res as ResearchPaper);
        } else if (!opts.isDraft) {
          toast.success("논문이 추가되었습니다.");
        }
        return res as ResearchPaper;
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장 실패");
      throw e;
    }
  }

  async function handleImport(records: Partial<ResearchPaper>[]) {
    let count = 0;
    for (const r of records) {
      try {
        await createPaper.mutateAsync({ ...r, userId: user.id } as Record<string, unknown>);
        count++;
      } catch (e) {
        console.warn("import row failed", e);
      }
    }
    if (count !== records.length) {
      toast.warning(`${count}건 등록, ${records.length - count}건 실패`);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await deletePaper.mutateAsync(pendingDelete.id);
      toast.success("삭제되었습니다.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setPendingDelete(null);
    }
  }

  async function saveInterests() {
    setSavingInterests(true);
    try {
      const payload = interests.length > 0 ? interests : undefined;
      await profilesApi.update(user.id, {
        researchInterests: payload,
      });
      // auth-store 동기화 — 다른 페이지로 이동했다 돌아왔을 때 사라지는 문제 방지
      const authState = useAuthStore.getState();
      if (authState.user && authState.user.id === user.id) {
        authState.setUser({ ...authState.user, researchInterests: payload });
      }
      toast.success("관심 연구분야가 저장되었습니다.");
      setInterestsDirty(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSavingInterests(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* 관심 연구분야 */}
      <section className="rounded-2xl border bg-white p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">관심 연구분야</h3>
          {interestsDirty && !readOnly && (
            <Button size="sm" onClick={saveInterests} disabled={savingInterests}>
              <Save size={14} className="mr-1" />
              {savingInterests ? "저장 중..." : "저장"}
            </Button>
          )}
        </div>
        <div className="mt-3">
          {readOnly ? (
            interests.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {interests.map((t) => (
                  <span key={t} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">
                    {t}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">등록된 관심 분야가 없습니다.</p>
            )
          ) : (
            <TagInput
              value={interests}
              onChange={(next) => {
                setInterests(next);
                setInterestsDirty(true);
              }}
              placeholder="예: 교수설계, AI 교육, HCI"
            />
          )}
        </div>

        <p className="mt-3 text-[11px] text-muted-foreground">
          관심 연구 분야를 추가하시면 연세교육공학 졸업생 논문이 추천됩니다.
        </p>

        <AlumniThesisRecommendations interests={interests} />
      </section>

      {/* 논문 리스트 헤더 */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">
              연구 논문 ({hasPeriodFilter ? `${periodFiltered.length}/${published.length}` : published.length})
            </h3>
            {hasPeriodFilter && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700">
                기간: {formatPeriodLabel(periodStart, periodEnd)}
              </span>
            )}
          </div>
          {!readOnly && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setRisOpen(true)}>
                <Upload size={14} className="mr-1" />
                RIS 임포트
              </Button>
              <Button size="sm" onClick={openNew}>
                <Plus size={14} className="mr-1" />
                논문 추가
              </Button>
            </div>
          )}
        </div>

        {/* 임시 저장 섹션 */}
        {drafts.length > 0 && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <FileEdit size={14} className="text-amber-700" />
                <h4 className="text-sm font-semibold text-amber-900">
                  임시 저장 ({drafts.length})
                </h4>
              </div>
              <span className="text-[11px] text-amber-700/80">
                이어서 작성하거나 삭제할 수 있어요
              </span>
            </div>
            <ul className="mt-3 space-y-2">
              {drafts.map((d) => {
                const stepNum = d.lastEditStep ?? 1;
                return (
                  <li
                    key={d.id}
                    className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200/70 bg-white px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {d.title?.trim() || "(제목 없음)"}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 font-mono font-semibold text-amber-800">
                          Step {Math.min(Math.max(stepNum, 1), 5)}/5
                        </span>
                        {d.updatedAt && (
                          <span>
                            마지막 수정 {new Date(d.updatedAt).toLocaleString("ko-KR", {
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </p>
                    </div>
                    {!readOnly && (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 border-amber-300 text-amber-800 hover:bg-amber-100"
                          onClick={() => openEdit(d)}
                        >
                          <Pencil size={12} className="mr-1" />
                          이어 쓰기
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-destructive hover:bg-destructive/10"
                          onClick={() => setPendingDelete(d)}
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* 검색 + 필터 */}
        {published.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="제목·저자·태그로 검색"
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {(["all", "academic", "thesis"] as FilterType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={cn(
                    "rounded-full px-2.5 py-1 transition",
                    filterType === t
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  )}
                >
                  {t === "all" ? "전체 유형" : t === "academic" ? "학술논문" : "학위논문"}
                </button>
              ))}
              <span className="mx-1 h-3 w-px bg-border" />
              {(["all", "to_read", "reading", "completed"] as FilterStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={cn(
                    "rounded-full px-2.5 py-1 transition",
                    filterStatus === s
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  )}
                >
                  {s === "all" ? "전체 상태" : s === "to_read" ? "읽을 예정" : s === "reading" ? "읽는 중" : "완독"}
                </button>
              ))}
              <span className="mx-1 h-3 w-px bg-border" />
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="rounded-md border bg-white px-2 py-1 text-xs"
              >
                <option value="recent">최근 추가순</option>
                <option value="year">연도순</option>
                <option value="rating">평점순</option>
              </select>
            </div>
            {allTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-muted-foreground">태그:</span>
                {allTags.slice(0, 8).map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTagFilter(activeTagFilter === t ? null : t)}
                    className={cn(
                      "rounded-full border px-2 py-0.5 transition",
                      activeTagFilter === t
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-muted bg-white text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    #{t}
                  </button>
                ))}
                {activeTagFilter && (
                  <button
                    onClick={() => setActiveTagFilter(null)}
                    className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-destructive"
                  >
                    <X size={11} />
                    초기화
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 리스트 본체 */}
        <div className="mt-4">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">불러오는 중...</p>
          ) : published.length === 0 && drafts.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="아직 등록된 논문이 없습니다"
              description="읽은 논문을 분석 노트로 축적해보세요. RIS 파일을 업로드하면 일괄 등록도 가능합니다."
              actionLabel={readOnly ? undefined : "첫 논문 추가"}
              onAction={readOnly ? undefined : openNew}
            />
          ) : published.length === 0 ? (
            <p className="rounded-2xl border border-dashed bg-muted/30 py-8 text-center text-sm text-muted-foreground">
              아직 발행된 논문이 없습니다. 임시 저장된 항목을 마저 작성해보세요.
            </p>
          ) : filtered.length === 0 ? (
            <p className="rounded-2xl border border-dashed bg-muted/30 py-8 text-center text-sm text-muted-foreground">
              검색 조건에 맞는 논문이 없습니다.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((p) => (
                <ResearchPaperCard
                  key={p.id}
                  paper={p}
                  onEdit={() => openEdit(p)}
                  onDelete={() => setPendingDelete(p)}
                  onQuickUpdate={
                    readOnly
                      ? undefined
                      : async (patch) => {
                          try {
                            const enriched: Record<string, unknown> = { ...patch };
                            if (patch.readStatus) {
                              const today = new Date().toISOString().slice(0, 10);
                              if (patch.readStatus === "reading" && !p.readStartedAt) {
                                enriched.readStartedAt = today;
                              }
                              if (patch.readStatus === "completed") {
                                if (!p.readStartedAt) enriched.readStartedAt = today;
                                if (!p.readCompletedAt) enriched.readCompletedAt = today;
                              }
                            }
                            await updatePaper.mutateAsync({
                              id: p.id,
                              data: enriched,
                            });
                            if (patch.readStatus) {
                              const label =
                                patch.readStatus === "to_read"
                                  ? "읽을 예정"
                                  : patch.readStatus === "reading"
                                    ? "읽는 중"
                                    : "완독";
                              toast.success(`상태가 "${label}"으로 변경되었습니다.`);
                            }
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "변경 실패");
                          }
                        }
                  }
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {!readOnly && (
        <>
          <ResearchPaperDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            initial={editing}
            tagSuggestions={allTags}
            onSubmit={handleSubmit}
          />
          <RisImporter open={risOpen} onOpenChange={setRisOpen} onImport={handleImport} />
        </>
      )}

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingDelete?.isDraft ? "임시 저장 삭제" : "논문 삭제"}</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{pendingDelete?.title?.trim() || "(제목 없음)"}&quot;
              {pendingDelete?.isDraft ? " 임시 저장본을" : " 분석 노트를"} 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function yearMonthLabel(yearMonth?: string): string {
  if (!yearMonth) return "—";
  const m = yearMonth.match(/^(\d{4})-(\d{2})$/);
  if (!m) return yearMonth;
  return `${m[1]}년 ${Number(m[2])}월`;
}

const RECO_PAGE_SIZE = 6;

function AlumniThesisRecommendations({ interests }: { interests: string[] }) {
  const { user: authUser } = useAuthStore();
  const [readingList, setReadingList] = useState<string[]>(authUser?.thesisReadingList ?? []);
  const [visible, setVisible] = useState(RECO_PAGE_SIZE);

  useEffect(() => {
    setReadingList(authUser?.thesisReadingList ?? []);
  }, [authUser?.id, authUser?.thesisReadingList]);

  const normalizedInterests = useMemo(
    () => interests.map((s) => s.trim()).filter(Boolean),
    [interests]
  );

  const { data: theses = [], isLoading } = useQuery({
    queryKey: ["alumni-theses-for-reco"],
    queryFn: async () => {
      const res = await alumniThesesApi.list({ limit: 500 });
      return res.data as unknown as AlumniThesis[];
    },
    staleTime: 10 * 60_000,
    enabled: normalizedInterests.length > 0,
  });

  const matched = useMemo(() => {
    if (normalizedInterests.length === 0) return [];
    const lowered = normalizedInterests.map((s) => s.toLowerCase());
    type Scored = { thesis: AlumniThesis; score: number; hits: string[] };
    const scored: Scored[] = [];
    for (const t of theses) {
      const hayParts = [
        ...(t.keywords ?? []),
        t.keywordsRaw ?? "",
        t.title ?? "",
        t.titleEn ?? "",
      ];
      const hay = hayParts.join(" ").toLowerCase();
      const hits = lowered.filter((kw) => hay.includes(kw));
      if (hits.length === 0) continue;
      scored.push({ thesis: t, score: hits.length, hits });
    }
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.thesis.awardedYearMonth ?? "").localeCompare(a.thesis.awardedYearMonth ?? "");
    });
    return scored;
  }, [theses, normalizedInterests]);

  // 키워드 매칭 외 추가 추천 — 최신 졸업생 논문(매칭에 포함되지 않은 것)
  const extraSuggestions = useMemo(() => {
    if (theses.length === 0) return [] as AlumniThesis[];
    const matchedIds = new Set(matched.map((m) => m.thesis.id));
    return theses
      .filter((t) => !matchedIds.has(t.id))
      .sort((a, b) => (b.awardedYearMonth ?? "").localeCompare(a.awardedYearMonth ?? ""))
      .slice(0, 8);
  }, [theses, matched]);

  async function toggleReading(thesisId: string) {
    if (!authUser) {
      toast.error("로그인이 필요합니다.");
      return;
    }
    const next = readingList.includes(thesisId)
      ? readingList.filter((x) => x !== thesisId)
      : [...readingList, thesisId];
    setReadingList(next);
    try {
      await profilesApi.update(authUser.id, {
        thesisReadingList: next.length > 0 ? next : undefined,
      });
      const authState = useAuthStore.getState();
      if (authState.user && authState.user.id === authUser.id) {
        authState.setUser({
          ...authState.user,
          thesisReadingList: next.length > 0 ? next : undefined,
        });
      }
      toast.success(
        readingList.includes(thesisId)
          ? "읽기 리스트에서 제거했습니다."
          : "읽기 리스트에 추가했습니다."
      );
    } catch (e) {
      setReadingList(readingList);
      toast.error(e instanceof Error ? e.message : "저장 실패");
    }
  }

  if (normalizedInterests.length === 0) return null;

  const visibleMatched = matched.slice(0, visible);
  const hasMore = matched.length > visible;
  const showExtras = !isLoading && matched.length > 0 && !hasMore && extraSuggestions.length > 0;
  const noMatch = !isLoading && matched.length === 0;

  return (
    <div className="mt-4 rounded-xl border bg-muted/20 p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground/80">
        <GraduationCap size={12} className="text-primary" />
        졸업생 학위논문 추천
      </div>
      {isLoading ? (
        <p className="mt-2 text-[11px] text-muted-foreground">불러오는 중…</p>
      ) : noMatch ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          관심 분야와 일치하는 졸업생 논문이 아직 없습니다.
        </p>
      ) : (
        <>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {visibleMatched.map(({ thesis, hits }) => (
              <RecoCard
                key={thesis.id}
                thesis={thesis}
                hits={hits}
                inReadingList={readingList.includes(thesis.id)}
                onToggleReading={() => toggleReading(thesis.id)}
                disabled={!authUser}
              />
            ))}
          </ul>
          {hasMore && (
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => setVisible((v) => v + RECO_PAGE_SIZE)}
                className="rounded-md border bg-white px-3 py-1.5 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground"
              >
                더 많은 추천 보기 ({matched.length - visible}건 남음)
              </button>
            </div>
          )}
        </>
      )}

      {showExtras && (
        <div className="mt-4 border-t pt-3">
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            관심 외 최신 졸업생 논문
          </div>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {extraSuggestions.map((thesis) => (
              <RecoCard
                key={thesis.id}
                thesis={thesis}
                hits={[]}
                inReadingList={readingList.includes(thesis.id)}
                onToggleReading={() => toggleReading(thesis.id)}
                disabled={!authUser}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function RecoCard({
  thesis,
  hits,
  inReadingList,
  onToggleReading,
  disabled,
}: {
  thesis: AlumniThesis;
  hits: string[];
  inReadingList: boolean;
  onToggleReading: () => void;
  disabled?: boolean;
}) {
  return (
    <li className="rounded-lg border bg-white p-2.5 transition-colors hover:border-primary/40 hover:bg-primary/5">
      <div className="flex items-start gap-2">
        <Link href={`/alumni/thesis/${thesis.id}`} className="block min-w-0 flex-1">
          <p className="line-clamp-2 text-xs font-medium leading-snug">{thesis.title}</p>
          <p className="mt-1 flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
            <span className="font-medium text-foreground/70">{thesis.authorName}</span>
            <span>·</span>
            <span>{yearMonthLabel(thesis.awardedYearMonth)}</span>
          </p>
          {hits.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {hits.slice(0, 3).map((h) => (
                <span
                  key={h}
                  className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9.5px] text-primary"
                >
                  #{h}
                </span>
              ))}
            </div>
          )}
        </Link>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleReading();
          }}
          disabled={disabled}
          title={inReadingList ? "읽기 리스트에서 제거" : "읽기 리스트에 추가"}
          className={cn(
            "shrink-0 rounded-md p-1 transition-colors",
            inReadingList
              ? "bg-primary/10 text-primary hover:bg-primary/20"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
            disabled && "cursor-not-allowed opacity-40"
          )}
        >
          {inReadingList ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
        </button>
      </div>
    </li>
  );
}
