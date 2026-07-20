"use client";

/**
 * 발표자 배정 생성·편집 다이얼로그 — Phase 1.
 *  - 미배정 신청자 → 새 배정 생성 (발표유형 + 표준 체크리스트 자동 채움 + 유형별 세부 정보)
 *  - 기존 배정 → 발표유형·제목·세부정보·비상연락처·메모 인라인 편집
 *
 * 표준 체크리스트: SPEAKER_STANDARD_TASKS[type] 를 prepTasks 초기값으로 자동 채우고
 * 운영자가 편집 가능. (저장 시점에만 결정 — 이후 카드에서 자유롭게 add/remove)
 */

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
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
  SPEAKER_SUBMISSION_TYPE_LABELS,
  SPEAKER_STANDARD_TASKS,
  type SpeakerAssignment,
  type SpeakerPrepTask,
  type SpeakerSubmissionType,
  type PaperDetails,
  type PosterDetails,
  type MediaDetails,
} from "@/types";
import { SUBMISSION_TYPE_ORDER, taskId } from "./speaker-utils";

export interface AssignmentDraft {
  submissionType: SpeakerSubmissionType;
  paperTitle?: string;
  prepTasks: SpeakerPrepTask[];
  paperDetails?: PaperDetails;
  posterDetails?: PosterDetails;
  mediaDetails?: MediaDetails;
  emergencyContact?: string;
  notes?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 표시용 대상 이름 */
  targetName: string;
  /** 편집 모드면 기존 배정, 생성 모드면 undefined */
  existing?: SpeakerAssignment;
  /** 신청자에서 미리 추론된 초기 유형/제목 (생성 모드 한정) */
  initialSubmissionType?: SpeakerSubmissionType;
  initialPaperTitle?: string;
  saving: boolean;
  onSubmit: (draft: AssignmentDraft) => void;
}

function buildInitialTasks(type: SpeakerSubmissionType): SpeakerPrepTask[] {
  return SPEAKER_STANDARD_TASKS[type].map((text) => ({
    id: taskId(),
    text,
    checked: false,
  }));
}

