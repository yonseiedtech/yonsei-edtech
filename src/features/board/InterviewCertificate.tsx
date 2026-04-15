"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Copy, Download, X, Check } from "lucide-react";
import { toast } from "sonner";
import type { Post } from "@/types";

interface Props {
  post: Post;
  respondentName: string;
  answerCount: number;
  onClose: () => void;
}

export default function InterviewCertificate({ post, respondentName, answerCount, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const now = new Date();
  const dateStr = now.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  async function copyLink() {
    const url = typeof window !== "undefined"
      ? `${window.location.origin}/board/${post.id}`
      : "";
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("링크가 복사되었어요");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("복사 실패");
    }
  }

  async function downloadImage() {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const mod = await import("html-to-image");
      const dataUrl = await mod.toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = `yonsei-interview-${post.id}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("이미지가 저장되었어요");
    } catch (err) {
      console.error(err);
      toast.error("이미지 저장에 실패했어요. 스크린샷으로 남겨주세요!");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 p-4">
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white backdrop-blur hover:bg-white/20"
        aria-label="닫기"
      >
        <X size={20} />
      </button>

      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 24 }}
        className="w-full max-w-md"
      >
        <div
          ref={cardRef}
          className="relative aspect-square w-full overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-700 to-blue-800 shadow-2xl"
        >
          {/* 장식 그라디언트 블롭 */}
          <div className="absolute -left-12 -top-12 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 -right-8 h-72 w-72 rounded-full bg-blue-300/20 blur-3xl" />

          {/* 콘텐츠 */}
          <div className="relative flex h-full flex-col items-center justify-between p-8 text-white">
            <div className="flex flex-col items-center">
              <div className="rounded-xl bg-white/90 px-4 py-2 text-sm font-bold text-violet-700 shadow">
                YONSEI · 교육공학과
              </div>
              <p className="mt-3 text-xs uppercase tracking-[0.3em] opacity-80">
                Online Interview
              </p>
            </div>

            <div className="text-center">
              <p className="text-xs opacity-70">참여 완료</p>
              <h2 className="mt-2 text-2xl font-bold leading-tight">
                &ldquo;{post.title}&rdquo;
              </h2>
              <p className="mt-4 text-sm opacity-80">질문 {answerCount}개에 답변했어요</p>
            </div>

            <div className="w-full">
              <div className="rounded-2xl bg-white/10 px-4 py-3 text-center backdrop-blur">
                <p className="text-xs opacity-70">응답자</p>
                <p className="mt-0.5 text-lg font-bold">{respondentName}</p>
                <p className="mt-1 text-[11px] opacity-70">{dateStr}</p>
              </div>
              <p className="mt-3 text-center text-[10px] opacity-70">
                연세교육공학회 · yonsei-edtech.vercel.app
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            onClick={copyLink}
            className="flex-1 bg-white/90 text-foreground hover:bg-white"
          >
            {copied ? <Check size={16} className="mr-1" /> : <Copy size={16} className="mr-1" />}
            {copied ? "복사됨" : "링크 복사"}
          </Button>
          <Button
            onClick={downloadImage}
            disabled={downloading}
            className="flex-1"
          >
            <Download size={16} className="mr-1" />
            {downloading ? "저장 중..." : "이미지 저장"}
          </Button>
        </div>

        <p className="mt-3 text-center text-xs text-white/80">
          인증샷으로 인스타·카카오에 공유해주세요 🎉
        </p>
      </motion.div>
    </div>
  );
}
