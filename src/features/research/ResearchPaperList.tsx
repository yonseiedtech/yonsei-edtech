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
import { Plus, Upload, BookOpen, Search, X, Save } from "lucide-react";
import { toast } from "sonner";
import type { ResearchPaper, User, RecentPaper } from "@/types";
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
import { profilesApi, dataApi } from "@/lib/bkend";
import { cn } from "@/lib/utils";

type FilterType = "all" | "thesis" | "academic";
type FilterStatus = "all" | "to_read" | "reading" | "completed";
type SortKey = "recent" | "year" | "rating";

interface Props {
  user: User;
  readOnly?: boolean;
}

export default function ResearchPaperList({ user, readOnly = false }: Props) {
  const { papers, isLoading } = useResearchPapers(user.id);
  const createPaper = useCreateResearchPaper();
  const updatePaper = useUpdateResearchPaper();
  const deletePaper = useDeleteResearchPaper();

  const [interests, setInterests] = useState<string[]>(user.researchInterests ?? []);
  const [savingInterests, setSavingInterests] = useState(false);
  const [interestsDirty, setInterestsDirty] = useState(false);

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
        toast.success(`기존 논문 ${userAny.recentPapers.length}건이 연구활동 이력으로 이전되었습니다.`);
      } catch (e) {
        console.warn("recentPapers migration failed", e);
      }
    }
    migrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const allTags = useMemo(() => {
    const m = new Map<string, number>();
    papers.forEach((p) => p.tags?.forEach((t) => m.set(t, (m.get(t) ?? 0) + 1)));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [papers]);

  const filtered = useMemo(() => {
    let arr = [...papers];
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
  }, [papers, filterType, filterStatus, activeTagFilter, search, sortKey]);

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(p: ResearchPaper) {
    setEditing(p);
    setDialogOpen(true);
  }

  async function handleSubmit(data: Partial<ResearchPaper>) {
    try {
      if (editing) {
        await updatePaper.mutateAsync({ id: editing.id, data: data as Record<string, unknown> });
        toast.success("논문이 수정되었습니다.");
      } else {
        await createPaper.mutateAsync({ ...data, userId: user.id } as Record<string, unknown>);
        toast.success("논문이 추가되었습니다.");
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
      await profilesApi.update(user.id, {
        researchInterests: interests.length > 0 ? interests : undefined,
      });
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
      </section>

      {/* 논문 리스트 헤더 */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">연구 논문 ({papers.length})</h3>
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

        {/* 검색 + 필터 */}
        {papers.length > 0 && (
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
          ) : papers.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="아직 등록된 논문이 없습니다"
              description="읽은 논문을 분석 노트로 축적해보세요. RIS 파일을 업로드하면 일괄 등록도 가능합니다."
              actionLabel={readOnly ? undefined : "첫 논문 추가"}
              onAction={readOnly ? undefined : openNew}
            />
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
            <AlertDialogTitle>논문 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{pendingDelete?.title}&quot; 분석 노트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
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
