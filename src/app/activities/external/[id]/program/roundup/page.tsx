"use client";

import { use, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { activitiesApi } from "@/lib/bkend";
import ConferenceRoundupView from "@/features/conference/ConferenceRoundupView";
import type { Activity } from "@/types";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
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

  if (!activity && !loadError) {
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

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-6">
      <ConferenceRoundupView activityId={id} activityTitle={activity?.title ?? ""} />
    </div>
  );
}
