"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Save, CheckCircle2, ChevronLeft, ChevronRight,
  FileText, School, BookOpen, FlaskConical,
  Plus, Trash2, Link2, X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { User, ResearchReport, ResearchGroup, ResearchPaper } from "@/types";
import {
  useResearchReport,
  useEnsureResearchReport,
  useUpdateResearchReport,
} from "./useResearchReport";
import { useResearchPapers } from "./useResearchPapers";
import { useLogWritingActivity } from "./useWritingPaperHistory";

interface Props {
  user: User;
  readOnly?: boolean;
}

interface FormState {
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
}

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
};

function fromReport(r: ResearchReport | undefined): FormState {
  if (!r) return EMPTY;
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
  };
}

function totalChars(form: FormState): number {
  const textFields = [
    form.fieldDescription, form.fieldProblem,
    form.problemPhenomenon, form.problemEvidence, form.problemCause, form.problemDefinition,
    form.theoryType, form.theoryDefinition, form.theoryConnection,
    form.priorResearchAnalysis,
  ];
  let sum = textFields.reduce((s, v) => s + v.length, 0);
  for (const g of form.priorResearchGroups) {
    sum += (g.name?.length ?? 0) + (g.integration?.length ?? 0) + (g.insight?.length ?? 0);
  }
  return sum;
}

const STEPS = [
  { key: "field", label: "교육현장의 문제 정의", icon: School },
  { key: "theory", label: "교육공학 이론", icon: BookOpen },
  { key: "prior", label: "선행연구 분석", icon: FlaskConical },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

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
      <section className="rounded-2xl border bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-primary" />
            <div>
              <h3 className="text-sm font-semibold">연구 보고서</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                현장–이론–연구를 결합하는 것이 목표입니다. · {total.toLocaleString()}자
              </p>
            </div>
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
      </section>

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
          <>
            <Section title="1-1. 내가 속한 교육 현장" sub="본인이 관심 있는 교육 현장의 맥락을 간략히 기술해 주세요. (대상 학습자, 교육 형태, 현장 특성 등)">
              <Textarea
                value={form.fieldDescription}
                onChange={(e) => setField("fieldDescription", e.target.value)}
                placeholder="예: 중학교 2학년 수학 교과, 비대면 혼합 수업 환경..."
                rows={6}
                disabled={readOnly}
              />
            </Section>
            <Section title="1-2. 발견한 문제" sub="해당 현장에서 발견한 핵심 문제를 기술해 주세요. 가능하면 데이터나 근거를 함께 제시해 주세요.">
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">현상</label>
                  <Textarea
                    value={form.problemPhenomenon}
                    onChange={(e) => setField("problemPhenomenon", e.target.value)}
                    placeholder="현장에서 관찰된 현상을 기술하세요..."
                    rows={3}
                    disabled={readOnly}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">근거</label>
                  <Textarea
                    value={form.problemEvidence}
                    onChange={(e) => setField("problemEvidence", e.target.value)}
                    placeholder="데이터, 선행연구, 관찰 결과 등..."
                    rows={3}
                    disabled={readOnly}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">원인</label>
                  <Textarea
                    value={form.problemCause}
                    onChange={(e) => setField("problemCause", e.target.value)}
                    placeholder="문제가 발생한 원인을 분석하세요..."
                    rows={3}
                    disabled={readOnly}
                  />
                </div>
              </div>
            </Section>
            <Section title="1-3. 문제 정의 (한 문장)" sub="위 분석을 바탕으로, 본 프로젝트에서 다루고자 하는 핵심 문제를 1~2문장으로 정의해 주세요.">
              <Textarea
                value={form.problemDefinition}
                onChange={(e) => setField("problemDefinition", e.target.value)}
                placeholder="예: 비대면 환경에서 중학생의 자기조절학습 능력 부족으로 인한 학업 성취도 격차 확대 문제"
                rows={3}
                disabled={readOnly}
              />
            </Section>
          </>
        )}

        {step === "theory" && (
          <>
            <Section title="2-1. 이론의 종류" sub="적용하고자 하는 교육공학 이론을 기술해 주세요.">
              <Textarea
                value={form.theoryType}
                onChange={(e) => setField("theoryType", e.target.value)}
                placeholder="예: 자기조절학습 이론 (Zimmerman, 2000)"
                rows={3}
                disabled={readOnly}
              />
            </Section>
            <Section title="2-2. 이론의 정의 및 특징" sub="이론의 핵심 개념과 주요 특징을 정리해 주세요.">
              <Textarea
                value={form.theoryDefinition}
                onChange={(e) => setField("theoryDefinition", e.target.value)}
                placeholder="이론의 정의, 구성 요소, 핵심 원리 등..."
                rows={6}
                disabled={readOnly}
              />
            </Section>
            <Section title="2-3. 이론과 현장/문제 연결" sub="이 이론이 왜 내 교육현장 및 문제와 연결되는지 설명해 주세요.">
              <Textarea
                value={form.theoryConnection}
                onChange={(e) => setField("theoryConnection", e.target.value)}
                placeholder="이 이론을 적용하면 1-2에서 정의한 문제를 어떻게 해결할 수 있는지..."
                rows={6}
                disabled={readOnly}
              />
            </Section>
          </>
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
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white p-5">
      <h4 className="text-sm font-semibold">{title}</h4>
      {sub && <p className="mt-0.5 mb-3 text-xs leading-relaxed text-muted-foreground">{sub}</p>}
      {children}
    </section>
  );
}
