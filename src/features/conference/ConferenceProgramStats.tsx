"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Loader2, MessageSquare, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { userSessionPlansApi } from "@/lib/bkend";
import type { UserSessionPlan } from "@/types";

interface Props {
  programId: string;
}

export default function ConferenceProgramStats({ programId }: Props) {
  const [plans, setPlans] = useState<UserSessionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await userSessionPlansApi.listByProgram(programId);
        if (!cancelled) setPlans(res?.data ?? []);
      } catch (e) {
        console.error("[ConferenceProgramStats]", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [programId]);

  const summary = useMemo(() => {
    const userIds = new Set(plans.map((p) => p.userId));
    const attended = plans.filter((p) => p.status === "attended");
    const reflected = plans.filter((p) => !!p.reflection);
    return {
      totalPlans: plans.length,
      uniqueUsers: userIds.size,
      attendedCount: attended.length,
      reflectedCount: reflected.length,
    };
  }, [plans]);

  const popularSessions = useMemo(() => {
    const map = new Map<string, { sessionTitle: string; date?: string; time?: string; count: number; attendedCount: number; ratingSum: number; ratingCount: number }>();
    for (const p of plans) {
      const cur = map.get(p.sessionId) ?? {
        sessionTitle: p.sessionTitle ?? "(제목 없음)",
        date: p.sessionDate,
        time: p.sessionStartTime,
        count: 0,
        attendedCount: 0,
        ratingSum: 0,
        ratingCount: 0,
      };
      cur.count += 1;
      if (p.status === "attended") cur.attendedCount += 1;
      if (p.rating) {
        cur.ratingSum += p.rating;
        cur.ratingCount += 1;
      }
      map.set(p.sessionId, cur);
    }
    return Array.from(map.entries())
      .map(([sessionId, v]) => ({
        sessionId,
        ...v,
        avgRating: v.ratingCount > 0 ? v.ratingSum / v.ratingCount : null,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [plans]);

  const recentReflections = useMemo(
    () =>
      plans
        .filter((p) => !!p.reflection)
        .sort((a, b) => (b.reflectedAt ?? "").localeCompare(a.reflectedAt ?? ""))
        .slice(0, 5),
    [plans],
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 통계 불러오는 중…
        </CardContent>
      </Card>
    );
  }

  if (plans.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          아직 회원이 선택한 세션이 없습니다.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-primary" /> 참여 통계
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="참여 회원" value={summary.uniqueUsers} icon={<Users className="h-3 w-3" />} />
          <Stat label="총 일정 추가" value={summary.totalPlans} />
          <Stat label="참석 완료" value={summary.attendedCount} />
          <Stat label="후기 작성" value={summary.reflectedCount} icon={<MessageSquare className="h-3 w-3" />} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">인기 세션 Top {popularSessions.length}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {popularSessions.map((s, i) => (
              <li key={s.sessionId} className="flex flex-wrap items-start gap-2 rounded-md border bg-background p-3 text-sm">
                <Badge variant="secondary" className="bg-primary/10 text-primary">{i + 1}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.sessionTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.date} · {s.time}
                  </p>
                </div>
                <div className="flex flex-shrink-0 gap-2 text-xs">
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700">선택 {s.count}</Badge>
                  {s.attendedCount > 0 && <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">참석 {s.attendedCount}</Badge>}
                  {s.avgRating !== null && <Badge variant="secondary" className="bg-amber-50 text-amber-700">★ {s.avgRating.toFixed(1)}</Badge>}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {recentReflections.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">최근 후기</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {recentReflections.map((p) => (
                <li key={p.id} className="rounded-md border bg-emerald-50/40 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{p.userName ?? "회원"}</span>
                    <span>·</span>
                    <span>{p.sessionTitle}</span>
                    {p.rating ? <Badge variant="secondary" className="bg-amber-50 text-amber-700">★ {p.rating}</Badge> : null}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-foreground/80">{p.reflection}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}
