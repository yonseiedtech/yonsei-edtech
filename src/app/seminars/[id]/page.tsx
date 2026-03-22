"use client";

import { use, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSeminar, useUpdateSeminar, useToggleAttendance, useAttendee, useCheckinStats } from "@/features/seminar/useSeminar";
import QrCodeDisplay from "@/features/seminar/QrCodeDisplay";
import SeminarRegistrationForm from "@/features/seminar/SeminarRegistrationForm";
import { registrationsApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { streamAI } from "@/lib/ai-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  UserCheck,
  UserPlus,
  FileText,
  Copy,
  Download,
  QrCode,
  LogIn,
  Sparkles,
  Loader2,
  Instagram,
  Mail,
  ExternalLink,
  Video,
  BookOpen,
  AlertCircle,
  Clock,
  Pencil,
  UserCircle,
  Settings,
  Plus,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getComputedStatus } from "@/lib/seminar-utils";
import { SEMINAR_STATUS_LABELS, SPEAKER_TYPE_LABELS, DEFAULT_REGISTRATION_FIELDS } from "@/types";
import type { Seminar, SeminarStatus, SpeakerType, RegistrationFieldConfig } from "@/types";

type ContentFormat = "press" | "sns" | "email";

const FORMAT_LABELS: Record<ContentFormat, { label: string; icon: React.ReactNode }> = {
  press: { label: "보도자료", icon: <FileText size={14} /> },
  sns: { label: "SNS 포스팅", icon: <Instagram size={14} /> },
  email: { label: "초대 이메일", icon: <Mail size={14} /> },
};

