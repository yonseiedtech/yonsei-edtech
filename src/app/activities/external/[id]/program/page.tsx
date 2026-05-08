"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Settings } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { activitiesApi } from "@/lib/bkend";
import ConferenceProgramView from "@/features/conference/ConferenceProgramView";
import { Button } from "@/components/ui/button";
import type { Activity } from "@/types";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, isLoading } = useAuth();
  // 모든 hook 은 early return 이전에 호출 (React rules of hooks — error #310 방지)
  const authUser = useAuthStore((s) => s.user);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await activitiesApi.get(id);
        if (!cancelled) setActivity(res as Activity);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "활동 정보를 불러오지 못했습니다.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const isStaff = isAtLeast(authUser, "staff");

  if (isLoading || (!activity && !loadError)) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 불러오는 중…
      </div>
    );
  }

  if (loadError) {
    return (
      <div role="alert" className="mx-auto max-w-3xl rounded-md border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
        {loadError}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={`/activities/external/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> 활동 상세로 돌아가기
        </Link>
        {isStaff && (
          <Link href={`/academic-admin/external/${id}/program`}>
            <Button size="sm" variant="outline" className="gap-1.5">
              <Settings className="h-3.5 w-3.5" />
              프로그램 편집·세션 추가
            </Button>
          </Link>
        )}
      </div>
      <ConferenceProgramView
        activityId={id}
        activityTitle={activity?.title ?? ""}
        user={user ? { id: user.id, name: user.name } : null}
      />
    </div>
  );
}
