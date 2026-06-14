"use client";

/**
 * 모임·네트워킹 운영진 콘솔 (사이클 73, Phase 3)
 * 행사 등록·수정 / 참석자 명단(상태별) / 회비 납부 체크·일괄 / 정산 요약 / CSV.
 * 콘솔 레이아웃이 staff+ 가드를 처리하므로 페이지 자체 가드 불필요.
 */

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, Wallet, Download, Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/auth-store";
import { networkingEventsApi, networkingRsvpsApi, networkingDuesApi } from "@/lib/bkend";
import {
  NETWORKING_EVENT_TYPE_LABELS,
  NETWORKING_EVENT_STATUS_LABELS,
  NETWORKING_DECISION_LABELS,
  RSVP_STATUS_LABELS,
  DUE_STATUS_LABELS,
  type NetworkingEvent,
  type NetworkingEventType,
  type NetworkingEventStatus,
  type NetworkingRsvp,
  type NetworkingDue,
  type DueStatus,
} from "@/types";
import { computeSettlement, formatEventDate, formatWon } from "@/features/networking/networking-helpers";
import NetworkingProgramManager from "@/features/networking/NetworkingProgramManager";
import NetworkingPoll from "@/features/networking/NetworkingPoll";

const EVENT_TYPES = Object.keys(NETWORKING_EVENT_TYPE_LABELS) as NetworkingEventType[];
const EVENT_STATUSES = Object.keys(NETWORKING_EVENT_STATUS_LABELS) as NetworkingEventStatus[];
const DUE_STATUSES = Object.keys(DUE_STATUS_LABELS) as DueStatus[];

interface EventForm {
  type: NetworkingEventType;
  title: string;
  description: string;
  schedulingMode: "fixed" | "poll";
  startAt: string; // datetime-local
  pollPeriodStart: string; // date
  pollPeriodEnd: string; // date
  pollTimeSlots: string; // 쉼표 구분 자유 입력 ("18:00, 19:00" 또는 "저녁, 오후")
  pollDeadline: string; // datetime-local
  pollDecisionMode: "manual" | "auto";
  location: string;
  feeAmount: string;
  rsvpDeadline: string;
  capacity: string;
  hostName: string;
  semester: string;
  status: NetworkingEventStatus;
  published: boolean;
}

const EMPTY_FORM: EventForm = {
  type: "regular", title: "", description: "", schedulingMode: "fixed", startAt: "",
  pollPeriodStart: "", pollPeriodEnd: "", pollTimeSlots: "", pollDeadline: "", pollDecisionMode: "auto",
  location: "", feeAmount: "0", rsvpDeadline: "", capacity: "", hostName: "", semester: "", status: "upcoming", published: true,
};

