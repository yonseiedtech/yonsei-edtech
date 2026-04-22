"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { RegistrationFieldConfig, SeminarSpeaker } from "@/types";
import { GripVertical, Eye, EyeOff, Trash2, Plus, UserPlus } from "lucide-react";
import SpeakerRow, { emptySpeaker, type MemberLite } from "@/features/seminar/SpeakerRow";

export type EditSection = "info" | "speaker" | "description" | "registration-fields" | null;

export interface InfoFormData {
  title: string;
  date: string;
  time: string;
  location: string;
  isOnline: boolean;
  onlineUrl: string;
  maxAttendees: string;
  registrationUrl: string;
  posterUrl: string;
}

export type SpeakersFormData = SeminarSpeaker[];

interface Props {
  editSection: EditSection;
  onClose: () => void;
  onSave: () => void;
  // Info
  infoForm: InfoFormData;
  onInfoChange: (form: InfoFormData) => void;
  // Speakers (multi)
  speakersForm: SpeakersFormData;
  onSpeakersChange: (form: SpeakersFormData) => void;
  members: MemberLite[];
  // Description
  descForm: string;
  onDescChange: (value: string) => void;
  // Registration Fields
  regFieldsForm: RegistrationFieldConfig[];
  onRegFieldsChange: (fields: RegistrationFieldConfig[]) => void;
}

