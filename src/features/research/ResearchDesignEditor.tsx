"use client";

/**
 * 연구 설계 에디터 (2026-07-13)
 *
 * 연구 여정 '연구 설계' 단계 — 연구 보고서와 연구 계획서 사이.
 * 교육공학 학위논문 연구방법(III장) 전형 구조를 역산한 8섹션 아코디언 폼.
 * approach(양적/질적/혼합) 선택에 따라 절차 프리필·도구·프로그램·분석 섹션이 분기한다.
 * 디바운스 자동 저장 + 섹션 완성도 칩 + 연구방법 초안 미리보기(복사).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  DraftingCompass, CheckCircle2, ChevronRight, Save, Plus, Trash2, X,
  Copy, Wand2, ClipboardList, Link2, ExternalLink, Sparkles, Sigma,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  researchMethodsApi,
  archiveMeasurementsApi,
  statisticalMethodsApi,
} from "@/lib/bkend";
import { researchModelsApi } from "@/lib/research-models-api";
import type {
  User,
  ResearchDesign,
  ResearchMethod,
  ResearchMethodKind,
  ArchiveMeasurementTool,
  StatisticalMethod,
} from "@/types";
import {
  ADDIE_STEPS,
  EMPTY_PARTICIPANTS,
  EMPTY_PROGRAM,
  EMPTY_DESIGN_CONDITIONS,
  RESEARCH_DESIGN_APPROACH_LABELS,
  designSectionStatus,
  computeDesignProgress,
  type ResearchDesignApproach,
  type ResearchDesignInstrument,
  type ResearchDesignParticipants,
  type ResearchDesignProcedureStep,
  type ResearchDesignProgram,
  type DesignConditions,
} from "@/types/research-design";
import { RESEARCH_METHOD_KIND_LABELS } from "@/types/research-method";
import { buildResearchMethodDraft } from "@/lib/research-design-draft";
import { recommendStatMethods } from "@/lib/stat-method-recommender";
import {
  useResearchDesign,
  useEnsureResearchDesign,
  useUpdateResearchDesign,
} from "./useResearchDesign";
import { useResearchReport } from "./useResearchReport";
import { useLogWritingActivity } from "./useWritingPaperHistory";
import ResearchJourneyGuide from "./ResearchJourneyGuide";
import EditorSaveBar from "./EditorSaveBar";
import EthicsChecklistPanel from "./EthicsChecklistPanel";
import MethodRecommenderDialog from "./MethodRecommenderDialog";
import StatMethodGuideDialog, { DesignConditionForm } from "./StatMethodGuideDialog";

interface Props {
  user: User;
  readOnly?: boolean;
}

interface FormState {
  approach: ResearchDesignApproach;
  methodName: string;
  approachRationale: string;
  modelId: string;
  participants: ResearchDesignParticipants;
  procedureSteps: ResearchDesignProcedureStep[];
  instruments: ResearchDesignInstrument[];
  qualInstruments: string;
  programDesign: ResearchDesignProgram;
  dataCollection: string;
  dataAnalysis: string;
  selectedStatMethods: string[];
  designConditions: DesignConditions;
  ethicsChecked: string[];
}

const EMPTY_FORM: FormState = {
  approach: "",
  methodName: "",
  approachRationale: "",
  modelId: "",
  participants: { ...EMPTY_PARTICIPANTS },
  procedureSteps: [],
  instruments: [],
  qualInstruments: "",
  programDesign: { ...EMPTY_PROGRAM },
  dataCollection: "",
  dataAnalysis: "",
  selectedStatMethods: [],
  designConditions: { ...EMPTY_DESIGN_CONDITIONS },
  ethicsChecked: [],
};

function fromDesign(d: ResearchDesign | null | undefined): FormState {
  if (!d)
    return {
      ...EMPTY_FORM,
      participants: { ...EMPTY_PARTICIPANTS },
      programDesign: { ...EMPTY_PROGRAM },
      designConditions: { ...EMPTY_DESIGN_CONDITIONS },
    };
  return {
    approach: d.approach ?? "",
    methodName: d.methodName ?? "",
    approachRationale: d.approachRationale ?? "",
    modelId: d.modelId ?? "",
    participants: { ...EMPTY_PARTICIPANTS, ...(d.participants ?? {}) },
    procedureSteps: d.procedureSteps ?? [],
    instruments: d.instruments ?? [],
    qualInstruments: d.qualInstruments ?? "",
    programDesign: { ...EMPTY_PROGRAM, ...(d.programDesign ?? {}) },
    dataCollection: d.dataCollection ?? "",
    dataAnalysis: d.dataAnalysis ?? "",
    selectedStatMethods: d.selectedStatMethods ?? [],
    designConditions: { ...EMPTY_DESIGN_CONDITIONS, ...(d.designConditions ?? {}) },
    ethicsChecked: d.ethicsChecked ?? [],
  };
}

/** FormState → ResearchDesign 부분 (progress 계산·초안 조립 재사용) */
function toDesign(form: FormState, base: ResearchDesign): ResearchDesign {
  return {
    ...base,
    approach: form.approach,
    methodName: form.methodName,
    approachRationale: form.approachRationale,
    modelId: form.modelId,
    participants: form.participants,
    procedureSteps: form.procedureSteps,
    instruments: form.instruments,
    qualInstruments: form.qualInstruments,
    programDesign: form.programDesign,
    dataCollection: form.dataCollection,
    dataAnalysis: form.dataAnalysis,
    selectedStatMethods: form.selectedStatMethods,
    designConditions: form.designConditions,
    ethicsChecked: form.ethicsChecked,
  };
}

