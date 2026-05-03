"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { archiveConceptsApi } from "@/lib/bkend";
import type { ArchiveConcept, TheoryConcept } from "@/types";
import {
  X, ChevronLeft, ChevronRight, Save, Loader2, Sparkles, MessageSquareQuote,
  School, BookOpen, FlaskConical, Stethoscope, ArrowRight, AlertTriangle,
  Repeat, Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FormState, SetField } from "./ResearchReportEditor";
import type {
  CauseType,
  EducationFormat,
  EvidenceType,
  ProblemCauseItem,
  ProblemEvidenceItem,
  ResearchApproach,
  TheoryCard,
} from "@/types";
import {
  CAUSE_TYPE_LABELS,
  EVIDENCE_TYPE_LABELS,
  RESEARCH_APPROACH_HINTS,
  RESEARCH_APPROACH_LABELS,
} from "@/types";

/**
 * Sprint 57: "diagnosis" 챕터 신설 (1과 2 사이) + bridge 챕터로 챕터 전환 시각화
 * Sprint 58: "approach" 챕터 (패러다임 선택) + "inquiry" 챕터 (생성·구성형 트랙)
 */
type Chapter =
  | "approach"
  | "field"
  | "diagnosis"
  | "inquiry"
  | "action"
  | "mixed"
  | "theory"
  | "prior"
  | "bridge";

const CHAPTER_META: Record<
  Chapter,
  { label: string; icon: React.ElementType; color: string }
> = {
  approach: { label: "연구 접근", icon: Sparkles, color: "from-violet-500 to-fuchsia-500" },
  field: { label: "교육현장의 문제 정의", icon: School, color: "from-amber-500 to-orange-500" },
  diagnosis: { label: "문제 진단", icon: Stethoscope, color: "from-rose-500 to-pink-500" },
  inquiry: { label: "맥락 탐구", icon: Sparkles, color: "from-cyan-500 to-sky-500" },
  action: { label: "액션 사이클", icon: Repeat, color: "from-orange-500 to-red-500" },
  mixed: { label: "혼합 디자인", icon: Layers, color: "from-indigo-500 to-purple-500" },
  theory: { label: "교육공학 이론", icon: BookOpen, color: "from-emerald-500 to-teal-500" },
  prior: { label: "선행연구 분석", icon: FlaskConical, color: "from-blue-500 to-indigo-500" },
  bridge: { label: "연결", icon: ArrowRight, color: "from-slate-400 to-slate-500" },
};

/** 챕터 진행률 표시에서 bridge / approach 는 제외. 1.5 (diagnosis|inquiry|action|mixed) 는 트랙에 따라 자동 분기 */
const REAL_CHAPTERS: Chapter[] = ["field", "diagnosis", "inquiry", "action", "mixed", "theory", "prior"];

interface SlideDef {
  id: string;
  chapter: Chapter;
  prompt: string;
  hint?: string;
  optional?: boolean;
  render: (form: FormState, setField: SetField) => React.ReactNode;
  /** 직전 챕터 답변 요약을 노출 (cross-ref) */
  crossRef?: (form: FormState) => React.ReactNode;
  /** 일관성 lint — 약한 연결 감지 시 경고 노출 */
  lint?: (form: FormState) => string | null;
  /** Sprint 58: 이 슬라이드가 노출되는 ResearchApproach 트랙 — 미지정이면 모든 트랙 */
  approaches?: ResearchApproach[];
}

const FORMAT_OPTIONS: { value: EducationFormat; label: string }[] = [
  { value: "offline", label: "대면" },
  { value: "online", label: "비대면" },
  { value: "blended", label: "혼합" },
];

function newId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function ensureFirstTheoryCard(form: FormState, setField: SetField, patch: Partial<TheoryCard>) {
  if (form.theoryCards.length === 0) {
    const card: TheoryCard = {
      id: newId(),
      name: "",
      scholar: "",
      year: "",
      selectionReason: "",
      concepts: [],
      problemLink: "",
      ...patch,
    };
    setField("theoryCards", [card]);
    return;
  }
  const next = [...form.theoryCards];
  next[0] = { ...next[0], ...patch };
  setField("theoryCards", next);
}

// ─── Sprint 57 helpers ──────────────────────────────────────────────────────
function upsertEvidence(
  form: FormState,
  setField: SetField,
  index: number,
  patch: Partial<ProblemEvidenceItem>,
) {
  const next = [...form.problemEvidences];
  if (next[index]) next[index] = { ...next[index], ...patch };
  else next[index] = { id: newId(), type: "" as EvidenceType, content: "", ...patch };
  setField("problemEvidences", next);
}
function removeEvidence(form: FormState, setField: SetField, index: number) {
  const next = form.problemEvidences.filter((_, i) => i !== index);
  setField("problemEvidences", next);
}
function addEvidence(form: FormState, setField: SetField) {
  setField("problemEvidences", [
    ...form.problemEvidences,
    { id: newId(), type: "" as EvidenceType, content: "" },
  ]);
}

function getCauseByType(form: FormState, type: CauseType): ProblemCauseItem | undefined {
  return form.problemCauses.find((c) => c.type === type);
}
function setCauseByType(
  form: FormState,
  setField: SetField,
  type: CauseType,
  content: string,
) {
  const existing = getCauseByType(form, type);
  let next: ProblemCauseItem[];
  if (existing) {
    next = form.problemCauses.map((c) =>
      c.id === existing.id ? { ...c, content } : c,
    );
  } else {
    next = [...form.problemCauses, { id: newId(), type, content }];
  }
  setField("problemCauses", next);
}

/** 한국어/영문 키워드 단순 추출 — 2자 이상 토큰 */
function extractKeywords(text: string): string[] {
  if (!text) return [];
  const tokens = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2);
  return Array.from(new Set(tokens));
}

/** A 텍스트의 키워드가 B 텍스트에 등장하는지 — 일관성 lint 용 */
function hasKeywordOverlap(a: string, b: string): boolean {
  if (!a || !b) return false;
  const ks = extractKeywords(a);
  if (ks.length === 0) return false;
  const lowerB = b.toLowerCase();
  return ks.some((k) => lowerB.includes(k));
}

const EVIDENCE_OPTIONS: { value: EvidenceType; label: string }[] = [
  { value: "" as EvidenceType, label: "유형" },
  ...(Object.entries(EVIDENCE_TYPE_LABELS) as [Exclude<EvidenceType, "">, string][]).map(
    ([value, label]) => ({ value: value as EvidenceType, label }),
  ),
];

const APPROACH_OPTIONS: { value: Exclude<ResearchApproach, "">; }[] = [
  { value: "analytical" },
  { value: "generative" },
  { value: "action_research" },
  { value: "mixed_methods" },
  { value: "free" },
];