function generatePressRelease(seminar: Seminar): string {
  const speakerInfo = [
    seminar.speaker,
    seminar.speakerPosition ? `(${seminar.speakerPosition})` : "",
    seminar.speakerAffiliation || "",
  ]
    .filter(Boolean)
    .join(" ");

  const url = typeof window !== "undefined" ? window.location.href : "";

  return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
보  도  자  료
배포 일시: ${new Date().toLocaleDateString("ko-KR")}
연 락 처: yonsei.edtech@gmail.com
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

연세교육공학회,「${seminar.title}」세미나 개최

■ 일시: ${seminar.date} ${seminar.time}
■ 장소: ${seminar.location}
■ 발표자: ${speakerInfo}
■ 참석 대상: 연세대학교 교육학과 대학원생 및 관심 있는 분 누구나
■ 참석 신청: ${url}

${seminar.description}

연세교육공학회(Yonsei Educational Technology Association)는
연세대학교 교육공학 전공 학생들이 모여 교육공학의 이론과 실천을
탐구하는 학술 커뮤니티입니다. 매주 정기 세미나를 통해 최신
에듀테크 트렌드와 교육 연구를 공유하고 있습니다.

문의: yonsei.edtech@gmail.com
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

/* ── 편집 Dialog 타입 ── */
type EditSection = "info" | "speaker" | "description" | "registration-fields" | null;

interface InfoFormData {
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

interface SpeakerFormData {
  speaker: string;
  speakerBio: string;
  speakerAffiliation: string;
  speakerPosition: string;
  speakerPhotoUrl: string;
  speakerType: SpeakerType;
}

function SeminarDetail({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const seminar = useSeminar(id);
  const { updateSeminar } = useUpdateSeminar();
  const { toggleAttendance } = useToggleAttendance();
  const [showPressRelease, setShowPressRelease] = useState(false);
  const [pressText, setPressText] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<ContentFormat>("press");
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // 인라인 편집 상태
  const [editSection, setEditSection] = useState<EditSection>(null);
  const [infoForm, setInfoForm] = useState<InfoFormData>({
    title: "", date: "", time: "", location: "",
    isOnline: false, onlineUrl: "", maxAttendees: "", registrationUrl: "", posterUrl: "",
  });
  const [speakerForm, setSpeakerForm] = useState<SpeakerFormData>({
    speaker: "", speakerBio: "", speakerAffiliation: "",
    speakerPosition: "", speakerPhotoUrl: "", speakerType: "member",
  });
  const [descForm, setDescForm] = useState("");
  const [regFieldsForm, setRegFieldsForm] = useState<RegistrationFieldConfig[]>([]);

  const isStaff = isAtLeast(user, "staff");
  const myAttendee = useAttendee(id, user?.id ?? "");
  const checkinStats = useCheckinStats(id);
  const [justRegistered, setJustRegistered] = useState(false);

  // 자체 신청 여부 확인
  const { data: registrations } = useQuery({
    queryKey: ["registrations", id],
    queryFn: async () => {
      const res = await registrationsApi.list(id);
      return res.data as unknown as { userId?: string; email?: string }[];
    },
  });
  const hasRegistration = justRegistered || (registrations ?? []).some(
    (r) => (user && r.userId === user.id) || (user?.email && r.email === user.email)
  );

  const handleRegistered = useCallback(() => setJustRegistered(true), []);

  if (!seminar) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        세미나를 찾을 수 없습니다.
      </div>
    );
  }

  const computedStatus = getComputedStatus(seminar);
  const isAttending = user ? seminar.attendeeIds.includes(user.id) : false;
  const isFull =
    seminar.maxAttendees != null &&
    seminar.attendeeIds.length >= seminar.maxAttendees;
  const canToggle = computedStatus === "upcoming" && user;

  /* ── 편집 Dialog 열기 ── */
  function openEditInfo() {
    setInfoForm({
      title: seminar!.title,
      date: seminar!.date,
      time: seminar!.time,
      location: seminar!.location,
      isOnline: seminar!.isOnline ?? false,
      onlineUrl: seminar!.onlineUrl ?? "",
      maxAttendees: seminar!.maxAttendees?.toString() ?? "",
      registrationUrl: seminar!.registrationUrl ?? "",
      posterUrl: seminar!.posterUrl ?? "",
    });
    setEditSection("info");
  }

  function openEditSpeaker() {
    setSpeakerForm({
      speaker: seminar!.speaker,
      speakerBio: seminar!.speakerBio ?? "",
      speakerAffiliation: seminar!.speakerAffiliation ?? "",
      speakerPosition: seminar!.speakerPosition ?? "",
      speakerPhotoUrl: seminar!.speakerPhotoUrl ?? "",
      speakerType: seminar!.speakerType ?? "member",
    });
    setEditSection("speaker");
  }

  function openEditDescription() {
    setDescForm(seminar!.description);
    setEditSection("description");
  }

  function openEditRegFields() {
    setRegFieldsForm(
      JSON.parse(JSON.stringify(seminar!.registrationFields ?? DEFAULT_REGISTRATION_FIELDS))
    );
    setEditSection("registration-fields");
  }

  async function handleSaveEdit() {
    try {
      if (editSection === "info") {
        const data: Partial<Seminar> = {
          title: infoForm.title,
          date: infoForm.date,
          time: infoForm.time,
          location: infoForm.location,
          isOnline: infoForm.isOnline,
        };
        if (infoForm.onlineUrl) data.onlineUrl = infoForm.onlineUrl;
        if (infoForm.maxAttendees) data.maxAttendees = Number(infoForm.maxAttendees);
        if (infoForm.registrationUrl) data.registrationUrl = infoForm.registrationUrl;
        if (infoForm.posterUrl) data.posterUrl = infoForm.posterUrl;
        await updateSeminar({ id: seminar!.id, data });
      } else if (editSection === "speaker") {
        await updateSeminar({
          id: seminar!.id,
          data: {
            speaker: speakerForm.speaker,
            speakerBio: speakerForm.speakerBio || undefined,
            speakerAffiliation: speakerForm.speakerAffiliation || undefined,
            speakerPosition: speakerForm.speakerPosition || undefined,
            speakerPhotoUrl: speakerForm.speakerPhotoUrl || undefined,
            speakerType: speakerForm.speakerType,
          },
        });
      } else if (editSection === "description") {
        await updateSeminar({ id: seminar!.id, data: { description: descForm } });
      } else if (editSection === "registration-fields") {
        await updateSeminar({ id: seminar!.id, data: { registrationFields: regFieldsForm } });
      }
      toast.success("수정되었습니다.");
      setEditSection(null);
    } catch {
      toast.error("수정에 실패했습니다.");
    }
  }

  /* ── 기존 기능 ── */
  function openPressRelease() {
    setPressText(generatePressRelease(seminar!));
    setSelectedFormat("press");
    setShowPressRelease(true);
  }

  async function handleAiGenerate(format: ContentFormat) {
    setIsAiGenerating(true);
    setSelectedFormat(format);
    setPressText("");

    try {
      await streamAI(
        "/api/ai/press-release",
        { seminar, format },
        (chunk) => setPressText((prev) => prev + chunk),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI 생성 실패");
      if (format === "press") {
        setPressText(generatePressRelease(seminar!));
      }
    } finally {
      setIsAiGenerating(false);
    }
  }

  function handleCopyPress() {
    navigator.clipboard.writeText(pressText);
    toast.success("클립보드에 복사되었습니다.");
  }

  function handleDownloadPress() {
    const blob = new Blob([pressText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const suffix = FORMAT_LABELS[selectedFormat].label;
    a.download = `${suffix}_${seminar!.title.replace(/[^가-힣a-zA-Z0-9]/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("다운로드되었습니다.");
  }

  function handleToggle() {
    if (!user) return;
    if (!isAttending && isFull) {
      toast.error("참석 인원이 가득 찼습니다.");
      return;
    }
    toggleAttendance(seminar!.id, user.id);
    toast.success(isAttending ? "참석이 취소되었습니다." : "참석 신청되었습니다.");
  }

  const statusStyles: Record<SeminarStatus, string> = {
    upcoming: "bg-primary/10 text-primary",
    ongoing: "bg-amber-100 text-amber-700",
    completed: "bg-muted text-muted-foreground",
    cancelled: "bg-destructive/10 text-destructive",
  };
  const badge = {
    label: SEMINAR_STATUS_LABELS[computedStatus],
    className: statusStyles[computedStatus],
  };

  const sessions = (seminar.sessions ?? []).sort((a, b) => a.time.localeCompare(b.time));

  /* ── 편집 버튼 컴포넌트 ── */
  function EditButton({ onClick }: { onClick: () => void }) {
    if (!isStaff) return null;
    return (
      <button
        onClick={onClick}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        title="편집"
      >
        <Pencil size={14} />
      </button>
    );
  }

  return (
    <div className="py-16">
      <div className="mx-auto max-w-3xl px-4">
        <button
          onClick={() => router.push("/seminars")}
          className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
          목록으로
        </button>

        {/* ── 섹션 1: 히어로 영역 ── */}
        <div className="relative overflow-hidden rounded-2xl border bg-white">
          <div className="relative h-48 sm:h-64 w-full">
            {seminar.posterUrl ? (
              <>
                <img
                  src={seminar.posterUrl}
                  alt={seminar.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5">
                <div className="text-center">
                  <BookOpen size={48} className="mx-auto text-primary/30" />
                  <p className="mt-2 text-sm text-primary/40 font-medium">세미나 포스터</p>
                  {isStaff && (
                    <button
                      onClick={openEditInfo}
                      className="mt-2 inline-flex items-center gap-1 rounded-md bg-white/80 px-3 py-1.5 text-xs text-muted-foreground shadow-sm hover:bg-white transition-colors"
                    >
                      <Pencil size={12} />
                      포스터 이미지 등록
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="p-8 relative -mt-20 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className={cn("text-xs", badge.className, "shadow-sm")} variant="secondary">
                  {badge.label}
                </Badge>
                {seminar.isOnline && (
                  <Badge variant="secondary" className="bg-blue-50 text-xs text-blue-700">
                    ONLINE
                  </Badge>
                )}
              </div>
              <EditButton onClick={openEditInfo} />
            </div>

            {computedStatus === "cancelled" && seminar.cancelReason && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <AlertCircle size={16} className="shrink-0 text-red-500" />
                <span>취소 사유: {seminar.cancelReason}</span>
              </div>
            )}

            <h1 className={cn("mt-3 text-2xl font-bold sm:text-3xl", seminar.posterUrl ? "text-white drop-shadow-sm" : "text-foreground")}>
              {seminar.title}
            </h1>

            <div className={cn("mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm", seminar.posterUrl ? "text-white/90" : "text-muted-foreground")}>
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                <span>{seminar.date} {seminar.time}</span>
              </div>
              <div className="flex items-center gap-2">
                {seminar.isOnline ? <Video size={16} className="text-blue-400" /> : <MapPin size={16} />}
                <span>{seminar.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={16} />
                <span>
                  참석 {seminar.attendeeIds.length}
                  {seminar.maxAttendees ? ` / ${seminar.maxAttendees}` : ""}명
                </span>
              </div>
            </div>

            {seminar.isOnline && seminar.onlineUrl && (
              <div className="mt-2">
                <a
                  href={seminar.onlineUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 underline hover:text-blue-800"
                >
                  <Video size={14} />
                  ZOOM 접속 링크
                </a>
              </div>
            )}
          </div>
        </div>

        {/* ── 섹션 2: 연사 카드 ── */}
        <div className="mt-6 rounded-2xl border bg-white p-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              <UserCircle size={16} />
              연사 소개
            </h2>
            <EditButton onClick={openEditSpeaker} />
          </div>

          <div className="flex flex-col sm:flex-row items-start gap-6">
            {seminar.speakerPhotoUrl ? (
              <img
                src={seminar.speakerPhotoUrl}
                alt={seminar.speaker}
                className="h-24 w-24 shrink-0 rounded-full object-cover ring-4 ring-primary/10"
              />
            ) : (
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-4 ring-primary/5">
                <UserCircle size={40} />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">{seminar.speaker}</span>
                {seminar.speakerType === "guest" ? (
                  <Badge variant="secondary" className="bg-amber-50 text-xs text-amber-700">
                    GUEST SPEAKER
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    MEMBER
                  </Badge>
                )}
              </div>
              {(seminar.speakerAffiliation || seminar.speakerPosition) && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {[seminar.speakerAffiliation, seminar.speakerPosition].filter(Boolean).join(" · ")}
                </p>
              )}
              {seminar.speakerBio && (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {seminar.speakerBio}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── 섹션 3: 세미나 소개 ── */}
        {seminar.description && (
          <div className="mt-6 rounded-2xl border bg-white p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                <BookOpen size={16} />
                세미나 소개
              </h2>
              <EditButton onClick={openEditDescription} />
            </div>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {seminar.description}
            </div>
          </div>
        )}

        {/* ── 섹션 4: 세션 프로그램 ── */}
        <div className="mt-6 rounded-2xl border bg-white p-8">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            <Clock size={16} />
            세션 프로그램
          </h2>
          {sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.map((sess, idx) => (
                <div
                  key={sess.id}
                  className="flex items-start gap-4 rounded-lg border bg-muted/20 px-4 py-3"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    {sess.category && (
                      <Badge variant="secondary" className="mb-1 text-xs">
                        {sess.category}
                      </Badge>
                    )}
                    <p className="font-medium text-sm">{sess.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {sess.speaker}
                      {sess.speakerBio && ` · ${sess.speakerBio}`}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground mt-0.5">
                    {sess.time}{sess.endTime ? `~${sess.endTime}` : ""} ({sess.duration}분)
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-6 text-center">
              <Clock size={32} className="text-muted-foreground/30" />
              <p className="mt-2 text-sm text-muted-foreground">등록된 세션이 없습니다.</p>
              {isStaff && (
                <Link href={`/seminars/${id}/lms`}>
                  <Button variant="outline" size="sm" className="mt-3">
                    <Plus size={14} className="mr-1" />
                    세미나 공간에서 세션 추가
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* ── 섹션 5: 참석 신청 ── */}
        <div className="mt-6 rounded-2xl border bg-white p-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              <UserPlus size={16} />
              참석 신청
            </h2>
            {isStaff && (
              <button
                onClick={openEditRegFields}
                className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="신청 폼 설정"
              >
                <Settings size={14} />
                폼 설정
              </button>
            )}
          </div>

          {/* 외부 신청 버튼 */}
          {seminar.registrationUrl && computedStatus === "upcoming" && (
            <div className="mb-4">
              <a
                href={seminar.registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" className="w-full sm:w-auto">
                  <ExternalLink size={16} className="mr-1" />
                  외부 신청 (Google Form 등)
                </Button>
              </a>
            </div>
          )}

          {/* 회원 참석 신청 */}
          {computedStatus === "upcoming" && user && (
            <div className="mb-4">
              <Button
                onClick={handleToggle}
                variant={isAttending ? "outline" : "default"}
                className="w-full sm:w-auto"
              >
                {isAttending ? (
                  <>
                    <UserCheck size={16} className="mr-1" />
                    참석 취소
                  </>
                ) : (
                  <>
                    <UserPlus size={16} className="mr-1" />
                    회원 참석 신청
                  </>
                )}
              </Button>
              {isFull && !isAttending && (
                <p className="mt-2 text-xs text-destructive">
                  인원이 가득 찼습니다.
                </p>
              )}
            </div>
          )}

          {/* 자체 신청 폼 (비회원 포함) */}
          {computedStatus === "upcoming" && (
            <SeminarRegistrationForm seminarId={id} seminarTitle={seminar.title} fields={seminar.registrationFields} onSubmitted={handleRegistered} />
          )}

          {/* 비회원 로그인 안내 */}
          {computedStatus === "upcoming" && !user && (
            <div className="mt-4 text-center">
              <Link href="/login">
                <Button variant="outline" className="w-full sm:w-auto">
                  <LogIn size={16} className="mr-1" />
                  로그인하면 QR 출석 등 회원 기능을 이용할 수 있습니다
                </Button>
              </Link>
            </div>
          )}

          {/* 참석자: 내 QR 코드 */}
          {isAttending && myAttendee && computedStatus === "upcoming" && (
            <div className="mt-6 border-t pt-6">
              <h3 className="mb-3 text-sm font-bold">내 출석 QR 코드</h3>
              <div className="flex justify-center">
                <QrCodeDisplay
                  token={myAttendee.qrToken}
                  size={180}
                  checkedIn={myAttendee.checkedIn}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── 섹션 6: 세미나 공간 입장 (신청자/참석자/운영진만) ── */}
        {computedStatus !== "cancelled" && (isAttending || hasRegistration || isStaff) && (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50/50 p-8">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle size={20} className="text-green-600" />
              <span className="text-sm font-semibold text-green-800">
                {isStaff ? "운영진 접근" : "신청 완료"}
              </span>
            </div>
            <p className="text-sm text-green-700 mb-4">
              {isStaff
                ? "운영진으로서 세미나 공간에 접근할 수 있습니다."
                : "세미나 참석 신청이 완료되었습니다. 세미나 공간에서 자료와 후기를 확인하세요."}
            </p>
            <Link href={`/seminars/${id}/lms`}>
              <Button className="w-full gap-2">
                <BookOpen size={16} />
                세미나 공간 입장
              </Button>
            </Link>
          </div>
        )}

        {/* ── 섹션 7: 운영진 도구 ── */}
        {isStaff && (
          <div className="mt-6 rounded-2xl border bg-white p-8">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              <Sparkles size={16} />
              운영진 도구
            </h2>
            <div className="flex flex-wrap gap-2">
              {computedStatus === "upcoming" && (
                <Button
                  size="sm"
                  onClick={() => router.push(`/seminars/${id}/checkin`)}
                >
                  <QrCode size={16} className="mr-1" />
                  출석 체크 ({checkinStats.checkedIn}/{checkinStats.total})
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={openPressRelease}>
                <FileText size={16} className="mr-1" />
                보도자료 (템플릿)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowPressRelease(true);
                  handleAiGenerate("press");
                }}
              >
                <Sparkles size={16} className="mr-1" />
                AI 보도자료
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowPressRelease(true);
                  handleAiGenerate("sns");
                }}
              >
                <Instagram size={16} className="mr-1" />
                AI SNS
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowPressRelease(true);
                  handleAiGenerate("email");
                }}
              >
                <Mail size={16} className="mr-1" />
                AI 초대장
              </Button>
            </div>
          </div>
        )}

        {/* ── 편집 Dialog ── */}
        <Dialog open={editSection !== null} onOpenChange={(open) => !open && setEditSection(null)}>
          <DialogContent className={cn("max-h-[80vh] overflow-y-auto", editSection === "registration-fields" ? "sm:max-w-2xl" : "sm:max-w-lg")}>
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
                  <Input value={infoForm.title} onChange={(e) => setInfoForm({ ...infoForm, title: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">날짜</label>
                    <Input type="date" value={infoForm.date} onChange={(e) => setInfoForm({ ...infoForm, date: e.target.value })} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">시간</label>
                    <Input type="time" value={infoForm.time} onChange={(e) => setInfoForm({ ...infoForm, time: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">장소</label>
                  <Input value={infoForm.location} onChange={(e) => setInfoForm({ ...infoForm, location: e.target.value })} />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={infoForm.isOnline}
                    onChange={(e) => setInfoForm({ ...infoForm, isOnline: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  온라인 (ZOOM)
                </label>
                {infoForm.isOnline && (
                  <div>
                    <label className="mb-1 block text-sm font-medium">ZOOM URL</label>
                    <Input value={infoForm.onlineUrl} onChange={(e) => setInfoForm({ ...infoForm, onlineUrl: e.target.value })} placeholder="https://zoom.us/j/..." />
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-sm font-medium">최대 인원</label>
                  <Input type="number" value={infoForm.maxAttendees} onChange={(e) => setInfoForm({ ...infoForm, maxAttendees: e.target.value })} placeholder="제한 없음" min={1} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">외부 신청 URL</label>
                  <Input value={infoForm.registrationUrl} onChange={(e) => setInfoForm({ ...infoForm, registrationUrl: e.target.value })} placeholder="https://forms.gle/..." />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">포스터 이미지 URL</label>
                  <Input value={infoForm.posterUrl} onChange={(e) => setInfoForm({ ...infoForm, posterUrl: e.target.value })} placeholder="https://..." />
                </div>
              </div>
            )}

            {editSection === "speaker" && (
              <div className="grid gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">이름</label>
                  <Input value={speakerForm.speaker} onChange={(e) => setSpeakerForm({ ...speakerForm, speaker: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">타입</label>
                  <select
                    value={speakerForm.speakerType}
                    onChange={(e) => setSpeakerForm({ ...speakerForm, speakerType: e.target.value as SpeakerType })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {Object.entries(SPEAKER_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">소속</label>
                    <Input value={speakerForm.speakerAffiliation} onChange={(e) => setSpeakerForm({ ...speakerForm, speakerAffiliation: e.target.value })} placeholder="소속 기관" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">직위</label>
                    <Input value={speakerForm.speakerPosition} onChange={(e) => setSpeakerForm({ ...speakerForm, speakerPosition: e.target.value })} placeholder="직위/직책" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">소개</label>
                  <Textarea value={speakerForm.speakerBio} onChange={(e) => setSpeakerForm({ ...speakerForm, speakerBio: e.target.value })} rows={3} placeholder="발표자 약력" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">사진 URL</label>
                  <Input value={speakerForm.speakerPhotoUrl} onChange={(e) => setSpeakerForm({ ...speakerForm, speakerPhotoUrl: e.target.value })} placeholder="https://..." />
                </div>
              </div>
            )}

            {editSection === "description" && (
              <Textarea
                value={descForm}
                onChange={(e) => setDescForm(e.target.value)}
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
                            setRegFieldsForm(updated);
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
                            setRegFieldsForm(updated);
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
                              setRegFieldsForm(updated);
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
                            setRegFieldsForm(updated);
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
                            setRegFieldsForm(updated);
                          }}
                          className="h-7 text-xs"
                          placeholder="placeholder"
                        />
                        {!["name", "email"].includes(field.key) && (
                          <button
                            type="button"
                            onClick={() => setRegFieldsForm(regFieldsForm.filter((_, i) => i !== idx))}
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
                            setRegFieldsForm(updated);
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
                    setRegFieldsForm([
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
              <Button variant="outline" onClick={() => setEditSection(null)}>취소</Button>
              <Button onClick={handleSaveEdit}>저장</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── 콘텐츠 생성 Dialog ── */}
        <Dialog
          open={showPressRelease}
          onOpenChange={(open) => !open && setShowPressRelease(false)}
        >
          <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {FORMAT_LABELS[selectedFormat].icon}
                {FORMAT_LABELS[selectedFormat].label}
                {isAiGenerating && (
                  <Loader2 size={16} className="animate-spin text-muted-foreground" />
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
              {(Object.entries(FORMAT_LABELS) as [ContentFormat, typeof FORMAT_LABELS[ContentFormat]][]).map(
                ([key, { label, icon }]) => (
                  <button
                    key={key}
                    onClick={() => handleAiGenerate(key)}
                    disabled={isAiGenerating}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      selectedFormat === key
                        ? "bg-white text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {icon}
                    {label}
                  </button>
                ),
              )}
            </div>

            <textarea
              value={pressText}
              onChange={(e) => setPressText(e.target.value)}
              rows={20}
              className="w-full rounded-lg border border-input bg-muted/30 px-3 py-2 font-mono text-xs leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyPress}>
                <Copy size={14} className="mr-1" />
                복사
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPress}>
                <Download size={14} className="mr-1" />
                .txt 다운로드
              </Button>
              <Button variant="outline" onClick={() => setShowPressRelease(false)}>
                닫기
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default function SeminarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <SeminarDetail id={id} />;
}
