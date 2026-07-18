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
  Undo2,
  ArrowLeft,
  FlaskConical,
  BarChart3,
  BookOpen,
  PenLine,
  Clock,
  Gauge,
  MessageSquareText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { useInvalidateArchiveDraftBadge } from "@/features/admin/useArchiveDraftBadge";
import { logAudit } from "@/lib/audit";
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
import type { ArchiveReviewStatus } from "@/types/edutech-archive";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// 스프린트3 — 통합 검수 큐 · v5-H2 영속 상태 모델.
// 검수형 4개 컬렉션(연구방법·통계방법·기초용어·학술글쓰기)의 항목을 단일 리스트로 모아
// 승인/보류/편집을 한 화면에서 처리한다.
// 개념·변인·측정도구는 published 게이트가 없어(등록 즉시 공개) 큐에서 제외한다.
//
// 상태 모델(v5-H2 — ArchiveOperationalMeta):
//   - reviewStatus: draft | approved | held (부재 시 published 로부터 유추 — 하위호환)
//   - reviewNote: 보류 사유(선택), reviewedBy/reviewedByUid/reviewedAt: 검수 처리 기록
//   승인 = published:true + reviewStatus:"approved" + 검수 메타.
//   보류 = published:false + reviewStatus:"held" + reviewNote + 검수 메타 (DB 영속).
//   재검토 = reviewStatus:"draft" 로 되돌려 대기 큐로 이동.

type QueueTypeKey = "research-methods" | "statistical-methods" | "foundation-terms" | "writing-tips";

type QueueRow = {
  id: string;
  published: boolean;
  createdAt: string;
  reviewStatus?: ArchiveReviewStatus;
  reviewNote?: string;
  reviewedAt?: string;
};

type QueueApi = {
  list: () => Promise<{ data: QueueRow[] }>;
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

type QueueTab = "pending" | "held";

type QueueItem = {
  key: string; // `${type}:${id}`
  type: QueueTypeKey;
  id: string;
  name: string;
  summary: string;
  createdAt: string;
  status: ArchiveReviewStatus;
  reviewNote: string;
  reviewedAt: string;
};

/** 하위호환: reviewStatus 부재 시 published 로부터 상태 유추. */
function resolveStatus(row: QueueRow): ArchiveReviewStatus {
  const s = row.reviewStatus;
  if (s === "approved" || s === "held" || s === "draft") return s;
  return row.published ? "approved" : "draft";
}

function formatDate(iso: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

/** 이번 주(월요일 00:00 로컬) 시작 시각(ms). */
function startOfThisWeek(): number {
  const now = new Date();
  const dow = (now.getDay() + 6) % 7; // 월=0 … 일=6
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow);
  return monday.getTime();
}

function daysSince(iso: string): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, (Date.now() - t) / 86_400_000);
}

