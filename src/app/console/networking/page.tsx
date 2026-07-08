"use client";

/**
 * 모임·네트워킹 운영진 콘솔 (사이클 73, Phase 3)
 * 행사 등록·수정 / 참석자 명단(상태별) / 회비 납부 체크·일괄 / 정산 요약 / CSV.
 * 콘솔 레이아웃이 staff+ 가드를 처리하므로 페이지 자체 가드 불필요.
 */

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, Wallet, Download, Check, Pencil, UserCheck, Copy, BarChart3, CheckCheck } from "lucide-react";
import { deleteField } from "firebase/firestore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/auth-store";
import { networkingEventsApi, networkingRsvpsApi, networkingDuesApi } from "@/lib/bkend";
import {
  NETWORKING_EVENT_TYPE_LABELS,
  NETWORKING_EVENT_STATUS_LABELS,
  RSVP_STATUS_LABELS,
  DUE_STATUS_LABELS,
  type NetworkingEvent,
  type NetworkingRsvp,
  type NetworkingDue,
  type DueStatus,
} from "@/types";
import { computeSettlement, formatEventDate, formatWon, isPastEvent } from "@/features/networking/networking-helpers";
import NetworkingProgramManager from "@/features/networking/NetworkingProgramManager";
import NetworkingPoll from "@/features/networking/NetworkingPoll";
import EventEditorForm from "@/features/networking/EventEditorForm";
import NetworkingStats from "@/features/networking/NetworkingStats";

const DUE_STATUSES = Object.keys(DUE_STATUS_LABELS) as DueStatus[];

