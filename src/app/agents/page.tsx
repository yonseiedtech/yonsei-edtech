"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bot,
  Clock,
  Activity,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

function StatCard({
  icon: Icon,
  label,
  value,
  iconClass,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  iconClass: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2">
        <Icon size={16} className={iconClass} />
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

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
      className="group flex h-full flex-col rounded-xl border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-3xl">{agent.emoji}</span>
        {!isAccessible && (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            <Lock size={10} />
            {agent.minRole === "staff" ? "운영진" : agent.minRole}
          </span>
        )}
      </div>
      <h3 className="mt-3 font-semibold">{agent.name}</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        {agent.shortDescription}
      </p>
      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground/80">
        {agent.description}
      </p>
      <div className="mt-auto pt-3">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:underline">
          {isAccessible ? "실행" : "권한 필요"}
        </span>
      </div>
    </button>
  );
}

function KanbanCard({ job }: { job: AgentJob }) {
  const STATUS_ICON: Record<
    AgentJobStatus,
    { icon: React.ElementType; color: string; spin?: boolean }
  > = {
    pending: { icon: Clock, color: "text-muted-foreground" },
    running: { icon: Loader2, color: "text-blue-600", spin: true },
    completed: { icon: CheckCircle2, color: "text-green-600" },
    failed: { icon: AlertCircle, color: "text-red-500" },
  };
  const cfg = STATUS_ICON[job.status];
  const Icon = cfg.icon;
  const timeRef = job.completedAt || job.startedAt || job.createdAt;

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-start gap-2">
        <Icon
          size={14}
          className={`mt-0.5 shrink-0 ${cfg.color} ${cfg.spin ? "animate-spin" : ""}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{job.agentEmoji}</span>
            <span className="truncate text-xs font-medium text-muted-foreground">
              {job.agentName}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm font-medium">{job.title}</p>
          {job.error && (
            <p className="mt-1 line-clamp-2 text-xs text-destructive">
              {job.error}
            </p>
          )}
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{formatDistanceToNow(timeRef)}</span>
            {job.durationMs ? (
              <span>{(job.durationMs / 1000).toFixed(1)}초</span>
            ) : null}
          </div>
        </div>
      </div>
      {job.output && job.status === "completed" && (
        <p className="mt-2 line-clamp-3 rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
          {job.output}
        </p>
      )}
    </div>
  );
}

function KanbanColumn({
  title,
  status,
  jobs,
  badgeClass,
  emptyHint,
}: {
  title: string;
  status: AgentJobStatus;
  jobs: AgentJob[];
  badgeClass: string;
  emptyHint: string;
}) {
  const filtered = jobs.filter((j) => j.status === status);
  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <span
          className={`inline-flex h-6 min-w-[28px] items-center justify-center rounded-full px-2 text-xs font-medium ${badgeClass}`}
        >
          {filtered.length}
        </span>
      </div>
      <div className="mt-3 max-h-[560px] space-y-2 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            {emptyHint}
          </p>
        ) : (
          filtered.map((job) => <KanbanCard key={job.id} job={job} />)
        )}
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const { user } = useAuthStore();
  const { jobs, isLoading } = useAgentJobs(100);
  const [activeAgent, setActiveAgent] = useState<YonseiAgentDefinition | null>(
    null,
  );

  // 비로그인 안내
  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <Bot size={36} className="mx-auto text-primary" />
        <h1 className="mt-4 text-2xl font-bold">에이전트 워크플로우</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          학회 회원 전용 기능입니다. 로그인 후 이용해 주세요.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button asChild>
            <Link href="/login">로그인</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/signup">회원가입</Link>
          </Button>
        </div>
      </div>
    );
  }

  const userRoleLevel = ROLE_HIERARCHY[user.role] ?? 0;

  // 에이전트를 카테고리별로 그룹화
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
      <header className="mb-6">
        <div className="flex items-center gap-2">
          <Bot size={22} className="text-primary" />
          <h1 className="text-2xl font-bold">에이전트 워크플로우</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          학회 데이터를 활용해 자동화 작업을 수행하는 AI 에이전트입니다.
          카드를 클릭해 실행하면 아래 칸반에 실시간으로 진행 상황이 표시됩니다.
        </p>
      </header>

      {/* 통계 대시보드 */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={Bot}
          label="누적 작업"
          value={stats.total}
          iconClass="text-primary"
        />
        <StatCard
          icon={Clock}
          label="대기"
          value={stats.pending}
          iconClass="text-muted-foreground"
        />
        <StatCard
          icon={Activity}
          label="진행"
          value={stats.running}
          iconClass="text-blue-600"
        />
        <StatCard
          icon={CheckCircle2}
          label="완료"
          value={stats.completed}
          iconClass="text-green-600"
        />
      </section>

      {/* 에이전트 갤러리 */}
      <section className="mt-8">
        <div className="flex items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold">에이전트</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              학회 서비스 자동화에 활용되는 AI 에이전트들
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-6">
          {(["discovery", "research", "operations"] as const).map(
            (category) => {
              const list = agentsByCategory[category];
              if (!list || list.length === 0) return null;
              return (
                <div key={category}>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {CATEGORY_LABELS[category]}
                  </h3>
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
      <section className="mt-10">
        <div className="flex items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold">업무 워크플로우</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              내 작업 목록 · Firestore 실시간 동기화
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-4 rounded-xl border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
            <Loader2 size={20} className="mx-auto mb-2 animate-spin" />
            작업 목록을 불러오는 중…
          </div>
        ) : (
          <>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <KanbanColumn
                title="대기"
                status="pending"
                jobs={jobs}
                badgeClass="bg-muted text-muted-foreground"
                emptyHint="대기 중인 작업이 없습니다."
              />
              <KanbanColumn
                title="진행"
                status="running"
                jobs={jobs}
                badgeClass="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                emptyHint="진행 중인 작업이 없습니다."
              />
              <KanbanColumn
                title="완료"
                status="completed"
                jobs={jobs}
                badgeClass="bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                emptyHint="완료된 작업이 없습니다."
              />
            </div>

            {failedJobs.length > 0 && (
              <div className="mt-4 rounded-xl border border-red-100 bg-red-50/40 p-4 dark:border-red-950/40 dark:bg-red-950/20">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-500" />
                  <h3 className="font-semibold text-red-700 dark:text-red-300">
                    실패
                  </h3>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
                    {failedJobs.length}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {failedJobs.slice(0, 5).map((job) => (
                    <KanbanCard key={job.id} job={job} />
                  ))}
                </div>
              </div>
            )}
          </>
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