export default function EditDialogs({
  editSection,
  onClose,
  onSave,
  infoForm,
  onInfoChange,
  speakersForm,
  onSpeakersChange,
  members,
  descForm,
  onDescChange,
  regFieldsForm,
  onRegFieldsChange,
}: Props) {
  function updateSpeaker(idx: number, patch: Partial<SeminarSpeaker>) {
    onSpeakersChange(speakersForm.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  function removeSpeaker(idx: number) {
    if (speakersForm.length <= 1) return;
    onSpeakersChange(speakersForm.filter((_, i) => i !== idx));
  }

  function addSpeaker() {
    onSpeakersChange([...speakersForm, emptySpeaker("member")]);
  }

  return (
    <Dialog open={editSection !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={cn("max-h-[80vh] overflow-y-auto", editSection === "registration-fields" || editSection === "speaker" ? "sm:max-w-2xl" : "sm:max-w-lg")}>
        <DialogHeader>
          <DialogTitle>
            {editSection === "info" && "기본 정보 편집"}
            {editSection === "speaker" && "연사 정보 편집"}
            {editSection === "description" && "세미나 소개 편집"}
            {editSection === "registration-fields" && "신청 폼 필드 설정"}
          </DialogTitle>
        </DialogHeader>

        {editSection === "info" && (
          <div className="grid gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">제목</label>
              <Input value={infoForm.title} onChange={(e) => onInfoChange({ ...infoForm, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">날짜</label>
                <Input type="date" value={infoForm.date} onChange={(e) => onInfoChange({ ...infoForm, date: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">시간</label>
                <Input type="time" value={infoForm.time} onChange={(e) => onInfoChange({ ...infoForm, time: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">장소</label>
              <Input value={infoForm.location} onChange={(e) => onInfoChange({ ...infoForm, location: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={infoForm.isOnline}
                onChange={(e) => onInfoChange({ ...infoForm, isOnline: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              온라인 (ZOOM)
            </label>
            {infoForm.isOnline && (
              <div>
                <label className="mb-1 block text-sm font-medium">ZOOM URL</label>
                <Input value={infoForm.onlineUrl} onChange={(e) => onInfoChange({ ...infoForm, onlineUrl: e.target.value })} placeholder="https://zoom.us/j/..." />
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium">최대 인원</label>
              <Input type="number" value={infoForm.maxAttendees} onChange={(e) => onInfoChange({ ...infoForm, maxAttendees: e.target.value })} placeholder="제한 없음" min={1} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">외부 신청 URL</label>
              <Input value={infoForm.registrationUrl} onChange={(e) => onInfoChange({ ...infoForm, registrationUrl: e.target.value })} placeholder="https://forms.gle/..." />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">포스터 이미지 URL</label>
              <Input value={infoForm.posterUrl} onChange={(e) => onInfoChange({ ...infoForm, posterUrl: e.target.value })} placeholder="https://..." />
            </div>
          </div>
        )}

        {editSection === "speaker" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <UserPlus size={14} />연사 ({speakersForm.length}명)
              </h3>
              <Button type="button" size="sm" variant="outline" onClick={addSpeaker}>
                <Plus size={13} className="mr-1" />연사 추가
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              내부 회원: 회원 검색으로 자동 매칭 (학번이 함께 저장되어 추후 가입한 사람과도 자동 연동됩니다).
              조회 결과가 없으면 수기 입력하세요.
            </p>
            {speakersForm.map((s, idx) => (
              <SpeakerRow
                key={idx}
                speaker={s}
                index={idx}
                canRemove={speakersForm.length > 1}
                onChange={(patch) => updateSpeaker(idx, patch)}
                onRemove={() => removeSpeaker(idx)}
                allMembers={members}
                excludeIds={speakersForm
                  .filter((x, i) => i !== idx && x.userId)
                  .map((x) => x.userId as string)}
              />
            ))}
          </div>
        )}

        {editSection === "description" && (
          <Textarea
            value={descForm}
            onChange={(e) => onDescChange(e.target.value)}
            rows={10}
            placeholder="세미나 소개 내용"
          />
        )}

        {editSection === "registration-fields" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              필드를 활성화/비활성화하고, 라벨·필수 여부를 수정하세요. 커스텀 필드를 추가할 수도 있습니다.
            </p>
            {regFieldsForm.map((field, idx) => (
              <div key={field.key} className="flex items-start gap-2 rounded-lg border p-3">
                <div className="mt-1 text-muted-foreground">
                  <GripVertical size={14} />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...regFieldsForm];
                        updated[idx] = { ...updated[idx], enabled: !updated[idx].enabled };
                        onRegFieldsChange(updated);
                      }}
                      className={cn(
                        "rounded p-1 transition-colors",
                        field.enabled ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-muted"
                      )}
                      title={field.enabled ? "비활성화" : "활성화"}
                    >
                      {field.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <Input
                      value={field.label}
                      onChange={(e) => {
                        const updated = [...regFieldsForm];
                        updated[idx] = { ...updated[idx], label: e.target.value };
                        onRegFieldsChange(updated);
                      }}
                      className="h-8 text-sm"
                      placeholder="필드 라벨"
                    />
                    <label className="flex shrink-0 items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => {
                          const updated = [...regFieldsForm];
                          updated[idx] = { ...updated[idx], required: e.target.checked };
                          onRegFieldsChange(updated);
                        }}
                        className="h-3.5 w-3.5 rounded border-gray-300"
                      />
                      필수
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={field.type}
                      onChange={(e) => {
                        const updated = [...regFieldsForm];
                        updated[idx] = { ...updated[idx], type: e.target.value as RegistrationFieldConfig["type"] };
                        onRegFieldsChange(updated);
                      }}
                      className="h-7 rounded border border-input bg-transparent px-2 text-xs"
                    >
                      <option value="text">텍스트</option>
                      <option value="email">이메일</option>
                      <option value="tel">전화번호</option>
                      <option value="textarea">장문</option>
                      <option value="select">선택</option>
                    </select>
                    <Input
                      value={field.placeholder ?? ""}
                      onChange={(e) => {
                        const updated = [...regFieldsForm];
                        updated[idx] = { ...updated[idx], placeholder: e.target.value };
                        onRegFieldsChange(updated);
                      }}
                      className="h-7 text-xs"
                      placeholder="placeholder"
                    />
                    {!["name", "email"].includes(field.key) && (
                      <button
                        type="button"
                        onClick={() => onRegFieldsChange(regFieldsForm.filter((_, i) => i !== idx))}
                        className="rounded p-1 text-destructive hover:bg-destructive/10 transition-colors"
                        title="필드 삭제"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  {field.type === "select" && (
                    <Input
                      value={(field.options ?? []).join(", ")}
                      onChange={(e) => {
                        const updated = [...regFieldsForm];
                        updated[idx] = { ...updated[idx], options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) };
                        onRegFieldsChange(updated);
                      }}
                      className="h-7 text-xs"
                      placeholder="옵션 (쉼표로 구분): 옵션1, 옵션2, 옵션3"
                    />
                  )}
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                const key = `custom_${Date.now()}`;
                onRegFieldsChange([
                  ...regFieldsForm,
                  { key, label: "새 필드", type: "text", required: false, enabled: true, placeholder: "" },
                ]);
              }}
            >
              <Plus size={14} className="mr-1" />
              커스텀 필드 추가
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button onClick={onSave}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
