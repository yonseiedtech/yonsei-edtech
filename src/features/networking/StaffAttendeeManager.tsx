"use client";

/**
 * StaffAttendeeManager — 운영진 참석자 수기 관리 (2026-07-19).
 * 상세 페이지 "참석자 관리"에서 staff 가 회원 검색으로 참석자를 직접 추가(현장·대리 등록)하거나
 * 삭제한다. RSVP(본인 신청)와 구분되는 출석 확정 개념 — 추가는 서버(/api/networking/attendee,
 * Admin SDK)가 staff 권한 검증 후 생성(대리 RSVP 를 막는 rules 우회, rules 변경 없음).
 * 삭제는 staff 가 클라이언트에서 직접(networking_rsvps delete staff 허용). 변경은 감사 로그 기록.
 */

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Trash2, Check, Users, UserCog, ListChecks, X, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { networkingRsvpsApi } from "@/lib/bkend";
import { auth } from "@/lib/firebase";
import { logAudit } from "@/lib/audit";
import { useAuthStore } from "@/features/auth/auth-store";
import { useAllMembers } from "@/features/member/useMembers";
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
  // 리스트 복수 선택 팝업 상태
  const [listOpen, setListOpen] = useState(false);
  const [listQuery, setListQuery] = useState("");
  const [listSelected, setListSelected] = useState<Set<string>>(new Set());

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
  const memberIdSet = useMemo(() => new Set(memberIds), [memberIds]);

  // 리스트 팝업용 전체 회원 (이미 참석/신청한 회원 제외 + 검색 필터)
  const { members: allMembers, isLoading: membersLoading } = useAllMembers();
  const listCandidates = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    return allMembers.filter((m) => {
      if (memberIdSet.has(m.id)) return false;
      if (!q) return true;
      return (
        (m.name ?? "").toLowerCase().includes(q) ||
        (m.studentId ?? "").toLowerCase().includes(q)
      );
    });
  }, [allMembers, memberIdSet, listQuery]);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["networking-rsvps-event", eventId] });
    qc.invalidateQueries({ queryKey: ["networking-attendee-counts"] });
    onChanged();
  }

  /** 참석자 1명 서버 등록 (감사 로그 포함). 성공 시 true. */
  async function postAttendee(token: string, userId: string, displayName: string): Promise<boolean> {
    const res = await fetch("/api/networking/attendee", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, userId, displayName }),
    });
    if (!res.ok) return false;
    void logAudit({
      action: "모임 참석자 수기 추가",
      category: "member",
      detail: `「${eventTitle}」에 ${displayName} 참석자 추가`,
      targetId: userId,
      targetName: displayName,
      userId: user?.id ?? "",
      userName: user?.name ?? "운영진",
    });
    return true;
  }

  async function addAttendee() {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("로그인이 필요합니다.");
      const ok = await postAttendee(token, selected.id, selected.name);
      if (!ok) throw new Error("참석자 등록에 실패했습니다.");
      toast.success(`${selected.name}님을 참석자로 추가했습니다.`);
      setSelected(null);
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "참석자 등록에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  function toggleListSelect(id: string) {
    setListSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function addSelectedFromList() {
    if (listSelected.size === 0 || busy) return;
    setBusy(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("로그인이 필요합니다.");
      const targets = allMembers.filter((m) => listSelected.has(m.id));
      let ok = 0;
      let fail = 0;
      for (const m of targets) {
        // 순차 처리 — 서버 부하·중복 방지. 실패는 집계만 하고 계속.
        const success = await postAttendee(token, m.id, m.name ?? "회원");
        if (success) ok++;
        else fail++;
      }
      if (ok > 0) toast.success(`${ok}명을 참석자로 추가했습니다.${fail > 0 ? ` (${fail}명 실패)` : ""}`);
      else toast.error("참석자 추가에 실패했습니다.");
      setListSelected(new Set());
      setListQuery("");
      setListOpen(false);
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "참석자 추가에 실패했습니다.");
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
        현장·대리 등록용 — 회원을 검색하거나 목록에서 여러 명을 골라 참석자로 추가합니다(감사 로그 기록).
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

      {/* 리스트에서 복수 선택 */}
      <button
        type="button"
        disabled={busy}
        onClick={() => setListOpen(true)}
        className="mt-2 inline-flex items-center gap-1 rounded-full border border-primary/40 bg-card px-3 py-1.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/5 disabled:opacity-50"
      >
        <ListChecks size={12} /> 목록에서 여러 명 선택
      </button>

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

      {/* ── 복수 선택 팝업 ── */}
      {listOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="목록에서 참석자 선택"
        >
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setListOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
          />
          <div className="relative z-10 flex max-h-[80vh] w-full max-w-md flex-col rounded-t-2xl border bg-card p-4 shadow-2xl animate-in slide-in-from-bottom-4 duration-200 sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <ListChecks size={15} className="text-primary" /> 목록에서 참석자 선택
              </p>
              <button
                type="button"
                onClick={() => setListOpen(false)}
                aria-label="닫기"
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X size={16} />
              </button>
            </div>

            {/* 검색 */}
            <div className="relative mt-3">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={listQuery}
                onChange={(e) => setListQuery(e.target.value)}
                placeholder="이름·학번으로 좁히기"
                className="w-full rounded-lg border bg-background py-2 pl-8 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>

            {/* 목록 */}
            <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-lg border">
              {membersLoading ? (
                <p className="flex items-center justify-center gap-1.5 py-8 text-xs text-muted-foreground">
                  <Loader2 size={13} className="animate-spin" /> 회원을 불러오는 중…
                </p>
              ) : listCandidates.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  추가할 수 있는 회원이 없습니다.
                </p>
              ) : (
                <ul className="divide-y">
                  {listCandidates.map((m) => {
                    const checked = listSelected.has(m.id);
                    return (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => toggleListSelect(m.id)}
                          aria-pressed={checked}
                          className={cn(
                            "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors",
                            checked ? "bg-primary/5" : "hover:bg-muted",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                              checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                            )}
                          >
                            {checked && <Check size={11} />}
                          </span>
                          <span className="min-w-0 flex-1 truncate font-medium">{m.name}</span>
                          {m.generation != null && (
                            <span className="shrink-0 text-[11px] text-muted-foreground">{m.generation}기</span>
                          )}
                          {m.studentId && (
                            <span className="shrink-0 text-[11px] text-muted-foreground">{m.studentId}</span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* 하단 액션 */}
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{listSelected.size}명 선택됨</span>
              <button
                type="button"
                disabled={listSelected.size === 0 || busy}
                onClick={addSelectedFromList}
                className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {busy ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
                {listSelected.size > 0 ? `${listSelected.size}명 추가` : "추가"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
