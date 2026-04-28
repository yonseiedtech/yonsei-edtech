"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, ScanLine, Sparkles, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import QrScanner from "@/features/seminar/QrScanner";
import { conferenceProgramsApi, userSessionPlansApi } from "@/lib/bkend";
import {
  CONFERENCE_SESSION_CATEGORY_COLORS,
  CONFERENCE_SESSION_CATEGORY_LABELS,
  type ConferenceProgram,
  type ConferenceSession,
  type UserSessionPlan,
} from "@/types";

export const CHECKIN_TOKEN_PREFIX = "yet-conf";

export function buildCheckinToken(programId: string, sessionId: string) {
  return `${CHECKIN_TOKEN_PREFIX}:${programId}:${sessionId}`;
}

export function parseCheckinToken(token: string): { programId: string; sessionId: string } | null {
  const parts = token.split(":");
  if (parts.length !== 3 || parts[0] !== CHECKIN_TOKEN_PREFIX) return null;
  if (!parts[1] || !parts[2]) return null;
  return { programId: parts[1], sessionId: parts[2] };
}

interface Props {
  activityId: string;
  activityTitle: string;
  user: { id: string; name?: string };
}

interface CheckinFeedback {
  kind: "success" | "warn" | "error";
  title: string;
  detail?: string;
  session?: ConferenceSession;
  date?: string;
}

export default function ConferenceCheckinScanner({ activityId, activityTitle, user }: Props) {
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<ConferenceProgram | null>(null);
  const [plans, setPlans] = useState<UserSessionPlan[]>([]);
  const [feedback, setFeedback] = useState<CheckinFeedback | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const progRes = await conferenceProgramsApi.listByActivity(activityId);
        const first = progRes?.data?.[0] ?? null;
        if (!cancelled) setProgram(first);
        if (first) {
          const planRes = await userSessionPlansApi.listByUserAndProgram(user.id, first.id);
          if (!cancelled) setPlans(planRes?.data ?? []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activityId, user.id]);

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

  const attendedCount = useMemo(
    () => plans.filter((p) => p.status === "attended").length,
    [plans],
  );

  async function handleScan(token: string) {
    if (busy || !program) return;
    const parsed = parseCheckinToken(token);
    if (!parsed) {
      setFeedback({
        kind: "error",
        title: "체크인 QR이 아닙니다",
        detail: "학술대회 세션 QR을 스캔하세요.",
      });
      return;
    }
    if (parsed.programId !== program.id) {
      setFeedback({
        kind: "error",
        title: "다른 학술대회의 QR입니다",
        detail: "현재 보고 있는 학술대회 세션 QR을 스캔하세요.",
      });
      return;
    }
    const meta = sessionMap.get(parsed.sessionId);
    if (!meta) {
      setFeedback({
        kind: "error",
        title: "세션을 찾을 수 없습니다",
        detail: "운영자가 시간표를 갱신했을 수 있습니다.",
      });
      return;
    }
    setBusy(true);
    try {
      const planIdValue = `${user.id}_${program.id}_${parsed.sessionId}`;
      const existing = plans.find((p) => p.sessionId === parsed.sessionId);
      if (existing && existing.status === "attended") {
        setFeedback({
          kind: "warn",
          title: "이미 체크인된 세션입니다",
          session: meta.session,
          date: meta.date,
        });
        return;
      }
      const nowIso = new Date().toISOString();
      const payload: Record<string, unknown> = {
        userId: user.id,
        userName: user.name ?? "",
        programId: program.id,
        activityId,
        sessionId: parsed.sessionId,
        sessionTitle: meta.session.title,
        sessionDate: meta.date ?? "",
        sessionStartTime: meta.session.startTime ?? "",
        sessionEndTime: meta.session.endTime ?? "",
        sessionTrack: meta.session.track ?? "",
        status: "attended",
        attendedAt: nowIso,
        ...(existing ? {} : { selectedAt: nowIso }),
      };
      const updated = await userSessionPlansApi.upsert(planIdValue, payload);
      setPlans((prev) => {
        const next = prev.filter((p) => p.id !== updated.id);
        next.push(updated);
        return next;
      });
      setFeedback({
        kind: "success",
        title: existing ? "참석 처리되었습니다" : "신규 참석으로 추가되었습니다",
        session: meta.session,
        date: meta.date,
      });
    } catch (err) {
      console.error("[checkin]", err);
      setFeedback({
        kind: "error",
        title: "체크인에 실패했습니다",
        detail: err instanceof Error ? err.message : "잠시 후 다시 시도하세요.",
      });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 시간표 불러오는 중…
      </div>
    );
  }

  if (!program) {
    return (
      <div className="mx-auto max-w-3xl rounded-md border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        아직 시간표가 등록되지 않았습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Link
          href={`/activities/external/${activityId}/program`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> 시간표로 돌아가기
        </Link>
      </div>

      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-sky-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
            <ScanLine className="h-5 w-5 text-emerald-700" />
            {activityTitle} · 세션 체크인
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            세션 입구의 QR을 스캔하면 자동으로 참석이 기록됩니다.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Badge className="bg-emerald-100 text-emerald-800">
            <Sparkles className="mr-1 h-3 w-3" /> 참석 {attendedCount}회
          </Badge>
          <Badge variant="outline">전체 일정 {plans.length}개</Badge>
        </CardContent>
      </Card>

      <div className="mx-auto max-w-md">
        <QrScanner onScan={handleScan} />
      </div>

      {feedback && (
        <Card
          className={
            feedback.kind === "success"
              ? "border-emerald-200 bg-emerald-50"
              : feedback.kind === "warn"
              ? "border-amber-200 bg-amber-50"
              : "border-destructive/40 bg-destructive/5"
          }
        >
          <CardContent className="space-y-2 py-4">
            <div className="flex items-start gap-2">
              {feedback.kind === "success" ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" />
              ) : feedback.kind === "warn" ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-amber-700" />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5 text-destructive" />
              )}
              <div className="space-y-1">
                <p
                  className={
                    feedback.kind === "success"
                      ? "text-sm font-medium text-emerald-900"
                      : feedback.kind === "warn"
                      ? "text-sm font-medium text-amber-900"
                      : "text-sm font-medium text-destructive"
                  }
                >
                  {feedback.title}
                </p>
                {feedback.session && (
                  <div className="space-y-1 text-xs text-foreground/80">
                    <Badge
                      variant="outline"
                      className={CONFERENCE_SESSION_CATEGORY_COLORS[feedback.session.category]}
                    >
                      {CONFERENCE_SESSION_CATEGORY_LABELS[feedback.session.category]}
                    </Badge>
                    <p className="font-medium text-foreground">{feedback.session.title}</p>
                    <p className="text-muted-foreground">
                      {feedback.date ? `${feedback.date} · ` : ""}
                      {feedback.session.startTime}~{feedback.session.endTime}
                      {feedback.session.location ? ` · ${feedback.session.location}` : ""}
                    </p>
                  </div>
                )}
                {feedback.detail && (
                  <p className="text-xs text-muted-foreground">{feedback.detail}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
