"use client";

import { use, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSeminar } from "@/features/seminar/useSeminar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, Star, CheckCircle, Loader2, AlertCircle, ShieldCheck, Pencil, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Step = "verify" | "write" | "done";

interface VerifiedAttendee {
  name: string;
  studentId?: string;
  userId?: string;
}

interface ExistingReview {
  id: string;
  content: string;
  rating: number;
  questionAnswers?: Record<string, string> | null;
  createdAt: string;
}

interface SubmittedReview {
  content: string;
  rating: number;
  questionAnswers?: Record<string, string>;
}

function ReviewForm({ seminarId }: { seminarId: string }) {
  const seminar = useSeminar(seminarId);

  // 단계 관리
  const [step, setStep] = useState<Step>("verify");
  const [verifiedAttendee, setVerifiedAttendee] = useState<VerifiedAttendee | null>(null);
  const [submittedReview, setSubmittedReview] = useState<SubmittedReview | null>(null);

  // 기존 후기
  const [existingReview, setExistingReview] = useState<ExistingReview | null>(null);
  const [showExistingDialog, setShowExistingDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // 가입 권장 팝업
  const [showSignupDialog, setShowSignupDialog] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  // Step 1: 인증
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  // Step 2: 후기 작성
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const reviewQuestions = seminar?.reviewQuestions?.attendee ?? [];

  // Step 1: 참석자 인증
  async function handleVerify() {
    if (!name.trim()) { toast.error("이름을 입력하세요."); return; }
    if (!studentId.trim()) { toast.error("학번을 입력하세요."); return; }
    setVerifying(true);
    setVerifyError("");

    try {
      const params = new URLSearchParams({ seminarId, name: name.trim(), studentId: studentId.trim() });

      const res = await fetch(`/api/reviews?${params}`);
      const data = await res.json();

      if (!res.ok) {
        setVerifyError(data.error || "인증에 실패했습니다.");
        return;
      }

      if (!data.verified) {
        setVerifyError(data.message || "참석자 목록에서 확인되지 않았습니다.");
        return;
      }

      setVerifiedAttendee(data.attendee);

      if (data.alreadyReviewed && data.existingReview) {
        setExistingReview(data.existingReview);
        setShowExistingDialog(true);
      } else {
        // 게스트(비회원)인지 확인 → 가입 권장 팝업
        const isGuestUser = !data.attendee.userId || data.attendee.userId.startsWith("guest_");
        if (isGuestUser) {
          setIsGuest(true);
          setShowSignupDialog(true);
        } else {
          setStep("write");
        }
      }
    } catch {
      setVerifyError("인증 중 오류가 발생했습니다.");
    } finally {
      setVerifying(false);
    }
  }

  function handleGoToSignup() {
    const params = new URLSearchParams({ name: name.trim(), studentId: studentId.trim() });
    window.location.href = `/signup?${params}`;
  }

  function handleContinueAsGuest() {
    setShowSignupDialog(false);
    setStep("write");
  }

  // 기존 후기 수정 모드 진입
  function handleStartEdit() {
    if (!existingReview) return;
    setRating(existingReview.rating ?? 5);
    setContent(existingReview.content);
    setQuestionAnswers(existingReview.questionAnswers ?? {});
    setEditMode(true);
    setShowExistingDialog(false);
    setStep("write");
  }

  // Step 2: 후기 제출 (신규 또는 수정)
  async function handleSubmit() {
    if (!content.trim()) { toast.error("후기 내용을 입력하세요."); return; }
    if (!verifiedAttendee) return;

    setSubmitting(true);
    try {
      const authorId = verifiedAttendee.userId || `guest_${verifiedAttendee.name}`;

      if (editMode && existingReview) {
        // 수정 모드
        const res = await fetch("/api/reviews", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reviewId: existingReview.id,
            content: content.trim(),
            rating,
            authorId,
            questionAnswers: Object.keys(questionAnswers).length > 0 ? questionAnswers : undefined,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "수정 실패");
        }
      } else {
        // 신규 등록
        const res = await fetch("/api/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seminarId,
            type: "attendee",
            content: content.trim(),
            rating,
            authorId,
            authorName: verifiedAttendee.name,
            studentId: verifiedAttendee.studentId || undefined,
            questionAnswers: Object.keys(questionAnswers).length > 0 ? questionAnswers : undefined,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "등록 실패");
        }
      }

      setSubmittedReview({ content: content.trim(), rating, questionAnswers });
      setStep("done");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "후기 등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!seminar) {
    return <div className="py-16 text-center text-muted-foreground">세미나를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="py-16">
      <div className="mx-auto max-w-md px-4">
        <Link
          href={`/seminars/${seminarId}`}
          className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
          세미나로 돌아가기
        </Link>

        {/* 헤더 */}
        <div className="mb-6 text-center">
          <Image src="/yonsei-emblem.svg" alt="" width={40} height={40} className="mx-auto mb-3" />
          <h1 className="text-xl font-bold">세미나 후기 작성</h1>
          <p className="mt-1 text-sm text-muted-foreground">{seminar.title}</p>
          <p className="text-xs text-muted-foreground">{seminar.date}</p>
        </div>

        {/* 단계 표시 */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {(["verify", "write", "done"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                step === s ? "bg-primary text-white" :
                (["verify", "write", "done"].indexOf(step) > i) ? "bg-green-500 text-white" :
                "bg-muted text-muted-foreground",
              )}>
                {["verify", "write", "done"].indexOf(step) > i ? "✓" : i + 1}
              </div>
              {i < 2 && <div className="h-px w-8 bg-muted" />}
            </div>
          ))}
        </div>

        {/* Step 1: 참석자 인증 */}
        {step === "verify" && (
          <div className="space-y-4 rounded-xl border bg-card p-6">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck size={18} className="text-primary" />
              참석자 인증
            </div>
            <p className="text-xs text-muted-foreground">
              세미나 참석자만 후기를 작성할 수 있습니다. 이름과 학번을 입력해주세요.
            </p>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">이름 *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="홍길동"
                  onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">학번 *</label>
                <Input
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="2025431009"
                  onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                />
              </div>
            </div>

            {verifyError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                <AlertCircle size={16} className="shrink-0" />
                {verifyError}
              </div>
            )}

            <Button onClick={handleVerify} disabled={verifying || !name.trim() || !studentId.trim()} className="w-full">
              {verifying ? <><Loader2 size={14} className="mr-1 animate-spin" />인증 중...</> : "참석자 인증"}
            </Button>

            <p className="text-center text-[11px] text-muted-foreground">
              학번을 입력하시면 더 정확한 인증이 가능합니다.
            </p>
          </div>
        )}

        {/* Step 2: 후기 작성 */}
        {step === "write" && verifiedAttendee && (
          <div className="space-y-4 rounded-xl border bg-card p-6">
            <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              <CheckCircle size={16} className="shrink-0" />
              <span><strong>{verifiedAttendee.name}</strong>님 인증 완료{editMode ? " — 후기 수정 모드" : ""}</span>
            </div>

            {/* 별점 */}
            <div>
              <label className="mb-1 block text-sm font-medium">만족도</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button key={v} type="button" onClick={() => setRating(v)} className="p-1.5 sm:p-0.5">
                    <Star
                      size={28}
                      className={cn("transition-colors", v <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* 커스텀 질문 */}
            {reviewQuestions.map((q, i) => (
              <div key={i}>
                <label className="mb-1 block text-sm font-medium">{q}</label>
                <textarea
                  value={questionAnswers[q] ?? ""}
                  onChange={(e) => setQuestionAnswers((prev) => ({ ...prev, [q]: e.target.value }))}
                  placeholder="답변을 입력해주세요."
                  rows={3}
                  className="w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            ))}

            {/* 내용 */}
            <div>
              <label className="mb-1 block text-sm font-medium">후기 내용 *</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="세미나에 대한 소감을 자유롭게 작성해주세요."
                rows={5}
                className="w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>

            <Button onClick={handleSubmit} disabled={submitting || !content.trim()} className="w-full">
              {submitting ? <><Loader2 size={14} className="mr-1 animate-spin" />{editMode ? "수정 중..." : "등록 중..."}</> : editMode ? "후기 수정" : "후기 등록"}
            </Button>
          </div>
        )}

        {/* Step 3: 완료 + 작성한 후기 표시 */}
        {step === "done" && submittedReview && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-6 text-center">
              <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
              <h2 className="text-xl font-bold">{editMode ? "후기가 수정되었습니다!" : "후기가 등록되었습니다!"}</h2>
              <p className="mt-2 text-sm text-muted-foreground">소중한 의견 감사합니다.</p>
            </div>

            {/* 작성한 후기 미리보기 */}
            <div className="rounded-xl border bg-muted/10 p-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">내가 작성한 후기</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{verifiedAttendee?.name}</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <Star key={v} size={14} className={v <= submittedReview.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"} />
                  ))}
                </div>
              </div>
              {submittedReview.questionAnswers && Object.entries(submittedReview.questionAnswers).map(([q, a]) => (
                a && (
                  <div key={q} className="mt-2">
                    <p className="text-xs font-medium text-muted-foreground">{q}</p>
                    <p className="mt-0.5 text-sm">{a}</p>
                  </div>
                )
              ))}
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{submittedReview.content}</p>
            </div>

            <Link href={`/seminars/${seminarId}`}>
              <Button variant="outline" className="w-full">세미나 페이지로 돌아가기</Button>
            </Link>
          </div>
        )}

        {/* 가입 권장 팝업 */}
        <Dialog open={showSignupDialog} onOpenChange={setShowSignupDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>회원 가입을 권장합니다</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                연세교육공학회 회원으로 가입하시면 세미나 자료, 후기 관리, 수료증 발급 등 다양한 혜택을 받으실 수 있습니다.
              </p>
              <div className="rounded-lg bg-primary/5 p-3 text-sm">
                <p><strong>{name}</strong>님 ({studentId})</p>
                <p className="mt-1 text-xs text-muted-foreground">비회원 상태입니다.</p>
              </div>
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={handleContinueAsGuest} className="w-full sm:w-auto">
                비회원으로 작성하기
              </Button>
              <Button onClick={handleGoToSignup} className="w-full gap-1 sm:w-auto">
                <UserPlus size={14} />
                회원 가입하기
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 기존 후기 팝업 */}
        <Dialog open={showExistingDialog} onOpenChange={setShowExistingDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>이미 작성한 후기가 있습니다</DialogTitle>
            </DialogHeader>
            {existingReview && (
              <div className="space-y-3">
                <div className="rounded-lg border bg-muted/10 p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{verifiedAttendee?.name}</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((v) => (
                        <Star key={v} size={14} className={v <= (existingReview.rating ?? 5) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"} />
                      ))}
                    </div>
                  </div>
                  {existingReview.questionAnswers && Object.entries(existingReview.questionAnswers).map(([q, a]) => (
                    a && (
                      <div key={q} className="mt-2">
                        <p className="text-xs font-medium text-muted-foreground">{q}</p>
                        <p className="mt-0.5 text-sm">{a}</p>
                      </div>
                    )
                  ))}
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{existingReview.content}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    작성일: {new Date(existingReview.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })}
                  </p>
                </div>
              </div>
            )}
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => setShowExistingDialog(false)} className="w-full sm:w-auto">
                닫기
              </Button>
              <Button onClick={handleStartEdit} className="w-full gap-1 sm:w-auto">
                <Pencil size={14} />
                후기 수정하기
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ReviewForm seminarId={id} />;
}
