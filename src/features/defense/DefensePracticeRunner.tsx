"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, ChevronLeft, ChevronRight, X, RotateCcw,
  CheckCircle2, AlertCircle, Loader2, Pencil, Eye, EyeOff,
} from "lucide-react";
import { defensePracticesApi } from "@/lib/bkend";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DEFENSE_CATEGORY_LABELS,
  type DefensePracticeAttempt,
} from "@/types";

// ─── Web Speech API 타입 (브라우저 표준 미적용) ───
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
interface WindowWithSpeech extends Window {
  SpeechRecognition?: new () => SpeechRecognitionInstance;
  webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
}

function getRecognitionCtor(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as WindowWithSpeech;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// ─── 한글 친화 토큰화 + Jaccard 유사도 ───
function tokenize(text: string): Set<string> {
  const cleaned = text
    .toLowerCase()
    .replace(/[^가-힣a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return new Set();
  const tokens = new Set<string>();
  for (const word of cleaned.split(" ")) {
    if (word.length === 0) continue;
    if (/^[a-z0-9]+$/.test(word)) {
      tokens.add(word);
      continue;
    }
    // 한글: 2-gram (자수 ≥ 2일 때) + 자체 단어
    if (word.length >= 2) {
      for (let i = 0; i < word.length - 1; i++) {
        tokens.add(word.slice(i, i + 2));
      }
    }
    tokens.add(word);
  }
  return tokens;
}

function similarityScore(transcript: string, expected: string): number {
  const a = tokenize(transcript);
  const b = tokenize(expected);
  if (a.size === 0 && b.size === 0) return 0;
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const tok of a) if (b.has(tok)) inter++;
  const union = a.size + b.size - inter;
  return Math.round((inter / union) * 100);
}

export default function DefensePracticeRunner({ id }: { id: string }) {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: practiceSet, isLoading } = useQuery({
    queryKey: ["defense_practice_set", id],
    queryFn: () => defensePracticesApi.get(id),
  });

  const [step, setStep] = useState<"intro" | "question" | "summary">("intro");
  const [idx, setIdx] = useState(0);
  const [transcripts, setTranscripts] = useState<Record<string, string>>({});
  const [interim, setInterim] = useState("");
  const [recording, setRecording] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sttSupported, setSttSupported] = useState<boolean | null>(null);
  const [editingTranscript, setEditingTranscript] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const durationsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    setSttSupported(getRecognitionCtor() !== null);
    return () => {
      try {
        recRef.current?.abort();
      } catch {/* noop */}
    };
  }, []);

  const questions = practiceSet?.questions ?? [];
  const current = questions[idx];

  const stopRecording = () => {
    setRecording(false);
    try { recRef.current?.stop(); } catch {/* noop */}
    if (startedAtRef.current && current) {
      const sec = Math.round((Date.now() - startedAtRef.current) / 1000);
      durationsRef.current[current.id] =
        (durationsRef.current[current.id] ?? 0) + sec;
      startedAtRef.current = null;
    }
  };

  const startRecording = () => {
    const Ctor = getRecognitionCtor();
    if (!Ctor || !current) {
      toast.error("이 브라우저는 음성 인식을 지원하지 않습니다. 텍스트로 답변을 입력하세요.");
      return;
    }
    try {
      const rec = new Ctor();
      rec.lang = "ko-KR";
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (e) => {
        let finalText = "";
        let interimText = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finalText += r[0].transcript + " ";
          else interimText += r[0].transcript;
        }
        if (finalText) {
          setTranscripts((t) => ({
            ...t,
            [current.id]: ((t[current.id] ?? "") + " " + finalText).trim(),
          }));
        }
        setInterim(interimText);
      };
      rec.onerror = (e) => {
        if (e.error === "no-speech") return;
        if (e.error === "not-allowed") {
          toast.error("마이크 권한이 차단되었습니다. 브라우저 설정에서 허용해주세요.");
        } else {
          toast.error(`음성 인식 오류: ${e.error}`);
        }
        setRecording(false);
      };
      rec.onend = () => {
        setRecording(false);
        setInterim("");
        if (startedAtRef.current && current) {
          const sec = Math.round((Date.now() - startedAtRef.current) / 1000);
          durationsRef.current[current.id] =
            (durationsRef.current[current.id] ?? 0) + sec;
          startedAtRef.current = null;
        }
      };
      recRef.current = rec;
      startedAtRef.current = Date.now();
      rec.start();
      setRecording(true);
      setInterim("");
    } catch (err) {
      console.error(err);
      toast.error("음성 인식 시작에 실패했습니다.");
    }
  };

  const goPrev = () => {
    stopRecording();
    setShowAnswer(false);
    setEditingTranscript(false);
    setIdx((i) => Math.max(0, i - 1));
  };
  const goNext = () => {
    stopRecording();
    setShowAnswer(false);
    setEditingTranscript(false);
    if (idx < questions.length - 1) {
      setIdx((i) => i + 1);
    } else {
      setStep("summary");
    }
  };

  // 채점
  const results = useMemo(() => {
    if (!practiceSet) return [];
    return practiceSet.questions.map((q) => {
      const transcript = transcripts[q.id] ?? "";
      const score = similarityScore(transcript, q.expectedAnswer);
      const durationSec = durationsRef.current[q.id];
      return { questionId: q.id, transcript, score, durationSec };
    });
  }, [practiceSet, transcripts]);

  const averageScore = results.length
    ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
    : 0;

  const handleSaveAttempt = async () => {
    if (!practiceSet) return;
    setSubmitting(true);
    try {
      const attempt: DefensePracticeAttempt = {
        at: new Date().toISOString(),
        averageScore,
        results,
      };
      await defensePracticesApi.update(practiceSet.id, {
        lastAttempt: attempt,
        attemptCount: (practiceSet.attemptCount ?? 0) + 1,
        updatedAt: attempt.at,
      });
      qc.invalidateQueries({ queryKey: ["defense_practice_sets"] });
      qc.invalidateQueries({ queryKey: ["defense_practice_set", id] });
      toast.success("연습 결과가 저장되었습니다.");
    } catch (e) {
      console.error(e);
      toast.error("결과 저장에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    stopRecording();
    router.push("/console/grad-life/thesis-defense");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={32} />
      </div>
    );
  }
  if (!practiceSet) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center text-sm text-muted-foreground">
        세트를 찾을 수 없습니다.
      </div>
    );
  }
  if (questions.length === 0) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-4 text-center">
        <AlertCircle size={32} className="text-amber-500" />
        <p className="text-sm text-muted-foreground">등록된 질문이 없습니다.</p>
        <Button onClick={handleClose}>목록으로</Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{practiceSet.title}</p>
          <p className="text-xs text-muted-foreground">
            {DEFENSE_CATEGORY_LABELS[practiceSet.category]}
            {step === "question" && ` · ${idx + 1} / ${questions.length}`}
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={handleClose}>
          <X size={16} />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {step === "intro" && (
          <div className="mx-auto flex min-h-full max-w-2xl flex-col items-center justify-center gap-6 px-4 py-10 text-center">
            <h1 className="text-2xl font-bold sm:text-3xl">{practiceSet.title}</h1>
            {practiceSet.topic && (
              <p className="text-sm text-muted-foreground">주제: {practiceSet.topic}</p>
            )}
            <div className="flex flex-wrap justify-center gap-2 text-xs">
              <Badge variant="secondary">{DEFENSE_CATEGORY_LABELS[practiceSet.category]}</Badge>
              <Badge variant="outline">{questions.length}문항</Badge>
              {sttSupported === false && (
                <Badge className="bg-amber-500 text-white">음성 인식 미지원</Badge>
              )}
            </div>
            <div className="rounded-lg border bg-muted/30 p-4 text-left text-sm text-muted-foreground">
              <p className="mb-2 font-semibold text-foreground">진행 방법</p>
              <ul className="space-y-1 list-disc pl-5">
                <li>질문이 한 문제씩 노출됩니다.</li>
                <li>마이크 버튼을 눌러 답변을 음성으로 입력하면 자동 전사됩니다.</li>
                <li>음성 인식이 어렵다면 텍스트로 직접 답변할 수도 있습니다.</li>
                <li>모범 답변과 비교해 키워드 일치도(0~100점)로 채점됩니다.</li>
              </ul>
            </div>
            <Button size="lg" onClick={() => setStep("question")}>
              연습 시작
            </Button>
          </div>
        )}

        {step === "question" && current && (
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
              className="mx-auto flex min-h-full max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6"
            >
              <div className="rounded-xl border bg-card p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Q{idx + 1}
                </p>
                <h2 className="mt-2 text-xl font-bold leading-relaxed sm:text-2xl">
                  {current.question}
                </h2>
                {current.note && (
                  <p className="mt-3 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                    💡 {current.note}
                  </p>
                )}
              </div>

              {/* Transcript area */}
              <div className="rounded-xl border bg-card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">내 답변</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingTranscript((v) => !v)}
                  >
                    <Pencil size={12} className="mr-1" />
                    {editingTranscript ? "완료" : "직접 수정"}
                  </Button>
                </div>
                {editingTranscript ? (
                  <Textarea
                    value={transcripts[current.id] ?? ""}
                    onChange={(e) =>
                      setTranscripts((t) => ({ ...t, [current.id]: e.target.value }))
                    }
                    placeholder="STT 대신 직접 입력 가능합니다."
                    rows={6}
                    className="text-base"
                  />
                ) : (
                  <div className="min-h-[120px] whitespace-pre-wrap rounded-md bg-muted/30 p-3 text-sm leading-relaxed">
                    {transcripts[current.id] || (
                      <span className="italic text-muted-foreground">
                        아직 답변이 없습니다. 마이크 버튼을 눌러 시작하세요.
                      </span>
                    )}
                    {interim && (
                      <span className="text-muted-foreground"> {interim}</span>
                    )}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {sttSupported !== false ? (
                    recording ? (
                      <Button
                        size="lg"
                        variant="destructive"
                        onClick={stopRecording}
                        className="flex-1 sm:flex-none"
                      >
                        <MicOff size={16} className="mr-2" /> 녹음 중지
                      </Button>
                    ) : (
                      <Button
                        size="lg"
                        onClick={startRecording}
                        className="flex-1 sm:flex-none"
                      >
                        <Mic size={16} className="mr-2" /> 녹음 시작
                      </Button>
                    )
                  ) : (
                    <p className="text-xs text-amber-600">
                      이 브라우저는 음성 인식을 지원하지 않습니다. 직접 입력해주세요.
                    </p>
                  )}
                  {transcripts[current.id] && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setTranscripts((t) => ({ ...t, [current.id]: "" }));
                        durationsRef.current[current.id] = 0;
                      }}
                    >
                      <RotateCcw size={12} className="mr-1" /> 답변 비우기
                    </Button>
                  )}
                </div>
              </div>

              {/* Expected answer toggle */}
              <div className="rounded-xl border bg-card p-4">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowAnswer((v) => !v)}
                  className="w-full justify-start"
                >
                  {showAnswer ? <EyeOff size={13} className="mr-1" /> : <Eye size={13} className="mr-1" />}
                  {showAnswer ? "모범 답변 숨기기" : "모범 답변 보기"}
                </Button>
                {showAnswer && (
                  <div className="mt-3 whitespace-pre-wrap rounded-md bg-emerald-50 p-3 text-sm leading-relaxed text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
                    {current.expectedAnswer || <span className="italic">모범 답변 미작성</span>}
                  </div>
                )}
                {transcripts[current.id] && current.expectedAnswer && (
                  <p className="mt-2 text-right text-xs text-muted-foreground">
                    현재 유사도{" "}
                    <span className="font-bold text-foreground">
                      {similarityScore(transcripts[current.id], current.expectedAnswer)}점
                    </span>
                  </p>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {step === "summary" && (
          <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold">연습 완료</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                전체 평균 유사도
              </p>
              <div
                className={cn(
                  "mt-2 inline-flex items-baseline gap-1 rounded-full px-4 py-1.5 text-3xl font-bold text-white",
                  averageScore >= 80
                    ? "bg-emerald-600"
                    : averageScore >= 60
                    ? "bg-amber-500"
                    : "bg-rose-500",
                )}
              >
                {averageScore}<span className="text-base font-normal">점</span>
              </div>
            </div>

            <ol className="space-y-3">
              {questions.map((q, i) => {
                const r = results.find((x) => x.questionId === q.id);
                const score = r?.score ?? 0;
                return (
                  <li key={q.id} className="rounded-xl border bg-card p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">Q{i + 1}</span>
                      <Badge
                        className={cn(
                          "text-white",
                          score >= 80
                            ? "bg-emerald-600"
                            : score >= 60
                            ? "bg-amber-500"
                            : "bg-rose-500",
                        )}
                      >
                        {score}점
                      </Badge>
                      {r?.durationSec ? (
                        <span className="text-xs text-muted-foreground">
                          {r.durationSec}초 답변
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm font-medium">{q.question}</p>
                    <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                      <div className="rounded-md bg-muted/40 p-2">
                        <p className="mb-1 font-semibold">내 답변</p>
                        <p className="whitespace-pre-wrap text-muted-foreground">
                          {r?.transcript || <span className="italic">미응답</span>}
                        </p>
                      </div>
                      <div className="rounded-md bg-emerald-50 p-2 dark:bg-emerald-950/40">
                        <p className="mb-1 font-semibold text-emerald-900 dark:text-emerald-100">모범 답변</p>
                        <p className="whitespace-pre-wrap text-emerald-900/80 dark:text-emerald-100/80">
                          {q.expectedAnswer || <span className="italic">미작성</span>}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button onClick={handleSaveAttempt} disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 animate-spin" size={14} /> : <CheckCircle2 size={14} className="mr-2" />}
                결과 저장
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setTranscripts({});
                  durationsRef.current = {};
                  setIdx(0);
                  setStep("question");
                }}
              >
                <RotateCcw size={14} className="mr-1" /> 다시 연습
              </Button>
              <Button variant="ghost" onClick={handleClose}>
                목록으로
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Footer nav (only during questions) */}
      {step === "question" && (
        <footer className="flex shrink-0 items-center justify-between gap-2 border-t bg-background/95 px-4 py-3 sm:px-6">
          <Button
            variant="outline"
            onClick={goPrev}
            disabled={idx === 0}
          >
            <ChevronLeft size={16} className="mr-1" /> 이전
          </Button>
          <p className="text-xs text-muted-foreground">
            {idx + 1} / {questions.length}
          </p>
          <Button onClick={goNext}>
            {idx === questions.length - 1 ? "결과 보기" : "다음"}
            <ChevronRight size={16} className="ml-1" />
          </Button>
        </footer>
      )}
    </div>
  );
}
