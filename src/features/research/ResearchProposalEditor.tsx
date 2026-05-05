"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Save, CheckCircle2, ClipboardList, Link2, X,
  BookMarked, MessageSquareQuote, LayoutList, ChevronLeft, ChevronRight, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { User, ResearchProposal, ResearchPaper } from "@/types";
import {
  useResearchProposal,
  useEnsureResearchProposal,
  useUpdateResearchProposal,
} from "./useResearchProposal";
import { useResearchPapers } from "./useResearchPapers";
import { useLogWritingActivity } from "./useWritingPaperHistory";
import { formatApa7 } from "@/lib/apa7";

interface Props {
  user: User;
  readOnly?: boolean;
}

interface FormState {
  titleKo: string;
  titleEn: string;
  purpose: string;
  scope: string;
  method: string;
  content: string;
  referencePaperIds: string[];
}

const EMPTY: FormState = {
  titleKo: "",
  titleEn: "",
  purpose: "",
  scope: "",
  method: "",
  content: "",
  referencePaperIds: [],
};

function fromProposal(p: ResearchProposal | undefined): FormState {
  if (!p) return EMPTY;
  return {
    titleKo: p.titleKo ?? "",
    titleEn: p.titleEn ?? "",
    purpose: p.purpose ?? "",
    scope: p.scope ?? "",
    method: p.method ?? "",
    content: p.content ?? "",
    referencePaperIds: p.referencePaperIds ?? [],
  };
}

function totalChars(form: FormState): number {
  return (
    form.titleKo.length +
    form.titleEn.length +
    form.purpose.length +
    form.scope.length +
    form.method.length +
    form.content.length
  );
}