/** "18:00, 오후" 자유 입력 → 배열 (빈 항목 제거) */
function parseTimeSlots(raw: string): string[] {
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

/** ISO ↔ datetime-local 변환 */
function isoToLocal(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}
function localToIso(local: string): string {
  return local ? new Date(local).toISOString() : "";
}

export default function ConsoleNetworkingPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<NetworkingEvent | "new" | null>(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["console-networking-events"],
    queryFn: async () => {
      const res = (await networkingEventsApi.list()).data as NetworkingEvent[];
      return [...res].sort((a, b) => b.startAt.localeCompare(a.startAt));
    },
  });

  const selected = events.find((e) => e.id === selectedId) ?? null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-bold">
          <Users size={20} /> 모임·네트워킹 운영
        </h1>
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus size={15} className="mr-1" /> 새 행사
        </Button>
      </div>

      {editing && (
        <EventFormCard
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["console-networking-events"] });
            setEditing(null);
          }}
          createdByUid={user?.id ?? ""}
        />
      )}

      {isLoading ? (
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
                  {!ev.published && <span className="rounded bg-rose-50 px-1.5 text-[10px] text-rose-600">비공개</span>}
                </div>
                <p className="mt-1 truncate text-sm font-semibold">{ev.title}</p>
                <p className="text-[11px] text-muted-foreground">{formatEventDate(ev.startAt)} · 회비 {formatWon(ev.feeAmount)}</p>
              </button>
            ))}
          </div>

          {/* 선택 행사 관리 */}
          <div>
            {selected ? (
              <EventManager
                event={selected}
                onEdit={() => setEditing(selected)}
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

function EventFormCard({
  initial, onClose, onSaved, createdByUid,
}: {
  initial: NetworkingEvent | null;
  onClose: () => void;
  onSaved: () => void;
  createdByUid: string;
}) {
  const [form, setForm] = useState<EventForm>(
    initial
      ? {
          type: initial.type, title: initial.title, description: initial.description ?? "",
          schedulingMode: initial.schedulingMode ?? "fixed",
          startAt: isoToLocal(initial.startAt),
          pollPeriodStart: initial.pollPeriodStart ?? "", pollPeriodEnd: initial.pollPeriodEnd ?? "",
          pollTimeSlots: (initial.pollTimeSlots ?? []).join(", "),
          pollDeadline: isoToLocal(initial.pollDeadline), pollDecisionMode: initial.pollDecisionMode ?? "auto",
          location: initial.location ?? "",
          feeAmount: String(initial.feeAmount ?? 0), rsvpDeadline: isoToLocal(initial.rsvpDeadline),
          capacity: initial.capacity ? String(initial.capacity) : "", hostName: initial.hostName ?? "",
          semester: initial.semester ?? "",
          status: initial.status, published: initial.published,
        }
      : EMPTY_FORM,
  );
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof EventForm>(k: K, v: EventForm[K]) => setForm((p) => ({ ...p, [k]: v }));

  async function save() {
    const isPoll = form.schedulingMode === "poll";
    if (!form.title.trim()) {
      toast.error("제목은 필수입니다.");
      return;
    }
    if (isPoll) {
      if (!form.pollPeriodStart || !form.pollPeriodEnd) {
        toast.error("투표 후보 기간(시작·종료)은 필수입니다.");
        return;
      }
      if (form.pollPeriodEnd < form.pollPeriodStart) {
        toast.error("후보 기간 종료일이 시작일보다 빠릅니다.");
        return;
      }
    } else if (!form.startAt) {
      toast.error("고정 일정은 일시가 필수입니다.");
      return;
    }
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        type: form.type, title: form.title.trim(), description: form.description.trim() || undefined,
        schedulingMode: form.schedulingMode,
        // poll 모드는 일시 입력을 노출하지 않으므로 startAt이 빈 문자열로 남음.
        // gatherings 카드가 startAt 유무로 투표/확정을 분기한다.
        startAt: localToIso(form.startAt),
        pollPeriodStart: isPoll ? form.pollPeriodStart : undefined,
        pollPeriodEnd: isPoll ? form.pollPeriodEnd : undefined,
        pollTimeSlots: isPoll ? parseTimeSlots(form.pollTimeSlots) : undefined,
        pollDeadline: isPoll && form.pollDeadline ? localToIso(form.pollDeadline) : undefined,
        pollDecisionMode: isPoll ? form.pollDecisionMode : undefined,
        location: form.location.trim() || undefined,
        feeAmount: Number(form.feeAmount) || 0,
        rsvpDeadline: form.rsvpDeadline ? localToIso(form.rsvpDeadline) : undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        hostName: form.hostName.trim() || undefined,
        semester: form.semester.trim() || undefined,
        status: form.status, published: form.published, updatedAt: now,
      };
      if (initial) {
        await networkingEventsApi.update(initial.id, payload);
      } else {
        await networkingEventsApi.create({ ...payload, createdBy: createdByUid, createdAt: now } as Omit<NetworkingEvent, "id">);
      }
      toast.success("저장되었습니다.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{initial ? "행사 수정" : "새 행사 등록"}</h2>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs">유형
          <select value={form.type} onChange={(e) => set("type", e.target.value as NetworkingEventType)} className="mt-1 w-full rounded-lg border bg-background px-2 py-1.5 text-sm">
            {EVENT_TYPES.map((t) => <option key={t} value={t}>{NETWORKING_EVENT_TYPE_LABELS[t]}</option>)}
          </select>
        </label>
        <label className="text-xs">상태
          <select value={form.status} onChange={(e) => set("status", e.target.value as NetworkingEventStatus)} className="mt-1 w-full rounded-lg border bg-background px-2 py-1.5 text-sm">
            {EVENT_STATUSES.map((s) => <option key={s} value={s}>{NETWORKING_EVENT_STATUS_LABELS[s]}</option>)}
          </select>
        </label>
        <label className="text-xs sm:col-span-2">제목 *
          <Input value={form.title} onChange={(e) => set("title", e.target.value)} className="mt-1" placeholder="2026-1 개강총회" />
        </label>

        {/* 일정 결정 방식 토글 */}
        <div className="text-xs sm:col-span-2">
          <span className="text-muted-foreground">일정 결정</span>
          <div className="mt-1 inline-flex rounded-lg border bg-background p-0.5">
            {(["fixed", "poll"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => set("schedulingMode", m)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  form.schedulingMode === m
                    ? "bg-indigo-600 text-white dark:bg-indigo-500"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "fixed" ? "고정 일시" : "가능일 투표"}
              </button>
            ))}
          </div>
        </div>

        {form.schedulingMode === "fixed" ? (
          <label className="text-xs">일시 *
            <Input type="datetime-local" value={form.startAt} onChange={(e) => set("startAt", e.target.value)} className="mt-1" />
          </label>
        ) : (
          <>
            <label className="text-xs">후보 기간 시작 *
              <Input type="date" value={form.pollPeriodStart} onChange={(e) => set("pollPeriodStart", e.target.value)} className="mt-1" />
            </label>
            <label className="text-xs">후보 기간 종료 *
              <Input type="date" value={form.pollPeriodEnd} onChange={(e) => set("pollPeriodEnd", e.target.value)} className="mt-1" />
            </label>
            <label className="text-xs">시간대 옵션 (쉼표 구분, 비우면 날짜만)
              <Input value={form.pollTimeSlots} onChange={(e) => set("pollTimeSlots", e.target.value)} className="mt-1" placeholder="예: 18:00, 19:00 또는 오후, 저녁" />
            </label>
            <label className="text-xs">투표 마감
              <Input type="datetime-local" value={form.pollDeadline} onChange={(e) => set("pollDeadline", e.target.value)} className="mt-1" />
            </label>
            <label className="text-xs sm:col-span-2">확정 방식
              <select value={form.pollDecisionMode} onChange={(e) => set("pollDecisionMode", e.target.value as "manual" | "auto")} className="mt-1 w-full rounded-lg border bg-background px-2 py-1.5 text-sm">
                {(["auto", "manual"] as const).map((m) => (
                  <option key={m} value={m}>{NETWORKING_DECISION_LABELS[m]}</option>
                ))}
              </select>
            </label>
          </>
        )}
        <label className="text-xs">신청 마감
          <Input type="datetime-local" value={form.rsvpDeadline} onChange={(e) => set("rsvpDeadline", e.target.value)} className="mt-1" />
        </label>
        <label className="text-xs">장소
          <Input value={form.location} onChange={(e) => set("location", e.target.value)} className="mt-1" placeholder="학교 앞 OO" />
        </label>
        <label className="text-xs">회비(원)
          <Input type="number" value={form.feeAmount} onChange={(e) => set("feeAmount", e.target.value)} className="mt-1" />
        </label>
        <label className="text-xs">정원(빈칸=무제한)
          <Input type="number" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} className="mt-1" />
        </label>
        <label className="text-xs">주최
          <Input value={form.hostName} onChange={(e) => set("hostName", e.target.value)} className="mt-1" placeholder="총무" />
        </label>
        <label className="text-xs">운영 학기
          <Input value={form.semester} onChange={(e) => set("semester", e.target.value)} className="mt-1" placeholder="예: 2026-1" />
        </label>
        <label className="text-xs sm:col-span-2">설명
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} className="mt-1 w-full rounded-lg border bg-background px-2 py-1.5 text-sm" />
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={form.published} onChange={(e) => set("published", e.target.checked)} />
          공개 (회원에게 노출)
        </label>
      </div>
      <div className="mt-4 flex gap-2">
        <Button size="sm" disabled={busy} onClick={save}>{busy ? "저장 중…" : "저장"}</Button>
        <Button size="sm" variant="outline" onClick={onClose}>취소</Button>
      </div>
    </div>
  );
}

function EventManager({ event, onEdit, confirmedByUid }: { event: NetworkingEvent; onEdit: () => void; confirmedByUid: string }) {
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

  function refreshDues() {
    qc.invalidateQueries({ queryKey: ["console-networking-dues", event.id] });
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

      {/* 회비 일괄 생성 */}
      {event.feeAmount > 0 && (
        <Button size="sm" variant="outline" disabled={busy} onClick={generateDues}>
          <Wallet size={13} className="mr-1" />참석자 회비 항목 생성 (미생성분만)
        </Button>
      )}

      {/* 명단 */}
      <div>
        <p className="mb-2 text-xs font-semibold text-muted-foreground">참석자 명단 ({rsvps.length})</p>
        {rsvps.length === 0 ? (
          <p className="text-xs text-muted-foreground">아직 신청자가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-1.5 pr-2">이름</th>
                  <th className="pr-2">참석</th>
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
                      <td className="pr-2">{RSVP_STATUS_LABELS[r.status]}</td>
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
