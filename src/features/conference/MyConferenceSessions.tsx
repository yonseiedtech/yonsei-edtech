"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, ChevronRight, Globe, Loader2, MessageSquare, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { userSessionPlansApi } from "@/lib/bkend";
import EmptyState from "@/components/ui/empty-state";
import type { UserSessionPlan } from "@/types";

interface Props {
  userId: string;
}

export default function MyConferenceSessions({ userId }: Props) {
  const [plans, setPlans] = useState<UserSessionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await userSessionPlansApi.listByUser(userId);
        if (!cancelled) setPlans(res?.data ?? []);
      } catch (e) {
        console.error("[MyConferenceSessions]", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const grouped = useMemo(() => {
    const map = new Map<string, UserSessionPlan[]>();
    for (const p of plans) {
      const arr = map.get(p.activityId) ?? [];
      arr.push(p);
      map.set(p.activityId, arr);
    }
    return Array.from(map.entries()).map(([activityId, items]) => ({
      activityId,
      items: items.sort((a, b) => (a.sessionDate ?? "").localeCompare(b.sessionDate ?? "") || (a.sessionStartTime ?? "").localeCompare(b.sessionStartTime ?? "")),
      attendedCount: items.filter((i) => i.status === "attended").length,
      reflectedCount: items.filter((i) => i.reflection).length,
    }));
  }, [plans]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 학회 참여 기록을 불러오는 중…
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <EmptyState
        icon={Globe}
        title="아직 학회 일정에 추가한 세션이 없습니다"
        description="대외 학술대회 페이지에서 관심 있는 세션을 내 일정에 추가해보세요."
        actionLabel="대외 학술대회 보기"
        actionHref="/activities/external"
      />
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map(({ activityId, items, attendedCount, reflectedCount }) => (
        <section key={activityId} className="rounded-2xl border bg-card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-emerald-600" />
              <h3 className="text-sm font-semibold">학회 참여</h3>
              <Badge variant="secondary" className="bg-blue-50 text-blue-700">선택 {items.length}개</Badge>
              {attendedCount > 0 && <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">참석 {attendedCount}개</Badge>}
              {reflectedCount > 0 && <Badge variant="secondary" className="bg-amber-50 text-amber-700">후기 {reflectedCount}개</Badge>}
            </div>
            <Link href={`/activities/external/${activityId}/program`}>
              <Button size="sm" variant="outline" className="h-8">
                프로그램 보기 <ChevronRight size={13} className="ml-0.5" />
              </Button>
            </Link>
          </div>
          <ul className="space-y-2">
            {items.map((p) => (
              <li key={p.id} className="rounded-md border bg-background p-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Calendar size={12} />
                  {p.sessionDate} · {p.sessionStartTime}–{p.sessionEndTime}
                  {p.sessionTrack && <Badge variant="outline" className="text-[10px]">{p.sessionTrack}</Badge>}
                  <Badge
                    variant="secondary"
                    className={
                      p.status === "attended"
                        ? "bg-emerald-50 text-emerald-700"
                        : p.status === "skipped"
                          ? "bg-muted text-muted-foreground"
                          : "bg-blue-50 text-blue-700"
                    }
                  >
                    {p.status === "attended" ? "참석 완료" : p.status === "skipped" ? "건너뜀" : "참석 예정"}
                  </Badge>
                </div>
                <p className="mt-1 font-medium leading-snug">{p.sessionTitle}</p>
                {p.reasonForSelection && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    <span className="font-semibold">선택 이유: </span>
                    {p.reasonForSelection}
                  </p>
                )}
                {p.reflection && (
                  <div className="mt-2 rounded-md bg-emerald-50 p-2 text-xs text-emerald-900">
                    <div className="flex items-center gap-1 font-semibold">
                      <MessageSquare size={11} /> 후기
                      {p.rating ? (
                        <span className="ml-1 inline-flex items-center text-amber-700">
                          <Star size={11} className="fill-amber-400 text-amber-400" /> {p.rating}/5
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap">{p.reflection}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
