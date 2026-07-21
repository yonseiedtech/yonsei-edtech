"use client";

/**
 * 모임·행사 등록/수정 폼 (사이클 73 console/networking 인라인 폼에서 추출).
 * console(운영진 콘솔)과 /gatherings(staff+ 빠른 생성 다이얼로그) 양쪽에서 공용으로 사용.
 */

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { X, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteField } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { networkingEventsApi, eventTokensApi, eventInvitesApi, networkingRsvpsApi } from "@/lib/bkend";
import MemberAutocomplete, { type SelectedMember } from "@/components/ui/MemberAutocomplete";
import { useAllMembers } from "@/features/member/useMembers";
import {
  notifyGatheringInvite,
  notifyGatheringCancelled,
  notifyGatheringPostponed,
  notifyGatheringPollStarted,
} from "@/features/notifications/notify";
import { formatEventDate } from "@/features/networking/networking-helpers";
import { semesterKeyOf } from "@/lib/semester";
import { uploadImage } from "@/lib/upload";
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

/**
 * 자주 쓰는 모임 프리셋 (2026-07-18 생성 간편화) — 유형·제목을 1클릭 프리필한다.
 * schedulingMode 가 지정된 프리셋은 일정 결정 방식까지 세팅(예: 가능일 투표로 시작).
 */
const EVENT_PRESETS: {
  label: string;
  type: NetworkingEventType;
  title: string;
  schedulingMode?: "fixed" | "poll";
}[] = [
  { label: "개강총회", type: "opening", title: "개강총회" },
  { label: "종강총회", type: "closing", title: "종강총회" },
  { label: "정기모임", type: "regular", title: "정기모임" },
  { label: "식사·뒤풀이", type: "casual", title: "식사 모임" },
  { label: "MT", type: "mt", title: "MT" },
  { label: "가능일 투표로 시작", type: "regular", title: "", schedulingMode: "poll" },
];

/**
 * 시간대 프리셋 (작업 2026-07-14 · 칩 선택) — 09:00~22:00 을 일관되게 30분 간격으로 생성.
 * 프리셋 외 시각(범위 밖·비 30분 단위)은 커스텀 입력(HH:MM)으로 추가할 수 있다.
 */
function buildHalfHourGrid(startHour: number, endHour: number): string[] {
  const out: string[] = [];
  for (let m = startHour * 60; m <= endHour * 60; m += 30) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    out.push(`${String(h).padStart(2, "0")}:${mm === 0 ? "00" : "30"}`);
  }
  return out;
}
const POLL_TIME_PRESETS = buildHalfHourGrid(9, 22); // 09:00 ~ 22:00, 30분 간격
/** 신규/미설정 이벤트 기본 선택 (기존 자유 텍스트 기본값과 동일) */
const DEFAULT_SLOT_SELECTION = ["12:00", "15:00", "18:00", "19:00", "20:00"];
/** "HH:MM" 형식 검증 (0~23:0~59) */
const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

const arraysEqual = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();
/** 시각 정렬 (문자열 HH:MM 사전순 = 시간순) */
const sortTimes = (arr: string[]) => Array.from(new Set(arr)).sort();

interface EventForm {
  type: NetworkingEventType;
  title: string;
  description: string;
  schedulingMode: "fixed" | "poll";
  startAt: string; // datetime-local
  pollPeriodStart: string; // date
  pollPeriodEnd: string; // date
  // 시간대 — 칩 선택(작업 2026-07-14). 평일/주말 구분.
  pollSameSlots: boolean; // 평일/주말 동일 세트 여부
  pollTimeSlotsWeekday: string[]; // 평일(월~금) — same 모드면 공통 세트
  pollTimeSlotsWeekend: string[]; // 주말(토·일)
  pollDeadline: string; // datetime-local
  pollDecisionMode: "manual" | "auto";
  location: string;
  feeAmount: string;
  autoDues: boolean;
  rsvpDeadline: string;
  capacity: string;
  hostName: string;
  semester: string;
  posterUrl: string;
  visibility: "public" | "private";
  status: NetworkingEventStatus;
  published: boolean;
}