export default function ConsoleArchiveReviewQueuePage() {
  const { user } = useAuthStore();
  const allowed = isAtLeast(user, "staff");
  const invalidateBadge = useInvalidateArchiveDraftBadge();

  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<QueueTab>("pending");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const [bulkApproving, setBulkApproving] = useState(false);

  // 보류 사유 입력 다이얼로그
  const [holdTarget, setHoldTarget] = useState<QueueItem | null>(null);
  const [holdNote, setHoldNote] = useState("");
  const [holdSubmitting, setHoldSubmitting] = useState(false);

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
          const raw = row as unknown as Record<string, unknown>;
          collected.push({
            key: `${type}:${row.id}`,
            type,
            id: row.id,
            name: cfg.getName(raw) || "(이름 없음)",
            summary: cfg.getSummary(raw),
            createdAt: row.createdAt ?? "",
            status: resolveStatus(row),
            reviewNote: row.reviewNote ?? "",
            reviewedAt: row.reviewedAt ?? "",
          });
        }
      });
      // 최신 생성순 정렬
      collected.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      setItems(collected);
      setSelected(new Set());
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

  const pending = useMemo(() => items.filter((it) => it.status === "draft"), [items]);
  const held = useMemo(() => items.filter((it) => it.status === "held"), [items]);
  const active = tab === "pending" ? pending : held;

  // 품질 지표 — 이미 로드된 큐 데이터로 클라이언트 계산(신규 쿼리 없음).
  const metrics = useMemo(() => {
    const weekStart = startOfThisWeek();
    const inThisWeek = (iso: string) => {
      const t = new Date(iso).getTime();
      return !Number.isNaN(t) && t >= weekStart;
    };
    let weekApproved = 0;
    let weekHeld = 0;
    for (const it of items) {
      if (!it.reviewedAt || !inThisWeek(it.reviewedAt)) continue;
      if (it.status === "approved") weekApproved += 1;
      else if (it.status === "held") weekHeld += 1;
    }
    const waits = pending.map((it) => daysSince(it.createdAt));
    const avgWaitDays = waits.length
      ? waits.reduce((a, b) => a + b, 0) / waits.length
      : 0;
    return {
      weekApproved,
      weekHeld,
      pendingCount: pending.length,
      heldCount: held.length,
      avgWaitDays,
    };
  }, [items, pending, held]);

  const reviewerMeta = (at: string) => ({
    reviewedBy: user?.name,
    reviewedByUid: user?.id,
    reviewedAt: at,
  });

  function patchItem(key: string, patch: Partial<QueueItem>) {
    setItems((prev) => prev.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  }

  function markProcessing(key: string, on: boolean) {
    setProcessing((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function deselect(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  async function approveOne(item: QueueItem) {
    if (processing.has(item.key)) return;
    markProcessing(item.key, true);
    const nowIso = new Date().toISOString();
    const prevSnap = { status: item.status, reviewedAt: item.reviewedAt, reviewNote: item.reviewNote };
    patchItem(item.key, { status: "approved", reviewedAt: nowIso, reviewNote: "" });
    deselect(item.key);
    try {
      await QUEUE_TYPES[item.type].api.update(item.id, {
        published: true,
        reviewStatus: "approved",
        reviewNote: "",
        ...reviewerMeta(nowIso),
      });
      invalidateBadge();
      logAudit({
        action: "아카이브 검수 승인",
        category: "system",
        detail: `${QUEUE_TYPES[item.type].label} · ${item.name} 공개 승인`,
        targetId: item.id,
        targetName: item.name,
        userId: user?.id ?? "",
        userName: user?.name ?? "",
      });
      toast.success(`승인 완료 — ${item.name}`);
    } catch (err) {
      console.error("[archive-review-queue] approve failed", err);
      patchItem(item.key, prevSnap);
      toast.error(`승인 실패 — ${item.name}`);
    } finally {
      markProcessing(item.key, false);
    }
  }

  function openHold(item: QueueItem) {
    setHoldTarget(item);
    setHoldNote(item.reviewNote ?? "");
  }

  async function submitHold() {
    const item = holdTarget;
    if (!item) return;
    setHoldSubmitting(true);
    const nowIso = new Date().toISOString();
    const note = holdNote.trim();
    try {
      await QUEUE_TYPES[item.type].api.update(item.id, {
        published: false,
        reviewStatus: "held",
        reviewNote: note,
        ...reviewerMeta(nowIso),
      });
      patchItem(item.key, { status: "held", reviewNote: note, reviewedAt: nowIso });
      deselect(item.key);
      invalidateBadge();
      logAudit({
        action: "아카이브 검수 보류",
        category: "system",
        detail: `${QUEUE_TYPES[item.type].label} · ${item.name} 보류${note ? ` — ${note}` : ""}`,
        targetId: item.id,
        targetName: item.name,
        userId: user?.id ?? "",
        userName: user?.name ?? "",
      });
      toast.info(`보류 처리 — ${item.name}`);
      setHoldTarget(null);
      setHoldNote("");
    } catch (err) {
      console.error("[archive-review-queue] hold failed", err);
      toast.error(`보류 실패 — ${item.name}`);
    } finally {
      setHoldSubmitting(false);
    }
  }

  async function unholdOne(item: QueueItem) {
    if (processing.has(item.key)) return;
    markProcessing(item.key, true);
    const prevSnap = { status: item.status, reviewNote: item.reviewNote };
    patchItem(item.key, { status: "draft", reviewNote: "" });
    deselect(item.key);
    try {
      await QUEUE_TYPES[item.type].api.update(item.id, {
        reviewStatus: "draft",
        reviewNote: "",
      });
      invalidateBadge();
      toast.info(`재검토 대기로 이동 — ${item.name}`);
    } catch (err) {
      console.error("[archive-review-queue] unhold failed", err);
      patchItem(item.key, prevSnap);
      toast.error(`처리 실패 — ${item.name}`);
    } finally {
      markProcessing(item.key, false);
    }
  }

  async function approveSelected() {
    const targets = active.filter((it) => selected.has(it.key));
    if (targets.length === 0) {
      toast.error("선택된 항목이 없습니다");
      return;
    }
    setBulkApproving(true);
    const nowIso = new Date().toISOString();
    const snaps = new Map(
      targets.map((t) => [t.key, { status: t.status, reviewedAt: t.reviewedAt, reviewNote: t.reviewNote }]),
    );
    setItems((prev) =>
      prev.map((x) =>
        snaps.has(x.key)
          ? { ...x, status: "approved", reviewedAt: nowIso, reviewNote: "" }
          : x,
      ),
    );
    setSelected(new Set());
    const meta = {
      published: true,
      reviewStatus: "approved" as const,
      reviewNote: "",
      ...reviewerMeta(nowIso),
    };
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
    if (okCount > 0) {
      toast.success(`${okCount}건 일괄 승인 완료`);
      logAudit({
        action: "아카이브 검수 일괄 승인",
        category: "system",
        detail: `${okCount}건 공개 승인`,
        userId: user?.id ?? "",
        userName: user?.name ?? "",
      });
    }
    if (failed.length > 0) {
      // 실패분 상태 롤백
      setItems((prev) =>
        prev.map((x) => {
          const snap = snaps.get(x.key);
          return snap && failed.some((f) => f.key === x.key) ? { ...x, ...snap } : x;
        }),
      );
      toast.error(`${failed.length}건 승인 실패 (상태 복원됨)`);
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
    if (selected.size === active.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(active.map((it) => it.key)));
    }
  }

  function changeTab(next: QueueTab) {
    setTab(next);
    setSelected(new Set());
  }

  const perTypeCounts = useMemo(() => {
    const counts: Record<QueueTypeKey, number> = {
      "research-methods": 0,
      "statistical-methods": 0,
      "foundation-terms": 0,
      "writing-tips": 0,
    };
    for (const it of active) counts[it.type] += 1;
    return counts;
  }, [active]);

  if (!allowed) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">접근 권한이 없습니다 (staff 이상).</p>
      </div>
    );
  }

  const allSelected = active.length > 0 && selected.size === active.length;

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={ClipboardCheck}
        title="통합 검수 큐"
        description="검수형 4개 컬렉션(연구방법·통계방법·기초용어·학술글쓰기)의 항목을 한 곳에서 승인·보류하고 처리 이력을 남깁니다."
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

      {/* 품질 지표 미니 카드 (로드된 데이터로 클라이언트 계산) */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MetricCard
          icon={CheckCheck}
          label="이번 주 승인"
          value={`${metrics.weekApproved}건`}
          tone="ok"
        />
        <MetricCard
          icon={PauseCircle}
          label="이번 주 보류"
          value={`${metrics.weekHeld}건`}
          tone="warn"
        />
        <MetricCard
          icon={ClipboardCheck}
          label="대기 중"
          value={`${metrics.pendingCount}건`}
          tone="default"
        />
        <MetricCard
          icon={Clock}
          label="평균 대기"
          value={metrics.pendingCount ? `${metrics.avgWaitDays.toFixed(1)}일` : "-"}
          tone="default"
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => changeTab(v as QueueTab)}>
        <TabsList>
          <TabsTrigger value="pending">
            대기 {metrics.pendingCount}
          </TabsTrigger>
          <TabsTrigger value="held">
            보류 {metrics.heldCount}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-4">
          {/* 타입별 요약 배지 */}
          <div className="flex flex-wrap items-center gap-2">
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
          {!loading && active.length > 0 && (
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
                    ({selected.size}/{active.length} 선택됨)
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
          ) : active.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              {tab === "pending" ? (
                <>
                  <CheckCheck className="mx-auto mb-3 h-8 w-8 text-emerald-500" aria-hidden />
                  <p className="text-sm font-medium">검수 대기 항목이 없습니다</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    모든 검수형 항목이 공개되었거나 보류 처리되었습니다.
                  </p>
                </>
              ) : (
                <>
                  <PauseCircle className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden />
                  <p className="text-sm font-medium">보류된 항목이 없습니다</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    보류 처리한 항목은 사유와 함께 여기에 쌓여 재검토할 수 있습니다.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {active.map((item) => {
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
                          {tab === "held" && item.reviewNote && (
                            <p className="mt-1 flex items-start gap-1 text-xs text-amber-700 dark:text-amber-300">
                              <MessageSquareText className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                              <span className="line-clamp-2">{item.reviewNote}</span>
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
                        {tab === "pending" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openHold(item)}
                            disabled={isProcessing}
                            title="보류 — 사유를 남기고 DB에 영속(보류 탭에서 재검토)"
                          >
                            <PauseCircle className="mr-1 h-3.5 w-3.5" />
                            보류
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => unholdOne(item)}
                            disabled={isProcessing}
                            title="재검토 — 대기 큐로 되돌림"
                          >
                            <Undo2 className="mr-1 h-3.5 w-3.5" />
                            재검토
                          </Button>
                        )}
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
        </TabsContent>
      </Tabs>

      {/* 보류 사유 입력 다이얼로그 */}
      <Dialog open={holdTarget !== null} onOpenChange={(open) => { if (!open) { setHoldTarget(null); setHoldNote(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>보류 처리</DialogTitle>
            <DialogDescription>
              {holdTarget ? `${QUEUE_TYPES[holdTarget.type].label} · ${holdTarget.name}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="hold-note" className="text-sm font-medium">
              보류 사유 <span className="text-muted-foreground">(선택)</span>
            </label>
            <Textarea
              id="hold-note"
              value={holdNote}
              onChange={(e) => setHoldNote(e.target.value)}
              placeholder="예: 참고문헌 형식 재확인 필요, 요약 문장 보완 후 재검토"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              보류 사유와 처리자·시각이 DB에 영속되어 보류 탭에서 재검토할 수 있습니다.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setHoldTarget(null); setHoldNote(""); }}
              disabled={holdSubmitting}
            >
              취소
            </Button>
            <Button onClick={submitHold} disabled={holdSubmitting}>
              {holdSubmitting ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <PauseCircle className="mr-1 h-4 w-4" />
              )}
              보류 확정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
  tone: "ok" | "warn" | "default";
}) {
  const toneClass =
    tone === "ok"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : "text-muted-foreground";
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className={cn("flex items-center gap-1.5 text-xs", toneClass)}>
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
