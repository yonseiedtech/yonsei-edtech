"use client";

/**
 * 자원봉사 배정 생성·편집 다이얼로그.
 * - 미배정 신청자 → 새 배정 생성 (역할 + 시프트)
 * - 기존 배정 → 역할·시프트·비상연락처·메모 인라인 편집
 */

import { useState } from "react";
import { Plus, Trash2, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  VOLUNTEER_ROLE_LABELS,
  type VolunteerAssignment,
  type VolunteerRoleKey,
  type VolunteerShift,
} from "@/types";
import { ROLE_ORDER } from "./volunteer-utils";

export interface AssignmentDraft {
  role: VolunteerRoleKey;
  customRoleName?: string;
  shifts: VolunteerShift[];
  emergencyContact?: string;
  notes?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 표시용 대상 이름 */
  targetName: string;
  /** 편집 모드면 기존 배정, 생성 모드면 undefined */
  existing?: VolunteerAssignment;
  saving: boolean;
  onSubmit: (draft: AssignmentDraft) => void;
}

function emptyShift(): VolunteerShift {
  return { startTime: "09:00", endTime: "12:00" };
}

export default function AssignmentDialog({
  open,
  onOpenChange,
  targetName,
  existing,
  saving,
  onSubmit,
}: Props) {
  const isEdit = !!existing;
  const [role, setRole] = useState<VolunteerRoleKey>(existing?.role ?? "registration");
  const [customRoleName, setCustomRoleName] = useState(existing?.customRoleName ?? "");
  const [shifts, setShifts] = useState<VolunteerShift[]>(
    existing?.shifts && existing.shifts.length > 0
      ? existing.shifts.map((s) => ({ ...s }))
      : [emptyShift()],
  );
  const [emergencyContact, setEmergencyContact] = useState(existing?.emergencyContact ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");

  function updateShift(i: number, patch: Partial<VolunteerShift>) {
    setShifts((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  function removeShift(i: number) {
    setShifts((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleSubmit() {
    const cleanShifts = shifts
      .filter((s) => s.startTime && s.endTime)
      .map((s) => ({
        startTime: s.startTime,
        endTime: s.endTime,
        ...(s.location?.trim() ? { location: s.location.trim() } : {}),
        ...(s.trackName?.trim() ? { trackName: s.trackName.trim() } : {}),
        ...(s.note?.trim() ? { note: s.note.trim() } : {}),
      }));
    onSubmit({
      role,
      customRoleName: role === "other" && customRoleName.trim() ? customRoleName.trim() : undefined,
      shifts: cleanShifts,
      emergencyContact: emergencyContact.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-1/2 bottom-auto my-0 max-h-[calc(100vh-2rem)] -translate-y-1/2 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "배정 편집" : "역할 배정"} — {targetName}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "역할·시프트·비상연락처·메모를 수정합니다."
              : "이 신청자에게 자원봉사 역할과 활동 시간대를 배정합니다."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* 역할 */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">역할</label>
            <div className="grid grid-cols-3 gap-1.5">
              {ROLE_ORDER.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setRole(k)}
                  className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-colors ${
                    role === k
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-input bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {VOLUNTEER_ROLE_LABELS[k]}
                </button>
              ))}
            </div>
            {role === "other" && (
              <input
                type="text"
                value={customRoleName}
                onChange={(e) => setCustomRoleName(e.target.value)}
                placeholder="사용자 정의 역할명 (예: 무대 운영)"
                className="mt-1.5 w-full rounded-md border px-2.5 py-1.5 text-xs"
              />
            )}
          </div>

          {/* 시프트 */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">활동 시간대 (시프트)</label>
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={() => setShifts((prev) => [...prev, emptyShift()])}
              >
                <Plus size={12} /> 시프트 추가
              </Button>
            </div>
            {shifts.length === 0 ? (
              <p className="rounded-md border border-dashed bg-muted/20 p-3 text-center text-[11px] text-muted-foreground">
                시프트가 없습니다. 추가하지 않고 저장할 수도 있습니다.
              </p>
            ) : (
              <div className="space-y-2">
                {shifts.map((s, i) => (
                  <div key={i} className="rounded-lg border bg-muted/10 p-2.5">
                    <div className="mb-1.5 flex items-center gap-2">
                      <Clock size={12} className="text-muted-foreground" />
                      <input
                        type="time"
                        value={s.startTime}
                        onChange={(e) => updateShift(i, { startTime: e.target.value })}
                        className="rounded border px-1.5 py-1 text-xs"
                      />
                      <span className="text-xs text-muted-foreground">~</span>
                      <input
                        type="time"
                        value={s.endTime}
                        onChange={(e) => updateShift(i, { endTime: e.target.value })}
                        className="rounded border px-1.5 py-1 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => removeShift(i)}
                        className="ml-auto text-muted-foreground hover:text-destructive"
                        aria-label="시프트 삭제"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        value={s.trackName ?? ""}
                        onChange={(e) => updateShift(i, { trackName: e.target.value })}
                        placeholder="담당 트랙 (예: A 트랙)"
                        className="rounded border px-2 py-1 text-[11px]"
                      />
                      <input
                        type="text"
                        value={s.location ?? ""}
                        onChange={(e) => updateShift(i, { location: e.target.value })}
                        placeholder="장소 (예: 409호)"
                        className="rounded border px-2 py-1 text-[11px]"
                      />
                    </div>
                    <input
                      type="text"
                      value={s.note ?? ""}
                      onChange={(e) => updateShift(i, { note: e.target.value })}
                      placeholder="메모 (선택)"
                      className="mt-1.5 w-full rounded border px-2 py-1 text-[11px]"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 비상연락처 */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">
              비상 연락처 (선택)
            </label>
            <input
              type="text"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              placeholder="본부석 전화 등"
              className="w-full rounded-md border px-2.5 py-1.5 text-xs"
            />
          </div>

          {/* 메모 */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">
              운영진 메모 (선택)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="배정 관련 메모"
              className="w-full resize-none rounded-md border px-2.5 py-1.5 text-xs"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button type="button" size="sm" disabled={saving} onClick={handleSubmit}>
            {saving ? "저장 중…" : isEdit ? "변경 저장" : "배정 완료"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
