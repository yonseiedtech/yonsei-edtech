"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, ChevronLeft, ChevronRight, X, RotateCcw,
  CheckCircle2, AlertCircle, Loader2, Pencil, Eye, EyeOff,
  History, ChevronDown, ChevronUp,
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

const MAX_ATTEMPTS_HISTORY = 50;

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

// ─── 학자명 alias 사전 (교육공학·교육심리 도메인 자주 등장) ───
// canonical token (한글) ← 가능한 모든 표기 (한글 음역 변형 + 영문 표기)
// 사용자가 발화에서 어느 표기로 말하든 동일 토큰으로 정규화 → 점수 손실 방지
const SCHOLAR_ALIASES: Record<string, string[]> = {
  비고츠키: ["비고츠키", "비고스키", "비고트스키", "vygotsky", "lev vygotsky", "vygotskii"],
  반두라: ["반두라", "밴두라", "bandura", "albert bandura"],
  피아제: ["피아제", "삐아제", "piaget", "jean piaget"],
  듀이: ["듀이", "dewey", "john dewey"],
  스키너: ["스키너", "skinner", "b f skinner", "bf skinner"],
  파블로프: ["파블로프", "파블롭", "pavlov", "ivan pavlov"],
  손다이크: ["손다이크", "쏜다이크", "thorndike"],
  메릴: ["메릴", "merrill", "david merrill"],
  가네: ["가네", "가녜", "gagne", "robert gagne"],
  켈러: ["켈러", "keller", "john keller"],
  딕앤캐리: ["딕앤캐리", "딕앤케리", "dick and carey", "dick carey"],
  애디: ["애디", "addie", "ADDIE"],
  블룸: ["블룸", "bloom", "benjamin bloom"],
  콜브: ["콜브", "kolb", "david kolb"],
  마즐로: ["매슬로", "마즐로", "매슬로우", "maslow", "abraham maslow"],
  에릭슨: ["에릭슨", "에릭손", "erikson", "erik erikson"],
  브루너: ["브루너", "부르너", "bruner", "jerome bruner"],
  로저스: ["로저스", "로저즈", "rogers", "carl rogers"],
  메이거: ["메이거", "마저", "mager", "robert mager"],
  라이겔루스: ["라이겔루스", "라이겔러스", "reigeluth", "charles reigeluth"],
  조나센: ["조나센", "조나슨", "jonassen", "david jonassen"],
  마이어: ["마이어", "메이어", "mayer", "richard mayer"],
  스웰러: ["스웰러", "sweller", "john sweller"],
  엥겔스트롬: ["엥겔스트롬", "engestrom"],
  쇤: ["쇤", "schon", "donald schon"],
  콜린스: ["콜린스", "collins", "allan collins"],
  웽거: ["웽거", "wenger", "etienne wenger"],
  레이브: ["레이브", "lave", "jean lave"],
  쳐치랜드: ["쳐치랜드", "처치랜드", "churchland"],
  콜버그: ["콜버그", "kohlberg", "lawrence kohlberg"],
  치솜: ["치솜", "chisolm"],
  앤더슨: ["앤더슨", "anderson", "lorin anderson"],
};

/** 모든 alias → canonical 매핑 (lowercase, 공백 무시) */
const SCHOLAR_ALIAS_INDEX: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const [canonical, aliases] of Object.entries(SCHOLAR_ALIASES)) {
    for (const a of aliases) {
      const key = a.toLowerCase().replace(/\s+/g, "");
      m.set(key, canonical);
    }
    m.set(canonical.toLowerCase(), canonical);
  }
  return m;
})();

/** 텍스트 안에서 학자명을 모두 찾아 canonical 형태로 치환 */
function normalizeScholarsInText(text: string): { normalized: string; foundCanonical: Set<string> } {
  let out = text;
  const found = new Set<string>();
  // alias 길이 내림차순으로 매칭 (긴 alias 우선)
  const allAliases = Array.from(SCHOLAR_ALIAS_INDEX.keys()).sort((a, b) => b.length - a.length);
  for (const alias of allAliases) {
    if (alias.length < 2) continue;
    const canonical = SCHOLAR_ALIAS_INDEX.get(alias)!;
    // alias가 한글이면 단어 경계 무시(한글은 띄어쓰기 보장 안 됨), 영문이면 단어 경계 적용
    const isKorean = /[가-힣]/.test(alias);
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = isKorean
      ? new RegExp(escaped, "gi")
      : new RegExp(`\\b${escaped}\\b`, "gi");
    if (re.test(out)) {
      found.add(canonical);
      out = out.replace(re, ` ${canonical} `);
    }
  }
  return { normalized: out, foundCanonical: found };
}

