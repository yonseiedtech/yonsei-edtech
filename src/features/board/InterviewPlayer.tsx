"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  X,
  ImagePlus,
  Send,
  ChevronLeft,
  Loader2,
  Volume2,
  VolumeX,
  Save,
} from "lucide-react";
import { uploadImageSmart } from "@/lib/storage";
import type {
  InterviewAnswer,
  InterviewMeta,
  InterviewQuestion,
  InterviewResponse,
  Post,
} from "@/types";
import { useAuthStore } from "@/features/auth/auth-store";
import { useSaveInterviewResponse } from "./interview-store";
import InterviewCertificate from "./InterviewCertificate";

/**
 * 배경음악: 로컬 public/ 에 파일이 없을 수 있으므로,
 * 사용자가 BGM on 했을 때만 audio element를 mount한다.
 * 저작권 이슈 최소화를 위해 무료/예시 URL 사용. 교체 가능.
 */
const BGM_URL = "https://www.chosic.com/wp-content/uploads/2021/02/Lukrembo-biscuit.mp3";

interface Props {
  post: Post;
  existing: InterviewResponse | null;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function InterviewPlayer({ post, existing, onClose, onSubmitted }: Props) {
  const { user } = useAuthStore();
  const meta = post.interview as InterviewMeta;
  const questions = useMemo(
    () => [...meta.questions].sort((a, b) => a.order - b.order),
    [meta.questions]
  );
  const saveMutation = useSaveInterviewResponse();

  // index -1 = intro screen, questions.length = done/certificate screen
  const [index, setIndex] = useState(0);
  const [typing, setTyping] = useState(true);
  const [answers, setAnswers] = useState<Record<string, InterviewAnswer>>(() => {
    const map: Record<string, InterviewAnswer> = {};
    (existing?.answers ?? []).forEach((a) => { map[a.questionId] = a; });
    return map;
  });
  const [responseId, setResponseId] = useState<string | undefined>(existing?.id);
  const [showCertificate, setShowCertificate] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bgmOn, setBgmOn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // typing indicator animation: 700ms before question reveals
  useEffect(() => {
    setTyping(true);
    const t = setTimeout(() => setTyping(false), 700);
    return () => clearTimeout(t);
  }, [index]);

  // BGM preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("interview_bgm");
    if (saved === "on") setBgmOn(true);
  }, []);
  useEffect(() => {
    localStorage.setItem("interview_bgm", bgmOn ? "on" : "off");
    if (audioRef.current) {
      if (bgmOn) audioRef.current.play().catch(() => {});
      else audioRef.current.pause();
    }
  }, [bgmOn]);

  const currentQ: InterviewQuestion | undefined = questions[index];
  const currentAnswer = currentQ ? answers[currentQ.id] ?? { questionId: currentQ.id } : null;

  function patchAnswer(patch: Partial<InterviewAnswer>) {
    if (!currentQ) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: { ...prev[currentQ.id], ...patch, questionId: currentQ.id },
    }));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length || !currentQ) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files).slice(0, 3)) {
        if (!f.type.startsWith("image/")) continue;
        if (f.size > 5 * 1024 * 1024) {
          toast.error(`${f.name}: 5MB 초과`);
          continue;
        }
        const url = await uploadImageSmart(f, `interview/${post.id}`);
        urls.push(url);
      }
      const existing = currentAnswer?.imageUrls ?? [];
      patchAnswer({ imageUrls: [...existing, ...urls].slice(0, 3) });
      toast.success(`${urls.length}장 업로드됨`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function persist(status: "draft" | "submitted") {
    if (!user) return;
    const payload = {
      id: responseId,
      postId: post.id,
      respondentId: user.id,
      respondentName: user.name,
      respondentRole: user.role,
      answers: Object.values(answers),
      status,
    } as const;
    const saved = await saveMutation.mutateAsync(payload);
    if (!responseId) setResponseId(saved.id);
    return saved;
  }

  function validateCurrent(): string | null {
    if (!currentQ) return null;
    if (!currentQ.required) return null;
    const a = currentAnswer;
    const needText = currentQ.answerType === "text" || currentQ.answerType === "text_and_photo";
    const needPhoto = currentQ.answerType === "photo";
    if (needText && (!a?.text || !a.text.trim())) return "답변을 입력해주세요.";
    if (needPhoto && (!a?.imageUrls || a.imageUrls.length === 0)) return "사진을 첨부해주세요.";
    return null;
  }

  async function handleNext() {
    const err = validateCurrent();
    if (err) { toast.error(err); return; }
    await persist("draft").catch(() => {});
    if (index < questions.length - 1) setIndex(index + 1);
  }

  function handlePrev() {
    if (index > 0) setIndex(index - 1);
  }

  async function handleSubmit() {
    const err = validateCurrent();
    if (err) { toast.error(err); return; }
    try {
      await persist("submitted");
      setShowCertificate(true);
    } catch {
      toast.error("제출에 실패했습니다.");
    }
  }

  async function handleSaveDraft() {
    try {
      await persist("draft");
      toast.success("임시저장되었습니다.");
      onClose();
    } catch {
      toast.error("저장 실패");
    }
  }

  if (showCertificate) {
    return (
      <InterviewCertificate
        post={post}
        respondentName={user?.name ?? "응답자"}
        answerCount={Object.keys(answers).length}
        onClose={() => {
          setShowCertificate(false);
          onSubmitted();
        }}
      />
    );
  }

  const total = questions.length;
  const progress = total === 0 ? 0 : ((index + 1) / total) * 100;
  const isLast = index === total - 1;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-br from-violet-50 via-white to-indigo-50">
      {bgmOn && (
        <audio
          ref={audioRef}
          src={BGM_URL}
          autoPlay
          loop
          onError={() => {
            toast.error("배경음악을 불러올 수 없어요");
            setBgmOn(false);
          }}
        />
      )}

      {/* 헤더 */}
      <header className="flex items-center justify-between border-b bg-white/80 px-4 py-3 backdrop-blur">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted-foreground">{post.authorName} · 온라인 인터뷰</p>
          <p className="truncate text-sm font-bold">{post.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBgmOn((v) => !v)}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted"
            title={bgmOn ? "배경음악 끄기" : "배경음악 켜기"}
          >
            {bgmOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            onClick={handleSaveDraft}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted"
            title="임시저장 후 닫기"
          >
            <Save size={18} />
          </button>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted"
            title="닫기"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* 진행바 */}
      <div className="h-1 w-full bg-muted">
        <motion.div
          className="h-full bg-gradient-to-r from-violet-500 to-indigo-500"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* 대화 영역 */}
      <main className="flex flex-1 flex-col overflow-y-auto px-4 py-6">
        <div className="mx-auto w-full max-w-2xl space-y-4">
          {/* 인터뷰어 소개 버블 (고정) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-bold text-white">
              {post.authorName.slice(0, 1)}
            </div>
            <div className="rounded-2xl rounded-tl-sm border bg-white p-3 text-sm shadow-sm">
              <p className="text-xs font-semibold text-violet-700">
                {post.authorName} · 인터뷰어
              </p>
              <p className="mt-1 whitespace-pre-wrap">{meta.intro || "안녕하세요! 몇 가지 질문을 드릴게요."}</p>
            </div>
          </motion.div>

          {/* 질문 & 답변 흐름 */}
          <AnimatePresence mode="wait">
            {currentQ && (
              <motion.div
                key={currentQ.id}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.28 }}
                className="space-y-3"
              >
                {typing ? (
                  <div className="flex gap-3">
                    <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600" />
                    <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border bg-white px-4 py-3 shadow-sm">
                      <motion.span
                        className="h-2 w-2 rounded-full bg-violet-400"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                      />
                      <motion.span
                        className="h-2 w-2 rounded-full bg-violet-400"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                      />
                      <motion.span
                        className="h-2 w-2 rounded-full bg-violet-400"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-bold text-white">
                      {post.authorName.slice(0, 1)}
                    </div>
                    <div className="rounded-2xl rounded-tl-sm border bg-white p-4 shadow-sm">
                      <p className="text-xs text-muted-foreground">
                        Q{index + 1} / {total}
                      </p>
                      <p className="mt-1 text-base font-semibold">{currentQ.prompt}</p>
                      {currentQ.maxChars ? (
                        <p className="mt-1 text-xs text-muted-foreground">최대 {currentQ.maxChars}자 가이드</p>
                      ) : null}
                    </div>
                  </div>
                )}

                {!typing && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="ml-12 space-y-2"
                  >
                    {(currentQ.answerType === "text" || currentQ.answerType === "text_and_photo") && (
                      <div>
                        <Textarea
                          value={currentAnswer?.text ?? ""}
                          onChange={(e) => patchAnswer({ text: e.target.value })}
                          placeholder="여기에 답변을 입력하세요..."
                          rows={4}
                          className="bg-white"
                        />
                        {currentQ.maxChars && (
                          <p className="mt-1 text-right text-xs text-muted-foreground">
                            {(currentAnswer?.text ?? "").length} / {currentQ.maxChars}
                          </p>
                        )}
                      </div>
                    )}

                    {(currentQ.answerType === "photo" || currentQ.answerType === "text_and_photo") && (
                      <div>
                        <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border bg-white px-3 py-1.5 text-sm hover:bg-muted">
                          {uploading ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <ImagePlus size={14} />
                          )}
                          사진 첨부 (최대 3장)
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleImageUpload}
                            disabled={uploading}
                          />
                        </label>
                        {(currentAnswer?.imageUrls?.length ?? 0) > 0 && (
                          <div className="mt-2 flex gap-2">
                            {currentAnswer!.imageUrls!.map((url, i) => (
                              <div key={url} className="relative">
                                <img src={url} alt="" className="h-20 w-20 rounded-lg border object-cover" />
                                <button
                                  type="button"
                                  onClick={() =>
                                    patchAnswer({
                                      imageUrls: currentAnswer!.imageUrls!.filter((_, j) => j !== i),
                                    })
                                  }
                                  className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-white"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* 하단 컨트롤 */}
      <footer className="border-t bg-white/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2">
          <Button type="button" variant="outline" onClick={handlePrev} disabled={index === 0}>
            <ChevronLeft size={16} className="mr-1" />
            이전
          </Button>
          <span className="text-xs text-muted-foreground">
            {index + 1} / {total}
          </span>
          {isLast ? (
            <Button type="button" onClick={handleSubmit} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <Loader2 size={16} className="mr-1 animate-spin" />
              ) : (
                <Send size={16} className="mr-1" />
              )}
              제출하기
            </Button>
          ) : (
            <Button type="button" onClick={handleNext} disabled={saveMutation.isPending}>
              다음
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
