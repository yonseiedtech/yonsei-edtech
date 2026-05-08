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
  const [date, setDate] = useState(activity.date ?? "");
  const [endDate, setEndDate] = useState(activity.endDate ?? "");
  const [location, setLocation] = useState(activity.location ?? "");
  const [organizerName, setOrganizerName] = useState(activity.organizerName ?? "");
  const [conferenceUrl, setConferenceUrl] = useState(activity.conferenceUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // activity 가 외부에서 갱신되면 폼 초기화
  useEffect(() => {
    setTitle(activity.title ?? "");
    setDescription(activity.description ?? "");
    setDate(activity.date ?? "");
    setEndDate(activity.endDate ?? "");
    setLocation(activity.location ?? "");
    setOrganizerName(activity.organizerName ?? "");
    setConferenceUrl(activity.conferenceUrl ?? "");
  }, [activity]);

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
      await activitiesApi.update(activity.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        date,
        endDate: endDate || undefined,
        location: location.trim() || undefined,
        organizerName: isExternal ? organizerName.trim() || undefined : undefined,
        conferenceUrl: isExternal ? conferenceUrl.trim() || undefined : undefined,
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
        </>
      )}

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
