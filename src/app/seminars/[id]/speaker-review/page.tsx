"use client";

import { use, useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useSeminar } from "@/features/seminar/useSeminar";
import { albumsApi, photosApi } from "@/lib/bkend";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, CheckCircle, Loader2, AlertCircle, Pencil, Mic, Download, ImageIcon, Camera, ChevronLeft, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Photo } from "@/types";

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

/* ── 감사장 ── */

function inferSemester(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  return `${year}년 ${month >= 3 && month <= 8 ? "1" : "2"}학기`;
}

function formatCertDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, "0")}월 ${String(d.getDate()).padStart(2, "0")}일`;
}

const CERT_FONT = "'Nanum Myeongjo', 'Batang', serif";
const ACCENT = "#003378";

function AppreciationCertificate({
  speakerName,
  seminarTitle,
  seminarDate,
  certNo,
}: {
  speakerName: string;
  seminarTitle: string;
  seminarDate: string;
  certNo?: string;
}) {
  const semester = inferSemester(seminarDate);
  const formattedDate = formatCertDate(seminarDate);
  const bodyText = `귀하께서는 ${semester} 연세교육공학회에서 구성원들의 교육공학 핵심 역량강화를 위하여 주관한 연세교육공학 학술대회 <${seminarTitle}>에서 귀하께서가 지신 지식과 경험을 헌신적이고 열정적으로 공유해주심으로서 구성원들의 성장에 큰 도움을 주셨음에 감사드리며, 연세교육공학회 구성원들의 마음을 담아 감사장을 드립니다.`;

  return (
    <div
      className="relative bg-card"
      style={{ width: "210mm", height: "297mm", fontFamily: CERT_FONT, overflow: "hidden" }}
    >
      {/* 이중 프레임 */}
      <div style={{ position: "absolute", inset: "10mm", border: `2.5px solid ${ACCENT}`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: "13mm", border: `0.8px solid ${ACCENT}`, opacity: 0.35, pointerEvents: "none" }} />

      {/* 네 모서리 장식 */}
      {[
        { top: "10mm", left: "10mm", bt: true, bl: true },
        { top: "10mm", right: "10mm", bt: true, br: true },
        { bottom: "10mm", left: "10mm", bb: true, bl: true },
        { bottom: "10mm", right: "10mm", bb: true, br: true },
      ].map((pos, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: pos.top, bottom: pos.bottom, left: pos.left, right: pos.right,
            width: "20px", height: "20px",
            borderTop: pos.bt ? `3px solid ${ACCENT}` : "none",
            borderBottom: pos.bb ? `3px solid ${ACCENT}` : "none",
            borderLeft: pos.bl ? `3px solid ${ACCENT}` : "none",
            borderRight: pos.br ? `3px solid ${ACCENT}` : "none",
            pointerEvents: "none",
          }}
        />
      ))}

      {/* 본문 영역 */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "22mm 36mm 18mm" }}>
        {/* 호수 */}
        <div style={{ alignSelf: "flex-start", marginBottom: "20mm" }}>
          <span style={{ fontSize: "11pt", fontWeight: 700, color: "#666", letterSpacing: "0.08em" }}>
            제 {certNo || "—"} 호
          </span>
        </div>

        {/* 제목 */}
        <h1 style={{ fontSize: "42pt", fontWeight: 800, letterSpacing: "0.3em", color: ACCENT, marginBottom: "5mm", textAlign: "center" }}>
          감사장
        </h1>

        {/* 장식선 */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18mm" }}>
          <div style={{ width: "40px", height: "1px", background: ACCENT, opacity: 0.4 }} />
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: ACCENT, opacity: 0.3 }} />
          <div style={{ width: "40px", height: "1px", background: ACCENT, opacity: 0.4 }} />
        </div>

        {/* 수여자 이름 */}
        <div style={{ marginBottom: "14mm", textAlign: "right", width: "100%" }}>
          <span style={{ fontSize: "26pt", fontWeight: 800, letterSpacing: "0.25em", color: "#111" }}>
            {speakerName}
          </span>
          <span style={{ fontSize: "13pt", marginLeft: "6px", fontWeight: 600, color: "#444" }}>
            선생님
          </span>
        </div>

        {/* 워터마크 */}
        <div style={{ position: "absolute", top: "40%", left: "50%", transform: "translateX(-50%)", opacity: 0.06, width: "300px", height: "300px", pointerEvents: "none" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/cert-emblem.png" alt="" style={{ width: "100%", height: "100%" }} crossOrigin="anonymous" />
        </div>

        {/* 본문 */}
        <div style={{ position: "relative", fontSize: "12.5pt", lineHeight: "2.5", textAlign: "justify", width: "100%", maxWidth: "460px", margin: "0 auto", wordBreak: "keep-all", color: "#222", fontWeight: 700 }}>
          <p style={{ textIndent: "1em", whiteSpace: "pre-wrap" }}>{bodyText}</p>
        </div>

        {/* 날짜 */}
        <p style={{ fontSize: "13pt", fontWeight: 700, marginTop: "22mm", letterSpacing: "0.15em", textAlign: "center", color: "#222" }}>
          {formattedDate}
        </p>

        {/* 하단 서명 영역 */}
        <div style={{ marginTop: "18mm", width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: "50px", height: "1.5px", background: ACCENT, opacity: 0.25, marginBottom: "14mm" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "7px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/cert-emblem.png" alt="연세대학교" style={{ width: "48px", height: "48px" }} crossOrigin="anonymous" />
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "26px", fontWeight: 800, color: ACCENT, fontFamily: CERT_FONT, letterSpacing: "0.2em", lineHeight: 1.2, margin: 0 }}>
                연세교육공학회
              </p>
              <p style={{ fontSize: "8px", color: "#999", fontFamily: CERT_FONT, letterSpacing: "0.08em", margin: "2px 0 0" }}>
                Yonsei Educational Technology Association
              </p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/cert-seal.jpeg" alt="직인" style={{ width: "52px", height: "52px" }} crossOrigin="anonymous" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SpeakerReviewForm({ seminarId }: { seminarId: string }) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const seminar = useSeminar(seminarId);
  const certPrintRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<Step>("verifying");
  const [speakerName, setSpeakerName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submittedReview, setSubmittedReview] = useState<SubmittedReview | null>(null);
  const [downloading, setDownloading] = useState(false);

  // 기존 후기
  const [existingReview, setExistingReview] = useState<ExistingReview | null>(null);
  const [editMode, setEditMode] = useState(false);

  // 후기 작성
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [recommendedTopics, setRecommendedTopics] = useState("");
  const [recommendedSpeakers, setRecommendedSpeakers] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 감사장 호수
  const [certNo, setCertNo] = useState("");

  // 세미나 포토갤러리
  const [seminarPhotos, setSeminarPhotos] = useState<Photo[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const reviewQuestions = seminar?.reviewQuestions?.speaker ?? [];

  // Google Fonts 로드
  useEffect(() => {
    const linkId = "nanum-myeongjo-font";
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  // 감사장 호수 조회
  useEffect(() => {
    if (!seminarId) return;
    async function fetchCertNo() {
      try {
        const res = await fetch(`/api/reviews/cert-no?seminarId=${seminarId}&speakerName=${encodeURIComponent(speakerName)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.certNo) setCertNo(data.certNo);
        }
      } catch { /* ignore */ }
    }
    if (speakerName && step === "done") fetchCertNo();
  }, [seminarId, speakerName, step]);

  // 세미나 포토갤러리 조회
  useEffect(() => {
    if (!seminarId || step !== "done") return;
    async function fetchPhotos() {
      try {
        const albumRes = await albumsApi.listBySeminarId(seminarId);
        const albums = albumRes.data as unknown as { id: string }[];
        if (albums.length > 0) {
          const photoRes = await photosApi.list(albums[0].id);
          setSeminarPhotos((photoRes.data as unknown as Photo[]) ?? []);
        }
      } catch { /* ignore */ }
    }
    fetchPhotos();
  }, [seminarId, step]);

  // 감사장 이미지 다운로드
  const handleDownloadImage = useCallback(async () => {
    if (!certPrintRef.current) return;
    setDownloading(true);
    try {
      await document.fonts.ready;
      const html2canvas = (await import("html2canvas-pro")).default;
      const canvas = await html2canvas(certPrintRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = `감사장_${speakerName}_${seminar?.title || "세미나"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("감사장 이미지가 다운로드되었습니다.");
    } catch {
      toast.error("이미지 다운로드에 실패했습니다.");
    } finally {
      setDownloading(false);
    }
  }, [speakerName, seminar?.title]);

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
          setSubmittedReview({
            content: data.existingReview.content,
            rating: data.existingReview.rating ?? 5,
            questionAnswers: data.existingReview.questionAnswers ?? {},
            recommendedTopics: data.existingReview.recommendedTopics ?? "",
            recommendedSpeakers: data.existingReview.recommendedSpeakers ?? "",
          });
          setStep("done");
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
    setStep("write");
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

  const handleDownloadPdf = useCallback(async () => {
    if (!certPrintRef.current) return;
    setDownloading(true);

    try {
      // 폰트 로딩 대기
      await document.fonts.ready;

      const html2canvas = (await import("html2canvas-pro")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(certPrintRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: certPrintRef.current.scrollWidth,
        height: certPrintRef.current.scrollHeight,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      pdf.addImage(imgData, "PNG", 0, 0, 210, 297);
      pdf.save(`감사장_${speakerName}_${seminar?.title || "세미나"}.pdf`);

      toast.success("감사장 PDF가 다운로드되었습니다.");
    } catch (err) {
      console.error("[pdf download]", err);
      toast.error("PDF 다운로드에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setDownloading(false);
    }
  }, [speakerName, seminar?.title]);

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
          <div className="rounded-2xl border bg-card p-6 text-center">
            <Loader2 size={32} className="mx-auto mb-4 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">연사 인증 중...</p>
          </div>
        )}

        {/* 에러 */}
        {step === "error" && (
          <div className="rounded-2xl border bg-card p-6 text-center">
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
          <div className="space-y-4 rounded-2xl border bg-card p-6">
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
                    <Star size={28} className={cn("transition-colors", v <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
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

            {/* 추천 섹션 */}
            <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/50 p-4 space-y-3">
              <div>
                <p className="text-sm font-medium text-amber-800 mb-1">추천 정보 (운영진 전용)</p>
                <p className="text-xs text-amber-600">아래 내용은 운영진과 관리자만 확인할 수 있습니다.</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">추천 세미나 주제</label>
                <textarea
                  value={recommendedTopics}
                  onChange={(e) => setRecommendedTopics(e.target.value)}
                  placeholder="다음 세미나에서 다루면 좋을 주제가 있다면 적어주세요."
                  rows={3}
                  className="w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">추천 연사</label>
                <textarea
                  value={recommendedSpeakers}
                  onChange={(e) => setRecommendedSpeakers(e.target.value)}
                  placeholder="추천하시는 연사가 있다면 이름과 소속을 적어주세요."
                  rows={3}
                  className="w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            </div>

            <Button onClick={handleSubmit} disabled={submitting || !content.trim()} className="w-full">
              {submitting ? <><Loader2 size={14} className="mr-1 animate-spin" />{editMode ? "수정 중..." : "등록 중..."}</> : editMode ? "후기 수정" : "후기 등록"}
            </Button>
          </div>
        )}

        {/* 완료: 후기 + 감사장 + 갤러리 */}
        {step === "done" && submittedReview && seminar && (
          <div className="space-y-6">
            <div className="rounded-2xl border bg-card p-6 text-center">
              <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
              <h2 className="text-xl font-bold">
                {existingReview && !editMode ? "후기가 등록되어 있습니다" : editMode ? "후기가 수정되었습니다!" : "후기가 등록되었습니다!"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">소중한 의견 감사합니다.</p>
            </div>

            {/* 작성한 후기 미리보기 */}
            <div className="rounded-2xl border bg-muted/10 p-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">작성된 후기</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{speakerName}</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <Star key={v} size={14} className={v <= submittedReview.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"} />
                  ))}
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{submittedReview.content}</p>
              <div className="mt-3 text-center">
                <Button variant="outline" size="sm" onClick={handleStartEdit} className="gap-1">
                  <Pencil size={12} />
                  후기 수정하기
                </Button>
              </div>
            </div>

            {/* 감사장 섹션 — 반짝이는 테두리 */}
            <div className="rounded-2xl border bg-card p-6">
              <h3 className="mb-4 text-center text-sm font-semibold">연세교육공학회 감사장</h3>

              {/* 반짝이 애니메이션 CSS */}
              <style>{`
                @keyframes shimmer-border {
                  0% { background-position: -200% center; }
                  100% { background-position: 200% center; }
                }
                .cert-sparkle-wrapper {
                  position: relative;
                  padding: 4px;
                  border-radius: 12px;
                  background: linear-gradient(
                    90deg,
                    #003378 0%,
                    #003378 30%,
                    #c9a84c 40%,
                    #ffd700 50%,
                    #c9a84c 60%,
                    #003378 70%,
                    #003378 100%
                  );
                  background-size: 200% 100%;
                  animation: shimmer-border 3s ease-in-out infinite;
                  box-shadow: 0 0 20px rgba(201,168,76,0.3), 0 0 40px rgba(0,51,120,0.15);
                }
                .cert-sparkle-wrapper::before {
                  content: '';
                  position: absolute;
                  inset: 0;
                  border-radius: 12px;
                  background: linear-gradient(
                    90deg,
                    transparent 0%,
                    rgba(255,215,0,0.4) 45%,
                    rgba(255,255,255,0.6) 50%,
                    rgba(255,215,0,0.4) 55%,
                    transparent 100%
                  );
                  background-size: 200% 100%;
                  animation: shimmer-border 3s ease-in-out infinite;
                  pointer-events: none;
                }
                .cert-sparkle-inner {
                  border-radius: 8px;
                  overflow: hidden;
                  background: white;
                }
              `}</style>

              <div
                className="cert-sparkle-wrapper mx-auto"
                style={{ width: "100%", maxWidth: "368px" }}
              >
                <div
                  className="cert-sparkle-inner"
                  style={{ aspectRatio: "210/297" }}
                >
                  <div style={{ transform: "scale(0.45)", transformOrigin: "top left", width: "210mm", height: "297mm" }}>
                    <AppreciationCertificate
                      speakerName={speakerName}
                      seminarTitle={seminar.title}
                      seminarDate={seminar.date}
                      certNo={certNo}
                    />
                  </div>
                </div>
              </div>

              {/* PDF 렌더링용 (화면에 보이지 않음) */}
              <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
                <div ref={certPrintRef}>
                  <AppreciationCertificate
                    speakerName={speakerName}
                    seminarTitle={seminar.title}
                    seminarDate={seminar.date}
                    certNo={certNo}
                  />
                </div>
              </div>

              {/* 다운로드 버튼 */}
              <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                <Button onClick={handleDownloadPdf} disabled={downloading} className="gap-2">
                  {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  {downloading ? "생성 중..." : "PDF 다운로드"}
                </Button>
                <Button variant="outline" onClick={handleDownloadImage} disabled={downloading} className="gap-2">
                  <ImageIcon size={14} />
                  이미지 다운로드
                </Button>
              </div>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                감사장을 PDF 또는 이미지 파일로 다운로드할 수 있습니다.
              </p>
            </div>

            {/* 포토갤러리 — 연세교육공학과 함께한 순간 */}
            {seminarPhotos.length > 0 && (
              <div className="rounded-2xl border bg-card p-6">
                <div className="mb-4 text-center">
                  <div className="mx-auto mb-2 flex items-center justify-center gap-2">
                    <Camera size={18} className="text-primary" />
                    <h3 className="text-base font-bold text-primary">연세교육공학과 함께한 순간</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">{seminar.title}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {seminarPhotos.map((photo, idx) => (
                    <button
                      key={photo.id}
                      onClick={() => setLightboxIndex(idx)}
                      className="group relative aspect-square overflow-hidden rounded-lg border bg-muted/20 transition-transform hover:scale-[1.02]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt={photo.caption || `세미나 사진 ${idx + 1}`}
                        className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
                      />
                      <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="px-2 pb-2 text-[10px] text-white">{photo.caption || ""}</span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-3 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => {
                      seminarPhotos.forEach((photo, i) => {
                        const a = document.createElement("a");
                        a.href = photo.url;
                        a.download = `세미나_사진_${i + 1}.jpg`;
                        a.click();
                      });
                      toast.success(`${seminarPhotos.length}장 다운로드 시작`);
                    }}
                  >
                    <Download size={12} />
                    사진 전체 다운로드 ({seminarPhotos.length}장)
                  </Button>
                </div>
              </div>
            )}

            {/* 라이트박스 */}
            {lightboxIndex !== null && seminarPhotos[lightboxIndex] && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
                onClick={() => setLightboxIndex(null)}
              >
                <button
                  className="absolute right-4 top-4 rounded-full bg-card/20 p-2 text-white hover:bg-card/30"
                  onClick={() => setLightboxIndex(null)}
                >
                  <X size={20} />
                </button>
                {lightboxIndex > 0 && (
                  <button
                    className="absolute left-4 rounded-full bg-card/20 p-2 text-white hover:bg-card/30"
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
                  >
                    <ChevronLeft size={24} />
                  </button>
                )}
                {lightboxIndex < seminarPhotos.length - 1 && (
                  <button
                    className="absolute right-4 rounded-full bg-card/20 p-2 text-white hover:bg-card/30"
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
                  >
                    <ChevronRight size={24} />
                  </button>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={seminarPhotos[lightboxIndex].url}
                  alt=""
                  className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="absolute bottom-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      const a = document.createElement("a");
                      a.href = seminarPhotos[lightboxIndex!].url;
                      a.download = `세미나_사진_${lightboxIndex! + 1}.jpg`;
                      a.click();
                    }}
                  >
                    <Download size={12} />다운로드
                  </Button>
                </div>
              </div>
            )}

            <Link href={`/seminars/${seminarId}`}>
              <Button variant="outline" className="w-full">세미나 페이지로 돌아가기</Button>
            </Link>
          </div>
        )}
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
