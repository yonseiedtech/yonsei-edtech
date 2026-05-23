"use client";

/**
 * 배정된 봉사자 카드 — 운영 도구.
 * - 임무(duties) 추가·삭제·수정·체크 토글
 * - 역할·시프트·비상연락처·메모 인라인 편집 (다이얼로그)
 * - 배정 삭제
 */

import { useState } from "react";
import {
  Phone,
  MapPin,
  Clock,
  Pencil,
  Trash2,
  Plus,
  X,
  Check,
} from "lucide-react";
import {
  VOLUNTEER_ROLE_LABELS,
  type VolunteerAssignment,
  type VolunteerDuty,
} from "@/types";
import { Button } from "@/components/ui/button";
import { dutyId } from "./volunteer-utils";

interface Props {
  assignment: VolunteerAssignment;
  /**
   * duties 원자적 변경 — mutator 는 트랜잭션 내부에서 항상 최신 duties 를
   * 받으므로 stale prop 을 통째로 덮어쓰는 lost update 를 방지한다.
   */
  onMutateDuties: (mutator: (current: VolunteerDuty[]) => VolunteerDuty[]) => void;
  onEdit: () => void;
  onDelete: () => void;
  busy: boolean;
}

export default function VolunteerCard({
  assignment: v,
  onMutateDuties,
  onEdit,
  onDelete,
  busy,
}: Props) {
  const [newDuty, setNewDuty] = useState("");
  const [editingDutyId, setEditingDutyId] = useState<string | null>(null);
  const [editDutyText, setEditDutyText] = useState("");
  const duties = v.duties ?? [];

  function addDuty() {
    const text = newDuty.trim();
    if (!text) return;
    const created: VolunteerDuty = { id: dutyId(), text, checked: false };
    onMutateDuties((current) => [...current, created]);
    setNewDuty("");
  }

  function toggleDuty(id: string) {
    onMutateDuties((current) =>
      current.map((d) =>
        d.id === id
          ? {
              ...d,
              checked: !d.checked,
              checkedAt: !d.checked ? new Date().toISOString() : undefined,
            }
          : d,
      ),
    );
  }

  function removeDuty(id: string) {
    onMutateDuties((current) => current.filter((d) => d.id !== id));
  }

  function startEditDuty(d: VolunteerDuty) {
    setEditingDutyId(d.id);
    setEditDutyText(d.text);
  }

  function commitEditDuty() {
    const text = editDutyText.trim();
    const targetId = editingDutyId;
    if (text && targetId) {
      onMutateDuties((current) =>
        current.map((d) => (d.id === targetId ? { ...d, text } : d)),
      );
    }
    setEditingDutyId(null);
    setEditDutyText("");
  }

  const doneCount = duties.filter((d) => d.checked).length;

  return (
    <li className="rounded-2xl border bg-background p-4">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">
            {v.userName ?? "(이름 미상)"}
            {v.customRoleName && (
              <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                · {v.customRoleName}
              </span>
            )}
            {!v.userId && (
              <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                비회원
              </span>
            )}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {v.userAffiliation ?? ""}
            {v.userPhone && (
              <a
                href={`tel:${v.userPhone}`}
                className="ml-2 inline-flex items-center gap-0.5 text-primary hover:underline"
              >
                <Phone size={10} /> {v.userPhone}
              </a>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {duties.length > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              임무 {doneCount}/{duties.length}
            </span>
          )}
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={onEdit}
            disabled={busy}
            aria-label="배정 편집"
          >
            <Pencil size={13} />
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={onDelete}
            disabled={busy}
            aria-label="배정 삭제"
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 size={13} />
          </Button>
        </div>
      </div>

      {/* 역할 + 시프트 */}
      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="rounded bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
          {VOLUNTEER_ROLE_LABELS[v.role]}
        </span>
        {(v.shifts ?? []).map((s, i) => (
          <span key={i} className="inline-flex flex-wrap items-center gap-1">
            <span className="inline-flex items-center gap-0.5">
              <Clock size={10} /> {s.startTime}~{s.endTime}
            </span>
            {s.trackName && (
              <span className="rounded bg-muted px-1 py-0.5">{s.trackName}</span>
            )}
            {s.location && (
              <span className="inline-flex items-center gap-0.5">
                <MapPin size={10} /> {s.location}
              </span>
            )}
            {s.note && <span className="text-muted-foreground/70">· {s.note}</span>}
          </span>
        ))}
      </div>

      {/* 임무 체크리스트 */}
      <div className="mt-2 rounded-lg bg-muted/20 p-2.5">
        <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">임무 체크리스트</p>
        {duties.length > 0 && (
          <ul className="mb-2 space-y-1">
            {duties.map((d) => (
              <li key={d.id} className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleDuty(d.id)}
                  disabled={busy}
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    d.checked
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-input bg-card"
                  }`}
                  aria-label={d.checked ? "체크 해제" : "체크"}
                >
                  {d.checked && <Check size={10} />}
                </button>
                {editingDutyId === d.id ? (
                  <>
                    <input
                      type="text"
                      value={editDutyText}
                      onChange={(e) => setEditDutyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEditDuty();
                        if (e.key === "Escape") setEditingDutyId(null);
                      }}
                      autoFocus
                      className="flex-1 rounded border px-1.5 py-0.5 text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={commitEditDuty}
                      className="text-emerald-600 hover:text-emerald-700"
                      aria-label="저장"
                    >
                      <Check size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingDutyId(null)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="취소"
                    >
                      <X size={13} />
                    </button>
                  </>
                ) : (
                  <>
                    <span
                      className={`flex-1 text-[11px] ${
                        d.checked ? "text-muted-foreground line-through" : "text-foreground"
                      }`}
                    >
                      {d.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => startEditDuty(d)}
                      disabled={busy}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="임무 수정"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeDuty(d.id)}
                      disabled={busy}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="임무 삭제"
                    >
                      <Trash2 size={11} />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={newDuty}
            onChange={(e) => setNewDuty(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addDuty();
            }}
            placeholder="임무 추가"
            className="flex-1 rounded border px-2 py-1 text-[11px]"
          />
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={addDuty}
            disabled={busy || !newDuty.trim()}
          >
            <Plus size={11} /> 추가
          </Button>
        </div>
      </div>

      {(v.emergencyContact || v.notes) && (
        <div className="mt-2 rounded-lg bg-muted/30 p-2 text-[11px] leading-relaxed">
          {v.emergencyContact && (
            <p>
              <strong>비상 연락:</strong> {v.emergencyContact}
            </p>
          )}
          {v.notes && (
            <p>
              <strong>메모:</strong> {v.notes}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
