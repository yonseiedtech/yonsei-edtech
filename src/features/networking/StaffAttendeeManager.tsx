"use client";

/**
 * StaffAttendeeManager — 운영진 참석자 수기 관리 (2026-07-19).
 * 상세 페이지 "참석자 관리"에서 staff 가 회원 검색으로 참석자를 직접 추가(현장·대리 등록)하거나
 * 삭제한다. RSVP(본인 신청)와 구분되는 출석 확정 개념 — 추가는 서버(/api/networking/attendee,
 * Admin SDK)가 staff 권한 검증 후 생성(대리 RSVP 를 막는 rules 우회, rules 변경 없음).
 * 삭제는 staff 가 클라이언트에서 직접(networking_rsvps delete staff 허용). 변경은 감사 로그 기록.
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Trash2, Check, Users, UserCog } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { networkingRsvpsApi } from "@/lib/bkend";
import { auth } from "@/lib/firebase";
import { logAudit } from "@/lib/audit";
import { useAuthStore } from "@/features/auth/auth-store";
import MemberAutocomplete, { type SelectedMember } from "@/components/ui/MemberAutocomplete";
import { RSVP_STATUS_LABELS, type NetworkingRsvp } from "@/types";
import { semesterLabelFromKey } from "@/lib/semester";

export default function StaffAttendeeManager({
  eventId,
  eventTitle,
  semesterKey,
  onChanged,
}: {
  eventId: string;
  eventTitle: string;
  /** 학기 맥락 표시용 ("YYYY-1" | "YYYY-2") */
  semesterKey?: string | null;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [selected, setSelected] = useState<SelectedMember | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: rsvps = [] } = useQuery({
    queryKey: ["networking-rsvps-event", eventId],
    queryFn: async () => (await networkingRsvpsApi.listByEvent(eventId)).data as NetworkingRsvp[],
    staleTime: 30_000,
  });

  // 참석·대기자만 관리 대상으로 노출(불참·미정 제외). 회원 → 게스트 순.
  const attendees = rsvps
    .filter((r) => r.status === "attending" || r.status === "waitlisted")
    .sort((a, b) => Number(!!a.isGuest) - Number(!!b.isGuest));
  const memberIds = rsvps.filter((r) => r.userId).map((r) => r.userId as string);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["networking-rsvps-event", eventId] });
    qc.invalidateQueries({ queryKey: ["networking-attendee-counts"] });
    onChanged();
  }

  async function addAttendee() {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("로그인이 필요합니다.");
      const res = await fetch("/api/networking/attendee", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, userId: selected.id, displayName: selected.name }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "참석자 등록에 실패했습니다.");
      }
      toast.success(`${selected.name}님을 참석자로 추가했습니다.`);
      void logAudit({
        action: "모임 참석자 수기 추가",
        category: "member",
        detail: `「${eventTitle}」에 ${selected.name} 참석자 추가`,
        targetId: selected.id,
        targetName: selected.name,
        userId: user?.id ?? "",
        userName: user?.name ?? "운영진",
      });
      setSelected(null);
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "참석자 등록에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function removeAttendee(r: NetworkingRsvp) {
    if (busy) return;
    if (!window.confirm(`${r.displayName}님을 참석자 명단에서 삭제하시겠어요?`)) return;
    setBusy(true);
    try {
      await networkingRsvpsApi.remove(r.id);
      toast.success(`${r.displayName}님을 삭제했습니다.`);
      void logAudit({
        action: "모임 참석자 삭제",
        category: "member",
        detail: `「${eventTitle}」에서 ${r.displayName} 참석자 삭제`,
        targetId: r.userId ?? r.id,
        targetName: r.displayName,
        userId: user?.id ?? "",
        userName: user?.name ?? "운영진",
      });
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "삭제에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3.5 rounded-xl border border-primary/25 bg-primary/[0.03] p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold">
        <UserCog size={13} className="text-primary" />
        운영진 참석자 관리
        {semesterKey && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {semesterLabelFromKey(semesterKey)}
          </span>
        )}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        현장·대리 등록용 — 회원을 검색해 참석자로 추가하거나 삭제합니다(감사 로그 기록).
      </p>

      {/* 회원 검색 추가 */}
      <div className="mt-2 flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <MemberAutocomplete
            value={selected?.id ?? ""}
            displayName={selected?.name}
            onSelect={(m) => setSelected(m)}
            onClear={() => setSelected(null)}
            excludeIds={memberIds}
            placeholder="회원 이름·학번 검색"
          />
        </div>
        <button
          type="button"
          disabled={!selected || busy}
          onClick={addAttendee}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <UserPlus size={12} /> 추가
        </button>
      </div>

      {/* 참석자 명단 */}
      <div className="mt-3">
        <p className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
          <Users size={11} /> 참석자 {attendees.length}명
        </p>
        {attendees.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">아직 참석자가 없습니다.</p>
        ) : (
          <ul className="space-y-1">
            {attendees.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-2 rounded-lg border bg-card px-2.5 py-1.5 text-xs"
              >
                <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <span className="truncate font-medium">{r.displayName}</span>
                  {r.isGuest && (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">게스트</span>
                  )}
                  {r.addedByStaff && (
                    <span className="rounded-full bg-info/10 px-1.5 py-0.5 text-[10px] font-medium text-info">현장등록</span>
                  )}
                  {r.status === "waitlisted" && (
                    <span className="rounded-full bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                      {RSVP_STATUS_LABELS.waitlisted}
                    </span>
                  )}
                  {r.attendedAt && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
                      <Check size={9} /> 참석확인
                    </span>
                  )}
                  {(r.companions ?? 0) > 0 && (
                    <span className="text-[10px] text-muted-foreground">동반 {r.companions}</span>
                  )}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => removeAttendee(r)}
                  aria-label={`${r.displayName} 삭제`}
                  className={cn(
                    "shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50",
                  )}
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
