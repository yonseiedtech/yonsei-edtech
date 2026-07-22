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

/** ISO 8601 / datetime-local 입력값 정규화. 둘 다 안전하게 datetime-local input 으로 변환. */
function toLocalInput(value: string | undefined): string {
  if (!value) return "";
  // 이미 "YYYY-MM-DDTHH:MM" 형태면 그대로 사용 (Z·offset·초 제거)
  const m = value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
  if (m) return m[1];
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${day}T${hh}:${mm}`;
}

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
  // Sprint 70 Phase 6: status·recruitmentStatus·registrationMethod·leader·imageUrl·year·semester
  const [status, setStatus] = useState<"upcoming" | "ongoing" | "completed">(
    (activity.status as "upcoming" | "ongoing" | "completed" | undefined) ?? "upcoming",
  );
  const [recruitmentStatus, setRecruitmentStatus] = useState<
    "recruiting" | "closed" | "in_progress" | "completed"
  >(
    (activity.recruitmentStatus as
      | "recruiting"
      | "closed"
      | "in_progress"
      | "completed"
      | undefined) ?? "recruiting",
  );
  // 모집 기간(datetime-local) + 수동 override 플래그
  const [recruitmentStartAt, setRecruitmentStartAt] = useState<string>(
    toLocalInput(activity.recruitmentStartAt as string | undefined),
  );
  const [recruitmentEndAt, setRecruitmentEndAt] = useState<string>(
    toLocalInput(activity.recruitmentEndAt as string | undefined),
  );
  const [recruitmentStatusOverride, setRecruitmentStatusOverride] = useState<boolean>(
    activity.recruitmentStatusOverride === true,
  );
  const [registrationMethod, setRegistrationMethod] = useState<"open" | "manual">(
    (activity.registrationMethod as "open" | "manual" | undefined) ?? "manual",
  );
  const [leader, setLeader] = useState(activity.leader ?? "");
  const [imageUrl, setImageUrl] = useState(activity.imageUrl ?? "");
  const [year, setYear] = useState<string>(
    activity.year != null ? String(activity.year) : "",
  );
  const [semester, setSemester] = useState<"" | "first" | "second">(
    (activity.semester as "first" | "second" | undefined) ?? "",
  );
  // 스터디/프로젝트 전용 추가 필드
  const [tagline, setTagline] = useState(
    typeof activity.tagline === "string" ? activity.tagline : "",
  );
  const [scheduleLabel, setScheduleLabel] = useState(
    typeof activity.scheduleLabel === "string" ? activity.scheduleLabel : "",
  );
  const [operation, setOperation] = useState(
    typeof activity.operation === "string" ? activity.operation : "",
  );
  const [requirements, setRequirements] = useState(
    typeof activity.requirements === "string" ? activity.requirements : "",
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
    setStatus((activity.status as "upcoming" | "ongoing" | "completed" | undefined) ?? "upcoming");
    setRecruitmentStatus(
      (activity.recruitmentStatus as
        | "recruiting"
        | "closed"
        | "in_progress"
        | "completed"
        | undefined) ?? "recruiting",
    );
    setRecruitmentStartAt(toLocalInput(activity.recruitmentStartAt as string | undefined));
    setRecruitmentEndAt(toLocalInput(activity.recruitmentEndAt as string | undefined));
    setRecruitmentStatusOverride(activity.recruitmentStatusOverride === true);
    setRegistrationMethod(
      (activity.registrationMethod as "open" | "manual" | undefined) ?? "manual",
    );
    setLeader(activity.leader ?? "");
    setImageUrl(activity.imageUrl ?? "");
    setYear(activity.year != null ? String(activity.year) : "");
    setSemester((activity.semester as "first" | "second" | undefined) ?? "");
    setTagline(typeof activity.tagline === "string" ? activity.tagline : "");
    setScheduleLabel(typeof activity.scheduleLabel === "string" ? activity.scheduleLabel : "");
    setOperation(typeof activity.operation === "string" ? activity.operation : "");
    setRequirements(typeof activity.requirements === "string" ? activity.requirements : "");
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
      const parsedYear = year.trim() === "" ? undefined : Number(year);
      if (parsedYear !== undefined && (!Number.isFinite(parsedYear) || parsedYear < 2000 || parsedYear > 2100)) {
        toast.error("연도는 2000~2100 사이의 숫자여야 합니다.");
        setSaving(false);
        return;
      }
      // 모집 기간 검증 — 둘 다 있으면 start <= end
      if (recruitmentStartAt && recruitmentEndAt) {
        const s = new Date(recruitmentStartAt).getTime();
        const e = new Date(recruitmentEndAt).getTime();
        if (Number.isFinite(s) && Number.isFinite(e) && s > e) {
          toast.error("모집 종료 일시는 시작 일시 이후여야 합니다.");
          setSaving(false);
          return;
        }
      }
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
        status,
        recruitmentStatus,
        recruitmentStartAt: recruitmentStartAt || undefined,
        recruitmentEndAt: recruitmentEndAt || undefined,
        recruitmentStatusOverride: recruitmentStatusOverride ? true : undefined,
        registrationMethod,
        leader: leader.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        year: parsedYear,
        semester: semester === "" ? undefined : semester,
        ...(!isExternal
          ? {
              tagline: tagline.trim() || undefined,
              scheduleLabel: scheduleLabel.trim() || undefined,
              operation: operation.trim() || undefined,
              requirements: requirements.trim() || undefined,
            }
          : {}),
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
    <div className="rounded-2xl border bg-card p-6 space-y-4">
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

      {/* 스터디/프로젝트 전용 추가 필드 */}
      {!isExternal && (
        <>
          <div>
            <label className="mb-1 block text-xs font-medium">
              한줄소개
              <span className="ml-1 text-[10px] font-normal text-muted-foreground">(상세 페이지 상단 표시)</span>
            </label>
            <Input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="예: 논문 방법론을 함께 읽고 토론하는 스터디입니다"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">
              모임 일정 문구
              <span className="ml-1 text-[10px] font-normal text-muted-foreground">(요일·시간 문구)</span>
            </label>
            <Input
              value={scheduleLabel}
              onChange={(e) => setScheduleLabel(e.target.value)}
              placeholder="예: 매주 목요일 19:00~21:00"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">운영방식</label>
            <Textarea
              value={operation}
              onChange={(e) => setOperation(e.target.value)}
              placeholder="스터디 진행 방법, 도구, 규칙 등을 자유롭게 작성하세요"
              rows={3}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">참여요건</label>
            <Textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="신청 전 확인해야 할 조건이나 사전 지식 등을 작성하세요"
              rows={3}
            />
          </div>
        </>
      )}

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

      {/* 모집 기간 — 자동 상태 전환 */}
      <div className="rounded-lg border bg-muted/10 p-3 space-y-3">
        <div className="text-xs font-medium flex items-center justify-between gap-2">
          <span>모집 기간 (자동 상태 전환)</span>
          <label className="inline-flex items-center gap-1.5 text-[10px] font-normal text-muted-foreground">
            <input
              type="checkbox"
              checked={recruitmentStatusOverride}
              onChange={(e) => setRecruitmentStatusOverride(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            수동 고정 (아래 모집 상태값 우선)
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
              모집 시작 일시
            </label>
            <Input
              type="datetime-local"
              value={recruitmentStartAt}
              onChange={(e) => setRecruitmentStartAt(e.target.value)}
              disabled={recruitmentStatusOverride}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
              모집 종료 일시
            </label>
            <Input
              type="datetime-local"
              value={recruitmentEndAt}
              onChange={(e) => setRecruitmentEndAt(e.target.value)}
              disabled={recruitmentStatusOverride}
            />
          </div>
        </div>
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          모집 기간을 설정하면 현재 시각 기준으로 모집 상태가 자동 전환됩니다.
          (시작 전: 모집 예정 / 기간 중: 모집 중 / 종료 후: 모집 마감)
          수동 고정 시 아래의 모집 상태 값이 우선 적용됩니다.
        </p>
      </div>

      {/* Phase 6 — 잔여 modal 필드: 상태·모집상태·신청방법·리더·이미지·학기 */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium">활동 상태</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "upcoming" | "ongoing" | "completed")}
            className="w-full rounded-md border bg-card px-2 py-2 text-sm"
          >
            <option value="upcoming">예정</option>
            <option value="ongoing">진행 중</option>
            <option value="completed">종료</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">
            모집 상태
            {!recruitmentStatusOverride && (recruitmentStartAt || recruitmentEndAt) && (
              <span className="ml-1 text-[10px] font-normal text-muted-foreground">(자동 계산)</span>
            )}
          </label>
          <select
            value={recruitmentStatus}
            onChange={(e) =>
              setRecruitmentStatus(
                e.target.value as "recruiting" | "closed" | "in_progress" | "completed",
              )
            }
            className="w-full rounded-md border bg-card px-2 py-2 text-sm"
          >
            <option value="recruiting">모집 중</option>
            <option value="closed">모집 마감</option>
            <option value="in_progress">진행 중</option>
            <option value="completed">종료</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">신청 방법</label>
          <select
            value={registrationMethod}
            onChange={(e) => setRegistrationMethod(e.target.value as "open" | "manual")}
            className="w-full rounded-md border bg-card px-2 py-2 text-sm"
          >
            <option value="manual">운영진 승인</option>
            <option value="open">자동 승인</option>
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium">활동 학기 — 연도</label>
          <Input
            type="number"
            min={2000}
            max={2100}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="예: 2026"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">활동 학기 — 학기</label>
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value as "" | "first" | "second")}
            className="w-full rounded-md border bg-card px-2 py-2 text-sm"
          >
            <option value="">(미선택)</option>
            <option value="first">전기 (3월~8월)</option>
            <option value="second">후기 (9월~익년 2월)</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">리더 (자유 텍스트)</label>
          <Input
            value={leader}
            onChange={(e) => setLeader(e.target.value)}
            placeholder="예: 홍길동 (운영진)"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium">
          대표 이미지 URL
          <span className="ml-1 text-[10px] font-normal text-muted-foreground">(목록·카드 노출)</span>
        </label>
        <Input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://..."
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
