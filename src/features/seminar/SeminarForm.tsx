"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Send, Video, Eye, PenLine, Calendar, MapPin, Users, UserPlus,
  AlertTriangle, Save, Plus,
} from "lucide-react";
import { toast } from "sonner";
import { useCreateSeminar, useUpdateSeminar, useSeminars } from "./useSeminar";
import { useAuthStore } from "@/features/auth/auth-store";
import { useAllMembers } from "@/features/member/useMembers";
import { createTimeline } from "@/features/seminar-admin/timeline-template";
import SpeakerRow, { emptySpeaker } from "./SpeakerRow";
import type { Seminar, SeminarSpeaker } from "@/types";
import { inferCurrentSemester, formatSemester, type Semester } from "@/lib/semester";

interface FormData {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  onlineUrl: string;
  maxAttendees: string;
  registrationUrl: string;
}

/** 등록 시점에 선택할 수 있는 학기 옵션 (이전/현재/다음 1년 범위) */
function buildSemesterOptions(now: Date = new Date()): Array<{
  value: string;
  label: string;
  year: number;
  semester: Semester;
}> {
  const cur = inferCurrentSemester(now);
  const list: Array<{ year: number; semester: Semester }> = [
    { year: cur.year - 1, semester: "first" },
    { year: cur.year - 1, semester: "second" },
    { year: cur.year, semester: "first" },
    { year: cur.year, semester: "second" },
    { year: cur.year + 1, semester: "first" },
    { year: cur.year + 1, semester: "second" },
  ];
  return list.map((x) => ({
    value: `${x.year}-${x.semester}`,
    label: formatSemester(x.year, x.semester),
    year: x.year,
    semester: x.semester,
  }));
}

