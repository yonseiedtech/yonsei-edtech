"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Users, ArrowRight } from "lucide-react";
import { activitiesApi } from "@/lib/bkend";
import type { Activity, ActivityType } from "@/types";
import { useAuthStore } from "@/features/auth/auth-store";
import WidgetCard from "@/components/ui/widget-card";
import EmptyState from "@/components/ui/empty-state";
import SkeletonWidget from "@/components/ui/skeleton-widget";

const TYPE_LABELS: Record<ActivityType, string> = {
  study: "스터디",
  project: "프로젝트",
  external: "대외학술활동",
};

const TYPE_ROUTE: Record<ActivityType, string> = {
  study: "/activities/studies",
  project: "/activities/projects",
  external: "/activities/external",
};

interface ActivityFlat extends Activity {
  participants?: string[];
  members?: string[];
}

function isUserInvolved(a: ActivityFlat, userId: string): boolean {
  if (a.leaderId === userId) return true;
  if (Array.isArray(a.members) && a.members.includes(userId)) return true;
  if (Array.isArray(a.participants) && a.participants.includes(userId)) return true;
  return false;
}

export default function MyAcademicActivitiesWidget() {
  const { user } = useAuthStore();

  const { data: all = [], isLoading } = useQuery({
    queryKey: ["dashboard-my-activities"],
    queryFn: async () => {
      const res = await activitiesApi.list();
      return res.data as ActivityFlat[];
    },
    staleTime: 60_000,
    enabled: !!user,
  });

  const myActive = useMemo(() => {
    if (!user) return [] as ActivityFlat[];
    return all
      .filter((a) => a.status !== "completed")
      .filter((a) => isUserInvolved(a, user.id))
      .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
      .slice(0, 5);
  }, [all, user]);

  if (!user) return null;

  if (isLoading) {
    return <SkeletonWidget rows={3} />;
  }

  const headerActions = (
    <Link
      href="/mypage/activities"
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
    >
      전체 보기 <ArrowRight size={11} />
    </Link>
  );

  return (
    <WidgetCard
      title="참여 중인 학술활동"
      icon={ClipboardList}
      actions={headerActions}
    >
      {myActive.length === 0 ? (
        <EmptyState
          icon={Users}
          title="참여 중인 학술활동이 없어요"
          description="스터디·프로젝트·대외학술활동에 참여해 보세요."
          compact
          className="mt-4 bg-transparent"
          actions={[
            { label: "스터디", href: "/activities/studies", variant: "outline" },
            { label: "프로젝트", href: "/activities/projects", variant: "outline" },
            { label: "대외활동", href: "/activities/external", variant: "outline" },
          ]}
        />
      ) : (
        <div className="mt-4 space-y-2">
          {myActive.map((a) => (
            <Link
              key={a.id}
              href={`${TYPE_ROUTE[a.type]}/${a.id}`}
              className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm transition-colors hover:bg-muted/40"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    {TYPE_LABELS[a.type]}
                  </span>
                  <span className="truncate font-medium">{a.title}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {a.date}
                  {a.endDate && a.endDate !== a.date ? ` ~ ${a.endDate}` : ""}
                  {a.leader ? ` · ${a.leader}` : ""}
                </p>
              </div>
              <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {a.status === "ongoing" ? "진행중" : "예정"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}