const EMPTY_FORM: EventForm = {
  type: "regular", title: "", description: "", schedulingMode: "fixed", startAt: "",
  // 시간대 기본 — 평일/주말 동일 세트로 기본값 선택(staff 가 칩으로 수정)
  pollPeriodStart: "", pollPeriodEnd: "",
  pollSameSlots: true,
  pollTimeSlotsWeekday: [...DEFAULT_SLOT_SELECTION],
  pollTimeSlotsWeekend: [...DEFAULT_SLOT_SELECTION],
  pollDeadline: "", pollDecisionMode: "auto",
  location: "", feeAmount: "0", autoDues: false, rsvpDeadline: "", capacity: "", hostName: "", semester: "", posterUrl: "", visibility: "public", status: "upcoming", published: true,
};

/** NetworkingEvent → EventForm (수정·복제 공통 프리필) */
function eventToForm(ev: NetworkingEvent): EventForm {
  // 마이그레이션: weekday/weekend 필드가 있으면 그대로, 없으면 레거시 pollTimeSlots 로 평일·주말 프리필.
  const legacy = ev.pollTimeSlots ?? [];
  const weekday = ev.pollTimeSlotsWeekday && ev.pollTimeSlotsWeekday.length > 0 ? ev.pollTimeSlotsWeekday : legacy;
  const weekend = ev.pollTimeSlotsWeekend && ev.pollTimeSlotsWeekend.length > 0 ? ev.pollTimeSlotsWeekend : weekday;
  return {
    type: ev.type, title: ev.title, description: ev.description ?? "",
    schedulingMode: ev.schedulingMode ?? "fixed",
    startAt: isoToLocal(ev.startAt),
    pollPeriodStart: ev.pollPeriodStart ?? "", pollPeriodEnd: ev.pollPeriodEnd ?? "",
    pollSameSlots: arraysEqual(weekday, weekend),
    pollTimeSlotsWeekday: sortTimes(weekday),
    pollTimeSlotsWeekend: sortTimes(weekend),
    pollDeadline: isoToLocal(ev.pollDeadline), pollDecisionMode: ev.pollDecisionMode ?? "auto",
    location: ev.location ?? "",
    feeAmount: String(ev.feeAmount ?? 0), autoDues: ev.autoDues ?? false, rsvpDeadline: isoToLocal(ev.rsvpDeadline),
    capacity: ev.capacity ? String(ev.capacity) : "", hostName: ev.hostName ?? "",
    semester: ev.semester ?? "",
    posterUrl: ev.posterUrl ?? "",
    visibility: ev.visibility ?? "public",
    status: ev.status, published: ev.published,
  };
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
  const [posterBusy, setPosterBusy] = useState(false);
  // 저장 후 private 이면 공유 링크를 폼 안에서 복사할 수 있게 노출
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const set = <K extends keyof EventForm>(k: K, v: EventForm[K]) => setForm((p) => ({ ...p, [k]: v }));

  // 시간대 칩 — 커스텀 시각 입력(평일/주말 각각)
  const [customWeekday, setCustomWeekday] = useState("");
  const [customWeekend, setCustomWeekend] = useState("");
  const slotKey = (kind: "weekday" | "weekend") =>
    kind === "weekday" ? "pollTimeSlotsWeekday" : "pollTimeSlotsWeekend";
  function toggleSlot(kind: "weekday" | "weekend", time: string) {
    const key = slotKey(kind);
    setForm((p) => {
      const cur = p[key];
      const next = cur.includes(time) ? cur.filter((t) => t !== time) : sortTimes([...cur, time]);
      return { ...p, [key]: next };
    });
  }
  function addCustomSlot(kind: "weekday" | "weekend") {
    const raw = (kind === "weekday" ? customWeekday : customWeekend).trim();
    if (!TIME_RE.test(raw)) {
      toast.error("시각은 HH:MM 형식으로 입력해주세요. 예: 21:30");
      return;
    }
    // 한 자리 시(예: 9:00)를 두 자리로 정규화해 프리셋과 정렬 일관성 유지
    const [h, m] = raw.split(":");
    const norm = `${h.padStart(2, "0")}:${m}`;
    const key = slotKey(kind);
    setForm((p) => (p[key].includes(norm) ? p : { ...p, [key]: sortTimes([...p[key], norm]) }));
    if (kind === "weekday") setCustomWeekday("");
    else setCustomWeekend("");
  }

  // H2(2026-07-08): 비공개 모임 초대 알림 — 신규 초대 대상 선택 및 기존 초대자 표시
  const { members: allMembers } = useAllMembers();
  const [inviteSelections, setInviteSelections] = useState<SelectedMember[]>([]);
  // Phase 4-A(2026-07-09): 초대 명단은 이벤트 문서가 아니라 networking_event_invites 에서 조회한다.
  // 레거시 폴백 — 이벤트 문서에 남은 invitedUserIds 도 병합해 표시(수정 저장 시 invites 로 이관됨).
  const [loadedInviteIds, setLoadedInviteIds] = useState<string[] | null>(null);
  useEffect(() => {
    if (!initial?.id) {
      setLoadedInviteIds([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const invites = await eventInvitesApi.get(initial.id);
      if (cancelled) return;
      const fromDoc = invites?.invitedUserIds ?? [];
      const legacy = initial.invitedUserIds ?? []; // 레거시(이벤트 문서 잔존) 병합
      setLoadedInviteIds(Array.from(new Set([...fromDoc, ...legacy])));
    })();
    return () => {
      cancelled = true;
    };
  }, [initial?.id, initial?.invitedUserIds]);
  const existingInvitedIds = loadedInviteIds ?? initial?.invitedUserIds ?? [];
  const existingInvitedMembers = allMembers.filter((m) => existingInvitedIds.includes(m.id));

  async function handlePosterFile(file: File | undefined) {
    if (!file) return;
    setPosterBusy(true);
    try {
      const dataUrl = await uploadImage(file);
      set("posterUrl", dataUrl);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "포스터 업로드에 실패했습니다.");
    } finally {
      setPosterBusy(false);
    }
  }

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
      // 시간대 — same 모드면 평일 세트를 주말에도 사용. pollTimeSlots(공통)은 하위호환으로 평일 세트를 저장.
      const slotWeekday = sortTimes(form.pollTimeSlotsWeekday);
      const slotWeekend = form.pollSameSlots ? slotWeekday : sortTimes(form.pollTimeSlotsWeekend);
      const payload = {
        type: form.type, title: form.title.trim(), description: form.description.trim() || undefined,
        schedulingMode: form.schedulingMode,
        // Medium-1(2026-07-08): poll 모드는 startAt 을 반드시 비운다(고정→poll 전환 시 잔존 startAt 이
        // 투표 UI 를 숨기는 버그 차단). gatherings 카드가 startAt 유무로 투표/확정을 분기한다.
        startAt: isPoll ? "" : localToIso(form.startAt),
        pollPeriodStart: isPoll ? form.pollPeriodStart : undefined,
        pollPeriodEnd: isPoll ? form.pollPeriodEnd : undefined,
        pollTimeSlots: isPoll ? slotWeekday : undefined,
        pollTimeSlotsWeekday: isPoll ? slotWeekday : undefined,
        pollTimeSlotsWeekend: isPoll ? slotWeekend : undefined,
        pollDeadline: isPoll && form.pollDeadline ? localToIso(form.pollDeadline) : undefined,
        pollDecisionMode: isPoll ? form.pollDecisionMode : undefined,
        location: form.location.trim() || undefined,
        feeAmount: Number(form.feeAmount) || 0,
        // G19(2026-07-09): 참석 확정 시 회비 자동 생성 옵션. 무료 행사면 저장하지 않음.
        autoDues: Number(form.feeAmount) > 0 ? form.autoDues : undefined,
        rsvpDeadline: form.rsvpDeadline ? localToIso(form.rsvpDeadline) : undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        hostName: form.hostName.trim() || undefined,
        // 학기 단위 관리(2026-07-19): 수동 입력 우선, 비우면 일시(poll 은 후보 기간 시작)로부터 자동 산정.
        semester:
          form.semester.trim() ||
          (isPoll ? semesterKeyOf(form.pollPeriodStart) : semesterKeyOf(localToIso(form.startAt))) ||
          undefined,
        posterUrl: form.posterUrl || undefined,
        visibility: form.visibility,
        // 레거시 shareToken 필드가 남아 있으면 제거(마이그레이션) — 없으면 저장하지 않음.
        shareToken: initial?.shareToken
          ? (deleteField() as unknown as string | undefined)
          : undefined,
        // Phase 4-A(2026-07-09): 레거시 invitedUserIds 가 이벤트 문서에 남아 있으면 제거(마이그레이션).
        // 초대 명단은 아래에서 networking_event_invites 로 병합·이관한다.
        invitedUserIds: initial?.invitedUserIds
          ? (deleteField() as unknown as string[] | undefined)
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
      // Phase 4-A(2026-07-09): 초대 누적 기록은 이벤트 문서 대신 networking_event_invites(staff 전용)에 upsert.
      // 신규 선택이 있거나 레거시 invitedUserIds 이관이 필요할 때만 invites 문서를 기록한다.
      if (isPrivate && token) {
        const legacyInviteIds = initial?.invitedUserIds ?? [];
        const newInviteIds = inviteSelections.map((m) => m.id);
        if (newInviteIds.length > 0) {
          await Promise.all(
            newInviteIds.map((uid) => notifyGatheringInvite(uid, form.title.trim(), token as string)),
          );
        }
        if (newInviteIds.length > 0 || legacyInviteIds.length > 0) {
          // existingInvitedIds 는 invites 문서 + 레거시를 이미 병합한 값(useEffect 로 로드).
          await eventInvitesApi.upsert(eventId, {
            invitedUserIds: Array.from(new Set([...existingInvitedIds, ...newInviteIds])),
            updatedBy: createdByUid,
          });
        }
        if (newInviteIds.length > 0) setInviteSelections([]);
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

  /** 시간대 칩 섹션 (프리셋 ∪ 선택 → 정렬, 토글 + 커스텀 입력) */
  function renderSlotChips(kind: "weekday" | "weekend", label: string) {
    const selected = kind === "weekday" ? form.pollTimeSlotsWeekday : form.pollTimeSlotsWeekend;
    const chips = sortTimes([...POLL_TIME_PRESETS, ...selected]);
    const customVal = kind === "weekday" ? customWeekday : customWeekend;
    const setCustomVal = kind === "weekday" ? setCustomWeekday : setCustomWeekend;
    return (
      <div>
        <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">{label}</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={`${label} 시간대 선택`}>
          {chips.map((t) => {
            const active = selected.includes(t);
            return (
              <button
                key={t}
                type="button"
                aria-pressed={active}
                onClick={() => toggleSlot(kind, t)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium tabular-nums transition-colors",
                  active
                    ? "border-cat-1 bg-cat-1 text-white"
                    : "border-border bg-background text-muted-foreground hover:border-cat-1/40 hover:text-foreground",
                )}
              >
                {t}
              </button>
            );
          })}
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          <Input
            value={customVal}
            onChange={(e) => setCustomVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomSlot(kind);
              }
            }}
            placeholder="직접 추가 (예: 21:30)"
            className="h-7 w-36 text-xs"
          />
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => addCustomSlot(kind)}>
            추가
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{initial ? "행사 수정" : duplicateFrom ? "행사 복제" : "새 행사 등록"}</h2>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
      </div>
      {/* 2026-07-18 생성 간편화: 신규 등록 시 자주 쓰는 모임을 1클릭 프리필 */}
      {!initial && !duplicateFrom && (
        <div className="mb-3 rounded-xl border border-dashed bg-muted/30 p-3">
          <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">빠른 시작 — 자주 쓰는 모임</p>
          <div className="flex flex-wrap gap-1.5">
            {EVENT_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    type: p.type,
                    title: p.title,
                    schedulingMode: p.schedulingMode ?? prev.schedulingMode,
                  }))
                }
                className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
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
                    ? "bg-cat-1 text-white"
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
            <div className="text-xs sm:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-muted-foreground">가능 시간대 (칩을 눌러 선택)</span>
                <label className="inline-flex items-center gap-1.5 font-normal text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={form.pollSameSlots}
                    onChange={(e) => set("pollSameSlots", e.target.checked)}
                  />
                  평일/주말 동일
                </label>
              </div>
              <div className="mt-2 space-y-3">
                {form.pollSameSlots ? (
                  renderSlotChips("weekday", "평일·주말 공통")
                ) : (
                  <>
                    {renderSlotChips("weekday", "평일 (월~금)")}
                    {renderSlotChips("weekend", "주말 (토·일)")}
                  </>
                )}
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                아무것도 선택하지 않으면 기본 시간대(12:00~20:00)가 적용됩니다.
              </p>
            </div>
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
                <p className="mt-1 text-[11px] font-medium text-destructive">
                  자동 확정은 투표 마감일이 필요합니다. 위에서 투표 마감을 설정하세요.
                </p>
              )}
              {form.pollDecisionMode === "manual" && !form.pollDeadline && (
                <p className="mt-1 text-[11px] text-warning">
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
          <Input value={form.semester} onChange={(e) => set("semester", e.target.value)} className="mt-1" placeholder="비우면 일시로 자동 (예: 2026-1)" />
        </label>
        <label className="text-xs sm:col-span-2">설명
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} className="mt-1 w-full rounded-lg border bg-background px-2 py-1.5 text-sm" />
        </label>
        {/* 포스터 이미지 (선택) — 상세 페이지 상단에 노출. 1MB 이하 자동 리사이즈. */}
        <div className="text-xs sm:col-span-2">
          <span className="text-muted-foreground">포스터 (선택)</span>
          <div className="mt-1 flex items-center gap-3">
            {form.posterUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.posterUrl} alt="포스터 미리보기" className="h-20 w-20 rounded-lg border object-cover" />
            )}
            <div className="flex flex-col gap-1.5">
              <input
                type="file"
                accept="image/*"
                disabled={posterBusy}
                onChange={(e) => handlePosterFile(e.target.files?.[0])}
                className="text-[11px] file:mr-2 file:rounded-md file:border file:bg-muted file:px-2 file:py-1 file:text-[11px]"
              />
              {posterBusy && <span className="text-[11px] text-muted-foreground">업로드 중…</span>}
              {form.posterUrl && !posterBusy && (
                <button type="button" onClick={() => set("posterUrl", "")} className="self-start text-[11px] text-muted-foreground underline underline-offset-2 hover:text-destructive">
                  포스터 제거
                </button>
              )}
            </div>
          </div>
        </div>
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
                    ? "bg-cat-1 text-white"
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
                        className="inline-flex items-center gap-1 rounded-full bg-cat-1/10 px-2.5 py-1 text-[11px] text-cat-1"
                      >
                        {m.name}
                        <button
                          type="button"
                          onClick={() => setInviteSelections((p) => p.filter((s) => s.id !== m.id))}
                          className="hover:text-destructive"
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
        <div className="mt-4 rounded-xl border border-cat-1/20 bg-cat-1/5 p-3">
          <p className="text-xs font-semibold text-cat-1">비공개 모임 공유 링크</p>
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
