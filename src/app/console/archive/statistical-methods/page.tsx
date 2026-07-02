"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, Plus, Pencil, Trash2, Search, Sparkles, Loader2, Eye, EyeOff } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { statisticalMethodsApi } from "@/lib/bkend";
import { seedStatisticalMethods } from "@/lib/statistical-methods-seed";
import {
  STATISTICAL_METHOD_CATEGORY_COLORS,
  STATISTICAL_METHOD_CATEGORY_LABELS,
  type StatisticalMethod,
  type StatisticalMethodCategory,
} from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type CategoryFilter = "all" | StatisticalMethodCategory;
type PublishFilter = "all" | "published" | "draft";

const CATEGORY_ORDER: StatisticalMethodCategory[] = [
  "anova_family",
  "regression",
  "factor",
  "sem",
  "mediation_moderation",
  "multilevel",
  "nonparametric",
  "other",
];

export default function ConsoleStatisticalMethodsPage() {
  const { user } = useAuthStore();
  const allowed = isAtLeast(user, "staff");

  const [methods, setMethods] = useState<StatisticalMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [publishFilter, setPublishFilter] = useState<PublishFilter>("all");
  const [q, setQ] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await statisticalMethodsApi.list();
      setMethods(res.data);
    } catch (err) {
      console.error("[console-statistical-methods] load failed", err);
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
        "교육공학 통계방법 기본 10종(ANOVA 계열·회귀·요인분석·SEM)을 draft 로 추가합니다.\n동일 이름의 항목은 건너뜁니다. 진행하시겠습니까?",
      )
    )
      return;
    setSeeding(true);
    try {
      const r = await seedStatisticalMethods(user.id, methods);
      toast.success(`시드 완료 — 추가 ${r.created}, 스킵 ${r.skipped}`);
      load();
    } catch (err) {
      console.error("[console-statistical-methods] seed failed", err);
      toast.error(err instanceof Error ? err.message : "시드 적재 실패");
    } finally {
      setSeeding(false);
    }
  }

  async function handleDelete(m: StatisticalMethod) {
    if (!confirm(`"${m.name}"을 삭제하시겠습니까?`)) return;
    try {
      await statisticalMethodsApi.delete(m.id);
      toast.success("삭제 완료");
      load();
    } catch (err) {
      console.error("[console-statistical-methods] delete failed", err);
      toast.error("삭제 실패");
    }
  }

  async function handleTogglePublish(m: StatisticalMethod) {
    if (toggling) return;
    setToggling(m.id);
    try {
      const next = !m.published;
      await statisticalMethodsApi.update(m.id, { published: next });
      setMethods((prev) =>
        prev.map((x) => (x.id === m.id ? { ...x, published: next } : x)),
      );
      toast.success(next ? "공개 전환" : "비공개(draft) 전환");
    } catch (err) {
      console.error("[console-statistical-methods] publish toggle failed", err);
      toast.error("공개 상태 변경 실패");
    } finally {
      setToggling(null);
    }
  }

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return methods.filter((m) => {
      if (categoryFilter !== "all" && m.category !== categoryFilter) return false;
      if (publishFilter === "published" && !m.published) return false;
      if (publishFilter === "draft" && m.published) return false;
      if (!term) return true;
      return (
        m.name.toLowerCase().includes(term) ||
        m.summary.toLowerCase().includes(term)
      );
    });
  }, [methods, categoryFilter, publishFilter, q]);

  const counts = useMemo(() => {
    const map: Record<CategoryFilter, number> = {
      all: methods.length,
      basic: 0,
      anova_family: 0,
      regression: 0,
      factor: 0,
      sem: 0,
      mediation_moderation: 0,
      multilevel: 0,
      nonparametric: 0,
      measurement: 0,
      other: 0,
    };
    for (const m of methods) {
      map[m.category] += 1;
    }
    return map;
  }, [methods]);

  if (!allowed) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">접근 권한이 없습니다 (staff 이상).</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={BarChart3}
        title="통계방법 가이드 관리"
        description="ANOVA·회귀·요인분석·SEM 등 통계기법 CRUD · 공개 검수 게이트"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeed}
              disabled={seeding}
              title="기본 통계방법 10종을 draft 로 적재"
            >
              {seeding ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-4 w-4" />
              )}
              기본 통계방법 시드 추가
            </Button>
            <Link href="/console/archive/statistical-methods/new">
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                새 통계방법
              </Button>
            </Link>
          </div>
        }
      />

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="이름·요약으로 검색"
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
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="all">전체 ({counts.all})</TabsTrigger>
          {CATEGORY_ORDER.map((c) => (
            <TabsTrigger key={c} value={c}>
              {STATISTICAL_METHOD_CATEGORY_LABELS[c]} ({counts[c]})
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
              {filtered.map((m) => (
                <Card key={m.id}>
                  <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/console/archive/statistical-methods/${m.id}/edit`}
                          className="font-medium truncate hover:text-primary hover:underline"
                        >
                          {m.name}
                        </Link>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px]", STATISTICAL_METHOD_CATEGORY_COLORS[m.category])}
                        >
                          {STATISTICAL_METHOD_CATEGORY_LABELS[m.category]}
                        </Badge>
                        {m.published ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                            공개
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">
                            draft
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                        {m.summary}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTogglePublish(m)}
                        disabled={toggling === m.id}
                        title={m.published ? "비공개로 전환" : "공개로 전환"}
                      >
                        {m.published ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Link href={`/console/archive/statistical-methods/${m.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(m)}
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
