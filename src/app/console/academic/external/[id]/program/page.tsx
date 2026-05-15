"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, CalendarDays } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { activitiesApi, conferenceProgramsApi } from "@/lib/bkend";
import ConferenceProgramEditor from "@/features/conference/ConferenceProgramEditor";
import ConferenceProgramStats from "@/features/conference/ConferenceProgramStats";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import type { Activity, ConferenceProgram } from "@/types";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, isLoading } = useAuth();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [program, setProgram] = useState<ConferenceProgram | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [activityRes, progRes] = await Promise.all([
          activitiesApi.get(id),
          conferenceProgramsApi.listByActivity(id),
        ]);
        if (!cancelled) {
          setActivity(activityRes as Activity);
          setProgram(progRes?.data?.[0] ?? null);
        }
      } catch (e) {
        if (!cancelled)
          setLoadError(
            e instanceof Error ? e.message : "활동 정보를 불러오지 못했습니다.",
          );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (isLoading || (!activity && !loadError)) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 불러오는 중…
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        role="alert"
        className="rounded-md border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive"
      >
        {loadError}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-md border bg-muted/30 p-6 text-sm text-muted-foreground">
        로그인이 필요합니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/activities/external/${id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> 활동 상세로 돌아가기
      </Link>
      <ConsolePageHeader
        icon={CalendarDays}
        title="학술대회 프로그램 편집"
        description={
          activity?.title
            ? `${activity.title} 프로그램·트랙·세션을 편집합니다.`
            : "학술대회 프로그램·트랙·세션을 편집합니다."
        }
      />
      <ConferenceProgramEditor
        activityId={id}
        activityTitle={activity?.title ?? ""}
        currentUserId={user.id}
      />
      {program && <ConferenceProgramStats programId={program.id} />}
    </div>
  );
}
