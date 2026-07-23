"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookMarked, Plus, Pencil, Trash2, Eye, EyeOff, Loader2, Globe, Lock, Users, Search,
} from "lucide-react";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/empty-state";
import { useAuthStore } from "@/features/auth/auth-store";
import { guidesApi } from "@/features/learning-guides/api";
import type { LearningGuide } from "@/types/learning-guide";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const VISIBILITY_ICON: Record<string, React.ElementType> = {
  public: Globe,
  member: Users,
  staff: Lock,
};

const VISIBILITY_LABEL: Record<string, string> = {
  public: "전체공개",
  member: "회원",
  staff: "운영진",
};

type StatusFilter = "all" | "published" | "draft";

function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ko-KR", { year: "2-digit", month: "short", day: "numeric" });
}

export default function ConsolelearningGuidesPage() {
  const { user } = useAuthStore();

  const [eligible, setEligible] = useState<boolean | null>(null);
  const [eligibleReason, setEligibleReason] = useState("");
  const [guides, setGuides] = useState<LearningGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  // CMS 필터 상태
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("전체");

  // 저자 자격 확인
  useEffect(() => {
    if (!user) return;
    guidesApi.authorize()
      .then((res) => {
        setEligible(res.eligible);
        setEligibleReason(res.reason);
      })
      .catch(() => setEligible(false));
  }, [user]);

  async function load() {
    setLoading(true);
    try {
      const res = await guidesApi.listAll();
      // 본인 가이드만 (staff는 전체)
      const isStaff = user?.role && ["staff", "president", "admin", "sysadmin"].includes(user.role);
      setGuides(isStaff ? res.data : res.data.filter((g) => g.authorId === user?.id));
    } catch (err) {
      console.error("[console/learning-guides] load failed", err);
      toast.error("목록 로드 실패");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (eligible) void load();
    else if (eligible === false) setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible]);

  // ── 파생: 통계·카테고리·필터 결과 ──
  const stats = useMemo(() => ({
    total: guides.length,
    published: guides.filter((g) => g.status === "published").length,
    draft: guides.filter((g) => g.status === "draft").length,
    categories: new Set(guides.map((g) => g.category).filter(Boolean)).size,
  }), [guides]);

  const categories = useMemo(
    () => ["전체", ...Array.from(new Set(guides.map((g) => g.category).filter(Boolean)))],
    [guides],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return guides
      .filter((g) => statusFilter === "all" || g.status === statusFilter)
      .filter((g) => categoryFilter === "전체" || g.category === categoryFilter)
      .filter((g) =>
        !term ||
        g.title.toLowerCase().includes(term) ||
        (g.authorName ?? "").toLowerCase().includes(term),
      )
      .sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")));
  }, [guides, q, statusFilter, categoryFilter]);

  async function handleTogglePublish(guide: LearningGuide) {
    if (toggling) return;
    setToggling(guide.id);
    try {
      const next = guide.status === "published" ? "draft" : "published";
      await guidesApi.update(guide.id, { status: next });
      setGuides((prev) => prev.map((g) => g.id === guide.id ? { ...g, status: next } : g));
      toast.success(next === "published" ? "발행 완료" : "draft로 전환");
    } catch (err) {
      console.error("[console/learning-guides] toggle publish failed", err);
      toast.error("상태 변경 실패");
    } finally {
      setToggling(null);
    }
  }

  async function handleDelete(guide: LearningGuide) {
    if (!confirm(`"${guide.title}" 가이드를 삭제하시겠습니까? 하위 챕터·페이지는 별도 삭제되지 않습니다.`)) return;
    try {
      await guidesApi.delete(guide.id);
      setGuides((prev) => prev.filter((g) => g.id !== guide.id));
      toast.success("삭제 완료");
    } catch (err) {
      console.error("[console/learning-guides] delete failed", err);
      toast.error("삭제 실패");
    }
  }

  // 자격 없음
  if (eligible === false) {
    return (
      <div className="space-y-6">
        <ConsolePageHeader
          icon={BookMarked}
          title="러닝 가이드"
          description="저자 자격이 없습니다."
        />
        <div className="rounded-xl border bg-muted/30 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {eligibleReason || "러닝 가이드 집필은 운영진·스터디 모임장·세미나 연사만 가능합니다."}
          </p>
        </div>
      </div>
    );
  }

  const STATUS_TABS: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all", label: "전체", count: stats.total },
    { key: "published", label: "발행됨", count: stats.published },
    { key: "draft", label: "draft", count: stats.draft },
  ];

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={BookMarked}
        title="러닝 가이드"
        description="학습 가이드를 작성·관리합니다."
        actions={
          eligible ? (
            <Link href="/console/learning-guides/new">
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" /> 새 가이드
              </Button>
            </Link>
          ) : undefined
        }
      />

      {/* ── 요약 통계 ── */}
      {!loading && guides.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "전체", value: stats.total, cls: "text-foreground" },
            { label: "발행됨", value: stats.published, cls: "text-success" },
            { label: "draft", value: stats.draft, cls: "text-muted-foreground" },
            { label: "카테고리", value: stats.categories, cls: "text-primary" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={cn("mt-0.5 text-2xl font-bold tabular-nums", s.cls)}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── 검색·필터 ── */}
      {!loading && guides.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setStatusFilter(t.key)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  statusFilter === t.key
                    ? "bg-primary text-primary-foreground"
                    : "border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label} <span className="tabular-nums opacity-70">{t.count}</span>
              </button>
            ))}
            {categories.length > 1 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="ml-1 rounded-md border bg-background px-2 py-1 text-xs text-foreground"
                aria-label="카테고리 필터"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c === "전체" ? "전체 카테고리" : c}</option>
                ))}
              </select>
            )}
          </div>
          <div className="relative sm:w-64">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="제목·저자 검색"
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : guides.length === 0 ? (
        <EmptyState compact icon={BookMarked} title="작성한 가이드가 없습니다." className="mt-8" />
      ) : filtered.length === 0 ? (
        <EmptyState compact icon={Search} title="조건에 맞는 가이드가 없습니다." className="mt-8" />
      ) : (
        <div className="space-y-2">
          {filtered.map((guide) => {
            const VisIcon = VISIBILITY_ICON[guide.visibility] ?? Globe;
            const updated = formatDate(guide.updatedAt);
            return (
              <Card key={guide.id}>
                <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg leading-none" role="img" aria-hidden>
                        {guide.coverEmoji ?? "📖"}
                      </span>
                      <Link
                        href={`/console/learning-guides/${guide.id}/edit`}
                        className="font-medium truncate hover:text-primary hover:underline"
                      >
                        {guide.title}
                      </Link>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          guide.status === "published"
                            ? "bg-success/5 text-success border-success/20"
                            : "bg-destructive/5 text-destructive border-destructive/20",
                        )}
                      >
                        {guide.status === "published" ? "발행됨" : "draft"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] flex items-center gap-0.5">
                        <VisIcon size={10} />
                        {VISIBILITY_LABEL[guide.visibility]}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      by {guide.authorName}
                      {guide.category && ` · ${guide.category}`}
                      {guide.chapterCount != null && ` · ${guide.chapterCount}챕터`}
                      {updated && ` · 수정 ${updated}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* 발행/draft 토글 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTogglePublish(guide)}
                      disabled={toggling === guide.id}
                      title={guide.status === "published" ? "draft로 전환" : "발행"}
                    >
                      {toggling === guide.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : guide.status === "published" ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    {/* 뷰어 미리보기 */}
                    <Link href={`/learning-guides/${guide.slug}`} target="_blank">
                      <Button variant="ghost" size="sm" title="뷰어로 보기">
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </Link>
                    {/* 편집 */}
                    <Link href={`/console/learning-guides/${guide.id}/edit`}>
                      <Button variant="ghost" size="sm">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    {/* 삭제 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(guide)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