export default function SeminarForm() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { createSeminar } = useCreateSeminar();
  const { updateSeminar: _updateSeminar } = useUpdateSeminar();
  const { seminars: allSeminars } = useSeminars();
  const { members } = useAllMembers();
  const [isOnline, setIsOnline] = useState(false);
  const [speakers, setSpeakers] = useState<SeminarSpeaker[]>([emptySpeaker("member")]);
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [autoIssueCertificates, setAutoIssueCertificates] = useState(true);
  const semesterOptions = useMemo(() => buildSemesterOptions(), []);
  const defaultSemesterValue = useMemo(() => {
    const c = inferCurrentSemester();
    return `${c.year}-${c.semester}`;
  }, []);
  const [semesterValue, setSemesterValue] = useState<string>(defaultSemesterValue);
  const selectedSemester = useMemo(
    () => semesterOptions.find((o) => o.value === semesterValue) ?? null,
    [semesterOptions, semesterValue],
  );
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>();

  const w = watch();

  // Schedule conflict detection
  const conflictingSeminars = useMemo(() => {
    if (!w.date) return [];
    return allSeminars.filter(
      (s) => s.date === w.date && s.status !== "cancelled"
    );
  }, [w.date, allSeminars]);

  function updateSpeaker(idx: number, patch: Partial<SeminarSpeaker>) {
    setSpeakers((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  function removeSpeaker(idx: number) {
    setSpeakers((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
  }

  function addSpeaker() {
    setSpeakers((prev) => [...prev, emptySpeaker("member")]);
  }

  function buildSeminarData(data: FormData, status: "draft" | "upcoming"): Record<string, unknown> {
    // 빈 연사 행 제거 — 이름이 있는 항목만 저장
    const cleaned = speakers
      .map((s) => ({
        type: s.type,
        userId: s.userId,
        studentId: s.studentId?.trim() || undefined,
        name: s.name.trim(),
        bio: s.bio?.trim() || undefined,
        affiliation: s.affiliation?.trim() || undefined,
        position: s.position?.trim() || undefined,
        photoUrl: s.photoUrl?.trim() || undefined,
      }))
      .filter((s) => s.name.length > 0);
    const primary = cleaned[0];
    const seminarData: Record<string, unknown> = {
      title: data.title || "(제목 없음)",
      description: data.description || "",
      date: data.date || "",
      time: data.time || "",
      location: isOnline ? (data.location || "온라인 (ZOOM)") : (data.location || ""),
      isOnline,
      // 하위호환: 첫 번째 연사를 단일 필드에도 그대로 보관
      speaker: primary?.name ?? "",
      attendeeIds: [],
      status,
      createdBy: user?.id ?? "",
    };
    if (isOnline && data.onlineUrl) seminarData.onlineUrl = data.onlineUrl;
    if (primary?.bio) seminarData.speakerBio = primary.bio;
    if (primary) seminarData.speakerType = primary.type;
    if (primary?.affiliation) seminarData.speakerAffiliation = primary.affiliation;
    if (primary?.position) seminarData.speakerPosition = primary.position;
    if (primary?.photoUrl) seminarData.speakerPhotoUrl = primary.photoUrl;
    seminarData.speakers = cleaned;
    if (data.maxAttendees) seminarData.maxAttendees = Number(data.maxAttendees);
    if (data.registrationUrl) seminarData.registrationUrl = data.registrationUrl;
    if (selectedSemester) {
      seminarData.year = selectedSemester.year;
      seminarData.semester = selectedSemester.semester;
    }
    seminarData.autoIssueCertificates = autoIssueCertificates;
    // 회원 연사 자동 호스트 권한 부여
    const hostUserIds = cleaned
      .filter((s) => s.type === "member" && s.userId)
      .map((s) => s.userId as string);
    if (hostUserIds.length > 0) seminarData.hostUserIds = hostUserIds;
    // 타임라인 자동 적용
    if (status === "upcoming") {
      seminarData.timeline = createTimeline(isOnline);
    }
    return seminarData;
  }

  function validateBeforeSubmit(): string | null {
    const named = speakers.filter((s) => s.name.trim().length > 0);
    if (named.length === 0) return "최소 1명의 연사를 입력하세요";
    return null;
  }

  async function handleSaveDraft() {
    const err = validateBeforeSubmit();
    if (err) {
      toast.error(err);
      return;
    }
    setIsSaving(true);
    try {
      const data = watch() as unknown as FormData;
      const seminarData = buildSeminarData(data, "draft");
      await createSeminar(seminarData as unknown as Omit<Seminar, "id" | "attendeeIds" | "createdAt" | "updatedAt">);
      toast.success("임시저장되었습니다.");
      router.push("/console/academic/seminars");
    } catch (err) {
      console.error("임시저장 실패:", err);
      toast.error(err instanceof Error ? err.message : "임시저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function onSubmit(data: FormData) {
    const verr = validateBeforeSubmit();
    if (verr) {
      toast.error(verr);
      return;
    }
    try {
      const seminarData = buildSeminarData(data, "upcoming");
      await createSeminar(seminarData as unknown as Omit<Seminar, "id" | "attendeeIds" | "createdAt" | "updatedAt">);
      toast.success("세미나가 등록되었습니다. 타임라인이 자동 적용되었습니다.");
      router.push("/console/academic/seminars");
    } catch (err) {
      console.error("세미나 등록 실패:", err);
      toast.error(err instanceof Error ? err.message : "세미나 등록에 실패했습니다.");
    }
  }

  return (
    <div>
      <button
        onClick={() => router.push("/seminars")}
        className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} />
        목록으로
      </button>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">세미나 등록</h1>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview ? <PenLine size={14} className="mr-1" /> : <Eye size={14} className="mr-1" />}
          {showPreview ? "편집" : "미리보기"}
        </Button>
      </div>

      {showPreview ? (
        /* ── 세미나 미리보기 ── */
        <div className="mt-6 rounded-2xl border bg-card p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-primary/10 text-xs text-primary" variant="secondary">예정</Badge>
            {selectedSemester && (
              <Badge variant="secondary" className="bg-blue-50 text-xs text-blue-700">
                {formatSemester(selectedSemester.year, selectedSemester.semester)}
              </Badge>
            )}
            {isOnline && (
              <Badge variant="secondary" className="bg-blue-50 text-xs text-blue-700">ONLINE</Badge>
            )}
          </div>

          <h2 className="mt-3 text-2xl font-bold">{w.title || "(세미나 제목)"}</h2>

          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar size={16} />
              <span>{w.date || "____-__-__"} {w.time || "__:__"}</span>
            </div>
            <div className="flex items-center gap-2">
              {isOnline ? <Video size={16} className="text-blue-500" /> : <MapPin size={16} />}
              <span>{w.location || (isOnline ? "온라인 (ZOOM)" : "(장소)")}</span>
            </div>
            {isOnline && w.onlineUrl && (
              <div className="flex items-center gap-2 pl-6">
                <a href={w.onlineUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">
                  ZOOM 접속 링크
                </a>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users size={16} />
              <span>참석 0{w.maxAttendees ? ` / ${w.maxAttendees}` : ""}명</span>
            </div>
          </div>

          {/* 연사 미리보기 (다중) */}
          <div className="mt-6 space-y-3">
            {speakers.filter((s) => s.name.trim()).length === 0 ? (
              <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                (연사 미입력)
              </div>
            ) : (
              speakers
                .filter((s) => s.name.trim())
                .map((s, idx) => (
                  <div key={idx} className="rounded-lg bg-muted/50 p-4">
                    <div className="flex items-start gap-4">
                      {s.photoUrl ? (
                        <img src={s.photoUrl} alt={s.name} className="h-16 w-16 shrink-0 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <UserPlus size={24} />
                        </div>
                      )}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{s.name}</span>
                          {s.type === "guest" ? (
                            <Badge variant="secondary" className="bg-amber-50 text-xs text-amber-700">GUEST</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">MEMBER</Badge>
                          )}
                          {s.studentId && (
                            <span className="font-mono text-[11px] text-muted-foreground">{s.studentId}</span>
                          )}
                        </div>
                        {(s.affiliation || s.position) && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {[s.affiliation, s.position].filter(Boolean).join(" · ")}
                          </p>
                        )}
                        {s.bio && (
                          <p className="mt-1 text-xs text-muted-foreground">{s.bio}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>

          <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed">
            {w.description || "(세미나 설명)"}
          </div>

          <div className="mt-8 rounded-lg border border-dashed border-muted-foreground/30 p-4 text-center text-xs text-muted-foreground">
            이것은 미리보기입니다. &quot;편집&quot; 버튼을 눌러 수정하거나, 폼을 제출하세요.
          </div>
        </div>
      ) : (
        /* ── 편집 폼 ── */
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4 rounded-2xl border bg-card p-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                연도 · 학기 <span className="text-muted-foreground">(자동 설정됨)</span>
              </label>
              <select
                value={semesterValue}
                onChange={(e) => setSemesterValue(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {semesterOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">
                학기별 세미나 모아보기·통계에 반영됩니다.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">선택된 학기</label>
              <div className="flex h-10 items-center rounded-md border border-input bg-muted/30 px-3 text-sm">
                <Badge variant="secondary" className="bg-blue-50 text-xs text-blue-700">
                  {selectedSemester ? formatSemester(selectedSemester.year, selectedSemester.semester) : "—"}
                </Badge>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">제목</label>
            <Input {...register("title", { required: "제목을 입력하세요" })} placeholder="세미나 제목" />
            {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">설명</label>
            <Textarea {...register("description", { required: "설명을 입력하세요" })} placeholder="세미나 소개 및 내용..." rows={5} />
            {errors.description && <p className="mt-1 text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">날짜</label>
              <Input type="date" {...register("date", { required: "날짜를 선택하세요" })} />
              {errors.date && <p className="mt-1 text-xs text-destructive">{errors.date.message}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">시간</label>
              <Input type="time" {...register("time", { required: "시간을 선택하세요" })} />
              {errors.time && <p className="mt-1 text-xs text-destructive">{errors.time.message}</p>}
            </div>
          </div>

          {conflictingSeminars.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">같은 날짜에 세미나가 {conflictingSeminars.length}개 있습니다:</p>
                <ul className="mt-1 space-y-0.5">
                  {conflictingSeminars.map((s) => (
                    <li key={s.id} className="text-xs">{s.time} — {s.title} ({s.location})</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium">장소</label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isOnline}
                  onChange={(e) => setIsOnline(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Video size={14} className="text-blue-500" />
                온라인 (ZOOM)
              </label>
            </div>
            <Input
              {...register("location", { required: !isOnline ? "장소를 입력하세요" : false })}
              placeholder={isOnline ? "온라인 (ZOOM) — 비워두면 자동 입력" : "예: 교육과학관 203호"}
            />
            {errors.location && <p className="mt-1 text-xs text-destructive">{errors.location.message}</p>}
            {isOnline && (
              <div className="mt-2">
                <Input {...register("onlineUrl")} placeholder="ZOOM 링크 (https://zoom.us/j/...)" />
                <p className="mt-1 text-xs text-muted-foreground">참석자에게 표시될 접속 링크입니다.</p>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">최대 인원 <span className="text-muted-foreground">(선택)</span></label>
            <Input type="number" {...register("maxAttendees")} placeholder="제한 없음" min={1} />
          </div>

          {/* ── 연사 (다중) ── */}
          <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <UserPlus size={14} />연사 ({speakers.length}명)
              </h3>
              <Button type="button" size="sm" variant="outline" onClick={addSpeaker}>
                <Plus size={13} className="mr-1" />연사 추가
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              내부 회원: 회원 검색으로 자동 매칭 (학번이 함께 저장되어 추후 가입한 사람과도 자동 연동됩니다).
              조회 결과가 없으면 수기 입력하세요.
            </p>

            {speakers.map((s, idx) => (
              <SpeakerRow
                key={idx}
                speaker={s}
                index={idx}
                canRemove={speakers.length > 1}
                onChange={(patch) => updateSpeaker(idx, patch)}
                onRemove={() => removeSpeaker(idx)}
                allMembers={members}
                excludeIds={speakers
                  .filter((x, i) => i !== idx && x.userId)
                  .map((x) => x.userId as string)}
              />
            ))}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">외부 신청 URL <span className="text-muted-foreground">(선택)</span></label>
            <Input {...register("registrationUrl")} placeholder="https://forms.gle/..." />
          </div>

          <div className="rounded-lg border border-muted bg-muted/20 p-3">
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoIssueCertificates}
                onChange={(e) => setAutoIssueCertificates(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300"
              />
              <div>
                <p className="font-medium">세미나 종료 시 수료증 자동 발급</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  체크인 출석자에게 수료증을 자동 발급합니다. 해제하면 운영자가 직접 발급해야 합니다.
                </p>
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push("/console/academic/seminars")}>
              취소
            </Button>
            <Button type="button" variant="secondary" onClick={handleSaveDraft} disabled={isSaving}>
              <Save size={16} className="mr-1" />
              {isSaving ? "저장 중..." : "임시저장"}
            </Button>
            <Button type="submit">
              <Send size={16} className="mr-1" />
              등록
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
