"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  Calendar,
  Loader2,
  MessageSquare,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { conferenceProgramsApi, userSessionPlansApi } from "@/lib/bkend";
import {
  CONFERENCE_SESSION_CATEGORY_COLORS,
  CONFERENCE_SESSION_CATEGORY_LABELS,
  type ConferenceProgram,
  type ConferenceSession,
  type UserSessionPlan,
} from "@/types";

interface Props {
  activityId: string;
  activityTitle: string;
}

interface SessionGroup {
  date?: string;
  session: ConferenceSession;
  reflections: UserSessionPlan[];
  avgRating: number | null;
}

export default function ConferenceRoundupView({ activityId, activityTitle }: Props) {
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<ConferenceProgram | null>(null);
  const [plans, setPlans] = useState<UserSessionPlan[]>([]);
  const [activeDate, setActiveDate] = useState<string | "all">("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const progRes = await conferenceProgramsApi.listByActivity(activityId);
        const first = progRes?.data?.[0] ?? null;
        if (!cancelled) setProgram(first);
        if (first) {
          const planRes = await userSessionPlansApi.listByProgram(first.id);
          if (!cancelled) setPlans(planRes?.data ?? []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activityId]);

  const sessionMap = useMemo(() => {
    const m = new Map<string, { session: ConferenceSession; date?: string }>();
    if (!program) return m;
    for (const day of program.days ?? []) {
      for (const session of day.sessions ?? []) {
        m.set(session.id, { session, date: day.date });
      }
    }
    return m;
  }, [program]);

  const groups = useMemo<SessionGroup[]>(() => {
    const acc = new Map<string, SessionGroup>();
    for (const plan of plans) {
      if (!plan.reflection) continue;
      const meta = sessionMap.get(plan.sessionId);
      if (!meta) continue;
      const cur = acc.get(plan.sessionId) ?? {
        date: meta.date,
        session: meta.session,
        reflections: [],
        avgRating: null,
      };
      cur.reflections.push(plan);
      acc.set(plan.sessionId, cur);
    }
    for (const g of acc.values()) {
      g.reflections.sort((a, b) => (b.reflectedAt ?? "").localeCompare(a.reflectedAt ?? ""));
      const ratings = g.reflections.map((r) => r.rating).filter((r): r is number => !!r);
      g.avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    }
    return Array.from(acc.values()).sort((a, b) => {
      const ad = (a.date ?? "") + (a.session.startTime ?? "");
      const bd = (b.date ?? "") + (b.session.startTime ?? "");
      return ad.localeCompare(bd);
    });
  }, [plans, sessionMap]);

  const dates = useMemo(
    () => Array.from(new Set(groups.map((g) => g.date).filter(Boolean) as string[])).sort(),
    [groups],
  );

  const filtered = activeDate === "all" ? groups : groups.filter((g) => g.date === activeDate);

  const summary = useMemo(() => {
    const reflectionCount = plans.filter((p) => !!p.reflection).length;
    const userCount = new Set(plans.filter((p) => !!p.reflection).map((p) => p.userId)).size;
    const sessionCount = groups.length;
    const allRatings = plans.map((p) => p.rating).filter((r): r is number => !!r);
    const overall = allRatings.length
      ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length
      : null;
    return { reflectionCount, userCount, sessionCount, overall };
  }, [plans, groups]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 후기 모아보는 중…
      </div>
    );
  }

  if (!program) {
    return (
      <div className="mx-auto max-w-3xl rounded-md border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        아직 학술대회 시간표가 등록되지 않았습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/activities/external/${activityId}/program`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> 시간표로 돌아가기
        </Link>
      </div>

      <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-rose-50">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-600" />
            {activityTitle} · 라운드업
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            참석자들이 남긴 후기를 세션별로 모았습니다.
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="후기 작성" value={summary.reflectionCount} icon={<MessageSquare className="h-3 w-3" />} />
          <Stat label="후기 작성자" value={summary.userCount} icon={<Users className="h-3 w-3" />} />
          <Stat label="후기 있는 세션" value={summary.sessionCount} icon={<Award className="h-3 w-3" />} />
          <Stat
            label="평균 별점"
            value={summary.overall ? `★ ${summary.overall.toFixed(1)}` : "—"}
            icon={<Star className="h-3 w-3" />}
          />
        </CardContent>
      </Card>

      {dates.length > 1 && (
        <div className="flex flex-wrap gap-2 border-b">
          <DateChip active={activeDate === "all"} onClick={() => setActiveDate("all")} label="전체" />
          {dates.map((d) => (
            <DateChip
              key={d}
              active={activeDate === d}
              onClick={() => setActiveDate(d)}
              label={d}
            />
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            아직 작성된 후기가 없습니다.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((g) => (
            <Card key={g.session.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start gap-2">
                  <Badge
                    variant="outline"
                    className={CONFERENCE_SESSION_CATEGORY_COLORS[g.session.category]}
                  >
                    {CONFERENCE_SESSION_CATEGORY_LABELS[g.session.category]}
                  </Badge>
                  {g.avgRating !== null && (
                    <Badge variant="secondary" className="bg-amber-50 text-amber-700">
                      ★ {g.avgRating.toFixed(1)} · {g.reflections.length}개
                    </Badge>
                  )}
                </div>
                <CardTitle className="mt-2 text-base">{g.session.title}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  <Calendar className="mr-1 inline h-3 w-3" />
                  {g.date} · {g.session.startTime}~{g.session.endTime}
                  {g.session.location ? ` · ${g.session.location}` : ""}
                  {g.session.speakers?.length ? ` · ${g.session.speakers.join(", ")}` : ""}
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {g.reflections.map((r) => (
                    <li key={r.id} className="rounded-md border bg-emerald-50/40 p-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{r.userName ?? "회원"}</span>
                        {r.rating ? (
                          <Badge variant="secondary" className="bg-amber-50 text-amber-700">
                            ★ {r.rating}
                          </Badge>
                        ) : null}
                        {r.reflectedAt ? (
                          <span>· {new Date(r.reflectedAt).toLocaleDateString("ko-KR")}</span>
                        ) : null}
                      </div>
                      <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground/90">
                        {r.reflection}
                      </p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number | string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-card/70 p-3">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}

function DateChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-t-md border-b-2 px-3 py-2 text-sm transition-colors " +
        (active
          ? "border-primary font-medium text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground")
      }
    >
      {label}
    </button>
  );
}
