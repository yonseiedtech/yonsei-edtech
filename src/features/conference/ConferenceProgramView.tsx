"use client";

import { useEffect, useMemo, useState } from "react";
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
  CONFERENCE_SESSION_CATEGORY_COLORS,
  CONFERENCE_SESSION_CATEGORY_LABELS,
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

export default function ConferenceProgramView({ activityId, activityTitle, user }: Props) {
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<ConferenceProgram | null>(null);
  const [plans, setPlans] = useState<UserSessionPlan[]>([]);
  const [allPlans, setAllPlans] = useState<UserSessionPlan[]>([]);
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [reasonDialog, setReasonDialog] = useState<{ session: ConferenceSession; reason: string } | null>(null);
  const [reflectionDialog, setReflectionDialog] = useState<{ plan: UserSessionPlan; reflection: string; rating: number } | null>(null);
  const [notesDialog, setNotesDialog] = useState<{ plan: UserSessionPlan; notes: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ConferenceSession["category"] | "all">("all");
  const [onlyMine, setOnlyMine] = useState(false);

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
    setReasonDialog({ session, reason: "" });
  }

  async function submitSelection() {
    if (!reasonDialog || !user || !program) return;
    const { session, reason } = reasonDialog;
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
      <div className="mx-auto max-w-3xl rounded-md border bg-muted/30 p-8 text-center">
        <Calendar className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">아직 학술대회 프로그램이 등록되지 않았습니다.</p>
        <p className="mt-1 text-xs text-muted-foreground">운영진이 프로그램을 등록하면 여기서 확인할 수 있어요.</p>
      </div>
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

      <div className="flex flex-wrap gap-2 border-b">
        {program.days.map((d, i) => {
          const cnt = d.sessions.length;
          const myDay = plans.filter((p) => p.sessionDate === d.date).length;
          return (
            <button
              key={d.date + i}
              onClick={() => setActiveDayIdx(i)}
              className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                i === activeDayIdx ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {d.dayLabel ?? `Day ${i + 1}`} · {d.date}
              <span className="ml-1.5 text-xs">({cnt}{myDay > 0 ? `, 내 일정 ${myDay}` : ""})</span>
            </button>
          );
        })}
      </div>

      {day && (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3 sm:flex-row sm:items-center">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="제목·연사·소속·장소·트랙 검색"
              className="h-8 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="flex flex-wrap items-center gap-1.5">
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
              {user && (
                <button
                  type="button"
                  onClick={() => setOnlyMine((v) => !v)}
                  className={`ml-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${onlyMine ? "bg-blue-100 text-blue-800 ring-2 ring-blue-300 ring-offset-1" : "bg-background text-muted-foreground hover:bg-muted"}`}
                  title="내 일정만 보기"
                >
                  내 일정만
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
              .sort((a, b) => (a.startTime > b.startTime ? 1 : -1))
              .filter((s) => {
                if (categoryFilter !== "all" && s.category !== categoryFilter) return false;
                if (onlyMine && !planBySessionId.has(s.id)) return false;
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
            return filteredSessions.map((s) => {
                const plan = planBySessionId.get(s.id);
                const companions = companionsBySessionId.get(s.id) ?? [];
                const conflicts = conflictsBySessionId.get(s.id) ?? [];
                return (
                  <Card key={s.id} className={plan ? "border-blue-300 bg-blue-50/30" : ""}>
                    <CardContent className="space-y-2 p-4">
                      <div className="flex flex-wrap items-start gap-2">
                        <Badge className={`${CONFERENCE_SESSION_CATEGORY_COLORS[s.category]} text-xs`}>
                          {CONFERENCE_SESSION_CATEGORY_LABELS[s.category]}
                        </Badge>
                        {s.track && <Badge variant="outline" className="text-xs">{s.track}</Badge>}
                        <span className="text-xs text-muted-foreground">
                          <Clock className="mr-1 inline h-3 w-3" />
                          {s.startTime} – {s.endTime}
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
                            className="bg-purple-50 text-xs text-purple-700"
                            title={companions.map((c) => c.userName ?? "회원").join(", ")}
                          >
                            함께 {companions.length}명
                          </Badge>
                        )}
                        {conflicts.length > 0 && (
                          <Badge
                            variant="outline"
                            className="border-rose-300 bg-rose-50 text-xs text-rose-700"
                            title={`시간이 겹치는 일정: ${conflicts.map((c) => `${c.sessionStartTime}~${c.sessionEndTime} ${c.sessionTitle ?? ""}`).join(", ")}`}
                          >
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            시간 충돌 {conflicts.length}
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-base font-semibold leading-snug">{s.title}</h3>
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
                              className="inline-flex items-center gap-1 rounded-md border bg-white px-2 py-0.5 text-xs text-primary hover:bg-primary/5"
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
                              className="bg-white text-[11px] text-purple-800"
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
                              variant="outline"
                              disabled={busy}
                              onClick={() => setNotesDialog({ plan, notes: plan.personalNotes ?? "" })}
                            >
                              <NotebookPen className="mr-1 h-3 w-3" /> {plan.personalNotes ? "노트 수정" : "노트 작성"}
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
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  이 세션을 선택한 이유 (선택)
                </label>
                <Textarea
                  rows={4}
                  value={reasonDialog.reason}
                  onChange={(e) => setReasonDialog({ ...reasonDialog, reason: e.target.value })}
                  placeholder="예: 교육공학 분야의 최신 연구 동향이 궁금해서, 발표자가 학위논문 주제와 관련된 분이라…"
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
