"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Save, CheckCircle2, ChevronLeft, ChevronRight,
  FileText, School, BookOpen, FlaskConical,
  Plus, Trash2, Link2, X, Lightbulb, Target, Ruler, Sparkles,
  MessageSquareQuote, LayoutGrid,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type {
  User, ResearchReport, ResearchGroup, ResearchPaper,
  EducationFormat, EvidenceType, CauseType,
  ProblemEvidenceItem, ProblemCauseItem, ProblemMeasurementItem,
  TheoryCard, TheoryConcept,
} from "@/types";
import {
  useResearchReport,
  useEnsureResearchReport,
  useUpdateResearchReport,
} from "./useResearchReport";
import { useResearchPapers } from "./useResearchPapers";
import { useLogWritingActivity } from "./useWritingPaperHistory";
import ResearchReportInterview from "./ResearchReportInterview";

interface Props {
  user: User;
  readOnly?: boolean;
}

export interface FormState {
  fieldDescription: string;
  fieldProblem: string;
  problemPhenomenon: string;
  problemEvidence: string;
  problemCause: string;
  problemDefinition: string;
  theoryType: string;
  theoryDefinition: string;
  theoryConnection: string;
  priorResearchAnalysis: string;
  priorResearchPaperIds: string[];
  priorResearchGroups: ResearchGroup[];
  // v2 — 1. 교육현장의 문제 정의 구조화 입력
  fieldAudience: string;
  fieldFormat: EducationFormat;
  fieldSubject: string;
  problemPhenomena: string[];
  problemEvidences: ProblemEvidenceItem[];
  problemCauses: ProblemCauseItem[];
  problemImpact: string;
  problemImportance: string;
  scopeAudience: string;
  scopeContext: string;
  scopeExclusion: string;
  problemMeasurements: ProblemMeasurementItem[];
  // v3 — 1.5 문제 진단 (Sprint 57: 이론을 끌어오기 전 다층 분석)
  diagnosisAttempts: string;
  diagnosisGap: string;
  diagnosisPrimaryCause: string;
  // v2 — 2. 교육공학 이론
  theoryCards: TheoryCard[];
  theoryRelationProblem: string;
  theoryRelationRoles: string;
  theoryRelationIntegration: string;
}

export type SetField = <K extends keyof FormState>(key: K, value: FormState[K]) => void;

const EMPTY: FormState = {
  fieldDescription: "",
  fieldProblem: "",
  problemPhenomenon: "",
  problemEvidence: "",
  problemCause: "",
  problemDefinition: "",
  theoryType: "",
  theoryDefinition: "",
  theoryConnection: "",
  priorResearchAnalysis: "",
  priorResearchPaperIds: [],
  priorResearchGroups: [],
  fieldAudience: "",
  fieldFormat: "",
  fieldSubject: "",
  problemPhenomena: ["", ""],
  problemEvidences: [],
  problemCauses: [],
  problemImpact: "",
  problemImportance: "",
  scopeAudience: "",
  scopeContext: "",
  scopeExclusion: "",
  problemMeasurements: [
    { id: "default-m1", factor: "", indicator: "" },
    { id: "default-m2", factor: "", indicator: "" },
  ],
  diagnosisAttempts: "",
  diagnosisGap: "",
  diagnosisPrimaryCause: "",
  theoryCards: [],
  theoryRelationProblem: "",
  theoryRelationRoles: "",
  theoryRelationIntegration: "",
};

function newId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

function fromReport(r: ResearchReport | undefined): FormState {
  if (!r) return EMPTY;
  // 마이그레이션: 구버전 단일 텍스트가 있고 신규 배열이 비었으면 첫 항목으로 시드
  const migratedPhenomena =
    r.problemPhenomena && r.problemPhenomena.length > 0
      ? r.problemPhenomena
      : r.problemPhenomenon
        ? [r.problemPhenomenon]
        : ["", ""];
  const migratedEvidences =
    r.problemEvidences && r.problemEvidences.length > 0
      ? r.problemEvidences
      : r.problemEvidence
        ? [{ id: newId(), type: "" as EvidenceType, content: r.problemEvidence }]
        : [];
  const migratedCauses =
    r.problemCauses && r.problemCauses.length > 0
      ? r.problemCauses
      : r.problemCause
        ? [{ id: newId(), type: "" as CauseType, content: r.problemCause }]
        : [];
  const migratedMeasurements =
    r.problemMeasurements && r.problemMeasurements.length > 0
      ? r.problemMeasurements
      : [
          { id: newId(), factor: "", indicator: "" },
          { id: newId(), factor: "", indicator: "" },
        ];
  return {
    fieldDescription: r.fieldDescription ?? "",
    fieldProblem: r.fieldProblem ?? "",
    problemPhenomenon: r.problemPhenomenon ?? "",
    problemEvidence: r.problemEvidence ?? "",
    problemCause: r.problemCause ?? "",
    problemDefinition: r.problemDefinition ?? "",
    theoryType: r.theoryType ?? "",
    theoryDefinition: r.theoryDefinition ?? "",
    theoryConnection: r.theoryConnection ?? "",
    priorResearchAnalysis: r.priorResearchAnalysis ?? "",
    priorResearchPaperIds: r.priorResearchPaperIds ?? [],
    priorResearchGroups: r.priorResearchGroups ?? [],
    fieldAudience: r.fieldAudience ?? "",
    fieldFormat: r.fieldFormat ?? "",
    fieldSubject: r.fieldSubject ?? "",
    problemPhenomena: migratedPhenomena,
    problemEvidences: migratedEvidences,
    problemCauses: migratedCauses,
    problemImpact: r.problemImpact ?? "",
    problemImportance: r.problemImportance ?? "",
    scopeAudience: r.scopeAudience ?? "",
    scopeContext: r.scopeContext ?? "",
    scopeExclusion: r.scopeExclusion ?? "",
    problemMeasurements: migratedMeasurements,
    diagnosisAttempts: r.diagnosisAttempts ?? "",
    diagnosisGap: r.diagnosisGap ?? "",
    diagnosisPrimaryCause: r.diagnosisPrimaryCause ?? "",
    theoryCards: migrateTheoryCards(r),
    theoryRelationProblem: r.theoryRelationProblem ?? r.theoryConnection ?? "",
    theoryRelationRoles: r.theoryRelationRoles ?? "",
    theoryRelationIntegration: r.theoryRelationIntegration ?? "",
  };
}

