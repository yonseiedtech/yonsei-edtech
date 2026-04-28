"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, MapPin, User, Users, Sparkles, Crown } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { activityProgressApi } from "@/lib/bkend";
import type { Activity, ActivityType, ActivityProgress } from "@/types";

const STATUS_LABELS: Record<string, string> = { upcoming: "예정", ongoing: "진행 중", completed: "완료" };
const STATUS_COLORS: Record<string, string> = {
  upcoming: "bg-blue-50 text-blue-700",
  ongoing: "bg-amber-50 text-amber-700",
  completed: "bg-muted text-muted-foreground",
};

interface Props {
  activities: Activity[];
  type: ActivityType;
  isLoading?: boolean;
}

export default function MyActivitiesSection({ activities, type, isLoading }: Props) {
  const { user } = useAuthStore();

  const myActivities = useMemo(() => {
    if (!user) return [];
    return activities
      .filter((a) => {
        const participants = (a.participants as string[] | undefined) ?? [];
        const isLeader = a.leaderId === user.id;
        return participants.includes(user.id) || isLeader;
      })
      .sort((a, b) => {
        const aDone = a.status === "completed" ? 1 : 0;
        const bDone = b.status === "completed" ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;
        return (a.date ?? "").localeCompare(b.date ?? "");
      });
  }, [activities, user]);

  if (isLoading || !user || myActivities.length === 0) return null;

  const typeLabel = type === "study" ? "스터디" : "프로젝트";
  const detailPrefix = type === "study" ? "/activities/studies" : "/activities/projects";

  return (
    <section className="mt-8 rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles size={16} className="text-primary" />
        <h2 className="text-sm font-semibold text-foreground">
          내가 참여중인 {typeLabel}{" "}
          <span className="text-muted-foreground">({myActivities.length})</span>
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {myActivities.map((a) => (
          <MyActivityCard key={a.id} activity={a} detailPrefix={detailPrefix} userId={user.id} />
        ))}
      </div>
    </section>
  );
}

function MyActivityCard({
  activity,
  detailPrefix,
  userId,
}: {
  activity: Activity;
  detailPrefix: string;
  userId: string;
}) {
  const isLeader = activity.leaderId === userId;
  const participantsCount = (activity.participants as string[] | undefined)?.length ?? 0;

  const { data: progressList = [] } = useQuery({
    queryKey: ["activity-progress", activity.id],
    queryFn: async () => {
      const res = await activityProgressApi.list(activity.id);
      return (res.data ?? []) as ActivityProgress[];
    },
    staleTime: 60_000,
  });

  const totalWeeks = progressList.length;
  const completedWeeks = progressList.filter((p) => p.status === "completed").length;
  const pct = totalWeeks > 0 ? Math.round((completedWeeks / totalWeeks) * 100) : 0;

  const weeksHref = `${detailPrefix}/${activity.id}/weeks`;
  const detailHref = `${detailPrefix}/${activity.id}`;

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-white p-3 shadow-sm transition hover:shadow-md">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary" className={cn("text-[10px]", STATUS_COLORS[activity.status])}>
          {STATUS_LABELS[activity.status]}
        </Badge>
        {isLeader && (
          <Badge variant="secondary" className="bg-amber-50 text-[10px] text-amber-700">
            <Crown size={10} className="mr-0.5" />
            모임장
          </Badge>
        )}
        {totalWeeks > 0 && (
          <Badge variant="outline" className="text-[10px]">
            {completedWeeks}/{totalWeeks}주차
          </Badge>
        )}
      </div>
      <Link href={detailHref} className="text-sm font-semibold leading-snug hover:text-primary hover:underline">
        {activity.title}
      </Link>
      <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-0.5">
          <Calendar size={10} />
          {activity.date}
          {activity.endDate ? ` ~ ${activity.endDate}` : ""}
        </span>
        {activity.location && (
          <span className="flex items-center gap-0.5">
            <MapPin size={10} />
            {activity.location}
          </span>
        )}
        {activity.leader && (
          <span className="flex items-center gap-0.5">
            <User size={10} />
            {activity.leader}
          </span>
        )}
        <span className="flex items-center gap-0.5">
          <Users size={10} />
          {participantsCount}명
        </span>
      </div>
      {totalWeeks > 0 && (
        <div className="mt-1 space-y-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all", pct === 100 ? "bg-green-500" : "bg-primary")}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>진행 {pct}%</span>
            <Link href={weeksHref} className="font-medium text-primary hover:underline">
              주차 페이지 →
            </Link>
          </div>
        </div>
      )}
      {totalWeeks === 0 && (
        <Link href={weeksHref} className="mt-1 text-[11px] font-medium text-primary hover:underline">
          주차 페이지 열기 →
        </Link>
      )}
    </div>
  );
}