// ─── Sprint 59: archive_concepts 자동 추천 ──────────────────────────────────
function ArchiveConceptRecommender({
  query,
  onPick,
  alreadyPicked,
}: {
  query: string;
  onPick: (c: ArchiveConcept) => void;
  alreadyPicked: Set<string>;
}) {
  const { data: res } = useQuery({
    queryKey: ["archive-concepts-all"],
    queryFn: () => archiveConceptsApi.list(),
    staleTime: 30 * 60_000,
  });
  const all = (res?.data ?? []) as ArchiveConcept[];
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const scored: { c: ArchiveConcept; score: number }[] = [];
    for (const c of all) {
      const name = c.name.toLowerCase();
      const altText = (c.altNames ?? []).join(" ").toLowerCase();
      const tagText = (c.tags ?? []).join(" ").toLowerCase();
      let score = 0;
      if (name.includes(q)) score += 5;
      if (name.startsWith(q)) score += 3;
      if (altText.includes(q)) score += 3;
      if (tagText.includes(q)) score += 1;
      if (score > 0) scored.push({ c, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 6).map((s) => s.c);
  }, [all, query]);

  if (matches.length === 0) return null;
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
      <p className="text-[11px] font-semibold text-emerald-900">
        🔍 archive 매칭 개념 — 클릭 시 이론카드 핵심개념 목록에 자동 추가
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {matches.map((c) => {
          const picked = alreadyPicked.has(c.name.trim().toLowerCase());
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => !picked && onPick(c)}
              disabled={picked}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                picked
                  ? "cursor-not-allowed bg-emerald-200 text-emerald-700"
                  : "bg-white text-emerald-900 ring-1 ring-emerald-300 hover:bg-emerald-100",
              )}
              title={c.description ?? ""}
              aria-label={`${c.name} 개념 추가`}
            >
              {picked ? "✓ " : "+ "}
              {c.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sprint 61: 연구 흐름 Logic Map ─────────────────────────────────────────
interface LogicNode {
  id: "field" | "middle" | "theory" | "prior";
  label: string;
  /** 0~100 채움 정도 */
  fill: number;
  /** 1.5 챕터 선택 라벨 (진단/탐구/액션/혼합/skip) */
  sublabel?: string;
  /** 다음 노드와의 연결 강도 (0~100). 마지막 노드는 무시. */
  bridgeStrength: number;
}

function calcLogicMap(form: FormState): LogicNode[] {
  const a = form.researchApproach;

  // 1. field
  const fieldChecks = [
    form.fieldAudience,
    form.fieldFormat,
    form.fieldSubject,
    form.problemPhenomena.find((p) => p.trim()),
    form.problemImpact,
    form.problemImportance,
  ];
  const fieldFill = Math.round(
    (fieldChecks.filter((v) => (v ?? "").toString().trim().length > 0).length / fieldChecks.length) * 100,
  );

  // 1.5 middle (approach-dependent)
  let middleFill = 0;
  let middleLabel = "1.5 (skip)";
  let middleText = "";
  if (a === "analytical") {
    const checks = [
      form.problemEvidences.length > 0,
      form.problemCauses.length > 0,
      form.diagnosisAttempts.trim().length > 0,
      form.diagnosisGap.trim().length > 0,
      form.diagnosisPrimaryCause.trim().length > 0,
    ];
    middleFill = Math.round((checks.filter(Boolean).length / checks.length) * 100);
    middleLabel = "문제 진단";
    middleText = form.diagnosisPrimaryCause;
  } else if (a === "generative") {
    const fields = [form.inquiryMeaning, form.inquiryContext, form.inquiryCycle];
    middleFill = Math.round((fields.filter((s) => s.trim().length > 0).length / fields.length) * 100);
    middleLabel = "맥락 탐구";
    middleText = `${form.inquiryMeaning} ${form.inquiryContext}`;
  } else if (a === "action_research") {
    const fields = [form.actionRole, form.actionCycle, form.actionCommunity];
    middleFill = Math.round((fields.filter((s) => s.trim().length > 0).length / fields.length) * 100);
    middleLabel = "액션 사이클";
    middleText = `${form.actionRole} ${form.actionCycle}`;
  } else if (a === "mixed_methods") {
    const fields = [form.mixedDesign, form.mixedQuant, form.mixedQual, form.mixedIntegration];
    middleFill = Math.round((fields.filter((s) => s.trim().length > 0).length / fields.length) * 100);
    middleLabel = "혼합 디자인";
    middleText = form.mixedDesign;
  } else if (a === "free") {
    middleFill = 0;
    middleLabel = "1.5 (skip)";
    middleText = "";
  } else {
    middleFill = 0;
    middleLabel = "1.5 (선택 전)";
    middleText = "";
  }

  // 2. theory
  const card = form.theoryCards[0];
  const theoryChecks = [card?.name, card?.selectionReason, card?.problemLink];
  const theoryFill = card
    ? Math.round((theoryChecks.filter((v) => (v ?? "").trim().length > 0).length / theoryChecks.length) * 100)
    : 0;

  // 3. prior
  const pr = form.priorResearchAnalysis.trim().length;
  const priorFill = pr > 200 ? 100 : pr > 50 ? 60 : pr > 10 ? 30 : 0;

  // 연결 강도: 키워드 overlap (0/40/100 단계)
  const phenomenonText = form.problemPhenomena.filter((p) => p.trim()).join(" ");
  const reason = card?.selectionReason ?? "";
  const theoryName = card?.name ?? "";
  const prior = form.priorResearchAnalysis;

  const fieldToMiddle =
    !middleText ? 0 : hasKeywordOverlap(phenomenonText, middleText) ? 100 : 40;
  const middleToTheory =
    !middleText || !reason ? 0 : hasKeywordOverlap(middleText, reason) ? 100 : 40;
  const theoryToPrior =
    !theoryName || !prior ? 0 : hasKeywordOverlap(theoryName, prior) ? 100 : 40;

  return [
    { id: "field", label: "1. 현장 문제", fill: fieldFill, bridgeStrength: fieldToMiddle },
    { id: "middle", label: "1.5 " + middleLabel, fill: middleFill, sublabel: middleLabel, bridgeStrength: middleToTheory },
    { id: "theory", label: "2. 교육공학 이론", fill: theoryFill, bridgeStrength: theoryToPrior },
    { id: "prior", label: "3. 선행연구", fill: priorFill, bridgeStrength: 0 },
  ];
}

function NodeFillBar({ percent }: { percent: number }) {
  const color =
    percent >= 80 ? "bg-emerald-500" : percent >= 40 ? "bg-amber-500" : "bg-rose-400";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
      <div
        className={cn("h-full transition-all", color)}
        style={{ width: `${Math.max(2, percent)}%` }}
      />
    </div>
  );
}

function BridgeArrow({ strength }: { strength: number }) {
  const cls =
    strength >= 80
      ? "border-emerald-500"
      : strength >= 40
        ? "border-amber-500 border-dashed"
        : "border-rose-300 border-dotted";
  const label = strength >= 80 ? "강한 연결" : strength >= 40 ? "연결 약함" : "연결 거의 없음";
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 px-1">
      <div className={cn("h-0 w-10 border-t-2 sm:w-16", cls)} />
      <span className="text-[9px] text-muted-foreground">{label}</span>
    </div>
  );
}

