"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Plus,
  Minus,
  Target,
} from "lucide-react";
import { uploadImageSmart } from "@/lib/storage";
import {
  CUSTOM_OPTION_ID,
  type InterviewAnswer,
  type InterviewMeta,
  type InterviewQuestion,
  type InterviewResponse,
  type Post,
} from "@/types";
import { useAuthStore } from "@/features/auth/auth-store";
import { matchesInterviewTarget, describeInterviewTarget } from "@/lib/interview-target";
import { useSaveInterviewResponse, useInterviewResponses } from "./interview-store";
import InterviewCertificate from "./InterviewCertificate";

const FILL_BLANK_PATTERN = /\(\s+\)|_{3,}/;

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function renderFillBlankInline(
  q: InterviewQuestion,
  answer: InterviewAnswer | null,
  patch: (p: Partial<InterviewAnswer>) => void
) {
  const parts = q.prompt.split(FILL_BLANK_PATTERN);
  const value = answer?.text ?? "";
  return (
    <span className="inline-flex flex-wrap items-baseline justify-center gap-1">
      {parts.map((p, i) => (
        <span key={i} className="inline-flex items-baseline gap-1">
          <span>{p}</span>
          {i < parts.length - 1 && (
            <input
              type="text"
              value={value}
              onChange={(e) => patch({ text: e.target.value })}
              placeholder="답변"
              className="inline-block min-w-[80px] max-w-[240px] border-b-2 border-[#003876] bg-transparent px-2 text-center text-[#003876] outline-none placeholder:text-[#003876]/30 focus:border-[#1a5fa0]"
              style={{ fontSize: "inherit", fontWeight: "inherit" }}
            />
          )}
        </span>
      ))}
    </span>
  );
}

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
  // Sprint 67-AE: 인터뷰 대상자 필터 매칭 — 비대상자는 응답 불가
  const canRespond = matchesInterviewTarget(user, meta.targetCriteria);
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
  const isEditingSubmitted = existing?.status === "submitted";
  const accumulatedTotalMs = useRef<number>(existing?.totalElapsedMs ?? 0);
  const [showCertificate, setShowCertificate] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bgmOn, setBgmOn] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 첫 참여자 메시지용
  const { responses } = useInterviewResponses(post.id);
  const submittedCount = useMemo(
    () => (responses ?? []).filter((r) => r.status === "submitted").length,
    [responses]
  );
  const isFirstParticipant = submittedCount === 0 && !existing;

  // 진행 중 타이머 HUD
  const sessionStartedAt = useRef<number | null>(null);
  const questionStartedAt = useRef<number | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (index < 0) return;
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, [index]);
  useEffect(() => {
    if (index >= 0) questionStartedAt.current = Date.now();
  }, [index]);
  const now = Date.now();
  const sessionElapsed = sessionStartedAt.current ? now - sessionStartedAt.current : 0;
  const questionElapsed = questionStartedAt.current ? now - questionStartedAt.current : 0;
  void tick; // ensure re-render every second

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

  /** 현재 질문에 머문 시간을 answers에 누적하고 questionStartedAt을 초기화. 갱신된 answers 반환. */
  function commitQuestionElapsed(): Record<string, InterviewAnswer> {
    if (!currentQ || !questionStartedAt.current) return answers;
    const delta = Date.now() - questionStartedAt.current;
    questionStartedAt.current = Date.now();
    const prev = answers[currentQ.id] ?? { questionId: currentQ.id };
    const next: InterviewAnswer = {
      ...prev,
      questionId: currentQ.id,
      elapsedMs: (prev.elapsedMs ?? 0) + delta,
    };
    const merged = { ...answers, [currentQ.id]: next };
    setAnswers(merged);
    return merged;
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

  async function persist(
    status: "draft" | "submitted",
    answersMap: Record<string, InterviewAnswer> = answers,
  ) {
    if (!user || !user.id) {
      // 로그인하지 않은 상태로 저장 시도 — silent fail 시 사용자가 "제출 완료"로 오인하므로 명시적으로 차단.
      throw new Error("로그인 후 응답을 저장할 수 있습니다.");
    }
    const totalElapsedMs = Object.values(answersMap).reduce(
      (sum, a) => sum + (a.elapsedMs ?? 0),
      0,
    );
    const payload = {
      id: responseId,
      postId: post.id,
      respondentId: user.id,
      respondentName: user.name,
      respondentRole: user.role,
      answers: Object.values(answersMap),
      status,
      totalElapsedMs,
    } as const;
    const saved = await saveMutation.mutateAsync(payload);
    if (!responseId) setResponseId(saved.id);
    accumulatedTotalMs.current = totalElapsedMs;
    return saved;
  }

  function validateAnswer(
    q: typeof questions[number],
    a: InterviewAnswer | undefined,
  ): string | null {
    if (!q.required) return null;
    const needText = q.answerType === "text" || q.answerType === "text_and_photo";
    const needPhoto = q.answerType === "photo";
    const needChoice = q.answerType === "single_choice" || q.answerType === "ox";
    if (needText && (!a?.text || !a.text.trim())) return "답변을 입력해주세요.";
    if (needPhoto && (!a?.imageUrls || a.imageUrls.length === 0)) return "사진을 첨부해주세요.";
    if (needChoice) {
      if (!a?.selectedOptionId) return "선택지를 골라주세요.";
      if (a.selectedOptionId === CUSTOM_OPTION_ID && !(a.customOptionText ?? "").trim()) {
        return "직접 입력한 선지를 적어주세요.";
      }
    }
    if (q.answerType === "multi_choice") {
      const ids = a?.selectedOptionIds ?? [];
      const min = q.minCount ?? 1;
      if (ids.length < min) return `최소 ${min}개 이상 선택해주세요.`;
      if (ids.includes(CUSTOM_OPTION_ID) && !(a?.customOptionText ?? "").trim()) {
        return "직접 입력한 선지를 적어주세요.";
      }
    }
    if (q.answerType === "multi_text") {
      const items = (a?.texts ?? []).map((t) => t.trim()).filter(Boolean);
      const min = q.minCount ?? 1;
      if (items.length < min) return `최소 ${min}개 이상 입력해주세요.`;
    }
    if (q.answerType === "fill_blank") {
      if (!a?.text || !a.text.trim()) return "빈칸을 채워주세요.";
    }
    return null;
  }

  /** 모든 필수 질문 검증 → 미완료 첫 인덱스 반환, 모두 OK면 -1 */
  function findFirstUnansweredRequired(answersMap: Record<string, InterviewAnswer> = answers): {
    index: number;
    error: string;
  } | null {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const err = validateAnswer(q, answersMap[q.id]);
      if (err) return { index: i, error: err };
    }
    return null;
  }

  async function handleStart() {
    sessionStartedAt.current = Date.now();
    questionStartedAt.current = Date.now();
    setIndex(0);
  }

  async function handleNext() {
    // 미응답 허용 — 검증은 최종 제출 시에만 수행
    const merged = commitQuestionElapsed();
    if (!isEditingSubmitted) {
      await persist("draft", merged).catch(() => {});
    }
    if (index < questions.length - 1) setIndex(index + 1);
  }

  function handlePrev() {
    commitQuestionElapsed();
    if (index > 0) setIndex(index - 1);
    else if (index === 0) setIndex(-1);
  }

  async function handleSubmit() {
    const merged = commitQuestionElapsed();
    const missing = findFirstUnansweredRequired(merged);
    if (missing) {
      const targetQ = questions[missing.index];
      toast.error(`Q${targetQ.order} ${missing.error}`);
      if (index !== missing.index) setIndex(missing.index);
      return;
    }
    try {
      await persist("submitted", merged);
      setShowCertificate(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "제출에 실패했습니다.";
      toast.error(msg);
    }
  }

  async function handleSaveDraft() {
    if (isEditingSubmitted) {
      onClose();
      return;
    }
    const merged = commitQuestionElapsed();
    try {
      await persist("draft", merged);
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
    <div className="fixed inset-0 z-50 flex h-[100dvh] flex-col overflow-hidden bg-gradient-to-br from-blue-50 via-white to-slate-100">
      <audio
        ref={audioRef}
        src={BGM_URL}
        autoPlay
        loop
        onError={() => setBgmOn(false)}
      />

      {/* 헤더 */}
      <header
        className="flex items-center justify-between gap-2 border-b bg-card/60 px-3 py-2 backdrop-blur sm:px-4 sm:py-3"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <img
          src="/yonsei-emblem.svg"
          alt="연세대학교"
          className="h-7 w-7 shrink-0 sm:h-8 sm:w-8"
        />
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
          className="h-full bg-gradient-to-r from-[#003876] to-[#1a5fa0]"
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
              <div className="mx-auto flex flex-col items-center gap-2">
                <img
                  src="/yonsei-emblem.svg"
                  alt="연세대학교"
                  className="h-12 w-12 opacity-90"
                />
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#003876]/70">
                  YONSEI UNIV. Educational Technology
                </p>
              </div>
              <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-[#003876]">
                {post.authorName} · 인터뷰어
              </p>
              <h2 className="mt-2 text-2xl font-bold leading-snug sm:text-4xl">{post.title}</h2>
              <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80 sm:mt-6 sm:text-base">
                {meta.intro || "안녕하세요! 몇 가지 질문을 드릴게요."}
              </p>
              {/* Sprint 67-AE/AF: 인터뷰 대상 표시 (모든 회원에게 노출) */}
              {meta.targetCriteria && (
                <div className="mx-auto mt-4 inline-flex max-w-md items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50/60 px-3 py-1 text-[11px] text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
                  <Target size={11} />
                  <span>대상: {describeInterviewTarget(meta.targetCriteria)}</span>
                </div>
              )}
              <p className="mt-6 text-sm text-muted-foreground">총 {total}개의 질문</p>
              {/* Sprint 67-AE: 인터뷰 대상자 필터 — 비매칭 시 응답 불가 안내 */}
              {!canRespond ? (
                <div className="mx-auto mt-8 max-w-md rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                  <p className="font-semibold">이 인터뷰는 특정 대상에게만 열려 있습니다</p>
                  <p className="mt-1 text-xs">
                    대상: {describeInterviewTarget(meta.targetCriteria)}
                  </p>
                  <p className="mt-2 text-[11px] text-amber-800/80 dark:text-amber-200/80">
                    응답 권한이 필요한 경우 운영진에게 문의하세요.
                  </p>
                </div>
              ) : (
                <Button onClick={handleStart} size="lg" className="mt-8">
                  시작하기
                </Button>
              )}
              {isFirstParticipant && (
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-4 text-sm font-medium text-[#003876]"
                >
                  첫번째 참여자이세요! 잘 부탁드립니다💗
                </motion.p>
              )}
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
              <p className="text-center text-xs font-semibold uppercase tracking-wider text-[#003876]">
                Q{index + 1} / {total}
              </p>
              <p className="mt-1 text-center font-mono text-[11px] text-muted-foreground sm:text-xs">
                질문 {formatElapsed(questionElapsed)} · 누적 {formatElapsed(sessionElapsed)} · {index + 1}/{total} ({Math.round(progress)}%)
              </p>
              <motion.h2
                key={`${currentQ.id}-prompt`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.35 }}
                className="mt-3 text-center text-xl font-bold leading-snug sm:text-3xl"
              >
                {currentQ.answerType === "fill_blank" && FILL_BLANK_PATTERN.test(currentQ.prompt)
                  ? renderFillBlankInline(currentQ, currentAnswer, patchAnswer)
                  : currentQ.prompt}
              </motion.h2>
              {currentQ.description && (
                <p className="mt-3 whitespace-pre-wrap rounded-lg bg-muted/40 p-3 text-center text-sm text-muted-foreground">
                  {currentQ.description}
                </p>
              )}
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
                      className="bg-card text-base"
                      style={{ fontSize: "16px" }}
                    />
                    {currentQ.maxChars && (
                      <p className="mt-1 text-right text-xs text-muted-foreground">
                        {(currentAnswer?.text ?? "").length} / {currentQ.maxChars}
                      </p>
                    )}
                  </div>
                )}

                {currentQ.answerType === "single_choice" && (
                  <div className="space-y-2">
                    {(currentQ.options ?? []).map((opt) => {
                      const selected = currentAnswer?.selectedOptionId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => patchAnswer({ selectedOptionId: opt.id, text: undefined })}
                          className={`block w-full rounded-2xl border-2 px-4 py-3 text-left text-base transition-all ${
                            selected
                              ? "border-[#003876] bg-[#003876]/5 font-semibold text-[#003876] shadow-sm"
                              : "border-muted bg-card hover:border-[#003876]/40 hover:bg-blue-50/40"
                          }`}
                        >
                          <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full border-2 align-middle" style={{ borderColor: selected ? "#003876" : "#cbd5e1" }}>
                            {selected && <span className="h-2.5 w-2.5 rounded-full bg-[#003876]" />}
                          </span>
                          {opt.label || <span className="text-muted-foreground">(선택지 미입력)</span>}
                        </button>
                      );
                    })}
                    {currentQ.allowCustomOption && (
                      <div
                        className={`rounded-2xl border-2 px-4 py-3 transition-all ${
                          currentAnswer?.selectedOptionId === CUSTOM_OPTION_ID
                            ? "border-[#003876] bg-[#003876]/5 shadow-sm"
                            : "border-dashed border-muted bg-card hover:border-[#003876]/40"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            patchAnswer({ selectedOptionId: CUSTOM_OPTION_ID, text: undefined })
                          }
                          className="flex w-full items-center gap-2 text-left text-base"
                        >
                          <span
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full border-2 align-middle"
                            style={{
                              borderColor:
                                currentAnswer?.selectedOptionId === CUSTOM_OPTION_ID
                                  ? "#003876"
                                  : "#cbd5e1",
                            }}
                          >
                            {currentAnswer?.selectedOptionId === CUSTOM_OPTION_ID && (
                              <span className="h-2.5 w-2.5 rounded-full bg-[#003876]" />
                            )}
                          </span>
                          <span className="font-semibold text-[#003876]">+ 직접 입력</span>
                        </button>
                        {currentAnswer?.selectedOptionId === CUSTOM_OPTION_ID && (
                          <Input
                            value={currentAnswer?.customOptionText ?? ""}
                            onChange={(e) => patchAnswer({ customOptionText: e.target.value })}
                            placeholder="직접 입력할 선지를 적어주세요"
                            className="mt-2 bg-card"
                            style={{ fontSize: "16px" }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}

                {currentQ.answerType === "multi_choice" && (() => {
                  const min = currentQ.minCount ?? 1;
                  const totalOptions = (currentQ.options?.length ?? 0) + (currentQ.allowCustomOption ? 1 : 0);
                  const max = currentQ.maxCount ?? (totalOptions > 0 ? totalOptions : 99);
                  const selectedIds = currentAnswer?.selectedOptionIds ?? [];
                  const toggle = (id: string) => {
                    const isOn = selectedIds.includes(id);
                    if (isOn) {
                      patchAnswer({
                        selectedOptionIds: selectedIds.filter((x) => x !== id),
                        ...(id === CUSTOM_OPTION_ID ? { customOptionText: undefined } : {}),
                      });
                      return;
                    }
                    if (selectedIds.length >= max) {
                      toast.error(`최대 ${max}개까지 선택 가능합니다.`);
                      return;
                    }
                    patchAnswer({ selectedOptionIds: [...selectedIds, id] });
                  };
                  return (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        {min === max ? `${min}개 선택` : `${min}~${max}개 선택 가능`} · 현재 {selectedIds.length}개 선택
                      </p>
                      {(currentQ.options ?? []).map((opt) => {
                        const selected = selectedIds.includes(opt.id);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => toggle(opt.id)}
                            className={`block w-full rounded-2xl border-2 px-4 py-3 text-left text-base transition-all ${
                              selected
                                ? "border-[#003876] bg-[#003876]/5 font-semibold text-[#003876] shadow-sm"
                                : "border-muted bg-card hover:border-[#003876]/40 hover:bg-blue-50/40"
                            }`}
                          >
                            <span
                              className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-md border-2 align-middle"
                              style={{
                                borderColor: selected ? "#003876" : "#cbd5e1",
                                backgroundColor: selected ? "#003876" : "transparent",
                              }}
                            >
                              {selected && <span className="text-[12px] font-bold leading-none text-white">✓</span>}
                            </span>
                            {opt.label || <span className="text-muted-foreground">(선택지 미입력)</span>}
                          </button>
                        );
                      })}
                      {currentQ.allowCustomOption && (() => {
                        const selected = selectedIds.includes(CUSTOM_OPTION_ID);
                        return (
                          <div
                            className={`rounded-2xl border-2 px-4 py-3 transition-all ${
                              selected
                                ? "border-[#003876] bg-[#003876]/5 shadow-sm"
                                : "border-dashed border-muted bg-card hover:border-[#003876]/40"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => toggle(CUSTOM_OPTION_ID)}
                              className="flex w-full items-center gap-2 text-left text-base"
                            >
                              <span
                                className="inline-flex h-5 w-5 items-center justify-center rounded-md border-2 align-middle"
                                style={{
                                  borderColor: selected ? "#003876" : "#cbd5e1",
                                  backgroundColor: selected ? "#003876" : "transparent",
                                }}
                              >
                                {selected && <span className="text-[12px] font-bold leading-none text-white">✓</span>}
                              </span>
                              <span className="font-semibold text-[#003876]">+ 직접 입력</span>
                            </button>
                            {selected && (
                              <Input
                                value={currentAnswer?.customOptionText ?? ""}
                                onChange={(e) => patchAnswer({ customOptionText: e.target.value })}
                                placeholder="직접 입력할 선지를 적어주세요"
                                className="mt-2 bg-card"
                                style={{ fontSize: "16px" }}
                              />
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}

                {currentQ.answerType === "multi_text" && (() => {
                  const min = currentQ.minCount ?? 1;
                  const max = currentQ.maxCount ?? 10;
                  const items = currentAnswer?.texts ?? Array.from({ length: min }, () => "");
                  if ((currentAnswer?.texts ?? []).length === 0) {
                    // initialize lazily so user sees min inputs
                  }
                  const updateItem = (i: number, v: string) => {
                    const next = [...items];
                    next[i] = v;
                    patchAnswer({ texts: next });
                  };
                  const addItem = () => {
                    if (items.length >= max) return;
                    patchAnswer({ texts: [...items, ""] });
                  };
                  const removeItem = (i: number) => {
                    if (items.length <= 1) return;
                    patchAnswer({ texts: items.filter((_, j) => j !== i) });
                  };
                  return (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        {min === max ? `${min}개 입력` : `${min}~${max}개 입력 가능`}
                      </p>
                      {items.map((v, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="w-6 shrink-0 text-center text-xs text-muted-foreground">
                            {i + 1}.
                          </span>
                          <Input
                            value={v}
                            onChange={(e) => updateItem(i, e.target.value)}
                            placeholder={`항목 ${i + 1}`}
                            className="bg-card"
                            style={{ fontSize: "16px" }}
                          />
                          <button
                            type="button"
                            onClick={() => removeItem(i)}
                            disabled={items.length <= 1}
                            className="rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                            title="항목 삭제"
                          >
                            <Minus size={16} />
                          </button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={addItem}
                        disabled={items.length >= max}
                        className="w-full"
                      >
                        <Plus size={14} className="mr-1" />
                        항목 추가 ({items.length}/{max})
                      </Button>
                    </div>
                  );
                })()}

                {currentQ.answerType === "fill_blank" && !FILL_BLANK_PATTERN.test(currentQ.prompt) && (
                  <Input
                    value={currentAnswer?.text ?? ""}
                    onChange={(e) => patchAnswer({ text: e.target.value })}
                    placeholder="답변을 입력하세요"
                    className="bg-card"
                    style={{ fontSize: "16px" }}
                  />
                )}

                {currentQ.answerType === "ox" && (
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {(["O", "X"] as const).map((v) => {
                      const selected = currentAnswer?.selectedOptionId === v;
                      const isO = v === "O";
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => patchAnswer({ selectedOptionId: v, text: undefined })}
                          className={`flex aspect-square items-center justify-center rounded-2xl border-4 text-6xl font-bold transition-all sm:text-7xl ${
                            selected
                              ? isO
                                ? "border-emerald-500 bg-emerald-50 text-emerald-600 shadow-lg"
                                : "border-rose-500 bg-rose-50 text-rose-600 shadow-lg"
                              : "border-muted bg-card text-muted-foreground hover:border-[#003876]/40 hover:bg-blue-50/40"
                          }`}
                        >
                          {isO ? "⭕" : "❌"}
                        </button>
                      );
                    })}
                  </div>
                )}

                {(currentQ.answerType === "photo" || currentQ.answerType === "text_and_photo") && (
                  <div>
                    <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border bg-card px-3 py-1.5 text-sm hover:bg-muted">
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
          className="border-t bg-card/70 px-3 py-2 backdrop-blur sm:px-4 sm:py-3"
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