function migrateTheoryCards(r: ResearchReport): TheoryCard[] {
  if (r.theoryCards && r.theoryCards.length > 0) return r.theoryCards;
  // 구버전: theoryType / theoryDefinition / theoryConnection이 있으면 카드 1개로 이전
  if (r.theoryType || r.theoryDefinition || r.theoryConnection) {
    return [
      {
        id: newId(),
        name: r.theoryType ?? "",
        scholar: "",
        year: "",
        selectionReason: "",
        concepts: r.theoryDefinition
          ? [{ id: newId(), name: "기존 정의", definition: r.theoryDefinition }]
          : [],
        problemLink: r.theoryConnection ?? "",
      },
    ];
  }
  return [];
}

function totalChars(form: FormState): number {
  const textFields = [
    form.fieldDescription, form.fieldProblem,
    form.problemPhenomenon, form.problemEvidence, form.problemCause, form.problemDefinition,
    form.theoryType, form.theoryDefinition, form.theoryConnection,
    form.priorResearchAnalysis,
    form.fieldAudience, form.fieldSubject,
    form.problemImpact, form.problemImportance,
    form.scopeAudience, form.scopeContext, form.scopeExclusion,
    form.diagnosisAttempts, form.diagnosisGap, form.diagnosisPrimaryCause,
  ];
  let sum = textFields.reduce((s, v) => s + v.length, 0);
  for (const g of form.priorResearchGroups) {
    sum += (g.name?.length ?? 0) + (g.integration?.length ?? 0) + (g.insight?.length ?? 0);
  }
  for (const p of form.problemPhenomena) sum += p.length;
  for (const e of form.problemEvidences) sum += e.content.length;
  for (const c of form.problemCauses) sum += c.content.length;
  for (const m of form.problemMeasurements) sum += m.factor.length + m.indicator.length;
  for (const c of form.theoryCards) {
    sum += (c.name?.length ?? 0) + (c.scholar?.length ?? 0) + (c.year?.length ?? 0)
      + (c.selectionReason?.length ?? 0) + (c.problemLink?.length ?? 0);
    for (const k of c.concepts ?? []) sum += k.name.length + k.definition.length;
  }
  sum += form.theoryRelationProblem.length + form.theoryRelationRoles.length + form.theoryRelationIntegration.length;
  return sum;
}

const FORMAT_OPTIONS: { value: EducationFormat; label: string }[] = [
  { value: "offline", label: "대면" },
  { value: "online", label: "비대면" },
  { value: "blended", label: "혼합" },
];

const FORMAT_LABEL: Record<Exclude<EducationFormat, "">, string> = {
  offline: "대면",
  online: "비대면",
  blended: "혼합",
};

const EVIDENCE_TYPE_OPTIONS: { value: EvidenceType; label: string }[] = [
  { value: "", label: "유형 선택" },
  { value: "observation", label: "관찰" },
  { value: "assessment", label: "평가 결과" },
  { value: "survey", label: "설문/면담" },
  { value: "prior_research", label: "선행연구" },
  { value: "other", label: "기타" },
];

const CAUSE_TYPE_OPTIONS: { value: CauseType; label: string }[] = [
  { value: "learner", label: "학습자 요인" },
  { value: "instructional_design", label: "교수설계 요인" },
  { value: "environment", label: "수업 환경 요인" },
  { value: "other", label: "기타" },
];

