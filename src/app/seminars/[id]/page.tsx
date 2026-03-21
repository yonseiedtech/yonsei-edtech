"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSeminar, useToggleAttendance, useAttendee, useCheckinStats } from "@/features/seminar/useSeminar";
import QrCodeDisplay from "@/features/seminar/QrCodeDisplay";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { streamAI } from "@/lib/ai-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Seminar } from "@/types";

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
  const { toggleAttendance } = useToggleAttendance();
  const [showPressRelease, setShowPressRelease] = useState(false);
  const [pressText, setPressText] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<ContentFormat>("press");
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const isStaff = isAtLeast(user, "staff");
  const myAttendee = useAttendee(id, user?.id ?? "");
  const checkinStats = useCheckinStats(id);

  if (!seminar) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        세미나를 찾을 수 없습니다.
      </div>
    );
  }

  const isAttending = user ? seminar.attendeeIds.includes(user.id) : false;
  const isFull =
    seminar.maxAttendees != null &&
    seminar.attendeeIds.length >= seminar.maxAttendees;
  const canToggle = seminar.status === "upcoming" && user;

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
      // Fallback to template for press format
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

  const statusMap = {
    upcoming: { label: "예정", className: "bg-primary/10 text-primary" },
    completed: { label: "완료", className: "bg-muted text-muted-foreground" },
    cancelled: { label: "취소", className: "bg-destructive/10 text-destructive" },
  };
  const badge = statusMap[seminar.status];

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

        <div className="rounded-2xl border bg-white p-8">
          <div className="flex items-center gap-2">
            <Badge className={cn("text-xs", badge.className)} variant="secondary">
              {badge.label}
            </Badge>
          </div>

          <h1 className="mt-3 text-2xl font-bold">{seminar.title}</h1>

          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar size={16} />
              <span>
                {seminar.date} {seminar.time}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={16} />
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

          <div className="mt-6 rounded-lg bg-muted/50 p-4">
            <div className="flex items-start gap-4">
              {seminar.speakerPhotoUrl ? (
                <img
                  src={seminar.speakerPhotoUrl}
                  alt={seminar.speaker}
                  className="h-16 w-16 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UserPlus size={24} />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{seminar.speaker}</span>
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
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[seminar.speakerAffiliation, seminar.speakerPosition].filter(Boolean).join(" · ")}
                  </p>
                )}
                {seminar.speakerBio && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {seminar.speakerBio}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed">
            {seminar.description}
          </div>

          {/* 외부 신청 버튼 */}
          {seminar.registrationUrl && seminar.status === "upcoming" && (
            <div className="mt-6">
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

          {/* 참석 신청 영역 */}
          {seminar.status === "upcoming" && (
            <div className="mt-8 border-t pt-6">
              {user ? (
                <>
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
                        참석 신청
                      </>
                    )}
                  </Button>
                  {isFull && !isAttending && (
                    <p className="mt-2 text-xs text-destructive">
                      인원이 가득 찼습니다.
                    </p>
                  )}
                </>
              ) : (
                <Link href="/login">
                  <Button variant="outline" className="w-full sm:w-auto">
                    <LogIn size={16} className="mr-1" />
                    로그인 후 참석 신청
                  </Button>
                </Link>
              )}
            </div>
          )}

          {/* 참석자: 내 QR 코드 */}
          {isAttending && myAttendee && seminar.status === "upcoming" && (
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

          {/* 운영진: 출석 체크 + 콘텐츠 생성 */}
          {isStaff && (
            <div className="mt-4 border-t pt-4">
              <div className="flex flex-wrap gap-2">
                {seminar.status === "upcoming" && (
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
        </div>

        {/* 콘텐츠 생성 Dialog */}
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

            {/* 형식 전환 탭 */}
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
