"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  Loader2,
  RefreshCw,
  Check,
  CheckCheck,
  Pencil,
  PauseCircle,
  ArrowLeft,
  FlaskConical,
  BarChart3,
  BookOpen,
  PenLine,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { useInvalidateArchiveDraftBadge } from "@/features/admin/useArchiveDraftBadge";
import {
  researchMethodsApi,
  statisticalMethodsApi,
  foundationTermsApi,
  writingTipsApi,
} from "@/lib/bkend";
import type {
  ResearchMethod,
  StatisticalMethod,
  FoundationTerm,
  WritingTip,
} from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// 스프린트3 — 통합 검수 큐.
// 검수형 4개 컬렉션(연구방법·통계방법·기초용어·학술글쓰기)의 published=false 항목을
// 단일 리스트로 모아 승인/보류/편집을 한 화면에서 처리한다.
// 개념·변인·측정도구는 published 게이트가 없어(등록 즉시 공개) 큐에서 제외한다.
//
// 상태 모델: published(boolean) + reviewedBy/reviewedByUid/reviewedAt(ArchiveOperationalMeta).
//   - 승인 = published:true + 검수 메타 기록.
//   - 보류 = 별도 rejected 플래그가 없으므로(이진 모델) 세션 내 클라이언트 dismiss.
//     (DB 상태는 draft 유지 — 나중에 다시 검수 가능)

type QueueTypeKey = "research-methods" | "statistical-methods" | "foundation-terms" | "writing-tips";

type QueueApi = {
  list: () => Promise<{ data: Array<{ id: string; published: boolean; createdAt: string }> }>;
  update: (id: string, data: Record<string, unknown>) => Promise<unknown>;
};

const QUEUE_TYPES: Record<
  QueueTypeKey,
  {
    label: string;
    icon: typeof FlaskConical;
    badgeClass: string;
    api: QueueApi;
    editHref: (id: string) => string;
    getName: (x: Record<string, unknown>) => string;
    getSummary: (x: Record<string, unknown>) => string;
  }
> = {
  "research-methods": {
    label: "연구방법",
    icon: FlaskConical,
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-200 dark:border-sky-900",
    api: researchMethodsApi as unknown as QueueApi,
    editHref: (id) => `/console/archive/research-methods/${id}/edit`,
    getName: (x) => (x as unknown as ResearchMethod).name,
    getSummary: (x) => (x as unknown as ResearchMethod).summary ?? "",
  },
  "statistical-methods": {
    label: "통계방법",
    icon: BarChart3,
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-200 dark:border-violet-900",
    api: statisticalMethodsApi as unknown as QueueApi,
    editHref: (id) => `/console/archive/statistical-methods/${id}/edit`,
    getName: (x) => (x as unknown as StatisticalMethod).name,
    getSummary: (x) => (x as unknown as StatisticalMethod).summary ?? "",
  },
  "foundation-terms": {
    label: "기초 용어",
    icon: BookOpen,
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-200 dark:border-emerald-900",
    api: foundationTermsApi as unknown as QueueApi,
    editHref: (id) => `/console/archive/foundation-terms/${id}/edit`,
    getName: (x) => (x as unknown as FoundationTerm).term,
    getSummary: (x) => (x as unknown as FoundationTerm).summary ?? "",
  },
  "writing-tips": {
    label: "학술 글쓰기",
    icon: PenLine,
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-900",
    api: writingTipsApi as unknown as QueueApi,
    editHref: (id) => `/console/archive/writing-tips/${id}/edit`,
    getName: (x) => (x as unknown as WritingTip).title,
    getSummary: (x) => (x as unknown as WritingTip).explanation ?? "",
  },
};

const QUEUE_ORDER: QueueTypeKey[] = [
  "research-methods",
  "statistical-methods",
  "foundation-terms",
  "writing-tips",
];

type QueueItem = {
  key: string; // `${type}:${id}`
  type: QueueTypeKey;
  id: string;
  name: string;
  summary: string;
  createdAt: string;
};