const STEPS = [
  {
    key: "field",
    label: "교육현장의 문제 정의",
    icon: School,
    question: "어떤 교육 현장의, 어떤 문제를 다루려고 하시나요?",
    hints: [
      "학습자(누가)·교육 형식(어떻게)·과목/주제(무엇)을 먼저 정의해 보세요.",
      "그 다음 현장에서 관찰되는 ‘현상’ → ‘근거’ → ‘원인’ → ‘영향’ → ‘중요성’ 순서로 한 카드씩 채우면 자연스럽습니다.",
      "마지막에 측정 지표를 정해두면 결과 챕터에서 바로 활용할 수 있습니다.",
    ],
  },
  {
    key: "theory",
    label: "교육공학 이론",
    icon: BookOpen,
    question: "이 문제를 설명·해결할 수 있는 교육공학 이론은 무엇인가요?",
    hints: [
      "이론 카드에 이름·학자·연도·핵심 개념·선택 이유·문제 연결을 적습니다.",
      "여러 이론을 결합한다면 ‘이론 간 관계’ 3필드(공통 문제·역할 분담·통합 시각)도 채워주세요.",
      "이론은 1개부터 시작해도 좋습니다. 카드는 언제든 추가/삭제할 수 있어요.",
    ],
  },
  {
    key: "prior",
    label: "선행연구 분석",
    icon: FlaskConical,
    question: "내 문제·이론과 가장 가까운 선행연구는 어떤 흐름을 보이나요?",
    hints: [
      "‘논문 읽기’에 미리 등록해 둔 선행연구를 검색해서 추가합니다.",
      "관련 논문들을 ‘그룹’으로 묶고, 그룹별 통합 해석·시사점을 정리하면 분석이 깔끔해집니다.",
      "마지막에 전체를 관통하는 통찰을 한두 문단으로 요약해 두세요.",
    ],
  },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

type ViewMode = "single" | "interview";

function PaperSelector({
  papers,
  selectedIds,
  onToggle,
}: {
  papers: ResearchPaper[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = papers.filter(
    (p) =>
      !p.isDraft &&
      (p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.authors?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {selectedIds.map((id) => {
          const p = papers.find((x) => x.id === id);
          return (
            <Badge key={id} variant="secondary" className="gap-1 pr-1 text-xs">
              {p ? p.title.slice(0, 30) + (p.title.length > 30 ? "…" : "") : id}
              <button type="button" onClick={() => onToggle(id)} className="ml-0.5 rounded-full p-0.5 hover:bg-muted">
                <X size={10} />
              </button>
            </Badge>
          );
        })}
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
        >
          <Link2 size={12} />
          논문 연결
        </button>
        {open && (
          <div className="absolute left-0 top-full z-10 mt-1 w-80 rounded-lg border bg-white p-2 shadow-lg">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="논문 제목 검색..."
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
                      onClick={() => { onToggle(p.id); }}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                        sel ? "bg-primary/10 text-primary" : "hover:bg-muted"
                      )}
                    >
                      <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border text-[9px]">
                        {sel ? "✓" : ""}
                      </span>
                      <span className="line-clamp-2">{p.title} ({p.year})</span>
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
    </div>
  );
}

export default function ResearchReportEditor({ user, readOnly = false }: Props) {
  const { report, isLoading } = useResearchReport(user.id);
  const ensure = useEnsureResearchReport();
  const update = useUpdateResearchReport();
  const logActivity = useLogWritingActivity();
  const { papers } = useResearchPapers(user.id);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [step, setStep] = useState<StepKey>("field");
  const [viewMode, setViewMode] = useState<ViewMode>("single");
  const ensureTriggeredRef = useRef(false);

  useEffect(() => {
    if (readOnly || isLoading || report || ensureTriggeredRef.current) return;
    ensureTriggeredRef.current = true;
    ensure.mutate(user.id);
  }, [report, isLoading, readOnly, user.id, ensure]);

  useEffect(() => {
    if (report && !hydrated) {
      setForm(fromReport(report));
      setSavedAt(report.lastSavedAt ?? report.updatedAt ?? null);
      setHydrated(true);
    }
  }, [report, hydrated]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  async function handleSave(showToast = true) {
    if (!report || readOnly) return;
    setSaving(true);
    const now = new Date().toISOString();
    try {
      await update.mutateAsync({
        id: report.id,
        data: { ...form, lastSavedAt: now },
      });
      setSavedAt(now);
      setDirty(false);
      logActivity.mutate({
        userId: user.id,
        paperId: report.id,
        charCount: totalChars(form),
        lastChapter: `report-${step}` as never,
        title: "연구 보고서",
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

  function addGroup() {
    const newGroup: ResearchGroup = {
      id: crypto.randomUUID(),
      name: "",
      paperIds: [],
      integration: "",
      insight: "",
    };
    setField("priorResearchGroups", [...form.priorResearchGroups, newGroup]);
  }

  function updateGroup(id: string, patch: Partial<ResearchGroup>) {
    setField(
      "priorResearchGroups",
      form.priorResearchGroups.map((g) => (g.id === id ? { ...g, ...patch } : g))
    );
  }

  function removeGroup(id: string) {
    setField("priorResearchGroups", form.priorResearchGroups.filter((g) => g.id !== id));
  }

  function togglePaper(paperId: string) {
    const ids = form.priorResearchPaperIds.includes(paperId)
      ? form.priorResearchPaperIds.filter((x) => x !== paperId)
      : [...form.priorResearchPaperIds, paperId];
    setField("priorResearchPaperIds", ids);
  }

  function toggleGroupPaper(groupId: string, paperId: string) {
    const group = form.priorResearchGroups.find((g) => g.id === groupId);
    if (!group) return;
    const ids = group.paperIds.includes(paperId)
      ? group.paperIds.filter((x) => x !== paperId)
      : [...group.paperIds, paperId];
    updateGroup(groupId, { paperIds: ids });
  }

  const stepIdx = STEPS.findIndex((s) => s.key === step);
  const canPrev = stepIdx > 0;
  const canNext = stepIdx < STEPS.length - 1;
  const total = useMemo(() => totalChars(form), [form]);

  if (isLoading || (!report && !readOnly)) {
    return (
      <p className="rounded-2xl border bg-white py-10 text-center text-sm text-muted-foreground">
        연구 보고서를 불러오는 중...
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <section className="rounded-2xl border bg-white p-5 dark:bg-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-primary" />
            <div>
              <h3 className="text-sm font-semibold">연구 보고서</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                현장–이론–연구를 결합하는 것이 목표입니다. · {total.toLocaleString()}자
                {viewMode === "interview" && ` · 진행 ${stepIdx + 1}/${STEPS.length}`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* 보기 모드 토글 */}
            <div className="inline-flex items-center overflow-hidden rounded-md border border-input">
              <button
                type="button"
                onClick={() => setViewMode("single")}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                  viewMode === "single"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-muted",
                )}
                title="전체 모드 — 모든 항목을 한 번에 보기"
              >
                <LayoutGrid size={12} /> 전체 모드
              </button>
              <button
                type="button"
                onClick={() => setViewMode("interview")}
                className={cn(
                  "flex items-center gap-1 border-l px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                  viewMode === "interview"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-muted",
                )}
                title="인터뷰 모드 — 한 챕터씩 안내 받으며 작성"
              >
                <MessageSquareQuote size={12} /> 인터뷰 모드
              </button>
            </div>
          {!readOnly && (
            <div className="flex shrink-0 items-center gap-2">
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
            </div>
          )}
          </div>
        </div>
      </section>

      {/* 인터뷰 모드 — 전체화면 모달 */}
      <ResearchReportInterview
        open={viewMode === "interview"}
        onClose={() => setViewMode("single")}
        form={form}
        setField={setField}
        total={total}
        saving={saving}
        dirty={dirty}
        savedAt={savedAt ?? undefined}
        onSave={() => handleSave()}
        onDraftSave={handleDraftSave}
      />

      {/* 스텝 탭 */}
      <div className="flex items-center gap-1 rounded-xl border bg-white p-1.5">
        {STEPS.map((s, i) => {
          const active = step === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setStep(s.key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <s.icon size={14} />
              <span className="hidden sm:inline">{i + 1}. {s.label}</span>
              <span className="sm:hidden">{i + 1}</span>
            </button>
          );
        })}
      </div>

      {/* 스텝 내용 */}
      <div className="space-y-4">
        {step === "field" && (
          <FieldProblemDefinitionStep
            form={form}
            setField={setField}
            readOnly={readOnly}
          />
        )}

        {step === "theory" && (
          <TheoryStep form={form} setField={setField} readOnly={readOnly} />
        )}

        {step === "prior" && (
          <>
            <Section title="3-1. 선행연구 분석" sub="관련 선행연구를 분석하고, '논문 읽기'에 등록한 논문을 연결할 수 있습니다.">
              <Textarea
                value={form.priorResearchAnalysis}
                onChange={(e) => setField("priorResearchAnalysis", e.target.value)}
                placeholder="선행연구 분석 내용을 자유롭게 기술하세요..."
                rows={8}
                disabled={readOnly}
              />
              <div className="mt-3">
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">연결된 논문</p>
                <PaperSelector
                  papers={papers}
                  selectedIds={form.priorResearchPaperIds}
                  onToggle={togglePaper}
                />
              </div>
            </Section>
            <Section title="3-2. 선행연구간 관계성" sub="여러 선행연구를 그룹으로 묶고, 그룹별 통합력과 인사이트를 작성해 주세요.">
              <div className="space-y-4">
                {form.priorResearchGroups.map((group, gi) => (
                  <div key={group.id} className="rounded-xl border bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {gi + 1}
                        </span>
                        <Input
                          value={group.name}
                          onChange={(e) => updateGroup(group.id, { name: e.target.value })}
                          placeholder="그룹명 (예: 자기조절학습 효과 연구)"
                          className="h-8 flex-1 text-sm font-medium"
                          disabled={readOnly}
                        />
                      </div>
                      {!readOnly && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeGroup(group.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                    <div className="mt-3">
                      <p className="mb-1 text-[11px] font-medium text-muted-foreground">연결 논문</p>
                      <PaperSelector
                        papers={papers}
                        selectedIds={group.paperIds}
                        onToggle={(pid) => toggleGroupPaper(group.id, pid)}
                      />
                    </div>
                    <div className="mt-3">
                      <label className="mb-1 block text-[11px] font-medium text-muted-foreground">통합력</label>
                      <Textarea
                        value={group.integration}
                        onChange={(e) => updateGroup(group.id, { integration: e.target.value })}
                        placeholder="이 그룹의 연구들이 공통으로 시사하는 바..."
                        rows={3}
                        disabled={readOnly}
                      />
                    </div>
                    <div className="mt-3">
                      <label className="mb-1 block text-[11px] font-medium text-muted-foreground">인사이트</label>
                      <Textarea
                        value={group.insight}
                        onChange={(e) => updateGroup(group.id, { insight: e.target.value })}
                        placeholder="이 연구 그룹에서 얻은 핵심 인사이트..."
                        rows={3}
                        disabled={readOnly}
                      />
                    </div>
                  </div>
                ))}
                {!readOnly && (
                  <Button variant="outline" size="sm" onClick={addGroup} className="w-full">
                    <Plus size={14} className="mr-1" />
                    그룹 추가
                  </Button>
                )}
              </div>
            </Section>
          </>
        )}
      </div>

      {/* 이전 / 다음 네비게이션 */}
      <div className="flex items-center justify-between rounded-xl border bg-white p-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStep(STEPS[stepIdx - 1].key)}
          disabled={!canPrev}
        >
          <ChevronLeft size={14} className="mr-1" />
          이전
        </Button>
        <span className="text-xs text-muted-foreground">
          {stepIdx + 1} / {STEPS.length}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStep(STEPS[stepIdx + 1].key)}
          disabled={!canNext}
        >
          다음
          <ChevronRight size={14} className="ml-1" />
        </Button>
      </div>
    </div>
  );
}

function Section({
  title,
  sub,
  icon,
  children,
}: {
  title: string;
  sub?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white p-5">
      <div className="flex items-center gap-2">
        {icon}
        <h4 className="text-sm font-semibold">{title}</h4>
      </div>
      {sub && <p className="mt-0.5 mb-3 text-xs leading-relaxed text-muted-foreground">{sub}</p>}
      {children}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// 1. 교육현장의 문제 정의 — 6개 카드 구조 (1-1 ~ 1-6)
// ─────────────────────────────────────────────────────────────

interface FieldStepProps {
  form: FormState;
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  readOnly: boolean;
}

function FieldProblemDefinitionStep({ form, setField, readOnly }: FieldStepProps) {
  return (
    <div className="space-y-4">
      <Field11Context form={form} setField={setField} readOnly={readOnly} />
      <Field12Problem form={form} setField={setField} readOnly={readOnly} />
      <Field13Importance form={form} setField={setField} readOnly={readOnly} />
      <Field14Scope form={form} setField={setField} readOnly={readOnly} />
      <Field15Measurement form={form} setField={setField} readOnly={readOnly} />
      <Field16Definition form={form} setField={setField} readOnly={readOnly} />
    </div>
  );
}

// 1-1. 내가 속한 교육 현장
function Field11Context({ form, setField, readOnly }: FieldStepProps) {
  const summary = useMemo(() => {
    const audience = form.fieldAudience.trim();
    const fmt = form.fieldFormat ? FORMAT_LABEL[form.fieldFormat] : "";
    const subject = form.fieldSubject.trim();
    if (!audience && !fmt && !subject) return "";
    const parts: string[] = [];
    if (audience) parts.push(`${audience} 대상`);
    if (fmt && subject) parts.push(`${fmt}형 ${subject} 수업 환경`);
    else if (fmt) parts.push(`${fmt}형 수업 환경`);
    else if (subject) parts.push(`${subject} 수업 환경`);
    return parts.join("의 ");
  }, [form.fieldAudience, form.fieldFormat, form.fieldSubject]);

  return (
    <Section
      title="1-1. 내가 속한 교육 현장"
      icon={<School size={16} className="text-primary" />}
      sub="본인이 관심 있는 교육 현장의 기본 맥락을 작성해 주세요. 대상 학습자, 교육 형태, 교과 또는 학습 주제, 현장 특성을 중심으로 정리합니다."
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">대상 학습자</label>
            <Input
              value={form.fieldAudience}
              onChange={(e) => setField("fieldAudience", e.target.value)}
              placeholder="예: 중학교 2학년"
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">교과 또는 학습 주제</label>
            <Input
              value={form.fieldSubject}
              onChange={(e) => setField("fieldSubject", e.target.value)}
              placeholder="예: 수학"
              disabled={readOnly}
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">교육 형태</label>
          <div className="flex flex-wrap gap-2">
            {FORMAT_OPTIONS.map((opt) => {
              const active = form.fieldFormat === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setField("fieldFormat", active ? "" : opt.value)}
                  disabled={readOnly}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted bg-white text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">현장 특성</label>
          <Textarea
            value={form.fieldDescription}
            onChange={(e) => setField("fieldDescription", e.target.value)}
            placeholder="예: 비대면 혼합 수업 환경에서 학습 참여 편차가 큼"
            rows={3}
            disabled={readOnly}
          />
        </div>
        {summary && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
            <p className="mb-1 flex items-center gap-1 font-medium text-primary">
              <Sparkles size={12} /> 요약 미리보기
            </p>
            <p className="text-foreground/90">{summary}</p>
          </div>
        )}
      </div>
    </Section>
  );
}

// 1-2. 발견한 문제 (현상 / 근거 / 원인)
function Field12Problem({ form, setField, readOnly }: FieldStepProps) {
  function updatePhenomenon(idx: number, value: string) {
    const next = [...form.problemPhenomena];
    next[idx] = value;
    setField("problemPhenomena", next);
  }
  function addPhenomenon() {
    setField("problemPhenomena", [...form.problemPhenomena, ""]);
  }
  function removePhenomenon(idx: number) {
    setField("problemPhenomena", form.problemPhenomena.filter((_, i) => i !== idx));
  }

  function updateEvidence(id: string, patch: Partial<ProblemEvidenceItem>) {
    setField(
      "problemEvidences",
      form.problemEvidences.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    );
  }
  function addEvidence() {
    setField("problemEvidences", [
      ...form.problemEvidences,
      { id: newId(), type: "" as EvidenceType, content: "" },
    ]);
  }
  function removeEvidence(id: string) {
    setField("problemEvidences", form.problemEvidences.filter((e) => e.id !== id));
  }

  function updateCause(id: string, patch: Partial<ProblemCauseItem>) {
    setField(
      "problemCauses",
      form.problemCauses.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
  }
  function addCause() {
    setField("problemCauses", [
      ...form.problemCauses,
      { id: newId(), type: "" as CauseType, content: "" },
    ]);
  }
  function removeCause(id: string) {
    setField("problemCauses", form.problemCauses.filter((c) => c.id !== id));
  }

  return (
    <Section
      title="1-2. 발견한 문제"
      icon={<Lightbulb size={16} className="text-primary" />}
      sub="해당 현장에서 발견한 핵심 문제를 현상·근거·원인으로 나누어 작성해 주세요."
    >
      <div className="space-y-6">
        {/* 현상 */}
        <div>
          <p className="mb-1 text-xs font-semibold text-foreground">현상</p>
          <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">
            현장에서 반복적으로 나타나는 문제 상황을 작성해 주세요.
          </p>
          <div className="space-y-2">
            {form.problemPhenomena.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={p}
                  onChange={(e) => updatePhenomenon(i, e.target.value)}
                  placeholder={i === 0 ? "예: 학생들의 수업 참여도가 낮다" : "예: 과제를 제출하지만 개념 이해가 부족하다"}
                  disabled={readOnly}
                />
                {!readOnly && form.problemPhenomena.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePhenomenon(i)}
                    className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="현상 삭제"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={addPhenomenon} className="mt-2">
              <Plus size={12} className="mr-1" />
              문제 추가
            </Button>
          )}
        </div>

        {/* 근거 */}
        <div className="border-t pt-4">
          <p className="mb-1 text-xs font-semibold text-foreground">근거</p>
          <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">
            문제가 실제로 존재한다고 판단한 이유나 근거를 작성해 주세요.
          </p>
          <div className="space-y-3">
            {form.problemEvidences.length === 0 && (
              <p className="rounded-md border border-dashed bg-muted/30 px-3 py-4 text-center text-[11px] text-muted-foreground">
                아직 등록된 근거가 없습니다. 아래 ‘근거 추가’ 버튼으로 추가해 보세요.
              </p>
            )}
            {form.problemEvidences.map((ev) => (
              <div key={ev.id} className="rounded-lg border bg-muted/10 p-3">
                <div className="flex items-center gap-2">
                  <select
                    value={ev.type}
                    onChange={(e) => updateEvidence(ev.id, { type: e.target.value as EvidenceType })}
                    disabled={readOnly}
                    className="rounded-md border bg-white px-2 py-1.5 text-xs"
                  >
                    {EVIDENCE_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <span className="flex-1" />
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => removeEvidence(ev.id)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="근거 삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <Textarea
                  value={ev.content}
                  onChange={(e) => updateEvidence(ev.id, { content: e.target.value })}
                  placeholder="예: 최근 3회 형성평가 평균 점수가 낮게 나타남"
                  rows={2}
                  disabled={readOnly}
                  className="mt-2"
                />
              </div>
            ))}
          </div>
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={addEvidence} className="mt-2">
              <Plus size={12} className="mr-1" />
              근거 추가
            </Button>
          )}
        </div>

        {/* 원인 */}
        <div className="border-t pt-4">
          <p className="mb-1 text-xs font-semibold text-foreground">원인</p>
          <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">
            문제가 발생한 원인을 분석해 주세요.
          </p>
          <div className="space-y-3">
            {form.problemCauses.length === 0 && (
              <p className="rounded-md border border-dashed bg-muted/30 px-3 py-4 text-center text-[11px] text-muted-foreground">
                아직 등록된 원인이 없습니다. 아래 ‘원인 추가’ 버튼으로 추가해 보세요.
              </p>
            )}
            {form.problemCauses.map((c) => (
              <div key={c.id} className="rounded-lg border bg-muted/10 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  {CAUSE_TYPE_OPTIONS.map((opt) => {
                    const active = c.type === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateCause(c.id, { type: active ? "" : opt.value })}
                        disabled={readOnly}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-muted bg-white text-muted-foreground hover:border-primary/40",
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                  <span className="flex-1" />
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => removeCause(c.id)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="원인 삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <Textarea
                  value={c.content}
                  onChange={(e) => updateCause(c.id, { content: e.target.value })}
                  placeholder="예: 즉각적인 피드백 제공이 어려운 수업 구조"
                  rows={2}
                  disabled={readOnly}
                  className="mt-2"
                />
              </div>
            ))}
          </div>
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={addCause} className="mt-2">
              <Plus size={12} className="mr-1" />
              원인 추가
            </Button>
          )}
        </div>
      </div>
    </Section>
  );
}

// 1-3. 문제의 중요성
function Field13Importance({ form, setField, readOnly }: FieldStepProps) {
  return (
    <Section
      title="1-3. 문제의 중요성"
      icon={<Target size={16} className="text-primary" />}
      sub="이 문제가 왜 중요한지, 학습자나 수업에 어떤 영향을 미치는지 작성해 주세요."
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">이 문제의 영향</label>
          <Textarea
            value={form.problemImpact}
            onChange={(e) => setField("problemImpact", e.target.value)}
            placeholder="예: 학습 참여 저하는 학습 지속성 저하로 이어질 수 있다"
            rows={3}
            disabled={readOnly}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">왜 해결이 필요한가</label>
          <Textarea
            value={form.problemImportance}
            onChange={(e) => setField("problemImportance", e.target.value)}
            placeholder="예: 개념 이해 부족은 이후 학습 성취 전반에 영향을 준다"
            rows={3}
            disabled={readOnly}
          />
        </div>
      </div>
    </Section>
  );
}

// 1-4. 문제의 범위 및 대상
function Field14Scope({ form, setField, readOnly }: FieldStepProps) {
  return (
    <Section
      title="1-4. 문제의 범위 및 대상"
      icon={<Target size={16} className="text-primary" />}
      sub="이 연구에서 다루고자 하는 문제의 범위와 대상을 구체화해 주세요."
    >
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">주요 대상</label>
          <Input
            value={form.scopeAudience}
            onChange={(e) => setField("scopeAudience", e.target.value)}
            placeholder="예: 중학교 2학년 학습자"
            disabled={readOnly}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">초점이 되는 상황 / 맥락</label>
          <Input
            value={form.scopeContext}
            onChange={(e) => setField("scopeContext", e.target.value)}
            placeholder="예: 비대면 혼합 수업 상황"
            disabled={readOnly}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">제외하거나 한정할 범위</label>
          <Input
            value={form.scopeExclusion}
            onChange={(e) => setField("scopeExclusion", e.target.value)}
            placeholder="예: 모든 교과가 아니라 수학 교과에 한정"
            disabled={readOnly}
          />
        </div>
      </div>
    </Section>
  );
}

// 1-5. 측정 가능성
function Field15Measurement({ form, setField, readOnly }: FieldStepProps) {
  function updateRow(id: string, patch: Partial<ProblemMeasurementItem>) {
    setField(
      "problemMeasurements",
      form.problemMeasurements.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    );
  }
  function addRow() {
    setField("problemMeasurements", [
      ...form.problemMeasurements,
      { id: newId(), factor: "", indicator: "" },
    ]);
  }
  function removeRow(id: string) {
    setField("problemMeasurements", form.problemMeasurements.filter((m) => m.id !== id));
  }

  return (
    <Section
      title="1-5. 문제의 측정 가능성"
      icon={<Ruler size={16} className="text-primary" />}
      sub="이 문제를 어떤 방식으로 관찰하거나 확인할 수 있는지 작성해 주세요."
    >
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="w-2/5 px-3 py-2 text-left font-medium">문제 요소</th>
              <th className="px-3 py-2 text-left font-medium">관찰 가능한 지표</th>
              {!readOnly && <th className="w-10 px-2 py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {form.problemMeasurements.map((m, i) => (
              <tr key={m.id} className="border-t">
                <td className="px-2 py-2 align-top">
                  <Input
                    value={m.factor}
                    onChange={(e) => updateRow(m.id, { factor: e.target.value })}
                    placeholder={i === 0 ? "예: 학습 참여 저하" : "예: 개념 이해 부족"}
                    disabled={readOnly}
                    className="h-9"
                  />
                </td>
                <td className="px-2 py-2 align-top">
                  <Input
                    value={m.indicator}
                    onChange={(e) => updateRow(m.id, { indicator: e.target.value })}
                    placeholder={i === 0 ? "예: 토론 참여 횟수, 질문 수" : "예: 형성평가 정답률"}
                    disabled={readOnly}
                    className="h-9"
                  />
                </td>
                {!readOnly && (
                  <td className="px-2 py-2 text-center align-top">
                    {form.problemMeasurements.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(m.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label="행 삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <Button variant="outline" size="sm" onClick={addRow} className="mt-3">
          <Plus size={12} className="mr-1" />
          행 추가
        </Button>
      )}
    </Section>
  );
}

// 1-6. 문제 정의 (한 문장)
function Field16Definition({ form, setField, readOnly }: FieldStepProps) {
  const summary = useMemo(() => {
    const env = form.fieldFormat ? `${FORMAT_LABEL[form.fieldFormat]}형 ${form.fieldSubject || ""} 수업`.trim() : form.fieldSubject || form.fieldDescription;
    const audience = form.scopeAudience || form.fieldAudience;
    const phenomena = form.problemPhenomena.filter((p) => p.trim()).slice(0, 2).join(" / ");
    const causes = form.problemCauses.filter((c) => c.content.trim()).map((c) => c.content).slice(0, 2).join(" / ");
    return { env, audience, phenomena, causes };
  }, [form]);

  return (
    <Section
      title="1-6. 문제 정의 (한 문장)"
      icon={<CheckCircle2 size={16} className="text-primary" />}
      sub="지금까지 작성한 내용을 바탕으로 본 프로젝트에서 다루고자 하는 핵심 문제를 1~2문장으로 정리해 주세요."
    >
      <div className="space-y-4">
        {(summary.env || summary.audience || summary.phenomena || summary.causes) && (
          <div className="rounded-lg border bg-muted/30 p-3 text-xs">
            <p className="mb-2 flex items-center gap-1 font-medium text-primary">
              <Sparkles size={12} /> 지금까지 작성한 내용
            </p>
            <ul className="space-y-1 text-muted-foreground">
              {(summary.env || summary.audience) && (
                <li>
                  <span className="font-medium text-foreground">교육현장:</span>{" "}
                  {[summary.audience, summary.env].filter(Boolean).join(" · ")}
                </li>
              )}
              {summary.phenomena && (
                <li>
                  <span className="font-medium text-foreground">핵심 문제:</span> {summary.phenomena}
                </li>
              )}
              {summary.causes && (
                <li>
                  <span className="font-medium text-foreground">주요 원인:</span> {summary.causes}
                </li>
              )}
            </ul>
          </div>
        )}

        <div className="rounded-lg border border-dashed bg-amber-50/40 px-3 py-2 text-[11px] text-amber-900">
          <p className="font-medium">템플릿 (참고용)</p>
          <p className="mt-1 leading-relaxed">
            <span className="rounded bg-white px-1 py-0.5 font-mono">[환경]</span>에서{" "}
            <span className="rounded bg-white px-1 py-0.5 font-mono">[대상]</span>은{" "}
            <span className="rounded bg-white px-1 py-0.5 font-mono">[원인]</span>으로 인해{" "}
            <span className="rounded bg-white px-1 py-0.5 font-mono">[문제]</span>를 겪고 있다.
          </p>
        </div>

        <Textarea
          value={form.problemDefinition}
          onChange={(e) => setField("problemDefinition", e.target.value)}
          placeholder="예: 비대면 혼합 수업 환경에서 중학교 2학년 학습자는 즉각적 피드백 부족으로 인해 학습 참여에 어려움을 겪고 있다."
          rows={4}
          disabled={readOnly}
        />
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. 교육공학 이론 — 배지 + 카드 + 관계 정리 재설계
// ─────────────────────────────────────────────────────────────

/** 빠르게 선택할 수 있는 자주 쓰이는 교육공학·학습이론 (배지) */
const THEORY_PRESETS: { name: string; scholar: string; year: string }[] = [
  { name: "Vygotsky 사회문화이론", scholar: "Vygotsky", year: "1978" },
  { name: "Piaget 인지발달이론", scholar: "Piaget", year: "1950" },
  { name: "행동주의 학습이론", scholar: "Skinner", year: "1953" },
  { name: "사회인지이론", scholar: "Bandura", year: "1986" },
  { name: "구성주의 학습이론", scholar: "Jonassen", year: "1991" },
  { name: "자기조절학습 이론", scholar: "Zimmerman", year: "2000" },
  { name: "ARCS 동기 모형", scholar: "Keller", year: "1987" },
  { name: "ADDIE 모형", scholar: "Branson 외", year: "1975" },
  { name: "Gagné 9가지 수업 사태", scholar: "Gagné", year: "1985" },
  { name: "인지부하 이론", scholar: "Sweller", year: "1988" },
  { name: "다중지능 이론", scholar: "Gardner", year: "1983" },
  { name: "경험학습 이론", scholar: "Kolb", year: "1984" },
  { name: "TPACK 프레임워크", scholar: "Mishra & Koehler", year: "2006" },
  { name: "Bloom 교육목표 분류학", scholar: "Bloom", year: "1956" },
  { name: "성취목표 이론", scholar: "Dweck", year: "1986" },
];

function TheoryStep({ form, setField, readOnly }: FieldStepProps) {
  function addCard(preset?: { name: string; scholar: string; year: string }) {
    const newCard: TheoryCard = {
      id: newId(),
      name: preset?.name ?? "",
      scholar: preset?.scholar ?? "",
      year: preset?.year ?? "",
      selectionReason: "",
      concepts: [],
      problemLink: "",
    };
    setField("theoryCards", [...form.theoryCards, newCard]);
  }

  function updateCard(id: string, patch: Partial<TheoryCard>) {
    setField(
      "theoryCards",
      form.theoryCards.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
  }

  function removeCard(id: string) {
    setField("theoryCards", form.theoryCards.filter((c) => c.id !== id));
  }

  function moveCard(id: string, dir: -1 | 1) {
    const idx = form.theoryCards.findIndex((c) => c.id === id);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= form.theoryCards.length) return;
    const next = [...form.theoryCards];
    [next[idx], next[target]] = [next[target], next[idx]];
    setField("theoryCards", next);
  }

  const selectedNames = new Set(form.theoryCards.map((c) => c.name).filter(Boolean));

  return (
    <div className="space-y-4">
      {/* 2-0. 이론 빠른 선택 */}
      <Section
        title="2-0. 적용할 이론 선택"
        icon={<BookOpen size={16} className="text-primary" />}
        sub="자주 쓰이는 교육공학·학습이론을 클릭해 카드를 추가하거나, 직접 입력 버튼으로 새 카드를 만드세요."
      >
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {THEORY_PRESETS.map((p) => {
              const used = selectedNames.has(p.name);
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => !used && !readOnly && addCard(p)}
                  disabled={used || readOnly}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                    used
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-white text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    readOnly && "cursor-not-allowed opacity-60",
                  )}
                  title={used ? "이미 추가됨" : `${p.name} 카드 추가`}
                >
                  {used && <CheckCircle2 size={10} />}
                  {p.name}
                </button>
              );
            })}
          </div>
          {!readOnly && (
            <div className="flex items-center justify-between border-t pt-3">
              <p className="text-[11px] text-muted-foreground">
                목록에 없는 이론은 직접 입력으로 추가할 수 있습니다.
              </p>
              <Button size="sm" variant="outline" onClick={() => addCard()}>
                <Plus size={12} className="mr-1" />
                직접 입력으로 카드 추가
              </Button>
            </div>
          )}
        </div>
      </Section>

      {/* 이론 카드 목록 */}
      {form.theoryCards.length === 0 ? (
        <Section title="2-1. 이론 카드">
          <p className="rounded-md border border-dashed bg-muted/10 px-3 py-6 text-center text-xs text-muted-foreground">
            추가된 이론이 없습니다. 위 배지 또는 “직접 입력으로 카드 추가”로 시작하세요.
          </p>
        </Section>
      ) : (
        form.theoryCards.map((card, idx) => (
          <TheoryCardEditor
            key={card.id}
            index={idx}
            total={form.theoryCards.length}
            card={card}
            readOnly={readOnly}
            onChange={(patch) => updateCard(card.id, patch)}
            onRemove={() => removeCard(card.id)}
            onMove={(dir) => moveCard(card.id, dir)}
          />
        ))
      )}

      {/* 2-2. 이론 간 관계 정리 (이론이 2개 이상일 때 권장이지만 1개여도 채울 수 있음) */}
      <Section
        title={`2-${form.theoryCards.length === 0 ? "2" : "마지막"}. 이론 간 관계 정리`}
        icon={<Sparkles size={16} className="text-primary" />}
        sub="여러 이론을 어떻게 연결하여 하나의 일관된 관점을 만들지 정리합니다. 이론이 1개라도 ‘문제와의 통합 정리’ 용으로 활용하세요."
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              ① 이론(들)이 1번 문제와 어떻게 연결되는가
            </label>
            <Textarea
              value={form.theoryRelationProblem}
              onChange={(e) => setField("theoryRelationProblem", e.target.value)}
              placeholder="예: 사회문화이론은 학습자의 동료 상호작용을, ARCS 모형은 학습 동기 저하 문제를 각각 설명한다."
              rows={4}
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              ② 각 이론의 역할 분담 (이론이 2개 이상일 때)
            </label>
            <Textarea
              value={form.theoryRelationRoles}
              onChange={(e) => setField("theoryRelationRoles", e.target.value)}
              placeholder="예: 이론 A는 ‘왜 발생하는지’를, 이론 B는 ‘어떻게 해결할 수 있는지’를 설명한다."
              rows={3}
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              ③ 통합적 관점 — 이론들이 함께 만들어내는 의미
            </label>
            <Textarea
              value={form.theoryRelationIntegration}
              onChange={(e) => setField("theoryRelationIntegration", e.target.value)}
              placeholder="예: 학습자 동기 저하의 원인을 사회·인지적 측면 모두에서 진단하고, 협력적 학습 환경 + 동기 전략을 결합해 개입한다."
              rows={3}
              disabled={readOnly}
            />
          </div>
        </div>
      </Section>
    </div>
  );
}

interface TheoryCardEditorProps {
  index: number;
  total: number;
  card: TheoryCard;
  readOnly: boolean;
  onChange: (patch: Partial<TheoryCard>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}

function TheoryCardEditor({ index, total, card, readOnly, onChange, onRemove, onMove }: TheoryCardEditorProps) {
  function addConcept() {
    const next: TheoryConcept[] = [...(card.concepts ?? []), { id: newId(), name: "", definition: "" }];
    onChange({ concepts: next });
  }

  function updateConcept(id: string, patch: Partial<TheoryConcept>) {
    onChange({
      concepts: (card.concepts ?? []).map((k) => (k.id === id ? { ...k, ...patch } : k)),
    });
  }

  function removeConcept(id: string) {
    onChange({ concepts: (card.concepts ?? []).filter((k) => k.id !== id) });
  }

  return (
    <section className="rounded-2xl border bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[11px] font-semibold text-primary">
            이론 {index + 1}
          </span>
          <h4 className="text-sm font-semibold">
            {card.name?.trim() || "이론 이름을 입력하세요"}
          </h4>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => onMove(-1)}
              disabled={index === 0}
              title="위로 이동"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
            >
              <ChevronLeft size={13} className="rotate-90" />
            </button>
            <button
              type="button"
              onClick={() => onMove(1)}
              disabled={index === total - 1}
              title="아래로 이동"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
            >
              <ChevronRight size={13} className="rotate-90" />
            </button>
            <button
              type="button"
              onClick={onRemove}
              title="이론 카드 삭제"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-4">
        {/* 기본 정보 */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">이론 이름</label>
            <Input
              value={card.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="예: Vygotsky 사회문화이론"
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">주요 학자</label>
            <Input
              value={card.scholar ?? ""}
              onChange={(e) => onChange({ scholar: e.target.value })}
              placeholder="예: Vygotsky"
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">발표 연도</label>
            <Input
              value={card.year ?? ""}
              onChange={(e) => onChange({ year: e.target.value })}
              placeholder="예: 1978"
              disabled={readOnly}
            />
          </div>
        </div>

        {/* 선택 이유 */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            왜 이 이론을 선택했나요?
          </label>
          <Textarea
            value={card.selectionReason ?? ""}
            onChange={(e) => onChange({ selectionReason: e.target.value })}
            placeholder="예: 우리 현장의 학습 결손이 또래 상호작용 부족과 관련이 있다고 판단해 협력학습을 강조하는 이 이론을 선택했다."
            rows={3}
            disabled={readOnly}
          />
        </div>

        {/* 핵심 개념 */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">
              핵심 개념 (3~5개 권장)
            </label>
            {!readOnly && (
              <Button size="sm" variant="outline" onClick={addConcept}>
                <Plus size={12} className="mr-1" />
                개념 추가
              </Button>
            )}
          </div>
          {(card.concepts ?? []).length === 0 ? (
            <p className="rounded-md border border-dashed bg-muted/10 px-3 py-3 text-center text-[11px] text-muted-foreground">
              핵심 개념을 추가해 한 줄씩 정리해 보세요.
            </p>
          ) : (
            <ul className="space-y-2">
              {(card.concepts ?? []).map((k, ki) => (
                <li key={k.id} className="rounded-lg border bg-muted/10 p-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                      {ki + 1}
                    </span>
                    <div className="flex-1 space-y-2">
                      <Input
                        value={k.name}
                        onChange={(e) => updateConcept(k.id, { name: e.target.value })}
                        placeholder="개념 이름 (예: 최근접발달영역 ZPD)"
                        disabled={readOnly}
                        className="h-8 text-sm"
                      />
                      <Textarea
                        value={k.definition}
                        onChange={(e) => updateConcept(k.id, { definition: e.target.value })}
                        placeholder="이 개념의 정의 또는 의미 (1~2문장)"
                        rows={2}
                        disabled={readOnly}
                      />
                    </div>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => removeConcept(k.id)}
                        title="개념 삭제"
                        className="rounded-md p-1 text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 문제와의 연결 */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            이 이론이 1번 문제와 어떻게 연결되나요?
          </label>
          <Textarea
            value={card.problemLink ?? ""}
            onChange={(e) => onChange({ problemLink: e.target.value })}
            placeholder="예: 1-2의 ‘학습 결손 누적’ 현상은 ZPD 외부 학습 환경 노출에서 발생한다고 본 이론은 설명한다. 따라서 ‘비계 설계’가 해결의 출발점이 된다."
            rows={3}
            disabled={readOnly}
          />
        </div>
      </div>
    </section>
  );
}
