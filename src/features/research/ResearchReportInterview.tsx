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
  School, BookOpen, FlaskConical, ArrowRight, AlertTriangle, GraduationCap,
  CheckCircle2, Circle, Pencil, PartyPopper, Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FormState, SetField } from "./ResearchReportEditor";
import type {
  EducationFormat,
  TheoryCard,
} from "@/types";

/**
 * Sprint 68: 정통 ID 6챕터 흐름으로 확장
 * 1. 교육현장 문제 정의 → 2. 환경 분석 → 3. 학습자 분석 → 4. 학습 과제·목표 분석 → 5. 교육공학 이론 → 6. 선행연구 분석
 * 학술 용어 + 친절한 설명 + 구체 예시 (저학기에게도 작성 가능, 학기 후반에 정통 ID 학습 효과)
 */
type Chapter = "field" | "env" | "learner" | "task" | "theory" | "prior" | "bridge";

const CHAPTER_META: Record<
  Chapter,
  { label: string; icon: React.ElementType; color: string }
> = {
  field: { label: "교육현장의 문제 정의", icon: School, color: "from-amber-500 to-orange-500" },
  env: { label: "환경 분석", icon: School, color: "from-cyan-500 to-blue-500" },
  learner: { label: "학습자 분석", icon: GraduationCap, color: "from-purple-500 to-fuchsia-500" },
  task: { label: "학습 과제·목표 분석", icon: GraduationCap, color: "from-rose-500 to-pink-500" },
  theory: { label: "교육공학 이론", icon: BookOpen, color: "from-emerald-500 to-teal-500" },
  prior: { label: "선행연구 분석", icon: FlaskConical, color: "from-blue-500 to-indigo-500" },
  bridge: { label: "연결", icon: ArrowRight, color: "from-slate-400 to-slate-500" },
};

/** 챕터 진행률 표시에서 bridge 는 제외. 정통 ID 6챕터 흐름. */
const REAL_CHAPTERS: Chapter[] = ["field", "env", "learner", "task", "theory", "prior"];

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
  /**
   * Sprint 71: 답변 작성 여부 판단 — SlideNavigator(미작성 색상 표시)·이전답변보기·진행률 산출에 사용.
   * 슬라이드별 form 필드를 보고 의미있는 답변이 있는지 (보통 trim().length >= 5) 검증.
   */
  isAnswered?: (form: FormState) => boolean;
  /**
   * Sprint 71: 이전 답변 참조 — 의미상 직전 답변에 의존하는 슬라이드에서 카드로 노출.
   * 사용자는 카드를 클릭해 해당 슬라이드로 즉시 점프할 수 있음.
   */
  references?: { slideId: string; getValue?: (form: FormState) => string | null }[];
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

// Sprint 73: 슬라이드별 답변 작성 여부 판단 (5자 이상 의미있는 답변 기준)
function isSlideAnswered(slideId: string, form: FormState): boolean {
  const ok = (s: string | undefined | null) => (s?.trim().length ?? 0) >= 5;
  const okShort = (s: string | undefined | null) => (s?.trim().length ?? 0) >= 1;
  switch (slideId) {
    case "field-audience": return ok(form.fieldAudience);
    case "field-format": return okShort(form.fieldFormat);
    case "field-subject": return ok(form.fieldSubject);
    case "field-phenomenon": return form.problemPhenomena?.some((p) => p.trim().length >= 5) ?? false;
    case "field-impact": return ok(form.problemImpact);
    case "field-importance": return ok(form.problemImportance);
    case "field-scope-audience": return ok(form.scopeAudience);
    case "field-scope-context": return ok(form.scopeContext);
    case "field-scope-exclude": return ok(form.scopeExclusion);
    case "env-learning": return ok(form.envLearning);
    case "env-transfer": return ok(form.envTransfer);
    case "env-constraint": return ok(form.envConstraint);
    case "learner-profile": return ok(form.learnerProfile);
    case "learner-cognitive": return ok(form.learnerCognitive);
    case "learner-affective": return ok(form.learnerAffective);
    case "task-decompose": return ok(form.taskDecompose);
    case "outcome-priority-domain": return okShort(form.outcomePriorityDomain);
    case "outcome-cognitive": return ok(form.outcomeCognitive);
    case "outcome-skill-attitude": return ok(form.outcomeSkillAttitude);
    case "outcome-mager-abcd":
      return ok(form.outcomeMagerA) || ok(form.outcomeMagerB) ||
             ok(form.outcomeMagerC) || ok(form.outcomeMagerD) ||
             ok(form.outcomeMagerABCD);
    case "theory-name": return ok(form.theoryCards?.[0]?.name);
    case "theory-reason": return ok(form.theoryCards?.[0]?.selectionReason);
    case "theory-link": return ok(form.theoryCards?.[0]?.problemLink);
    case "theory-integration": return ok(form.theoryRelationIntegration);
    case "prior-summary": return ok(form.priorResearchAnalysis);
    default: return false;
  }
}

// Sprint 73: 슬라이드 답변을 사람이 읽을 수 있는 한 줄로 — PreviousAnswerCard 표시용
function getSlideAnswerPreview(slideId: string, form: FormState): string {
  switch (slideId) {
    case "field-audience": return form.fieldAudience ?? "";
    case "field-format": {
      const map: Record<string, string> = { offline: "대면", online: "비대면", blended: "혼합" };
      return form.fieldFormat ? (map[form.fieldFormat] ?? form.fieldFormat) : "";
    }
    case "field-subject": return form.fieldSubject ?? "";
    case "field-phenomenon": return (form.problemPhenomena ?? []).filter((p) => p.trim()).join(" / ");
    case "field-impact": return form.problemImpact ?? "";
    case "field-importance": return form.problemImportance ?? "";
    case "field-scope-audience": return form.scopeAudience ?? "";
    case "field-scope-context": return form.scopeContext ?? "";
    case "field-scope-exclude": return form.scopeExclusion ?? "";
    case "env-learning": return form.envLearning ?? "";
    case "env-transfer": return form.envTransfer ?? "";
    case "env-constraint": return form.envConstraint ?? "";
    case "learner-profile": return form.learnerProfile ?? "";
    case "learner-cognitive": return form.learnerCognitive ?? "";
    case "learner-affective": return form.learnerAffective ?? "";
    case "task-decompose": return form.taskDecompose ?? "";
    case "outcome-priority-domain": {
      const map: Record<string, string> = {
        cognitive: "🧠 인지", affective: "❤️ 정의(태도)",
        psychomotor: "✋ 심동(기능)", integrated: "🔗 통합",
      };
      return form.outcomePriorityDomain ? (map[form.outcomePriorityDomain] ?? "") : "";
    }
    case "outcome-cognitive": return form.outcomeCognitive ?? "";
    case "outcome-skill-attitude": return form.outcomeSkillAttitude ?? "";
    case "outcome-mager-abcd": {
      const parts = [form.outcomeMagerA, form.outcomeMagerB, form.outcomeMagerC, form.outcomeMagerD]
        .filter((s) => s?.trim());
      if (parts.length > 0) return parts.join(" / ");
      return form.outcomeMagerABCD ?? "";
    }
    case "theory-name": {
      const c = form.theoryCards?.[0];
      if (!c) return "";
      return [c.name, c.scholar].filter(Boolean).join(" — ");
    }
    case "theory-reason": return form.theoryCards?.[0]?.selectionReason ?? "";
    case "theory-link": return form.theoryCards?.[0]?.problemLink ?? "";
    case "theory-integration": return form.theoryRelationIntegration ?? "";
    case "prior-summary": return form.priorResearchAnalysis ?? "";
    default: return "";
  }
}


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

  // 2~4. env + learner + task (Sprint 68: 정통 ID 6챕터 — middle 노드는 환경+학습자+과제·목표 통합 충족률)
  const middleChecks = [
    // 환경 (3)
    form.envLearning,
    form.envTransfer,
    form.envConstraint,
    // 학습자 (3)
    form.learnerProfile,
    form.learnerCognitive,
    form.learnerAffective,
    // 과제·목표 (4 + 영역 선택)
    form.taskDecompose,
    form.outcomeCognitive,
    form.outcomeSkillAttitude,
    form.outcomePriorityDomain,
  ];
  const middleFill = Math.round(
    (middleChecks.filter((v) => (v ?? "").toString().trim().length > 0).length / middleChecks.length) * 100,
  );
  const middleLabel = "환경·학습자·과제";
  const middleText = `${form.learnerProfile} ${form.outcomeCognitive} ${form.outcomeSkillAttitude} ${form.envLearning}`.trim();

  // 3. theory
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
    { id: "middle", label: "2~4. " + middleLabel, fill: middleFill, sublabel: middleLabel, bridgeStrength: middleToTheory },
    { id: "theory", label: "5. 교육공학 이론", fill: theoryFill, bridgeStrength: theoryToPrior },
    { id: "prior", label: "6. 선행연구", fill: priorFill, bridgeStrength: 0 },
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

