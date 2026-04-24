"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  X, ChevronLeft, ChevronRight, Save, Loader2, Sparkles, MessageSquareQuote,
  School, BookOpen, FlaskConical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FormState, SetField } from "./ResearchReportEditor";
import type { EducationFormat, TheoryCard } from "@/types";

type Chapter = "field" | "theory" | "prior";

const CHAPTER_META: Record<Chapter, { label: string; icon: React.ElementType; color: string }> = {
  field: { label: "교육현장의 문제 정의", icon: School, color: "from-amber-500 to-orange-500" },
  theory: { label: "교육공학 이론", icon: BookOpen, color: "from-emerald-500 to-teal-500" },
  prior: { label: "선행연구 분석", icon: FlaskConical, color: "from-blue-500 to-indigo-500" },
};

interface SlideDef {
  id: string;
  chapter: Chapter;
  prompt: string;
  hint?: string;
  optional?: boolean;
  render: (form: FormState, setField: SetField) => React.ReactNode;
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

const SLIDES: SlideDef[] = [
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

  // ── Chapter 2: 교육공학 이론
  {
    id: "theory-name",
    chapter: "theory",
    prompt: "이 문제를 설명할 수 있는 핵심 이론은 무엇인가요?",
    hint: "이론 이름과 학자(연도)를 함께 적으면 좋아요. 여러 이론은 전체 모드에서 카드로 추가할 수 있습니다.",
    render: (form, setField) => {
      const card = form.theoryCards[0];
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
        </div>
      );
    },
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

  const totalSlides = SLIDES.length;
  const progress = index < 0 ? 0 : ((index + 1) / totalSlides) * 100;
  const slide = index >= 0 ? SLIDES[index] : null;

  const chapterCounts = useMemo(() => {
    const m: Record<Chapter, number> = { field: 0, theory: 0, prior: 0 };
    for (const s of SLIDES) m[s.chapter] += 1;
    return m;
  }, []);

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
                {(Object.keys(chapterCounts) as Chapter[]).map((c) => {
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
