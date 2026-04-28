"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { activitiesApi } from "@/lib/bkend";
import ConferenceCheckinScanner from "@/features/conference/ConferenceCheckinScanner";
import type { Activity } from "@/types";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, isLoading } = useAuth();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await activitiesApi.get(id);
        if (!cancelled) setActivity(res as Activity);
      } catch (e) {
        if (!cancelled)
          setLoadError(e instanceof Error ? e.message : "활동 정보를 불러오지 못했습니다.");
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
        className="mx-auto max-w-3xl rounded-md border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive"
      >
        {loadError}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 px-4 py-6">
        <Link
          href={`/activities/external/${id}/program`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> 시간표로 돌아가기
        </Link>
        <div className="rounded-md border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          체크인하려면 로그인하세요.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <ConferenceCheckinScanner
        activityId={id}
        activityTitle={activity?.title ?? ""}
        user={{ id: user.id, name: user.name }}
      />
    </div>
  );
}