// Sprint 74: 사각형 4꼭지점 Logic Map — 한 화면에 모두 표시 + 채움 낮은 노드 클릭 시 점프
const NODE_CHAPTERS_MAP: Record<LogicNode["id"], Chapter[]> = {
  field: ["field"],
  middle: ["env", "learner", "task"],
  theory: ["theory"],
  prior: ["prior"],
};

function ResearchLogicMap({
  form, slides, onJump,
}: {
  form: FormState;
  slides?: SlideDef[];
  onJump?: (idx: number) => void;
}) {
  const nodes = useMemo(() => calcLogicMap(form), [form]);
  const overall = Math.round(nodes.reduce((s, n) => s + n.fill, 0) / nodes.length);
  const overallStrength = Math.round(
    (nodes[0].bridgeStrength + nodes[1].bridgeStrength + nodes[2].bridgeStrength) / 3,
  );

  // id → node lookup
  const byId = useMemo(() => {
    const m = new Map<LogicNode["id"], LogicNode>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  // 사각형 4꼭지점 배치
  // ┌────────────────────────────┐
  // │  field          middle     │
  // │   (TL)           (TR)       │
  // │      \         /           │
  // │       \       /            │
  // │        \     /             │
  // │         X                  │
  // │        / \                 │
  // │       /   \                │
  // │      /     \               │
  // │   (BL)           (BR)       │
  // │  prior          theory     │
  // └────────────────────────────┘
  const corners: { id: LogicNode["id"]; cls: string }[] = [
    { id: "field", cls: "col-start-1 row-start-1" },
    { id: "middle", cls: "col-start-2 row-start-1" },
    { id: "prior", cls: "col-start-1 row-start-2" },
    { id: "theory", cls: "col-start-2 row-start-2" },
  ];

  function jumpToNode(nodeId: LogicNode["id"]) {
    if (!onJump || !slides) return;
    const targets = NODE_CHAPTERS_MAP[nodeId];
    // 1순위: 해당 챕터의 첫 미작성 슬라이드
    const unanswered = slides.findIndex(
      (s) => targets.includes(s.chapter) && !isSlideAnswered(s.id, form),
    );
    if (unanswered >= 0) {
      onJump(unanswered);
      return;
    }
    // 2순위: 모두 작성됐으면 첫 슬라이드
    const first = slides.findIndex((s) => targets.includes(s.chapter));
    if (first >= 0) onJump(first);
  }

  function fillBg(percent: number) {
    if (percent >= 80) return "border-emerald-300 bg-emerald-50/80";
    if (percent >= 40) return "border-amber-300 bg-amber-50/80";
    return "border-rose-300 bg-rose-50/80";
  }
  function lineColor(strength: number) {
    if (strength >= 80) return "stroke-emerald-600";
    if (strength >= 40) return "stroke-amber-600";
    return "stroke-rose-500";
  }
  // Sprint 76: 연결강도 비례 두께 (1.8 ~ 4)
  function lineWidth(strength: number) {
    return 1.8 + (Math.max(0, Math.min(100, strength)) / 100) * 2.2;
  }
  function lineDash(strength: number) {
    if (strength >= 80) return undefined; // solid
    if (strength >= 40) return "6 4";
    return "2 4";
  }

  // 4변 strength
  // 기존 1차원 (field → middle → theory → prior) bridge 를 사각형 4변에 매핑:
  //  - field ↔ middle  (top)        : nodes[0].bridgeStrength
  //  - middle ↔ theory (right diag) : nodes[1].bridgeStrength
  //  - theory ↔ prior  (bottom)     : nodes[2].bridgeStrength
  //  - prior ↔ field   (left)       : 평균 (보조선)
  const stTop = byId.get("field")?.bridgeStrength ?? 0;
  const stRightDiag = byId.get("middle")?.bridgeStrength ?? 0;
  const stBottom = byId.get("theory")?.bridgeStrength ?? 0;
  const stLeft = Math.round((stTop + stRightDiag + stBottom) / 3);

  return (
    <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-blue-50/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-primary">📐 연구 흐름 Logic Map</p>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>채움 <strong className="text-foreground">{overall}%</strong></span>
          <span>연결 <strong className="text-foreground">{overallStrength}%</strong></span>
        </div>
      </div>

      {/* 사각형 4꼭지점 — 한 화면에 모두 노출 */}
      <div className="relative mx-auto mt-4 aspect-[5/4] max-w-md">
        {/* 라인 SVG (배경) — Sprint 76: framer-motion strokeDashoffset 애니메이션 + 두께 강조 */}
        <svg
          viewBox="0 0 100 80"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          {[
            { x1: 22, y1: 14, x2: 78, y2: 14, st: stTop, key: "top" },
            { x1: 22, y1: 66, x2: 78, y2: 66, st: stBottom, key: "bottom" },
            { x1: 22, y1: 14, x2: 22, y2: 66, st: stLeft, key: "left" },
            { x1: 78, y1: 14, x2: 78, y2: 66, st: stRightDiag, key: "right" },
          ].map((seg, i) => (
            <motion.line
              key={seg.key}
              x1={seg.x1}
              y1={seg.y1}
              x2={seg.x2}
              y2={seg.y2}
              strokeWidth={lineWidth(seg.st)}
              className={lineColor(seg.st)}
              strokeLinecap="round"
              strokeDasharray={lineDash(seg.st) ?? "200"}
              initial={{ strokeDashoffset: 200, opacity: 0 }}
              animate={{ strokeDashoffset: 0, opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.15 + i * 0.12, ease: "easeOut" }}
            />
          ))}
          {/* 보조 대각선 2개 — 옅게, 더 늦게 */}
          {[
            { x1: 22, y1: 14, x2: 78, y2: 66, key: "diag1" },
            { x1: 78, y1: 14, x2: 22, y2: 66, key: "diag2" },
          ].map((seg, i) => (
            <motion.line
              key={seg.key}
              x1={seg.x1}
              y1={seg.y1}
              x2={seg.x2}
              y2={seg.y2}
              strokeWidth="0.6"
              className="stroke-primary/25"
              strokeDasharray="2 3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7 + i * 0.1 }}
            />
          ))}
        </svg>

        {/* 4 노드 카드 */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-2 p-2">
          {corners.map(({ id, cls }) => {
            const n = byId.get(id);
            if (!n) return null;
            const clickable = !!onJump && !!slides;
            const Element = clickable ? "button" : "div";
            return (
              <Element
                key={id}
                type={clickable ? "button" : undefined}
                onClick={clickable ? () => jumpToNode(id) : undefined}
                className={cn(
                  "relative z-10 flex flex-col items-center justify-center gap-1 rounded-xl border-2 bg-white p-2 shadow-sm transition-all",
                  cls,
                  fillBg(n.fill),
                  clickable && "cursor-pointer hover:scale-[1.03] hover:shadow-md",
                )}
                title={clickable ? `${n.label} — 클릭하면 ${n.fill < 80 ? "미작성 질문으로 이동" : "이 챕터 첫 질문으로 이동"}` : undefined}
              >
                <p className="text-center text-[10px] font-bold leading-tight sm:text-xs">{n.label}</p>
                <p className="text-base font-bold tabular-nums sm:text-lg">{n.fill}%</p>
                {clickable && n.fill < 80 && (
                  <p className="text-[9px] font-medium text-rose-700">미작성 → 이동</p>
                )}
              </Element>
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">
        🟢 진한 초록(굵음) = 강한 연결 (키워드 일치) · 🟡 노란 점선 = 연결 약함 · 🔴 빨간 점선 = 거의 없음. 선의 두께가 굵을수록 연결강도가 높습니다. 각 꼭지점을 클릭하면 해당 챕터의 미작성 질문으로 바로 이동합니다.
      </p>
    </div>
  );
}

// Sprint 74: 챕터 완료 축하 컴포넌트 — bridge 슬라이드에서 노출
const BRIDGE_TRANSITIONS: Record<string, { from: Chapter; to: Chapter }> = {
  "bridge-field-env": { from: "field", to: "env" },
  "bridge-env-learner": { from: "env", to: "learner" },
  "bridge-learner-task": { from: "learner", to: "task" },
  "bridge-task-theory": { from: "task", to: "theory" },
  "bridge-theory-prior": { from: "theory", to: "prior" },
};

function ChapterCelebration({
  bridgeId, slides, form,
}: {
  bridgeId: string;
  slides: SlideDef[];
  form: FormState;
}) {
  const transition = BRIDGE_TRANSITIONS[bridgeId];
  if (!transition) return null;
  const { from, to } = transition;
  const fromMeta = CHAPTER_META[from];
  const toMeta = CHAPTER_META[to];
  const ToIcon = toMeta.icon;

  const fromSlides = slides.filter((s) => s.chapter === from);
  const fromAnswered = fromSlides.filter((s) => isSlideAnswered(s.id, form)).length;
  const fromTotal = fromSlides.length;
  const completedChapterIdx = REAL_CHAPTERS.indexOf(from);

  return (
    <motion.div
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/50 p-4 text-center sm:p-6"
    >
      <motion.div
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.18, type: "spring", stiffness: 220, damping: 12 }}
        className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 shadow-lg sm:h-14 sm:w-14"
      >
        <PartyPopper size={22} className="text-white sm:hidden" />
        <PartyPopper size={26} className="hidden text-white sm:block" />
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.3 }}
        className="mt-2.5 text-base font-bold text-emerald-900 sm:text-lg"
      >
        🎉 {completedChapterIdx + 1}장 완료!
      </motion.p>
      <p className="text-sm text-emerald-800">
        {fromMeta.label} ({fromAnswered}/{fromTotal})
      </p>

      <div className="mt-3 flex items-center justify-center gap-1.5">
        {REAL_CHAPTERS.map((c, idx) => (
          <motion.div
            key={c}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4 + idx * 0.05 }}
            className={cn(
              "h-2 w-2 rounded-full",
              idx <= completedChapterIdx ? "bg-emerald-500" : "bg-emerald-200",
            )}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.35 }}
        className="mt-4 rounded-xl bg-white/70 p-3 text-left sm:mt-5 sm:p-4"
      >
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white",
              "bg-gradient-to-r",
              toMeta.color,
            )}
          >
            <ToIcon size={13} />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            다음 — {completedChapterIdx + 2}장
          </p>
        </div>
        <p className="mt-1.5 text-sm font-bold sm:text-base">{toMeta.label}</p>
      </motion.div>
    </motion.div>
  );
}

