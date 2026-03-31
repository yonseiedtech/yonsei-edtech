"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useSeminar } from "@/features/seminar/useSeminar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, Star, CheckCircle, Loader2, AlertCircle, Pencil, Mic } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Step = "verifying" | "write" | "done" | "error";

interface ExistingReview {
  id: string;
  content: string;
  rating: number;
  questionAnswers?: Record<string, string> | null;
  recommendedTopics?: string | null;
  recommendedSpeakers?: string | null;
  createdAt: string;
}

interface SubmittedReview {
  content: string;
  rating: number;
  questionAnswers?: Record<string, string>;
  recommendedTopics?: string;
  recommendedSpeakers?: string;
}

function SpeakerReviewForm({ seminarId }: { seminarId: string }) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const seminar = useSeminar(seminarId);

  const [step, setStep] = useState<Step>("verifying");
  const [speakerName, setSpeakerName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submittedReview, setSubmittedReview] = useState<SubmittedReview | null>(null);

  // 기존 후기
  const [existingReview, setExistingReview] = useState<ExistingReview | null>(null);
  const [showExistingDialog, setShowExistingDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // 후기 작성
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [recommendedTopics, setRecommendedTopics] = useState("");
  const [recommendedSpeakers, setRecommendedSpeakers] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reviewQuestions = seminar?.reviewQuestions?.speaker ?? [];

  // 토큰 검증
  useEffect(() => {
    if (!token || !seminarId) {
      setErrorMsg("유효하지 않은 연사 후기 링크입니다.");
      setStep("error");
      return;
    }

    async function verify() {
      try {
        const params = new URLSearchParams({ seminarId, token: token! });
        const res = await fetch(`/api/reviews?${params}`);
        const data = await res.json();

        if (!data.verified) {
          setErrorMsg(data.message || "유효하지 않은 링크입니다.");
          setStep("error");
          return;
        }

        setSpeakerName(data.speakerName || "연사");

        if (data.alreadyReviewed && data.existingReview) {
          setExistingReview(data.existingReview);
          setShowExistingDialog(true);
          setStep("write");
        } else {
          setStep("write");
        }
      } catch {
        setErrorMsg("인증 중 오류가 발생했습니다.");
        setStep("error");
      }
    }

    verify();
  }, [token, seminarId]);

  function handleStartEdit() {
    if (!existingReview) return;
    setRating(existingReview.rating ?? 5);
    setContent(existingReview.content);
    setQuestionAnswers(existingReview.questionAnswers ?? {});
    setRecommendedTopics(existingReview.recommendedTopics ?? "");
    setRecommendedSpeakers(existingReview.recommendedSpeakers ?? "");
    setEditMode(true);
    setShowExistingDialog(false);
  }

  async function handleSubmit() {
    if (!content.trim()) { toast.error("후기 내용을 입력하세요."); return; }

    setSubmitting(true);
    try {
      if (editMode && existingReview) {
        const res = await fetch("/api/reviews", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reviewId: existingReview.id,
            content: content.trim(),
            rating,
            authorId: `speaker_${seminarId}`,
            questionAnswers: Object.keys(questionAnswers).length > 0 ? questionAnswers : undefined,
            recommendedTopics: recommendedTopics.trim() || undefined,
            recommendedSpeakers: recommendedSpeakers.trim() || undefined,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "수정 실패");
        }
      } else {
        const res = await fetch("/api/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seminarId,
            type: "speaker",
            content: content.trim(),
            rating,
            authorId: `speaker_${seminarId}`,
            authorName: speakerName,
            speakerToken: token,
            questionAnswers: Object.keys(questionAnswers).length > 0 ? questionAnswers : undefined,
            recommendedTopics: recommendedTopics.trim() || undefined,
            recommendedSpeakers: recommendedSpeakers.trim() || undefined,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "등록 실패");
        }
      }

      setSubmittedReview({
        content: content.trim(),
        rating,
        questionAnswers,
        recommendedTopics: recommendedTopics.trim(),
        recommendedSpeakers: recommendedSpeakers.trim(),
      });
      setStep("done");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "후기 등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!seminar && step !== "error") {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <Loader2 size={24} className="mx-auto mb-2 animate-spin" />
        세미나 정보를 불러오는 중...
      </div>
    );
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
          <div className="mb-2 flex items-center justify-center gap-2">
            <Mic size={20} className="text-primary" />
            <h1 className="text-xl font-bold">연사 후기 작성</h1>
          </div>
          {seminar && (
            <>
              <p className="mt-1 text-sm text-muted-foreground">{seminar.title}</p>
              <p className="text-xs text-muted-foreground">{seminar.date}</p>
            </>
          )}
        </div>

        {/* 토큰 검증 중 */}
        {step === "verifying" && (
          <div className="rounded-xl border bg-white p-6 text-center">
            <Loader2 size={32} className="mx-auto mb-4 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">연사 인증 중...</p>
          </div>
        )}

        {/* 에러 */}
        {step === "error" && (
          <div className="rounded-xl border bg-white p-6 text-center">
            <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
            <h2 className="text-lg font-bold text-red-600">접근 불가</h2>
            <p className="mt-2 text-sm text-muted-foreground">{errorMsg}</p>
            <Link href={`/seminars/${seminarId}`}>
              <Button variant="outline" className="mt-4">세미나 페이지로 돌아가기</Button>
            </Link>
          </div>
        )}

        {/* 후기 작성 */}
        {step === "write" && (
          <div className="space-y-4 rounded-xl border bg-white p-6">
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
              <Mic size={16} className="shrink-0" />
              <span><strong>{speakerName}</strong> 연사님 환영합니다{editMode ? " — 후기 수정 모드" : ""}</span>
            </div>

            {/* 별점 */}
            <div>
              <label className="mb-1 block text-sm font-medium">세미나 만족도</label>
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

            {/* 후기 내용 */}
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

            {/* 추천 섹션 (운영진만 볼 수 있음 안내) */}
            <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/50 p-4 space-y-3">
              <div>
                <p className="text-sm font-medium text-amber-800 mb-1">
                  추천 정보 (운영진 전용)
                </p>
                <p className="text-xs text-amber-600">
                  아래 내용은 운영진과 관리자만 확인할 수 있습니다.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">추천 세미나 주제</label>
                <textarea
                  value={recommendedTopics}
                  onChange={(e) => setRecommendedTopics(e.target.value)}
                  placeholder="다음 세미나에서 다루면 좋을 주제가 있다면 적어주세요."
                  rows={3}
                  className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">추천 연사</label>
                <textarea
                  value={recommendedSpeakers}
                  onChange={(e) => setRecommendedSpeakers(e.target.value)}
                  placeholder="추천하시는 연사가 있다면 이름과 소속을 적어주세요."
                  rows={3}
                  className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            </div>

            <Button onClick={handleSubmit} disabled={submitting || !content.trim()} className="w-full">
              {submitting ? <><Loader2 size={14} className="mr-1 animate-spin" />{editMode ? "수정 중..." : "등록 중..."}</> : editMode ? "후기 수정" : "후기 등록"}
            </Button>
          </div>
        )}

        {/* 완료 */}
        {step === "done" && submittedReview && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-white p-6 text-center">
              <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
              <h2 className="text-xl font-bold">{editMode ? "후기가 수정되었습니다!" : "후기가 등록되었습니다!"}</h2>
              <p className="mt-2 text-sm text-muted-foreground">소중한 의견 감사합니다.</p>
            </div>

            <div className="rounded-xl border bg-muted/10 p-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">내가 작성한 후기</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{speakerName}</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <Star key={v} size={14} className={v <= submittedReview.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"} />
                  ))}
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{submittedReview.content}</p>
            </div>

            <Link href={`/seminars/${seminarId}`}>
              <Button variant="outline" className="w-full">세미나 페이지로 돌아가기</Button>
            </Link>
          </div>
        )}

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
                    <span className="text-sm font-medium">{speakerName}</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((v) => (
                        <Star key={v} size={14} className={v <= (existingReview.rating ?? 5) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"} />
                      ))}
                    </div>
                  </div>
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

export default function SpeakerReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <SpeakerReviewForm seminarId={id} />;
}
