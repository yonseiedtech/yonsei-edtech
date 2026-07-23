"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  BookMarked, Plus, Trash2, ChevronUp, ChevronDown, Eye,
  Save, Loader2, ArrowLeft, FileText, Link2,
} from "lucide-react";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import SimpleMarkdown from "@/features/learning-guides/SimpleMarkdown";
import {
  guidesApi,
  guideChaptersApi,
  guidePagesApi,
} from "@/features/learning-guides/api";
import type { LearningGuide, GuideChapter, GuidePage } from "@/types/learning-guide";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ── 페이지 에디터 ──────────────────────────────────────────────────────────────
interface PageEditorProps {
  page: GuidePage;
  onSave: (id: string, data: Partial<GuidePage>) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
}

type EditorView = "edit" | "split" | "preview";

function PageEditor({ page, onSave, onDirtyChange }: PageEditorProps) {
  const [title, setTitle] = useState(page.title);
  const [pageType, setPageType] = useState<"native" | "embed">(page.pageType);
  const [body, setBody] = useState(page.body ?? "");
  const [embedUrl, setEmbedUrl] = useState(page.embedUrl ?? "");
  const [embedKind, setEmbedKind] = useState<"pdf" | "link" | "youtube">(page.embedKind ?? "link");
  const [view, setView] = useState<EditorView>("edit");
  const [saving, setSaving] = useState(false);

  // 페이지 변경 시 상태 동기화
  useEffect(() => {
    setTitle(page.title);
    setPageType(page.pageType);
    setBody(page.body ?? "");
    setEmbedUrl(page.embedUrl ?? "");
    setEmbedKind(page.embedKind ?? "link");
    setView("edit");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id]);

  // 미저장 변경(dirty) 판별 — 페이지 이동 경고용
  const dirty =
    title !== page.title ||
    pageType !== page.pageType ||
    (pageType === "native" && body !== (page.body ?? "")) ||
    (pageType === "embed" &&
      (embedUrl !== (page.embedUrl ?? "") || embedKind !== (page.embedKind ?? "link")));

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      await onSave(page.id, {
        title: title.trim(),
        pageType,
        body: pageType === "native" ? body : undefined,
        embedUrl: pageType === "embed" ? embedUrl.trim() : undefined,
        embedKind: pageType === "embed" ? embedKind : undefined,
      });
      toast.success("페이지 저장 완료");
    } catch (err) {
      console.error("[page-editor] save failed", err);
      toast.error("저장 실패");
    } finally {
      setSaving(false);
    }
  }

  const VIEW_TABS: { key: EditorView; label: string }[] = [
    { key: "edit", label: "에디터" },
    { key: "split", label: "분할" },
    { key: "preview", label: "미리보기" },
  ];

  return (
    <div className="space-y-4">
      {/* 페이지 제목 + dirty 배지 */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-xs">페이지 제목</Label>
          {dirty && (
            <span className="rounded bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">
              저장 안 됨
            </span>
          )}
        </div>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="페이지 제목"
        />
      </div>

      {/* 콘텐츠 타입 토글 */}
      <div>
        <Label className="text-xs">콘텐츠 타입</Label>
        <div className="mt-1 flex gap-2">
          <button
            type="button"
            onClick={() => setPageType("native")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
              pageType === "native"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            <FileText size={13} /> 마크다운 (네이티브)
          </button>
          <button
            type="button"
            onClick={() => setPageType("embed")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
              pageType === "embed"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            <Link2 size={13} /> 임베드 (PDF/유튜브/링크)
          </button>
        </div>
      </div>

      {/* 네이티브: 마크다운 에디터 (에디터/분할/미리보기) */}
      {pageType === "native" && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label className="text-xs">마크다운 본문</Label>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground tabular-nums">{body.length}자</span>
              <div className="flex items-center gap-0.5 rounded-md border p-0.5">
                {VIEW_TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setView(t.key)}
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                      view === t.key
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className={cn("gap-3", view === "split" ? "grid grid-cols-1 md:grid-cols-2" : "block")}>
            {view !== "preview" && (
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                    e.preventDefault();
                    void handleSave();
                  }
                }}
                placeholder={`# 제목\n\n본문을 마크다운으로 입력하세요.\n\n**굵게** *기울임* \`코드\`\n\n- 목록\n- 항목`}
                rows={14}
                className="font-mono text-sm resize-y"
              />
            )}
            {view !== "edit" && (
              <div className="min-h-40 overflow-auto rounded-lg border bg-card p-4">
                {body.trim() ? (
                  <SimpleMarkdown body={body} className="text-sm" />
                ) : (
                  <p className="text-xs text-muted-foreground">미리볼 내용이 없습니다.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 임베드: URL + 종류 */}
      {pageType === "embed" && (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">임베드 종류</Label>
            <select
              value={embedKind}
              onChange={(e) => setEmbedKind(e.target.value as "pdf" | "link" | "youtube")}
              className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
            >
              <option value="link">링크 카드</option>
              <option value="pdf">PDF 뷰어</option>
              <option value="youtube">유튜브</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">URL</Label>
            <Input
              value={embedUrl}
              onChange={(e) => setEmbedUrl(e.target.value)}
              placeholder={
                embedKind === "youtube"
                  ? "https://www.youtube.com/watch?v=..."
                  : embedKind === "pdf"
                  ? "https://firebasestorage.googleapis.com/.../file.pdf"
                  : "https://..."
              }
              className="mt-1 font-mono text-xs"
            />
          </div>
        </div>
      )}

      <div className="flex justify-end pt-2 border-t">
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}
          저장
        </Button>
      </div>
    </div>
  );
}

// ── 메인 에디터 ────────────────────────────────────────────────────────────────
export default function GuideEditPage() {
  const { id } = useParams<{ id: string }>();

  const [guide, setGuide] = useState<LearningGuide | null>(null);
  const [chapters, setChapters] = useState<GuideChapter[]>([]);
  const [pages, setPages] = useState<GuidePage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 메타데이터 편집 상태
  const [metaEditing, setMetaEditing] = useState(false);
  const [metaForm, setMetaForm] = useState<Partial<LearningGuide>>({});
  const [metaSaving, setMetaSaving] = useState(false);

  // 챕터 생성 상태
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [addingChapter, setAddingChapter] = useState(false);

  // 페이지 생성 상태
  const [newPageTitle, setNewPageTitle] = useState<Record<string, string>>({});
  const [addingPage, setAddingPage] = useState<string | null>(null);

  const selectedPage = pages.find((p) => p.id === selectedPageId) ?? null;

  // 페이지 에디터 미저장(dirty) 상태 — 다른 페이지 이동 시 경고
  const [pageDirty, setPageDirty] = useState(false);
  const handleDirtyChange = useCallback((d: boolean) => setPageDirty(d), []);

  function selectPage(nextId: string) {
    if (nextId === selectedPageId) return;
    if (pageDirty && !confirm("저장하지 않은 변경이 있습니다. 이동하면 사라집니다. 계속할까요?")) return;
    setSelectedPageId(nextId);
  }

  async function load() {
    setLoading(true);
    try {
      const [guideRes, chaptersRes, pagesRes] = await Promise.all([
        guidesApi.getById(id),
        guideChaptersApi.list(id),
        guidePagesApi.listByGuide(id),
      ]);
      setGuide(guideRes as unknown as LearningGuide);
      const chaps = chaptersRes.data.sort((a, b) => a.order - b.order);
      const pgs = pagesRes.data.sort((a, b) => a.order - b.order);
      setChapters(chaps);
      setPages(pgs);
      if (pgs.length > 0 && !selectedPageId) setSelectedPageId(pgs[0].id);
    } catch (err) {
      console.error("[guide-edit] load failed", err);
      toast.error("로드 실패");
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [id]);

  // 메타 편집 시작
  function startMetaEdit() {
    if (!guide) return;
    setMetaForm({
      title: guide.title,
      subtitle: guide.subtitle,
      coverEmoji: guide.coverEmoji,
      category: guide.category,
      description: guide.description,
      visibility: guide.visibility,
      status: guide.status,
      tags: guide.tags,
    });
    setMetaEditing(true);
  }

  async function saveMetadata() {
    if (!guide) return;
    setMetaSaving(true);
    try {
      const tagsValue = typeof metaForm.tags === "string"
        ? (metaForm.tags as unknown as string).split(",").map((t: string) => t.trim()).filter(Boolean)
        : metaForm.tags ?? [];
      await guidesApi.update(guide.id, { ...metaForm, tags: tagsValue });
      setGuide((prev) => prev ? { ...prev, ...metaForm, tags: tagsValue } : prev);
      setMetaEditing(false);
      toast.success("가이드 정보 저장");
    } catch (err) {
      console.error("[guide-edit] meta save failed", err);
      toast.error("저장 실패");
    } finally {
      setMetaSaving(false);
    }
  }

  // 챕터 추가
  async function addChapter() {
    if (!newChapterTitle.trim()) return;
    setAddingChapter(true);
    try {
      const res = await guideChaptersApi.create({
        guideId: id,
        title: newChapterTitle.trim(),
        order: chapters.length,
      });
      setChapters((prev) => [...prev, res.data]);
      setNewChapterTitle("");
    } catch {
      toast.error("챕터 추가 실패");
    } finally {
      setAddingChapter(false);
    }
  }

  // 챕터 순서 이동
  async function moveChapter(chapterId: string, direction: "up" | "down") {
    const idx = chapters.findIndex((c) => c.id === chapterId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= chapters.length) return;
    const next = [...chapters];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    // order 업데이트
    const updated = next.map((c, i) => ({ ...c, order: i }));
    setChapters(updated);
    try {
      await Promise.all(updated.map((c) => guideChaptersApi.update(c.id, { order: c.order })));
    } catch { toast.error("순서 변경 실패"); }
  }

  // 챕터 삭제
  async function deleteChapter(chapter: GuideChapter) {
    if (!confirm(`"${chapter.title}" 챕터와 하위 페이지를 삭제하시겠습니까?`)) return;
    try {
      await guideChaptersApi.delete(chapter.id);
      setChapters((prev) => prev.filter((c) => c.id !== chapter.id));
      setPages((prev) => prev.filter((p) => p.chapterId !== chapter.id));
    } catch { toast.error("챕터 삭제 실패"); }
  }

  // 페이지 추가
  async function addPage(chapterId: string) {
    const title = (newPageTitle[chapterId] ?? "").trim();
    if (!title) return;
    setAddingPage(chapterId);
    try {
      const chapterPages = pages.filter((p) => p.chapterId === chapterId);
      const res = await guidePagesApi.create({
        guideId: id,
        chapterId,
        title,
        order: chapterPages.length,
        anchor: `${chapterId}-${Date.now()}`,
        pageType: "native",
        body: "",
      });
      setPages((prev) => [...prev, res.data]);
      setNewPageTitle((prev) => ({ ...prev, [chapterId]: "" }));
      setSelectedPageId(res.data.id);
    } catch { toast.error("페이지 추가 실패"); }
    finally { setAddingPage(null); }
  }

  // 페이지 순서 이동
  async function movePage(pageId: string, direction: "up" | "down") {
    const page = pages.find((p) => p.id === pageId);
    if (!page) return;
    const chapterPages = pages.filter((p) => p.chapterId === page.chapterId).sort((a, b) => a.order - b.order);
    const idx = chapterPages.findIndex((p) => p.id === pageId);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= chapterPages.length) return;
    const next = [...chapterPages];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    const updated = next.map((p, i) => ({ ...p, order: i }));
    setPages((prev) => prev.map((p) => {
      const u = updated.find((u) => u.id === p.id);
      return u ? { ...p, order: u.order } : p;
    }));
    try {
      await Promise.all(updated.map((p) => guidePagesApi.update(p.id, { order: p.order })));
    } catch { toast.error("순서 변경 실패"); }
  }

  // 페이지 삭제
  async function deletePage(page: GuidePage) {
    if (!confirm(`"${page.title}" 페이지를 삭제하시겠습니까?`)) return;
    try {
      await guidePagesApi.delete(page.id);
      setPages((prev) => prev.filter((p) => p.id !== page.id));
      if (selectedPageId === page.id) setSelectedPageId(null);
    } catch { toast.error("페이지 삭제 실패"); }
  }

  // 페이지 저장 (PageEditor → 여기서 처리)
  const savePage = useCallback(async (pageId: string, data: Partial<GuidePage>) => {
    await guidePagesApi.update(pageId, data as Record<string, unknown>);
    setPages((prev) => prev.map((p) => p.id === pageId ? { ...p, ...data } : p));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="col-span-1 h-96" />
          <Skeleton className="col-span-2 h-96" />
        </div>
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        가이드를 찾을 수 없습니다.
      </div>
    );
  }

  const tagsDisplay = Array.isArray(guide.tags) ? guide.tags.join(", ") : "";

  return (
    <div className="space-y-5">
      <ConsolePageHeader
        icon={BookMarked}
        title={`편집: ${guide.title}`}
        description="챕터·페이지를 추가하고 콘텐츠를 작성하세요."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/console/learning-guides">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-1 h-3.5 w-3.5" /> 목록
              </Button>
            </Link>
            <Link href={`/learning-guides/${guide.slug}`} target="_blank">
              <Button variant="outline" size="sm">
                <Eye className="mr-1 h-3.5 w-3.5" /> 뷰어
              </Button>
            </Link>
          </div>
        }
      />

      {/* 가이드 메타 정보 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">가이드 정보</CardTitle>
            <button
              type="button"
              onClick={metaEditing ? saveMetadata : startMetaEdit}
              className="text-xs text-primary hover:underline flex items-center gap-1"
              disabled={metaSaving}
            >
              {metaSaving ? <Loader2 size={11} className="animate-spin" /> : null}
              {metaEditing ? "저장" : "편집"}
            </button>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          {metaEditing ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">제목</Label>
                <Input
                  value={metaForm.title ?? ""}
                  onChange={(e) => setMetaForm((p) => ({ ...p, title: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">표지 이모지</Label>
                <Input
                  value={metaForm.coverEmoji ?? ""}
                  onChange={(e) => setMetaForm((p) => ({ ...p, coverEmoji: e.target.value }))}
                  className="mt-1 text-center text-lg"
                  maxLength={4}
                />
              </div>
              <div>
                <Label className="text-xs">부제</Label>
                <Input
                  value={metaForm.subtitle ?? ""}
                  onChange={(e) => setMetaForm((p) => ({ ...p, subtitle: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">카테고리</Label>
                <Input
                  value={metaForm.category ?? ""}
                  onChange={(e) => setMetaForm((p) => ({ ...p, category: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">공개 범위</Label>
                <select
                  value={metaForm.visibility ?? "member"}
                  onChange={(e) => setMetaForm((p) => ({ ...p, visibility: e.target.value as LearningGuide["visibility"] }))}
                  className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                >
                  <option value="public">전체공개</option>
                  <option value="member">회원</option>
                  <option value="staff">운영진</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">발행 상태</Label>
                <select
                  value={metaForm.status ?? "draft"}
                  onChange={(e) => setMetaForm((p) => ({ ...p, status: e.target.value as LearningGuide["status"] }))}
                  className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                >
                  <option value="draft">draft</option>
                  <option value="published">발행됨</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">태그 (쉼표로 구분)</Label>
                <Input
                  value={Array.isArray(metaForm.tags) ? (metaForm.tags as string[]).join(", ") : (metaForm.tags as unknown as string) ?? ""}
                  onChange={(e) => setMetaForm((p) => ({ ...p, tags: e.target.value as unknown as string[] }))}
                  className="mt-1"
                  placeholder="양적연구, 통계"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">설명</Label>
                <Textarea
                  value={metaForm.description ?? ""}
                  onChange={(e) => setMetaForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="mt-1 resize-none"
                />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setMetaEditing(false)}>취소</Button>
                <Button size="sm" onClick={saveMetadata} disabled={metaSaving}>
                  {metaSaving && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                  저장
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-xl">{guide.coverEmoji ?? "📖"}</span>
              <span className="font-medium">{guide.title}</span>
              {guide.subtitle && <span className="text-muted-foreground text-xs">— {guide.subtitle}</span>}
              <Badge variant="outline" className={cn(
                "text-[10px]",
                guide.status === "published" ? "text-success border-success/30" : "text-muted-foreground",
              )}>
                {guide.status === "published" ? "발행됨" : "draft"}
              </Badge>
              <Badge variant="outline" className="text-[10px]">{guide.visibility}</Badge>
              {tagsDisplay && <span className="text-[11px] text-muted-foreground">{tagsDisplay}</span>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 챕터·페이지 에디터 */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        {/* 좌: 목차 트리 */}
        <div className="lg:col-span-2 space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">챕터 · 페이지</CardTitle>
            </CardHeader>
            <CardContent className="pb-4 space-y-3">
              {chapters.length === 0 && (
                <p className="text-xs text-muted-foreground">아직 챕터가 없습니다.</p>
              )}

              {chapters.map((chapter, ci) => {
                const chapterPages = pages
                  .filter((p) => p.chapterId === chapter.id)
                  .sort((a, b) => a.order - b.order);
                return (
                  <div key={chapter.id} className="rounded-lg border p-3 space-y-1.5">
                    {/* 챕터 헤더 */}
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-foreground flex-1 truncate">
                        {chapter.title}
                      </span>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button type="button" onClick={() => moveChapter(chapter.id, "up")} disabled={ci === 0}
                          className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                          <ChevronUp size={13} />
                        </button>
                        <button type="button" onClick={() => moveChapter(chapter.id, "down")} disabled={ci === chapters.length - 1}
                          className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                          <ChevronDown size={13} />
                        </button>
                        <button type="button" onClick={() => deleteChapter(chapter)}
                          className="p-0.5 text-muted-foreground hover:text-destructive">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* 페이지 목록 */}
                    <ul className="space-y-0.5 pl-2">
                      {chapterPages.map((page, pi) => (
                        <li key={page.id} className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => selectPage(page.id)}
                            className={cn(
                              "flex-1 text-left truncate rounded px-2 py-1 text-xs transition-colors",
                              selectedPageId === page.id
                                ? "bg-primary/10 font-medium text-primary"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            )}
                          >
                            {page.pageType === "embed" && <Link2 size={10} className="inline mr-1 opacity-60" />}
                            {page.title}
                          </button>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button type="button" onClick={() => movePage(page.id, "up")} disabled={pi === 0}
                              className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                              <ChevronUp size={11} />
                            </button>
                            <button type="button" onClick={() => movePage(page.id, "down")} disabled={pi === chapterPages.length - 1}
                              className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                              <ChevronDown size={11} />
                            </button>
                            <button type="button" onClick={() => deletePage(page)}
                              className="p-0.5 text-muted-foreground hover:text-destructive">
                              <Trash2 size={10} />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>

                    {/* 페이지 추가 */}
                    <div className="flex gap-1 pt-1 border-t">
                      <Input
                        value={newPageTitle[chapter.id] ?? ""}
                        onChange={(e) => setNewPageTitle((prev) => ({ ...prev, [chapter.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void addPage(chapter.id); } }}
                        placeholder="새 페이지 제목"
                        className="h-7 text-xs"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => addPage(chapter.id)}
                        disabled={addingPage === chapter.id}
                        className="h-7 px-2"
                      >
                        {addingPage === chapter.id ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                      </Button>
                    </div>
                  </div>
                );
              })}

              {/* 챕터 추가 */}
              <div className="flex gap-1 pt-1">
                <Input
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void addChapter(); } }}
                  placeholder="새 챕터 제목"
                  className="h-8 text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addChapter}
                  disabled={addingChapter}
                  className="h-8 px-2 shrink-0"
                >
                  {addingChapter ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 우: 페이지 에디터 */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-semibold truncate">
                  {selectedPage ? `페이지 편집: ${selectedPage.title}` : "페이지를 선택하세요"}
                </CardTitle>
                {selectedPage && pageDirty && (
                  <span className="shrink-0 rounded bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                    저장 안 됨
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="pb-5">
              {selectedPage ? (
                <PageEditor key={selectedPage.id} page={selectedPage} onSave={savePage} onDirtyChange={handleDirtyChange} />
              ) : (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  왼쪽 목차에서 페이지를 선택하거나 새 페이지를 추가하세요.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
