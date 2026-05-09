"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  Download,
  FileText,
  Loader2,
  MapPin,
  MessageSquare,
  NotebookPen,
  Sparkles,
  Star,
  User as UserIcon,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import EmptyState from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { conferenceProgramsApi, userSessionPlansApi } from "@/lib/bkend";
import { toast } from "sonner";
import {
  getSessionCardVariant,
  cardClassesForVariant,
  contentPaddingForVariant,
  titleClassForVariant,
  CATEGORY_ACCENT_BAR,
} from "./session-card-variant";
import {
  CONFERENCE_SESSION_CATEGORY_COLORS,
  CONFERENCE_SESSION_CATEGORY_LABELS,
  SESSION_SELECTION_REASONS,
  type ConferenceProgram,
  type ConferenceSession,
  type SessionPlanStatus,
  type UserSessionPlan,
} from "@/types";

interface Props {
  activityId: string;
  activityTitle: string;
  user?: { id: string; name?: string } | null;
}

const STATUS_LABELS: Record<SessionPlanStatus, string> = {
  planned: "참석 예정",
  attended: "참석 완료",
  skipped: "건너뜀",
};

const STATUS_COLORS: Record<SessionPlanStatus, string> = {
  planned: "bg-blue-50 text-blue-700",
  attended: "bg-emerald-50 text-emerald-700",
  skipped: "bg-muted text-muted-foreground",
};

function planId(userId: string, programId: string, sessionId: string) {
  return `${userId}_${programId}_${sessionId}`;
}

/**
 * Sprint 67-I: 세션 카드의 트랙·SESSION 번호 추출 — A-1, B-2 식의 prefix.
 * 정렬 우선순위: 시간 → SESSION 번호(1,2,3,4) → 트랙 letter(A,B,...,G)
 * 결과: A-1~G-1 → A-2~G-2 → A-3~G-3 → A-4~G-4 순서로 자연스럽게 정렬됨
 */
function extractTrackOrder(title: string | undefined, track: string | undefined): {
  sessionNum: number;
  trackLetter: string;
} {
  const t = title ?? "";
  const m = t.match(/^\s*\[([A-Z])-(\d)\]/);
  if (m) return { sessionNum: parseInt(m[2], 10), trackLetter: m[1] };
  const tm = (track ?? "").match(/^([A-Z])\b/);
  return { sessionNum: 99, trackLetter: tm?.[1] ?? "Z" };
}

/**
 * Sprint 67-Q: 세션 정렬 비교 함수 — 두 호출 위치(발표자 모아보기 / 일자별 리스트)에서 공유.
 * 우선순위: startTime → SESSION 번호 → 트랙 letter → 제목(prefix 제거)
 */
function compareSessions(
  a: { startTime: string; title?: string; track?: string },
  b: { startTime: string; title?: string; track?: string },
): number {
  if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
  const ak = extractTrackOrder(a.title, a.track);
  const bk = extractTrackOrder(b.title, b.track);
  if (ak.sessionNum !== bk.sessionNum) return ak.sessionNum - bk.sessionNum;
  if (ak.trackLetter !== bk.trackLetter)
    return ak.trackLetter.localeCompare(bk.trackLetter);
  const stripPrefix = (t?: string) => (t ?? "").replace(/^\s*\[[A-Z]-\d\]\s*/, "");
  return stripPrefix(a.title).localeCompare(stripPrefix(b.title));
}

/**
 * Sprint 67-L: 시간 그룹별 헤더 라벨 — 카테고리·SESSION 번호로 결정.
 * SESSION 01 / SESSION 02 / 포스터 세션 / 개회식 / 폐회식 / 점심 / 휴식 등.
 */
function getSessionGroupLabel(s: ConferenceSession): string {
  const tk = extractTrackOrder(s.title, s.track);
  if (s.category === "paper" && tk.sessionNum >= 1 && tk.sessionNum <= 4) {
    return `SESSION 0${tk.sessionNum}`;
  }
  if (s.category === "poster") return "포스터 세션";
  if (s.category === "ceremony") return (s.title ?? "").replace(/^\s*\[[A-Z]-\d\]\s*/, "") || "개·폐회식";
  if (s.category === "break") return (s.title ?? "").replace(/^\s*\[[A-Z]-\d\]\s*/, "") || "휴식";
  if (s.category === "panel" && tk.sessionNum >= 1 && tk.sessionNum <= 4) {
    return `패널 (${tk.trackLetter}-${tk.sessionNum})`;
  }
  if (s.category === "panel") return "패널";
  if (s.category === "keynote") return "기조강연";
  if (s.category === "symposium") return "심포지엄";
  if (s.category === "networking") return "네트워킹";
  if (s.category === "media") return "미디어·전시";
  if (s.category === "workshop") return "워크숍";
  return `${s.startTime}–${s.endTime}`;
}

