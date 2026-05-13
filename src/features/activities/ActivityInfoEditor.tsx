"use client";

/**
 * 활동 상세 페이지 — 관리 탭 내 인라인 편집 폼.
 *
 * 기존: '활동 정보 수정/삭제는 목록 페이지에서 가능합니다' 안내만 (목록으로 이동 강제)
 * 변경: 제목·설명·일자·종료일·장소·주관기관·URL 인라인 편집 + 삭제 버튼
 */

import { useEffect, useState } from "react";
import { Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { activitiesApi } from "@/lib/bkend";
import type { Activity } from "@/types";
import {
  EXTERNAL_PARTICIPANT_TYPE_LABELS,
  type ExternalParticipantType,
} from "@/types/academic";

const ALL_PARTICIPANT_TYPES: ExternalParticipantType[] = [
  "speaker",
  "volunteer",
  "attendee",
];

interface Props {
  activity: Activity;
  isExternal: boolean;
  onSaved?: () => void;
  onDeleted?: () => void;
}

export default function ActivityInfoEditor({
  activity,
  isExternal,
  onSaved,
  onDeleted,
}: Props) {
  const [title, setTitle] = useState(activity.title ?? "");
  const [description, setDescription] = useState(activity.description ?? "");
  const [detailContent, setDetailContent] = useState(activity.detailContent ?? "");
  const [date, setDate] = useState(activity.date ?? "");
  const [endDate, setEndDate] = useState(activity.endDate ?? "");
  const [location, setLocation] = useState(activity.location ?? "");
  const [tags, setTags] = useState(
    Array.isArray(activity.tags) ? activity.tags.join(", ") : "",
  );
  const [organizerName, setOrganizerName] = useState(activity.organizerName ?? "");
  const [conferenceUrl, setConferenceUrl] = useState(activity.conferenceUrl ?? "");
  // Sprint 70: 대외활동 — 활성 참석유형 + 정원
  const initialEnabled = (activity.enabledParticipantTypes as ExternalParticipantType[] | undefined) ?? [];
  const [enabledTypes, setEnabledTypes] = useState<ExternalParticipantType[]>(
    initialEnabled.length > 0 ? initialEnabled : [...ALL_PARTICIPANT_TYPES],
  );
  const [maxParticipants, setMaxParticipants] = useState<string>(
    activity.maxParticipants != null ? String(activity.maxParticipants) : "",
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // activity 가 외부에서 갱신되면 폼 초기화
  useEffect(() => {
    setTitle(activity.title ?? "");
    setDescription(activity.description ?? "");
    setDetailContent(activity.detailContent ?? "");
    setDate(activity.date ?? "");
    setEndDate(activity.endDate ?? "");
    setLocation(activity.location ?? "");
    setTags(Array.isArray(activity.tags) ? activity.tags.join(", ") : "");
    setOrganizerName(activity.organizerName ?? "");
    setConferenceUrl(activity.conferenceUrl ?? "");
    const next = (activity.enabledParticipantTypes as ExternalParticipantType[] | undefined) ?? [];
    setEnabledTypes(next.length > 0 ? next : [...ALL_PARTICIPANT_TYPES]);
    setMaxParticipants(activity.maxParticipants != null ? String(activity.maxParticipants) : "");
  }, [activity]);

  function toggleType(t: ExternalParticipantType) {
    setEnabledTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  }

  async function handleSave() {
    if (!title.trim()) {
      toast.error("제목을 입력하세요.");
      return;
    }
    if (!date) {
      toast.error("일자를 입력하세요.");
      return;
    }
    setSaving(true);
    try {
      const parsedMax = maxParticipants.trim() === "" ? undefined : Number(maxParticipants);
      if (parsedMax !== undefined && (!Number.isFinite(parsedMax) || parsedMax < 0)) {
        toast.error("정원은 0 이상의 숫자여야 합니다.");
        setSaving(false);
        return;
      }
      if (isExternal && enabledTypes.length === 0) {
        toast.error("최소 하나 이상의 참석 유형을 활성화해주세요.");
        setSaving(false);
        return;
      }
      const tagsArr = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await activitiesApi.update(activity.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        detailContent: detailContent.trim() || undefined,
        date,
        endDate: endDate || undefined,
        location: location.trim() || undefined,
        tags: tagsArr.length > 0 ? tagsArr : undefined,
        organizerName: isExternal ? organizerName.trim() || undefined : undefined,
        conferenceUrl: isExternal ? conferenceUrl.trim() || undefined : undefined,
        enabledParticipantTypes: isExternal ? enabledTypes : undefined,
        maxParticipants: parsedMax,
      });
      toast.success("활동 정보가 저장되었습니다.");
      onSaved?.();
    } catch (e) {
      toast.error(`저장 실패: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`"${activity.title}" 활동을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }
    setDeleting(true);
    try {
      await activitiesApi.delete(activity.id);
      toast.success("활동이 삭제되었습니다.");
      onDeleted?.();
    } catch (e) {
      toast.error(`삭제 실패: ${(e as Error).message}`);
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <h3 className="font-semibold">활동 정보 수정</h3>

      <div>
        <label className="mb-1 block text-xs font-medium">제목 <span className="text-destructive">*</span></label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="활동 제목" />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium">설명</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="활동 설명 (선택)"
          rows={4}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium">
          상세 내용
          <span className="ml-1 text-[10px] font-normal text-muted-foreground">(마크다운 지원)</span>
        </label>
        <Textarea
          value={detailContent}
          onChange={(e) => setDetailContent(e.target.value)}
          placeholder="활동의 자세한 안내·일정·준비물 등 (선택)"
          rows={6}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium">시작일 <span className="text-destructive">*</span></label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">종료일 (선택)</label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium">장소</label>
        <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="예: 서울시 종로구 OOO" />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium">
          태그
          <span className="ml-1 text-[10px] font-normal text-muted-foreground">(쉼표로 구분)</span>
        </label>
        <Input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="예: AI, 학습분석, 디지털리터러시"
        />
      </div>

      {isExternal && (
        <>
          <div>
            <label className="mb-1 block text-xs font-medium">주관기관</label>
            <Input
              value={organizerName}
              onChange={(e) => setOrganizerName(e.target.value)}
              placeholder="예: 한국교육공학회"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">학술대회 URL</label>
            <Input
              value={conferenceUrl}
              onChange={(e) => setConferenceUrl(e.target.value)}
              placeholder="https://..."
              type="url"
            />
          </div>

          {/* Sprint 70: 활성 참석유형 — 신청자가 선택 가능한 유형 제한 + 유형별 신청폼 탭 활성화 */}
          <div>
            <label className="mb-1 block text-xs font-medium">
              활성 참석유형
              <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                (신청자가 선택할 수 있는 유형 + 신청폼 유형별 탭 활성화)
              </span>
            </label>
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/10 p-2">
              {ALL_PARTICIPANT_TYPES.map((t) => {
                const checked = enabledTypes.includes(t);
                return (
                  <label
                    key={t}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors ${
                      checked
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleType(t)}
                      className="h-3.5 w-3.5"
                    />
                    {EXTERNAL_PARTICIPANT_TYPE_LABELS[t]}
                  </label>
                );
              })}
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              최소 1개 이상 활성화해야 합니다. 비활성 유형은 신청 시 선택지에서 제외됩니다.
            </p>
          </div>
        </>
      )}

      {/* 정원 — 모든 활동 유형 공통 */}
      <div>
        <label className="mb-1 block text-xs font-medium">
          정원
          <span className="ml-1 text-[10px] font-normal text-muted-foreground">(비워두면 무제한)</span>
        </label>
        <Input
          type="number"
          min={0}
          value={maxParticipants}
          onChange={(e) => setMaxParticipants(e.target.value)}
          placeholder="예: 50"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={deleting || saving}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          {deleting ? (
            <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> 삭제 중…</>
          ) : (
            <><Trash2 className="mr-1 h-3.5 w-3.5" /> 활동 삭제</>
          )}
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving || deleting}>
          {saving ? (
            <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> 저장 중…</>
          ) : (
            <><Save className="mr-1 h-3.5 w-3.5" /> 저장</>
          )}
        </Button>
      </div>
    </div>
  );
}
