"use client";

/**
 * 모임·행사 등록/수정 폼 (사이클 73 console/networking 인라인 폼에서 추출).
 * console(운영진 콘솔)과 /gatherings(staff+ 빠른 생성 다이얼로그) 양쪽에서 공용으로 사용.
 */

import { useState } from "react";
import { toast } from "sonner";
import { X, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteField } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { networkingEventsApi, eventTokensApi, networkingRsvpsApi } from "@/lib/bkend";
import MemberAutocomplete, { type SelectedMember } from "@/components/ui/MemberAutocomplete";
import { useAllMembers } from "@/features/member/useMembers";
import {
  notifyGatheringInvite,
  notifyGatheringCancelled,
  notifyGatheringPostponed,
  notifyGatheringPollStarted,
} from "@/features/notifications/notify";
import { formatEventDate } from "@/features/networking/networking-helpers";
import {
  NETWORKING_EVENT_TYPE_LABELS,
  NETWORKING_EVENT_STATUS_LABELS,
  NETWORKING_DECISION_LABELS,
  type NetworkingEvent,
  type NetworkingEventType,
  type NetworkingEventStatus,
} from "@/types";

const EVENT_TYPES = Object.keys(NETWORKING_EVENT_TYPE_LABELS) as NetworkingEventType[];
const EVENT_STATUSES = Object.keys(NETWORKING_EVENT_STATUS_LABELS) as NetworkingEventStatus[];

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
  autoDues: boolean;
  rsvpDeadline: string;
  capacity: string;
  hostName: string;
  semester: string;
  visibility: "public" | "private";
  status: NetworkingEventStatus;
  published: boolean;
}

const EMPTY_FORM: EventForm = {
  type: "regular", title: "", description: "", schedulingMode: "fixed", startAt: "",
  // pollTimeSlots 기본값 — 비워 두면 투표가 "날짜만" 모드가 되어 시간대 선택이 비활성되던 문제 방지
  // (렌더 측도 DEFAULT_POLL_TIME_SLOTS 폴백이 있지만, 폼에 보여 줘야 staff 가 수정할 수 있다)
  pollPeriodStart: "", pollPeriodEnd: "", pollTimeSlots: "12:00, 15:00, 18:00, 19:00, 20:00", pollDeadline: "", pollDecisionMode: "auto",
  location: "", feeAmount: "0", autoDues: false, rsvpDeadline: "", capacity: "", hostName: "", semester: "", visibility: "public", status: "upcoming", published: true,
};

/** NetworkingEvent → EventForm (수정·복제 공통 프리필) */
function eventToForm(ev: NetworkingEvent): EventForm {
  return {
    type: ev.type, title: ev.title, description: ev.description ?? "",
    schedulingMode: ev.schedulingMode ?? "fixed",
    startAt: isoToLocal(ev.startAt),
    pollPeriodStart: ev.pollPeriodStart ?? "", pollPeriodEnd: ev.pollPeriodEnd ?? "",
    pollTimeSlots: (ev.pollTimeSlots ?? []).join(", "),
    pollDeadline: isoToLocal(ev.pollDeadline), pollDecisionMode: ev.pollDecisionMode ?? "auto",
    location: ev.location ?? "",
    feeAmount: String(ev.feeAmount ?? 0), autoDues: ev.autoDues ?? false, rsvpDeadline: isoToLocal(ev.rsvpDeadline),
    capacity: ev.capacity ? String(ev.capacity) : "", hostName: ev.hostName ?? "",
    semester: ev.semester ?? "",
    visibility: ev.visibility ?? "public",
    status: ev.status, published: ev.published,
  };
}

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

export interface EventEditorFormProps {
  initial: NetworkingEvent | null;
  onClose: () => void;
  onSaved: () => void;
  createdByUid: string;
  /**
   * G4(2026-07-09): 모임 복제 — 값을 프리필하되 신규(create)로 저장한다.
   * initial 은 null 이어야 한다(복제는 새 문서). 제목엔 " (복사)"를 붙이고
   * startAt·poll 기간·마감은 비운다. RSVP·회비·프로그램(자식 컬렉션)은 복제하지 않는다.
   */
  duplicateFrom?: NetworkingEvent | null;
}