function ResearchLogicMap({ form }: { form: FormState }) {
  const nodes = useMemo(() => calcLogicMap(form), [form]);
  const overall = Math.round(nodes.reduce((s, n) => s + n.fill, 0) / nodes.length);
  const overallStrength = Math.round(
    (nodes[0].bridgeStrength + nodes[1].bridgeStrength + nodes[2].bridgeStrength) / 3,
  );

  return (
    <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-blue-50/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-primary">📐 연구 흐름 Logic Map</p>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>채움 <strong className="text-foreground">{overall}%</strong></span>
          <span>연결 <strong className="text-foreground">{overallStrength}%</strong></span>
        </div>
      </div>
      <div className="mt-3 flex items-stretch overflow-x-auto pb-1">
        {nodes.map((n, i) => (
          <div key={n.id} className="flex shrink-0 items-stretch">
            <div className="flex w-28 flex-col items-center gap-1 rounded-xl border bg-white p-2 shadow-sm sm:w-32">
              <p className="text-[10px] font-semibold text-foreground sm:text-[11px]">{n.label}</p>
              <NodeFillBar percent={n.fill} />
              <p className="text-[10px] tabular-nums text-muted-foreground">{n.fill}%</p>
            </div>
            {i < nodes.length - 1 && <BridgeArrow strength={n.bridgeStrength} />}
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        🟢 강한 연결 (키워드 overlap) · 🟡 연결 약함 · 🔴 거의 없음. 채움 ≥ 80% + 연결 ≥ 80% 이면 논리 흐름이 단단합니다.
      </p>
    </div>
  );
}

function TheoryNameRenderer({ form, setField }: { form: FormState; setField: SetField }) {
  const card = form.theoryCards[0];
  const conceptNamesPicked = useMemo(
    () =>
      new Set(
        (card?.concepts ?? []).map((k) => k.name.trim().toLowerCase()),
      ),
    [card?.concepts],
  );

  function handlePickConcept(c: ArchiveConcept) {
    const cardNow = form.theoryCards[0];
    const newConcept: TheoryConcept = {
      id: newId(),
      name: c.name,
      definition: c.description ?? "",
    };
    const nextConcepts = [...(cardNow?.concepts ?? []), newConcept];
    ensureFirstTheoryCard(form, setField, { concepts: nextConcepts });
  }

  return (
    <div className="space-y-2">
      <Input
        value={card?.name ?? ""}
        onChange={(e) => ensureFirstTheoryCard(form, setField, { name: e.target.value })}
        placeholder="이론명 (예: 사회적 구성주의)"
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          value={card?.scholar ?? ""}
          onChange={(e) => ensureFirstTheoryCard(form, setField, { scholar: e.target.value })}
          placeholder="학자 (예: Vygotsky)"
          className="bg-white"
          style={{ fontSize: "16px" }}
        />
        <Input
          value={card?.year ?? ""}
          onChange={(e) => ensureFirstTheoryCard(form, setField, { year: e.target.value })}
          placeholder="연도 (예: 1978)"
          className="bg-white"
          style={{ fontSize: "16px" }}
        />
      </div>
      <ArchiveConceptRecommender
        query={card?.name ?? ""}
        onPick={handlePickConcept}
        alreadyPicked={conceptNamesPicked}
      />
      {(card?.concepts ?? []).length > 0 && (
        <div className="rounded-md border bg-white p-2.5">
          <p className="text-[11px] font-semibold text-muted-foreground">
            추가된 핵심 개념 ({(card?.concepts ?? []).length}개)
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {(card?.concepts ?? []).map((k) => (
              <span
                key={k.id}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] text-emerald-900"
              >
                {k.name}
                <button
                  type="button"
                  onClick={() => {
                    const next = (card?.concepts ?? []).filter((x) => x.id !== k.id);
                    ensureFirstTheoryCard(form, setField, { concepts: next });
                  }}
                  className="ml-0.5 text-emerald-700 hover:text-rose-600"
                  aria-label={`${k.name} 개념 삭제`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const SLIDES: SlideDef[] = [
  // ── Sprint 58: 연구 접근 패러다임 선택 (가장 첫 슬라이드)
  {
    id: "approach-select",
    chapter: "approach",
    prompt: "어떤 연구 접근으로 작성하실 건가요?",
    hint: "선택에 따라 1.5 챕터가 분기됩니다 — 분석형은 ‘진단 5단계’, 생성형은 ‘맥락 탐구 3단계’, 자유는 1.5 챕터 자체를 건너뜁니다. 언제든 다시 바꿀 수 있어요.",
    render: (form, setField) => (
      <div className="space-y-2">
        {APPROACH_OPTIONS.map((opt) => {
          const active = form.researchApproach === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setField("researchApproach", opt.value)}
              className={cn(
                "w-full rounded-xl border-2 p-4 text-left transition-all",
                active
                  ? "border-[#003876] bg-[#003876]/5 shadow-sm"
                  : "border-muted bg-white hover:border-[#003876]/40 hover:bg-blue-50/40",
              )}
            >
              <div className="flex items-center gap-2 text-base font-semibold">
                {active && <span className="inline-block h-2 w-2 rounded-full bg-[#003876]" />}
                {RESEARCH_APPROACH_LABELS[opt.value]}
              </div>
              <p className={cn("mt-1.5 text-xs leading-relaxed", active ? "text-foreground" : "text-muted-foreground")}>
                {RESEARCH_APPROACH_HINTS[opt.value]}
              </p>
            </button>
          );
        })}
      </div>
    ),
  },
  // ── Chapter 1: 교육현장의 문제 정의
  {
    id: "field-audience",
    chapter: "field",
    prompt: "이 연구는 누구를 위한 것인가요?",
    hint: "학습자(예: 대학교 1학년, 초등 5학년) · 인원수 · 주요 특성을 한 문장으로 적어보세요.",
    render: (form, setField) => (
      <Input
        value={form.fieldAudience}
        onChange={(e) => setField("fieldAudience", e.target.value)}
        placeholder="예: 교육공학과 학부생 30명"
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
  },
  {
    id: "field-format",
    chapter: "field",
    prompt: "어떤 교육 형식을 다루나요?",
    hint: "대면 / 비대면 / 혼합(블렌디드) 중 가장 가까운 것을 골라주세요.",
    render: (form, setField) => (
      <div className="grid grid-cols-3 gap-3">
        {FORMAT_OPTIONS.map((opt) => {
          const active = form.fieldFormat === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setField("fieldFormat", opt.value)}
              className={cn(
                "rounded-xl border-2 px-4 py-4 text-base font-semibold transition-all",
                active
                  ? "border-[#003876] bg-[#003876]/5 text-[#003876] shadow-sm"
                  : "border-muted bg-white text-muted-foreground hover:border-[#003876]/40 hover:bg-blue-50/40",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    ),
  },
  {
    id: "field-subject",
    chapter: "field",
    prompt: "어떤 과목·주제를 다루나요?",
    hint: "과목명, 단원, 학습 주제 등 구체적으로 적어주세요.",
    render: (form, setField) => (
      <Input
        value={form.fieldSubject}
        onChange={(e) => setField("fieldSubject", e.target.value)}
        placeholder="예: 교육방법 및 교육공학 - 협력학습"
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
  },
  {
    id: "field-phenomenon",
    chapter: "field",
    prompt: "현장에서 어떤 문제(현상)를 관찰하셨나요?",
    hint: "관찰 가능한 사실 위주로. 추상적 진단보다는 실제 장면을 적어보세요.",
    render: (form, setField) => {
      const list = form.problemPhenomena.length > 0 ? form.problemPhenomena : [""];
      return (
        <Textarea
          value={list[0] ?? ""}
          onChange={(e) => {
            const next = [...list];
            next[0] = e.target.value;
            setField("problemPhenomena", next);
          }}
          placeholder="예: 그룹 활동 시 1~2명이 발표를 도맡고 나머지는 침묵함"
          rows={4}
          className="bg-white text-base"
          style={{ fontSize: "16px" }}
        />
      );
    },
  },
  {
    id: "field-impact",
    chapter: "field",
    prompt: "이 문제는 어떤 영향을 미치나요?",
    hint: "학습자/교수자/현장에 미치는 단기·장기 영향을 자유롭게 적어주세요.",
    render: (form, setField) => (
      <Textarea
        value={form.problemImpact}
        onChange={(e) => setField("problemImpact", e.target.value)}
        placeholder="예: 학습자 간 참여 격차가 누적되어, 일부 학생은 협력 학습의 장점을 경험하지 못함"
        rows={5}
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
  },
  {
    id: "field-importance",
    chapter: "field",
    prompt: "이 문제는 왜 중요한가요?",
    hint: "사회적 가치, 교육과정·정책 맥락, 후속 학습/진로에 미치는 영향 등을 적어주세요.",
    render: (form, setField) => (
      <Textarea
        value={form.problemImportance}
        onChange={(e) => setField("problemImportance", e.target.value)}
        placeholder="예: 협력 역량은 2022 개정 교육과정의 핵심 역량이며, 미래 직무 환경에서도 ..."
        rows={5}
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
  },
  {
    id: "field-scope-audience",
    chapter: "field",
    prompt: "연구 대상 범위는 어디까지인가요?",
    hint: "대상의 학년·인원·기간 등 구체적인 범위를 한 문장으로.",
    optional: true,
    render: (form, setField) => (
      <Input
        value={form.scopeAudience}
        onChange={(e) => setField("scopeAudience", e.target.value)}
        placeholder="예: A 대학 사범대학 2학년 1학기 수강생 28명"
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
  },
  {
    id: "field-scope-context",
    chapter: "field",
    prompt: "어떤 맥락(상황)에서 진행되나요?",
    hint: "강의 형태, 회기 수, 도구·플랫폼 등을 적어주세요.",
    optional: true,
    render: (form, setField) => (
      <Input
        value={form.scopeContext}
        onChange={(e) => setField("scopeContext", e.target.value)}
        placeholder="예: 8주간 주 1회 90분 대면 수업, Padlet · Slack 사용"
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
  },
  {
    id: "field-scope-exclude",
    chapter: "field",
    prompt: "이 연구에서 제외할 범위는?",
    hint: "다루지 않을 학년/매체/유형을 명시하면 후속 비판을 사전에 방어할 수 있어요.",
    optional: true,
    render: (form, setField) => (
      <Input
        value={form.scopeExclusion}
        onChange={(e) => setField("scopeExclusion", e.target.value)}
        placeholder="예: 비대면 수업, 대학원생, 4학년은 제외"
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
  },

  // ── Bridge: field → diagnosis (Sprint 57, analytical 트랙 한정)
  {
    id: "bridge-field-diag",
    chapter: "bridge",
    approaches: ["analytical"],
    prompt: "이제 정의한 현상을 다층적으로 진단해보겠습니다",
    hint: "관찰된 문제를 학습자·수업설계·환경의 어느 층위에서 비롯되는지 분해합니다. 진단 결과가 다음 챕터(이론 선택)의 근거가 됩니다. (※ 본 진단 흐름은 ADDIE·체제적 교수설계 등 ‘분석·처방형’ 패러다임에 가깝습니다. 구성주의·DBR·참여실행연구 같은 ‘생성형’ 접근이라면 다음 5개 슬라이드의 답을 비워두고 통과해도 무방하며, 후속 업데이트에서 별도 트랙이 추가될 예정입니다.)",
    optional: true,
    render: (form) => {
      const phenomena = form.problemPhenomena.filter((p) => p.trim()).slice(0, 3);
      return (
        <div className="rounded-xl border-2 border-dashed border-rose-200 bg-rose-50/50 p-4 text-sm">
          <p className="font-semibold text-rose-900">정의한 현상 미리보기</p>
          {phenomena.length === 0 ? (
            <p className="mt-2 text-muted-foreground">아직 현상이 입력되지 않았어요.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-rose-900/90">
              {phenomena.map((p, i) => (
                <li key={i} className="line-clamp-2">• {p}</li>
              ))}
            </ul>
          )}
          <p className="mt-3 rounded-md bg-white/60 px-2.5 py-1.5 text-[11px] text-rose-900/80 ring-1 ring-rose-200">
            ⓘ 분석·처방형 트랙 — 구성주의/DBR 접근은 다음 단계에서 비워두고 통과해도 됩니다.
          </p>
        </div>
      );
    },
  },

  // ── Chapter 1.5: 문제 진단 (Sprint 57)
  {
    id: "diag-evidences",
    chapter: "diagnosis",
    approaches: ["analytical"],
    prompt: "현상의 근거가 되는 데이터는 무엇인가요?",
    hint: "유형(관찰/평가/설문/선행연구)을 고르고 한 줄씩 적어주세요. 추가/삭제 가능.",
    render: (form, setField) => {
      const list = form.problemEvidences.length > 0
        ? form.problemEvidences
        : [{ id: "_seed", type: "" as EvidenceType, content: "" }];
      return (
        <div className="space-y-2">
          {list.map((ev, i) => (
            <div key={ev.id} className="flex flex-col gap-2 rounded-lg border bg-white p-2 sm:flex-row">
              <select
                value={ev.type}
                onChange={(e) => upsertEvidence(form, setField, i, { type: e.target.value as EvidenceType })}
                className="h-9 rounded-md border bg-white px-2 text-sm sm:w-32"
                aria-label="근거 유형"
              >
                {EVIDENCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <Input
                value={ev.content}
                onChange={(e) => upsertEvidence(form, setField, i, { content: e.target.value })}
                placeholder="예: 4개 그룹 중 3개에서 발화 격차 5배 이상 관찰"
                className="flex-1 bg-white"
                style={{ fontSize: "16px" }}
              />
              {form.problemEvidences.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeEvidence(form, setField, i)}
                  className="h-9 shrink-0 rounded-md border px-2 text-xs text-muted-foreground hover:bg-muted"
                  aria-label="근거 삭제"
                >
                  삭제
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => addEvidence(form, setField)}
            className="w-full rounded-md border-2 border-dashed py-2 text-xs text-muted-foreground hover:bg-muted/40"
          >
            + 근거 추가
          </button>
        </div>
      );
    },
  },
  {
    id: "diag-causes-multi",
    chapter: "diagnosis",
    approaches: ["analytical"],
    prompt: "원인을 학습자 / 수업설계 / 환경 차원으로 분해하면?",
    hint: "각 층위마다 가능한 원인을 한 줄씩. 비워둘 수 있어요. 다층 분해는 처방을 정확하게 만듭니다.",
    render: (form, setField) => {
      const layers: { type: CauseType; label: string; placeholder: string }[] = [
        { type: "learner", label: CAUSE_TYPE_LABELS.learner, placeholder: "예: 발화 자신감 부족, 한국어 의사 표현 어려움" },
        { type: "instructional_design", label: CAUSE_TYPE_LABELS.instructional_design, placeholder: "예: 발화 차례 보장 장치 없음, 평가가 결과물 중심" },
        { type: "environment", label: CAUSE_TYPE_LABELS.environment, placeholder: "예: 좌석 배치가 일렬, 협력용 도구 미제공" },
      ];
      return (
        <div className="space-y-3">
          {layers.map((l) => {
            const cur = getCauseByType(form, l.type);
            return (
              <div key={l.type} className="rounded-lg border bg-white p-3">
                <p className="text-xs font-semibold text-muted-foreground">{l.label}</p>
                <Input
                  value={cur?.content ?? ""}
                  onChange={(e) => setCauseByType(form, setField, l.type, e.target.value)}
                  placeholder={l.placeholder}
                  className="mt-1.5 bg-white"
                  style={{ fontSize: "16px" }}
                />
              </div>
            );
          })}
        </div>
      );
    },
  },
  {
    id: "diag-tried",
    chapter: "diagnosis",
    approaches: ["analytical"],
    prompt: "이미 시도해본 해법과 그 결과는?",
    hint: "통한 부분 / 통하지 않은 부분을 분리해서 적으면 본 연구의 새로움이 명확해집니다.",
    render: (form, setField) => (
      <Textarea
        value={form.diagnosisAttempts}
        onChange={(e) => setField("diagnosisAttempts", e.target.value)}
        placeholder="예: 작년 학기에 ‘발표자 로테이션’ 규칙을 도입 → 발화 빈도는 늘었으나 깊이는 그대로. 침묵의 본질은 자신감 부족이었던 것 같다."
        rows={6}
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
  },
  {
    id: "diag-gap",
    chapter: "diagnosis",
    approaches: ["analytical"],
    prompt: "현재 상태(AS-IS) vs 도달하려는 상태(TO-BE)의 격차는?",
    hint: "두 상태를 한 줄씩 대비해 적으면 결과 챕터에서 그대로 검증 지표가 됩니다.",
    render: (form, setField) => (
      <Textarea
        value={form.diagnosisGap}
        onChange={(e) => setField("diagnosisGap", e.target.value)}
        placeholder={"AS-IS: 30% 학생만 의미 있는 발화 / 평균 발화 시간 5초\nTO-BE: 80% 학생이 자기 의견 1회 이상 표명 / 평균 30초 이상"}
        rows={6}
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
  },
  {
    id: "diag-primary",
    chapter: "diagnosis",
    approaches: ["analytical"],
    prompt: "본 연구가 집중할 핵심 원인은?",
    hint: "여러 원인 중 하나만 골라주세요. 이 답변이 다음 챕터(이론 선택)의 직접적인 근거가 됩니다.",
    render: (form, setField) => (
      <Textarea
        value={form.diagnosisPrimaryCause}
        onChange={(e) => setField("diagnosisPrimaryCause", e.target.value)}
        placeholder="예: 학습자 차원의 ‘발화 자신감 부족’을 핵심 원인으로 본다. 수업설계·환경 요인은 부차적으로 다룬다."
        rows={5}
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
  },

  // ── Bridge: diagnosis → theory (Sprint 57, analytical 트랙 한정)
  {
    id: "bridge-diag-theory",
    chapter: "bridge",
    approaches: ["analytical"],
    prompt: "이 핵심 원인을 가장 잘 설명하는 이론을 선택해보세요",
    hint: "다음 단계에서 적을 이론의 ‘선택 이유’ 에 방금 정한 핵심 원인 키워드가 자연스럽게 등장하면 좋습니다.",
    optional: true,
    render: (form) => {
      const cause = form.diagnosisPrimaryCause.trim();
      return (
        <div className="rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/60 p-4 text-sm">
          <p className="font-semibold text-emerald-900">방금 정한 핵심 원인</p>
          <p className="mt-2 whitespace-pre-wrap text-emerald-900/90">
            {cause ? cause : <span className="italic text-muted-foreground">(아직 입력 안 함)</span>}
          </p>
        </div>
      );
    },
  },

  // ── Bridge: field → inquiry (Sprint 58, generative 트랙 한정)
  {
    id: "bridge-field-inquiry",
    chapter: "bridge",
    approaches: ["generative"],
    prompt: "이제 현장의 의미와 맥락을 함께 탐구해보겠습니다",
    hint: "구성주의·DBR·참여실행연구 흐름은 ‘외부에서 진단’ 하지 않고 학습자/교사와 ‘함께 의미를 구성’ 합니다. 다음 3 슬라이드는 그 단서를 모으는 단계입니다.",
    optional: true,
    render: (form) => {
      const phenomena = form.problemPhenomena.filter((p) => p.trim()).slice(0, 3);
      return (
        <div className="rounded-xl border-2 border-dashed border-cyan-200 bg-cyan-50/50 p-4 text-sm">
          <p className="font-semibold text-cyan-900">정의한 현상 미리보기</p>
          {phenomena.length === 0 ? (
            <p className="mt-2 text-muted-foreground">아직 현상이 입력되지 않았어요.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-cyan-900/90">
              {phenomena.map((p, i) => (
                <li key={i} className="line-clamp-2">• {p}</li>
              ))}
            </ul>
          )}
          <p className="mt-3 rounded-md bg-white/60 px-2.5 py-1.5 text-[11px] text-cyan-900/80 ring-1 ring-cyan-200">
            ⓘ 생성·구성형 트랙 — ‘원인 진단’ 대신 ‘맥락과 의미’ 를 묻습니다.
          </p>
        </div>
      );
    },
  },

  // ── Chapter 1.5 (대안): 맥락 탐구 — Sprint 58 generative 트랙
  {
    id: "inq-meaning",
    chapter: "inquiry",
    approaches: ["generative"],
    prompt: "학습자·교사는 이 현상에 어떤 의미를 부여하고 있나요?",
    hint: "‘문제’ 라는 외부적 정의 대신 행위자 자신의 시선·해석·정서를 적어주세요. 인용/관찰 메모로도 좋습니다.",
    render: (form, setField) => (
      <Textarea
        value={form.inquiryMeaning}
        onChange={(e) => setField("inquiryMeaning", e.target.value)}
        placeholder={"예: 학생들은 ‘내가 잘못 말하면 친구들이 어떻게 볼까’ 라는 두려움을 자주 표현했다. 교사는 침묵을 ‘소극적’으로 봤지만, 인터뷰에서 학생들은 ‘자기 검열’ 로 묘사했다."}
        rows={6}
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
  },
  {
    id: "inq-context",
    chapter: "inquiry",
    approaches: ["generative"],
    prompt: "어떤 설계 맥락·도구·상호작용이 학습 경험을 형성하나요?",
    hint: "환경을 ‘원인’ 으로 환원하지 않고 학습 경험과 *함께 작동하는 요소* 로 묘사하세요. 좌석 배치·도구·관계 모두 포함.",
    render: (form, setField) => (
      <Textarea
        value={form.inquiryContext}
        onChange={(e) => setField("inquiryContext", e.target.value)}
        placeholder="예: 4인 모둠은 책상을 마주보고 앉지만, Padlet 게시는 익명이 가능해서 텍스트로는 활발히 교류한다. 즉 침묵은 ‘말’ 채널 한정이며, 글 채널에서는 다른 행위 양상이 나타난다."
        rows={6}
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
  },
  {
    id: "inq-cycle",
    chapter: "inquiry",
    approaches: ["generative"],
    prompt: "본 연구는 어떤 반복 설계 사이클로 진행되나요?",
    hint: "DBR/SAM 식 ‘설계 → 실행 → 성찰 → 재설계’ 사이클을 1~2 단계만이라도 적어주세요. 함께 만드는 동료(co-designer)가 있다면 명시.",
    render: (form, setField) => (
      <Textarea
        value={form.inquiryCycle}
        onChange={(e) => setField("inquiryCycle", e.target.value)}
        placeholder={"예: Cycle 1 (4주) — 글 채널 중심 활동 시제로 도입 → 학생 인터뷰 → 말 채널 비계 추가 / Cycle 2 (4주) — 비계 효과 관찰 → 학생·교사 공동 평가."}
        rows={6}
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
  },

  // ── Bridge: inquiry → theory (Sprint 58, generative 트랙 한정)
  {
    id: "bridge-inquiry-theory",
    chapter: "bridge",
    approaches: ["generative"],
    prompt: "탐구한 의미·맥락을 함께 만들어갈 이론을 선택해보세요",
    hint: "구성주의 흐름에서는 이론이 ‘처방’ 이 아니라 ‘함께 보는 렌즈’ 입니다. 다음 단계의 이론 선택 이유에 방금 적은 의미·맥락 키워드가 자연스럽게 등장하면 좋습니다.",
    optional: true,
    render: (form) => {
      const meaning = form.inquiryMeaning.trim();
      const context = form.inquiryContext.trim();
      return (
        <div className="space-y-2">
          {meaning && (
            <div className="rounded-xl border-2 border-dashed border-cyan-200 bg-cyan-50/60 p-3 text-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-700">행위자의 의미</p>
              <p className="mt-1 whitespace-pre-wrap text-cyan-900/90 line-clamp-3">{meaning}</p>
            </div>
          )}
          {context && (
            <div className="rounded-xl border-2 border-dashed border-sky-200 bg-sky-50/60 p-3 text-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-700">설계 맥락</p>
              <p className="mt-1 whitespace-pre-wrap text-sky-900/90 line-clamp-3">{context}</p>
            </div>
          )}
          {!meaning && !context && (
            <p className="text-sm italic text-muted-foreground">앞 단계 답변이 비어있어요. 채워두면 다음 챕터에서 자동 표시됩니다.</p>
          )}
        </div>
      );
    },
  },

  // ── Bridge: field → action_research (Sprint 60)
  {
    id: "bridge-field-action",
    chapter: "bridge",
    approaches: ["action_research"],
    prompt: "Plan-Act-Observe-Reflect 사이클을 함께 설계해보겠습니다",
    hint: "액션리서치는 ‘외부 진단’ 도 ‘함께 의미 구성’ 도 아닌, 본인이 자기 실천을 직접 개선하는 사이클입니다.",
    optional: true,
    render: () => (
      <div className="rounded-xl border-2 border-dashed border-orange-200 bg-orange-50/50 p-4 text-sm">
        <p className="font-semibold text-orange-900">액션리서치 트랙</p>
        <ul className="mt-2 space-y-1 text-orange-900/90">
          <li>• <strong>Plan</strong> — 어떤 변화를 시도할지 계획</li>
          <li>• <strong>Act</strong> — 현장에서 실행</li>
          <li>• <strong>Observe</strong> — 무슨 일이 일어났는지 관찰·기록</li>
          <li>• <strong>Reflect</strong> — 동료와 함께 성찰 → 다음 사이클 재계획</li>
        </ul>
      </div>
    ),
  },

  // ── Chapter 1.5 (대안): 액션 사이클 — Sprint 60 action_research 트랙
  {
    id: "act-role",
    chapter: "action",
    approaches: ["action_research"],
    prompt: "본인이 현장에서 어떤 위치·역할인가요?",
    hint: "교사·강사·관리자·전문가·학습자 — 자기 위치를 명확히 해야 액션의 권한과 한계가 보입니다.",
    render: (form, setField) => (
      <Textarea
        value={form.actionRole}
        onChange={(e) => setField("actionRole", e.target.value)}
        placeholder="예: 본 강좌의 담당 강사로 학기 전 과정 운영을 책임지며, 평가 방식과 자료 선정 권한을 가진다."
        rows={5}
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
  },
  {
    id: "act-cycle",
    chapter: "action",
    approaches: ["action_research"],
    prompt: "사이클을 어떻게 설계할 건가요?",
    hint: "Plan → Act → Observe → Reflect 1~2 사이클을 구체적으로 적어주세요. 무엇을 바꾸고, 무엇을 관찰할지.",
    render: (form, setField) => (
      <Textarea
        value={form.actionCycle}
        onChange={(e) => setField("actionCycle", e.target.value)}
        placeholder={"예:\nCycle 1 (4주) — Plan: 발화 차례 보장 도입 / Act: 매주 실행 / Observe: 발화 빈도+질 기록 / Reflect: 학생 인터뷰\nCycle 2 (4주) — Plan: 비계 추가 / Act: ..."}
        rows={7}
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
  },
  {
    id: "act-community",
    chapter: "action",
    approaches: ["action_research"],
    prompt: "함께 성찰할 동료·공동 연구자는?",
    hint: "혼자 하는 액션리서치는 ‘자기 정당화’ 위험이 큽니다. 비판적으로 봐줄 동료/소그룹/지도교수를 명시하세요.",
    render: (form, setField) => (
      <Textarea
        value={form.actionCommunity}
        onChange={(e) => setField("actionCommunity", e.target.value)}
        placeholder="예: 동료 강사 2인 + 지도교수 1인 + 학기말 학생 6인 인터뷰. 격주 1회 60분 정기 미팅."
        rows={4}
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
  },
  {
    id: "act-baseline",
    chapter: "action",
    approaches: ["action_research"],
    prompt: "사이클 시작 전 기준선(baseline)은 무엇인가요?",
    hint: "변화·개선을 판단하려면 ‘출발점’ 측정이 필요합니다. 양적 지표 + 질적 묘사를 함께 적어주세요.",
    render: (form, setField) => (
      <Textarea
        value={form.actionBaseline}
        onChange={(e) => setField("actionBaseline", e.target.value)}
        placeholder={"예: 양적 — 1주차 모둠활동 평균 발화 시간 5초/명, 발화자 3명/모둠.\n질적 — 첫 인터뷰 6명 모두 ‘틀릴까봐 말 못함’ 언급."}
        rows={5}
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
  },
  {
    id: "act-data-collection",
    chapter: "action",
    approaches: ["action_research"],
    prompt: "사이클 동안 어떤 데이터를 수집하나요?",
    hint: "교사 저널 / 현장 노트 / 학생 인터뷰 / 영상 / 산출물 — 다중 출처(multi-source)가 신뢰성을 높입니다.",
    render: (form, setField) => (
      <Textarea
        value={form.actionDataCollection}
        onChange={(e) => setField("actionDataCollection", e.target.value)}
        placeholder={"예: 교사 일지(매주) + 모둠활동 영상 4회 + 학생 짧은 메모(매수업 5분) + 종료 시점 6명 인터뷰(60분)."}
        rows={5}
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
  },
  {
    id: "act-validity",
    chapter: "action",
    approaches: ["action_research"],
    prompt: "자기 정당화 위험은 어떻게 방어하나요?",
    hint: "Member checking(학생 확인), Peer debriefing(동료 검토), Triangulation(다중 출처 비교) 중 적용 방안을 적어주세요.",
    render: (form, setField) => (
      <Textarea
        value={form.actionValidity}
        onChange={(e) => setField("actionValidity", e.target.value)}
        placeholder={"예: 매 사이클 종료 시 학생 6명에게 해석 요약본 보여주고 ‘맞나요?’ 확인(member check). 동료 강사 2인이 매월 데이터 검토."}
        rows={5}
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
  },

  // ── Bridge: action → theory (Sprint 60)
  {
    id: "bridge-action-theory",
    chapter: "bridge",
    approaches: ["action_research"],
    prompt: "사이클의 의미를 함께 해석할 이론을 선택해보세요",
    hint: "액션리서치에서 이론은 ‘처방’ 도 ‘외부 렌즈’ 도 아닌, 본인의 실천을 더 깊이 이해하기 위한 *공동 사고 자원* 입니다.",
    optional: true,
    render: (form) => {
      const role = form.actionRole.trim();
      const cycle = form.actionCycle.trim();
      return (
        <div className="space-y-2">
          {role && (
            <div className="rounded-xl border-2 border-dashed border-orange-200 bg-orange-50/60 p-3 text-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-700">현장 위치</p>
              <p className="mt-1 whitespace-pre-wrap text-orange-900/90 line-clamp-2">{role}</p>
            </div>
          )}
          {cycle && (
            <div className="rounded-xl border-2 border-dashed border-amber-200 bg-amber-50/60 p-3 text-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">사이클 설계</p>
              <p className="mt-1 whitespace-pre-wrap text-amber-900/90 line-clamp-3">{cycle}</p>
            </div>
          )}
          {!role && !cycle && (
            <p className="text-sm italic text-muted-foreground">앞 단계 답변이 비어있어요.</p>
          )}
        </div>
      );
    },
  },

  // ── Bridge: field → mixed_methods (Sprint 60)
  {
    id: "bridge-field-mixed",
    chapter: "bridge",
    approaches: ["mixed_methods"],
    prompt: "혼합방법론으로 양적·질적 데이터를 통합 설계해보겠습니다",
    hint: "Creswell 의 4 디자인 — Convergent(동시·대조), Explanatory(양→질로 설명), Exploratory(질→양으로 검증), Embedded(한쪽 보조).",
    optional: true,
    render: () => (
      <div className="rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-4 text-sm">
        <p className="font-semibold text-indigo-900">혼합방법론 트랙</p>
        <ul className="mt-2 space-y-1 text-indigo-900/90">
          <li>• <strong>Convergent</strong> — 양적·질적 동시 수집 → 결과 대조</li>
          <li>• <strong>Explanatory</strong> — 양적 결과를 질적으로 설명</li>
          <li>• <strong>Exploratory</strong> — 질적 발견을 양적으로 검증</li>
          <li>• <strong>Embedded</strong> — 한쪽이 주축, 다른 한쪽이 보조</li>
        </ul>
      </div>
    ),
  },

  // ── Chapter 1.5 (대안): 혼합 디자인 — Sprint 60 mixed_methods 트랙
  {
    id: "mix-design",
    chapter: "mixed",
    approaches: ["mixed_methods"],
    prompt: "어떤 혼합 디자인을 채택하나요?",
    hint: "Convergent / Explanatory / Exploratory / Embedded 중 가장 가까운 것 + 그 이유.",
    render: (form, setField) => (
      <Textarea
        value={form.mixedDesign}
        onChange={(e) => setField("mixedDesign", e.target.value)}
        placeholder="예: Explanatory Sequential — 1단계 양적 설문(N=120)으로 패턴 발견 → 2단계 6명 심층 인터뷰로 ‘왜 그런지’ 설명한다."
        rows={5}
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
  },
  {
    id: "mix-quant",
    chapter: "mixed",
    approaches: ["mixed_methods"],
    prompt: "양적 데이터는 무엇을 어떻게 수집·분석하나요?",
    hint: "도구(설문/평가/로그), 표본 크기, 분석 방법(t-test, ANOVA, regression 등) 한 줄.",
    render: (form, setField) => (
      <Textarea
        value={form.mixedQuant}
        onChange={(e) => setField("mixedQuant", e.target.value)}
        placeholder="예: 협력자기효능감 5점 척도 12문항 (N=120, 사전·사후) → paired t-test 로 변화량 검증."
        rows={5}
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
  },
  {
    id: "mix-qual",
    chapter: "mixed",
    approaches: ["mixed_methods"],
    prompt: "질적 데이터는 무엇을 어떻게 수집·분석하나요?",
    hint: "방법(인터뷰/관찰/문서), 분석 절차(thematic/grounded/IPA 등), 신뢰성 확보 방안.",
    render: (form, setField) => (
      <Textarea
        value={form.mixedQual}
        onChange={(e) => setField("mixedQual", e.target.value)}
        placeholder="예: 6명 반구조화 인터뷰(60분) + 모둠활동 영상 6시간. Braun & Clarke thematic analysis. 동료 검토 1회."
        rows={5}
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
  },
  {
    id: "mix-integration",
    chapter: "mixed",
    approaches: ["mixed_methods"],
    prompt: "두 데이터를 어떻게 통합·대조할 건가요?",
    hint: "Joint display(병렬 표/도표), Meta-inference(상위 해석), Triangulation(일치/불일치 검토) 등.",
    render: (form, setField) => (
      <Textarea
        value={form.mixedIntegration}
        onChange={(e) => setField("mixedIntegration", e.target.value)}
        placeholder="예: Joint display 로 ‘설문 점수 변화 vs 인터뷰 주제’ 매트릭스 작성. 일치하는 영역과 모순되는 영역을 별도 섹션으로 해석."
        rows={5}
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
  },
  {
    id: "mix-priority",
    chapter: "mixed",
    approaches: ["mixed_methods"],
    prompt: "양적·질적 데이터 중 어느 쪽이 주(主)·보조(補)인가요?",
    hint: "Creswell 표기 — QUAN+qual / quan+QUAL / QUAN+QUAL(동등). 우선순위가 결과 해석의 중심을 결정합니다.",
    render: (form, setField) => (
      <Textarea
        value={form.mixedPriority}
        onChange={(e) => setField("mixedPriority", e.target.value)}
        placeholder="예: QUAN + qual — 양적 결과(설문)가 본 연구의 주축, 질적 인터뷰는 ‘왜’를 보충 설명하는 보조 역할."
        rows={4}
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
  },
  {
    id: "mix-sampling",
    chapter: "mixed",
    approaches: ["mixed_methods"],
    prompt: "양·질 표집은 어떻게 연결하나요?",
    hint: "Identical(동일 표본), Nested(질적이 양적의 부분집합), Multilevel(다른 수준), Parallel(독립 표본) 중 선택.",
    render: (form, setField) => (
      <Textarea
        value={form.mixedSampling}
        onChange={(e) => setField("mixedSampling", e.target.value)}
        placeholder="예: Nested — 양적 설문 N=120 중 점수 상·중·하 그룹에서 각 2명씩(총 6명) 의도적 표집해 인터뷰."
        rows={4}
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
  },
  {
    id: "mix-validity",
    chapter: "mixed",
    approaches: ["mixed_methods"],
    prompt: "메타-추론 타당성은 어떻게 확보하나요?",
    hint: "Interpretive consistency(해석 일관성), Sample integration(표본 통합), Inside-outside legitimation(내·외부자 시각). Onwuegbuzie & Johnson 9가지 적법성 중 적용 방안.",
    render: (form, setField) => (
      <Textarea
        value={form.mixedValidity}
        onChange={(e) => setField("mixedValidity", e.target.value)}
        placeholder="예: Sample integration — 동일 6명에게 양·질 모두 적용. Interpretive consistency — 양적 결과와 질적 주제가 충돌할 때 ‘재해석 라운드’ 1회 진행."
        rows={5}
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
  },

  // ── Bridge: mixed → theory (Sprint 60)
  {
    id: "bridge-mixed-theory",
    chapter: "bridge",
    approaches: ["mixed_methods"],
    prompt: "혼합 디자인을 받쳐줄 이론적 틀을 선택해보세요",
    hint: "혼합방법론은 ‘paradigm war’ 이후 실용주의(pragmatism) 가 대표 메타-패러다임 — 이론은 양적·질적 결과를 통합 해석하는 골격이 됩니다.",
    optional: true,
    render: (form) => {
      const design = form.mixedDesign.trim();
      return design ? (
        <div className="rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/60 p-3 text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">선택 디자인</p>
          <p className="mt-1 whitespace-pre-wrap text-indigo-900/90 line-clamp-3">{design}</p>
        </div>
      ) : (
        <p className="text-sm italic text-muted-foreground">앞 단계 답변이 비어있어요.</p>
      );
    },
  },

  // ── Chapter 2: 교육공학 이론
  {
    id: "theory-name",
    chapter: "theory",
    prompt: "이 문제를 설명할 수 있는 핵심 이론은 무엇인가요?",
    hint: "이론 이름과 학자(연도)를 함께 적으면 좋아요. archive에 등록된 개념과 매칭되면 chip 추천이 뜹니다 — 클릭으로 핵심개념 목록에 추가.",
    render: (form, setField) => <TheoryNameRenderer form={form} setField={setField} />,
  },
  {
    id: "theory-reason",
    chapter: "theory",
    prompt: "이 이론을 선택한 이유는?",
    hint: "현장의 문제와 어떻게 맞닿아 있는지 한두 문장으로 말해주세요.",
    render: (form, setField) => (
      <Textarea
        value={form.theoryCards[0]?.selectionReason ?? ""}
        onChange={(e) => ensureFirstTheoryCard(form, setField, { selectionReason: e.target.value })}
        placeholder="예: 학습자 간 상호작용이 학습의 주요 메커니즘이라는 점에서, 침묵 현상을 설명하기 적합하다."
        rows={5}
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
    crossRef: (form) => {
      const cause = form.diagnosisPrimaryCause.trim();
      const meaning = form.inquiryMeaning.trim();
      return (
        <div className="space-y-1">
          {cause && (
            <p className="rounded-md bg-emerald-50 px-2 py-1.5 text-[11px] text-emerald-900">
              🩺 방금 정한 핵심 원인: <strong className="ml-0.5">{cause.slice(0, 80)}</strong>
            </p>
          )}
          {meaning && (
            <p className="rounded-md bg-cyan-50 px-2 py-1.5 text-[11px] text-cyan-900">
              💭 행위자의 의미: <strong className="ml-0.5">{meaning.slice(0, 80)}</strong>
            </p>
          )}
        </div>
      );
    },
    lint: (form) => {
      const reason = form.theoryCards[0]?.selectionReason ?? "";
      if (!reason.trim()) return null;
      const cause = form.diagnosisPrimaryCause;
      const meaning = form.inquiryMeaning;
      // 분석형: 핵심 원인 키워드 검사 / 생성형: 의미 키워드 검사 / 둘 다 비어있으면 lint skip
      if (cause.trim() && !hasKeywordOverlap(cause, reason)) {
        return "선택 이유에 ‘핵심 원인’ 의 키워드가 안 보입니다. 원인 → 이론의 연결을 한두 단어 명시하면 논리가 단단해집니다.";
      }
      if (!cause.trim() && meaning.trim() && !hasKeywordOverlap(meaning, reason)) {
        return "선택 이유에 ‘행위자의 의미’ 키워드가 안 보입니다. 의미 → 이론(렌즈)의 연결을 한두 단어 명시하면 논리가 단단해집니다.";
      }
      return null;
    },
  },
  {
    id: "theory-link",
    chapter: "theory",
    prompt: "이론과 현장 문제는 어떻게 연결되나요?",
    hint: "이론의 핵심 개념이 현장 문제의 어떤 부분을 설명·해결하는지 적어주세요.",
    render: (form, setField) => (
      <Textarea
        value={form.theoryCards[0]?.problemLink ?? ""}
        onChange={(e) => ensureFirstTheoryCard(form, setField, { problemLink: e.target.value })}
        placeholder="예: ZPD 개념은 ‘침묵하는 학생도 적절한 비계만 있으면 참여 가능’임을 시사하므로..."
        rows={5}
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
    crossRef: (form) => {
      const phen = form.problemPhenomena.find((p) => p.trim());
      if (!phen) return null;
      return (
        <p className="rounded-md bg-amber-50 px-2 py-1.5 text-[11px] text-amber-900">
          🏫 정의한 현상: <strong className="ml-0.5">{phen.trim().slice(0, 80)}</strong>
        </p>
      );
    },
  },
  {
    id: "theory-integration",
    chapter: "theory",
    prompt: "(여러 이론이라면) 통합적인 시각은?",
    hint: "이론이 1개라면 비워둬도 됩니다. 2개 이상이라면 어떻게 합쳐서 봐야 하는지 적어주세요.",
    optional: true,
    render: (form, setField) => (
      <Textarea
        value={form.theoryRelationIntegration}
        onChange={(e) => setField("theoryRelationIntegration", e.target.value)}
        placeholder="예: 사회적 구성주의로 ‘왜’를, ARCS로 ‘어떻게 동기화할지’를 본다."
        rows={4}
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
  },

  // ── Bridge: theory → prior (Sprint 57)
  {
    id: "bridge-theory-prior",
    chapter: "bridge",
    prompt: "이론의 핵심 개념을 키워드로 선행연구를 찾아보세요",
    hint: "선택한 이론과 핵심 원인 키워드 — 이 두 가지로 검색하면 가장 가까운 선행연구가 나옵니다.",
    optional: true,
    render: (form) => {
      const theoryName = form.theoryCards[0]?.name?.trim() ?? "";
      const cause = form.diagnosisPrimaryCause.trim();
      const meaning = form.inquiryMeaning.trim();
      const keywords = Array.from(
        new Set([
          ...(theoryName ? extractKeywords(theoryName).slice(0, 3) : []),
          ...(cause ? extractKeywords(cause).slice(0, 3) : []),
          ...(meaning ? extractKeywords(meaning).slice(0, 3) : []),
        ]),
      ).slice(0, 6);
      return (
        <div className="rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/60 p-4 text-sm">
          <p className="font-semibold text-blue-900">검색 키워드 후보</p>
          {keywords.length === 0 ? (
            <p className="mt-2 text-muted-foreground">
              앞 단계 답변이 비어있어 키워드를 추출하지 못했어요.
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {keywords.map((k) => (
                <span
                  key={k}
                  className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-blue-900 ring-1 ring-blue-200"
                >
                  {k}
                </span>
              ))}
            </div>
          )}
        </div>
      );
    },
  },

  // ── Chapter 3: 선행연구
  {
    id: "prior-summary",
    chapter: "prior",
    prompt: "선행연구 흐름을 한 문단으로 요약하면?",
    hint: "어떤 연구들이 있고 어떤 흐름을 보이는지, 내 연구와의 관계까지 적으면 좋아요. 개별 논문 연결은 전체 모드에서 가능합니다.",
    render: (form, setField) => (
      <Textarea
        value={form.priorResearchAnalysis}
        onChange={(e) => setField("priorResearchAnalysis", e.target.value)}
        placeholder="예: 협력학습 침묵 현상에 대한 연구는 크게 2가지 흐름으로 나뉜다. (1)... (2)... 본 연구는 (1)에 가까운 ..."
        rows={6}
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
    crossRef: (form) => {
      const theoryName = form.theoryCards[0]?.name?.trim() ?? "";
      const cause = form.diagnosisPrimaryCause.trim();
      const context = form.inquiryContext.trim();
      if (!theoryName && !cause && !context) return null;
      return (
        <div className="space-y-1">
          {theoryName && (
            <p className="rounded-md bg-emerald-50 px-2 py-1.5 text-[11px] text-emerald-900">
              📚 선택 이론: <strong className="ml-0.5">{theoryName}</strong>
            </p>
          )}
          {cause && (
            <p className="rounded-md bg-rose-50 px-2 py-1.5 text-[11px] text-rose-900">
              🩺 핵심 원인: <strong className="ml-0.5">{cause.slice(0, 80)}</strong>
            </p>
          )}
          {context && (
            <p className="rounded-md bg-sky-50 px-2 py-1.5 text-[11px] text-sky-900">
              🌱 설계 맥락: <strong className="ml-0.5">{context.slice(0, 80)}</strong>
            </p>
          )}
        </div>
      );
    },
    lint: (form) => {
      const concepts = (form.theoryCards[0]?.name ?? "").trim();
      const prior = form.priorResearchAnalysis;
      if (!concepts || !prior) return null;
      if (!hasKeywordOverlap(concepts, prior)) {
        return "선행연구 분석에 ‘이론’ 키워드가 안 보입니다. 본 연구의 이론적 위치를 한 줄 명시하면 흐름이 명확해집니다.";
      }
      return null;
    },
  },

  // ── Sprint 61: 완료 슬라이드 — Logic Map (모든 트랙 공통, 마지막)
  {
    id: "completion-map",
    chapter: "bridge",
    prompt: "연구 흐름이 잘 짜여졌는지 한눈에 확인해보세요",
    hint: "각 챕터의 채움 정도와 챕터 간 연결 강도(키워드 overlap)를 시각화한 지도입니다. 약한 연결은 다시 돌아가 보강하시면 좋아요.",
    optional: true,
    render: (form) => <ResearchLogicMap form={form} />,
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
  form: FormState;
  setField: SetField;
  total: number;
  saving: boolean;
  dirty: boolean;
  savedAt?: string;
  onSave: () => void;
  onDraftSave: () => void;
}

export default function ResearchReportInterview({
  open, onClose, form, setField, total, saving, dirty, savedAt, onSave, onDraftSave,
}: Props) {
  const [index, setIndex] = useState(-1);

  useEffect(() => {
    if (open) setIndex(-1);
  }, [open]);

  // Sprint 58: ResearchApproach 별 슬라이드 필터링
  const slides = useMemo(() => {
    const a = form.researchApproach;
    return SLIDES.filter((s) => {
      if (!s.approaches || s.approaches.length === 0) return true;
      if (!a) return false; // 사용자가 아직 트랙을 고르지 않음 — 트랙 한정 슬라이드 숨김
      return s.approaches.includes(a);
    });
  }, [form.researchApproach]);

  const totalSlides = slides.length;
  const progress = index < 0 ? 0 : ((index + 1) / totalSlides) * 100;
  const slide = index >= 0 ? slides[index] : null;

  // index가 새로운 slides 길이를 넘는 경우 안전 클램프
  useEffect(() => {
    if (index >= totalSlides) {
      setIndex(totalSlides - 1);
    }
  }, [totalSlides, index]);

  const chapterCounts = useMemo(() => {
    const m: Record<Chapter, number> = {
      approach: 0,
      field: 0,
      diagnosis: 0,
      inquiry: 0,
      action: 0,
      mixed: 0,
      theory: 0,
      prior: 0,
      bridge: 0,
    };
    for (const s of slides) m[s.chapter] += 1;
    return m;
  }, [slides]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex h-[100dvh] flex-col overflow-hidden bg-gradient-to-br from-blue-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <header
        className="flex items-center justify-between gap-1.5 border-b bg-white/70 px-2.5 py-2 backdrop-blur sm:gap-2 sm:px-4 sm:py-3 dark:bg-card/70"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary sm:flex sm:h-9 sm:w-9">
            <MessageSquareQuote size={16} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[10px] text-muted-foreground sm:text-xs">연구보고서 · 인터뷰</p>
            <p className="truncate text-[11px] font-bold sm:text-sm">{total.toLocaleString()}자 작성</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {savedAt && !saving && (
            <span className="hidden text-[11px] text-muted-foreground md:inline">
              {new Date(savedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 저장됨
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onDraftSave}
            disabled={saving || !dirty}
            className="h-8 px-2 text-[11px]"
            title="임시저장"
          >
            <Save size={12} className="sm:mr-1" />
            <span className="hidden sm:inline">임시저장</span>
          </Button>
          <Button size="sm" onClick={onSave} disabled={saving} className="h-8 px-2 text-[11px]">
            저장
          </Button>
          <button
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            title="인터뷰 종료"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      <div className="h-1 w-full bg-muted">
        <motion.div
          className="h-full bg-gradient-to-r from-[#003876] to-[#1a5fa0]"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <main className="flex flex-1 items-start justify-center overflow-y-auto overflow-x-hidden px-3 py-4 sm:items-center sm:px-6 sm:py-10">
        <AnimatePresence mode="wait">
          {slide ? (
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.32, ease: "easeOut" }}
              className="mx-auto w-full max-w-2xl"
            >
              <SlideHeader chapter={slide.chapter} index={index} total={totalSlides} optional={slide.optional} />
              <motion.h2
                key={`${slide.id}-prompt`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.35 }}
                className="mt-3 text-center text-lg font-bold leading-snug sm:text-3xl"
              >
                {slide.prompt}
              </motion.h2>
              {slide.hint && (
                <p className="mt-2 rounded-lg bg-muted/40 p-2.5 text-center text-xs leading-relaxed text-muted-foreground sm:mt-3 sm:p-3 sm:text-sm">
                  {slide.hint}
                </p>
              )}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.35 }}
                className="mt-4 sm:mt-8"
              >
                {slide.render(form, setField)}
              </motion.div>
              {slide.crossRef && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.32, duration: 0.3 }}
                  className="mt-3 space-y-1"
                >
                  {slide.crossRef(form)}
                </motion.div>
              )}
              {slide.lint &&
                (() => {
                  const msg = slide.lint(form);
                  if (!msg) return null;
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4, duration: 0.3 }}
                      className="mt-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-[11px] text-amber-900 sm:text-xs"
                    >
                      <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
                      <span>{msg}</span>
                    </motion.div>
                  );
                })()}
            </motion.div>
          ) : (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="mx-auto w-full max-w-2xl text-center"
            >
              <div className="mx-auto flex flex-col items-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary sm:h-14 sm:w-14">
                  <Sparkles size={22} className="sm:hidden" />
                  <Sparkles size={26} className="hidden sm:block" />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/70">
                  Research Report · Interview Mode
                </p>
              </div>
              <h2 className="mt-4 text-xl font-bold leading-snug sm:mt-6 sm:text-3xl">
                질문에 답하다 보면 보고서 한 챕터가 완성돼요
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:mt-4 sm:text-base">
                총 <strong className="text-foreground">{totalSlides}개</strong>의 짧은 질문에 답하시면 됩니다.<br />
                답변은 자동으로 보고서 본문에 저장됩니다.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5 text-[11px] text-muted-foreground sm:mt-6 sm:gap-3 sm:text-xs">
                {REAL_CHAPTERS.filter((c) => chapterCounts[c] > 0).map((c) => {
                  const meta = CHAPTER_META[c];
                  const Icon = meta.icon;
                  return (
                    <span key={c} className="flex items-center gap-1 rounded-full border bg-white px-2 py-1 sm:gap-1.5 sm:px-2.5 dark:bg-card">
                      <Icon size={11} />
                      {meta.label} {chapterCounts[c]}
                    </span>
                  );
                })}
              </div>
              {!form.researchApproach && (
                <p className="mt-3 inline-block rounded-full bg-violet-50 px-3 py-1 text-[11px] font-medium text-violet-900 ring-1 ring-violet-200">
                  ※ 첫 슬라이드에서 연구 접근(분석·처방형 / 생성·구성형 / 자유)을 고르시면 1.5 챕터가 자동 분기됩니다.
                </p>
              )}
              <Button onClick={() => setIndex(0)} size="lg" className="mt-6 sm:mt-8">
                시작하기
              </Button>
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                중간에 언제든지 ✕ 버튼으로 종료하면 작성한 내용은 그대로 유지됩니다.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {index >= 0 && (
        <footer
          className="border-t bg-white/70 px-2.5 py-2 backdrop-blur sm:px-4 sm:py-3 dark:bg-card/70"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIndex((i) => Math.max(-1, i - 1))}
              className="h-9 min-w-[64px] px-2 text-xs sm:min-w-[72px] sm:px-3 sm:text-sm"
            >
              <ChevronLeft size={14} className="sm:mr-1" />
              <span className="hidden sm:inline">이전</span>
            </Button>
            <span className="text-[11px] text-muted-foreground sm:text-xs">
              {index + 1} / {totalSlides}
            </span>
            {index === totalSlides - 1 ? (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onSave();
                  onClose();
                }}
                disabled={saving}
                className="h-9 min-w-[72px] px-2 text-xs sm:min-w-[88px] sm:px-3 sm:text-sm"
              >
                {saving ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Save size={14} className="mr-1" />}
                완료
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => setIndex((i) => Math.min(totalSlides - 1, i + 1))}
                className="h-9 min-w-[64px] px-2 text-xs sm:min-w-[72px] sm:px-3 sm:text-sm"
              >
                다음
                <ChevronRight size={14} className="sm:ml-1" />
              </Button>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}

function SlideHeader({
  chapter, index, total, optional,
}: { chapter: Chapter; index: number; total: number; optional?: boolean }) {
  const meta = CHAPTER_META[chapter];
  const Icon = meta.icon;
  return (
    <div className="flex flex-col items-center gap-1.5 sm:gap-2">
      <div className={cn("flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm sm:gap-1.5 sm:px-3 sm:py-1 sm:text-xs", `bg-gradient-to-r ${meta.color}`)}>
        <Icon size={11} />
        {meta.label}
      </div>
      <p className="text-center text-[10px] font-semibold uppercase tracking-wider text-primary sm:text-xs">
        Q{index + 1} / {total}
        {optional && <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">선택</span>}
      </p>
    </div>
  );
}