// Sprint 72 F2: 교육공학 대표 이론 프리셋 — 클릭 한 번으로 이름·학자·연도 자동 채움
const POPULAR_THEORIES: { name: string; scholar: string; year: string; tag?: string }[] = [
  { name: "사회적 구성주의", scholar: "Vygotsky", year: "1978", tag: "구성주의" },
  { name: "구성주의 학습이론", scholar: "Piaget", year: "1972", tag: "구성주의" },
  { name: "ARCS 동기이론", scholar: "Keller", year: "1987", tag: "동기" },
  { name: "자기효능감 이론", scholar: "Bandura", year: "1977", tag: "동기" },
  { name: "자기조절학습", scholar: "Zimmerman", year: "1989", tag: "학습전략" },
  { name: "성취목표이론", scholar: "Dweck", year: "1986", tag: "동기" },
  { name: "인지부하이론", scholar: "Sweller", year: "1988", tag: "인지" },
  { name: "Mayer 멀티미디어 학습", scholar: "Mayer", year: "2001", tag: "인지" },
  { name: "다중지능이론", scholar: "Gardner", year: "1983", tag: "학습자" },
  { name: "협동학습이론", scholar: "Johnson & Johnson", year: "1989", tag: "교수전략" },
  { name: "상황학습이론", scholar: "Lave & Wenger", year: "1991", tag: "구성주의" },
  { name: "인지적 도제이론", scholar: "Collins, Brown & Newman", year: "1989", tag: "교수전략" },
  { name: "Gagné 9 Events of Instruction", scholar: "Gagné", year: "1985", tag: "교수설계" },
  { name: "체제적 교수설계 (Dick & Carey)", scholar: "Dick & Carey", year: "1978", tag: "교수설계" },
  { name: "TPACK", scholar: "Mishra & Koehler", year: "2006", tag: "테크놀로지" },
  { name: "혁신확산이론", scholar: "Rogers", year: "1962", tag: "확산·정책" },
  { name: "거꾸로교실(플립러닝)", scholar: "Bergmann & Sams", year: "2012", tag: "교수전략" },
  { name: "행동주의", scholar: "Skinner", year: "1953", tag: "기초이론" },
];

