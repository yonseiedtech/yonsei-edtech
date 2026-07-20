"use client";

/**
 * 운영 콘솔 — 학술활동 신청 승인 통합 대시보드 (Sprint 70).
 *
 * 매칭 분석 GAP #6: 활동(프로젝트·스터디·대외학술대회) 마다 ActivityDetail 안에 신청자
 * 승인이 존재하지만, 운영진이 활동별로 들어가지 않으면 어떤 활동에 처리 대기 중인 신청이
 * 쌓여있는지 파악 어려움. 본 대시보드에서 전체 활동의 pending 신청 누적을 한 화면에서.
 * v9-H5: 미처리 가입 신청 배너 추가.
 */

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardCheck,
  Globe,
  FolderKanban,
  NotebookPen,
  Users,
  AlertCircle,
  UserPlus,
} from "lucide-react";
import { activitiesApi, activityApplicantsApi } from "@/lib/bkend";
import type { Activity, ActivityType } from "@/types";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import EmptyState from "@/components/ui/empty-state";
import { usePendingMembers } from "@/features/member/useMembers";

const TYPE_META: Record<
  ActivityType,
  { label: string; icon: React.ElementType; consoleHref: string }
> = {
  external: { label: "대외 학술대회", icon: Globe, consoleHref: "/console/academic/external" },
  project: { label: "프로젝트", icon: FolderKanban, consoleHref: "/console/academic/projects" },
  study: { label: "스터디", icon: NotebookPen, consoleHref: "/console/academic/studies" },
};

interface PendingActivity {
  activity: Activity;
  pendingCount: number;
  totalApplicants: number;
}

export default function ApplicationsConsole() {
  // v9-H5: 미처리 가입 신청 배지
  const { pendingMembers } = usePendingMembers();
  const truePendingMembers = useMemo(
    () => pendingMembers.filter((m) => !m.rejected),
    [pendingMembers],
  );

  const { data: activities, isLoading } = useQuery({
    queryKey: ["console", "all-activities"],
    queryFn: async () => {
      // 3개 type 모두 가져와 합치기 (각 type 별로 호출 → 정렬 안정성 ↑)
      const [external, project, study] = await Promise.all([
        activitiesApi.list("external"),
        activitiesApi.list("project"),
        activitiesApi.list("study"),
      ]);
      return [...external.data, ...project.data, ...study.data] as Activity[];
    },
    retry: false,
  });

  const list = useMemo(() => activities ?? [], [activities]);

  // data-split: applicants 는 activity_applicants 비공개 컬렉션에서 활동별로 조회.
  const { data: applicantsByActivity = {}, isLoading: isLoadingApplicants } = useQuery({
    queryKey: ["console", "applications-applicants", list.map((a) => a.id).join(",")],
    enabled: list.length > 0,
    retry: false,
    queryFn: async () => {
      const map: Record<string, { status?: string }[]> = {};
      await Promise.all(
        list.map(async (a) => {
          map[a.id] = await activityApplicantsApi.get(a.id);
        }),
      );
      return map;
    },
  });

  const pendingByActivity: PendingActivity[] = useMemo(() => {
    return list
      .map((a) => {
        const applicants = (applicantsByActivity[a.id] ?? []) as { status?: string }[];
        const pending = applicants.filter((x) => x.status === "pending").length;
        return { activity: a, pendingCount: pending, totalApplicants: applicants.length };
      })
      .filter((x) => x.pendingCount > 0)
      .sort((a, b) => b.pendingCount - a.pendingCount);
  }, [list, applicantsByActivity]);

  const stats = useMemo(() => {
    const total = pendingByActivity.reduce((acc, x) => acc + x.pendingCount, 0);
    const byType = { external: 0, project: 0, study: 0 } as Record<ActivityType, number>;
    for (const p of pendingByActivity) byType[p.activity.type] += p.pendingCount;
    return { activitiesWithPending: pendingByActivity.length, totalPending: total, byType };
  }, [pendingByActivity]);

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={ClipboardCheck}
        title="신청 승인 통합 대시보드"
        description="모든 학술활동의 처리 대기(pending) 신청자를 한 화면에서 확인. 활동별 진입 → 개별 승인·거절 처리."
      />

      {/* v9-H5: 미처리 가입 신청 배지 */}
      {truePendingMembers.length > 0 && (
        <Link
          href="/console/members"
          className="flex items-center gap-3 rounded-2xl border border-warning/30 bg-warning/5 px-4 py-3 transition-colors hover:bg-warning/10"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
            <UserPlus size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-warning">
              미처리 가입 신청{" "}
              <span className="rounded-full bg-warning px-2 py-0.5 text-xs text-white">
                {truePendingMembers.length}건
              </span>
            </p>
            <p className="mt-0.5 text-xs text-warning">
              승인 대기 중인 회원 가입 신청이 있습니다. 회원 관리에서 처리해주세요.
            </p>
          </div>
          <AlertCircle size={16} className="shrink-0 text-warning" />
        </Link>
      )}

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={AlertCircle}
          label="대기 활동"
          value={String(stats.activitiesWithPending)}
          color="text-warning bg-warning/5"
        />
        <StatCard
          icon={Users}
          label="총 대기 신청"
          value={String(stats.totalPending)}
          color="text-primary bg-primary/10"
        />
        <StatCard
          icon={Globe}
          label="대외 학술대회 대기"
          value={String(stats.byType.external)}
          color="text-info bg-info/5"
        />
        <StatCard
          icon={FolderKanban}
          label="프로젝트·스터디 대기"
          value={String(stats.byType.project + stats.byType.study)}
          color="text-success bg-success/5"
        />
      </div>

      {/* 활동별 pending 목록 */}
      <div className="rounded-2xl border bg-card p-5">
        <h2 className="mb-3 text-sm font-bold">
          처리 대기 중인 활동 ({pendingByActivity.length}건)
        </h2>
        {isLoading || isLoadingApplicants ? (
          <div className="py-10 text-center text-xs text-muted-foreground">불러오는 중…</div>
        ) : pendingByActivity.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="대기 중인 신청이 없습니다"
            description="모든 활동의 신청자가 승인·거절 처리되었습니다."
          />
        ) : (
          <ul className="space-y-2">
            {pendingByActivity.map(({ activity, pendingCount, totalApplicants }) => {
              const meta = TYPE_META[activity.type];
              const Icon = meta?.icon ?? Globe;
              const detailHref = `/console/academic/${activity.type === "external" ? "external" : activity.type === "project" ? "projects" : "studies"}/${activity.id}`;
              return (
                <li key={activity.id}>
                  <Link
                    href={detailHref}
                    className="group flex items-center gap-3 rounded-2xl border bg-background p-3 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold transition-colors group-hover:text-primary">
                        {activity.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {meta?.label ?? activity.type} · {activity.date}
                        {activity.endDate && ` ~ ${activity.endDate}`}
                        {" · 총 신청 "}
                        <span className="font-semibold">{totalApplicants}명</span>
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-bold text-warning">
                      대기 {pendingCount}건
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="rounded-lg border border-dashed bg-muted/10 p-3 text-[11px] leading-relaxed text-muted-foreground">
        <strong className="text-foreground">처리 방법:</strong> 활동 카드를 클릭하면 운영 콘솔 활동 상세
        페이지로 이동합니다. 거기서 신청자 카드의 ✓ (승인) / ✕ (거절) 버튼으로 일괄 처리 가능합니다.
        24시간 내 응답이 학회 운영 표준입니다.
      </p>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">{value}</p>
          <p className="text-[10px] text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}
