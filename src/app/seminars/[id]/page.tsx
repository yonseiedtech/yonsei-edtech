"use client";

import { use, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSeminar, useUpdateSeminar, useToggleAttendance, useAttendee, useCheckinStats } from "@/features/seminar/useSeminar";
import { registrationsApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { streamAI } from "@/lib/ai-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  FileText,
  Copy,
  Download,
  Loader2,
  Instagram,
  Mail,
  BookOpen,
  Pencil,
  CheckCircle,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getComputedStatus } from "@/lib/seminar-utils";
import { DEFAULT_REGISTRATION_FIELDS } from "@/types";
import type { Seminar, SeminarStatus, RegistrationFieldConfig } from "@/types";

// Sub-components
import HeroSection from "@/features/seminar/detail/HeroSection";
import SpeakerCard from "@/features/seminar/detail/SpeakerCard";
import SessionProgram from "@/features/seminar/detail/SessionProgram";
import RegistrationSection from "@/features/seminar/detail/RegistrationSection";
import StaffTools from "@/features/seminar/detail/StaffTools";
import EditDialogs from "@/features/seminar/detail/EditDialogs";
import type { EditSection, InfoFormData, SpeakerFormData } from "@/features/seminar/detail/EditDialogs";
import { reviewsApi } from "@/lib/bkend";
import type { SeminarReview } from "@/types";

function ReviewsList({ seminarId }: { seminarId: string }) {
  const { data } = useQuery({
    queryKey: ["reviews", seminarId],
    queryFn: async () => {
      const res = await reviewsApi.list(seminarId);
      return res.data as unknown as SeminarReview[];
    },
  });
  const reviews = (data ?? []).filter((r) => {
    if ((r.status ?? "published") === "hidden") return false;
    if (r.type === "attendee" || !r.type) return true;
    if (r.type === "staff" && (r.visibility ?? "public") === "public") return true;
    return false;
  });
  if (reviews.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">아직 작성된 후기가 없습니다.</p>;
  return (
    <div className="space-y-3">
      {reviews.map((r) => (
        <div key={r.id} className="rounded-lg border bg-muted/10 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{r.authorName}</span>
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map((v) => (
                <Star key={v} size={12} className={v <= (r.rating ?? 5) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"} />
              ))}
            </div>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">{r.content}</p>
        </div>
      ))}
    </div>
  );
}

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

  // Edit state
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

  // Registration check
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

  /* ── Edit handlers ── */
  function openEditInfo() {
    setInfoForm({
      title: seminar!.title, date: seminar!.date, time: seminar!.time,
      location: seminar!.location, isOnline: seminar!.isOnline ?? false,
      onlineUrl: seminar!.onlineUrl ?? "", maxAttendees: seminar!.maxAttendees?.toString() ?? "",
      registrationUrl: seminar!.registrationUrl ?? "", posterUrl: seminar!.posterUrl ?? "",
    });
    setEditSection("info");
  }

  function openEditSpeaker() {
    setSpeakerForm({
      speaker: seminar!.speaker, speakerBio: seminar!.speakerBio ?? "",
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
          title: infoForm.title, date: infoForm.date, time: infoForm.time,
          location: infoForm.location, isOnline: infoForm.isOnline,
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

  /* ── Press / AI ── */
  function openPressRelease() {
    setPressText(generatePressRelease(seminar!));
    setSelectedFormat("press");
    setShowPressRelease(true);
  }

  async function handleAiGenerate(format: ContentFormat) {
    setIsAiGenerating(true);
    setSelectedFormat(format);
    setPressText("");
    setShowPressRelease(true);

    try {
      await streamAI(
        "/api/ai/press-release",
        { seminar, format },
        (chunk) => setPressText((prev) => prev + chunk),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI 생성 실패");
      if (format === "press") setPressText(generatePressRelease(seminar!));
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

        {/* Section 1: Hero */}
        <HeroSection seminar={seminar} isStaff={isStaff} onEditInfo={openEditInfo} />

        {/* Section 2: Speaker */}
        <SpeakerCard seminar={seminar} isStaff={isStaff} onEdit={openEditSpeaker} />

        {/* Section 3: Description */}
        {seminar.description && (
          <div className="mt-6 rounded-2xl border bg-white p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                <BookOpen size={16} />
                세미나 소개
              </h2>
              {isStaff && (
                <button
                  onClick={openEditDescription}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  title="편집"
                >
                  <Pencil size={14} />
                </button>
              )}
            </div>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {seminar.description}
            </div>
          </div>
        )}

        {/* Section 4: Sessions */}
        <SessionProgram
          sessions={seminar.sessions ?? []}
          seminarId={id}
          isStaff={isStaff}
        />

        {/* Section 5: Registration */}
        <RegistrationSection
          seminar={seminar}
          computedStatus={computedStatus}
          user={user}
          isStaff={isStaff}
          isAttending={isAttending}
          isFull={isFull}
          myAttendee={myAttendee}
          onToggle={handleToggle}
          onEditRegFields={openEditRegFields}
          onRegistered={handleRegistered}
        />

        {/* Section 6: Seminar Space Entry */}
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

        {/* Section 6.5: Reviews */}
        <div className="mt-6 rounded-2xl border bg-white p-8">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            <Star size={16} />
            참석자 후기
          </h2>
          <ReviewsList seminarId={id} />
          <div className="mt-4 text-center">
            <Link href={`/seminars/${id}/review`}>
              <Button variant="outline" size="sm" className="gap-1">
                <Pencil size={14} />
                후기 작성하기
              </Button>
            </Link>
          </div>
        </div>

        {/* Section 7: Staff Tools */}
        {isStaff && (
          <StaffTools
            seminarId={id}
            computedStatus={computedStatus}
            checkinStats={checkinStats}
            onTemplatePress={openPressRelease}
            onAiGenerate={handleAiGenerate}
          />
        )}

        {/* Edit Dialogs */}
        <EditDialogs
          editSection={editSection}
          onClose={() => setEditSection(null)}
          onSave={handleSaveEdit}
          infoForm={infoForm}
          onInfoChange={setInfoForm}
          speakerForm={speakerForm}
          onSpeakerChange={setSpeakerForm}
          descForm={descForm}
          onDescChange={setDescForm}
          regFieldsForm={regFieldsForm}
          onRegFieldsChange={setRegFieldsForm}
        />

        {/* Content Generation Dialog */}
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