export default function ConsoleNetworkingPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<NetworkingEvent | "new" | null>(null);
  // G4(2026-07-09): 복제 대상 — 설정되면 EventEditorForm 을 복제(신규 저장) 모드로 연다.
  const [duplicating, setDuplicating] = useState<NetworkingEvent | null>(null);
  // G18(2026-07-09): 운영/통계 탭
  const [tab, setTab] = useState<"manage" | "stats">("manage");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["console-networking-events"],
    queryFn: async () => {
      const res = (await networkingEventsApi.list()).data as NetworkingEvent[];
      return [...res].sort((a, b) => b.startAt.localeCompare(a.startAt));
    },
  });

  const selected = events.find((e) => e.id === selectedId) ?? null;

  function closeEditor() {
    setEditing(null);
    setDuplicating(null);
  }
  function savedEditor() {
    qc.invalidateQueries({ queryKey: ["console-networking-events"] });
    closeEditor();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-bold">
          <Users size={20} /> 모임·네트워킹 운영
        </h1>
        <Button size="sm" onClick={() => { setDuplicating(null); setEditing("new"); }}>
          <Plus size={15} className="mr-1" /> 새 행사
        </Button>
      </div>

      {/* 탭 — 운영 / 통계 */}
      <div className="inline-flex rounded-lg border bg-background p-0.5 text-xs">
        {(["manage", "stats"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-3 py-1.5 font-medium transition-colors",
              tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "manage" ? <Users size={13} /> : <BarChart3 size={13} />}
            {t === "manage" ? "운영" : "통계"}
          </button>
        ))}
      </div>

      {(editing || duplicating) && (
        <EventEditorForm
          initial={editing && editing !== "new" ? editing : null}
          duplicateFrom={duplicating}
          onClose={closeEditor}
          onSaved={savedEditor}
          createdByUid={user?.id ?? ""}
        />
      )}

      {tab === "stats" ? (
        <NetworkingStats events={events} />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          {/* 행사 목록 */}
          <div className="space-y-2">
            {events.length === 0 && (
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                등록된 행사가 없습니다.
              </p>
            )}
            {events.map((ev) => (
              <button
                key={ev.id}
                type="button"
                onClick={() => setSelectedId(ev.id)}
                className={cn(
                  "w-full rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/40",
                  selectedId === ev.id && "border-primary ring-1 ring-primary/30",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {NETWORKING_EVENT_TYPE_LABELS[ev.type]} · {NETWORKING_EVENT_STATUS_LABELS[ev.status]}
                  </span>
                  {!ev.published && <span className="rounded bg-rose-50 px-1.5 text-[10px] text-rose-600">미게시</span>}
                  {ev.visibility === "private" && <span className="rounded bg-violet-50 px-1.5 text-[10px] text-violet-600">비공개 링크</span>}
                </div>
                <p className="mt-1 truncate text-sm font-semibold">{ev.title}</p>
                <p className="text-[11px] text-muted-foreground">{ev.startAt ? formatEventDate(ev.startAt) : "일정 투표 중"} · 회비 {formatWon(ev.feeAmount)}</p>
              </button>
            ))}
          </div>

          {/* 선택 행사 관리 */}
          <div>
            {selected ? (
              <EventManager
                event={selected}
                onEdit={() => { setDuplicating(null); setEditing(selected); }}
                onDuplicate={() => { setEditing(null); setDuplicating(selected); }}
                confirmedByUid={user?.id ?? ""}
              />
            ) : (
              <p className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                왼쪽에서 행사를 선택하세요.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EventManager({ event, onEdit, onDuplicate, confirmedByUid }: { event: NetworkingEvent; onEdit: () => void; onDuplicate: () => void; confirmedByUid: string }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data: rsvps = [] } = useQuery({
    queryKey: ["console-networking-rsvps", event.id],
    queryFn: async () => (await networkingRsvpsApi.listByEvent(event.id)).data as NetworkingRsvp[],
  });
  const { data: dues = [] } = useQuery({
    queryKey: ["console-networking-dues", event.id],
    queryFn: async () => (await networkingDuesApi.listByEvent(event.id)).data as NetworkingDue[],
  });

  const settlement = useMemo(() => computeSettlement(event, rsvps, dues), [event, rsvps, dues]);
  const dueByKey = useMemo(() => {
    const m = new Map<string, NetworkingDue>();
    for (const d of dues) m.set(d.userId ?? d.displayName, d);
    return m;
  }, [dues]);
  const attending = rsvps.filter((r) => r.status === "attending");
  const waitlisted = rsvps.filter((r) => r.status === "waitlisted");
  // G3(2026-07-08): 노쇼 = 참석 확정인데 행사 종료 후에도 미체크인. 종료 전에는 무의미하므로 지난 행사만 집계.
  const eventEnded =
    !(event.schedulingMode === "poll" && !event.startAt) &&
    !!event.startAt &&
    isPastEvent(event, new Date().toISOString());
  const noShowCount = eventEnded ? attending.filter((r) => !r.attendedAt).length : 0;

  function refreshRsvps() {
    qc.invalidateQueries({ queryKey: ["console-networking-rsvps", event.id] });
  }
  function refreshDues() {
    qc.invalidateQueries({ queryKey: ["console-networking-dues", event.id] });
  }

  // G3: 현장 체크인 토글 — staff 가 attendedAt set/unset (firestore.rules 상 staff update 허용).
  async function toggleCheckIn(r: NetworkingRsvp) {
    try {
      await networkingRsvpsApi.update(r.id, {
        attendedAt: r.attendedAt
          ? (deleteField() as unknown as undefined)
          : new Date().toISOString(),
      });
      refreshRsvps();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "체크인 변경 실패");
    }
  }

  /** 참석자 기준 회비 레코드 일괄 생성 (없는 것만) */
  async function generateDues() {
    if (busy || event.feeAmount <= 0) {
      if (event.feeAmount <= 0) toast.info("무료 행사는 회비 생성이 필요 없습니다.");
      return;
    }
    setBusy(true);
    try {
      const now = new Date().toISOString();
      let created = 0;
      for (const r of attending) {
        const key = r.userId ?? r.displayName;
        if (dueByKey.has(key)) continue;
        await networkingDuesApi.create({
          eventId: event.id,
          userId: r.userId,
          isGuest: r.isGuest,
          displayName: r.displayName,
          amount: event.feeAmount,
          status: "unpaid",
          createdAt: now,
          updatedAt: now,
        });
        created += 1;
      }
      toast.success(`${created}명의 회비 항목을 생성했습니다.`);
      refreshDues();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "생성 실패");
    } finally {
      setBusy(false);
    }
  }

  // G19(2026-07-09): 미납 회비 일괄 납부 처리 — 확인 다이얼로그 후 unpaid → paid.
  async function markAllPaid() {
    const unpaid = dues.filter((d) => d.status === "unpaid");
    if (unpaid.length === 0) {
      toast.info("미납 회비가 없습니다.");
      return;
    }
    if (!window.confirm(`미납 회비 ${unpaid.length}건을 모두 납부 처리할까요?`)) return;
    setBusy(true);
    try {
      const now = new Date().toISOString();
      await Promise.all(
        unpaid.map((d) =>
          networkingDuesApi.update(d.id, { status: "paid", paidAt: now, confirmedBy: confirmedByUid, updatedAt: now }),
        ),
      );
      toast.success(`${unpaid.length}건을 납부 처리했습니다.`);
      refreshDues();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "일괄 처리 실패");
    } finally {
      setBusy(false);
    }
  }

  async function setDueStatus(due: NetworkingDue, status: DueStatus) {
    try {
      const now = new Date().toISOString();
      await networkingDuesApi.update(due.id, {
        status,
        paidAt: status === "paid" ? now : undefined,
        confirmedBy: confirmedByUid,
        updatedAt: now,
      });
      refreshDues();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "변경 실패");
    }
  }

  function exportCsv() {
    const rows = [["이름", "구분", "참석상태", "동반인", "회비상태", "금액", "연락처"]];
    for (const r of rsvps) {
      const due = dueByKey.get(r.userId ?? r.displayName);
      rows.push([
        r.displayName, r.isGuest ? "게스트" : "회원", RSVP_STATUS_LABELS[r.status],
        String(r.companions ?? 0), due ? DUE_STATUS_LABELS[due.status] : "-",
        due ? String(due.amount) : "-", r.guestContact ?? "",
      ]);
    }
    const csv = "﻿" + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.title}_명단.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const isPollPending = event.schedulingMode === "poll" && !event.startAt;

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold">{event.title}</h2>
          <p className="text-xs text-muted-foreground">
            {isPollPending ? "일정 조율 중" : formatEventDate(event.startAt)} · {event.location ?? "장소 미정"} · 회비 {formatWon(event.feeAmount)}
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" onClick={onEdit}><Pencil size={13} className="mr-1" />수정</Button>
          <Button size="sm" variant="outline" onClick={onDuplicate}><Copy size={13} className="mr-1" />복제</Button>
          <Button size="sm" variant="outline" onClick={exportCsv}><Download size={13} className="mr-1" />CSV</Button>
        </div>
      </div>

      {/* 일정 조율 투표 (미확정 poll — 운영진 확정 패널 포함) */}
      {isPollPending && <NetworkingPoll event={event} canEdit />}

      {/* 세부 프로그램 (사이클 124 단계2) */}
      <NetworkingProgramManager eventId={event.id} canEdit />

      {/* 정산 요약 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "참석", value: `${settlement.attendingCount}명${settlement.totalCompanions ? ` (+${settlement.totalCompanions})` : ""}` },
          { label: "예상 수입", value: formatWon(settlement.expectedRevenue) },
          { label: "납부", value: formatWon(settlement.paidAmount) },
          { label: "미납", value: formatWon(settlement.unpaidAmount) },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-background p-2.5">
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
            <p className="text-sm font-bold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      {/* 회비 일괄 생성 · 전원 납부 처리 */}
      {event.feeAmount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="outline" disabled={busy} onClick={generateDues}>
            <Wallet size={13} className="mr-1" />참석자 회비 항목 생성 (미생성분만)
          </Button>
          {dues.some((d) => d.status === "unpaid") && (
            <Button size="sm" variant="outline" disabled={busy} onClick={markAllPaid}>
              <CheckCheck size={13} className="mr-1" />전원 납부 처리
            </Button>
          )}
        </div>
      )}

      {/* 명단 */}
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold text-muted-foreground">참석자 명단 ({rsvps.length})</p>
          {/* G2: 대기자 수 · G3: 노쇼 수 */}
          {waitlisted.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              대기 {waitlisted.length}명
            </span>
          )}
          {noShowCount > 0 && (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              노쇼 {noShowCount}명
            </span>
          )}
        </div>
        {rsvps.length === 0 ? (
          <p className="text-xs text-muted-foreground">아직 신청자가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-1.5 pr-2">이름</th>
                  <th className="pr-2">참석</th>
                  <th className="pr-2">체크인</th>
                  <th className="pr-2">회비</th>
                  <th>연락처</th>
                </tr>
              </thead>
              <tbody>
                {rsvps.map((r) => {
                  const due = dueByKey.get(r.userId ?? r.displayName);
                  return (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-1.5 pr-2">
                        {r.displayName}
                        {r.isGuest && <span className="ml-1 rounded bg-muted px-1 text-[10px] text-muted-foreground">게스트</span>}
                        {(r.companions ?? 0) > 0 && <span className="ml-1 text-muted-foreground">+{r.companions}</span>}
                      </td>
                      <td className="pr-2">
                        <span className={cn(r.status === "waitlisted" && "text-amber-600 dark:text-amber-400")}>
                          {RSVP_STATUS_LABELS[r.status]}
                        </span>
                      </td>
                      <td className="pr-2">
                        {r.status === "attending" ? (
                          <button
                            type="button"
                            onClick={() => toggleCheckIn(r)}
                            className={cn(
                              "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] transition-colors",
                              r.attendedAt
                                ? "bg-emerald-600 text-white"
                                : "bg-muted text-muted-foreground hover:bg-muted/70",
                            )}
                            title={r.attendedAt ? "체크인 취소" : "현장 체크인"}
                          >
                            <UserCheck size={9} />
                            {r.attendedAt ? "참석확인" : "체크인"}
                          </button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="pr-2">
                        {due ? (
                          <div className="flex gap-1">
                            {DUE_STATUSES.map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setDueStatus(due, s)}
                                className={cn(
                                  "rounded px-1.5 py-0.5 text-[10px] transition-colors",
                                  due.status === s
                                    ? s === "paid" ? "bg-emerald-600 text-white" : s === "unpaid" ? "bg-amber-500 text-white" : "bg-slate-500 text-white"
                                    : "bg-muted text-muted-foreground hover:bg-muted/70",
                                )}
                              >
                                {due.status === s && <Check size={9} className="mr-0.5 inline" />}
                                {DUE_STATUS_LABELS[s]}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{r.status === "attending" && event.feeAmount > 0 ? "미생성" : "-"}</span>
                        )}
                      </td>
                      <td className="text-muted-foreground">{r.guestContact ?? ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