export default function AssignmentDialog({
  open,
  onOpenChange,
  targetName,
  existing,
  initialSubmissionType,
  initialPaperTitle,
  saving,
  onSubmit,
}: Props) {
  const isEdit = !!existing;

  const [submissionType, setSubmissionType] = useState<SpeakerSubmissionType>(
    existing?.submissionType ?? initialSubmissionType ?? "paper",
  );
  const [paperTitle, setPaperTitle] = useState(
    existing?.paperTitle ?? initialPaperTitle ?? "",
  );
  const [prepTasks, setPrepTasks] = useState<SpeakerPrepTask[]>(
    existing?.prepTasks && existing.prepTasks.length > 0
      ? existing.prepTasks.map((t) => ({ ...t }))
      : buildInitialTasks(existing?.submissionType ?? initialSubmissionType ?? "paper"),
  );
  const [newTaskText, setNewTaskText] = useState("");

  // 유형별 세부 정보 (편집 모드일 때만 기존값 — 생성 시는 빈 객체부터)
  const [paperDetails, setPaperDetails] = useState<PaperDetails>(
    existing?.paperDetails ?? {},
  );
  const [posterDetails, setPosterDetails] = useState<PosterDetails>(
    existing?.posterDetails ?? {},
  );
  const [mediaDetails, setMediaDetails] = useState<MediaDetails>(
    existing?.mediaDetails ?? {},
  );
  const [equipmentInput, setEquipmentInput] = useState("");

  const [emergencyContact, setEmergencyContact] = useState(
    existing?.emergencyContact ?? "",
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");

  // 생성 모드에서 유형을 바꾸면 표준 체크리스트를 동기적으로 재시드.
  // 편집 모드에서는 절대 재시드하지 않음 (기존 prepTasks 보존).
  function changeType(next: SpeakerSubmissionType) {
    setSubmissionType(next);
    if (!isEdit) setPrepTasks(buildInitialTasks(next));
  }

  function toggleTask(id: string) {
    setPrepTasks((prev) =>
      prev.map((t) =>
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
    setPrepTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function addTask() {
    const text = newTaskText.trim();
    if (!text) return;
    setPrepTasks((prev) => [...prev, { id: taskId(), text, checked: false }]);
    setNewTaskText("");
  }

  function addEquipment() {
    const v = equipmentInput.trim();
    if (!v) return;
    setMediaDetails((prev) => ({
      ...prev,
      equipment: [...(prev.equipment ?? []), v],
    }));
    setEquipmentInput("");
  }

  function removeEquipment(idx: number) {
    setMediaDetails((prev) => ({
      ...prev,
      equipment: (prev.equipment ?? []).filter((_, i) => i !== idx),
    }));
  }

  function handleSubmit() {
    const cleanedTasks = prepTasks
      .filter((t) => t.text.trim())
      .map((t) => ({
        id: t.id,
        text: t.text.trim(),
        checked: !!t.checked,
        ...(t.checked && t.checkedAt ? { checkedAt: t.checkedAt } : {}),
      }));

    // 선택된 유형의 세부 정보만 포함 (빈 값 정리)
    const draft: AssignmentDraft = {
      submissionType,
      paperTitle: paperTitle.trim() || undefined,
      prepTasks: cleanedTasks,
      emergencyContact: emergencyContact.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (submissionType === "paper") {
      draft.paperDetails = cleanPaperDetails(paperDetails);
    } else if (submissionType === "poster") {
      draft.posterDetails = cleanPosterDetails(posterDetails);
    } else if (submissionType === "media") {
      draft.mediaDetails = cleanMediaDetails(mediaDetails);
    }

    onSubmit(draft);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-1/2 bottom-auto my-0 max-h-[calc(100vh-2rem)] -translate-y-1/2 overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "발표자 편집" : "발표자 배정"} — {targetName}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "발표 유형·제목·세부정보·체크리스트를 수정합니다."
              : "이 신청자를 발표자로 배정합니다. 표준 체크리스트가 자동으로 채워집니다."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* 발표 유형 */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">
              발표 유형
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {SUBMISSION_TYPE_ORDER.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => changeType(t)}
                  className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-colors ${
                    submissionType === t
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-input bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {SPEAKER_SUBMISSION_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* 발표 제목 */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">
              발표 제목 (선택)
            </label>
            <input
              type="text"
              value={paperTitle}
              onChange={(e) => setPaperTitle(e.target.value)}
              placeholder={
                submissionType === "media"
                  ? "작품 제목"
                  : submissionType === "poster"
                    ? "포스터 제목"
                    : "논문 제목"
              }
              className="w-full rounded-md border px-2.5 py-1.5 text-xs"
            />
          </div>

          {/* 유형별 세부 정보 */}
          {submissionType === "paper" && (
            <PaperDetailsForm
              value={paperDetails}
              onChange={setPaperDetails}
            />
          )}
          {submissionType === "poster" && (
            <PosterDetailsForm
              value={posterDetails}
              onChange={setPosterDetails}
            />
          )}
          {submissionType === "media" && (
            <MediaDetailsForm
              value={mediaDetails}
              onChange={setMediaDetails}
              equipmentInput={equipmentInput}
              setEquipmentInput={setEquipmentInput}
              onAddEquipment={addEquipment}
              onRemoveEquipment={removeEquipment}
            />
          )}

          {/* 준비 체크리스트 */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">
              준비 체크리스트 ({prepTasks.length}항목)
              {!isEdit && (
                <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                  · 유형 선택 시 표준 항목 자동 채움
                </span>
              )}
            </label>
            <ul className="space-y-1">
              {prepTasks.map((t) => (
                <li key={t.id} className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => toggleTask(t.id)}
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      t.checked
                        ? "border-success bg-success text-white"
                        : "border-input bg-card"
                    }`}
                    aria-label={t.checked ? "체크 해제" : "체크"}
                  >
                    {t.checked && <span className="text-[10px]">✓</span>}
                  </button>
                  <span
                    className={`flex-1 text-[11px] ${
                      t.checked ? "text-muted-foreground line-through" : "text-foreground"
                    }`}
                  >
                    {t.text}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeTask(t.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="항목 삭제"
                  >
                    <Trash2 size={11} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-1.5 flex items-center gap-1.5">
              <input
                type="text"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTask();
                  }
                }}
                placeholder="추가 항목"
                className="flex-1 rounded border px-2 py-1 text-[11px]"
              />
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={addTask}
                disabled={!newTaskText.trim()}
              >
                <Plus size={11} /> 추가
              </Button>
            </div>
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

// ──────────────────────────────────────────────────────────────
// 유형별 세부 폼
// ──────────────────────────────────────────────────────────────

function PaperDetailsForm({
  value,
  onChange,
}: {
  value: PaperDetails;
  onChange: (v: PaperDetails) => void;
}) {
  function patch<K extends keyof PaperDetails>(k: K, v: PaperDetails[K]) {
    onChange({ ...value, [k]: v });
  }
  return (
    <div className="rounded-lg border border-cat-5/20 bg-cat-5/5 p-3">
      <p className="mb-2 text-[11px] font-semibold text-cat-5">
        논문 발표 세부 정보
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        <input
          type="text"
          value={value.trackName ?? ""}
          onChange={(e) => patch("trackName", e.target.value)}
          placeholder="트랙 이름 (예: A 트랙)"
          className="rounded border px-2 py-1 text-[11px]"
        />
        <input
          type="text"
          value={value.sessionTime ?? ""}
          onChange={(e) => patch("sessionTime", e.target.value)}
          placeholder="세션 시간 (예: 5/30 14:00~15:30)"
          className="rounded border px-2 py-1 text-[11px]"
        />
        <input
          type="text"
          value={value.chairName ?? ""}
          onChange={(e) => patch("chairName", e.target.value)}
          placeholder="좌장 이름"
          className="rounded border px-2 py-1 text-[11px]"
        />
        <input
          type="text"
          value={value.discussantName ?? ""}
          onChange={(e) => patch("discussantName", e.target.value)}
          placeholder="토론자 이름"
          className="rounded border px-2 py-1 text-[11px]"
        />
        <input
          type="number"
          min={0}
          value={value.durationMinutes ?? ""}
          onChange={(e) =>
            patch(
              "durationMinutes",
              e.target.value === "" ? undefined : Number(e.target.value),
            )
          }
          placeholder="발표 시간 (분)"
          className="rounded border px-2 py-1 text-[11px]"
        />
        <input
          type="number"
          min={0}
          value={value.qaMinutes ?? ""}
          onChange={(e) =>
            patch(
              "qaMinutes",
              e.target.value === "" ? undefined : Number(e.target.value),
            )
          }
          placeholder="Q&A 시간 (분)"
          className="rounded border px-2 py-1 text-[11px]"
        />
      </div>
    </div>
  );
}

function PosterDetailsForm({
  value,
  onChange,
}: {
  value: PosterDetails;
  onChange: (v: PosterDetails) => void;
}) {
  function patch<K extends keyof PosterDetails>(k: K, v: PosterDetails[K]) {
    onChange({ ...value, [k]: v });
  }
  return (
    <div className="rounded-lg border border-warning/20 bg-warning/5 p-3">
      <p className="mb-2 text-[11px] font-semibold text-warning">
        포스터 세부 정보
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        <input
          type="text"
          value={value.boothNumber ?? ""}
          onChange={(e) => patch("boothNumber", e.target.value)}
          placeholder="부스 번호 (예: P-12)"
          className="rounded border px-2 py-1 text-[11px]"
        />
        <input
          type="text"
          value={value.location ?? ""}
          onChange={(e) => patch("location", e.target.value)}
          placeholder="부스 위치 (예: 본관 1층 로비)"
          className="rounded border px-2 py-1 text-[11px]"
        />
      </div>
      <input
        type="text"
        value={value.sessionWindow ?? ""}
        onChange={(e) => patch("sessionWindow", e.target.value)}
        placeholder="포스터 세션 시간대 (예: 5/30 13:00~14:00)"
        className="mt-1.5 w-full rounded border px-2 py-1 text-[11px]"
      />
    </div>
  );
}

function MediaDetailsForm({
  value,
  onChange,
  equipmentInput,
  setEquipmentInput,
  onAddEquipment,
  onRemoveEquipment,
}: {
  value: MediaDetails;
  onChange: (v: MediaDetails) => void;
  equipmentInput: string;
  setEquipmentInput: (v: string) => void;
  onAddEquipment: () => void;
  onRemoveEquipment: (i: number) => void;
}) {
  function patch<K extends keyof MediaDetails>(k: K, v: MediaDetails[K]) {
    onChange({ ...value, [k]: v });
  }
  return (
    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
      <p className="mb-2 text-[11px] font-semibold text-destructive">
        미디어전 세부 정보
      </p>
      <input
        type="text"
        value={value.exhibitSpace ?? ""}
        onChange={(e) => patch("exhibitSpace", e.target.value)}
        placeholder="전시 공간 (예: 전시홀 A-3)"
        className="w-full rounded border px-2 py-1 text-[11px]"
      />
      <div className="mt-1.5">
        <p className="mb-1 text-[10px] font-semibold text-muted-foreground">필요 장비</p>
        <div className="mb-1.5 flex flex-wrap gap-1">
          {(value.equipment ?? []).map((eq, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-[10px]"
            >
              {eq}
              <button
                type="button"
                onClick={() => onRemoveEquipment(i)}
                className="text-muted-foreground hover:text-destructive"
                aria-label="장비 삭제"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={equipmentInput}
            onChange={(e) => setEquipmentInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAddEquipment();
              }
            }}
            placeholder="장비명 (예: 빔프로젝터)"
            className="flex-1 rounded border px-2 py-1 text-[11px]"
          />
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={onAddEquipment}
            disabled={!equipmentInput.trim()}
          >
            <Plus size={11} /> 추가
          </Button>
        </div>
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        <input
          type="text"
          value={value.setupTime ?? ""}
          onChange={(e) => patch("setupTime", e.target.value)}
          placeholder="설치 시간 (예: 5/29 16:00)"
          className="rounded border px-2 py-1 text-[11px]"
        />
        <input
          type="text"
          value={value.teardownTime ?? ""}
          onChange={(e) => patch("teardownTime", e.target.value)}
          placeholder="철거 시간 (예: 5/30 18:00)"
          className="rounded border px-2 py-1 text-[11px]"
        />
      </div>
      <textarea
        value={value.description ?? ""}
        onChange={(e) => patch("description", e.target.value)}
        rows={2}
        placeholder="작품 설명 (선택)"
        className="mt-1.5 w-full resize-none rounded border px-2 py-1 text-[11px]"
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// helpers
// ──────────────────────────────────────────────────────────────

function cleanPaperDetails(d: PaperDetails): PaperDetails | undefined {
  const out: PaperDetails = {};
  if (d.trackName?.trim()) out.trackName = d.trackName.trim();
  if (d.sessionTime?.trim()) out.sessionTime = d.sessionTime.trim();
  if (d.chairName?.trim()) out.chairName = d.chairName.trim();
  if (d.discussantName?.trim()) out.discussantName = d.discussantName.trim();
  if (typeof d.durationMinutes === "number") out.durationMinutes = d.durationMinutes;
  if (typeof d.qaMinutes === "number") out.qaMinutes = d.qaMinutes;
  return Object.keys(out).length > 0 ? out : undefined;
}

function cleanPosterDetails(d: PosterDetails): PosterDetails | undefined {
  const out: PosterDetails = {};
  if (d.boothNumber?.trim()) out.boothNumber = d.boothNumber.trim();
  if (d.location?.trim()) out.location = d.location.trim();
  if (d.sessionWindow?.trim()) out.sessionWindow = d.sessionWindow.trim();
  return Object.keys(out).length > 0 ? out : undefined;
}

function cleanMediaDetails(d: MediaDetails): MediaDetails | undefined {
  const out: MediaDetails = {};
  if (d.exhibitSpace?.trim()) out.exhibitSpace = d.exhibitSpace.trim();
  if (d.equipment && d.equipment.length > 0) out.equipment = d.equipment;
  if (d.setupTime?.trim()) out.setupTime = d.setupTime.trim();
  if (d.teardownTime?.trim()) out.teardownTime = d.teardownTime.trim();
  if (d.description?.trim()) out.description = d.description.trim();
  return Object.keys(out).length > 0 ? out : undefined;
}

