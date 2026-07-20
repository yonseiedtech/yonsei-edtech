"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  PenLine,
  Plus,
  Pencil,
  Trash2,
  Search,
  Sparkles,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import EmptyState from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { useAuthStore } from "@/features/auth/auth-store";
import { logAudit } from "@/lib/audit";
import { isAtLeast } from "@/lib/permissions";
import { useInvalidateArchiveDraftBadge } from "@/features/admin/useArchiveDraftBadge";
import { writingTipsApi } from "@/lib/bkend";
import { seedWritingTips } from "@/lib/writing-tips-seed";
import {
  WRITING_TIP_CATEGORY_COLORS,
  WRITING_TIP_CATEGORY_LABELS,
  type WritingTip,
  type WritingTipCategory,
} from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type CategoryFilter = "all" | WritingTipCategory;
type PublishFilter = "all" | "published" | "draft";

const CATEGORY_TABS: WritingTipCategory[] = [
  "translationese",
  "subject-predicate",
  "tense-voice",
  "spelling-spacing",
  "academic-convention",
];

export default function ConsoleWritingTipsPage() {
  const { user } = useAuthStore();
  const allowed = isAtLeast(user, "staff");

  const [tips, setTips] = useState<WritingTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [publishFilter, setPublishFilter] = useState<PublishFilter>("all");
  const [q, setQ] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const invalidateBadge = useInvalidateArchiveDraftBadge();

  async function load() {
    setLoading(true);
    try {
      const res = await writingTipsApi.list();
      setTips(res.data);
      invalidateBadge();
    } catch (err) {
      console.error("[console-writing-tips] load failed", err);
      toast.error("로드 실패");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (allowed) load();
  }, [allowed]);

  async function handleSeed() {
    if (!user) return;
    if (
      !confirm(
        "학술 글쓰기 가이드 기본 시드(번역투·주술호응·시제·맞춤법·학술관례) 약 19종을 draft 로 추가합니다.\n동일 제목의 항목은 건너뜁니다. 진행하시겠습니까?",
      )
    )
      return;
    setSeeding(true);
    try {
      const r = await seedWritingTips(user.id, tips);
      toast.success(`시드 완료 — 추가 ${r.created}, 스킵 ${r.skipped}`);
      load();
    } catch (err) {
      console.error("[console-writing-tips] seed failed", err);
      toast.error(err instanceof Error ? err.message : "시드 적재 실패");
    } finally {
      setSeeding(false);
    }
  }

  async function handleDelete(t: WritingTip) {
    if (!confirm(`"${t.title}"을 삭제하시겠습니까?`)) return;
    try {
      await writingTipsApi.delete(t.id);
      logAudit({
        action: "글쓰기 팁 삭제",
        category: "system",
        detail: `"${t.title}"`,
        targetId: t.id,
        targetName: t.title,
        userId: user?.id ?? "",
        userName: user?.name ?? "",
      });
      toast.success("삭제 완료");
      load();
    } catch (err) {
      console.error("[console-writing-tips] delete failed", err);
      toast.error("삭제 실패");
    }
  }

  async function handleTogglePublish(t: WritingTip) {
    if (toggling) return;
    setToggling(t.id);
    try {
      const next = !t.published;
      await writingTipsApi.update(t.id, { published: next });
      setTips((prev) => prev.map((x) => (x.id === t.id ? { ...x, published: next } : x)));
      invalidateBadge();
      toast.success(next ? "공개 전환" : "비공개(draft) 전환");
    } catch (err) {
      console.error("[console-writing-tips] publish toggle failed", err);
      toast.error("공개 상태 변경 실패");
    } finally {
      setToggling(null);
    }
  }

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return tips.filter((t) => {
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (publishFilter === "published" && !t.published) return false;
      if (publishFilter === "draft" && t.published) return false;
      if (!term) return true;
      return (
        t.title.toLowerCase().includes(term) ||
        t.wrongExample.toLowerCase().includes(term) ||
        t.correctExample.toLowerCase().includes(term) ||
        (t.accessibleSummary ?? "").toLowerCase().includes(term) ||
        (t.tags ?? []).some((tag) => tag.toLowerCase().includes(term))
      );
    });
  }, [tips, categoryFilter, publishFilter, q]);

  if (!allowed) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">접근 권한이 없습니다 (staff 이상).</p>
      </div>
    );
  }

  const counts: Record<CategoryFilter, number> = {
    all: tips.length,
    translationese: 0,
    "subject-predicate": 0,
    "tense-voice": 0,
    "spelling-spacing": 0,
    "academic-convention": 0,
  };
  for (const t of tips) {
    counts[t.category] = (counts[t.category] ?? 0) + 1;
  }

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={PenLine}
        title="학술 글쓰기 가이드 관리"
        description="번역투·주술호응·시제·맞춤법·학술관례 CRUD · 공개 검수 게이트"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeed}
              disabled={seeding}
              title="기본 시드(약 19종) 을 draft 로 적재"
            >
              {seeding ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-4 w-4" />
              )}
              기본 시드 추가
            </Button>
            <Link href="/console/archive/writing-tips/new">
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />새 항목
              </Button>
            </Link>
          </div>
        }
      />

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="제목·예시·태그로 검색"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={publishFilter}
            onChange={(e) => setPublishFilter(e.target.value as PublishFilter)}
            className="h-9 rounded-md border bg-background px-2 text-xs"
            aria-label="공개 상태 필터"
          >
            <option value="all">전체 상태</option>
            <option value="published">공개</option>
            <option value="draft">비공개(draft)</option>
          </select>
        </div>
      </div>

      <Tabs
        value={categoryFilter}
        onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}
        className="mt-4"
      >
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="all">전체 ({counts.all})</TabsTrigger>
          {CATEGORY_TABS.map((c) => (
            <TabsTrigger key={c} value={c}>
              {WRITING_TIP_CATEGORY_LABELS[c]} ({counts[c]})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={categoryFilter}>
          {loading ? (
            <div className="mt-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState compact icon={PenLine} title="등록된 항목이 없습니다." className="mt-8" />
          ) : (
            <div className="mt-4 space-y-2">
              {filtered.map((t) => (
                <Card key={t.id}>
                  <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/console/archive/writing-tips/${t.id}/edit`}
                          className="font-medium truncate hover:text-primary hover:underline"
                        >
                          {t.title}
                        </Link>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            WRITING_TIP_CATEGORY_COLORS[t.category],
                          )}
                        >
                          {WRITING_TIP_CATEGORY_LABELS[t.category]}
                        </Badge>
                        {t.published ? (
                          <Badge
                            variant="outline"
                            className="bg-success/5 text-success border-success/20 text-[10px]"
                          >
                            공개
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-destructive/5 text-destructive border-destructive/20 text-[10px]"
                          >
                            draft
                          </Badge>
                        )}
                        {t.tags && t.tags.length > 0 && (
                          <Badge variant="outline" className="text-[10px]">
                            #{t.tags.slice(0, 2).join(" #")}
                            {t.tags.length > 2 ? ` +${t.tags.length - 2}` : ""}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                        ❌ {t.wrongExample} → ✅ {t.correctExample}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTogglePublish(t)}
                        disabled={toggling === t.id}
                        title={t.published ? "비공개로 전환" : "공개로 전환"}
                      >
                        {t.published ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Link href={`/console/archive/writing-tips/${t.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(t)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