export default function ConferenceProgramView({ activityId, activityTitle, user }: Props) {
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<ConferenceProgram | null>(null);
  const [plans, setPlans] = useState<UserSessionPlan[]>([]);
  const [allPlans, setAllPlans] = useState<UserSessionPlan[]>([]);
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [reasonDialog, setReasonDialog] = useState<{
    session: ConferenceSession;
    reason: string;
    reasons: string[];
  } | null>(null);
  const [reflectionDialog, setReflectionDialog] = useState<{ plan: UserSessionPlan; reflection: string; rating: number } | null>(null);
  const [notesDialog, setNotesDialog] = useState<{ plan: UserSessionPlan; notes: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ConferenceSession["category"] | "all">("all");
  const [onlyMine, setOnlyMine] = useState(false);
  // Sprint 67-R: 하위 필터 — 트랙(A~G) + SESSION 번호(1~4)
  const [trackFilter, setTrackFilter] = useState<string | "all">("all");
  const [sessionNumFilter, setSessionNumFilter] = useState<number | "all">("all");
  const [viewMode, setViewMode] = useState<"schedule" | "presenters">("schedule");
  const [presenterCategoryFilter, setPresenterCategoryFilter] = useState<"all" | "paper" | "poster" | "media">("all");
  const [presenterSearchQuery, setPresenterSearchQuery] = useState("");

  // D2: now-line — 현재 시각·날짜 (1분마다 갱신, 백그라운드 탭 호환)
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      setNow(new Date());
    }, 60_000);
    return () => clearInterval(id);
  }, []);
  const todayYmd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const nowHm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  function getSessionTimeStatus(
    sessionDate: string,
    startTime: string,
    endTime: string,
  ): "live" | "past" | "upcoming" | "future" {
    if (sessionDate < todayYmd) return "past";
    if (sessionDate > todayYmd) return "future";
    // 오늘 — 시간 비교
    if (nowHm >= startTime && nowHm <= endTime) return "live";
    if (nowHm > endTime) return "past";
    return "upcoming";
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await conferenceProgramsApi.listByActivity(activityId);
        const first = res?.data?.[0] ?? null;
        if (!cancelled) setProgram(first);
        if (first) {
          const tasks: Promise<unknown>[] = [
            userSessionPlansApi.listByProgram(first.id).then((r) => {
              if (!cancelled) setAllPlans(r?.data ?? []);
            }),
          ];
          if (user) {
            tasks.push(
              userSessionPlansApi.listByUserAndProgram(user.id, first.id).then((r) => {
                if (!cancelled) setPlans(r?.data ?? []);
              }),
            );
          }
          await Promise.all(tasks);
        }
      } catch (e) {
        console.error("[ConferenceProgramView] load failed", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activityId, user]);

  const planBySessionId = useMemo(() => {
    const m = new Map<string, UserSessionPlan>();
    for (const p of plans) m.set(p.sessionId, p);
    return m;
  }, [plans]);

  const companionsBySessionId = useMemo(() => {
    const m = new Map<string, UserSessionPlan[]>();
    for (const p of allPlans) {
      if (user && p.userId === user.id) continue;
      const cur = m.get(p.sessionId) ?? [];
      cur.push(p);
      m.set(p.sessionId, cur);
    }
    return m;
  }, [allPlans, user]);

  /** 같은 날짜에 시간이 겹치는 본인 일정 sessionId 집합 */
  const conflictsBySessionId = useMemo(() => {
    const map = new Map<string, UserSessionPlan[]>();
    const list = plans.filter((p) => p.status !== "skipped" && p.sessionDate && p.sessionStartTime && p.sessionEndTime);
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const a = list[i];
        const b = list[j];
        if (a.sessionDate !== b.sessionDate) continue;
        const aStart = a.sessionStartTime!;
        const aEnd = a.sessionEndTime!;
        const bStart = b.sessionStartTime!;
        const bEnd = b.sessionEndTime!;
        if (aStart < bEnd && bStart < aEnd) {
          // Sprint 67-N/S: 정확히 같은 시간 = SESSION 슬롯 공유 → 충돌 아님
          // (학술대회는 1시간 SESSION 슬롯에 발표 여러 개 순차 진행이 표준 구조이므로
          //  같은 시간이면 회원이 그 슬롯에 머물면서 모두 듣는다는 의미로 해석)
          if (aStart === bStart && aEnd === bEnd) {
            continue;
          }
          const aArr = map.get(a.sessionId) ?? [];
          aArr.push(b);
          map.set(a.sessionId, aArr);
          const bArr = map.get(b.sessionId) ?? [];
          bArr.push(a);
          map.set(b.sessionId, bArr);
        }
      }
    }
    return map;
  }, [plans]);

  const conflictPairCount = useMemo(() => {
    let total = 0;
    for (const arr of conflictsBySessionId.values()) total += arr.length;
    return Math.floor(total / 2);
  }, [conflictsBySessionId]);

  async function selectSession(session: ConferenceSession) {
    if (!user || !program) return;
    setReasonDialog({ session, reason: "", reasons: [] });
  }

  async function submitSelection() {
    if (!reasonDialog || !user || !program) return;
    const { session, reason, reasons } = reasonDialog;
    const day = program.days.find((d) => d.sessions.some((s) => s.id === session.id));
    setBusy(true);
    try {
      const id = planId(user.id, program.id, session.id);
      const now = new Date().toISOString();
      const payload: UserSessionPlan = {
        id,
        userId: user.id,
        userName: user.name,
        programId: program.id,
        activityId: program.activityId,
        sessionId: session.id,
        sessionTitle: session.title,
        sessionDate: day?.date,
        sessionStartTime: session.startTime,
        sessionEndTime: session.endTime,
        sessionTrack: session.track,
        status: "planned",
        reasonForSelection: reason.trim() || undefined,
        reasons: reasons.length > 0 ? reasons : undefined,
        selectedAt: now,
      };
      await userSessionPlansApi.upsert(id, payload as unknown as Record<string, unknown>);
      setPlans((prev) => {
        const without = prev.filter((p) => p.id !== id);
        return [...without, payload];
      });
      setReasonDialog(null);
      toast.success("내 일정에 추가했습니다.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "일정 추가 실패");
    } finally {
      setBusy(false);
    }
  }

  async function removeSelection(plan: UserSessionPlan) {
    if (!confirm("내 일정에서 제외하시겠습니까?")) return;
    setBusy(true);
    try {
      await userSessionPlansApi.delete(plan.id);
      setPlans((prev) => prev.filter((p) => p.id !== plan.id));
      toast.success("일정에서 제외했습니다.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setBusy(false);
    }
  }

  async function markAttended(plan: UserSessionPlan) {
    setReflectionDialog({
      plan,
      reflection: plan.reflection ?? "",
      rating: plan.rating ?? 0,
    });
  }

  async function submitNotes() {
    if (!notesDialog) return;
    const { plan, notes } = notesDialog;
    setBusy(true);
    try {
      const updated: UserSessionPlan = {
        ...plan,
        personalNotes: notes.trim() || undefined,
      };
      await userSessionPlansApi.upsert(plan.id, updated as unknown as Record<string, unknown>);
      setPlans((prev) => prev.map((p) => (p.id === plan.id ? updated : p)));
      setNotesDialog(null);
      toast.success("개인 노트를 저장했습니다.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  async function submitReflection() {
    if (!reflectionDialog) return;
    const { plan, reflection, rating } = reflectionDialog;
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const updated: UserSessionPlan = {
        ...plan,
        status: "attended",
        attendedAt: plan.attendedAt ?? now,
        reflection: reflection.trim() || undefined,
        rating: rating > 0 ? rating : undefined,
        reflectedAt: now,
      };
      await userSessionPlansApi.upsert(plan.id, updated as unknown as Record<string, unknown>);
      setPlans((prev) => prev.map((p) => (p.id === plan.id ? updated : p)));
      setReflectionDialog(null);
      toast.success("후기를 저장했습니다.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 프로그램 불러오는 중…
      </div>
    );
  }

  if (!program) {
    return (
      <EmptyState
        icon={Calendar}
        title="아직 학술대회 프로그램이 등록되지 않았습니다"
        description="운영진이 프로그램을 등록하면 여기서 확인할 수 있어요."
        className="mx-auto max-w-3xl"
      />
    );
  }

  const day = program.days[activeDayIdx];
  const myCount = plans.length;
  const attendedCount = plans.filter((p) => p.status === "attended").length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            {program.title}
            <Badge variant="secondary" className="bg-amber-50 text-xs text-amber-700">
              {activityTitle}
            </Badge>
          </CardTitle>
          {program.notes && <p className="text-sm text-muted-foreground">{program.notes}</p>}
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
            <span>{program.days.length}일간 · 총 {program.days.reduce((s, d) => s + d.sessions.length, 0)}개 세션</span>
            {program.uploadedSourceUrl && (
              <a
                href={program.uploadedSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                원본 자료 보기
              </a>
            )}
            <Link
              href={`/activities/external/${activityId}/program/roundup`}
              className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
              title="참석자들의 후기를 세션별로 모아 봅니다"
            >
              <Sparkles className="h-3 w-3" /> 후기 라운드업
            </Link>
          </div>
          {user && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-blue-50 text-blue-700">내 일정 {myCount}개</Badge>
              {attendedCount > 0 && <Badge className="bg-emerald-50 text-emerald-700">참석 완료 {attendedCount}개</Badge>}
              {conflictPairCount > 0 && (
                <Badge
                  variant="outline"
                  className="border-rose-300 bg-rose-50 text-rose-700"
                  title="같은 시간대에 여러 세션을 선택했습니다"
                >
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  시간 충돌 {conflictPairCount}건
                </Badge>
              )}
              {myCount > 0 && (
                <a
                  href={`/api/conference/${program.id}/my-schedule/pdf?userId=${encodeURIComponent(user.id)}${user.name ? `&userName=${encodeURIComponent(user.name)}` : ""}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="내 일정만 모은 PDF 다운로드"
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground hover:bg-muted"
                >
                  <Download className="h-3 w-3" /> 내 일정 PDF
                </a>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {!user && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          로그인하시면 세션을 내 일정에 추가하고 후기를 남길 수 있어요. {" "}
          <Link href="/login" className="font-semibold underline">로그인하기</Link>
        </div>
      )}

      {/* 상위 보기 모드: 일자별 프로그램 / 발표자 */}
      <div className="flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => setViewMode("schedule")}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            viewMode === "schedule" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/60"
          }`}
        >
          일자별 프로그램
        </button>
        <button
          type="button"
          onClick={() => setViewMode("presenters")}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            viewMode === "presenters" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/60"
          }`}
        >
          발표자
          {(() => {
            const cnt = program.days
              .flatMap((d) => d.sessions)
              .filter((s) => s.category === "paper" || s.category === "poster" || s.category === "media").length;
            return cnt > 0 ? <span className="ml-1.5 text-[10px] text-muted-foreground">({cnt})</span> : null;
          })()}
        </button>
      </div>

      {viewMode === "schedule" && (
      <div className="sticky top-0 z-20 -mx-4 flex gap-2 overflow-x-auto whitespace-nowrap border-b bg-background/95 px-4 py-1 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-0 sm:px-0">
        {program.days.map((d, i) => {
          const cnt = d.sessions.length;
          const myDay = plans.filter((p) => p.sessionDate === d.date).length;
          return (
            <button
              key={d.date + i}
              onClick={() => setActiveDayIdx(i)}
              className={`shrink-0 px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                i === activeDayIdx ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {d.dayLabel ?? `Day ${i + 1}`} · {d.date}
              <span className="ml-1.5 text-xs">({cnt}{myDay > 0 ? `, 내 일정 ${myDay}` : ""})</span>
            </button>
          );
        })}
      </div>
      )}

      {viewMode === "presenters" && (() => {
        const allPresenterSessions = program.days.flatMap((d) =>
          d.sessions
            .filter((s) => s.category === "paper" || s.category === "poster" || s.category === "media")
            .map((s) => ({ session: s, date: d.date, dayLabel: d.dayLabel })),
        );
        const q = presenterSearchQuery.trim().toLowerCase();
        const filtered = allPresenterSessions
          .filter(({ session }) => {
            if (presenterCategoryFilter !== "all" && session.category !== presenterCategoryFilter) return false;
            if (q) {
              const hay = [session.title, session.affiliation, ...(session.speakers ?? [])]
                .filter(Boolean).join(" ").toLowerCase();
              if (!hay.includes(q)) return false;
            }
            return true;
          })
          .sort((a, b) => {
            if (a.date !== b.date) return a.date < b.date ? -1 : 1;
            return compareSessions(a.session, b.session);
          });

        const counts = {
          all: allPresenterSessions.length,
          paper: allPresenterSessions.filter((x) => x.session.category === "paper").length,
          poster: allPresenterSessions.filter((x) => x.session.category === "poster").length,
          media: allPresenterSessions.filter((x) => x.session.category === "media").length,
        };

        return (
          <div className="space-y-3">
            <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3 sm:flex-row sm:items-center">
              <input
                type="search"
                value={presenterSearchQuery}
                onChange={(e) => setPresenterSearchQuery(e.target.value)}
                placeholder="제목·발표자·소속 검색"
                className="h-8 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPresenterCategoryFilter("all")}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${presenterCategoryFilter === "all" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                >
                  전체 {counts.all}
                </button>
                {(["paper", "poster", "media"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setPresenterCategoryFilter(c)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${presenterCategoryFilter === c ? CONFERENCE_SESSION_CATEGORY_COLORS[c] + " ring-2 ring-offset-1" : "bg-background text-muted-foreground hover:bg-muted"}`}
                  >
                    {CONFERENCE_SESSION_CATEGORY_LABELS[c]} {counts[c]}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <p className="rounded-md border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                조건에 맞는 발표가 없습니다.
              </p>
            ) : (
              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="w-[110px] px-3 py-2 text-left font-medium">발표 구분</th>
                      <th className="w-[180px] px-3 py-2 text-left font-medium">발표자</th>
                      <th className="px-3 py-2 text-left font-medium">논문 제목</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtered.map(({ session: s, date, dayLabel }) => (
                      <tr key={s.id} className="align-top hover:bg-muted/20">
                        <td className="px-3 py-2.5">
                          <Badge className={`${CONFERENCE_SESSION_CATEGORY_COLORS[s.category]} text-xs`}>
                            {CONFERENCE_SESSION_CATEGORY_LABELS[s.category]}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium leading-snug">
                              {s.speakers && s.speakers.length > 0 ? s.speakers.join(", ") : <span className="text-muted-foreground">미정</span>}
                            </span>
                            {s.affiliation && (
                              <span className="text-xs text-muted-foreground">{s.affiliation}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium leading-snug">{s.title}</span>
                            <span className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                              <span>
                                <Clock className="mr-1 inline h-3 w-3" />
                                {dayLabel ?? date} {s.startTime}–{s.endTime}
                              </span>
                              {s.location && (
                                <span>
                                  <MapPin className="mr-1 inline h-3 w-3" />
                                  {s.location}
                                </span>
                              )}
                              {s.track && <Badge variant="outline" className="text-[10px]">{s.track}</Badge>}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {viewMode === "schedule" && day && (
        <div className="space-y-3">
          {/* 검색·필터 — 줄 분리 (option A 추가 요청): 1행 검색, 2행 카테고리 필터 + 내 일정만 */}
          <div className="space-y-2 rounded-md border bg-muted/30 p-3">
            {/* 1행: 검색창 + 내 일정만 토글 */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="제목·연사·소속·장소·트랙 검색"
                className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
              {user && (
                <button
                  type="button"
                  onClick={() => setOnlyMine((v) => !v)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${onlyMine ? "bg-blue-100 text-blue-800 ring-2 ring-blue-300 dark:bg-blue-950/50 dark:text-blue-200 dark:ring-blue-700" : "border border-input bg-background text-muted-foreground hover:bg-muted"}`}
                  title="내가 추가한 세션만 보기"
                  aria-pressed={onlyMine}
                >
                  ★ 내 일정만 보기
                </button>
              )}
            </div>

            {/* 2행: 카테고리 필터 (별도 줄) */}
            <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-2">
              <span className="text-[11px] font-medium text-muted-foreground">카테고리</span>
              <button
                type="button"
                onClick={() => setCategoryFilter("all")}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${categoryFilter === "all" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
              >
                전체
              </button>
              {(Object.keys(CONFERENCE_SESSION_CATEGORY_LABELS) as Array<ConferenceSession["category"]>).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategoryFilter(c)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${categoryFilter === c ? CONFERENCE_SESSION_CATEGORY_COLORS[c] + " ring-2 ring-offset-1" : "bg-background text-muted-foreground hover:bg-muted"}`}
                >
                  {CONFERENCE_SESSION_CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>

            {/* Sprint 67-R: 3행 — 트랙(A~G) 하위 필터 */}
            <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-2">
              <span className="text-[11px] font-medium text-muted-foreground">트랙</span>
              <button
                type="button"
                onClick={() => setTrackFilter("all")}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${trackFilter === "all" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
              >
                전체
              </button>
              {(["A", "B", "C", "D", "E", "F", "G"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTrackFilter(t)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${trackFilter === t ? "bg-primary text-primary-foreground ring-2 ring-offset-1" : "bg-background text-muted-foreground hover:bg-muted"}`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Sprint 67-R: 4행 — SESSION 번호 하위 필터 */}
            <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-2">
              <span className="text-[11px] font-medium text-muted-foreground">SESSION</span>
              <button
                type="button"
                onClick={() => setSessionNumFilter("all")}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${sessionNumFilter === "all" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
              >
                전체
              </button>
              {([1, 2, 3, 4] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSessionNumFilter(n)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${sessionNumFilter === n ? "bg-primary text-primary-foreground ring-2 ring-offset-1" : "bg-background text-muted-foreground hover:bg-muted"}`}
                >
                  SESSION 0{n}
                </button>
              ))}
              {(trackFilter !== "all" || sessionNumFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setTrackFilter("all");
                    setSessionNumFilter("all");
                  }}
                  className="ml-auto rounded-full px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
                >
                  하위 필터 초기화
                </button>
              )}
            </div>
          </div>
          {day.sessions.length === 0 ? (
            <p className="rounded-md border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              이 날짜의 세션이 비어 있습니다.
            </p>
          ) : (() => {
            const q = searchQuery.trim().toLowerCase();
            const filteredSessions = [...day.sessions]
              // Sprint 67-Q: compareSessions 공통 함수 사용 (정렬 일관성)
              .sort(compareSessions)
              .filter((s) => {
                if (categoryFilter !== "all" && s.category !== categoryFilter) return false;
                if (onlyMine && !planBySessionId.has(s.id)) return false;
                // Sprint 67-R: 트랙·SESSION 하위 필터
                if (trackFilter !== "all" || sessionNumFilter !== "all") {
                  const tk = extractTrackOrder(s.title, s.track);
                  if (trackFilter !== "all" && tk.trackLetter !== trackFilter) return false;
                  if (sessionNumFilter !== "all" && tk.sessionNum !== sessionNumFilter) return false;
                }
                if (q) {
                  const hay = [s.title, s.location, s.track, s.affiliation, s.abstract, ...(s.speakers ?? [])]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();
                  if (!hay.includes(q)) return false;
                }
                return true;
              });
            if (filteredSessions.length === 0) {
              return (
                <p className="rounded-md border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                  조건에 맞는 세션이 없습니다.
                </p>
              );
            }
            // Sprint 67-L: 시간 그룹별 헤더 (SESSION 01/02/03/04 / 포스터 / 개·폐회식 / 휴식 등)
            let prevStart: string | null = null;
            return filteredSessions.map((s) => {
                const showHeader = s.startTime !== prevStart;
                const groupLabel = showHeader ? getSessionGroupLabel(s) : "";
                prevStart = s.startTime;
                const plan = planBySessionId.get(s.id);
                const companions = companionsBySessionId.get(s.id) ?? [];
                const conflicts = conflictsBySessionId.get(s.id) ?? [];
                const variant = getSessionCardVariant(s.category);
                const hasConflict = conflicts.length > 0;
                // D2: 진행 상태 (live/past/upcoming/future)
                const timeStatus = getSessionTimeStatus(day.date, s.startTime, s.endTime);
                const isLive = timeStatus === "live";
                const isPast = timeStatus === "past";
                return (
                  <Fragment key={s.id}>
                    {showHeader && (
                      <div className="sticky top-0 z-[5] mt-2 mb-1 flex items-baseline justify-between rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 backdrop-blur dark:bg-primary/15">
                        <h4 className="text-sm font-bold text-primary">{groupLabel}</h4>
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                          {s.startTime}–{s.endTime}
                        </span>
                      </div>
                    )}
                  <Card
                    className={`relative transition-all hover:shadow-md hover:-translate-y-0.5 ${cardClassesForVariant(variant, !!plan)} ${
                      isLive
                        ? "ring-2 ring-emerald-500/60 dark:ring-emerald-400/60 shadow-md"
                        : hasConflict
                          ? "ring-2 ring-rose-400/40 dark:ring-rose-500/40"
                          : ""
                    } ${isPast ? "opacity-75" : ""}`}
                  >
                    {isLive && (
                      <span
                        aria-label="지금 진행 중"
                        title="지금 진행 중"
                        className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow"
                      >
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                        </span>
                        LIVE
                      </span>
                    )}
                    {/* Sprint 67-X: compact 외 모든 카드에 좌측 컬러 바 적용 (시각 위계 강화) */}
                    {variant !== "compact" && (
                      <span
                        aria-hidden="true"
                        className={`absolute left-0 top-0 h-full w-1 ${CATEGORY_ACCENT_BAR[s.category]}`}
                      />
                    )}
                    <CardContent className={`space-y-2 ${contentPaddingForVariant(variant)}`}>
                      <div className="flex flex-wrap items-start gap-2">
                        <Badge className={`${CONFERENCE_SESSION_CATEGORY_COLORS[s.category]} text-xs`}>
                          {CONFERENCE_SESSION_CATEGORY_LABELS[s.category]}
                        </Badge>
                        {s.track && <Badge variant="outline" className="text-xs">{s.track}</Badge>}
                        <span className="inline-flex items-center gap-1 font-mono text-sm font-semibold tabular-nums text-foreground">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {s.startTime}~{s.endTime}
                        </span>
                        {s.location && (
                          <span className="text-xs text-muted-foreground">
                            <MapPin className="mr-1 inline h-3 w-3" />
                            {s.location}
                          </span>
                        )}
                        {plan && (
                          <Badge className={`${STATUS_COLORS[plan.status]} text-xs`}>{STATUS_LABELS[plan.status]}</Badge>
                        )}
                        {companions.length > 0 && (
                          <Badge
                            variant="secondary"
                            className="bg-purple-50 text-xs text-purple-700 dark:bg-purple-950/40 dark:text-purple-200"
                            title={companions.map((c) => c.userName ?? "회원").join(", ")}
                          >
                            함께 {companions.length}명
                          </Badge>
                        )}
                        {hasConflict && (
                          <Badge
                            variant="outline"
                            className="border-rose-300 bg-rose-50 text-xs text-rose-700 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-200"
                            title={`시간이 겹치는 일정: ${conflicts.map((c) => `${c.sessionStartTime}~${c.sessionEndTime} ${c.sessionTitle ?? ""}`).join(", ")}`}
                          >
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            시간 충돌 {conflicts.length}
                          </Badge>
                        )}
                      </div>
                      <h3 className={titleClassForVariant(variant)}>{s.title}</h3>
                      {(s.speakers || s.affiliation) && (
                        <p className="text-sm text-muted-foreground">
                          {s.speakers && (
                            <span>
                              <UserIcon className="mr-1 inline h-3 w-3" />
                              {s.speakers.join(", ")}
                            </span>
                          )}
                          {s.affiliation && <span className="ml-2 text-xs">({s.affiliation})</span>}
                        </p>
                      )}
                      {s.abstract && <p className="whitespace-pre-wrap text-sm text-foreground/80">{s.abstract}</p>}

                      {s.materialUrls && s.materialUrls.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {s.materialUrls.map((u, i) => (
                            <a
                              key={u}
                              href={u}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-md border bg-card px-2 py-0.5 text-xs text-primary hover:bg-primary/5"
                            >
                              <FileText className="h-3 w-3" /> 사전 자료 {s.materialUrls!.length > 1 ? i + 1 : ""}
                            </a>
                          ))}
                        </div>
                      )}

                      {plan && companions.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 rounded-md border border-purple-100 bg-purple-50/50 p-2 text-xs text-purple-900">
                          <UserIcon className="h-3 w-3" />
                          <span className="font-semibold">함께 참석:</span>
                          {companions.slice(0, 6).map((c) => (
                            <Badge
                              key={c.id}
                              variant="secondary"
                              className="bg-card text-[11px] text-purple-800"
                            >
                              {c.userName ?? "회원"}
                            </Badge>
                          ))}
                          {companions.length > 6 && (
                            <span className="text-[11px] text-purple-700">
                              +{companions.length - 6}명
                            </span>
                          )}
                        </div>
                      )}
                      {plan?.reasonForSelection && (
                        <div className="rounded-md bg-blue-50 p-2 text-xs text-blue-900">
                          <strong>선택 이유:</strong> {plan.reasonForSelection}
                        </div>
                      )}
                      {plan?.reflection && (
                        <div className="rounded-md bg-emerald-50 p-2 text-xs text-emerald-900">
                          <strong>참석 후기:</strong> {plan.reflection}
                          {plan.rating ? <span className="ml-2">★ {plan.rating}/5</span> : null}
                        </div>
                      )}
                      {plan?.personalNotes && (
                        <div className="rounded-md border border-amber-200 bg-amber-50/60 p-2 text-xs text-amber-900">
                          <div className="mb-0.5 flex items-center gap-1 font-semibold">
                            <NotebookPen className="h-3 w-3" /> 내 노트 (비공개)
                          </div>
                          <p className="whitespace-pre-wrap">{plan.personalNotes}</p>
                        </div>
                      )}

                      {user && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {!plan && (
                            <Button size="sm" variant="outline" disabled={busy} onClick={() => selectSession(s)}>
                              <Check className="mr-1 h-3 w-3" /> 내 일정에 추가
                            </Button>
                          )}
                          {/* Sprint 67-D: 노트 작성을 참석 후기 왼쪽으로 + 별도 페이지 이동 */}
                          {plan && (
                            <Link href={`/activities/external/${activityId}/program/notes/${plan.id}`}>
                              <Button size="sm" variant="outline" disabled={busy}>
                                <NotebookPen className="mr-1 h-3 w-3" />
                                {plan.analysisNote || plan.personalNotes ? "노트 수정" : "노트 작성"}
                              </Button>
                            </Link>
                          )}
                          {plan && plan.status !== "attended" && (
                            <Button size="sm" disabled={busy} onClick={() => markAttended(plan)}>
                              <MessageSquare className="mr-1 h-3 w-3" /> 참석 후기 남기기
                            </Button>
                          )}
                          {plan && plan.status === "attended" && (
                            <Button size="sm" variant="outline" disabled={busy} onClick={() => markAttended(plan)}>
                              <MessageSquare className="mr-1 h-3 w-3" /> 후기 수정
                            </Button>
                          )}
                          {plan && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              disabled={busy}
                              onClick={() => removeSelection(plan)}
                            >
                              <X className="mr-1 h-3 w-3" /> 일정에서 제외
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  </Fragment>
                );
              });
          })()}
        </div>
      )}

      <Dialog open={!!reasonDialog} onOpenChange={(o) => !o && setReasonDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>내 일정에 추가</DialogTitle>
          </DialogHeader>
          {reasonDialog && (
            <div className="space-y-3">
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <div className="font-semibold">{reasonDialog.session.title}</div>
                <div className="text-xs text-muted-foreground">
                  {reasonDialog.session.startTime} – {reasonDialog.session.endTime}
                  {reasonDialog.session.track ? ` · ${reasonDialog.session.track}` : ""}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  선택 이유 (다중 선택 가능)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SESSION_SELECTION_REASONS.map((r) => {
                    const checked = reasonDialog.reasons.includes(r);
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() =>
                          setReasonDialog({
                            ...reasonDialog,
                            reasons: checked
                              ? reasonDialog.reasons.filter((x) => x !== r)
                              : [...reasonDialog.reasons, r],
                          })
                        }
                        className={`rounded-full border px-2.5 py-1 text-xs transition ${
                          checked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-background hover:bg-muted"
                        }`}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  추가 메모 (선택, 자유 기술)
                </label>
                <Textarea
                  rows={3}
                  value={reasonDialog.reason}
                  onChange={(e) => setReasonDialog({ ...reasonDialog, reason: e.target.value })}
                  placeholder="예: 학위논문 주제와 직접 연관, 지난 학회 발표 후속 등 구체적인 맥락이 있다면 메모해두세요."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReasonDialog(null)} disabled={busy}>
              취소
            </Button>
            <Button onClick={submitSelection} disabled={busy}>
              {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!notesDialog} onOpenChange={(o) => !o && setNotesDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>세션 노트 (비공개)</DialogTitle>
          </DialogHeader>
          {notesDialog && (
            <div className="space-y-3">
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <div className="font-semibold">{notesDialog.plan.sessionTitle}</div>
                <div className="text-xs text-muted-foreground">
                  {notesDialog.plan.sessionDate} · {notesDialog.plan.sessionStartTime} – {notesDialog.plan.sessionEndTime}
                </div>
              </div>
              <Textarea
                rows={10}
                value={notesDialog.notes}
                onChange={(e) => setNotesDialog({ ...notesDialog, notes: e.target.value })}
                placeholder="청취하면서 적은 메모, 인용, 추후 확인할 키워드 등 (본인만 볼 수 있어요)"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialog(null)} disabled={busy}>
              취소
            </Button>
            <Button onClick={submitNotes} disabled={busy}>
              {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reflectionDialog} onOpenChange={(o) => !o && setReflectionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>참석 후기 작성</DialogTitle>
          </DialogHeader>
          {reflectionDialog && (
            <div className="space-y-3">
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <div className="font-semibold">{reflectionDialog.plan.sessionTitle}</div>
                <div className="text-xs text-muted-foreground">
                  {reflectionDialog.plan.sessionDate} · {reflectionDialog.plan.sessionStartTime} – {reflectionDialog.plan.sessionEndTime}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">평점</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setReflectionDialog({ ...reflectionDialog, rating: reflectionDialog.rating === n ? 0 : n })}
                      className="rounded p-1 hover:bg-muted"
                      aria-label={`${n}점`}
                    >
                      <Star
                        className={`h-5 w-5 ${
                          n <= reflectionDialog.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">후기 / 느낀 점</label>
                <Textarea
                  rows={6}
                  value={reflectionDialog.reflection}
                  onChange={(e) => setReflectionDialog({ ...reflectionDialog, reflection: e.target.value })}
                  placeholder="발표 핵심 메시지, 인상 깊었던 사례, 내 연구에 적용할 점 등"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReflectionDialog(null)} disabled={busy}>
              취소
            </Button>
            <Button onClick={submitReflection} disabled={busy}>
              {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
