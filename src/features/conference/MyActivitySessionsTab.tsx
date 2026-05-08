"use client";

/**
 * 학술대회 활동 상세 — "내 일정" 탭 컨텐츠 (Sprint 67 추가 요청)
 *
 * 본인이 추가한 세션(plans) 만 간략히 모아서 표시.
 * 풀 프로그램은 /activities/external/[id]/program 에서 별도 확인.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  MessageSquare,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import { userSessionPlansApi } from "@/lib/bkend";
import type { UserSessionPlan } from "@/types";

interface Props {
  activityId: string;
  userId: string;
}

const STATUS_LABELS: Record<UserSessionPlan["status"], string> = {
  planned: "계획",
  attended: "참석",
  skipped: "건너뜀",
};

const STATUS_COLORS: Record<UserSessionPlan["status"], string> = {
  planned: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200",
  attended: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  skipped: "bg-muted text-muted-foreground",
};

export default function MyActivitySessionsTab({ activityId, userId }: Props) {
  const [plans, setPlans] = useState<UserSessionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // userSessionPlansApi 에 activityId 직접 조회 메서드가 없어 listByUser + 클라이언트 필터
        const res = await userSessionPlansApi.listByUser(userId);
        if (!cancelled) {
          const filtered = (res?.data ?? []).filter((p) => p.activityId === activityId);
          setPlans(filtered);
        }
      } catch (e) {
        console.error("[MyActivitySessionsTab]", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activityId, userId]);

  const sorted = useMemo(
    () =>
      [...plans].sort(
        (a, b) =>
          (a.sessionDate ?? "").localeCompare(b.sessionDate ?? "") ||
          (a.sessionStartTime ?? "").localeCompare(b.sessionStartTime ?? ""),
      ),
    [plans],
  );

  const attendedCount = plans.filter((p) => p.status === "attended").length;
  const reflectedCount = plans.filter((p) => p.reflection).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 내 일정을 불러오는 중…
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="아직 추가한 세션이 없습니다"
        description="학술대회 프로그램에서 관심 있는 세션을 ★ 내 일정에 추가해보세요."
        actions={[
          { label: "프로그램 전체 보기", href: `/activities/external/${activityId}/program` },
        ]}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* 요약 + 풀 프로그램 진입 */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card p-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span>총 <b>{plans.length}</b>건</span>
          <span className="text-muted-foreground">·</span>
          <span>참석 <b className="text-emerald-700 dark:text-emerald-300">{attendedCount}</b></span>
          <span className="text-muted-foreground">·</span>
          <span>후기 작성 <b>{reflectedCount}</b></span>
        </div>
        <Link href={`/activities/external/${activityId}/program`}>
          <Button size="sm" variant="outline" className="gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" />
            프로그램 전체 보기
          </Button>
        </Link>
      </div>

      <div className="space-y-2">
        {sorted.map((p) => (
          <div
            key={p.id}
            className="flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:items-start"
          >
            <div className="shrink-0 sm:w-32">
              <div className="font-mono text-sm font-semibold tabular-nums">
                {p.sessionStartTime ?? "—"}~{p.sessionEndTime ?? "—"}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {p.sessionDate ?? "—"}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-medium leading-snug">
                  {p.sessionTitle ?? "(세션 제목 없음)"}
                </h4>
                <Badge className={`${STATUS_COLORS[p.status]} text-[10px]`}>
                  {STATUS_LABELS[p.status]}
                </Badge>
                {p.rating && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-amber-700 dark:text-amber-300">
                    <Star className="h-3 w-3 fill-current" /> {p.rating}/5
                  </span>
                )}
              </div>
              {(p.sessionTrack || p.sessionStartTime) && (
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {p.sessionTrack && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {p.sessionTrack}
                    </span>
                  )}
                </div>
              )}
              {p.reflection && (
                <p className="mt-1 line-clamp-2 rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                  <MessageSquare className="mr-1 inline h-3 w-3" />
                  {p.reflection}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