// Sprint 75 F5: task-decompose 동적 list UI (인터뷰·Editor 양쪽에서 사용)
export function TaskStepsField({
  form, setField, compact = false,
}: { form: FormState; setField: SetField; compact?: boolean }) {
  // legacy taskDecompose 가 있고 taskSteps 가 비어있으면 1회 자동 split 으로 표시
  const steps = useMemo<string[]>(() => {
    if (form.taskSteps && form.taskSteps.length > 0) return form.taskSteps;
    if (!form.taskDecompose) return [];
    return form.taskDecompose
      .split(/\r?\n+/)
      .map((s) => s.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
      .filter((s) => s.length > 0);
  }, [form.taskSteps, form.taskDecompose]);

  function commit(next: string[]) {
    setField("taskSteps", next);
    // legacy 동기화 — 보고서 본문 출력 호환
    setField("taskDecompose", next.filter((s) => s.trim()).join("\n"));
  }

  function updateAt(idx: number, value: string) {
    const next = steps.length > 0 ? [...steps] : [];
    while (next.length <= idx) next.push("");
    next[idx] = value;
    commit(next);
  }
  function addStep() { commit([...(steps ?? []), ""]); }
  function removeAt(idx: number) { commit(steps.filter((_, i) => i !== idx)); }
  function moveUp(idx: number) {
    if (idx <= 0) return;
    const next = [...steps];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    commit(next);
  }
  function moveDown(idx: number) {
    if (idx >= steps.length - 1) return;
    const next = [...steps];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    commit(next);
  }

  const visible = steps.length > 0 ? steps : [""];

  return (
    <div className="space-y-1.5">
      {visible.map((s, idx) => (
        <div key={idx} className="flex items-center gap-1.5 sm:gap-2">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary tabular-nums sm:h-8 sm:w-8 sm:text-xs">
            {idx + 1}
          </span>
          <Input
            value={s}
            onChange={(e) => updateAt(idx, e.target.value)}
            placeholder={
              idx === 0
                ? "예: 협력학습 정의 인식"
                : idx === 1
                ? "예: 3대 원리 구분 (상호의존성·개별책무성·평등참여)"
                : "단계 내용을 적어주세요"
            }
            className={cn("flex-1 bg-white", compact ? "" : "text-base")}
            style={compact ? undefined : { fontSize: "16px" }}
          />
          <button
            type="button"
            onClick={() => moveUp(idx)}
            disabled={idx === 0}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-30"
            aria-label="위로"
            title="위로"
          >↑</button>
          <button
            type="button"
            onClick={() => moveDown(idx)}
            disabled={idx === visible.length - 1}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-30"
            aria-label="아래로"
            title="아래로"
          >↓</button>
          <button
            type="button"
            onClick={() => removeAt(idx)}
            disabled={visible.length === 1 && !s.trim()}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-rose-500 hover:bg-rose-50 disabled:opacity-30"
            aria-label="삭제"
            title="삭제"
          >×</button>
        </div>
      ))}
      <button
        type="button"
        onClick={addStep}
        className="inline-flex items-center gap-1 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
      >
        + 단계 추가
      </button>
      {form.taskDecompose && (!form.taskSteps || form.taskSteps.length === 0) && (
        <p className="text-[10px] text-muted-foreground">
          💡 기존에 한 번에 입력하신 내용을 자동으로 단계별로 분리했습니다. 자유롭게 편집해 주세요.
        </p>
      )}
    </div>
  );
}

function TheoryNameRenderer({ form, setField }: { form: FormState; setField: SetField }) {
  const card = form.theoryCards[0];
  const [showAllPresets, setShowAllPresets] = useState(false);
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

  function handlePickPreset(preset: typeof POPULAR_THEORIES[number]) {
    ensureFirstTheoryCard(form, setField, {
      name: preset.name,
      scholar: preset.scholar,
      year: preset.year,
    });
  }

  const presetVisible = showAllPresets ? POPULAR_THEORIES : POPULAR_THEORIES.slice(0, 8);
  const currentName = (card?.name ?? "").trim();

  return (
    <div className="space-y-3">
      {/* Sprint 72 F2: 대표 이론 프리셋 chip */}
      <div className="rounded-lg border-2 border-dashed border-emerald-200 bg-emerald-50/40 p-2.5">
        <p className="mb-1.5 text-[11px] font-semibold text-emerald-900">
          💡 자주 쓰이는 교육공학 이론 — 한 번 클릭하면 자동 입력됩니다 (수정 가능)
        </p>
        <div className="flex flex-wrap gap-1">
          {presetVisible.map((preset) => {
            const active = currentName === preset.name;
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => handlePickPreset(preset)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                  active
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-emerald-300 bg-white text-emerald-900 hover:bg-emerald-100",
                )}
              >
                <span className="font-medium">{preset.name}</span>
                <span className="text-[10px] opacity-70">· {preset.scholar}</span>
              </button>
            );
          })}
          {!showAllPresets && (
            <button
              type="button"
              onClick={() => setShowAllPresets(true)}
              className="inline-flex items-center rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[11px] text-emerald-700 hover:bg-emerald-50"
            >
              + {POPULAR_THEORIES.length - 8}개 더 보기
            </button>
          )}
        </div>
      </div>

      <Input
        value={card?.name ?? ""}
        onChange={(e) => ensureFirstTheoryCard(form, setField, { name: e.target.value })}
        placeholder="이론명 (예: 사회적 구성주의) — 위에서 선택하거나 직접 입력"
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
  // ── Chapter 1: 교육현장의 문제 정의 (Sprint 66: 트랙 시스템 폐지, 단일 흐름)
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
    prompt: "현재 관심 있는 교육 현장은 어떤 형태인가요?",
    hint: "지금 관찰·경험하고 계신(또는 다루고 싶은) 교육 현장의 운영 방식과 가장 가까운 것을 골라주세요. 대면 / 비대면 / 혼합(블렌디드).",
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
    references: [{ slideId: "field-phenomenon" }],
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
    prompt: "이 교육은 구체적으로 어떤 환경·조건에서 진행되나요?",
    hint: "수업 단위(예: 4주 8회기), 운영 형태(예: 토요일 대면 강의실 + 평일 비대면 토론), 사용 도구·플랫폼(예: Zoom · Padlet · Slack) 등 가능한 한 구체적으로 적어주세요.",
    references: [{ slideId: "field-format" }, { slideId: "field-subject" }],
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
    prompt: "이 연구에서 다루지 않는 것은 무엇인가요?",
    hint: "후속 비판을 사전에 방어하기 위해 명확히 합니다. ① 대상(예: 'A대학 1학년만, 대학원생은 제외') ② 매체(예: '비동기 학습은 제외, 동기 줌만') ③ 유형(예: '평가 도구 개발은 별도 연구') ④ 기간(예: '학기 중 중간고사 주는 제외')",
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

  // ── Bridge: field → env (Sprint 68)
  {
    id: "bridge-field-env",
    chapter: "bridge",
    prompt: "이제 학습이 일어나는 환경을 분석해보겠습니다",
    hint: "🎓 ID 분야 용어: Context Analysis(맥락 분석, Tessmer & Richey 1997). 정의한 현상이 어떤 학습 환경에서 일어나는지, 학습 후 어디서 발휘되는지, 어떤 제약이 있는지 살핍니다.",
    optional: true,
    render: (form) => {
      const phenomena = form.problemPhenomena.filter((p) => p.trim()).slice(0, 3);
      return (
        <div className="rounded-xl border-2 border-dashed border-cyan-200 bg-cyan-50/50 p-4 text-sm">
          <p className="font-semibold text-cyan-900">정의한 현장 문제 미리보기</p>
          {phenomena.length === 0 ? (
            <p className="mt-2 text-muted-foreground">아직 현상이 입력되지 않았어요.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-cyan-900/90">
              {phenomena.map((p, i) => (
                <li key={i} className="line-clamp-2">• {p}</li>
              ))}
            </ul>
          )}
        </div>
      );
    },
  },

  // ── Chapter 2: 환경 분석 (Sprint 68 — Tessmer & Richey 맥락 분석 모형)
  {
    id: "env-learning",
    chapter: "env",
    prompt: "학습이 일어나는 환경은 어떠한가요? (Learning Context · 학습 맥락)",
    hint: "🎓 ID 용어: Learning Context(학습 맥락). 학생들이 어디서·언제·무엇으로 공부하는가 — 강의실, 시간, 매체, 자원.",
    render: (form, setField) => (
      <Textarea
        value={form.envLearning}
        onChange={(e) => setField("envLearning", e.target.value)}
        placeholder="예: 90분 대면 강의실 (좌석 25석, 빔프로젝터). 모둠활동 시 4명씩 배치. Padlet·Slack 사용 가능."
        rows={5}
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
  },
  {
    id: "env-transfer",
    chapter: "env",
    prompt: "내가 설계한 프로그램을 적용한 후, 학습자가 획득한 능력은 어디에서 발휘·활용되나요? (Transfer Context · 전이 맥락)",
    hint: "🎓 ID 용어: Transfer Context(전이 맥락). 배운 능력을 어디에서 실제로 활용할지 — 다음 단원 학습, 후속 수업, 학교 밖 직장·일상·진로 등 구체적인 장면을 떠올려 적어주세요.",
    references: [{ slideId: "env-learning" }],
    render: (form, setField) => (
      <Textarea
        value={form.envTransfer}
        onChange={(e) => setField("envTransfer", e.target.value)}
        placeholder="예: 본인 학교 현장에서 협력학습 도입 — 수업 시간 단 45분, 학생 30명 환경에서 즉시 적용 예정."
        rows={5}
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
  },
  {
    id: "env-constraint",
    chapter: "env",
    prompt: "학습자는 어떤 동기·기대로 이 학습에 참여하며, 운영에는 어떤 외적 제약(정책·시간·예산·문화)이 있나요? (Orienting Context · 지향 맥락)",
    hint: "🎓 ID 용어: Orienting Context(지향 맥락). ① 학습자 측면 — 왜 이 학습에 참여하는지, 어떤 기대 또는 우려를 가지는지. ② 운영 측면 — 학교 또는 기관 정책, 차시 수 제한, 예산, 문화나 관행 등 반드시 고려해야 할 외적 제약을 함께 적어주세요.",
    references: [{ slideId: "env-learning" }, { slideId: "env-transfer" }],
    render: (form, setField) => (
      <Textarea
        value={form.envConstraint}
        onChange={(e) => setField("envConstraint", e.target.value)}
        placeholder="예: 1학기 12주 내 완료. 학교 평가 정책 상 객관식 비중 ≥70%. 학부모 반응 민감."
        rows={4}
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
  },

  // ── Bridge: env → learner (Sprint 68)
  {
    id: "bridge-env-learner",
    chapter: "bridge",
    prompt: "이제 그 환경에서 배우는 학습자를 분석해보겠습니다",
    hint: "🎓 ID 용어: Learner Analysis(학습자 분석, Smith & Ragan / Dick & Carey). 학습자를 모르고 만들면 처방이 빗나갑니다 — '1학년인데 4학년 수준 자료를 줬다' 같은 일이 자주 발생.",
    optional: true,
    render: (form) => {
      const env = form.envLearning.trim();
      return env ? (
        <div className="rounded-xl border-2 border-dashed border-cyan-200 bg-cyan-50/60 p-3 text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-700">정의한 학습 환경</p>
          <p className="mt-1 whitespace-pre-wrap text-cyan-900/90 line-clamp-3">{env}</p>
        </div>
      ) : (
        <p className="text-sm italic text-muted-foreground">앞 단계 답변이 비어있어요.</p>
      );
    },
  },

  // ── Chapter 3: 학습자 분석 (Sprint 68 — Smith & Ragan 학습자 분석 모형)
  {
    id: "learner-profile",
    chapter: "learner",
    prompt: "누구를 가르치는 연구인가요?",
    hint: "학년·인원·배경(전공/직업)을 한 줄로 적어주세요. 일상 관찰 그대로 적으면 됩니다.",
    render: (form, setField) => (
      <Input
        value={form.learnerProfile}
        onChange={(e) => setField("learnerProfile", e.target.value)}
        placeholder="예: 교육대학원 1학년 30명 (현직 교사 20명 + 일반 직장인 10명)"
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
  },
  {
    id: "learner-cognitive",
    chapter: "learner",
    prompt: "학습자의 인지·지식 수준은 어떠한가요?",
    references: [{ slideId: "learner-profile" }],
    hint: "사전 지식, 학습 습관, 전형적 오개념 등 — 학생들의 *머릿속*에서 일어나는 일을 묘사하세요.",
    render: (form, setField) => (
      <Textarea
        value={form.learnerCognitive}
        onChange={(e) => setField("learnerCognitive", e.target.value)}
        placeholder={"예: 통계 입문은 들었지만 R/SPSS 미경험. 협력학습은 ‘조별과제’ 정도로만 인식 — 비계 개념 모름."}
        rows={5}
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
  },
  {
    id: "learner-affective",
    chapter: "learner",
    prompt: "학습자의 정서·동기 상태는 어떠한가요?",
    references: [{ slideId: "learner-profile" }],
    hint: "학습에 대한 관심도, 자신감, 불안, 흥미 — 학생들의 *마음*에서 일어나는 일을 묘사하세요.",
    render: (form, setField) => (
      <Textarea
        value={form.learnerAffective}
        onChange={(e) => setField("learnerAffective", e.target.value)}
        placeholder={"예: ‘틀릴까봐 말 못함’ 두려움이 큼. 동료 평가에 민감. 수업 주제 자체에 대한 호기심은 높음."}
        rows={5}
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
  },

  // ── Bridge: learner → task (Sprint 68)
  {
    id: "bridge-learner-task",
    chapter: "bridge",
    prompt: "이제 학습 과제와 목표를 정의해보겠습니다",
    hint: "🎓 ID 용어: Task Analysis(과제 분석, Gagné / Jonassen) + Goal Analysis(목표 분석, Bloom · Mager · Krathwohl · Simpson). 학습자를 분석했으니 이제 무엇을 어떤 순서로 배워야 하는지 정리합니다.",
    optional: true,
    render: (form) => {
      const profile = form.learnerProfile.trim();
      return profile ? (
        <div className="rounded-xl border-2 border-dashed border-purple-200 bg-purple-50/60 p-3 text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-700">분석한 학습자</p>
          <p className="mt-1 text-purple-900/90 line-clamp-2">{profile}</p>
        </div>
      ) : (
        <p className="text-sm italic text-muted-foreground">앞 단계 답변이 비어있어요.</p>
      );
    },
  },

  // ── Chapter 4: 학습 과제·목표 분석 (Sprint 68 — Gagné 과제 분석 + Bloom · Krathwohl · Simpson 3대 영역 + Mager ABCD)
  {
    id: "task-decompose",
    chapter: "task",
    prompt: "학습 과제를 작은 단위로 쪼개면? (Task Analysis · 과제 분석)",
    hint: "🎓 ID 용어: Gagné 위계 / Jonassen 정보처리. 큰 학습 목표를 순서 있는 작은 단위로 분해해 학습자가 어떤 순서로 익혀야 하는지 정리합니다.",
    render: (form, setField) => <TaskStepsField form={form} setField={setField} />,
  },
  {
    id: "outcome-priority-domain",
    chapter: "task",
    prompt: "이 처치로 학습자의 어느 영역을 가장 우선적으로 변화시키려 하나요?",
    hint: "🎓 Bloom 3대 영역 — 인지(Cognitive · Bloom 1956) / 정의(Affective · Krathwohl 1964) / 심동(Psychomotor · Simpson). 한 가지 영역만 선택해 주세요. 우선순위에 따라 적합한 차시 수와 평가 방법이 달라집니다 (지도교수님께서 자주 확인하시는 항목입니다).",
    render: (form, setField) => {
      const opts: { v: "cognitive" | "affective" | "psychomotor" | "integrated"; label: string; desc: string }[] = [
        { v: "cognitive", label: "🧠 인지", desc: "지식·이해·사고" },
        { v: "affective", label: "❤️ 정의(태도)", desc: "태도·동기·가치" },
        { v: "psychomotor", label: "✋ 심동(기능)", desc: "기능·행동·실연" },
        { v: "integrated", label: "🔗 통합", desc: "2영역 이상" },
      ];
      const cur = form.outcomePriorityDomain;
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {opts.map((opt) => {
              const active = cur === opt.v;
              return (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setField("outcomePriorityDomain", opt.v)}
                  className={cn(
                    "rounded-xl border-2 p-3 text-left transition-all",
                    active
                      ? "border-[#003876] bg-[#003876]/5 shadow-sm"
                      : "border-muted bg-white hover:border-[#003876]/40 hover:bg-blue-50/40",
                  )}
                >
                  <p className="text-sm font-bold">{opt.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{opt.desc}</p>
                </button>
              );
            })}
          </div>
          {cur && (
            <div className="rounded-lg border-l-4 border-l-amber-400 bg-amber-50/60 p-3 text-xs leading-relaxed">
              <p className="font-semibold text-amber-900">📋 처치 적합성·차시 가이드</p>
              <div className="mt-1.5 space-y-1 text-amber-900/90">
                {cur === "cognitive" && (
                  <>
                    <p>✅ 권장 차시 예시: <strong>2~6차시 (단기 가능)</strong></p>
                    <p>📊 평가: 객관식·서술형·수행평가</p>
                    <p>⚠️ 단순 암기로 측정하면 이해·적용 누락 위험. Bloom 6단계 중 어느 수준까지 목표인지 명시해 주세요.</p>
                  </>
                )}
                {cur === "affective" && (
                  <>
                    <p>✅ 권장 차시 예시: <strong>최소 12차시 (Krathwohl 1964)</strong></p>
                    <p>📊 평가: 자기보고 + 행동관찰 + 심층면담 (자기보고만으로는 한계)</p>
                    <p>⚠️ 단기 처치(8차시 미만)는 일시적 변화일 가능성이 있어 사전·사후 + 지연(2~4주 후) 측정을 함께 권장합니다.</p>
                  </>
                )}
                {cur === "psychomotor" && (
                  <>
                    <p>✅ 권장 차시 예시: <strong>충분한 반복 연습 횟수 확보</strong></p>
                    <p>📊 평가: 관찰 체크리스트·실연 평가·루브릭</p>
                    <p>⚠️ 모델링 + 반복 + 즉시 피드백 3종이 필수입니다. 1회 시연만으로는 학습이 일어나기 어렵습니다.</p>
                  </>
                )}
                {cur === "integrated" && (
                  <>
                    <p>✅ 권장 차시 예시: <strong>정의적 목표가 포함되면 12차시 이상</strong></p>
                    <p>📊 평가: 영역별 도구 분리 (인지 + 정의 + 심동 각각)</p>
                    <p>⚠️ 어느 영역이 주(主)인지 명시해 주세요.</p>
                  </>
                )}
                <p className="mt-2 rounded-md border border-amber-300/70 bg-white/60 px-2 py-1.5 text-[11px] font-medium text-amber-900">
                  ⓘ 위 차시 안내는 일반적 권장 범위입니다. 실제 차시 수는 연구 맥락·연구 일정에 따라 달라지므로 반드시 지도교수님과 상의해 결정하세요.
                </p>
              </div>
            </div>
          )}
        </div>
      );
    },
  },
  {
    id: "outcome-cognitive",
    chapter: "task",
    prompt: "학습 목표 — 학습자가 무엇을 알고 이해할 수 있어야 하나요?",
    references: [{ slideId: "outcome-priority-domain" }],
    hint: "🎓 Bloom 인지 영역(Cognitive Domain, 1956). 기억/이해/적용/분석/평가/창조 — 학습자가 보여줄 행동 동사로 구체적으로 적어주세요.",
    render: (form, setField) => (
      <Textarea
        value={form.outcomeCognitive}
        onChange={(e) => setField("outcomeCognitive", e.target.value)}
        placeholder={"예: 협력학습의 3대 원리(상호의존성·개별책무성·평등참여)를 설명할 수 있다."}
        rows={5}
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
  },
  {
    id: "outcome-skill-attitude",
    chapter: "task",
    prompt: "학습 목표 — 학습자가 무엇을 할 수 있어야 하고, 어떤 태도를 가져야 하나요?",
    references: [{ slideId: "outcome-priority-domain" }],
    hint: "🎓 Krathwohl 정의적 영역(Affective Domain) + Simpson 심동적 영역(Psychomotor Domain). '경청한다', '논리적으로 응답한다', '동료 의견을 존중한다' 같은 형태.",
    render: (form, setField) => (
      <Textarea
        value={form.outcomeSkillAttitude}
        onChange={(e) => setField("outcomeSkillAttitude", e.target.value)}
        placeholder={"예: 모둠 토의 시 동료 의견을 1회 이상 인용하며 응답할 수 있다."}
        rows={5}
        className="bg-white text-base"
        style={{ fontSize: "16px" }}
      />
    ),
  },
  {
    id: "outcome-mager-abcd",
    chapter: "task",
    prompt: "학습 목표를 Mager ABCD 형식으로 정교화하면? (선택)",
    hint: "🎓 Mager 행동 목표. Audience(누가) · Behavior(무엇을) · Condition(어떤 조건) · Degree(얼마나) 네 요소를 분리해 적어주세요.",
    optional: true,
    render: (form, setField) => (
      <div className="space-y-2">
        <div className="rounded-lg border bg-white p-2.5">
          <p className="mb-1 text-[11px] font-semibold text-blue-900">A · Audience (학습자)</p>
          <Input
            value={form.outcomeMagerA}
            onChange={(e) => setField("outcomeMagerA", e.target.value)}
            placeholder="예: 교육대학원 1학년이"
            className="bg-white text-base"
            style={{ fontSize: "16px" }}
          />
        </div>
        <div className="rounded-lg border bg-white p-2.5">
          <p className="mb-1 text-[11px] font-semibold text-emerald-900">B · Behavior (관찰 가능한 행동)</p>
          <Textarea
            value={form.outcomeMagerB}
            onChange={(e) => setField("outcomeMagerB", e.target.value)}
            placeholder="예: 협력학습 사례를 보고 3대 원리 적용 여부를"
            rows={2}
            className="bg-white text-base"
            style={{ fontSize: "16px" }}
          />
        </div>
        <div className="rounded-lg border bg-white p-2.5">
          <p className="mb-1 text-[11px] font-semibold text-amber-900">C · Condition (수행 조건)</p>
          <Input
            value={form.outcomeMagerC}
            onChange={(e) => setField("outcomeMagerC", e.target.value)}
            placeholder="예: 5분 내 모둠 토의로"
            className="bg-white text-base"
            style={{ fontSize: "16px" }}
          />
        </div>
        <div className="rounded-lg border bg-white p-2.5">
          <p className="mb-1 text-[11px] font-semibold text-rose-900">D · Degree (성취 기준)</p>
          <Input
            value={form.outcomeMagerD}
            onChange={(e) => setField("outcomeMagerD", e.target.value)}
            placeholder="예: 4개 사례 중 3개 이상 정확히 판별할 수 있다."
            className="bg-white text-base"
            style={{ fontSize: "16px" }}
          />
        </div>
        {form.outcomeMagerABCD && !form.outcomeMagerA && !form.outcomeMagerB && !form.outcomeMagerC && !form.outcomeMagerD && (
          <details className="rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-900">
            <summary className="cursor-pointer font-medium">예전에 통합 입력하신 내용 보기 (참고용)</summary>
            <p className="mt-1 whitespace-pre-wrap text-amber-900/80">{form.outcomeMagerABCD}</p>
          </details>
        )}
      </div>
    ),
  },

  // ── Bridge: task → theory (Sprint 68)
  {
    id: "bridge-task-theory",
    chapter: "bridge",
    prompt: "이 학습 과제·목표를 받쳐줄 이론을 선택해보세요",
    hint: "🎓 분석한 학습자 + 정의한 학습 목표 — 이 두 축을 받쳐주는 교육공학 이론을 다음 단계에서 선택합니다.",
    optional: true,
    render: (form) => {
      const profile = form.learnerProfile.trim();
      const outcome = form.outcomeCognitive.trim() || form.outcomeSkillAttitude.trim();
      const domain = form.outcomePriorityDomain;
      const domainLabel = domain === "cognitive" ? "🧠 인지" : domain === "affective" ? "❤️ 정의(태도)" : domain === "psychomotor" ? "✋ 심동(기능)" : domain === "integrated" ? "🔗 통합" : "";
      return (
        <div className="space-y-2">
          {domain && (
            <div className="rounded-xl border-2 border-dashed border-amber-200 bg-amber-50/60 p-3 text-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">학습자에게 우선적으로 변화시키려는 영역</p>
              <p className="mt-1 text-amber-900/90 font-bold">{domainLabel}</p>
            </div>
          )}
          {profile && (
            <div className="rounded-xl border-2 border-dashed border-purple-200 bg-purple-50/60 p-3 text-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-700">학습자 프로필</p>
              <p className="mt-1 text-purple-900/90 line-clamp-2">{profile}</p>
            </div>
          )}
          {outcome && (
            <div className="rounded-xl border-2 border-dashed border-fuchsia-200 bg-fuchsia-50/60 p-3 text-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-fuchsia-700">학습 목표</p>
              <p className="mt-1 whitespace-pre-wrap text-fuchsia-900/90 line-clamp-3">{outcome}</p>
            </div>
          )}
          {!domain && !profile && !outcome && (
            <p className="text-sm italic text-muted-foreground">앞 단계 답변이 비어있어요.</p>
          )}
        </div>
      );
    },
  },

  // ── Chapter 5: 교육공학 이론 (was Chapter 3)
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
    references: [{ slideId: "theory-name" }, { slideId: "field-phenomenon" }],
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
      const profile = form.learnerProfile.trim();
      const outcome = form.outcomeCognitive.trim() || form.outcomeSkillAttitude.trim();
      return (
        <div className="space-y-1">
          {profile && (
            <p className="rounded-md bg-purple-50 px-2 py-1.5 text-[11px] text-purple-900">
              👥 학습자: <strong className="ml-0.5">{profile.slice(0, 80)}</strong>
            </p>
          )}
          {outcome && (
            <p className="rounded-md bg-fuchsia-50 px-2 py-1.5 text-[11px] text-fuchsia-900">
              🎯 학습 목표: <strong className="ml-0.5">{outcome.slice(0, 80)}</strong>
            </p>
          )}
        </div>
      );
    },
    lint: (form) => {
      const reason = form.theoryCards[0]?.selectionReason ?? "";
      if (!reason.trim()) return null;
      const outcome = `${form.outcomeCognitive} ${form.outcomeSkillAttitude}`.trim();
      if (outcome && !hasKeywordOverlap(outcome, reason)) {
        return "선택 이유에 ‘학습 목표’ 키워드가 안 보입니다. 목표 → 이론의 연결을 한두 단어 명시하면 논리가 단단해집니다.";
      }
      return null;
    },
  },
  {
    id: "theory-link",
    chapter: "theory",
    prompt: "이론과 현장 문제는 어떻게 연결되나요?",
    references: [{ slideId: "theory-name" }, { slideId: "field-phenomenon" }],
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
      const outcome = `${form.outcomeCognitive} ${form.outcomeSkillAttitude}`.trim();
      const profile = form.learnerProfile.trim();
      const keywords = Array.from(
        new Set([
          ...(theoryName ? extractKeywords(theoryName).slice(0, 3) : []),
          ...(outcome ? extractKeywords(outcome).slice(0, 3) : []),
          ...(profile ? extractKeywords(profile).slice(0, 2) : []),
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
    references: [{ slideId: "field-phenomenon" }, { slideId: "theory-name" }],
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
      const profile = form.learnerProfile.trim();
      const outcome = (form.outcomeCognitive.trim() || form.outcomeSkillAttitude.trim());
      if (!theoryName && !profile && !outcome) return null;
      return (
        <div className="space-y-1">
          {theoryName && (
            <p className="rounded-md bg-emerald-50 px-2 py-1.5 text-[11px] text-emerald-900">
              📚 선택 이론: <strong className="ml-0.5">{theoryName}</strong>
            </p>
          )}
          {profile && (
            <p className="rounded-md bg-purple-50 px-2 py-1.5 text-[11px] text-purple-900">
              👥 학습자: <strong className="ml-0.5">{profile.slice(0, 80)}</strong>
            </p>
          )}
          {outcome && (
            <p className="rounded-md bg-fuchsia-50 px-2 py-1.5 text-[11px] text-fuchsia-900">
              🎯 학습 목표: <strong className="ml-0.5">{outcome.slice(0, 80)}</strong>
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

  // Sprint 76: 작성 중 페이지 이탈 방지 — beforeunload 확인 (브라우저 새로고침/탭닫기/외부링크)
  useEffect(() => {
    if (!open || !dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [open, dirty]);

  // Sprint 67: 트랙 시스템 폐지 — 단일 흐름이라 slides 는 SLIDES 그대로
  // Sprint 72 F3: 조건부 슬라이드 — theory-integration 은 이론 카드 2개 이상일 때만 노출
  // Sprint 75 F7: 중복 슬라이드 제거 — field-audience(Q1)·field-scope-context(Q8) 비공개.
  //   - field-audience 는 learner-profile 에서 통합
  //   - field-scope-context 는 env-learning(Learning Context) 에서 통합
  //   - DB 데이터(fieldAudience/scopeContext)는 보존 — 보고서 본문 출력에는 그대로 반영
  const SLIDES_HIDDEN = new Set(["field-audience", "field-scope-context"]);
  const slides = useMemo(
    () =>
      SLIDES.filter((s) => {
        if (SLIDES_HIDDEN.has(s.id)) return false;
        if (s.id === "theory-integration") return (form.theoryCards?.length ?? 0) >= 2;
        return true;
      }),
    [form.theoryCards?.length],
  );

  const totalSlides = slides.length;
  const progress = index < 0 ? 0 : ((index + 1) / totalSlides) * 100;
  // Sprint 76: 진행률 바 작성/미작성 색상 분리 — bridge 제외 real 슬라이드 기준
  const realSlides = useMemo(() => slides.filter((s) => s.chapter !== "bridge"), [slides]);
  const answeredRealCount = useMemo(
    () => realSlides.filter((s) => isSlideAnswered(s.id, form)).length,
    [realSlides, form],
  );
  const totalReal = realSlides.length;
  const answeredPct = totalReal > 0 ? (answeredRealCount / totalReal) * 100 : 0;
  const slide = index >= 0 ? slides[index] : null;

  // index가 새로운 slides 길이를 넘는 경우 안전 클램프
  useEffect(() => {
    if (index >= totalSlides) {
      setIndex(totalSlides - 1);
    }
  }, [totalSlides, index]);

  const chapterCounts = useMemo(() => {
    const m: Record<Chapter, number> = {
      field: 0,
      env: 0,
      learner: 0,
      task: 0,
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
            onClick={() => {
              if (dirty) {
                const ok = window.confirm(
                  "작성 중인 내용이 있습니다. 저장하지 않고 종료하면 마지막 임시저장 이후의 변경 사항은 사라집니다. 정말 종료할까요?",
                );
                if (!ok) return;
              }
              onClose();
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            title="인터뷰 종료"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Sprint 76: 진행률 바 — 작성(emerald) / 미작성(rose) 두 영역으로 분리. 현재 위치는 위 마커. */}
      <div className="relative h-1.5 w-full bg-muted">
        <div className="flex h-full w-full overflow-hidden">
          <motion.div
            className="h-full bg-emerald-500"
            animate={{ width: `${answeredPct}%` }}
            transition={{ duration: 0.4 }}
            title={`작성 완료 ${answeredRealCount}/${totalReal} (${Math.round(answeredPct)}%)`}
          />
          <motion.div
            className="h-full bg-rose-300"
            animate={{ width: `${100 - answeredPct}%` }}
            transition={{ duration: 0.4 }}
            title={`미작성 ${totalReal - answeredRealCount}개`}
          />
        </div>
        {/* 현재 슬라이드 위치 마커 */}
        {index >= 0 && (
          <motion.div
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-white shadow-md"
            animate={{ left: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        )}
      </div>

      {/* Sprint 73: 챕터별 슬라이드 navigator (인트로에선 숨김) */}
      {index >= 0 && (
        <details className="border-b bg-white/40 dark:bg-card/40">
          <summary className="flex cursor-pointer items-center justify-between px-3 py-1.5 text-[11px] text-muted-foreground hover:bg-muted/30 sm:px-4">
            <span>📍 진행 위치 — 클릭으로 이동, 채워진 점 = 작성 완료</span>
            <span className="tabular-nums">{Math.round(progress)}%</span>
          </summary>
          <SlideNavigator slides={slides} currentIdx={index} form={form} onJump={setIndex} />
        </details>
      )}

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
              {/* Sprint 74: bridge 슬라이드일 때 챕터 완료 축하 (5종 매핑된 것만) */}
              {slide.chapter === "bridge" && BRIDGE_TRANSITIONS[slide.id] && (
                <div className="mt-4 sm:mt-6">
                  <ChapterCelebration bridgeId={slide.id} slides={slides} form={form} />
                </div>
              )}
              {/* Sprint 73: 이전 답변 참조 카드 (references 있는 슬라이드에서만) */}
              {slide.references && slide.references.length > 0 && (
                <PreviousAnswerCard
                  references={slide.references}
                  form={form}
                  slides={slides}
                  onJump={setIndex}
                />
              )}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.35 }}
                className="mt-4 sm:mt-8"
              >
                {/* Sprint 74: completion-map 은 직접 렌더 (slides+onJump 전달) */}
                {slide.id === "completion-map" ? (
                  <ResearchLogicMap form={form} slides={slides} onJump={setIndex} />
                ) : (
                  slide.render(form, setField)
                )}
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

// Sprint 73: 이전 답변 참조 카드 — 의미상 직전 답변에 의존하는 슬라이드에서 노출
function PreviousAnswerCard({
  references, form, slides, onJump,
}: {
  references: { slideId: string; getValue?: (form: FormState) => string | null }[];
  form: FormState;
  slides: SlideDef[];
  onJump: (idx: number) => void;
}) {
  const items = references.map((ref) => {
    const targetIdx = slides.findIndex((s) => s.id === ref.slideId);
    const targetSlide = targetIdx >= 0 ? slides[targetIdx] : null;
    const value = ref.getValue ? ref.getValue(form) : getSlideAnswerPreview(ref.slideId, form);
    return { ref, targetIdx, targetSlide, value: value?.trim() ?? "" };
  });

  // 모든 참조가 비어있으면 가운데 CTA 형태로 안내
  const allEmpty = items.every((it) => !it.value);
  if (allEmpty) {
    const firstRef = items[0];
    if (!firstRef?.targetSlide || firstRef.targetIdx < 0) return null;
    return (
      <div className="mt-3 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/60 px-4 py-5 text-center sm:py-6">
        <div className="mb-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700 sm:h-10 sm:w-10">
          <Pencil size={16} />
        </div>
        <p className="text-sm font-semibold text-amber-900">앞 단계 답변이 비어있어요</p>
        <p className="mt-1 max-w-md text-[11px] leading-relaxed text-amber-900/80 sm:text-xs">
          이 질문은 앞서 작성한 <strong>{firstRef.targetSlide.prompt}</strong> 답변을 토대로 풀어가면 더 자연스럽습니다.
          먼저 그 답변부터 채워보세요.
        </p>
        <button
          type="button"
          onClick={() => onJump(firstRef.targetIdx)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-amber-700 sm:text-sm"
        >
          <ArrowRight size={14} />
          답변하러 가기
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        💭 앞서 작성한 답변
      </p>
      {items.filter((it) => it.value).map((it) => (
        <div
          key={it.ref.slideId}
          className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium text-muted-foreground">
              {it.targetSlide?.prompt ?? it.ref.slideId}
            </p>
            <p className="mt-0.5 line-clamp-2 text-xs text-foreground/90">{it.value}</p>
          </div>
          {it.targetIdx >= 0 && (
            <button
              type="button"
              onClick={() => onJump(it.targetIdx)}
              className="shrink-0 inline-flex items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-100"
              title="이 답변을 수정하러 가기"
            >
              <Pencil size={10} />
              수정
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// Sprint 73: 챕터별 dot navigator + 미작성 색상 + 클릭 점프
function SlideNavigator({
  slides, currentIdx, form, onJump,
}: {
  slides: SlideDef[];
  currentIdx: number;
  form: FormState;
  onJump: (idx: number) => void;
}) {
  // chapter별 그룹
  const groups = useMemo(() => {
    const map = new Map<Chapter, { slide: SlideDef; idx: number }[]>();
    slides.forEach((s, idx) => {
      if (s.chapter === "bridge") return; // bridge 는 별도 처리 안 함
      const arr = map.get(s.chapter) ?? [];
      arr.push({ slide: s, idx });
      map.set(s.chapter, arr);
    });
    return REAL_CHAPTERS
      .filter((c) => map.has(c))
      .map((c) => ({ chapter: c, items: map.get(c) ?? [] }));
  }, [slides]);

  return (
    <div className="space-y-1.5 px-3 pb-2 pt-1.5 sm:px-4">
      {groups.map(({ chapter, items }) => {
        const meta = CHAPTER_META[chapter];
        const Icon = meta.icon;
        const answeredCount = items.filter((it) => isSlideAnswered(it.slide.id, form)).length;
        return (
          <div key={chapter} className="flex items-center gap-2">
            <div className="flex w-32 shrink-0 items-center gap-1.5 text-[11px]">
              <Icon size={11} className="text-muted-foreground" />
              <span className="truncate font-medium">{meta.label}</span>
              <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
                {answeredCount}/{items.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {items.map(({ slide, idx }) => {
                const answered = isSlideAnswered(slide.id, form);
                const isCurrent = idx === currentIdx;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => onJump(idx)}
                    title={`Q${idx + 1}. ${slide.prompt}`}
                    aria-label={`Q${idx + 1} ${answered ? "(작성)" : "(미작성)"}: ${slide.prompt}`}
                    className={cn(
                      "h-5 w-5 rounded-full border-2 transition-all sm:h-6 sm:w-6",
                      isCurrent
                        ? "border-primary bg-primary/30 ring-2 ring-primary/40"
                        : answered
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-rose-400 bg-rose-100 hover:bg-rose-200",
                    )}
                  >
                    {answered && !isCurrent && (
                      <CheckCircle2 size={10} className="mx-auto text-white sm:hidden" />
                    )}
                    {answered && !isCurrent && (
                      <CheckCircle2 size={12} className="mx-auto hidden text-white sm:block" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
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