function nid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function ResearchDesignEditor({ user, readOnly = false }: Props) {
  const { design, isLoading } = useResearchDesign(user.id);
  const { report } = useResearchReport(readOnly ? undefined : user.id);
  const ensure = useEnsureResearchDesign();
  const update = useUpdateResearchDesign();
  const logActivity = useLogWritingActivity();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [hydrated, setHydrated] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const ensureTriggeredRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [methodGuideOpen, setMethodGuideOpen] = useState(false);
  const [statGuideOpen, setStatGuideOpen] = useState(false);
  const [showAllMethods, setShowAllMethods] = useState(false);

  // 연구방법 가이드(절차 프리필 소스)·측정도구 아카이브
  const { data: methods = [] } = useQuery({
    queryKey: ["archive_research_methods", "published"],
    queryFn: async () => (await researchMethodsApi.listPublished()).data as ResearchMethod[],
    staleTime: 5 * 60_000,
  });
  const { data: measurements = [] } = useQuery({
    queryKey: ["archive_measurements", "all"],
    queryFn: async () => (await archiveMeasurementsApi.list()).data as ArchiveMeasurementTool[],
    staleTime: 5 * 60_000,
  });
  const { data: statMethods = [] } = useQuery({
    queryKey: ["archive_statistical_methods", "published"],
    queryFn: async () => (await statisticalMethodsApi.listPublished()).data as StatisticalMethod[],
    staleTime: 5 * 60_000,
  });
  const { data: model } = useQuery({
    queryKey: ["research_model", user.id],
    queryFn: () => researchModelsApi.get(user.id),
    staleTime: 60_000,
    enabled: !!user.id,
  });

  useEffect(() => {
    if (readOnly || isLoading || design || ensureTriggeredRef.current) return;
    ensureTriggeredRef.current = true;
    ensure.mutate(user.id);
  }, [design, isLoading, readOnly, user.id, ensure]);

  useEffect(() => {
    if (design && !hydrated) {
      setForm(fromDesign(design));
      setSavedAt(design.lastSavedAt ?? design.updatedAt ?? null);
      setHydrated(true);
    }
  }, [design, hydrated]);

  const doSave = useMemo(
    () =>
      async (showToast: boolean): Promise<boolean> => {
        if (!design || readOnly) return false;
        setSaving(true);
        const now = new Date().toISOString();
        try {
          await update.mutateAsync({
            id: design.id,
            data: {
              approach: form.approach,
              methodName: form.methodName,
              approachRationale: form.approachRationale,
              modelId: form.modelId,
              participants: form.participants,
              procedureSteps: form.procedureSteps,
              instruments: form.instruments,
              qualInstruments: form.qualInstruments,
              programDesign: form.programDesign,
              dataCollection: form.dataCollection,
              dataAnalysis: form.dataAnalysis,
              selectedStatMethods: form.selectedStatMethods,
              designConditions: form.designConditions,
              ethicsChecked: form.ethicsChecked,
              lastSavedAt: now,
            },
          });
          setSavedAt(now);
          setDirty(false);
          logActivity.mutate({
            userId: user.id,
            paperId: design.id,
            charCount: buildResearchMethodDraft(toDesign(form, design)).length,
            lastChapter: "design" as never,
            title: "연구 설계",
          });
          if (showToast) toast.success("저장되었습니다.");
          return true;
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "저장 실패");
          return false;
        } finally {
          setSaving(false);
        }
      },
    [design, readOnly, update, form, logActivity, user.id],
  );

  // 디바운스 자동 저장 — dirty 후 1.5초
  useEffect(() => {
    if (!dirty || readOnly || !design) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void doSave(false);
    }, 1500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [dirty, readOnly, design, doSave]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function setParticipant<K extends keyof ResearchDesignParticipants>(
    key: K,
    value: string,
  ) {
    setForm((prev) => ({ ...prev, participants: { ...prev.participants, [key]: value } }));
    setDirty(true);
  }

  function setProgram<K extends keyof ResearchDesignProgram>(
    key: K,
    value: ResearchDesignProgram[K],
  ) {
    setForm((prev) => ({ ...prev, programDesign: { ...prev.programDesign, [key]: value } }));
    setDirty(true);
  }

  // 연구방법 선택 → 절차 프리필 (빈 절차일 때만 자동 채움)
  function applyMethod(methodName: string) {
    const m = methods.find((x) => x.name === methodName);
    setForm((prev) => {
      const nextSteps =
        m?.procedures && m.procedures.length > 0 && prev.procedureSteps.length === 0
          ? m.procedures.map((p) => ({ step: p.step, detail: p.detail ?? "" }))
          : prev.procedureSteps;
      return { ...prev, methodName, procedureSteps: nextSteps };
    });
    setDirty(true);
    const m2 = methods.find((x) => x.name === methodName);
    if (m2?.procedures?.length && form.procedureSteps.length === 0) {
      toast.success(`'${methodName}'의 표준 절차 ${m2.procedures.length}단계를 프리필했습니다 — 자유롭게 수정하세요.`);
    }
  }

  function refillProcedures() {
    const m = methods.find((x) => x.name === form.methodName);
    if (!m?.procedures?.length) {
      toast.info("선택한 연구방법의 표준 절차가 없습니다.");
      return;
    }
    setForm((prev) => ({
      ...prev,
      procedureSteps: m.procedures!.map((p) => ({ step: p.step, detail: p.detail ?? "" })),
    }));
    setDirty(true);
    toast.success(`표준 절차 ${m.procedures.length}단계로 다시 채웠습니다.`);
  }

  // 절차 편집
  function updateStep(i: number, patch: Partial<ResearchDesignProcedureStep>) {
    setForm((prev) => {
      const next = [...prev.procedureSteps];
      next[i] = { ...next[i], ...patch };
      return { ...prev, procedureSteps: next };
    });
    setDirty(true);
  }
  function addStep() {
    setField("procedureSteps", [...form.procedureSteps, { step: "", detail: "" }]);
  }
  function removeStep(i: number) {
    setField("procedureSteps", form.procedureSteps.filter((_, idx) => idx !== i));
  }

  // 측정도구
  function addInstrument(measurementId?: string, name?: string) {
    setField("instruments", [
      ...form.instruments,
      { id: nid("inst"), measurementId, name: name ?? "", plan: "" },
    ]);
  }
  function updateInstrument(id: string, patch: Partial<ResearchDesignInstrument>) {
    setField(
      "instruments",
      form.instruments.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    );
  }
  function removeInstrument(id: string) {
    setField("instruments", form.instruments.filter((it) => it.id !== id));
  }

  // 보고서 → 설계 시딩 (approach·모형 연결)
  function seedFromReport() {
    if (!report) return;
    const patch: Partial<FormState> = {};
    // 접근 추정: report.researchApproach → 양적/질적/혼합 매핑
    if (!form.approach) {
      const ra = report.researchApproach;
      const map: Record<string, ResearchDesignApproach> = {
        analytical: "quantitative",
        mixed_methods: "mixed",
        generative: "qualitative",
        action_research: "qualitative",
      };
      if (ra && map[ra]) patch.approach = map[ra];
    }
    if (!form.modelId && model) patch.modelId = user.id;
    if (Object.keys(patch).length === 0) {
      toast.info("가져올 내용이 없거나 이미 작성되어 있습니다.");
      return;
    }
    setForm((prev) => ({ ...prev, ...patch }));
    setDirty(true);
    toast.success("연구 보고서에서 접근·모형 정보를 가져왔습니다.");
  }

  const status = useMemo(
    () => (design ? designSectionStatus(toDesign(form, design)) : designSectionStatus(null)),
    [form, design],
  );
  const progress = useMemo(
    () => (design ? computeDesignProgress(toDesign(form, design)) : 0),
    [form, design],
  );
  const draft = useMemo(
    () => (design ? buildResearchMethodDraft(toDesign(form, design)) : ""),
    [form, design],
  );

  // 접근(kind)에 정확히 대응하는 연구방법만 노출. '다른 접근의 방법 보기' 토글 시 전체 노출.
  const strictKind: Record<ResearchDesignApproach, ResearchMethodKind[]> = {
    "": [],
    quantitative: ["quantitative"],
    qualitative: ["qualitative"],
    mixed: ["mixed"],
  };
  const methodOptions = useMemo(() => {
    const kinds = strictKind[form.approach];
    return methods
      .filter(
        (m) => showAllMethods || kinds.length === 0 || kinds.includes(m.kind),
      )
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [methods, form.approach, showAllMethods]);

  const selectedMethod = useMemo(
    () => methods.find((m) => m.name === form.methodName) ?? null,
    [methods, form.methodName],
  );

  const isQual = form.approach === "qualitative";
  const showStatMethods = form.approach === "quantitative" || form.approach === "mixed";

  // 추천 가이드에서 방법 선택 → 접근(kind)·방법 이름 동시 반영 + 절차 프리필
  function applyRecommendedMethod(methodName: string, kind: ResearchMethodKind) {
    const m = methods.find((x) => x.name === methodName);
    setForm((prev) => {
      const nextSteps =
        m?.procedures && m.procedures.length > 0 && prev.procedureSteps.length === 0
          ? m.procedures.map((p) => ({ step: p.step, detail: p.detail ?? "" }))
          : prev.procedureSteps;
      return { ...prev, approach: kind, methodName, procedureSteps: nextSteps };
    });
    setDirty(true);
    toast.success(`'${methodName}'을(를) 연구방법으로 반영했습니다.`);
  }

  function toggleStatMethod(name: string) {
    setForm((prev) => {
      const has = prev.selectedStatMethods.includes(name);
      return {
        ...prev,
        selectedStatMethods: has
          ? prev.selectedStatMethods.filter((n) => n !== name)
          : [...prev.selectedStatMethods, name],
      };
    });
    setDirty(true);
  }

  function setDesignConditions(next: DesignConditions) {
    setField("designConditions", next);
  }

  // 설계 조건 → 통계방법 추천 (순수 함수)
  const statRecommend = useMemo(
    () => recommendStatMethods(form.designConditions),
    [form.designConditions],
  );

  // 추천 통계방법을 selectedStatMethods 에 일괄 반영 (중복 제거)
  function applyRecommendedStats() {
    const names = statRecommend.recommended.map((r) => r.name);
    if (names.length === 0) return;
    setForm((prev) => ({
      ...prev,
      selectedStatMethods: Array.from(
        new Set([...prev.selectedStatMethods, ...names]),
      ),
    }));
    setDirty(true);
    toast.success(`추천 통계방법 ${names.length}개를 반영했습니다.`);
  }

  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(draft);
      toast.success("연구방법 초안을 복사했습니다.");
    } catch {
      toast.error("복사에 실패했습니다. 텍스트를 직접 선택해 복사하세요.");
    }
  }

  if (isLoading || (!design && !readOnly)) {
    return (
      <p className="rounded-2xl border bg-card py-10 text-center text-sm text-muted-foreground">
        연구 설계를 불러오는 중...
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <ResearchJourneyGuide userId={user.id} current="design" readOnly={readOnly} />

      {/* 헤더 */}
      <section className="rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <DraftingCompass size={18} className="text-primary" />
            <div>
              <h3 className="text-sm font-semibold">연구 설계</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                연구 모형·대상·방법·도구·분석 계획을 설계해 &lsquo;연구방법&rsquo; 장의 초안을 미리 만듭니다. · 완성도 {progress}%
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
              <Button size="sm" onClick={() => void doSave(true)} disabled={saving}>
                <Save size={12} className="mr-1" />
                저장
              </Button>
            </div>
          )}
        </div>
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-gradient-to-r from-primary/70 to-primary transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>

      {/* 보고서 → 설계 파이프라인 배너 */}
      {!readOnly && report && (!form.approach || (!form.modelId && model)) && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3">
          <p className="text-xs text-foreground/85">
            작성하신 <span className="font-semibold">연구보고서</span>의 변인·이론·접근을 설계로 가져올 수 있어요.
          </p>
          <Button size="sm" variant="outline" className="h-7 shrink-0 text-xs" onClick={seedFromReport}>
            보고서에서 가져오기
          </Button>
        </div>
      )}

      {/* 1. 연구 유형·접근 */}
      <Section n={1} title="연구 유형·접근" done={status.approach}>
        <p className="mb-3 text-xs text-muted-foreground">
          양적·질적·혼합 중 연구의 기본 접근을 고르면 이후 섹션(절차·도구·분석)이 그에 맞게 분기합니다.
        </p>
        <div className="flex flex-wrap gap-2">
          {(["quantitative", "qualitative", "mixed"] as const).map((a) => (
            <button
              key={a}
              type="button"
              disabled={readOnly}
              onClick={() => setField("approach", a)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                form.approach === a
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40",
              )}
            >
              {RESEARCH_DESIGN_APPROACH_LABELS[a]}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <label className="block text-xs font-medium text-muted-foreground">
              연구방법 선택 (표준 절차 프리필)
            </label>
            {!readOnly && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => setMethodGuideOpen(true)}
              >
                <Wand2 size={12} className="mr-1" /> 가이드로 내 연구에 맞는 방법 찾기
              </Button>
            )}
          </div>
          <select
            value={form.methodName}
            disabled={readOnly}
            onChange={(e) => applyMethod(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
          >
            <option value="">— 연구방법 선택 —</option>
            {methodOptions.map((m) => (
              <option key={m.id} value={m.name}>
                {m.name} ({RESEARCH_METHOD_KIND_LABELS[m.kind]})
              </option>
            ))}
          </select>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
            <Link
              href="/archive/research-methods"
              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              연구방법 가이드 보기 <ExternalLink size={10} />
            </Link>
            {form.approach && !readOnly && (
              <label className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={showAllMethods}
                  onChange={(e) => setShowAllMethods(e.target.checked)}
                  className="h-3 w-3 accent-primary"
                />
                다른 접근의 방법도 보기
              </label>
            )}
          </div>

          {/* 선택 방법 즉시 설명 카드 */}
          {selectedMethod && (
            <div className="mt-2.5 rounded-lg border bg-muted/20 p-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">
                  {selectedMethod.name}
                </span>
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  {RESEARCH_METHOD_KIND_LABELS[selectedMethod.kind]}
                </span>
              </div>
              {selectedMethod.summary && (
                <p className="mt-1.5 text-[11px] leading-relaxed text-foreground/85">
                  {selectedMethod.summary}
                </p>
              )}
              {selectedMethod.accessibleSummary && (
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                  <span className="font-medium text-primary">쉽게 이해하기 · </span>
                  {selectedMethod.accessibleSummary}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            접근·방법 선택 이유
          </label>
          <Textarea
            value={form.approachRationale}
            onChange={(e) => setField("approachRationale", e.target.value)}
            placeholder="예: 처치 효과를 인과적으로 검증하기 위해 준실험 설계를 선택하였다."
            rows={3}
            disabled={readOnly}
          />
        </div>
      </Section>

      {/* 2. 연구 모형 */}
      <Section n={2} title="연구 모형" done={status.model}>
        <p className="mb-3 text-xs text-muted-foreground">
          변인과 관계를 다이어그램으로 정리한 &lsquo;연구 모형&rsquo;을 연결하면 대상·도구·분석 설계가 일관됩니다.
        </p>
        {model ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2.5">
            <div className="min-w-0 text-xs">
              <p className="font-medium text-foreground">{model.title || "내 연구 모형"}</p>
              <p className="text-muted-foreground">
                변인 {model.data?.nodes?.length ?? 0}개 · 관계 {model.data?.edges?.length ?? 0}개
                {form.modelId ? " · 연결됨" : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {!readOnly && !form.modelId && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setField("modelId", user.id)}>
                  <Link2 size={12} className="mr-1" /> 이 모형 연결
                </Button>
              )}
              <Link
                href="/research-model"
                className="inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] hover:bg-accent"
              >
                모형 편집 <ExternalLink size={10} />
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-4 text-center">
            <p className="text-xs text-muted-foreground">아직 연구 모형이 없습니다.</p>
            <Link
              href="/research-model"
              className="mt-2 inline-flex items-center gap-1 rounded-md border bg-card px-2.5 py-1.5 text-[11px] font-medium hover:bg-accent"
            >
              <Wand2 size={12} /> 연구 모형 그리기
            </Link>
          </div>
        )}
      </Section>

      {/* 3. 연구 대상 */}
      <Section n={3} title="연구 대상" done={status.participants}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="모집단">
            <Input value={form.participants.population} disabled={readOnly}
              onChange={(e) => setParticipant("population", e.target.value)}
              placeholder="예: 서울 소재 중학교 2학년" />
          </Field>
          <Field label="표본 크기">
            <Input value={form.participants.sampleSize} disabled={readOnly}
              onChange={(e) => setParticipant("sampleSize", e.target.value)}
              placeholder="예: 실험·통제 각 60명(총 120명)" />
          </Field>
          <Field label="표집 방법">
            <Input value={form.participants.samplingMethod} disabled={readOnly}
              onChange={(e) => setParticipant("samplingMethod", e.target.value)}
              placeholder="예: 층화표집 / 편의표집 / 의도적 표집" />
          </Field>
          <Field label="표본 크기 산정 근거">
            <Input value={form.participants.sizeRationale} disabled={readOnly}
              onChange={(e) => setParticipant("sizeRationale", e.target.value)}
              placeholder="예: 검정력 .80·중간 효과크기 / 이론적 포화" />
          </Field>
        </div>
        <Field label="참여자 보호 (동의·익명화·IRB)" className="mt-3">
          <Textarea value={form.participants.protection} disabled={readOnly}
            onChange={(e) => setParticipant("protection", e.target.value)}
            placeholder="예: 연구 목적·절차 설명 후 서면 동의, 식별정보 익명 처리, IRB 승인."
            rows={2} />
        </Field>
        {/* 윤리 체크리스트(윤리 단계 흡수) */}
        <EthicsChecklistPanel
          checked={form.ethicsChecked}
          readOnly={readOnly}
          onChange={(next) => setField("ethicsChecked", next)}
          onInsert={(text) =>
            setParticipant(
              "protection",
              form.participants.protection
                ? `${form.participants.protection}\n${text}`
                : text,
            )
          }
        />
      </Section>

      {/* 4. 연구 절차 */}
      <Section n={4} title="연구 절차" done={status.procedure}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {form.methodName
              ? `'${form.methodName}'의 표준 절차를 바탕으로 단계별 계획을 구체화하세요.`
              : "연구방법을 선택하면 표준 절차가 자동으로 채워집니다."}
          </p>
          {!readOnly && form.methodName && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={refillProcedures}>
              <Wand2 size={12} className="mr-1" /> 표준 절차 다시 채우기
            </Button>
          )}
        </div>
        <ol className="space-y-2">
          {form.procedureSteps.map((s, i) => (
            <li key={i} className="rounded-lg border bg-card/60 p-2.5">
              <div className="flex items-start gap-2">
                <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Input value={s.step} disabled={readOnly}
                    onChange={(e) => updateStep(i, { step: e.target.value })}
                    placeholder="단계 이름 (예: 사전검사)" className="h-8 text-sm" />
                  <Textarea value={s.detail} disabled={readOnly}
                    onChange={(e) => updateStep(i, { detail: e.target.value })}
                    placeholder="단계별 계획 상세" rows={2} className="text-xs" />
                </div>
                {!readOnly && (
                  <button type="button" onClick={() => removeStep(i)}
                    className="mt-1 rounded-md p-1 text-muted-foreground hover:bg-rose-50 hover:text-rose-600">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
        {!readOnly && (
          <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={addStep}>
            <Plus size={12} className="mr-1" /> 단계 추가
          </Button>
        )}
      </Section>

      {/* 5. 연구 도구 */}
      <Section n={5} title="연구 도구" done={status.instruments}>
        {isQual ? (
          <Field label="질적 도구 — 면담 프로토콜 개요·델파이 패널 구성·질문 초안">
            <Textarea value={form.qualInstruments} disabled={readOnly}
              onChange={(e) => setField("qualInstruments", e.target.value)}
              placeholder={`예:\n- 반구조화 면담 프로토콜(12문항): 도입·경험·의미·마무리 4부\n- 델파이 패널: 교육공학 전문가 8인, 2라운드\n- 주요 질문 초안: ...`}
              rows={6} />
          </Field>
        ) : (
          <>
            <p className="mb-2 text-xs text-muted-foreground">
              아카이브 측정도구를 선택하면 문항수·신뢰도를 참고할 수 있습니다. 자체 개발 도구는 &lsquo;직접 추가&rsquo; 후 타당화 절차를 적어 주세요.
            </p>
            {!readOnly && (
              <MeasurementPicker
                measurements={measurements}
                onPick={(m) => addInstrument(m.id, m.name)}
                onAddCustom={() => addInstrument(undefined, "")}
              />
            )}
            <ul className="mt-3 space-y-2">
              {form.instruments.map((it) => {
                const m = it.measurementId ? measurements.find((x) => x.id === it.measurementId) : undefined;
                return (
                  <li key={it.id} className="rounded-lg border bg-card/60 p-2.5">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <Input value={it.name} disabled={readOnly || !!it.measurementId}
                          onChange={(e) => updateInstrument(it.id, { name: e.target.value })}
                          placeholder="도구 이름" className="h-8 text-sm" />
                        {m && (
                          <p className="text-[11px] text-muted-foreground">
                            {m.itemCount ? `${m.itemCount}문항` : ""}
                            {m.reliability ? ` · 신뢰도 ${m.reliability}` : ""}
                            {m.author ? ` · ${m.author}` : ""}
                          </p>
                        )}
                        <Textarea value={it.plan} disabled={readOnly}
                          onChange={(e) => updateInstrument(it.id, { plan: e.target.value })}
                          placeholder={it.measurementId ? "이 도구의 사용·채점 계획" : "자체 개발 계획 — 문항 구성·타당화 절차(내용타당도·요인분석 등)"}
                          rows={2} className="text-xs" />
                      </div>
                      {!readOnly && (
                        <button type="button" onClick={() => removeInstrument(it.id)}
                          className="mt-1 rounded-md p-1 text-muted-foreground hover:bg-rose-50 hover:text-rose-600">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Section>

      {/* 6. 프로그램 개발 설계 — 효과분석(개발) 연구 */}
      <Section
        n={6}
        title="프로그램 개발 설계"
        done={status.program}
        optional={!form.programDesign.enabled}
      >
        <label className="flex items-center gap-2 text-xs font-medium">
          <input type="checkbox" checked={form.programDesign.enabled} disabled={readOnly}
            onChange={(e) => setProgram("enabled", e.target.checked)}
            className="h-3.5 w-3.5 accent-primary" />
          이 연구는 처치 프로그램(수업·연수·콘텐츠) 개발·효과분석을 포함합니다
        </label>
        {form.programDesign.enabled && (
          <div className="mt-3 space-y-3">
            <Field label="처치 프로그램 개요">
              <Textarea value={form.programDesign.overview} disabled={readOnly}
                onChange={(e) => setProgram("overview", e.target.value)}
                placeholder="예: 생성형 AI 튜터를 활용한 논설문 쓰기 피드백 프로그램" rows={2} />
            </Field>
            <Field label="회기 구성">
              <Textarea value={form.programDesign.sessions} disabled={readOnly}
                onChange={(e) => setProgram("sessions", e.target.value)}
                placeholder="예: 주 1회 40분, 총 8회기 — 1~2회 도입, 3~6회 핵심 활동, 7~8회 정리·평가" rows={2} />
            </Field>
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">ADDIE 단계 점검</p>
              <div className="flex flex-wrap gap-1.5">
                {ADDIE_STEPS.map((s) => {
                  const on = form.programDesign.addieChecked.includes(s.id);
                  return (
                    <button key={s.id} type="button" disabled={readOnly}
                      onClick={() =>
                        setProgram(
                          "addieChecked",
                          on
                            ? form.programDesign.addieChecked.filter((x) => x !== s.id)
                            : [...form.programDesign.addieChecked, s.id],
                        )
                      }
                      className={cn(
                        "rounded-md border px-2 py-1 text-[11px] transition-colors",
                        on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                      )}>
                      {on && <CheckCircle2 size={10} className="mr-1 inline" />}
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <Link
              href="/steppingstone/program-development"
              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              프로그램 개발 가이드(인지 디딤판) 열기 <ExternalLink size={10} />
            </Link>
          </div>
        )}
      </Section>

      {/* 7. 자료 수집·분석 */}
      <Section n={7} title="자료 수집·분석" done={status.collectionAnalysis}>
        <Field label="자료 수집 절차">
          <Textarea value={form.dataCollection} disabled={readOnly}
            onChange={(e) => setField("dataCollection", e.target.value)}
            placeholder={isQual
              ? "예: 심층 면담(1인 60~90분)·참여관찰·문서 수집을 병행하고 전사한다."
              : "예: 사전-사후 검사를 동일 도구로 실시하고 온라인 설문을 2주간 배포·회수한다."}
            rows={3} />
        </Field>
        <Field label={isQual ? "자료 분석 — 코딩·주제분석·신뢰성 확보" : "자료 분석 — 가설별 통계방법"} className="mt-3">
          <Textarea value={form.dataAnalysis} disabled={readOnly}
            onChange={(e) => setField("dataAnalysis", e.target.value)}
            placeholder={isQual
              ? "예: 개방·축·선택 코딩으로 주제를 도출하고 삼각검증·구성원 확인(member check)으로 신뢰성을 확보한다."
              : "예: 가설1 — 사전점수 통제 ANCOVA / 가설2 — 위계적 회귀분석. SPSS 27 사용."}
            rows={4} />
        </Field>

        {/* 설계 조건 → 통계방법 추천 (양적·혼합, 집단 비교 연구) */}
        {showStatMethods && (
          <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
            <p className="text-xs font-semibold text-foreground">
              설계 조건으로 통계방법 추천받기
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              집단 비교(효과 검증) 연구라면 아래 조건을 고르세요. 사전검사·무선할당·동질성에 따라 사후검사 t-test/ANOVA·ANCOVA 등이 달라집니다.
            </p>
            <div className="mt-2.5">
              <DesignConditionForm
                value={form.designConditions}
                onChange={readOnly ? () => {} : setDesignConditions}
              />
            </div>

            {(statRecommend.recommended.length > 0 ||
              statRecommend.cautions.length > 0) && (
              <div className="mt-3 space-y-2">
                {statRecommend.recommended.map((r) => {
                  const on = form.selectedStatMethods.includes(r.name);
                  return (
                    <div
                      key={r.name}
                      className="rounded-lg border bg-card p-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground">
                            이 설계라면 · {r.name}
                          </p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                            {r.rationale}
                          </p>
                        </div>
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => toggleStatMethod(r.name)}
                            aria-pressed={on}
                            className={cn(
                              "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                              on
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                            )}
                          >
                            {on ? (
                              <>
                                <CheckCircle2 size={11} /> 선택됨
                              </>
                            ) : (
                              <>
                                <Plus size={11} /> 선택
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {statRecommend.cautions.length > 0 && (
                  <ul className="space-y-1 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
                    {statRecommend.cautions.map((c, i) => (
                      <li
                        key={i}
                        className="flex gap-1.5 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300"
                      >
                        <span aria-hidden>⚠</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {!readOnly && statRecommend.recommended.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={applyRecommendedStats}
                  >
                    <CheckCircle2 size={12} className="mr-1" /> 추천 반영
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 통계방법 선택 (양적·혼합) */}
        {showStatMethods && (
          <div className="mt-3">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <label className="block text-xs font-medium text-muted-foreground">
                통계 분석 방법 (여러 개 선택 가능 — 가설별로 다른 방법 가능)
              </label>
              {!readOnly && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setStatGuideOpen(true)}
                >
                  <Sigma size={12} className="mr-1" /> 가이드에서 통계방법 찾기
                </Button>
              )}
            </div>
            {statMethods.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {statMethods
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name, "ko"))
                  .map((m) => {
                    const on = form.selectedStatMethods.includes(m.name);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        disabled={readOnly}
                        onClick={() => toggleStatMethod(m.name)}
                        aria-pressed={on}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-60",
                          on
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card text-muted-foreground hover:border-primary/40",
                        )}
                      >
                        {on && <CheckCircle2 size={10} className="mr-1 inline" />}
                        {m.name}
                      </button>
                    );
                  })}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                공개된 통계방법 데이터가 아직 없습니다. 가이드 팝업에서 확인하세요.
              </p>
            )}

            {/* 선택된 통계방법 한 줄 설명 */}
            {form.selectedStatMethods.length > 0 && (
              <ul className="mt-2.5 space-y-1.5">
                {form.selectedStatMethods.map((name) => {
                  const m = statMethods.find((x) => x.name === name);
                  const desc = m?.accessibleSummary || m?.summary || "";
                  return (
                    <li
                      key={name}
                      className="flex items-start gap-2 rounded-lg border bg-muted/20 px-2.5 py-1.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium text-foreground">{name}</p>
                        {desc && (
                          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                            {desc}
                          </p>
                        )}
                      </div>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => toggleStatMethod(name)}
                          className="mt-0.5 rounded-md p-0.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
                          aria-label={`${name} 제거`}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        <Link
          href="/archive/statistical-methods"
          className="mt-2 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
        >
          통계방법 가이드 보기 <ExternalLink size={10} />
        </Link>
      </Section>

      {/* 8. 연구방법 초안 미리보기 */}
      <Section n={8} title="연구방법 초안 미리보기" done={progress >= 60}>
        <p className="mb-2 text-xs text-muted-foreground">
          위 작성 내용을 학위논문 &lsquo;III. 연구방법&rsquo; 아웃라인으로 자동 조립했습니다. 복사해 계획서·논문 작성 탭에서 이어 쓰세요.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={copyDraft}>
            <Copy size={12} className="mr-1" /> 초안 복사
          </Button>
          <Link
            href="/mypage/research?tab=proposal"
            className="inline-flex h-8 items-center gap-1 rounded-md border bg-card px-2.5 text-xs font-medium hover:bg-accent"
          >
            <ClipboardList size={12} /> 연구 계획서에서 이어 쓰기
          </Link>
          <Link
            href="/mypage/research?tab=writing"
            className="inline-flex h-8 items-center gap-1 rounded-md border bg-card px-2.5 text-xs font-medium hover:bg-accent"
          >
            <Sparkles size={12} /> 논문 작성에서 이어 쓰기
          </Link>
        </div>
        <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-[11px] leading-relaxed text-foreground">
          {draft}
        </pre>
      </Section>

      {!readOnly && (
        <EditorSaveBar
          dirty={dirty}
          saving={saving}
          savedAt={savedAt}
          onSave={() => void doSave(true)}
        />
      )}

      {!readOnly && (
        <>
          <MethodRecommenderDialog
            open={methodGuideOpen}
            onOpenChange={setMethodGuideOpen}
            methods={methods}
            onSelect={applyRecommendedMethod}
          />
          <StatMethodGuideDialog
            open={statGuideOpen}
            onOpenChange={setStatGuideOpen}
            methods={statMethods}
            selected={form.selectedStatMethods}
            onToggle={toggleStatMethod}
            designConditions={form.designConditions}
            onDesignConditionsChange={setDesignConditions}
          />
        </>
      )}
    </div>
  );
}

/** 측정도구 검색 picker */
function MeasurementPicker({
  measurements,
  onPick,
  onAddCustom,
}: {
  measurements: ArchiveMeasurementTool[];
  onPick: (m: ArchiveMeasurementTool) => void;
  onAddCustom: () => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return measurements.slice(0, 30);
    return measurements
      .filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          (m.originalName ?? "").toLowerCase().includes(query) ||
          (m.author ?? "").toLowerCase().includes(query),
      )
      .slice(0, 30);
  }, [measurements, q]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <button type="button" onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground">
          <Link2 size={12} /> 아카이브 측정도구 추가
        </button>
        {open && (
          <div className="absolute left-0 top-full z-10 mt-1 w-80 rounded-lg border bg-card p-2 shadow-lg">
            <div className="mb-2 flex items-center gap-1">
              <Input value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="측정도구 검색..." className="h-8 text-xs" autoFocus />
              <button type="button" onClick={() => setOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"><X size={14} /></button>
            </div>
            <div className="max-h-56 space-y-0.5 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="py-3 text-center text-xs text-muted-foreground">검색 결과 없음</p>
              ) : (
                filtered.map((m) => (
                  <button key={m.id} type="button"
                    onClick={() => { onPick(m); setOpen(false); setQ(""); }}
                    className="flex w-full flex-col items-start rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted">
                    <span className="font-medium">{m.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {[m.itemCount ? `${m.itemCount}문항` : "", m.reliability ?? "", m.author ?? ""].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={onAddCustom}>
        <Plus size={12} className="mr-1" /> 자체 개발 도구 직접 추가
      </Button>
    </div>
  );
}

function Section({
  n, title, done, optional, children,
}: {
  n: number;
  title: string;
  done: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section className="rounded-2xl border bg-card">
      <button type="button" onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-5 py-3.5 text-left">
        <span className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
            {n}
          </span>
          <span className="text-sm font-semibold">{title}</span>
          <span className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
            done
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : optional
                ? "bg-muted text-muted-foreground"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
          )}>
            {done ? "완성" : optional ? "선택" : "작성 전"}
          </span>
        </span>
        <ChevronRight size={16} className={cn("shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
      </button>
      {open && <div className="border-t px-5 py-4">{children}</div>}
    </section>
  );
}

function Field({
  label, children, className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
