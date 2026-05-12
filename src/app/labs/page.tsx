"use client";

import Link from "next/link";
import { useState } from "react";
import { useLabs } from "@/features/labs/useLabs";
import { useAuthStore } from "@/features/auth/auth-store";
import { canManageLabs } from "@/lib/permissions";
import AuthGuard from "@/features/auth/AuthGuard";
import { FlaskConical, ExternalLink, MessageSquare, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import PageHeader from "@/components/ui/page-header";
import EmptyState from "@/components/ui/empty-state";
import type { LabStatus, LabKind } from "@/types";

// ── 상태 메타 ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<LabStatus, string> = {
  draft: "준비중",
  testing: "테스트",
  feedback: "피드백",
  approved: "승인됨",
  archived: "보관",
};

// DESIGN.md §2.1 Status 컬러 매핑
const STATUS_COLOR: Record<LabStatus, string> = {
  draft:
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  testing:
    "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  feedback:
    "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
  approved:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  archived:
    "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};

// ── 필터 상수 ────────────────────────────────────────────────────────────────

const KIND_FILTERS: { k: "all" | LabKind; label: string }[] = [
  { k: "all", label: "전체" },
  { k: "external", label: "외부 링크" },
  { k: "internal", label: "내부 프로토타입" },
];

const STATUS_FILTERS: { k: "all" | "testing" | "feedback" | "approved"; label: string }[] = [
  { k: "all", label: "모든 상태" },
  { k: "testing", label: STATUS_LABEL.testing },
  { k: "feedback", label: STATUS_LABEL.feedback },
  { k: "approved", label: STATUS_LABEL.approved },
];

// ── LabCard ──────────────────────────────────────────────────────────────────

interface LabCardProps {
  lab: {
    id: string;
    title: string;
    description: string;
    kind: LabKind;
    status: LabStatus;
    ownerName: string;
    thumbnailUrl?: string;
    externalUrl?: string;
    reactionSummary?: Record<string, number>;
    commentCount?: number;
  };
}

function LabCard({ lab }: LabCardProps) {
  const reactionTop = Object.entries(lab.reactionSummary ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <Link
      href={`/labs/${lab.id}`}
      className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 rounded-2xl"
      aria-label={`${lab.title} 실험실 상세 보기`}
    >
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        {/* 섬네일 */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {lab.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lab.thumbnailUrl}
              alt={lab.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/5 via-sky-50 to-indigo-50 dark:from-primary/10 dark:via-sky-950/20 dark:to-indigo-950/20">
              <FlaskConical
                size={40}
                className="text-primary/30"
                aria-hidden
              />
            </div>
          )}
          {/* 외부 링크 배지 */}
          {lab.kind === "external" && lab.externalUrl && (
            <div className="absolute right-2 top-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                <ExternalLink size={9} aria-hidden />
                외부
              </span>
            </div>
          )}
        </div>

        {/* 본문 */}
        <div className="flex flex-1 flex-col p-5">
          {/* 배지 행 */}
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                STATUS_COLOR[lab.status],
              )}
            >
              {STATUS_LABEL[lab.status]}
            </span>
            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {lab.kind === "external" ? "외부" : "내부"}
            </span>
          </div>

          {/* 제목 */}
          <h3 className="line-clamp-1 text-base font-semibold tracking-tight transition-colors group-hover:text-primary">
            {lab.title}
          </h3>

          {/* 설명 */}
          <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground leading-relaxed">
            {lab.description}
          </p>

          {/* 하단 메타 */}
          <div className="mt-auto flex items-center justify-between pt-4 text-xs text-muted-foreground">
            <span className="truncate">by {lab.ownerName}</span>
            <div className="flex shrink-0 items-center gap-2.5">
              {reactionTop.map(([e, n]) => (
                <span key={e} className="inline-flex items-center gap-0.5" aria-label={`${e} ${n}개`}>
                  {e} {n}
                </span>
              ))}
              {(lab.commentCount ?? 0) > 0 && (
                <span className="inline-flex items-center gap-0.5" aria-label={`댓글 ${lab.commentCount}개`}>
                  <MessageSquare size={11} aria-hidden />
                  {lab.commentCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

// ── LabGridSkeleton ──────────────────────────────────────────────────────────

function LabGridSkeleton() {
  return (
    <div
      className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
      aria-busy="true"
      aria-label="실험실 목록 불러오는 중"
    >
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <Skeleton className="aspect-[4/3] rounded-none" />
          <div className="space-y-3 p-5">
            <div className="flex gap-1.5">
              <Skeleton className="h-4 w-14 rounded-full" />
              <Skeleton className="h-4 w-10 rounded-full" />
            </div>
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex justify-between pt-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── LabsContent ──────────────────────────────────────────────────────────────

function LabsContent() {
  const { labs, isLoading } = useLabs();
  const { user } = useAuthStore();
  const isStaff = canManageLabs(user);
  const [kindFilter, setKindFilter] = useState<"all" | LabKind>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "testing" | "feedback" | "approved">("all");

  const visibleLabs = isStaff ? labs : labs.filter((l) => l.status !== "draft");

  const filtered = visibleLabs.filter(
    (l) =>
      (kindFilter === "all" || l.kind === kindFilter) &&
      (statusFilter === "all" || l.status === statusFilter),
  );

  const staffActions = isStaff ? (
    <Link href="/console/labs/new">
      <Button size="sm">관리 콘솔에서 추가</Button>
    </Link>
  ) : null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 py-8 sm:py-14">
      <div className="mx-auto max-w-6xl px-4">

        {/* ── 페이지 헤더 ── */}
        <PageHeader
          icon={FlaskConical}
          title="실험실"
          description="새롭게 개발 중인 기능들을 미리 체험하고 피드백을 남겨주세요."
          actions={staffActions}
        />

        <Separator className="mt-6" />

        {/* ── 필터 ── */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {/* 종류 탭 */}
          <div
            role="tablist"
            aria-label="실험실 종류 필터"
            className="inline-flex rounded-lg border bg-muted/40 p-0.5 text-sm shadow-sm"
          >
            {KIND_FILTERS.map(({ k, label }) => (
              <button
                key={k}
                role="tab"
                aria-selected={kindFilter === k}
                onClick={() => setKindFilter(k)}
                className={cn(
                  "inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm",
                  kindFilter === k
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <span className="hidden text-muted-foreground/40 sm:inline" aria-hidden>|</span>

          {/* 상태 탭 */}
          <div
            role="tablist"
            aria-label="실험실 상태 필터"
            className="inline-flex rounded-lg border bg-muted/40 p-0.5 text-sm shadow-sm"
          >
            {STATUS_FILTERS.map(({ k, label }) => (
              <button
                key={k}
                role="tab"
                aria-selected={statusFilter === k}
                onClick={() => setStatusFilter(k)}
                className={cn(
                  "inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm",
                  statusFilter === k
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 결과 수 */}
          {!isLoading && (
            <Badge variant="secondary" className="ml-auto shrink-0 tabular-nums">
              {filtered.length}건
            </Badge>
          )}
        </div>

        {/* ── 본문 ── */}
        <div className="mt-6">
          {isLoading ? (
            <LabGridSkeleton />
          ) : filtered.length === 0 ? (
            visibleLabs.length === 0 ? (
              <EmptyState
                icon={FlaskConical}
                title="아직 등록된 실험실이 없습니다"
                description="새로운 기능이 준비되면 여기에 나타납니다."
                {...(isStaff
                  ? { actionLabel: "첫 실험 등록하기", actionHref: "/console/labs/new" }
                  : {})}
              />
            ) : (
              <EmptyState
                icon={AlertCircle}
                title="조건에 맞는 실험실이 없습니다"
                description="필터를 변경하면 더 많은 실험실을 볼 수 있습니다."
                actionLabel="필터 초기화"
                onAction={() => {
                  setKindFilter("all");
                  setStatusFilter("all");
                }}
              />
            )
          ) : (
            <div
              className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
              role="list"
              aria-label="실험실 목록"
            >
              {filtered.map((l) => (
                <div key={l.id} role="listitem">
                  <LabCard lab={l} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LabsPage() {
  return (
    <AuthGuard>
      <LabsContent />
    </AuthGuard>
  );
}
