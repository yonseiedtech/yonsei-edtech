"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Clock,
  Activity,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import InlineNotification from "@/components/ui/inline-notification";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { useAuthStore } from "@/features/auth/auth-store";
import { ROLE_HIERARCHY } from "@/lib/permissions";
import {
  YONSEI_AGENTS,
  CATEGORY_LABELS,
} from "@/features/yonsei-agents/agents-config";
import type {
  YonseiAgentDefinition,
  AgentJob,
  AgentJobStatus,
} from "@/features/yonsei-agents/types";
import { useAgentJobs } from "@/features/yonsei-agents/useAgentJobs";
import AgentRunDialog from "@/features/yonsei-agents/AgentRunDialog";
import { formatDistanceToNow } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* StatCard                                                             */
/* ------------------------------------------------------------------ */
function StatCard({
  icon: Icon,
  label,
  value,
  iconContainerClass,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  iconContainerClass: string;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconContainerClass}`}
        >
          <Icon size={18} />
        </div>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AgentGalleryCard                                                     */
/* ------------------------------------------------------------------ */
function AgentGalleryCard({
  agent,
  isAccessible,
  onRun,
}: {
  agent: YonseiAgentDefinition;
  isAccessible: boolean;
  onRun: () => void;
}) {
  return (
    <button
      type="button"
      onClick={isAccessible ? onRun : undefined}
      disabled={!isAccessible}
      aria-label={`${agent.name} 에이전트 ${isAccessible ? "실행" : "(권한 필요)"}`}
      className="group flex h-full flex-col rounded-2xl border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
    >
      {/* 헤더 행 */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-3xl leading-none" aria-hidden>
          {agent.emoji}
        </span>
        {!isAccessible ? (
          <Badge variant="secondary" className="shrink-0 gap-1">
            <Lock size={10} aria-hidden />
            {agent.minRole === "staff" ? "운영진" : agent.minRole}
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="shrink-0 gap-1 border-primary/30 text-primary"
          >
            <Zap size={10} aria-hidden />
            실행 가능
          </Badge>
        )}
      </div>

      {/* 이름 + 설명 */}
      <h3 className="mt-3 font-semibold leading-snug">{agent.name}</h3>
      <p className="mt-1 text-xs font-medium text-primary/80">
        {agent.shortDescription}
      </p>
      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {agent.description}
      </p>

      {/* 하단 액션 힌트 */}
      <div className="mt-auto pt-4">
        <span
          className={`inline-flex items-center gap-1 text-xs font-medium transition-colors ${
            isAccessible
              ? "text-primary group-hover:underline"
              : "text-muted-foreground"
          }`}
        >
          {isAccessible ? "클릭하여 실행 →" : "권한 필요"}
        </span>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* KanbanCard                                                           */
/* ------------------------------------------------------------------ */
const STATUS_CONFIG: Record<
  AgentJobStatus,
  { icon: LucideIcon; colorClass: string; spin?: boolean; badgeClass: string }
> = {
  pending: {
    icon: Clock,
    colorClass: "text-muted-foreground",
    badgeClass: "bg-muted text-muted-foreground",
  },
  running: {
    icon: Loader2,
    colorClass: "text-blue-600 dark:text-blue-400",
    spin: true,
    badgeClass:
      "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  },
  completed: {
    icon: CheckCircle2,
    colorClass: "text-emerald-600 dark:text-emerald-400",
    badgeClass:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  failed: {
    icon: AlertCircle,
    colorClass: "text-rose-500 dark:text-rose-400",
    badgeClass:
      "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  },
};

function KanbanCard({ job }: { job: AgentJob }) {
  const cfg = STATUS_CONFIG[job.status];
  const Icon = cfg.icon;
  const timeRef = job.completedAt || job.startedAt || job.createdAt;

  return (
    <article className="animate-in fade-in slide-in-from-bottom-2 duration-300 rounded-2xl border bg-card p-3 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-2">
        <Icon
          size={14}
          aria-hidden
          className={`mt-0.5 shrink-0 ${cfg.colorClass} ${cfg.spin ? "animate-spin" : ""}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm leading-none" aria-hidden>
              {job.agentEmoji}
            </span>
            <span className="truncate text-xs font-medium text-muted-foreground">
              {job.agentName}
            </span>
          </div>
          <p className="mt-1.5 line-clamp-2 text-sm font-medium leading-snug">
            {job.title}
          </p>
          {job.error && (
            <p className="mt-1 line-clamp-2 text-xs text-destructive">
              {job.error}
            </p>
          )}
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <time dateTime={timeRef}>{formatDistanceToNow(timeRef)}</time>
            {job.durationMs != null && (
              <span>{(job.durationMs / 1000).toFixed(1)}초</span>
            )}
          </div>
        </div>
      </div>

      {job.output && job.status === "completed" && (
        <div className="mt-2.5 rounded-lg bg-muted/50 p-2.5">
          <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
            {job.output}
          </p>
        </div>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* KanbanColumn                                                         */
/* ------------------------------------------------------------------ */
function KanbanColumn({
  title,
  status,
  jobs,
  emptyHint,
  emptyIcon,
}: {
  title: string;
  status: AgentJobStatus;
  jobs: AgentJob[];
  emptyHint: string;
  emptyIcon: LucideIcon;
}) {
  const cfg = STATUS_CONFIG[status];
  const filtered = jobs.filter((j) => j.status === status);

  return (
    <section
      aria-label={`${title} 작업 목록`}
      className="flex flex-col rounded-2xl border bg-muted/20 p-4"
    >
      {/* 컬럼 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span
          className={`inline-flex h-6 min-w-[28px] items-center justify-center rounded-full px-2 text-xs font-semibold ${cfg.badgeClass}`}
          aria-label={`${filtered.length}건`}
        >
          {filtered.length}
        </span>
      </div>

      {/* 작업 목록 */}
      <div className="mt-3 max-h-[560px] flex-1 space-y-2 overflow-y-auto pr-0.5">
        {filtered.length === 0 ? (
          <EmptyState
            icon={emptyIcon}
            title={emptyHint}
            compact
          />
        ) : (
          filtered.map((job) => <KanbanCard key={job.id} job={job} />)
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 메인 페이지                                                           */
/* ------------------------------------------------------------------ */
export default function AgentsPage() {
  const { user } = useAuthStore();
  const { jobs, isLoading } = useAgentJobs(100);
  const [activeAgent, setActiveAgent] = useState<YonseiAgentDefinition | null>(
    null,
  );

  /* 비로그인 */
  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          icon={Bot}
          title="에이전트 워크플로우"
          description="학회 운영 자동화 도구입니다. 로그인 후 이용해 주세요."
          actionLabel="로그인"
          actionHref="/login"
        />
      </div>
    );
  }

  const userRoleLevel = ROLE_HIERARCHY[user.role] ?? 0;
  const ADMIN_LEVEL = ROLE_HIERARCHY["admin"] ?? 0;

  /* 관리자 미만 접근 차단 */
  if (userRoleLevel < ADMIN_LEVEL) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          icon={Lock}
          title="관리자 전용 영역"
          description="에이전트 워크플로우는 학회 운영 자동화 도구로, 관리자(admin) 이상만 사용할 수 있습니다."
          actions={[{ label: "홈으로", href: "/", variant: "outline" }]}
        />
      </div>
    );
  }

  /* 에이전트를 카테고리별로 그룹화 */
  const agentsByCategory = YONSEI_AGENTS.reduce<
    Record<string, YonseiAgentDefinition[]>
  >((acc, agent) => {
    const k = agent.category;
    if (!acc[k]) acc[k] = [];
    acc[k].push(agent);
    return acc;
  }, {});

  const stats = {
    total: jobs.length,
    pending: jobs.filter((j) => j.status === "pending").length,
    running: jobs.filter((j) => j.status === "running").length,
    completed: jobs.filter((j) => j.status === "completed").length,
  };

  const failedJobs = jobs.filter((j) => j.status === "failed");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* 헤더 */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 mb-8">
        <ConsolePageHeader
          icon={Bot}
          title="에이전트 워크플로우"
          description="학회 운영 업무를 자동화하는 AI 에이전트입니다. 카드를 클릭해 실행하면 아래 칸반에 실시간으로 진행 상황이 표시됩니다."
          actions={
            <Badge className="rounded-full px-3 py-1 text-xs">관리자</Badge>
          }
        />
      </div>

      {/* 통계 대시보드 */}
      <section aria-label="작업 통계" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={Bot}
          label="누적 작업"
          value={stats.total}
          iconContainerClass="bg-primary/10 text-primary"
        />
        <StatCard
          icon={Clock}
          label="대기"
          value={stats.pending}
          iconContainerClass="bg-muted text-muted-foreground"
        />
        <StatCard
          icon={Activity}
          label="진행"
          value={stats.running}
          iconContainerClass="bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
        />
        <StatCard
          icon={CheckCircle2}
          label="완료"
          value={stats.completed}
          iconContainerClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
        />
      </section>

      {/* 에이전트 갤러리 */}
      <section aria-label="에이전트 목록" className="mt-10">
        <div className="mb-1">
          <h2 className="text-lg font-bold tracking-tight">에이전트</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            학회 서비스 자동화에 활용되는 AI 에이전트들
          </p>
        </div>

        <div className="mt-5 space-y-8">
          {(["discovery", "research", "operations"] as const).map(
            (category) => {
              const list = agentsByCategory[category];
              if (!list || list.length === 0) return null;
              return (
                <div
                  key={category}
                  className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                >
                  {/* 카테고리 구분선 */}
                  <div className="mb-4 flex items-center gap-3">
                    <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {CATEGORY_LABELS[category]}
                    </span>
                    <div className="flex-1 border-t border-border" />
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {list.length}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((agent) => {
                      const accessible =
                        userRoleLevel >= (ROLE_HIERARCHY[agent.minRole] ?? 0);
                      return (
                        <AgentGalleryCard
                          key={agent.id}
                          agent={agent}
                          isAccessible={accessible}
                          onRun={() => setActiveAgent(agent)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            },
          )}
        </div>
      </section>

      {/* 칸반 워크플로우 */}
      <section aria-label="업무 워크플로우" className="mt-12">
        <div className="mb-5">
          <h2 className="text-lg font-bold tracking-tight">업무 워크플로우</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            내 작업 목록 · Firestore 실시간 동기화
          </p>
        </div>

        {/* 실패 작업 배너 (있는 경우만) */}
        {!isLoading && failedJobs.length > 0 && (
          <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <InlineNotification
              kind="error"
              title={`실패한 작업 ${failedJobs.length}건이 있습니다`}
              description="아래 실패 컬럼에서 오류 상세를 확인하고 필요 시 다시 실행하세요."
            />
          </div>
        )}

        {isLoading ? (
          <div
            className="animate-in fade-in duration-300 grid gap-4 md:grid-cols-3"
            aria-busy="true"
            aria-label="작업 목록 불러오는 중"
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border bg-muted/20 p-4 space-y-3">
                <Skeleton className="h-4 w-24 rounded-full" />
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            ))}
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 grid gap-4 md:grid-cols-3 lg:grid-cols-4">
            <KanbanColumn
              title="대기"
              status="pending"
              jobs={jobs}
              emptyHint="대기 중인 작업이 없습니다"
              emptyIcon={Clock}
            />
            <KanbanColumn
              title="진행"
              status="running"
              jobs={jobs}
              emptyHint="진행 중인 작업이 없습니다"
              emptyIcon={Activity}
            />
            <KanbanColumn
              title="완료"
              status="completed"
              jobs={jobs}
              emptyHint="완료된 작업이 없습니다"
              emptyIcon={CheckCircle2}
            />
            <KanbanColumn
              title="실패"
              status="failed"
              jobs={jobs}
              emptyHint="실패한 작업이 없습니다"
              emptyIcon={AlertCircle}
            />
          </div>
        )}
      </section>

      {/* 실행 다이얼로그 */}
      <AgentRunDialog
        agent={activeAgent}
        open={!!activeAgent}
        onClose={() => setActiveAgent(null)}
      />
    </div>
  );
}