// ─── 한글 친화 토큰화 + Jaccard 유사도 ───
function tokenize(text: string): Set<string> {
  // 학자명 먼저 canonical로 치환 (음역·영문 표기 차이 흡수)
  const { normalized } = normalizeScholarsInText(text);
  const cleaned = normalized
    .toLowerCase()
    .replace(/[^가-힣a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return new Set();
  const tokens = new Set<string>();
  // 학자 canonical 목록 (소문자) — 2-gram 분해 시 학자명을 보존하기 위함
  const scholarCanonicals = new Set(
    Object.keys(SCHOLAR_ALIASES).map((s) => s.toLowerCase()),
  );
  for (const word of cleaned.split(" ")) {
    if (word.length === 0) continue;
    if (/^[a-z0-9]+$/.test(word)) {
      tokens.add(word);
      continue;
    }
    // 학자명은 2-gram 분해 안 함 (전체 단어 + canonical 자체만 토큰)
    if (scholarCanonicals.has(word)) {
      tokens.add(word);
      tokens.add(`__scholar__${word}`); // 학자명 가중치 부여용 marker
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
  const baseScore = (inter / union) * 100;

  // 학자명 보너스: 모범답변에 등장한 학자를 사용자가 언급할 때마다 +5점 (최대 +20)
  const expectedScholars = extractScholars(expected);
  const transcriptScholars = extractScholars(transcript);
  let bonus = 0;
  for (const s of expectedScholars) {
    if (transcriptScholars.has(s)) bonus += 5;
  }
  bonus = Math.min(20, bonus);

  return Math.min(100, Math.round(baseScore + bonus));
}

/** 텍스트에서 등장한 학자 canonical set */
function extractScholars(text: string): Set<string> {
  return normalizeScholarsInText(text).foundCanonical;
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

/** 문단 분리 — 빈 줄(\n\n+) 기준. 빈 줄 없으면 전체를 1문단으로 처리 */
function splitParagraphs(text: string): string[] {
  if (!text) return [];
  const cleaned = text.replace(/\r/g, "");
  const parts = cleaned.split(/\n{2,}/u).map((s) => s.trim()).filter((s) => s.length > 0);
  // 빈 줄이 없어 1개로만 분리되면 단일 문단으로 — sentence 모드와 효과적으로 동일
  return parts.length > 0 ? parts : [];
}

export type ReadAlongUnit = "sentence" | "paragraph";

/** 단위에 따라 텍스트를 segment 배열로 분리 */
function splitSegments(text: string, unit: ReadAlongUnit): string[] {
  return unit === "paragraph" ? splitParagraphs(text) : splitSentences(text);
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
 * 학자명을 노란 형광펜으로 강조한 React node 배열 반환.
 * 학자명 alias 매칭은 normalizeScholarsInText의 alias index를 그대로 사용.
 */
function renderWithScholarHighlight(text: string): React.ReactNode {
  if (!text) return text;
  // 학자 alias를 길이 내림차순으로 패턴화 — 짧은 것이 긴 것 안에 들어가는 경우 방지
  const aliases = Array.from(SCHOLAR_ALIAS_INDEX.keys())
    .filter((a) => a.length >= 2)
    .sort((a, b) => b.length - a.length);
  // alias 별로 표시 형태 보존을 위해 원문에서 substring을 통째로 잘라야 함
  // 가장 단순한 접근: 문자열을 alias 매칭으로 token화
  // 한글 alias는 단어 경계 없이, 영문은 \b 단어 경계로
  const escaped = aliases.map((a) => {
    const isKo = /[가-힣]/.test(a);
    const e = a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return isKo ? e : `\\b${e}\\b`;
  });
  if (escaped.length === 0) return text;
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(re);
  return parts.map((part, i) => {
    if (!part) return null;
    // alias 일치 검사 — 공백 제거 후 lowercase
    const key = part.toLowerCase().replace(/\s+/g, "");
    if (SCHOLAR_ALIAS_INDEX.has(key)) {
      return (
        <mark
          key={i}
          className="rounded bg-yellow-200 px-0.5 font-semibold text-yellow-950 dark:bg-yellow-500/40 dark:text-yellow-50"
        >
          {part}
        </mark>
      );
    }
    return <span key={i}>{part}</span>;
  });
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

  // 학자명 커버리지
  const expectedScholars = extractScholars(expected);
  const transcriptScholars = extractScholars(transcript);
  const mentionedScholars = Array.from(expectedScholars).filter((s) =>
    transcriptScholars.has(s),
  );
  const missingScholars = Array.from(expectedScholars).filter(
    (s) => !transcriptScholars.has(s),
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="text-muted-foreground">형광펜:</span>
        <span className="rounded px-1.5 py-0.5 bg-emerald-200/80 text-emerald-950 dark:bg-emerald-700/40 dark:text-emerald-50">일치 70+</span>
        <span className="rounded px-1.5 py-0.5 bg-amber-200/80 text-amber-950 dark:bg-amber-700/40 dark:text-amber-50">부분 40~69</span>
        <span className="rounded px-1.5 py-0.5 bg-rose-200/70 text-rose-950 dark:bg-rose-700/40 dark:text-rose-50">희미 15~39</span>
        <span className="rounded px-1.5 py-0.5 bg-zinc-200/70 text-zinc-700 dark:bg-zinc-700/40 dark:text-zinc-200">미일치</span>
      </div>

      {/* 학자명 커버리지 카드 */}
      {expectedScholars.size > 0 && (
        <div className="rounded-lg border bg-gradient-to-br from-indigo-50 to-purple-50 p-3 dark:from-indigo-950/40 dark:to-purple-950/40">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-100">
              📚 학자명 언급 {mentionedScholars.length} / {expectedScholars.size}명
              <span className="ml-2 text-[10px] font-normal text-indigo-700/80 dark:text-indigo-200/80">
                (각 +5점, 최대 +20)
              </span>
            </p>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {mentionedScholars.map((s) => (
              <span
                key={`m-${s}`}
                className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white"
              >
                ✓ {s}
              </span>
            ))}
            {missingScholars.map((s) => (
              <span
                key={`x-${s}`}
                className="rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-200"
              >
                ✗ {s}
              </span>
            ))}
          </div>
        </div>
      )}

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
                    {renderWithScholarHighlight(s)}{" "}
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
  /** 따라 읽기 단위 — 문장 / 문단 (모범답변에 빈 줄이 있어야 문단 단위가 의미 있음) */
  const [readAlongUnit, setReadAlongUnit] = useState<ReadAlongUnit>("sentence");
  /**
   * 따라 읽기 발화 기록 — 질문별·세그먼트별 (마지막 평가된 발화만 보존).
   * 완료 화면에서 모범 답변과 1:1로 비교하기 위함.
   */
  const [readAlongSpokenByQ, setReadAlongSpokenByQ] = useState<
    Record<string, Array<{ idx: number; spoken: string; score: number; passed: boolean } | null>>
  >({});
  /** 모범 답변 인라인 편집용 — 완료 화면에서 textarea로 수정 후 저장 */
  const [editingExpected, setEditingExpected] = useState(false);
  const [editedExpectedDraft, setEditedExpectedDraft] = useState("");
  /** 발화 종료 후 평가 결과 (null = 평가 전, 통과/미달 결과 표시용) */
  const [readAlongResult, setReadAlongResult] = useState<{
    score: number;
    threshold: number;
    passed: boolean;
    spoken: string;
  } | null>(null);
  /** 평가 중 / 평가 완료 후 다음 입력을 받지 않는 짧은 잠금 (통과 시 자동 진행 동안) */
  const [readAlongEvaluating, setReadAlongEvaluating] = useState(false);
  /** intro 화면 이력 패널 펼침 */
  const [showHistory, setShowHistory] = useState(false);
  /** 펼쳐진 attempt index (intro 화면 — 클릭 시 상세 노출) */
  const [expandedAttemptIdx, setExpandedAttemptIdx] = useState<number | null>(null);
  /** STT 언어 — Web Speech API는 동시 다중 lang 미지원이므로 사용자가 토글 */
  type SttLang = "ko-KR" | "en-US";
  const [sttLang, setSttLang] = useState<SttLang>("ko-KR");
  const sttLangRef = useRef<SttLang>("ko-KR");

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
  const readAlongBufferRef = useRef<string>("");
  const readAlongInterimRef = useRef<string>("");
  /** 침묵 감지 평가 트리거 타이머 */
  const readAlongSilenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 통과 후 다음 문장 자동 진행용 타이머 (취소 가능) */
  const readAlongAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  /** 첫 전사 대기 카운트다운 표시 여부 — 모드별로 "발화 결과가 아직 없는" 상태에서만 노출 */
  const shouldShowWaitCountdown = (): boolean => {
    if (!recording || waitCountdown == null) return false;
    if (interim) return false;
    if (practiceMode === "readalong") {
      return !readAlongBuffer;
    }
    return !current || !transcripts[current.id];
  };

  // 현재 질문 id를 ref에 동기화 (onresult/onend 클로저용)
  useEffect(() => {
    currentQuestionIdRef.current = current?.id ?? "";
  }, [current?.id]);

  // 따라 읽기 모드용: 현재 질문의 모범 답변을 단위(문장/문단) 기준으로 분리
  const expectedSegments = useMemo(
    () => splitSegments(current?.expectedAnswer ?? "", readAlongUnit),
    [current?.expectedAnswer, readAlongUnit],
  );

  // 질문 또는 단위가 바뀌면 따라 읽기 진행상태 리셋
  useEffect(() => {
    setReadAlongIdx(0);
    setReadAlongBuffer("");
    setReadAlongResult(null);
    readAlongIdxRef.current = 0;
    readAlongTargetsRef.current = expectedSegments;
  }, [current?.id, expectedSegments, readAlongUnit]);

  // mode/idx state → ref 미러링
  useEffect(() => {
    practiceModeRef.current = practiceMode;
  }, [practiceMode]);
  useEffect(() => {
    readAlongIdxRef.current = readAlongIdx;
  }, [readAlongIdx]);

  // 난이도/언어/buffer/interim ref 미러링
  useEffect(() => {
    readAlongDifficultyRef.current = readAlongDifficulty;
  }, [readAlongDifficulty]);
  useEffect(() => {
    sttLangRef.current = sttLang;
  }, [sttLang]);
  useEffect(() => {
    readAlongBufferRef.current = readAlongBuffer;
  }, [readAlongBuffer]);
  useEffect(() => {
    readAlongInterimRef.current = interim;
  }, [interim]);

  /**
   * 따라 읽기 평가 함수 — 발화가 끝났다고 판단되는 시점에서만 호출.
   * 호출 트리거: (a) STT onspeechend, (b) 1.5초 침묵, (c) 사용자 "지금 평가" 버튼.
   * 발화 중에는 호출하지 않음 → 사용자가 문장 도중 우연히 임계값 넘어도 자동 진행되지 않음.
   */
  const evaluateReadAlong = () => {
    if (practiceModeRef.current !== "readalong") return;
    const targets = readAlongTargetsRef.current;
    const idx0 = readAlongIdxRef.current;
    if (idx0 >= targets.length) return;
    const target = targets[idx0];
    if (!target) return;
    const combined = (readAlongBufferRef.current + " " + readAlongInterimRef.current).trim();
    if (!normalizeForCompare(combined)) return; // 빈 발화는 평가 스킵
    if (readAlongAdvanceTimerRef.current) return; // 이미 다음 문장 자동 진행 대기 중
    const threshold = READALONG_THRESHOLDS[readAlongDifficultyRef.current];
    const score = readAlongMatchScore(combined, target);
    const passed = score >= threshold;
    setReadAlongResult({ score, threshold, passed, spoken: combined });
    const qid = currentQuestionIdRef.current;
    // 발화 기록 누적 (통과/미달 모두) — 완료 화면 비교용
    if (qid) {
      setReadAlongSpokenByQ((prev) => {
        const arr = (prev[qid] ?? []).slice();
        // 배열 길이가 idx0보다 짧으면 빈 자리 채움
        while (arr.length <= idx0) arr.push(null);
        arr[idx0] = { idx: idx0, spoken: combined, score, passed };
        return { ...prev, [qid]: arr };
      });
    }
    if (passed) {
      const nextIdx = idx0 + 1;
      if (qid) {
        setReadAlongPassedByQ((prev) => ({
          ...prev,
          [qid]: Math.max(prev[qid] ?? 0, nextIdx),
        }));
      }
      const isLast = nextIdx >= targets.length;
      if (isLast) {
        toast.success(`전체 ${targets.length}개 통과 — 따라 읽기 완료! (${score}점)`);
      } else {
        toast.success(`${idx0 + 1}번 통과 ✓ (${score}점 / 기준 ${threshold}점)`);
      }
      setReadAlongEvaluating(true);
      // 1.2초 후 다음 문장 자동 진행 (잠깐 결과 보여주고). 마지막이면 자동 녹음 정지.
      readAlongAdvanceTimerRef.current = setTimeout(() => {
        setReadAlongBuffer("");
        setInterim("");
        setReadAlongResult(null);
        setReadAlongEvaluating(false);
        setReadAlongIdx(nextIdx);
        readAlongAdvanceTimerRef.current = null;
        if (isLast && wantRecordingRef.current) {
          stopRecording();
        }
      }, 1200);
    } else {
      toast.error(`미달 ${score}점 (기준 ${threshold}점) — 다시 시도하세요`);
      // 미달이면 buffer/interim 자동 리셋 → 다음 시도는 깨끗한 slate
      setReadAlongBuffer("");
      setInterim("");
    }
  };

  // 침묵 1.5초 시 자동 평가 트리거 (발화 중에는 타이머가 계속 리셋되어 평가 안 됨)
  useEffect(() => {
    if (practiceMode !== "readalong") return;
    if (readAlongEvaluating) return;
    if (readAlongAdvanceTimerRef.current) return;
    if (readAlongSilenceTimerRef.current) {
      clearTimeout(readAlongSilenceTimerRef.current);
      readAlongSilenceTimerRef.current = null;
    }
    const combined = (readAlongBuffer + " " + interim).trim();
    if (!normalizeForCompare(combined)) return;
    readAlongSilenceTimerRef.current = setTimeout(() => {
      evaluateReadAlong();
      readAlongSilenceTimerRef.current = null;
    }, 1500);
    return () => {
      if (readAlongSilenceTimerRef.current) {
        clearTimeout(readAlongSilenceTimerRef.current);
        readAlongSilenceTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readAlongBuffer, interim, practiceMode, readAlongEvaluating]);

  /** 따라 읽기 관련 타이머/상태 일괄 정리 */
  const resetReadAlongTransientState = () => {
    if (readAlongSilenceTimerRef.current) {
      clearTimeout(readAlongSilenceTimerRef.current);
      readAlongSilenceTimerRef.current = null;
    }
    if (readAlongAdvanceTimerRef.current) {
      clearTimeout(readAlongAdvanceTimerRef.current);
      readAlongAdvanceTimerRef.current = null;
    }
    setReadAlongResult(null);
    setReadAlongEvaluating(false);
  };

  const stopRecording = () => {
    wantRecordingRef.current = false;
    setRecording(false);
    setInterim("");
    setSttStatus("idle");
    setNoSpeechHint(false);
    resetReadAlongTransientState();
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
    rec.lang = sttLangRef.current;
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
      // 따라 읽기 모드: 발화 종료 즉시 평가 트리거 (1.5s 침묵 타이머 대신 즉시)
      if (practiceModeRef.current === "readalong") {
        // 약간의 지연을 둬서 마지막 final transcript가 buffer에 반영될 시간 확보
        setTimeout(() => {
          if (practiceModeRef.current === "readalong") {
            evaluateReadAlong();
          }
        }, 400);
      }
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
    resetReadAlongTransientState();
    setIdx((i) => Math.max(0, i - 1));
  };
  const goNext = () => {
    stopRecording();
    setShowAnswer(false);
    setEditingTranscript(false);
    setReadAlongIdx(0);
    setReadAlongBuffer("");
    resetReadAlongTransientState();
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
      const scholarsExpected = Array.from(extractScholars(q.expectedAnswer));
      const scholarsMentioned = Array.from(extractScholars(transcript)).filter((s) =>
        scholarsExpected.includes(s),
      );
      return { questionId: q.id, transcript, score, durationSec, scholarsExpected, scholarsMentioned };
    });
  }, [practiceSet, transcripts]);

  const averageScore = results.length
    ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
    : 0;

  /** 새 attempt를 attempts[] 앞에 push하고 최대 N개 유지 */
  const pushAttemptAndUpdate = async (attempt: DefensePracticeAttempt) => {
    if (!practiceSet) return;
    const prevAttempts = Array.isArray(practiceSet.attempts) ? practiceSet.attempts : [];
    const nextAttempts = [attempt, ...prevAttempts].slice(0, MAX_ATTEMPTS_HISTORY);
    await defensePracticesApi.update(practiceSet.id, {
      lastAttempt: attempt,
      attempts: nextAttempts,
      attemptCount: (practiceSet.attemptCount ?? 0) + 1,
      updatedAt: attempt.at,
    });
    qc.invalidateQueries({ queryKey: ["defense_practice_sets"] });
    qc.invalidateQueries({ queryKey: ["defense_practice_set", id] });
  };

  const handleSaveAttempt = async () => {
    if (!practiceSet) return;
    setSubmitting(true);
    try {
      const attempt: DefensePracticeAttempt = {
        at: new Date().toISOString(),
        mode: "answer",
        sttLang,
        averageScore,
        results,
      };
      await pushAttemptAndUpdate(attempt);
      toast.success("심사 답변 결과가 이력에 저장되었습니다.");
    } catch (e) {
      console.error(e);
      toast.error("결과 저장에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  /** 따라 읽기 모드 결과 저장 — 현재까지 통과한 문장 정보 기반 */
  const handleSaveReadAlongAttempt = async () => {
    if (!practiceSet) return;
    setSubmitting(true);
    try {
      const readalongResults = practiceSet.questions
        .map((q) => {
          const total = splitSentences(q.expectedAnswer).length;
          const passed = readAlongPassedByQ[q.id] ?? 0;
          return total > 0
            ? {
                questionId: q.id,
                totalSentences: total,
                passedSentences: Math.min(passed, total),
                difficulty: readAlongDifficulty,
                durationSec: durationsRef.current[q.id],
              }
            : null;
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);
      if (readalongResults.length === 0) {
        toast.warning("저장할 따라 읽기 기록이 없습니다.");
        return;
      }
      const totalSentences = readalongResults.reduce((s, r) => s + r.totalSentences, 0);
      const passedSentences = readalongResults.reduce((s, r) => s + r.passedSentences, 0);
      const passRate = totalSentences > 0
        ? Math.round((passedSentences / totalSentences) * 100)
        : 0;
      const attempt: DefensePracticeAttempt = {
        at: new Date().toISOString(),
        mode: "readalong",
        sttLang,
        averageScore: passRate,
        results: [],
        readalongResults,
      };
      await pushAttemptAndUpdate(attempt);
      toast.success(`따라 읽기 결과 저장됨 (통과율 ${passRate}%)`);
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

            {/* 이력 보기 패널 — attempts[] 누적 기록 */}
            {(() => {
              const attempts = Array.isArray(practiceSet.attempts) ? practiceSet.attempts : [];
              if (attempts.length === 0) return null;
              return (
                <div className="w-full rounded-lg border bg-card text-left">
                  <button
                    type="button"
                    onClick={() => setShowHistory((v) => !v)}
                    className="flex w-full items-center justify-between gap-2 px-4 py-3 text-sm font-semibold hover:bg-muted/40"
                  >
                    <span className="inline-flex items-center gap-2">
                      <History size={16} />
                      이력 보기
                      <Badge variant="secondary">{attempts.length}회</Badge>
                    </span>
                    {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {showHistory && (
                    <ol className="border-t divide-y">
                      {attempts.slice(0, 20).map((a, i) => {
                        const isOpen = expandedAttemptIdx === i;
                        const dt = (() => {
                          try { return new Date(a.at).toLocaleString("ko-KR"); }
                          catch { return a.at; }
                        })();
                        const modeLabel = a.mode === "readalong" ? "따라 읽기" : "심사 답변";
                        const modeColor = a.mode === "readalong"
                          ? "bg-indigo-500 text-white"
                          : "bg-blue-600 text-white";
                        const score = a.averageScore ?? 0;
                        const scoreColor = score >= 80
                          ? "bg-emerald-600"
                          : score >= 60
                          ? "bg-amber-500"
                          : "bg-rose-500";
                        return (
                          <li key={`${a.at}-${i}`} className="text-xs">
                            <button
                              type="button"
                              onClick={() => setExpandedAttemptIdx(isOpen ? null : i)}
                              className="flex w-full flex-wrap items-center gap-2 px-4 py-2 text-left hover:bg-muted/30"
                            >
                              <Badge className={modeColor}>{modeLabel}</Badge>
                              <Badge className={cn("text-white", scoreColor)}>{score}점</Badge>
                              {a.sttLang && (
                                <Badge variant="outline">
                                  {a.sttLang === "en-US" ? "EN" : "KO"}
                                </Badge>
                              )}
                              <span className="ml-auto text-muted-foreground">{dt}</span>
                              {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                            {isOpen && (
                              <div className="space-y-2 bg-muted/20 px-4 py-3 text-[11px]">
                                {a.mode === "readalong" && a.readalongResults?.length ? (
                                  <ul className="space-y-1">
                                    {a.readalongResults.map((r, ri) => {
                                      const q = practiceSet.questions.find((x) => x.id === r.questionId);
                                      const rate = r.totalSentences > 0
                                        ? Math.round((r.passedSentences / r.totalSentences) * 100)
                                        : 0;
                                      return (
                                        <li key={`${r.questionId}-${ri}`} className="rounded bg-background p-2">
                                          <div className="flex flex-wrap items-center gap-1">
                                            <span className="font-semibold">Q{ri + 1}</span>
                                            <Badge variant="outline" className="text-[10px]">
                                              난이도 {r.difficulty}
                                            </Badge>
                                            <span className="ml-auto">
                                              {r.passedSentences}/{r.totalSentences} ({rate}%)
                                            </span>
                                          </div>
                                          {q?.question && (
                                            <p className="mt-1 line-clamp-2 text-muted-foreground">
                                              {q.question}
                                            </p>
                                          )}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                ) : a.results?.length ? (
                                  <ul className="space-y-1">
                                    {a.results.map((r, ri) => {
                                      const q = practiceSet.questions.find((x) => x.id === r.questionId);
                                      const sc = r.score ?? 0;
                                      const scClr = sc >= 80
                                        ? "bg-emerald-600"
                                        : sc >= 60
                                        ? "bg-amber-500"
                                        : "bg-rose-500";
                                      return (
                                        <li key={`${r.questionId}-${ri}`} className="rounded bg-background p-2">
                                          <div className="flex flex-wrap items-center gap-1">
                                            <span className="font-semibold">Q{ri + 1}</span>
                                            <Badge className={cn("text-white text-[10px]", scClr)}>
                                              {sc}점
                                            </Badge>
                                            {r.durationSec ? (
                                              <span className="ml-auto text-muted-foreground">
                                                {r.durationSec}초
                                              </span>
                                            ) : null}
                                          </div>
                                          {q?.question && (
                                            <p className="mt-1 line-clamp-2 text-muted-foreground">
                                              {q.question}
                                            </p>
                                          )}
                                          {r.transcript && (
                                            <p className="mt-1 line-clamp-2 italic text-muted-foreground/80">
                                              “{r.transcript}”
                                            </p>
                                          )}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                ) : (
                                  <p className="italic text-muted-foreground">상세 기록이 없습니다.</p>
                                )}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>
              );
            })()}
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
              {expectedSegments.length > 0 && (
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
                      {Math.min(readAlongIdx, expectedSegments.length)} / {expectedSegments.length} 문장
                    </span>
                  )}
                </div>
              )}

              {/* STT 언어 선택 — 모든 모드 공통 (모범 답변이 있을 때만 노출 의미는 약하지만, 답변 모드에서도 영어 답변 가능) */}
              <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-2">
                <span className="text-xs font-semibold text-muted-foreground">인식 언어</span>
                <div className="inline-flex rounded-md border bg-background p-0.5 text-xs">
                  {(["ko-KR", "en-US"] as const).map((lng) => {
                    const label = lng === "ko-KR" ? "한국어" : "English";
                    const active = sttLang === lng;
                    return (
                      <button
                        key={lng}
                        type="button"
                        onClick={() => {
                          if (sttLang === lng) return;
                          setSttLang(lng);
                          sttLangRef.current = lng;
                          // 녹음 중이라면 새 언어로 즉시 재시작
                          if (recording) {
                            stopRecording();
                            setTimeout(() => { startRecording(); }, 200);
                          }
                        }}
                        className={cn(
                          "rounded px-3 py-1 font-medium transition-colors",
                          active
                            ? "bg-foreground text-background"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  Web Speech API는 동시 다중 언어 미지원 — 발화 전에 선택
                </span>
              </div>

              {/* 따라 읽기 난이도 선택 */}
              {practiceMode === "readalong" && expectedSegments.length > 0 && (
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

              {/* 따라 읽기 단위 선택 (난이도 아래) — 1문장 / 문단 */}
              {practiceMode === "readalong" && current?.expectedAnswer && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-2">
                  <span className="text-xs font-semibold text-muted-foreground">단위</span>
                  <div className="inline-flex rounded-md border bg-background p-0.5 text-xs">
                    {(["sentence", "paragraph"] as const).map((u) => {
                      const label = u === "sentence" ? "1문장" : "문단";
                      const active = readAlongUnit === u;
                      return (
                        <button
                          key={u}
                          type="button"
                          onClick={() => {
                            if (readAlongUnit === u) return;
                            setReadAlongUnit(u);
                            setReadAlongIdx(0);
                            setReadAlongBuffer("");
                            setReadAlongResult(null);
                          }}
                          className={cn(
                            "rounded px-3 py-1 font-medium transition-colors",
                            active
                              ? "bg-foreground text-background"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {readAlongUnit === "paragraph"
                      ? "문단 단위(빈 줄 기준) — 한 번에 길게 따라 읽기"
                      : "1문장 단위 — 짧게 끊어 따라 읽기"}
                    {" · 분리 결과: "}{expectedSegments.length}개
                  </span>
                </div>
              )}

              {/* 따라 읽기 모드 패널 */}
              {practiceMode === "readalong" && expectedSegments.length > 0 && (
                <div className="rounded-xl border bg-card p-5">
                  {readAlongIdx >= expectedSegments.length ? (
                    (() => {
                      const qid = current?.id ?? "";
                      const spokenLog = readAlongSpokenByQ[qid] ?? [];
                      const unitLabel = readAlongUnit === "paragraph" ? "문단" : "문장";
                      return (
                        <div className="space-y-4">
                          <div className="flex flex-col items-center gap-1 text-center">
                            <CheckCircle2 size={36} className="text-emerald-500" />
                            <p className="text-base font-semibold">전체 따라 읽기 완료!</p>
                            <p className="text-xs text-muted-foreground">
                              총 {expectedSegments.length}개 {unitLabel}을 모두 통과했습니다.
                              {wantRecordingRef.current === false && recording === false && (
                                <span className="ml-1 text-emerald-600">· 녹음 자동 종료됨</span>
                              )}
                            </p>
                          </div>

                          {/* 발화 vs 모범 비교 (단위별) */}
                          <div className="rounded-lg border bg-background">
                            <div className="flex items-center justify-between border-b px-3 py-2 text-xs">
                              <span className="font-semibold">{unitLabel} 단위 비교</span>
                              <span className="text-muted-foreground">내 발화 / 모범 답변</span>
                            </div>
                            <ul className="divide-y">
                              {expectedSegments.map((seg, i) => {
                                const log = spokenLog[i];
                                const score = log?.score ?? 0;
                                const passed = log?.passed ?? false;
                                return (
                                  <li key={i} className="px-3 py-2 text-sm">
                                    <div className="mb-1 flex items-center gap-2 text-[11px]">
                                      <span className="font-mono text-muted-foreground">{i + 1}.</span>
                                      <span
                                        className={cn(
                                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                          passed
                                            ? "bg-emerald-500 text-white"
                                            : log
                                            ? "bg-amber-500 text-white"
                                            : "bg-zinc-300 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200",
                                        )}
                                      >
                                        {log ? `${score}점` : "기록 없음"}
                                      </span>
                                    </div>
                                    <div className="grid gap-2 md:grid-cols-2">
                                      <div className="rounded-md bg-muted/40 p-2">
                                        <p className="mb-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                                          내 발화
                                        </p>
                                        <p className="whitespace-pre-wrap leading-relaxed">
                                          {log?.spoken || (
                                            <span className="italic text-muted-foreground">기록 없음</span>
                                          )}
                                        </p>
                                      </div>
                                      <div className="rounded-md bg-emerald-50 p-2 dark:bg-emerald-950/30">
                                        <p className="mb-0.5 text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-200">
                                          모범 답변
                                        </p>
                                        <p className="whitespace-pre-wrap leading-relaxed text-emerald-950 dark:text-emerald-50">
                                          {renderWithScholarHighlight(seg)}
                                        </p>
                                      </div>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>

                          {/* 모범 답변 인라인 편집 */}
                          <div className="rounded-lg border bg-card p-3">
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                              <p className="text-xs font-semibold">모범 답변 수정</p>
                              {!editingExpected ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditedExpectedDraft(current?.expectedAnswer ?? "");
                                    setEditingExpected(true);
                                  }}
                                >
                                  <Pencil size={12} className="mr-1" /> 편집
                                </Button>
                              ) : (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingExpected(false)}
                                  >
                                    취소
                                  </Button>
                                  <Button
                                    size="sm"
                                    disabled={submitting || !current}
                                    onClick={async () => {
                                      if (!practiceSet || !current) return;
                                      setSubmitting(true);
                                      try {
                                        const newQuestions = practiceSet.questions.map((q) =>
                                          q.id === current.id
                                            ? { ...q, expectedAnswer: editedExpectedDraft }
                                            : q,
                                        );
                                        await defensePracticesApi.update(practiceSet.id, {
                                          questions: newQuestions,
                                          updatedAt: new Date().toISOString(),
                                        });
                                        qc.invalidateQueries({ queryKey: ["defense_practice_sets"] });
                                        qc.invalidateQueries({ queryKey: ["defense_practice_set", id] });
                                        setEditingExpected(false);
                                        toast.success("모범 답변이 수정되었습니다.");
                                      } catch (e) {
                                        console.error(e);
                                        toast.error("모범 답변 저장에 실패했습니다.");
                                      } finally {
                                        setSubmitting(false);
                                      }
                                    }}
                                  >
                                    {submitting ? (
                                      <Loader2 size={12} className="mr-1 animate-spin" />
                                    ) : (
                                      <CheckCircle2 size={12} className="mr-1" />
                                    )}
                                    저장
                                  </Button>
                                </div>
                              )}
                            </div>
                            {editingExpected ? (
                              <Textarea
                                value={editedExpectedDraft}
                                onChange={(e) => setEditedExpectedDraft(e.target.value)}
                                rows={Math.max(6, expectedSegments.length + 2)}
                                placeholder="모범 답변을 수정하세요. 빈 줄(엔터 두 번)으로 문단을 구분하면 '문단' 단위 따라 읽기에서 분리됩니다."
                                className="text-sm"
                              />
                            ) : (
                              <p className="whitespace-pre-wrap rounded-md bg-muted/30 p-2 text-sm leading-relaxed">
                                {current?.expectedAnswer}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setReadAlongIdx(0);
                                setReadAlongBuffer("");
                                setReadAlongResult(null);
                                if (current?.id) {
                                  setReadAlongSpokenByQ((prev) => ({ ...prev, [current.id]: [] }));
                                }
                              }}
                            >
                              <RotateCcw size={12} className="mr-1" /> 처음부터
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleSaveReadAlongAttempt}
                              disabled={submitting}
                            >
                              {submitting ? (
                                <Loader2 size={12} className="mr-1 animate-spin" />
                              ) : (
                                <CheckCircle2 size={12} className="mr-1" />
                              )}
                              이번 따라 읽기 이력 저장
                            </Button>
                            <Button size="sm" onClick={goNext} className="ml-auto">
                              다음 질문 <ChevronRight size={14} className="ml-1" />
                            </Button>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    (() => {
                      const target = expectedSegments[readAlongIdx];
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
                              {readAlongIdx + 1} / {expectedSegments.length}
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
                            {renderWithScholarHighlight(target)}
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

                          {/* 평가 결과 (있을 때만) — 발화 종료 후 표시 */}
                          {readAlongResult && (
                            <div
                              className={cn(
                                "rounded-lg border-2 p-3 text-sm",
                                readAlongResult.passed
                                  ? "border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100"
                                  : "border-rose-400 bg-rose-50 text-rose-950 dark:bg-rose-950/40 dark:text-rose-100",
                              )}
                            >
                              <p className="font-semibold">
                                {readAlongResult.passed
                                  ? `통과 ✓ ${readAlongResult.score}점 (기준 ${readAlongResult.threshold}점)`
                                  : `미달 — ${readAlongResult.score}점 (기준 ${readAlongResult.threshold}점)`}
                              </p>
                              <p className="mt-1 text-[11px] opacity-80">
                                {readAlongResult.passed
                                  ? "잠시 후 다음 문장으로 진행됩니다…"
                                  : "다시 시도하거나 난이도를 조정해보세요."}
                              </p>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={evaluateReadAlong}
                              disabled={
                                readAlongEvaluating ||
                                (!readAlongBuffer.trim() && !interim.trim())
                              }
                            >
                              <CheckCircle2 size={12} className="mr-1" /> 지금 평가
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setReadAlongBuffer("");
                                setInterim("");
                                setReadAlongResult(null);
                              }}
                              disabled={!readAlongBuffer && !interim && !readAlongResult}
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
                                setReadAlongResult(null);
                                setReadAlongIdx((i) => Math.min(expectedSegments.length, i + 1));
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
                                  setReadAlongResult(null);
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
                    {shouldShowWaitCountdown() && (
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
                      문장을 다 말하고 1.5초 멈추면 자동 평가 → 통과 시 다음 문장으로
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
                        {shouldShowWaitCountdown() && (
                          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border bg-background px-2 py-0.5">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">전사 대기</span>
                            <span
                              key={waitCountdown}
                              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold text-white"
                            >
                              {waitCountdown}
                            </span>
                          </span>
                        )}
                      </div>
                      {/* 따라 읽기 모드: 마이크 레벨 미터도 함께 노출 (진단 용이) */}
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
                      {noSpeechHint && (
                        <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100">
                          5초간 음성이 감지되지 않았어요 — 마이크 레벨이 움직이는지 먼저 확인하세요.
                        </div>
                      )}
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
