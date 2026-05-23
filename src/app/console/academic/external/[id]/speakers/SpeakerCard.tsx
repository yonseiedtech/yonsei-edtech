"use client";

/**
 * 배정된 발표자 카드 — Phase 1.
 *  - prepTasks 추가·삭제·수정·체크 토글 (VolunteerCard 의 duties 패턴 미러)
 *  - 유형별 세부 정보 표시 (paperDetails / posterDetails / mediaDetails)
 *  - 인라인 편집·삭제
 */

import { useState } from "react";
import {
  Phone,
  Mail,
  Pencil,
  Trash2,
  Plus,
  X,
  Check,
  Mic,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";
import {
  SPEAKER_SUBMISSION_TYPE_LABELS,
  SPEAKER_SUBMISSION_TYPE_COLORS,
  type SpeakerAssignment,
  type SpeakerPrepTask,
} from "@/types";
import { Button } from "@/components/ui/button";
import { taskId } from "./speaker-utils";

interface Props {
  assignment: SpeakerAssignment;
  /**
   * prepTasks 원자적 변경 — mutator 는 트랜잭션 내부에서 항상 최신 tasks 를
   * 받으므로 stale prop 을 통째로 덮어쓰는 lost update 를 방지한다.
   */
  onMutateTasks: (mutator: (current: SpeakerPrepTask[]) => SpeakerPrepTask[]) => void;
  onEdit: () => void;
  onDelete: () => void;
  busy: boolean;
}

const TYPE_ICON = {
  paper: Mic,
  poster: ImageIcon,
  media: Sparkles,
} as const;

export default function SpeakerCard({
  assignment: s,
  onMutateTasks,
  onEdit,
  onDelete,
  busy,
}: Props) {
  const [newTask, setNewTask] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const tasks = s.prepTasks ?? [];

  function addTask() {
    const text = newTask.trim();
    if (!text) return;
    const created: SpeakerPrepTask = { id: taskId(), text, checked: false };
    onMutateTasks((current) => [...current, created]);
    setNewTask("");
  }

  function toggleTask(id: string) {
    onMutateTasks((current) =>
      current.map((t) =>
        t.id === id
          ? {
              ...t,
              checked: !t.checked,
              checkedAt: !t.checked ? new Date().toISOString() : undefined,
            }
          : t,
      ),
    );
  }

  function removeTask(id: string) {
    onMutateTasks((current) => current.filter((t) => t.id !== id));
  }

  function startEdit(t: SpeakerPrepTask) {
    setEditingId(t.id);
    setEditText(t.text);
  }

  function commitEdit() {
    const text = editText.trim();
    const targetId = editingId;
    if (text && targetId) {
      onMutateTasks((current) =>
        current.map((t) => (t.id === targetId ? { ...t, text } : t)),
      );
    }
    setEditingId(null);
    setEditText("");
  }

  const doneCount = tasks.filter((t) => t.checked).length;
  const Icon = TYPE_ICON[s.submissionType];
  const typeColor = SPEAKER_SUBMISSION_TYPE_COLORS[s.submissionType];

  return (
    <li className="rounded-2xl border bg-background p-4">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
            {s.userName ?? "(이름 미상)"}
            <span
              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${typeColor}`}
            >
              <Icon size={10} />
              {SPEAKER_SUBMISSION_TYPE_LABELS[s.submissionType]}
            </span>
            {!s.userId && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                비회원
              </span>
            )}
          </p>
          {s.paperTitle && (
            <p className="mt-0.5 text-[12px] font-medium text-foreground">
              {s.paperTitle}
            </p>
          )}
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {s.userAffiliation && <span>{s.userAffiliation}</span>}
            {s.userPhone && (
              <a
                href={`tel:${s.userPhone}`}
                className="ml-2 inline-flex items-center gap-0.5 text-primary hover:underline"
              >
                <Phone size={10} /> {s.userPhone}
              </a>
            )}
            {s.userEmail && (
              <a
                href={`mailto:${s.userEmail}`}
                className="ml-2 inline-flex items-center gap-0.5 text-primary hover:underline"
              >
                <Mail size={10} /> {s.userEmail}
              </a>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {tasks.length > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {doneCount}/{tasks.length}
            </span>
          )}
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={onEdit}
            disabled={busy}
            aria-label="발표자 편집"
          >
            <Pencil size={13} />
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={onDelete}
            disabled={busy}
            aria-label="발표자 삭제"
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 size={13} />
          </Button>
        </div>
      </div>

      {/* 유형별 세부 정보 */}
      <SubmissionDetails assignment={s} />

      {/* 준비 체크리스트 */}
      <div className="mt-2 rounded-lg bg-muted/20 p-2.5">
        <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">
          준비 체크리스트
        </p>
        {tasks.length > 0 && (
          <ul className="mb-2 space-y-1">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleTask(t.id)}
                  disabled={busy}
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    t.checked
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-input bg-card"
                  }`}
                  aria-label={t.checked ? "체크 해제" : "체크"}
                >
                  {t.checked && <Check size={10} />}
                </button>
                {editingId === t.id ? (
                  <>
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                      className="flex-1 rounded border px-1.5 py-0.5 text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={commitEdit}
                      className="text-emerald-600 hover:text-emerald-700"
                      aria-label="저장"
                    >
                      <Check size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
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
                        t.checked ? "text-muted-foreground line-through" : "text-foreground"
                      }`}
                    >
                      {t.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => startEdit(t)}
                      disabled={busy}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="항목 수정"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeTask(t.id)}
                      disabled={busy}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="항목 삭제"
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
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addTask();
            }}
            placeholder="항목 추가"
            className="flex-1 rounded border px-2 py-1 text-[11px]"
          />
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={addTask}
            disabled={busy || !newTask.trim()}
          >
            <Plus size={11} /> 추가
          </Button>
        </div>
      </div>

      {(s.emergencyContact || s.notes) && (
        <div className="mt-2 rounded-lg bg-muted/30 p-2 text-[11px] leading-relaxed">
          {s.emergencyContact && (
            <p>
              <strong>비상 연락:</strong> {s.emergencyContact}
            </p>
          )}
          {s.notes && (
            <p>
              <strong>메모:</strong> {s.notes}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

function SubmissionDetails({ assignment }: { assignment: SpeakerAssignment }) {
  if (assignment.submissionType === "paper") {
    const d = assignment.paperDetails;
    if (!d || Object.keys(d).length === 0) return null;
    return (
      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
        {d.trackName && (
          <span className="rounded bg-violet-50 px-1.5 py-0.5 font-medium text-violet-700 dark:bg-violet-950/40 dark:text-violet-200">
            {d.trackName}
          </span>
        )}
        {d.sessionTime && <span>· {d.sessionTime}</span>}
        {d.chairName && <span>· 좌장: {d.chairName}</span>}
        {d.discussantName && <span>· 토론: {d.discussantName}</span>}
        {typeof d.durationMinutes === "number" && (
          <span>· 발표 {d.durationMinutes}분</span>
        )}
        {typeof d.qaMinutes === "number" && <span>· Q&A {d.qaMinutes}분</span>}
      </div>
    );
  }
  if (assignment.submissionType === "poster") {
    const d = assignment.posterDetails;
    if (!d || Object.keys(d).length === 0) return null;
    return (
      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
        {d.boothNumber && (
          <span className="rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
            부스 {d.boothNumber}
          </span>
        )}
        {d.location && <span>· {d.location}</span>}
        {d.sessionWindow && <span>· {d.sessionWindow}</span>}
      </div>
    );
  }
  if (assignment.submissionType === "media") {
    const d = assignment.mediaDetails;
    if (!d || Object.keys(d).length === 0) return null;
    return (
      <div className="mb-2 space-y-1 text-[11px] text-muted-foreground">
        <div className="flex flex-wrap items-center gap-1.5">
          {d.exhibitSpace && (
            <span className="rounded bg-rose-50 px-1.5 py-0.5 font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">
              {d.exhibitSpace}
            </span>
          )}
          {d.setupTime && <span>· 설치 {d.setupTime}</span>}
          {d.teardownTime && <span>· 철거 {d.teardownTime}</span>}
        </div>
        {d.equipment && d.equipment.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[10px] font-semibold">장비:</span>
            {d.equipment.map((eq, i) => (
              <span
                key={i}
                className="rounded-full border bg-card px-1.5 py-0.5 text-[10px]"
              >
                {eq}
              </span>
            ))}
          </div>
        )}
        {d.description && (
          <p className="whitespace-pre-wrap text-[11px]">{d.description}</p>
        )}
      </div>
    );
  }
  return null;
}