export default function EventEditorForm({
  initial, onClose, onSaved, createdByUid, duplicateFrom,
}: EventEditorFormProps) {
  const [form, setForm] = useState<EventForm>(() => {
    if (initial) return eventToForm(initial);
    if (duplicateFrom) {
      return {
        ...eventToForm(duplicateFrom),
        title: `${duplicateFrom.title} (복사)`,
        // 일정·투표 기간·마감은 새로 정하도록 비운다.
        startAt: "", pollPeriodStart: "", pollPeriodEnd: "", pollDeadline: "", rsvpDeadline: "",
        // 지난 모임을 복제해도 신규는 "신청 가능"으로 시작.
        status: "upcoming",
      };
    }
    return EMPTY_FORM;
  });
  const [busy, setBusy] = useState(false);
  // 저장 후 private 이면 공유 링크를 폼 안에서 복사할 수 있게 노출
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const set = <K extends keyof EventForm>(k: K, v: EventForm[K]) => setForm((p) => ({ ...p, [k]: v }));

  // H2(2026-07-08): 비공개 모임 초대 알림 — 신규 초대 대상 선택 및 기존 초대자 표시
  const { members: allMembers } = useAllMembers();
  const existingInvitedIds = initial?.invitedUserIds ?? [];
  const existingInvitedMembers = allMembers.filter((m) => existingInvitedIds.includes(m.id));
  const [inviteSelections, setInviteSelections] = useState<SelectedMember[]>([]);

  async function copyShareLink() {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success("공유 링크를 복사했습니다.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("복사에 실패했습니다. 링크를 직접 선택해 복사해주세요.");
    }
  }

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
      // G11(2026-07-08): 자동 확정은 cron 이 pollDeadline 을 전제로 동작 — 마감일 없으면 영구 미확정.
      if (form.pollDecisionMode === "auto" && !form.pollDeadline) {
        toast.error("자동 확정은 투표 마감일이 필요합니다.");
        return;
      }
    } else if (!form.startAt) {
      toast.error("고정 일정은 일시가 필수입니다.");
      return;
    }
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const isPrivate = form.visibility === "private";
      // G1(2026-07-08): 수정 저장 시 initial 대비 (a) 취소 전환 (b) 일시 변경(연기) 감지.
      // 취소가 우선 — 취소면 연기 알림은 발송하지 않는다. datetime-local 표현으로 비교해 오탐 방지.
      const cancelledNow = !!initial && initial.status !== "cancelled" && form.status === "cancelled";
      const postponedNow =
        !!initial &&
        !isPoll &&
        !cancelledNow &&
        !!initial.startAt &&
        !!form.startAt &&
        isoToLocal(initial.startAt) !== form.startAt;
      // High-1(2026-07-08): 공유 토큰은 이벤트 문서가 아니라 networking_event_tokens 에만 기록한다.
      // 토큰 값 결정: 레거시 shareToken(이관 대상) → 기존 매핑 → 신규 uuid.
      let token: string | null = null;
      if (isPrivate) {
        if (initial?.shareToken) {
          token = initial.shareToken; // 레거시 값 재사용(링크 불변) — 아래에서 이벤트 문서엔 deleteField
        } else if (initial?.id) {
          const existing = await eventTokensApi.listByEvent(initial.id);
          token = existing.data[0]?.id ?? crypto.randomUUID();
        } else {
          token = crypto.randomUUID();
        }
      }
      const payload = {
        type: form.type, title: form.title.trim(), description: form.description.trim() || undefined,
        schedulingMode: form.schedulingMode,
        // Medium-1(2026-07-08): poll 모드는 startAt 을 반드시 비운다(고정→poll 전환 시 잔존 startAt 이
        // 투표 UI 를 숨기는 버그 차단). gatherings 카드가 startAt 유무로 투표/확정을 분기한다.
        startAt: isPoll ? "" : localToIso(form.startAt),
        pollPeriodStart: isPoll ? form.pollPeriodStart : undefined,
        pollPeriodEnd: isPoll ? form.pollPeriodEnd : undefined,
        pollTimeSlots: isPoll ? parseTimeSlots(form.pollTimeSlots) : undefined,
        pollDeadline: isPoll && form.pollDeadline ? localToIso(form.pollDeadline) : undefined,
        pollDecisionMode: isPoll ? form.pollDecisionMode : undefined,
        location: form.location.trim() || undefined,
        feeAmount: Number(form.feeAmount) || 0,
        // G19(2026-07-09): 참석 확정 시 회비 자동 생성 옵션. 무료 행사면 저장하지 않음.
        autoDues: Number(form.feeAmount) > 0 ? form.autoDues : undefined,
        rsvpDeadline: form.rsvpDeadline ? localToIso(form.rsvpDeadline) : undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        hostName: form.hostName.trim() || undefined,
        semester: form.semester.trim() || undefined,
        visibility: form.visibility,
        // 레거시 shareToken 필드가 남아 있으면 제거(마이그레이션) — 없으면 저장하지 않음.
        shareToken: initial?.shareToken
          ? (deleteField() as unknown as string | undefined)
          : undefined,
        status: form.status, published: form.published, updatedAt: now,
      };
      let eventId: string;
      if (initial) {
        await networkingEventsApi.update(initial.id, payload);
        eventId = initial.id;
      } else {
        const created = await networkingEventsApi.create({ ...payload, createdBy: createdByUid, createdAt: now } as Omit<NetworkingEvent, "id">);
        eventId = created.id;
        // G14(2026-07-08): 신규 공개 poll 모임 생성 시 승인 회원 전체에 투표 개시 알림.
        // 비공개 poll 은 초대 알림(H2)이 담당하므로 공개만. 전체 발송 실패는 무시(fire-and-forget).
        if (isPoll && form.published && !isPrivate) {
          notifyGatheringPollStarted(form.title.trim()).catch(() => {});
        }
      }
      // private 이면 토큰 매핑을 기록(upsert — idempotent). 레거시 값도 여기로 이관된다.
      if (isPrivate && token) {
        await eventTokensApi.create(token, { eventId, createdBy: createdByUid });
      }
      // H2(2026-07-08): 새로 선택한 초대 대상에게만 인앱 알림 발송 — 이미 초대된 회원은
      // MemberAutocomplete excludeIds 로 선택지에서 걸러지므로 재발송되지 않는다.
      if (isPrivate && token && inviteSelections.length > 0) {
        const newInviteIds = inviteSelections.map((m) => m.id);
        await Promise.all(
          newInviteIds.map((uid) => notifyGatheringInvite(uid, form.title.trim(), token as string)),
        );
        await networkingEventsApi.update(eventId, {
          invitedUserIds: Array.from(new Set([...existingInvitedIds, ...newInviteIds])),
        });
        setInviteSelections([]);
      }
      // G1: 취소·연기 시 참석/미정 회원(userId 보유)에게 인앱 알림. 비공개는 토큰 링크(없으면 스킵),
      // 공개는 /gatherings. 알림 실패는 저장 성공을 막지 않는다.
      if (initial && (cancelledNow || postponedNow)) {
        try {
          const changeLink = isPrivate ? (token ? `/gatherings/p/${token}` : null) : "/gatherings";
          if (changeLink) {
            const rsvps = (await networkingRsvpsApi.listByEvent(eventId)).data;
            const targetIds = Array.from(
              new Set(
                rsvps
                  .filter((r) => r.userId && (r.status === "attending" || r.status === "undecided"))
                  .map((r) => r.userId as string),
              ),
            );
            await Promise.all(
              targetIds.map((uid) =>
                cancelledNow
                  ? notifyGatheringCancelled(uid, form.title.trim(), changeLink)
                  : notifyGatheringPostponed(uid, form.title.trim(), formatEventDate(payload.startAt), changeLink),
              ),
            );
          }
        } catch {
          /* 알림 실패는 저장 성공을 막지 않는다 */
        }
      }
      toast.success("저장되었습니다.");
      if (isPrivate && token) {
        // 링크 복사 패널을 유지하고, 닫을 때(onSaved) 목록을 새로고침
        setShareLink(`${window.location.origin}/gatherings/p/${token}`);
      } else {
        onSaved();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{initial ? "행사 수정" : duplicateFrom ? "행사 복제" : "새 행사 등록"}</h2>
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
              <Input value={form.pollTimeSlots} onChange={(e) => set("pollTimeSlots", e.target.value)} className="mt-1" placeholder="예: 18:00, 19:00 (비우면 기본 시간대 12:00~20:00 적용)" />
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
              {/* G11(2026-07-08): auto 는 마감일 필수(저장 차단), manual 은 마감 없음 경고 */}
              {form.pollDecisionMode === "auto" && !form.pollDeadline && (
                <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                  자동 확정은 투표 마감일이 필요합니다. 위에서 투표 마감을 설정하세요.
                </p>
              )}
              {form.pollDecisionMode === "manual" && !form.pollDeadline && (
                <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                  투표 마감이 없어 자동으로 종료되지 않습니다. 운영진이 직접 확정해야 합니다.
                </p>
              )}
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
          {/* G19(2026-07-09): 참석 확정 시 회비 자동 생성 옵션 — 유료 행사에서만 노출 */}
          {Number(form.feeAmount) > 0 && (
            <span className="mt-1.5 flex items-center gap-1.5 font-normal text-muted-foreground">
              <input type="checkbox" checked={form.autoDues} onChange={(e) => set("autoDues", e.target.checked)} />
              참석 확정 시 회비 자동 생성
            </span>
          )}
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
        {/* 공개 범위 — 공개 / 비공개(링크 공유) */}
        <div className="text-xs sm:col-span-2">
          <span className="text-muted-foreground">공개 범위</span>
          <div className="mt-1 inline-flex rounded-lg border bg-background p-0.5">
            {(["public", "private"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => set("visibility", v)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  form.visibility === v
                    ? "bg-indigo-600 text-white dark:bg-indigo-500"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {v === "public" ? "공개" : "비공개 · 링크 공유"}
              </button>
            ))}
          </div>
          {form.visibility === "private" && (
            <>
              <p className="mt-1 text-[11px] text-muted-foreground">
                목록·캘린더·갤러리에 노출되지 않고, 공유 링크를 가진 사람만 접근합니다.
              </p>
              <div className="mt-3">
                <span className="text-muted-foreground">초대할 회원</span>
                {existingInvitedMembers.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {existingInvitedMembers.map((m) => (
                      <span
                        key={m.id}
                        className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground"
                      >
                        {m.name} · 초대됨
                      </span>
                    ))}
                  </div>
                )}
                {inviteSelections.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {inviteSelections.map((m) => (
                      <span
                        key={m.id}
                        className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200"
                      >
                        {m.name}
                        <button
                          type="button"
                          onClick={() => setInviteSelections((p) => p.filter((s) => s.id !== m.id))}
                          className="hover:text-red-500"
                          aria-label="선택 해제"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <MemberAutocomplete
                  value=""
                  onSelect={(m) => setInviteSelections((p) => [...p, { id: m.id, name: m.name, studentId: m.studentId }])}
                  excludeIds={[...existingInvitedIds, ...inviteSelections.map((s) => s.id)]}
                  placeholder="초대할 회원 검색"
                  className="mt-1.5"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  저장 시 새로 선택한 회원에게 초대 알림(공유 링크 포함)이 발송됩니다.
                </p>
              </div>
            </>
          )}
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={form.published} onChange={(e) => set("published", e.target.checked)} />
          공개 (회원에게 노출)
        </label>
      </div>

      {/* 저장 후 비공개 공유 링크 안내 */}
      {shareLink && (
        <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 dark:border-indigo-900 dark:bg-indigo-950/30">
          <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-200">비공개 모임 공유 링크</p>
          <p className="mt-1 text-[11px] text-muted-foreground">이 링크를 아는 사람만 모임에 접근할 수 있습니다.</p>
          <div className="mt-2 flex items-center gap-2">
            <input
              readOnly
              value={shareLink}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-lg border bg-background px-2 py-1.5 text-xs"
            />
            <Button size="sm" variant="outline" className="shrink-0" onClick={copyShareLink}>
              {copied ? <Check size={14} className="mr-1" /> : <Copy size={14} className="mr-1" />}
              {copied ? "복사됨" : "링크 복사"}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {shareLink ? (
          <Button size="sm" onClick={onSaved}>완료</Button>
        ) : (
          <>
            <Button size="sm" disabled={busy} onClick={save}>{busy ? "저장 중…" : "저장"}</Button>
            <Button size="sm" variant="outline" onClick={onClose}>취소</Button>
          </>
        )}
      </div>
    </div>
  );
}
