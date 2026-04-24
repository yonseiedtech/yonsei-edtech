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
  length: number;
  [index: number]: { transcript: string; confidence?: number };
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives?: number;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart?: (() => void) | null;
  onaudiostart?: (() => void) | null;
  onaudioend?: (() => void) | null;
  onspeechstart?: (() => void) | null;
  onspeechend?: (() => void) | null;
  onnomatch?: (() => void) | null;
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
  // Chrome/Edge는 webkitSpeechRecognition만 안정적, 표준 SpeechRecognition은 일부 환경에서 silent fail
  return w.webkitSpeechRecognition ?? w.SpeechRecognition ?? null;
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

/** 한국어/영어 혼합 문장 분리 — `. ! ? 。 ! ?` 와 줄바꿈 기준 */
function splitSentences(text: string): string[] {
  if (!text) return [];
  return text
    .replace(/\r/g, "")
    .split(/(?<=[.!?。!?])\s+|\n+/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** 따라 읽기용 정규화 — 공백·구두점·대소문자 차이를 무시하고 글자만 비교 */
function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^가-힣a-z0-9]/g, "")
    .trim();
}

/** 따라 읽기 일치 점수 (0~100) — 정규화 후 정확 포함이면 100, 아니면 Jaccard 유사도 */
function readAlongMatchScore(spoken: string, target: string): number {
  const s = normalizeForCompare(spoken);
  const g = normalizeForCompare(target);
  if (!g) return 0;
  if (s.includes(g)) return 100;
  return similarityScore(spoken, target);
}

/** 난이도별 통과 임계값 */
const READALONG_THRESHOLDS = { easy: 50, normal: 70, hard: 90 } as const;
type ReadAlongDifficulty = keyof typeof READALONG_THRESHOLDS;

/** 임계값 이상이면 통과 */
function isReadAlongPassed(spoken: string, target: string, threshold: number): boolean {
  return readAlongMatchScore(spoken, target) >= threshold;
}

/** 한 문장(target)이 후보 문장 배열(pool) 중 가장 유사한 점수와 인덱스 반환 */
function bestMatch(target: string, pool: string[]): { score: number; index: number } {
  if (!target || pool.length === 0) return { score: 0, index: -1 };
  let bestScore = 0;
  let bestIdx = -1;
  for (let i = 0; i < pool.length; i++) {
    const s = similarityScore(target, pool[i]);
    if (s > bestScore) {
      bestScore = s;
      bestIdx = i;
    }
  }
  return { score: bestScore, index: bestIdx };
}

/** 점수에 따른 형광펜 클래스 (light/dark 모두 대응) */
function highlightClass(score: number): string {
  if (score >= 70) return "bg-emerald-200/80 dark:bg-emerald-700/40 text-emerald-950 dark:text-emerald-50";
  if (score >= 40) return "bg-amber-200/80 dark:bg-amber-700/40 text-amber-950 dark:text-amber-50";
  if (score >= 15) return "bg-rose-200/70 dark:bg-rose-700/40 text-rose-950 dark:text-rose-50";
  return "bg-zinc-200/70 dark:bg-zinc-700/40 text-zinc-700 dark:text-zinc-200";
}

/**
 * 문장 단위 비교 뷰 — 좌측 내 답변 / 우측 모범 답변
 * 각 문장에 형광펜 색상으로 일치도 표시. 모범 답변 누락 문장은 우측에서 회색.
 */