function PaperSelector({
  papers,
  selectedIds,
  onToggle,
  disabled,
}: {
  papers: ResearchPaper[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = papers.filter(
    (p) =>
      !p.isDraft &&
      (p.title.toLowerCase().includes(search.toLowerCase()) ||
        (p.authors ?? "").toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {selectedIds.map((id) => {
          const p = papers.find((x) => x.id === id);
          const label = p ? p.title.slice(0, 30) + (p.title.length > 30 ? "…" : "") : id;
          return (
            <Badge key={id} variant="secondary" className="gap-1 pr-1 text-xs">
              {label}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onToggle(id)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                >
                  <X size={10} />
                </button>
              )}
            </Badge>
          );
        })}
      </div>
      {!disabled && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
          >
            <Link2 size={12} />
            논문 연결 (참고문헌 추가)
          </button>
          {open && (
            <div className="absolute left-0 top-full z-10 mt-1 w-80 rounded-lg border bg-card p-2 shadow-lg">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="논문 제목·저자 검색..."
                className="mb-2 h-8 text-xs"
                autoFocus
              />
              <div className="max-h-48 space-y-0.5 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="py-3 text-center text-xs text-muted-foreground">검색 결과 없음</p>
                ) : (
                  filtered.slice(0, 20).map((p) => {
                    const sel = selectedIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onToggle(p.id)}
                        className={cn(
                          "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                          sel ? "bg-primary/10 text-primary" : "hover:bg-muted",
                        )}
                      >
                        <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border text-[9px]">
                          {sel ? "✓" : ""}
                        </span>
                        <span className="line-clamp-2">
                          {p.title} {p.year ? `(${p.year})` : ""}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-1 w-full rounded-md bg-muted py-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                닫기
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type ViewMode = "single" | "interview";

interface InterviewStep {
  key: keyof FormState | "references";
  title: string;
  hint: string;
  question: string;
  helpers?: string[];
  placeholder?: string;
  rows?: number;
  inputKind: "title-pair" | "textarea" | "references";
}

const INTERVIEW_STEPS: InterviewStep[] = [
  {
    key: "titleKo",
    title: "1. 논문 제목",
    hint: "국문·영문 제목을 짧게 한 줄로 정리해 주세요.",
    question: "어떤 주제의 논문을 쓰려고 하시나요?",
    helpers: [
      "독자에게 무엇을·누구에게·어떻게 다룰지 한 문장으로 압축하면 좋습니다.",
      "예: 생성형 AI 기반 쓰기 피드백이 중학생의 논설문 쓰기 능력에 미치는 영향",
    ],
    inputKind: "title-pair",
  },
  {
    key: "purpose",
    title: "2. 연구 목적",
    hint: "이 연구가 답하고자 하는 핵심 질문과 도달하려는 목표를 적어 주세요.",
    question: "이 연구를 통해 무엇을 밝히고 싶으신가요?",
    helpers: [
      "‘왜’ 이 연구가 필요한지(문제의식)와 ‘무엇’을 확인할지를 모두 담아 주세요.",
      "연구 질문(RQ) 형태로 1~3개 제시해도 좋습니다.",
    ],
    placeholder:
      "예: 본 연구는 생성형 AI 기반 쓰기 피드백이 학습자의 쓰기 능력 향상과 쓰기 동기에 미치는 효과를 규명하는 데 목적이 있다.",
    rows: 7,
    inputKind: "textarea",
  },
  {
    key: "scope",
    title: "3. 연구 범위",
    hint: "연구 대상·기간·지역·주제를 구체적으로 한정해 주세요.",
    question: "누구를·언제·어디서·어떤 주제로 한정해서 살펴볼 계획인가요?",
    helpers: [
      "표집 단위(학교·학년·학급), 기간(주차), 지역, 주제적 한계를 명시하면 평가에 유리합니다.",
    ],
    placeholder:
      "예: 서울 소재 중학교 2학년 3개 학급(총 78명)을 대상으로 2026년 3월~6월(12주) 논설문 쓰기 단원에 한정한다.",
    rows: 7,
    inputKind: "textarea",
  },
  {
    key: "method",
    title: "4. 연구 방법",
    hint: "연구 설계·자료 수집·분석 절차를 단계별로 정리해 주세요.",
    question: "연구 질문에 답하기 위해 어떤 절차로 자료를 모으고 분석하실 건가요?",
    helpers: [
      "양적·질적·혼합 설계 중 무엇을 택하는지, 통계 기법(예: ANCOVA)·분석 도구(예: SPSS)도 함께 적어 주세요.",
    ],
    placeholder:
      "예: 사전-사후 통제집단 실험설계를 적용한다. 실험집단은 AI 기반 피드백, 통제집단은 교사 피드백을 받는다. 쓰기 능력은 루브릭 기반 평가자 간 일치도(IRR)를 확보하여 측정하고, SPSS 27을 활용하여 공분산분석(ANCOVA)을 실시한다.",
    rows: 9,
    inputKind: "textarea",
  },
  {
    key: "content",
    title: "5. 연구 내용",
    hint: "전체 연구를 단계별 과제로 쪼개 적어 주세요.",
    question: "이 연구를 단계별로 쪼개면 어떤 과제로 구성되나요?",
    helpers: [
      "1) … 2) … 3) … 형식으로 나열하면 학위논문 목차로도 바로 활용할 수 있습니다.",
    ],
    placeholder: `예:
1) 이론적 배경 정리: 쓰기 피드백 이론, 생성형 AI 교육 활용 선행연구 고찰
2) 프롬프트 및 피드백 루브릭 개발 및 전문가 타당화
3) 실험 실시 (12주): 매주 1회 쓰기 과제 및 피드백 제공
4) 사전·사후 쓰기 능력 측정, 동기 설문, 학습자 인식 인터뷰
5) 양적·질적 자료 통합 분석`,
    rows: 10,
    inputKind: "textarea",
  },
  {
    key: "references",
    title: "6. 참고문헌 (APA 7)",
    hint: "‘논문 읽기’에 등록한 논문을 검색해 추가하면 APA 7판 형식으로 자동 변환됩니다.",
    question: "이 연구의 토대가 되는 핵심 선행 연구는 무엇인가요?",
    helpers: [
      "‘논문 읽기’에 미리 정리해 둔 논문을 검색해 빠르게 연결할 수 있습니다.",
    ],
    inputKind: "references",
  },
];

function isFieldFilled(form: FormState, key: InterviewStep["key"]): boolean {
  if (key === "references") return form.referencePaperIds.length > 0;
  if (key === "titleKo") return !!form.titleKo.trim() || !!form.titleEn.trim();
  return !!String(form[key] ?? "").trim();
}

export default function ResearchProposalEditor({ user, readOnly = false }: Props) {
  const { proposal, isLoading } = useResearchProposal(user.id);
  const ensure = useEnsureResearchProposal();
  const update = useUpdateResearchProposal();
  const logActivity = useLogWritingActivity();
  const { papers } = useResearchPapers(user.id);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const ensureTriggeredRef = useRef(false);
  const [viewMode, setViewMode] = useState<ViewMode>("single");
  const [interviewStep, setInterviewStep] = useState(0);

  useEffect(() => {
    if (readOnly || isLoading || proposal || ensureTriggeredRef.current) return;
    ensureTriggeredRef.current = true;
    ensure.mutate(user.id);
  }, [proposal, isLoading, readOnly, user.id, ensure]);

  useEffect(() => {
    if (proposal && !hydrated) {
      setForm(fromProposal(proposal));
      setSavedAt(proposal.lastSavedAt ?? proposal.updatedAt ?? null);
      setHydrated(true);
    }
  }, [proposal, hydrated]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function toggleReference(paperId: string) {
    const ids = form.referencePaperIds.includes(paperId)
      ? form.referencePaperIds.filter((x) => x !== paperId)
      : [...form.referencePaperIds, paperId];
    setField("referencePaperIds", ids);
  }

  async function handleSave(showToast = true) {
    if (!proposal || readOnly) return;
    setSaving(true);
    const now = new Date().toISOString();
    try {
      await update.mutateAsync({
        id: proposal.id,
        data: { ...form, lastSavedAt: now },
      });
      setSavedAt(now);
      setDirty(false);
      logActivity.mutate({
        userId: user.id,
        paperId: proposal.id,
        charCount: totalChars(form),
        lastChapter: "proposal" as never,
        title: form.titleKo || "연구 계획서",
      });
      if (showToast) toast.success("저장되었습니다.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  async function handleDraftSave() {
    await handleSave(false);
    toast.success("임시 저장되었습니다.");
  }

  const total = useMemo(() => totalChars(form), [form]);

  // 참고문헌(ResearchPaper) 데이터 → APA7 목록 (저자·연도 순 정렬)
  const referencedPapers = useMemo(
    () => papers.filter((p) => form.referencePaperIds.includes(p.id)),
    [papers, form.referencePaperIds],
  );
  const apa7Sorted = useMemo(
    () =>
      [...referencedPapers].sort((a, b) => {
        const an = (a.authors ?? "").localeCompare(b.authors ?? "", "ko");
        if (an !== 0) return an;
        return (a.year ?? 0) - (b.year ?? 0);
      }),
    [referencedPapers],
  );

  // ⚠️ Sprint 66 fix: 모든 hook(useMemo/useState 등)을 early return *이전*에 호출해야 React Hooks Rules 위반 방지.
  // 이전: line 366 early return → 375 useMemo 호출 → "Rendered more hooks than previous render" → 전역 error boundary 트리거.
  const totalSteps = INTERVIEW_STEPS.length;
  const filledSteps = useMemo(
    () => INTERVIEW_STEPS.filter((s) => isFieldFilled(form, s.key)).length,
    [form],
  );
  const completionPercent = Math.round((filledSteps / totalSteps) * 100);

  if (isLoading || (!proposal && !readOnly)) {
    return (
      <p className="rounded-2xl border bg-card py-10 text-center text-sm text-muted-foreground">
        연구 계획서를 불러오는 중...
      </p>
    );
  }

  async function moveToStep(target: number) {
    const next = Math.max(0, Math.min(totalSteps - 1, target));
    if (dirty && !readOnly) {
      // 단계 전환 시 자동 임시저장
      await handleSave(false);
    }
    setInterviewStep(next);
  }

  function renderHeader() {
    return (
      <section className="rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-primary" />
            <div>
              <h3 className="text-sm font-semibold">연구 계획서</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                논문 작성을 위한 연구 계획을 체계적으로 정리합니다. · {total.toLocaleString()}자
                {viewMode === "interview" && ` · 진행 ${filledSteps}/${totalSteps}`}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <div className="inline-flex overflow-hidden rounded-md border">
              <button
                type="button"
                onClick={() => setViewMode("single")}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                  viewMode === "single"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-muted",
                )}
                title="단순 화면 — 모든 항목을 한 번에 작성"
              >
                <LayoutList size={12} /> 단순 화면
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode("interview");
                  // 첫 빈 항목으로 점프
                  const firstEmpty = INTERVIEW_STEPS.findIndex((s) => !isFieldFilled(form, s.key));
                  setInterviewStep(firstEmpty < 0 ? 0 : firstEmpty);
                }}
                className={cn(
                  "flex items-center gap-1 border-l px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                  viewMode === "interview"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-muted",
                )}
                title="인터뷰 모드 — 한 항목씩 차근차근 답변"
              >
                <MessageSquareQuote size={12} /> 인터뷰 모드
              </button>
            </div>
            {!readOnly && (
              <>
                {savedAt && !saving && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    {(() => {
                      const diff = Date.now() - new Date(savedAt).getTime();
                      if (diff < 60_000) return "방금 저장됨";
                      const t = new Date(savedAt);
                      return `${t.getHours().toString().padStart(2, "0")}:${t.getMinutes().toString().padStart(2, "0")} 저장됨`;
                    })()}
                  </span>
                )}
                <Button variant="outline" size="sm" onClick={handleDraftSave} disabled={saving || !dirty}>
                  {saving && <Save size={12} className="mr-1 animate-pulse" />}
                  임시저장
                </Button>
                <Button size="sm" onClick={() => handleSave()} disabled={saving}>
                  <Save size={12} className="mr-1" />
                  저장
                </Button>
              </>
            )}
          </div>
        </div>
        {viewMode === "interview" && (
          <div className="mt-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-gradient-to-r from-primary/70 to-primary transition-[width] duration-300"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {INTERVIEW_STEPS.map((s, i) => {
                const filled = isFieldFilled(form, s.key);
                const active = i === interviewStep;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => moveToStep(i)}
                    className={cn(
                      "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : filled
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300"
                          : "border-muted bg-card text-muted-foreground hover:border-primary/40",
                    )}
                    title={s.title}
                  >
                    {filled && <CheckCircle2 size={10} />}
                    {`${i + 1}. ${s.title.replace(/^\d+\.\s*/, "")}`}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>
    );
  }

  // 인터뷰 모드: 한 단계만 표시
  if (viewMode === "interview") {
    const step = INTERVIEW_STEPS[interviewStep];
    const isLast = interviewStep === totalSteps - 1;
    const isFirst = interviewStep === 0;
    const filled = isFieldFilled(form, step.key);

    return (
      <div className="space-y-4">
        {renderHeader()}

        <section className="rounded-2xl border-2 border-primary/15 bg-gradient-to-br from-white to-primary/5 p-6">
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <Sparkles size={14} />
            Step {interviewStep + 1} / {totalSteps} · {step.title}
          </div>

          <h3 className="mt-3 text-lg font-bold leading-snug text-foreground sm:text-xl">
            {step.question}
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{step.hint}</p>

          {step.helpers && step.helpers.length > 0 && (
            <ul className="mt-3 space-y-1 rounded-xl bg-card/70 p-3 text-xs text-muted-foreground">
              {step.helpers.map((h, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="mt-0.5 text-primary/60">•</span>
                  <span className="leading-relaxed">{h}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5">
            {step.inputKind === "title-pair" && (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    논문 제목 (국문)
                  </label>
                  <Input
                    value={form.titleKo}
                    onChange={(e) => setField("titleKo", e.target.value)}
                    placeholder="예: 생성형 AI 기반 쓰기 피드백이 중학생의 논설문 쓰기 능력에 미치는 영향"
                    disabled={readOnly}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    논문 제목 (영문)
                  </label>
                  <Input
                    value={form.titleEn}
                    onChange={(e) => setField("titleEn", e.target.value)}
                    placeholder="e.g., The Effect of Generative AI-based Writing Feedback on Middle School Students' Argumentative Writing"
                    disabled={readOnly}
                  />
                </div>
              </div>
            )}

            {step.inputKind === "textarea" && (
              <Textarea
                value={String(form[step.key as keyof FormState] ?? "")}
                onChange={(e) => setField(step.key as keyof FormState, e.target.value as never)}
                placeholder={step.placeholder}
                rows={step.rows ?? 6}
                disabled={readOnly}
                autoFocus
              />
            )}

            {step.inputKind === "references" && (
              <div className="space-y-4">
                <PaperSelector
                  papers={papers}
                  selectedIds={form.referencePaperIds}
                  onToggle={toggleReference}
                  disabled={readOnly}
                />
                {apa7Sorted.length === 0 ? (
                  <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center">
                    <BookMarked size={28} className="mx-auto text-muted-foreground/40" />
                    <p className="mt-2 text-xs text-muted-foreground">
                      등록된 참고문헌이 없습니다. 위에서 ‘논문 연결’ 버튼으로 논문을 추가해 주세요.
                    </p>
                  </div>
                ) : (
                  <ol className="space-y-2 rounded-xl border bg-card p-4 text-sm leading-relaxed">
                    {apa7Sorted.map((p, i) => (
                      <li key={p.id} className="flex items-start gap-2">
                        <span className="shrink-0 text-xs font-medium text-muted-foreground">
                          {i + 1}.
                        </span>
                        <span className="flex-1 break-words">{formatApa7(p)}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {filled ? (
                <span className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 size={12} /> 작성됨
                </span>
              ) : (
                <span>아직 작성 전</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => moveToStep(interviewStep - 1)}
                disabled={isFirst || saving}
              >
                <ChevronLeft size={14} className="mr-1" />
                이전
              </Button>
              {!isLast ? (
                <Button size="sm" onClick={() => moveToStep(interviewStep + 1)} disabled={saving}>
                  다음
                  <ChevronRight size={14} className="ml-1" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={async () => {
                    await handleSave();
                    setViewMode("single");
                  }}
                  disabled={saving}
                >
                  <CheckCircle2 size={14} className="mr-1" />
                  완료 — 전체 보기
                </Button>
              )}
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {renderHeader()}

      {/* 논문 제목 */}
      <Section
        title="1. 논문 제목"
        sub="국문·영문 제목을 각각 입력하세요. 영문 제목은 저널 투고·초록 작성 시 활용됩니다."
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              논문 제목 (국문)
            </label>
            <Input
              value={form.titleKo}
              onChange={(e) => setField("titleKo", e.target.value)}
              placeholder="예: 생성형 AI 기반 쓰기 피드백이 중학생의 논설문 쓰기 능력에 미치는 영향"
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              논문 제목 (영문)
            </label>
            <Input
              value={form.titleEn}
              onChange={(e) => setField("titleEn", e.target.value)}
              placeholder="e.g., The Effect of Generative AI-based Writing Feedback on Middle School Students' Argumentative Writing"
              disabled={readOnly}
            />
          </div>
        </div>
      </Section>

      {/* 연구 목적 */}
      <Section
        title="2. 연구 목적"
        sub="본 연구가 해결하고자 하는 문제와 달성하려는 목표를 명확히 기술합니다."
      >
        <Textarea
          value={form.purpose}
          onChange={(e) => setField("purpose", e.target.value)}
          placeholder="예: 본 연구는 생성형 AI 기반 쓰기 피드백이 학습자의 쓰기 능력 향상과 쓰기 동기에 미치는 효과를 규명하는 데 목적이 있다."
          rows={5}
          disabled={readOnly}
        />
      </Section>

      {/* 연구 범위 */}
      <Section
        title="3. 연구 범위"
        sub="연구 대상, 기간, 지역, 주제적 범위 등을 구체적으로 제시합니다."
      >
        <Textarea
          value={form.scope}
          onChange={(e) => setField("scope", e.target.value)}
          placeholder="예: 서울 소재 중학교 2학년 3개 학급(총 78명)을 대상으로 2026년 3월~6월(12주) 논설문 쓰기 단원에 한정한다."
          rows={5}
          disabled={readOnly}
        />
      </Section>

      {/* 연구 방법 */}
      <Section
        title="4. 연구 방법"
        sub="연구 설계, 표집, 자료 수집·분석 방법을 상세히 기술합니다."
      >
        <Textarea
          value={form.method}
          onChange={(e) => setField("method", e.target.value)}
          placeholder="예: 사전-사후 통제집단 실험설계를 적용한다. 실험집단은 AI 기반 피드백, 통제집단은 교사 피드백을 받는다. 쓰기 능력은 루브릭 기반 평가자 간 일치도(IRR)를 확보하여 측정하고, SPSS 27을 활용하여 공분산분석(ANCOVA)을 실시한다."
          rows={7}
          disabled={readOnly}
        />
      </Section>

      {/* 연구 내용 */}
      <Section
        title="5. 연구 내용"
        sub="연구의 주요 과제와 단계별 세부 내용을 정리합니다."
      >
        <Textarea
          value={form.content}
          onChange={(e) => setField("content", e.target.value)}
          placeholder={`예:
1) 이론적 배경 정리: 쓰기 피드백 이론, 생성형 AI 교육 활용 선행연구 고찰
2) 프롬프트 및 피드백 루브릭 개발 및 전문가 타당화
3) 실험 실시 (12주): 매주 1회 쓰기 과제 및 피드백 제공
4) 사전·사후 쓰기 능력 측정, 동기 설문, 학습자 인식 인터뷰
5) 양적·질적 자료 통합 분석`}
          rows={8}
          disabled={readOnly}
        />
      </Section>

      {/* 참고문헌 (APA7) */}
      <Section
        title="6. 참고문헌 (APA 7)"
        sub="‘논문 읽기’에 등록한 논문을 검색해 추가하면 APA 7판 형식으로 자동 변환됩니다."
      >
        <div className="space-y-4">
          <PaperSelector
            papers={papers}
            selectedIds={form.referencePaperIds}
            onToggle={toggleReference}
            disabled={readOnly}
          />

          {apa7Sorted.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center">
              <BookMarked size={28} className="mx-auto text-muted-foreground/40" />
              <p className="mt-2 text-xs text-muted-foreground">
                등록된 참고문헌이 없습니다. 위에서 ‘논문 연결’ 버튼으로 논문을 추가해 주세요.
              </p>
            </div>
          ) : (
            <ol className="space-y-2 rounded-xl border bg-card p-4 text-sm leading-relaxed">
              {apa7Sorted.map((p, i) => (
                <li key={p.id} className="flex items-start gap-2">
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                    {i + 1}.
                  </span>
                  <span className="flex-1 break-words">{formatApa7(p)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h4 className="text-sm font-semibold">{title}</h4>
      {sub && <p className="mt-0.5 mb-3 text-xs leading-relaxed text-muted-foreground">{sub}</p>}
      {children}
    </section>
  );
}
