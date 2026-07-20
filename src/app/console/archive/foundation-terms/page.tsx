"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
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
import { foundationTermsApi } from "@/lib/bkend";
import { refreshFoundationTermsMeta, seedFoundationTerms } from "@/lib/foundation-terms-seed";
import {
  FOUNDATION_TERM_CATEGORY_COLORS,
  FOUNDATION_TERM_CATEGORY_LABELS,
  type FoundationTerm,
  type FoundationTermCategory,
} from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type CategoryFilter = "all" | FoundationTermCategory;
type PublishFilter = "all" | "published" | "draft";

const CATEGORY_TABS: FoundationTermCategory[] = [
  "variables",
  "research-design",
  "instructional-design",
  "systems-theory",
  "measurement",
  "learning-theory",
];

export default function ConsoleFoundationTermsPage() {
  const { user } = useAuthStore();
  const allowed = isAtLeast(user, "staff");

  const [terms, setTerms] = useState<FoundationTerm[]>([]);
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
      const res = await foundationTermsApi.list();
      setTerms(res.data);
      invalidateBadge();
    } catch (err) {
      console.error("[console-foundation-terms] load failed", err);
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
        "교육공학 기초 용어 시드 약 22종을 draft 로 추가합니다.\n동일 용어(term) 의 항목은 건너뜁니다. 진행하시겠습니까?",
      )
    )
      return;
    setSeeding(true);
    try {
      const r = await seedFoundationTerms(user.id, terms);
      toast.success(`시드 완료 — 추가 ${r.created}, 스킵 ${r.skipped}`);
      load();
    } catch (err) {
      console.error("[console-foundation-terms] seed failed", err);
      toast.error(err instanceof Error ? err.message : "시드 적재 실패");
    } finally {
      setSeeding(false);
    }
  }

  async function handleRefreshMeta() {
    if (!user) return;
    if (
      !confirm(
        "기존 용어의 메타 필드를 시드 기준으로 갱신합니다.\n(AECT 공식 역어 채움 + 비어 있는 영문명/약어 보충 — 요약·정의 등 본문은 보존)\n진행하시겠습니까?",
      )
    )
      return;
    setSeeding(true);
    try {
      const r = await refreshFoundationTermsMeta(terms);
      toast.success(`메타 갱신 완료 — 갱신 ${r.updated}, 변경없음 ${r.skipped}, 미존재 ${r.notFound}`);
      load();
    } catch (err) {
      console.error("[console-foundation-terms] refresh meta failed", err);
      toast.error(err instanceof Error ? err.message : "메타 갱신 실패");
    } finally {
      setSeeding(false);
    }
  }

  async function handleDelete(t: FoundationTerm) {
    if (!confirm(`"${t.term}"을 삭제하시겠습니까?`)) return;
    try {
      await foundationTermsApi.delete(t.id);
      logAudit({
        action: "아카이브 기초용어 삭제",
        category: "system",
        detail: `"${t.term}"`,
        targetId: t.id,
        targetName: t.term,
        userId: user?.id ?? "",
        userName: user?.name ?? "",
      });
      toast.success("삭제 완료");
      load();
    } catch (err) {
      console.error("[console-foundation-terms] delete failed", err);
      toast.error("삭제 실패");
    }
  }

  async function handleTogglePublish(t: FoundationTerm) {
    if (toggling) return;
    setToggling(t.id);
    try {
      const next = !t.published;
      await foundationTermsApi.update(t.id, { published: next });
      setTerms((prev) => prev.map((x) => (x.id === t.id ? { ...x, published: next } : x)));
      invalidateBadge();
      toast.success(next ? "공개 전환" : "비공개(draft) 전환");
    } catch (err) {
      console.error("[console-foundation-terms] publish toggle failed", err);
      toast.error("공개 상태 변경 실패");
    } finally {
      setToggling(null);
    }
  }

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return terms.filter((t) => {
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (publishFilter === "published" && !t.published) return false;
      if (publishFilter === "draft" && t.published) return false;
      if (!term) return true;
      return (
        t.term.toLowerCase().includes(term) ||
        t.summary.toLowerCase().includes(term) ||
        (t.abbreviation ?? "").toLowerCase().includes(term) ||
        (t.englishName ?? "").toLowerCase().includes(term)
      );
    });
  }, [terms, categoryFilter, publishFilter, q]);

  if (!allowed) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">접근 권한이 없습니다 (staff 이상).</p>
      </div>
    );
  }

  const counts: Record<CategoryFilter, number> = {
    all: terms.length,
    variables: 0,
    "research-design": 0,
    "instructional-design": 0,
    "systems-theory": 0,
    measurement: 0,
    "learning-theory": 0,
  };
  for (const t of terms) {
    counts[t.category] = (counts[t.category] ?? 0) + 1;
  }

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={BookOpen}
        title="기초 용어 가이드 관리"
        description="변인·연구설계·교수설계·체제이론·측정·학습이론 용어 CRUD · 공개 검수 게이트"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeed}
              disabled={seeding}
              title="기본 시드(약 22종) 을 draft 로 적재"
            >
              {seeding ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-4 w-4" />
              )}
              기본 시드 추가
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshMeta}
              disabled={seeding}
              title="기존 용어에 AECT 공식 역어·비어 있는 영문명/약어를 시드 기준으로 채움 (본문 보존)"
            >
              {seeding ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-4 w-4" />
              )}
              메타 갱신
            </Button>
            <Link href="/console/archive/foundation-terms/new">
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />새 용어
              </Button>
            </Link>
          </div>
        }
      />

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="용어·요약·약어·영문으로 검색"
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
              {FOUNDATION_TERM_CATEGORY_LABELS[c]} ({counts[c]})
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
            <div className="mt-8 rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
              등록된 항목이 없습니다.
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {filtered.map((t) => (
                <Card key={t.id}>
                  <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/console/archive/foundation-terms/${t.id}/edit`}
                          className="font-medium truncate hover:text-primary hover:underline"
                        >
                          {t.term}
                          {t.abbreviation && (
                            <span className="ml-1 text-xs font-normal text-muted-foreground">
                              ({t.abbreviation})
                            </span>
                          )}
                        </Link>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            FOUNDATION_TERM_CATEGORY_COLORS[t.category],
                          )}
                        >
                          {FOUNDATION_TERM_CATEGORY_LABELS[t.category]}
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
                        {t.confusedWith && t.confusedWith.length > 0 && (
                          <Badge variant="outline" className="text-[10px]">
                            confused {t.confusedWith.length}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                        {t.summary}
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
                      <Link href={`/console/archive/foundation-terms/${t.id}/edit`}>
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