function formatDate(iso: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default function ConsoleArchiveReviewQueuePage() {
  const { user } = useAuthStore();
  const allowed = isAtLeast(user, "staff");
  const invalidateBadge = useInvalidateArchiveDraftBadge();

  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const [bulkApproving, setBulkApproving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const results = await Promise.all(
        QUEUE_ORDER.map((type) => QUEUE_TYPES[type].api.list()),
      );
      const collected: QueueItem[] = [];
      QUEUE_ORDER.forEach((type, idx) => {
        const cfg = QUEUE_TYPES[type];
        for (const row of results[idx].data) {
          if (row.published) continue; // 미검수(draft)만
          const raw = row as unknown as Record<string, unknown>;
          collected.push({
            key: `${type}:${row.id}`,
            type,
            id: row.id,
            name: cfg.getName(raw) || "(이름 없음)",
            summary: cfg.getSummary(raw),
            createdAt: row.createdAt ?? "",
          });
        }
      });
      // 최신 생성순 정렬
      collected.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      setItems(collected);
      setSelected(new Set());
      setDismissed(new Set());
      invalidateBadge();
    } catch (err) {
      console.error("[archive-review-queue] load failed", err);
      toast.error("검수 큐 로드 실패");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (allowed) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  // 화면에 실제 노출되는 항목 (세션 내 보류 제외)
  const visible = useMemo(
    () => items.filter((it) => !dismissed.has(it.key)),
    [items, dismissed],
  );

  const reviewMeta = () => ({
    published: true,
    reviewedBy: user?.name,
    reviewedByUid: user?.id,
    reviewedAt: new Date().toISOString(),
  });

  async function approveOne(item: QueueItem) {
    if (processing.has(item.key)) return;
    setProcessing((prev) => new Set(prev).add(item.key));
    // 낙관적 제거
    setItems((prev) => prev.filter((x) => x.key !== item.key));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(item.key);
      return next;
    });
    try {
      await QUEUE_TYPES[item.type].api.update(item.id, reviewMeta());
      invalidateBadge();
      toast.success(`승인 완료 — ${item.name}`);
    } catch (err) {
      console.error("[archive-review-queue] approve failed", err);
      // 롤백
      setItems((prev) =>
        prev.some((x) => x.key === item.key) ? prev : [item, ...prev],
      );
      toast.error(`승인 실패 — ${item.name}`);
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(item.key);
        return next;
      });
    }
  }

  function holdOne(item: QueueItem) {
    // 보류 — 이진 상태 모델상 DB 변경 없이 세션 내에서만 큐에서 숨김.
    setDismissed((prev) => new Set(prev).add(item.key));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(item.key);
      return next;
    });
    toast.info(`보류 처리 — ${item.name} (이번 세션에서만 숨김)`);
  }

  async function approveSelected() {
    const targets = visible.filter((it) => selected.has(it.key));
    if (targets.length === 0) {
      toast.error("선택된 항목이 없습니다");
      return;
    }
    setBulkApproving(true);
    const targetKeys = new Set(targets.map((t) => t.key));
    // 낙관적 제거
    setItems((prev) => prev.filter((x) => !targetKeys.has(x.key)));
    setSelected(new Set());
    const meta = reviewMeta();
    const settled = await Promise.allSettled(
      targets.map((t) => QUEUE_TYPES[t.type].api.update(t.id, meta)),
    );
    const failed: QueueItem[] = [];
    settled.forEach((r, idx) => {
      if (r.status === "rejected") {
        console.error("[archive-review-queue] bulk approve failed", targets[idx].name, r.reason);
        failed.push(targets[idx]);
      }
    });
    invalidateBadge();
    const okCount = targets.length - failed.length;
    if (okCount > 0) toast.success(`${okCount}건 일괄 승인 완료`);
    if (failed.length > 0) {
      // 실패분 롤백
      setItems((prev) => {
        const existing = new Set(prev.map((x) => x.key));
        const restore = failed.filter((f) => !existing.has(f.key));
        return [...restore, ...prev];
      });
      toast.error(`${failed.length}건 승인 실패 (목록에 복원됨)`);
    }
    setBulkApproving(false);
  }

  function toggleSelect(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === visible.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(visible.map((it) => it.key)));
    }
  }

  const perTypeCounts = useMemo(() => {
    const counts: Record<QueueTypeKey, number> = {
      "research-methods": 0,
      "statistical-methods": 0,
      "foundation-terms": 0,
      "writing-tips": 0,
    };
    for (const it of visible) counts[it.type] += 1;
    return counts;
  }, [visible]);

  if (!allowed) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">접근 권한이 없습니다 (staff 이상).</p>
      </div>
    );
  }

  const allSelected = visible.length > 0 && selected.size === visible.length;

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={ClipboardCheck}
        title="통합 검수 큐"
        description="검수형 4개 컬렉션(연구방법·통계방법·기초용어·학술글쓰기)의 미검수(draft) 항목을 한 곳에서 승인·보류합니다."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/console/archive">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-1 h-4 w-4" />
                아카이브 관리
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-4 w-4" />
              )}
              새로고침
            </Button>
          </div>
        }
      />

      {/* 타입별 요약 배지 */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-[11px]">
          전체 draft {visible.length}건
        </Badge>
        {QUEUE_ORDER.map((type) => {
          const cfg = QUEUE_TYPES[type];
          const Icon = cfg.icon;
          return (
            <Badge key={type} variant="outline" className={cn("gap-1 text-[11px]", cfg.badgeClass)}>
              <Icon className="h-3 w-3" aria-hidden />
              {cfg.label} {perTypeCounts[type]}
            </Badge>
          );
        })}
      </div>

      {/* 일괄 작업 바 */}
      {!loading && visible.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3">
          <label className="flex cursor-pointer select-none items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded border-input"
              aria-label="전체 선택"
            />
            <span>
              전체 선택{" "}
              <span className="text-muted-foreground">
                ({selected.size}/{visible.length} 선택됨)
              </span>
            </span>
          </label>
          <Button
            size="sm"
            onClick={approveSelected}
            disabled={bulkApproving || selected.size === 0}
          >
            {bulkApproving ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="mr-1 h-4 w-4" />
            )}
            선택 승인 ({selected.size})
          </Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <CheckCheck className="mx-auto mb-3 h-8 w-8 text-emerald-500" aria-hidden />
          <p className="text-sm font-medium">검수 대기 항목이 없습니다</p>
          <p className="mt-1 text-xs text-muted-foreground">
            모든 검수형 항목이 공개되었거나 이번 세션에서 보류되었습니다.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((item) => {
            const cfg = QUEUE_TYPES[item.type];
            const Icon = cfg.icon;
            const isProcessing = processing.has(item.key);
            const isSelected = selected.has(item.key);
            return (
              <Card key={item.key} className={cn(isSelected && "ring-1 ring-primary")}>
                <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(item.key)}
                      className="mt-1 h-4 w-4 shrink-0 rounded border-input"
                      aria-label={`${item.name} 선택`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={cn("gap-1 text-[10px]", cfg.badgeClass)}>
                          <Icon className="h-3 w-3" aria-hidden />
                          {cfg.label}
                        </Badge>
                        <Link
                          href={cfg.editHref(item.id)}
                          className="truncate font-medium hover:text-primary hover:underline"
                        >
                          {item.name}
                        </Link>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDate(item.createdAt)}
                        </span>
                      </div>
                      {item.summary && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {item.summary}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      onClick={() => approveOne(item)}
                      disabled={isProcessing}
                      title="공개(published=true)로 승인"
                    >
                      {isProcessing ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="mr-1 h-3.5 w-3.5" />
                      )}
                      승인
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => holdOne(item)}
                      disabled={isProcessing}
                      title="보류 — 이번 세션 큐에서 숨김 (DB 상태 유지)"
                    >
                      <PauseCircle className="mr-1 h-3.5 w-3.5" />
                      보류
                    </Button>
                    <Link href={cfg.editHref(item.id)}>
                      <Button variant="ghost" size="sm" title="상세 편집">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
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
