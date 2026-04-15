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

  // -1: intro screen, 0..N-1: questions
  const [index, setIndex] = useState(-1);
  const [answers, setAnswers] = useState<Record<string, InterviewAnswer>>(() => {
    const map: Record<string, InterviewAnswer> = {};
    (existing?.answers ?? []).forEach((a) => { map[a.questionId] = a; });
    return map;
  });
  const [responseId, setResponseId] = useState<string | undefined>(existing?.id);
  const [showCertificate, setShowCertificate] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bgmOn, setBgmOn] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("interview_bgm");
    if (saved === "off") setBgmOn(false);
  }, []);
  useEffect(() => {
    localStorage.setItem("interview_bgm", bgmOn ? "on" : "off");
    const el = audioRef.current;
    if (!el) return;
    if (bgmOn) el.play().catch(() => {});
    else el.pause();
  }, [bgmOn]);

  const currentQ: InterviewQuestion | undefined = index >= 0 ? questions[index] : undefined;
  const currentAnswer = currentQ ? answers[currentQ.id] ?? { questionId: currentQ.id } : null;
  const total = questions.length;
  const progress = index < 0 ? 0 : ((index + 1) / total) * 100;
  const isLast = index === total - 1;

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
      const ex = currentAnswer?.imageUrls ?? [];
      patchAnswer({ imageUrls: [...ex, ...urls].slice(0, 3) });
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

  async function handleStart() {
    setIndex(0);
  }

  async function handleNext() {
    const err = validateCurrent();
    if (err) { toast.error(err); return; }
    await persist("draft").catch(() => {});
    if (index < questions.length - 1) setIndex(index + 1);
  }

  function handlePrev() {
    if (index > 0) setIndex(index - 1);
    else if (index === 0) setIndex(-1);
  }

  async function handleSubmit() {
    const err = validateCurrent();
    if (err) { toast.error(err); return; }
    try {
      await persist("submitted");
      setShowCertificate(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "제출에 실패했습니다.";
      toast.error(msg);
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

  return (
    <div className="fixed inset-0 z-50 flex h-[100dvh] flex-col overflow-hidden bg-gradient-to-br from-violet-100 via-white to-indigo-100">
      <audio
        ref={audioRef}
        src={BGM_URL}
        autoPlay
        loop
        onError={() => setBgmOn(false)}
      />

      {/* 헤더 */}
      <header
        className="flex items-center justify-between gap-2 border-b bg-white/60 px-3 py-2 backdrop-blur sm:px-4 sm:py-3"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] text-muted-foreground sm:text-xs">{post.authorName} · 온라인 인터뷰</p>
          <p className="truncate text-xs font-bold sm:text-sm">{post.title}</p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <button
            onClick={() => setBgmOn((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            title={bgmOn ? "배경음악 끄기" : "배경음악 켜기"}
          >
            {bgmOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          {index >= 0 && (
            <button
              onClick={handleSaveDraft}
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
              title="임시저장 후 닫기"
            >
              <Save size={18} />
            </button>
          )}
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
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

      {/* 전체화면 질문 영역 */}
      <main className="flex flex-1 items-center justify-center overflow-y-auto px-4 py-6 sm:px-6 sm:py-10">
        <AnimatePresence mode="wait">
          {index < 0 ? (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="mx-auto w-full max-w-2xl text-center"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-2xl font-bold text-white">
                {post.authorName.slice(0, 1)}
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-violet-700">
                {post.authorName} · 인터뷰어
              </p>
              <h2 className="mt-2 text-2xl font-bold leading-snug sm:text-4xl">{post.title}</h2>
              <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80 sm:mt-6 sm:text-base">
                {meta.intro || "안녕하세요! 몇 가지 질문을 드릴게요."}
              </p>
              <p className="mt-6 text-sm text-muted-foreground">총 {total}개의 질문</p>
              <Button onClick={handleStart} size="lg" className="mt-8">
                시작하기
              </Button>
            </motion.div>
          ) : currentQ ? (
            <motion.div
              key={currentQ.id}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.32, ease: "easeOut" }}
              className="mx-auto w-full max-w-2xl"
            >
              <p className="text-center text-xs font-semibold uppercase tracking-wider text-violet-600">
                Q{index + 1} / {total}
              </p>
              <motion.h2
                key={`${currentQ.id}-prompt`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.35 }}
                className="mt-3 text-center text-xl font-bold leading-snug sm:text-3xl"
              >
                {currentQ.prompt}
              </motion.h2>
              {currentQ.maxChars ? (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  최대 {currentQ.maxChars}자 가이드
                </p>
              ) : null}

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.35 }}
                className="mt-8 space-y-4"
              >
                {(currentQ.answerType === "text" || currentQ.answerType === "text_and_photo") && (
                  <div>
                    <Textarea
                      value={currentAnswer?.text ?? ""}
                      onChange={(e) => patchAnswer({ text: e.target.value })}
                      placeholder="여기에 답변을 입력하세요..."
                      rows={5}
                      className="bg-white text-base"
                      style={{ fontSize: "16px" }}
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
                      <div className="mt-3 flex gap-2">
                        {currentAnswer!.imageUrls!.map((url, i) => (
                          <div key={url} className="relative">
                            <img src={url} alt="" className="h-24 w-24 rounded-lg border object-cover" />
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
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      {/* 하단 컨트롤 */}
      {index >= 0 && (
        <footer
          className="border-t bg-white/70 px-3 py-2 backdrop-blur sm:px-4 sm:py-3"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handlePrev} className="min-w-[72px]">
              <ChevronLeft size={16} className="mr-1" />
              이전
            </Button>
            <span className="text-xs text-muted-foreground">
              {index + 1} / {total}
            </span>
            {isLast ? (
              <Button type="button" size="sm" onClick={handleSubmit} disabled={saveMutation.isPending} className="min-w-[88px]">
                {saveMutation.isPending ? (
                  <Loader2 size={16} className="mr-1 animate-spin" />
                ) : (
                  <Send size={16} className="mr-1" />
                )}
                제출
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={handleNext} disabled={saveMutation.isPending} className="min-w-[72px]">
                다음
              </Button>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}