function SentenceDiffView({ transcript, expected }: { transcript: string; expected: string }) {
  const tSents = splitSentences(transcript);
  const eSents = splitSentences(expected);

  if (tSents.length === 0 && eSents.length === 0) {
    return (
      <p className="rounded-md bg-muted/40 p-3 text-xs italic text-muted-foreground">
        비교할 문장이 없습니다.
      </p>
    );
  }

  // 각 내 답변 문장 → 모범 답변 문장 중 best match 점수
  const tMatches = tSents.map((s) => bestMatch(s, eSents));
  // 각 모범 답변 문장이 어떤 내 답변 문장과 매칭되는지 (역방향)
  const eMatches = eSents.map((s) => bestMatch(s, tSents));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="text-muted-foreground">형광펜:</span>
        <span className="rounded px-1.5 py-0.5 bg-emerald-200/80 text-emerald-950 dark:bg-emerald-700/40 dark:text-emerald-50">일치 70+</span>
        <span className="rounded px-1.5 py-0.5 bg-amber-200/80 text-amber-950 dark:bg-amber-700/40 dark:text-amber-50">부분 40~69</span>
        <span className="rounded px-1.5 py-0.5 bg-rose-200/70 text-rose-950 dark:bg-rose-700/40 dark:text-rose-50">희미 15~39</span>
        <span className="rounded px-1.5 py-0.5 bg-zinc-200/70 text-zinc-700 dark:bg-zinc-700/40 dark:text-zinc-200">미일치</span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-semibold text-muted-foreground">내 답변 (문장 비교)</p>
          <div className="rounded-lg border bg-background p-3 text-sm leading-relaxed">
            {tSents.length === 0 ? (
              <span className="italic text-muted-foreground">답변 없음</span>
            ) : (
              tSents.map((s, i) => {
                const m = tMatches[i];
                return (
                  <span
                    key={i}
                    className={cn(
                      "mr-1 inline rounded px-1 py-0.5",
                      highlightClass(m.score),
                    )}
                    title={`최고 일치 ${m.score}점${m.index >= 0 ? ` (모범 ${m.index + 1}번 문장)` : ""}`}
                  >
                    {s}{" "}
                    <span className="ml-0.5 text-[10px] opacity-70">[{m.score}]</span>
                  </span>
                );
              })
            )}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold text-muted-foreground">모범 답변 (커버리지)</p>
          <div className="rounded-lg border bg-background p-3 text-sm leading-relaxed">
            {eSents.length === 0 ? (
              <span className="italic text-muted-foreground">모범 답변 없음</span>
            ) : (
              eSents.map((s, i) => {
                const m = eMatches[i];
                return (
                  <span
                    key={i}
                    className={cn(
                      "mr-1 inline rounded px-1 py-0.5",
                      highlightClass(m.score),
                    )}
                    title={`내 답변에서 ${m.score}점 일치${m.index >= 0 ? ` (내 ${m.index + 1}번 문장)` : " — 누락"}`}
                  >
                    {s}{" "}
                    <span className="ml-0.5 text-[10px] opacity-70">[{m.score}]</span>
                  </span>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
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
  /** 진단용: STT 엔진 상태 표시 */
  type SttStatus = "idle" | "starting" | "listening" | "speaking" | "processing" | "restarting" | "error";
  const [sttStatus, setSttStatus] = useState<SttStatus>("idle");
  const [sttDebug, setSttDebug] = useState<string>("");
  /** 진단용: 실시간 마이크 입력 레벨 (0~100). throttle 200ms — UI 카운터/색상용 */
  const [micLevel, setMicLevel] = useState(0);
  /** 이퀄라이저 바: React state로 60fps 갱신은 reconciliation 비용 폭증 → ref + DOM 직접 조작 */
  const EQ_BARS = 24;
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);
  const levelBarRef = useRef<HTMLDivElement | null>(null);
  const lastLevelStateAtRef = useRef(0);
  /** 진단용: 시작 후 onspeechstart까지 감지 안 될 때 노출되는 hint */
  const [noSpeechHint, setNoSpeechHint] = useState(false);
  /** 녹음 시작 후 첫 전사까지 카운트다운 (초 단위, null이면 비활성) */
  const [waitCountdown, setWaitCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** 사용자가 선택한 마이크 디바이스 ID */
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  /** 연습 모드 — answer(심사 답변) | readalong(모범 답변 따라 읽기) */
  type PracticeMode = "answer" | "readalong";
  const [practiceMode, setPracticeMode] = useState<PracticeMode>("answer");
  /** 따라 읽기 모드: 현재 따라 읽는 문장 인덱스 (질문 바뀌면 0으로 리셋) */
  const [readAlongIdx, setReadAlongIdx] = useState(0);
  /** 따라 읽기 모드: 현재 문장 누적 발화 (정규화 비교 후 100% 일치 시 다음 문장으로 자동 진행) */
  const [readAlongBuffer, setReadAlongBuffer] = useState("");
  /** 따라 읽기 모드: 질문별 통과한 문장 수 (요약용) */
  const [readAlongPassedByQ, setReadAlongPassedByQ] = useState<Record<string, number>>({});
  /** 따라 읽기 난이도 — 임계값 기반 (easy 50, normal 70, hard 90) */
  const [readAlongDifficulty, setReadAlongDifficulty] = useState<ReadAlongDifficulty>("normal");

  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const durationsRef = useRef<Record<string, number>>({});
  /** 사용자가 명시적으로 녹음 시작을 누른 상태인지 — Chrome continuous가 침묵으로 종료되어도 재시작 판단용 */
  const wantRecordingRef = useRef(false);
  /** onresult 클로저에서 항상 최신 question id를 참조하기 위한 ref */
  const currentQuestionIdRef = useRef<string>("");
  /** 마이크 레벨 미터링용 AudioContext + Stream */
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const noSpeechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechSeenRef = useRef(false);
  /** 따라 읽기 모드 — onresult/onend 클로저에서 항상 최신 모드/인덱스/타겟 참조 */
  const practiceModeRef = useRef<PracticeMode>("answer");
  const readAlongIdxRef = useRef(0);
  const readAlongTargetsRef = useRef<string[]>([]);
  const readAlongDifficultyRef = useRef<ReadAlongDifficulty>("normal");

  useEffect(() => {
    setSttSupported(getRecognitionCtor() !== null);
    // 사용 가능한 마이크 디바이스 목록 (권한 요청 전에는 label이 비어있음 — 처음 시작 후 채워짐)
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devs) => {
        setAudioDevices(devs.filter((d) => d.kind === "audioinput"));
      }).catch(() => {/* noop */});
    }
    return () => {
      wantRecordingRef.current = false;
      try { recRef.current?.abort(); } catch {/* noop */}
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
      if (noSpeechTimerRef.current) clearTimeout(noSpeechTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      try { audioStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {/* noop */}
      try { audioCtxRef.current?.close(); } catch {/* noop */}
    };
  }, []);

  /** 마이크 입력 레벨 실시간 측정 — 사용자가 마이크 자체가 입력을 받는지 즉답 가능 */
  const startMicMetering = async () => {
    try {
      // echoCancellation/noiseSuppression/autoGainControl이 일부 환경에서 신호를 0으로 깎는 경우가 있어 끔
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: true,
      };
      if (selectedDeviceId) {
        audioConstraints.deviceId = { exact: selectedDeviceId };
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      audioStreamRef.current = stream;
      // 권한 받은 후 enumerateDevices가 label을 채워줌
      try {
        const devs = await navigator.mediaDevices.enumerateDevices();
        setAudioDevices(devs.filter((d) => d.kind === "audioinput"));
      } catch {/* noop */}
      // 디바이스 진단 정보
      const tracks = stream.getAudioTracks();
      const labels = tracks.map((t) => `${t.label || "(이름없음)"}[${t.readyState}]`).join(", ");
      console.log("[STT] mic tracks:", tracks);
      setSttDebug(`마이크 권한 OK · 디바이스: ${labels}`);
      const AC: typeof AudioContext =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!;
      const ctx = new AC();
      audioCtxRef.current = ctx;
      // Chrome/Safari에서 getUserMedia 직후 ctx가 suspended일 수 있음 → 명시적 resume
      if (ctx.state === "suspended") {
        try { await ctx.resume(); } catch {/* noop */}
      }
      console.log("[STT] AudioContext state:", ctx.state);
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      const timeData = new Uint8Array(analyser.fftSize);
      const freqData = new Uint8Array(analyser.frequencyBinCount); // = 256
      // 사람 목소리는 80Hz~3kHz에 집중. 로그 스케일 빈을 EQ_BARS 그룹으로 매핑
      const binCount = freqData.length;
      const tick = () => {
        // 1) 전체 레벨 (시간 도메인) — DOM 직접 갱신
        analyser.getByteTimeDomainData(timeData);
        let max = 0;
        for (let i = 0; i < timeData.length; i++) {
          const v = Math.abs(timeData[i] - 128);
          if (v > max) max = v;
        }
        const level = Math.min(100, Math.round((max / 128) * 100));
        if (levelBarRef.current) {
          levelBarRef.current.style.width = `${level}%`;
        }
        // micLevel state는 200ms throttle (색상/카운터용)
        const now = performance.now();
        if (now - lastLevelStateAtRef.current > 200) {
          setMicLevel(level);
          lastLevelStateAtRef.current = now;
        }
        // 2) 이퀄라이저 (주파수 도메인) — DOM 직접 height 조작 (React state 미사용)
        analyser.getByteFrequencyData(freqData);
        for (let b = 0; b < EQ_BARS; b++) {
          const lo = Math.floor(binCount * Math.pow(b / EQ_BARS, 1.6));
          const hi = Math.max(lo + 1, Math.floor(binCount * Math.pow((b + 1) / EQ_BARS, 1.6)));
          let sum = 0;
          for (let i = lo; i < hi && i < binCount; i++) sum += freqData[i];
          const avg = sum / Math.max(1, hi - lo);
          const v = Math.min(100, Math.round((avg / 255) * 100));
          const el = barRefs.current[b];
          if (el) {
            el.style.height = `${Math.max(4, v)}%`;
            // 색상은 dataset으로만 갱신해서 className churn 방지
            const tier = v > 70 ? "high" : v > 40 ? "mid" : v > 20 ? "low" : "min";
            if (el.dataset.tier !== tier) {
              el.dataset.tier = tier;
              el.style.background =
                tier === "high"
                  ? "rgb(16 185 129)"
                  : tier === "mid"
                  ? "rgb(52 211 153)"
                  : tier === "low"
                  ? "rgb(251 191 36)"
                  : "rgb(161 161 170)";
            }
          }
        }
        rafIdRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (err) {
      console.warn("[STT] mic metering failed:", err);
    }
  };

  const stopMicMetering = () => {
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    try { audioStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {/* noop */}
    audioStreamRef.current = null;
    try { audioCtxRef.current?.close(); } catch {/* noop */}
    audioCtxRef.current = null;
    setMicLevel(0);
    // EQ 바 DOM 초기화
    for (let i = 0; i < EQ_BARS; i++) {
      const el = barRefs.current[i];
      if (el) {
        el.style.height = "4%";
        el.style.background = "";
        delete el.dataset.tier;
      }
    }
    if (levelBarRef.current) levelBarRef.current.style.width = "0%";
  };

  const questions = practiceSet?.questions ?? [];
  const current = questions[idx];

  // 현재 질문 id를 ref에 동기화 (onresult/onend 클로저용)
  useEffect(() => {
    currentQuestionIdRef.current = current?.id ?? "";
  }, [current?.id]);

  // 따라 읽기 모드용: 현재 질문의 모범 답변을 문장 단위로 분리
  const expectedSentences = useMemo(
    () => splitSentences(current?.expectedAnswer ?? ""),
    [current?.expectedAnswer],
  );

  // 질문이 바뀌면 따라 읽기 진행상태 리셋
  useEffect(() => {
    setReadAlongIdx(0);
    setReadAlongBuffer("");
    readAlongIdxRef.current = 0;
    readAlongTargetsRef.current = expectedSentences;
  }, [current?.id, expectedSentences]);

  // mode/idx state → ref 미러링
  useEffect(() => {
    practiceModeRef.current = practiceMode;
  }, [practiceMode]);
  useEffect(() => {
    readAlongIdxRef.current = readAlongIdx;
  }, [readAlongIdx]);

  // 난이도 ref 미러링
  useEffect(() => {
    readAlongDifficultyRef.current = readAlongDifficulty;
  }, [readAlongDifficulty]);

  // 따라 읽기 통과 자동 검사 — buffer 또는 interim 변경 시 임계값 이상이면 다음 문장으로
  useEffect(() => {
    if (practiceMode !== "readalong") return;
    const targets = readAlongTargetsRef.current;
    const idx0 = readAlongIdx;
    if (idx0 >= targets.length) return;
    const target = targets[idx0];
    if (!target) return;
    // final 누적 + interim 합쳐서 검사 (final이 도달하기 전 interim에서도 통과 가능하게)
    const combined = (readAlongBuffer + " " + interim).trim();
    const threshold = READALONG_THRESHOLDS[readAlongDifficulty];
    if (isReadAlongPassed(combined, target, threshold)) {
      const qid = currentQuestionIdRef.current;
      const nextIdx = idx0 + 1;
      if (qid) {
        setReadAlongPassedByQ((prev) => ({
          ...prev,
          [qid]: Math.max(prev[qid] ?? 0, nextIdx),
        }));
      }
      const score = readAlongMatchScore(combined, target);
      if (nextIdx >= targets.length) {
        toast.success(`전체 ${targets.length}문장 따라 읽기 완료! (${score}점)`);
      } else {
        toast.success(`문장 ${idx0 + 1} 통과 ✓ (${score}점 / 기준 ${threshold}점)`);
      }
      setReadAlongBuffer("");
      setInterim("");
      setReadAlongIdx(nextIdx);
    }
  }, [readAlongBuffer, interim, readAlongIdx, practiceMode, readAlongDifficulty]);

  const stopRecording = () => {
    wantRecordingRef.current = false;
    setRecording(false);
    setInterim("");
    setSttStatus("idle");
    setNoSpeechHint(false);
    if (noSpeechTimerRef.current) {
      clearTimeout(noSpeechTimerRef.current);
      noSpeechTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setWaitCountdown(null);
    stopMicMetering();
    try { recRef.current?.stop(); } catch {/* noop */}
    const qid = currentQuestionIdRef.current;
    if (startedAtRef.current && qid) {
      const sec = Math.round((Date.now() - startedAtRef.current) / 1000);
      durationsRef.current[qid] =
        (durationsRef.current[qid] ?? 0) + sec;
      startedAtRef.current = null;
    }
  };

  const buildRecognition = (): SpeechRecognitionInstance | null => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return null;
    const rec = new Ctor();
    rec.lang = "ko-KR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onstart = () => {
      console.log("[STT] onstart");
      setSttStatus("listening");
      setSttDebug("엔진 시작됨");
    };
    rec.onaudiostart = () => {
      console.log("[STT] onaudiostart");
      setSttDebug("오디오 캡처 시작");
    };
    rec.onspeechstart = () => {
      console.log("[STT] onspeechstart");
      setSttStatus("speaking");
      setSttDebug("말하는 중 감지");
      speechSeenRef.current = true;
      setNoSpeechHint(false);
      if (noSpeechTimerRef.current) {
        clearTimeout(noSpeechTimerRef.current);
        noSpeechTimerRef.current = null;
      }
      // 카운트다운 종료 (첫 전사 감지됨)
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setWaitCountdown(null);
    };
    rec.onspeechend = () => {
      console.log("[STT] onspeechend");
      setSttStatus("processing");
      setSttDebug("말 끝남, 처리 중");
    };
    rec.onaudioend = () => {
      console.log("[STT] onaudioend");
      setSttDebug("오디오 캡처 종료");
    };
    rec.onnomatch = () => {
      console.log("[STT] onnomatch");
      setSttDebug("매칭 결과 없음");
    };
    rec.onresult = (e) => {
      console.log("[STT] onresult resultIndex=", e.resultIndex, "results.length=", e.results.length);
      speechSeenRef.current = true;
      setNoSpeechHint(false);
      if (noSpeechTimerRef.current) {
        clearTimeout(noSpeechTimerRef.current);
        noSpeechTimerRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setWaitCountdown(null);
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const t = r[0]?.transcript ?? "";
        if (r.isFinal) finalText += t + " ";
        else interimText += t;
      }
      console.log("[STT] final=", JSON.stringify(finalText), "interim=", JSON.stringify(interimText));
      const qid = currentQuestionIdRef.current;
      if (!qid) {
        console.warn("[STT] no current question id, dropping result");
        return;
      }
      // 따라 읽기 모드: buffer에만 누적, 통과 검사는 useEffect가 처리
      if (practiceModeRef.current === "readalong") {
        if (finalText) {
          setReadAlongBuffer((prev) => ((prev + " " + finalText).replace(/\s+/g, " ").trim()));
        }
        // interim은 진행률 시각화용으로 같이 노출
        setInterim(interimText);
        setSttDebug(`따라 읽기 (final: ${finalText.length}자, interim: ${interimText.length}자)`);
        return;
      }
      // 심사 답변 모드 (기존)
      if (finalText) {
        setTranscripts((t) => ({
          ...t,
          [qid]: ((t[qid] ?? "") + " " + finalText).replace(/\s+/g, " ").trim(),
        }));
      }
      setInterim(interimText);
      setSttDebug(`결과 수신 (final: ${finalText.length}자, interim: ${interimText.length}자)`);
    };
    rec.onerror = (e) => {
      console.warn("[STT] onerror:", e.error);
      setSttDebug(`에러: ${e.error}`);
      if (e.error === "no-speech" || e.error === "aborted") return;
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        wantRecordingRef.current = false;
        toast.error("마이크 권한이 차단되었습니다. 브라우저 주소창의 자물쇠 → 마이크 → 허용으로 변경해주세요.");
        setRecording(false);
        setSttStatus("error");
        return;
      }
      if (e.error === "audio-capture") {
        wantRecordingRef.current = false;
        toast.error("마이크를 찾을 수 없습니다. 입력 장치를 확인해주세요.");
        setRecording(false);
        setSttStatus("error");
        return;
      }
      if (e.error === "network") {
        toast.error("네트워크 오류로 음성 인식이 끊어졌어요. 자동 재시도합니다.");
        setSttStatus("restarting");
        return;
      }
      toast.error(`음성 인식 오류: ${e.error}`);
      setSttStatus("error");
    };
    rec.onend = () => {
      console.log("[STT] onend, wantRecording=", wantRecordingRef.current);
      const qid = currentQuestionIdRef.current;
      if (startedAtRef.current && qid) {
        const sec = Math.round((Date.now() - startedAtRef.current) / 1000);
        durationsRef.current[qid] =
          (durationsRef.current[qid] ?? 0) + sec;
        startedAtRef.current = null;
      }
      // 사용자가 정지를 누르지 않았다면 fresh instance로 자동 재시작
      // (Chrome은 같은 인스턴스 재시작 시 InvalidStateError 빈발 → setTimeout + 새 인스턴스)
      if (wantRecordingRef.current) {
        setSttStatus("restarting");
        setSttDebug("자동 재시작 중...");
        setTimeout(() => {
          if (!wantRecordingRef.current) return;
          try {
            const fresh = buildRecognition();
            if (!fresh) {
              wantRecordingRef.current = false;
              setRecording(false);
              setSttStatus("error");
              setSttDebug("재초기화 실패");
              return;
            }
            recRef.current = fresh;
            startedAtRef.current = Date.now();
            fresh.start();
          } catch (err) {
            console.warn("[STT] restart failed:", err);
            wantRecordingRef.current = false;
            setRecording(false);
            setInterim("");
            setSttStatus("error");
            setSttDebug(`재시작 실패: ${(err as Error).message}`);
          }
        }, 250);
      } else {
        setRecording(false);
        setInterim("");
        setSttStatus("idle");
      }
    };
    return rec;
  };

  const startRecording = async () => {
    if (!current) return;
    if (!getRecognitionCtor()) {
      toast.error("이 브라우저는 음성 인식을 지원하지 않습니다. 직접 입력을 사용하세요.");
      return;
    }
    setSttStatus("starting");
    setSttDebug("마이크 권한 요청 중...");
    setNoSpeechHint(false);
    speechSeenRef.current = false;
    // 마이크 입력 레벨 미터링 시작 (Web Speech API와 별개로 사용자가 마이크 신호 확인 가능)
    await startMicMetering();
    setSttDebug("마이크 권한 OK · 신호 감지 중");
    // 명시적 마이크 권한 요청은 위에서 startMicMetering이 처리함 (권한 거부 시 catch)
    try {
      // 추가 안전망: getUserMedia가 차단된 채 startMicMetering이 실패한 경우 다시 시도
      if (!audioStreamRef.current && typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      }
    } catch (err) {
      console.error("[STT] mic permission denied:", err);
      toast.error("마이크 권한이 필요합니다. 브라우저 설정에서 허용해주세요.");
      setSttStatus("error");
      setSttDebug("마이크 권한 거부됨");
      return;
    }
    // 기존 인스턴스가 살아있다면 정리
    try { recRef.current?.abort(); } catch {/* noop */}
    try {
      const rec = buildRecognition();
      if (!rec) {
        toast.error("음성 인식을 초기화할 수 없습니다.");
        setSttStatus("error");
        return;
      }
      recRef.current = rec;
      wantRecordingRef.current = true;
      startedAtRef.current = Date.now();
      rec.start();
      setRecording(true);
      setInterim("");
      setSttDebug("rec.start() 호출됨");
      // 5초 안에 onspeechstart/onresult가 안 오면 안내 표시
      if (noSpeechTimerRef.current) clearTimeout(noSpeechTimerRef.current);
      noSpeechTimerRef.current = setTimeout(() => {
        if (!speechSeenRef.current && wantRecordingRef.current) {
          setNoSpeechHint(true);
        }
      }, 5000);
      // 5초 카운트다운 — 사용자가 "얼마나 기다려야 하나" 즉시 파악
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      setWaitCountdown(5);
      countdownIntervalRef.current = setInterval(() => {
        setWaitCountdown((prev) => {
          if (prev == null || prev <= 1) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error("[STT] start failed:", err);
      wantRecordingRef.current = false;
      setSttStatus("error");
      setSttDebug(`start 실패: ${(err as Error).message}`);
      toast.error("음성 인식 시작에 실패했습니다. 페이지를 새로고침 후 다시 시도해주세요.");
    }
  };

  const goPrev = () => {
    stopRecording();
    setShowAnswer(false);
    setEditingTranscript(false);
    setReadAlongIdx(0);
    setReadAlongBuffer("");
    setIdx((i) => Math.max(0, i - 1));
  };
  const goNext = () => {
    stopRecording();
    setShowAnswer(false);
    setEditingTranscript(false);
    setReadAlongIdx(0);
    setReadAlongBuffer("");
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

              {/* 모드 토글 — 모범 답변 있을 때만 따라 읽기 모드 활성화 */}
              {expectedSentences.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-2">
                  <span className="text-xs font-semibold text-muted-foreground">모드</span>
                  <div className="inline-flex rounded-md border bg-background p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        if (recording) stopRecording();
                        setPracticeMode("answer");
                      }}
                      className={cn(
                        "rounded px-3 py-1 font-medium transition-colors",
                        practiceMode === "answer"
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      심사 답변
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (recording) stopRecording();
                        setPracticeMode("readalong");
                        setReadAlongIdx(0);
                        setReadAlongBuffer("");
                      }}
                      className={cn(
                        "rounded px-3 py-1 font-medium transition-colors",
                        practiceMode === "readalong"
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      따라 읽기
                    </button>
                  </div>
                  {practiceMode === "readalong" && (
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      {Math.min(readAlongIdx, expectedSentences.length)} / {expectedSentences.length} 문장
                    </span>
                  )}
                </div>
              )}

              {/* 따라 읽기 난이도 선택 */}
              {practiceMode === "readalong" && expectedSentences.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-2">
                  <span className="text-xs font-semibold text-muted-foreground">난이도</span>
                  <div className="inline-flex gap-1">
                    {(["easy", "normal", "hard"] as const).map((d) => {
                      const label = d === "easy" ? "쉬움" : d === "normal" ? "보통" : "어려움";
                      const pct = READALONG_THRESHOLDS[d];
                      const active = readAlongDifficulty === d;
                      const color =
                        d === "easy"
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : d === "normal"
                          ? "border-amber-500 bg-amber-500 text-white"
                          : "border-rose-500 bg-rose-500 text-white";
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setReadAlongDifficulty(d)}
                          className={cn(
                            "rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors",
                            active
                              ? color
                              : "border-zinc-200 bg-background text-muted-foreground hover:text-foreground dark:border-zinc-700",
                          )}
                        >
                          {label}
                          <span className={cn("ml-1 tabular-nums", active ? "opacity-90" : "opacity-60")}>
                            {pct}%
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    일치도 {READALONG_THRESHOLDS[readAlongDifficulty]}% 이상이면 통과
                  </span>
                </div>
              )}

              {/* 따라 읽기 모드 패널 */}
              {practiceMode === "readalong" && expectedSentences.length > 0 && (
                <div className="rounded-xl border bg-card p-5">
                  {readAlongIdx >= expectedSentences.length ? (
                    <div className="flex flex-col items-center gap-3 py-6 text-center">
                      <CheckCircle2 size={36} className="text-emerald-500" />
                      <p className="text-base font-semibold">전체 문장 따라 읽기 완료!</p>
                      <p className="text-xs text-muted-foreground">
                        총 {expectedSentences.length}개 문장을 모두 통과했습니다.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setReadAlongIdx(0);
                            setReadAlongBuffer("");
                          }}
                        >
                          <RotateCcw size={12} className="mr-1" /> 처음부터
                        </Button>
                        <Button size="sm" onClick={goNext}>
                          다음 질문 <ChevronRight size={14} className="ml-1" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    (() => {
                      const target = expectedSentences[readAlongIdx];
                      const spokenCombined = (readAlongBuffer + " " + interim).trim();
                      const score = readAlongMatchScore(spokenCombined, target);
                      const threshold = READALONG_THRESHOLDS[readAlongDifficulty];
                      const passed = score >= threshold;
                      return (
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-muted-foreground">
                              지금 따라 읽을 문장
                            </p>
                            <Badge variant="outline" className="text-[10px]">
                              {readAlongIdx + 1} / {expectedSentences.length}
                            </Badge>
                          </div>
                          <div
                            className={cn(
                              "rounded-lg border-2 p-4 text-lg leading-relaxed sm:text-xl",
                              passed
                                ? "border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100"
                                : score >= threshold * 0.6
                                ? "border-amber-400 bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-50"
                                : "border-zinc-300 bg-background dark:border-zinc-700",
                            )}
                          >
                            {target}
                          </div>

                          {/* 진행률 바 — 임계값 표시 마커 포함 */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>일치도</span>
                              <span className="tabular-nums font-semibold">
                                {score}점 / 기준 {threshold}점
                              </span>
                            </div>
                            <div className="relative h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                              <div
                                className={cn(
                                  "h-full transition-[width] duration-150",
                                  passed ? "bg-emerald-500" : score >= threshold * 0.6 ? "bg-amber-500" : "bg-rose-400",
                                )}
                                style={{ width: `${score}%` }}
                              />
                              {/* 통과 임계값 마커 (세로선) */}
                              <div
                                className="absolute inset-y-0 w-px bg-foreground/40"
                                style={{ left: `${threshold}%` }}
                                title={`통과 기준 ${threshold}%`}
                              />
                            </div>
                          </div>

                          {/* 내 발화 미리보기 */}
                          <div className="rounded-md bg-muted/40 p-3 text-sm">
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              내 발화
                            </p>
                            {readAlongBuffer || interim ? (
                              <span>
                                {readAlongBuffer}
                                {interim && (
                                  <span className="text-muted-foreground/80">
                                    {readAlongBuffer ? " " : ""}{interim}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="italic text-muted-foreground">
                                {recording ? "🎙️ 위 문장을 그대로 따라 읽어보세요" : "마이크를 켜고 문장을 따라 읽어주세요"}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setReadAlongBuffer("");
                                setInterim("");
                              }}
                              disabled={!readAlongBuffer && !interim}
                            >
                              <RotateCcw size={12} className="mr-1" /> 발화 비우기
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                // 건너뛰기 (수동으로 다음 문장 통과 처리 없이 이동)
                                setReadAlongBuffer("");
                                setInterim("");
                                setReadAlongIdx((i) => Math.min(expectedSentences.length, i + 1));
                              }}
                            >
                              건너뛰기 <ChevronRight size={12} className="ml-1" />
                            </Button>
                            {readAlongIdx > 0 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setReadAlongBuffer("");
                                  setInterim("");
                                  setReadAlongIdx((i) => Math.max(0, i - 1));
                                }}
                              >
                                <ChevronLeft size={12} className="mr-1" /> 이전 문장
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>
              )}

              {/* Transcript area — 심사 답변 모드에서만 노출 */}
              {practiceMode === "answer" && (
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
                  <div className="relative min-h-[120px] whitespace-pre-wrap rounded-md bg-muted/30 p-3 text-sm leading-relaxed">
                    {transcripts[current.id] && (
                      <span>{transcripts[current.id]}</span>
                    )}
                    {interim && (
                      <span className="text-muted-foreground/80">
                        {transcripts[current.id] ? " " : ""}{interim}
                      </span>
                    )}
                    {!transcripts[current.id] && !interim && (
                      <span className="italic text-muted-foreground">
                        {recording
                          ? "🎙️ 듣고 있어요... 답변을 시작하세요."
                          : "아직 답변이 없습니다. 마이크 버튼을 눌러 시작하세요."}
                      </span>
                    )}
                    {recording && (transcripts[current.id] || interim) && (
                      <span className="ml-1 inline-block h-3 w-1 animate-pulse bg-rose-500 align-middle" />
                    )}
                    {/* 첫 전사까지 카운트다운 — 사용자 대기 시간 가시화 */}
                    {recording && waitCountdown != null && !transcripts[current.id] && !interim && (
                      <div className="absolute bottom-2 right-2 flex items-center gap-2 rounded-full border bg-background/90 px-3 py-1.5 shadow-sm backdrop-blur">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">전사 대기</span>
                        <span
                          key={waitCountdown}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-base font-bold text-white animate-in zoom-in duration-200"
                        >
                          {waitCountdown}
                        </span>
                      </div>
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

                {/* STT 진단 상태 표시 */}
                {(recording || sttStatus !== "idle") && (
                  <div className="mt-2 space-y-2 rounded-md border bg-muted/40 px-2.5 py-2 text-[11px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold",
                          sttStatus === "speaking"
                            ? "bg-emerald-500 text-white"
                            : sttStatus === "listening"
                            ? "bg-blue-500 text-white"
                            : sttStatus === "processing"
                            ? "bg-amber-500 text-white"
                            : sttStatus === "starting" || sttStatus === "restarting"
                            ? "bg-zinc-500 text-white"
                            : sttStatus === "error"
                            ? "bg-rose-600 text-white"
                            : "bg-zinc-300 text-zinc-700",
                        )}
                      >
                        {sttStatus === "speaking" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />}
                        {sttStatus === "listening" && "듣는 중"}
                        {sttStatus === "speaking" && "말하는 중 감지"}
                        {sttStatus === "processing" && "처리 중"}
                        {sttStatus === "starting" && "시작 중"}
                        {sttStatus === "restarting" && "재시작 중"}
                        {sttStatus === "error" && "오류"}
                        {sttStatus === "idle" && "대기"}
                      </span>
                      {sttDebug && (
                        <span className="text-muted-foreground">{sttDebug}</span>
                      )}
                    </div>
                    {/* 마이크 입력 신호 미터 — DOM 직접 갱신으로 60fps 확보 */}
                    <div className="flex items-center gap-2">
                      <span className="w-12 shrink-0 text-muted-foreground">레벨</span>
                      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                        <div
                          ref={levelBarRef}
                          className={cn(
                            "absolute inset-y-0 left-0",
                            micLevel > 50 ? "bg-emerald-500" : micLevel > 15 ? "bg-amber-500" : "bg-zinc-400",
                          )}
                          style={{ width: "0%", willChange: "width" }}
                        />
                      </div>
                      <span className="w-8 shrink-0 text-right tabular-nums text-muted-foreground">{micLevel}</span>
                    </div>
                    {/* 이퀄라이저 — DOM ref 직접 조작 (React state 미사용, transition 제거 → 부드러운 60fps) */}
                    <div className="flex items-end gap-[2px] h-12 rounded-md bg-zinc-50 dark:bg-zinc-900/60 px-2 py-1">
                      {Array.from({ length: EQ_BARS }, (_, i) => (
                        <div
                          key={i}
                          ref={(el) => { barRefs.current[i] = el; }}
                          className="flex-1 rounded-sm bg-zinc-300 dark:bg-zinc-700"
                          style={{ height: "4%", willChange: "height" }}
                        />
                      ))}
                    </div>
                    {/* 입력 디바이스 선택 (권한 후 라벨이 채워짐) */}
                    {audioDevices.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="w-12 shrink-0 text-muted-foreground">입력</span>
                        <select
                          value={selectedDeviceId}
                          onChange={(e) => {
                            const newId = e.target.value;
                            setSelectedDeviceId(newId);
                            // 디바이스 변경 시 즉시 재시작 (마이크 미터링 + STT)
                            if (recording || micLevel > 0) {
                              stopRecording();
                              setTimeout(() => { startRecording(); }, 200);
                            }
                          }}
                          className="flex-1 rounded border bg-background px-2 py-1 text-[11px]"
                        >
                          <option value="">시스템 기본</option>
                          {audioDevices.map((d) => (
                            <option key={d.deviceId} value={d.deviceId}>
                              {d.label || `마이크 (${d.deviceId.slice(0, 8)})`}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {noSpeechHint && (
                      <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100">
                        <p className="font-semibold">5초간 음성이 감지되지 않았어요</p>
                        <ul className="mt-1 list-disc space-y-0.5 pl-4">
                          <li>위 마이크 바가 움직이는지 확인 (움직이면 마이크는 OK)</li>
                          <li>움직이는데 전사가 안 되면: 시스템 마이크 입력 디바이스가 의도한 것인지 확인 (헤드셋·웹캠·내장 중 선택)</li>
                          <li>회사/학교 네트워크에서 Google 음성 서비스 차단 가능 — Wi-Fi 변경 또는 모바일 핫스팟 시도</li>
                          <li>Chrome 권장. Edge에서 ko-KR 인식 패키지 누락 시 silent fail 가능</li>
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
              )}

              {/* 따라 읽기 모드: 마이크 컨트롤 (심사 답변 모드 카드 외부에서 별도 노출) */}
              {practiceMode === "readalong" && (
                <div className="rounded-xl border bg-card p-4">
                  <div className="flex flex-wrap items-center gap-2">
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
                        이 브라우저는 음성 인식을 지원하지 않습니다.
                      </p>
                    )}
                    <p className="ml-auto text-[11px] text-muted-foreground">
                      문장을 정확히 말하면 자동으로 다음 문장으로 진행됩니다.
                    </p>
                  </div>
                  {/* 진단 상태 (재사용) */}
                  {(recording || sttStatus !== "idle") && (
                    <div className="mt-2 space-y-2 rounded-md border bg-muted/40 px-2.5 py-2 text-[11px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold",
                            sttStatus === "speaking"
                              ? "bg-emerald-500 text-white"
                              : sttStatus === "listening"
                              ? "bg-blue-500 text-white"
                              : sttStatus === "processing"
                              ? "bg-amber-500 text-white"
                              : sttStatus === "starting" || sttStatus === "restarting"
                              ? "bg-zinc-500 text-white"
                              : sttStatus === "error"
                              ? "bg-rose-600 text-white"
                              : "bg-zinc-300 text-zinc-700",
                          )}
                        >
                          {sttStatus === "speaking" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />}
                          {sttStatus === "listening" && "듣는 중"}
                          {sttStatus === "speaking" && "말하는 중"}
                          {sttStatus === "processing" && "처리 중"}
                          {sttStatus === "starting" && "시작 중"}
                          {sttStatus === "restarting" && "재시작 중"}
                          {sttStatus === "error" && "오류"}
                          {sttStatus === "idle" && "대기"}
                        </span>
                        {sttDebug && <span className="text-muted-foreground">{sttDebug}</span>}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Expected answer / 비교 분석 toggle */}
              <div className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowAnswer((v) => !v)}
                  >
                    {showAnswer ? <EyeOff size={13} className="mr-1" /> : <Eye size={13} className="mr-1" />}
                    {showAnswer ? "비교 분석 숨기기" : "모범 답변 / 비교 분석"}
                  </Button>
                  {transcripts[current.id] && current.expectedAnswer && (
                    <p className="text-xs text-muted-foreground">
                      전체 유사도{" "}
                      <span className="font-bold text-foreground">
                        {similarityScore(transcripts[current.id], current.expectedAnswer)}점
                      </span>
                    </p>
                  )}
                </div>
                {showAnswer && (
                  <div className="mt-3">
                    {!current.expectedAnswer ? (
                      <p className="rounded-md bg-muted/40 p-3 text-sm italic text-muted-foreground">
                        모범 답변이 작성되지 않아 비교할 수 없습니다.
                      </p>
                    ) : !transcripts[current.id] ? (
                      <div className="whitespace-pre-wrap rounded-md bg-emerald-50 p-3 text-sm leading-relaxed text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
                        <p className="mb-1 text-[11px] font-semibold uppercase opacity-70">모범 답변</p>
                        {current.expectedAnswer}
                      </div>
                    ) : (
                      <SentenceDiffView
                        transcript={transcripts[current.id]}
                        expected={current.expectedAnswer}
                      />
                    )}
                  </div>
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
                    <div className="mt-3">
                      {r?.transcript && q.expectedAnswer ? (
                        <SentenceDiffView
                          transcript={r.transcript}
                          expected={q.expectedAnswer}
                        />
                      ) : (
                        <div className="grid gap-3 text-xs sm:grid-cols-2">
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
                      )}
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
