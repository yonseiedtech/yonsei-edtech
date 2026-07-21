"use client";

/**
 * 진도 미팅 목록 (2026-06-11 — 오케스트라 사이클 신규 기능)
 *
 * 기능완성도 분석 #14: 미팅 진행 화면(/progress-meetings/[id])은 완성돼 있으나
 * 목록 라우트가 없어 진행 중인 미팅을 다시 찾기 어려웠다(고아 페이지).
 * 진행 중 → 시작 전 → 완료 순으로 그룹핑해 한 화면에서 입장한다.
 */

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Timer,
  Play,
  Pause,
  CheckCircle2,
  CalendarClock,
  ChevronRight,
  Presentation,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AuthGuard from "@/features/auth/AuthGuard";
import PageContainer from "@/components/ui/page-container";
import PageHeader from "@/components/ui/page-header";
import EmptyState from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { activitiesApi, progressMeetingsApi } from "@/lib/bkend";
import type { Activity, ProgressMeeting, ProgressMeetingStatus } from "@/types";

const STATUS_META: Record<
  ProgressMeetingStatus,
  { label: string; icon: React.ElementType; cls: string }
> = {
  running: { label: "진행 중", icon: Play, cls: "bg-success/5 text-success" },
  paused: { label: "일시정지", icon: Pause, cls: "bg-warning/5 text-warning" },
  planning: { label: "시작 전", icon: CalendarClock, cls: "bg-info/5 text-info" },
  completed: { label: "완료", icon: CheckCircle2, cls: "bg-muted text-muted-foreground" },
};

function totalEstimated(m: ProgressMeeting): number {
  return (m.sections ?? []).reduce((s, x) => s + (x.estimatedMinutes || 0), 0);
}

function MeetingCard({ meeting, activityTitle }: { meeting: ProgressMeeting; activityTitle: string }) {
  const meta = STATUS_META[meeting.status] ?? STATUS_META.planning;
  const Icon = meta.icon;
  const done = (meeting.sections ?? []).filter((s) => s.endedAt).length;
  const total = (meeting.sections ?? []).length;
  const when = meeting.startedAt ?? meeting.createdAt;
  return (
    <li>
      <Link
        href={`/progress-meetings/${meeting.id}`}
        className="flex items-center gap-3 rounded-2xl border bg-card p-4 transition-shadow hover:shadow-md"
      >
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", meta.cls)}>
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-sm font-semibold">{activityTitle}</span>
            <Badge variant="secondary" className={cn("text-[10px]", meta.cls)}>{meta.label}</Badge>
            {meeting.status === "running" && (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            아젠다 {done}/{total} · 예상 {totalEstimated(meeting)}분
            {when && ` · ${new Date(when).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`}
          </p>
        </div>
        <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}

function MeetingsContent() {
  const { data: meetings = [], isLoading: meetingsLoading } = useQuery({
    queryKey: ["progress-meetings", "list"],
    queryFn: async () => (await progressMeetingsApi.listRecent()).data as ProgressMeeting[],
  });

  // 활동명 매핑 (3타입 일괄 — 기존 콘솔 패턴 재사용)
  const { data: activities = [] } = useQuery({
    queryKey: ["activities", "all-for-meetings"],
    queryFn: async () => {
      const [external, project, study] = await Promise.all([
        activitiesApi.list("external"),
        activitiesApi.list("project"),
        activitiesApi.list("study"),
      ]);
      return [...external.data, ...project.data, ...study.data] as Activity[];
    },
  });
  const titleById = useMemo(() => new Map(activities.map((a) => [a.id, a.title])), [activities]);

  const groups = useMemo(() => {
    const sorted = [...meetings].sort((a, b) =>
      (b.startedAt ?? b.createdAt ?? "").localeCompare(a.startedAt ?? a.createdAt ?? ""),
    );
    return {
      active: sorted.filter((m) => m.status === "running" || m.status === "paused"),
      planning: sorted.filter((m) => m.status === "planning"),
      completed: sorted.filter((m) => m.status === "completed").slice(0, 10),
    };
  }, [meetings]);

  const title = (m: ProgressMeeting) => titleById.get(m.activityId) ?? "학술활동";

  return (
    <PageContainer width="default">
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <PageHeader
          icon={Presentation}
          title="진도 미팅"
          description="스터디·프로젝트 회의를 아젠다 타이머와 함께 진행하세요. 미팅은 각 활동의 주차 페이지에서 만들 수 있습니다."
        />
        <Separator className="mt-6" />

        {meetingsLoading ? (
          <div className="mt-6 space-y-2">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        ) : meetings.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={Timer}
              title="아직 진행한 미팅이 없습니다"
              description="참여 중인 스터디·프로젝트의 주차 페이지에서 '미팅 시작'으로 첫 회의를 열어보세요."
              actionLabel="내 학술활동 보기"
              actionHref="/activities"
            />
          </div>
        ) : (
          <div className="mt-6 space-y-8">
            {groups.active.length > 0 && (
              <section>
                <h2 className="text-sm font-bold">🔴 진행 중인 미팅</h2>
                <ul className="mt-3 space-y-2">
                  {groups.active.map((m) => (
                    <MeetingCard key={m.id} meeting={m} activityTitle={title(m)} />
                  ))}
                </ul>
              </section>
            )}
            {groups.planning.length > 0 && (
              <section>
                <h2 className="text-sm font-bold">📋 시작 전</h2>
                <ul className="mt-3 space-y-2">
                  {groups.planning.map((m) => (
                    <MeetingCard key={m.id} meeting={m} activityTitle={title(m)} />
                  ))}
                </ul>
              </section>
            )}
            {groups.completed.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-muted-foreground">완료된 미팅 (최근 10)</h2>
                <ul className="mt-3 space-y-2">
                  {groups.completed.map((m) => (
                    <MeetingCard key={m.id} meeting={m} activityTitle={title(m)} />
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </PageContainer>
  );
}

export default function ProgressMeetingsPage() {
  return (
    <AuthGuard>
      <MeetingsContent />
    </AuthGuard>
  );
}
