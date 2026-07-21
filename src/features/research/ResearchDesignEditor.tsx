"use client";

/**
 * 연구 설계 에디터 (2026-07-13)
 *
 * 연구 여정 '연구 설계' 단계 — 연구 보고서와 연구 계획서 사이.
 * 교육공학 학위논문 연구방법(III장) 전형 구조를 역산한 8섹션 아코디언 폼.
 * approach(양적/질적/혼합) 선택에 따라 절차 프리필·도구·프로그램·분석 섹션이 분기한다.
 * 디바운스 자동 저장 + 섹션 완성도 칩 + 연구방법 초안 미리보기(복사).
 *
 * M1(2026-07-13): 8섹션을 design/*Section 서브컴포넌트로 추출, 다이얼로그 dynamic() lazy 로드,
 * 모바일(sm 미만) 아코디언 기본 접힘(현재 섹션만 펼침)으로 유지보수·TTI 개선. 동작·UI 불변.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { DraftingCompass, CheckCircle2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  researchMethodsApi,
  archiveMeasurementsApi,
  statisticalMethodsApi,
  alumniThesesApi,
} from "@/lib/bkend";
import { researchModelsApi } from "@/lib/research-models-api";
import { thesesForResearchMethod } from "@/lib/alumni-thesis-crosslink";
import type {
  User,
  ResearchMethod,
  ResearchMethodKind,
  ArchiveMeasurementTool,
  StatisticalMethod,
  AlumniThesis,
} from "@/types";
import {
  designSectionStatus,
  computeDesignProgress,
  type ResearchDesignApproach,
  type ResearchDesignInstrument,
  type ResearchDesignParticipants,
  type ResearchDesignProcedureStep,
  type ResearchDesignProgram,
  type DesignConditions,
} from "@/types/research-design";
import { buildResearchMethodDraft } from "@/lib/research-design-draft";
import { recommendStatMethods } from "@/lib/stat-method-recommender";
import {
  useResearchDesign,
  useEnsureResearchDesign,
  useUpdateResearchDesign,
} from "./useResearchDesign";
import { useResearchReport } from "./useResearchReport";
import {
  useResearchProposal,
  useEnsureResearchProposal,
  useUpdateResearchProposal,
} from "./useResearchProposal";
import { useLogWritingActivity } from "./useWritingPaperHistory";
import ResearchJourneyGuide from "./ResearchJourneyGuide";
import EditorSaveBar from "./EditorSaveBar";
import { Section, useIsMobile } from "./design/Section";
import { EMPTY_FORM, fromDesign, toDesign, nid, type FormState } from "./design/types";
import { ApproachSection } from "./design/ApproachSection";
import { ModelSection } from "./design/ModelSection";
import { ParticipantsSection } from "./design/ParticipantsSection";
import { ProcedureSection } from "./design/ProcedureSection";
import { InstrumentsSection } from "./design/InstrumentsSection";
import { ProgramSection } from "./design/ProgramSection";
import { CollectionAnalysisSection } from "./design/CollectionAnalysisSection";
import { DraftSection } from "./design/DraftSection";

// 다이얼로그는 열 때만 로드 (초기 번들 축소)
const MethodRecommenderDialog = dynamic(() => import("./MethodRecommenderDialog"), {
  ssr: false,
});
const StatMethodGuideDialog = dynamic(() => import("./StatMethodGuideDialog"), {
  ssr: false,
});

interface Props {
  user: User;
  readOnly?: boolean;
}

export default function ResearchDesignEditor({ user, readOnly = false }: Props) {
  const { design, isLoading } = useResearchDesign(user.id);
  const { report } = useResearchReport(readOnly ? undefined : user.id);
  const ensure = useEnsureResearchDesign();
  const update = useUpdateResearchDesign();
  const logActivity = useLogWritingActivity();
  // H1(2026-07-13): 설계 → 계획서 연구방법 실제 반영(import) 파이프라인
  const { proposal } = useResearchProposal(readOnly ? undefined : user.id);
  const ensureProposal = useEnsureResearchProposal();
  const updateProposal = useUpdateResearchProposal();

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
  const [applyingProposal, setApplyingProposal] = useState(false);
  const isMobile = useIsMobile();

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
  // v5-H4: 선배 논문 되먹임 — analysis 프로필의 연구방법 역집계용(1회 로드·캐시)
  const { data: alumniTheses = [] } = useQuery({
    queryKey: ["alumni_theses", "all"],
    queryFn: async () => (await alumniThesesApi.list()).data as AlumniThesis[],
    staleTime: 5 * 60_000,
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

  // 모바일 아코디언 기본 펼침 대상 = 첫 미완 섹션(없으면 1). 데스크톱은 전 섹션 전개.
  const activeSection = useMemo(() => {
    const done = [
      status.approach,
      status.model,
      status.participants,
      status.procedure,
      status.instruments,
      status.program,
      status.collectionAnalysis,
      progress >= 60,
    ];
    const idx = done.findIndex((d) => !d);
    return idx === -1 ? 1 : idx + 1;
  }, [status, progress]);
  const sectionDefaultOpen = (n: number) => !isMobile || n === activeSection;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- strictKind derived from form.approach already in deps; not a separate reactive value
  }, [methods, form.approach, showAllMethods]);

  const selectedMethod = useMemo(
    () => methods.find((m) => m.name === form.methodName) ?? null,
    [methods, form.methodName],
  );

  // v5-H4: 선택한 연구방법을 쓴 졸업생 선배 논문 역집계
  const methodTheses = useMemo(
    () => thesesForResearchMethod(alumniTheses, selectedMethod?.id),
    [alumniTheses, selectedMethod],
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

  // H1: 연구방법 초안을 계획서(research_proposals.method)에 실제 삽입.
  // 기존 method 가 있으면 이어붙이기 confirm — 자동 저장 흐름과 사용자 작성분 보존.
  async function applyToProposal() {
    if (readOnly) return;
    const text = draft.trim();
    if (!text) {
      toast.info("반영할 초안이 없습니다 — 설계를 먼저 작성하세요.");
      return;
    }
    setApplyingProposal(true);
    try {
      const target = proposal ?? (await ensureProposal.mutateAsync(user.id));
      const existing = (target.method ?? "").trim();
      let nextMethod = text;
      if (existing) {
        const ok = confirm(
          "연구계획서 '연구 방법'에 이미 작성된 내용이 있습니다.\n확인 = 기존 내용 아래에 설계 초안을 이어 붙이기 / 취소 = 중단",
        );
        if (!ok) {
          setApplyingProposal(false);
          return;
        }
        nextMethod = `${existing}\n\n${text}`;
      }
      await updateProposal.mutateAsync({
        id: target.id,
        data: { method: nextMethod, lastSavedAt: new Date().toISOString() },
      });
      toast.success("연구계획서 '연구 방법'에 설계 초안을 반영했습니다 — 계획서에서 다듬어 저장하세요.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "계획서 반영에 실패했습니다.");
    } finally {
      setApplyingProposal(false);
    }
  }

  // 편집 모드는 하이드레이션까지 대기 — 섹션 마운트 시점에 form(완성도)이 확정되어야
  // 모바일 아코디언의 '현재 섹션 펼침' 기본값이 정확해진다.
  if (isLoading || (!readOnly && (!design || !hydrated))) {
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
                  <CheckCircle2 size={12} className="text-success" />
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
      <Section n={1} title="연구 유형·접근" done={status.approach} defaultOpen={sectionDefaultOpen(1)}>
        <ApproachSection
          form={form}
          readOnly={readOnly}
          methodOptions={methodOptions}
          selectedMethod={selectedMethod}
          methodTheses={methodTheses}
          showAllMethods={showAllMethods}
          onShowAllMethodsChange={setShowAllMethods}
          onApproachChange={(a) => setField("approach", a)}
          onRationaleChange={(v) => setField("approachRationale", v)}
          onMethodChange={applyMethod}
          onOpenMethodGuide={() => setMethodGuideOpen(true)}
        />
      </Section>

      {/* 2. 연구 모형 */}
      <Section n={2} title="연구 모형" done={status.model} defaultOpen={sectionDefaultOpen(2)}>
        <ModelSection
          form={form}
          readOnly={readOnly}
          model={model}
          onLinkModel={() => setField("modelId", user.id)}
        />
      </Section>

      {/* 3. 연구 대상 */}
      <Section n={3} title="연구 대상" done={status.participants} defaultOpen={sectionDefaultOpen(3)}>
        <ParticipantsSection
          form={form}
          readOnly={readOnly}
          onParticipantChange={setParticipant}
          onEthicsChange={(next) => setField("ethicsChecked", next)}
        />
      </Section>

      {/* 4. 연구 절차 */}
      <Section n={4} title="연구 절차" done={status.procedure} defaultOpen={sectionDefaultOpen(4)}>
        <ProcedureSection
          form={form}
          readOnly={readOnly}
          onRefill={refillProcedures}
          onUpdateStep={updateStep}
          onAddStep={addStep}
          onRemoveStep={removeStep}
        />
      </Section>

      {/* 5. 연구 도구 */}
      <Section n={5} title="연구 도구" done={status.instruments} defaultOpen={sectionDefaultOpen(5)}>
        <InstrumentsSection
          form={form}
          readOnly={readOnly}
          isQual={isQual}
          measurements={measurements}
          onQualChange={(v) => setField("qualInstruments", v)}
          onAddInstrument={addInstrument}
          onUpdateInstrument={updateInstrument}
          onRemoveInstrument={removeInstrument}
        />
      </Section>

      {/* 6. 프로그램 설계·개발 — 효과분석(개발) 연구 */}
      <Section
        n={6}
        title="프로그램 설계·개발"
        done={status.program}
        optional={!form.programDesign.enabled}
        defaultOpen={sectionDefaultOpen(6)}
      >
        <ProgramSection form={form} readOnly={readOnly} onProgramChange={setProgram} />
      </Section>

      {/* 7. 자료 수집·분석 */}
      <Section n={7} title="자료 수집·분석" done={status.collectionAnalysis} defaultOpen={sectionDefaultOpen(7)}>
        <CollectionAnalysisSection
          form={form}
          readOnly={readOnly}
          isQual={isQual}
          showStatMethods={showStatMethods}
          statMethods={statMethods}
          statRecommend={statRecommend}
          onDataCollectionChange={(v) => setField("dataCollection", v)}
          onDataAnalysisChange={(v) => setField("dataAnalysis", v)}
          onDesignConditionsChange={setDesignConditions}
          onToggleStatMethod={toggleStatMethod}
          onApplyRecommendedStats={applyRecommendedStats}
          onOpenStatGuide={() => setStatGuideOpen(true)}
        />
      </Section>

      {/* 8. 연구방법 초안 미리보기 */}
      <Section n={8} title="연구방법 초안 미리보기" done={progress >= 60} defaultOpen={sectionDefaultOpen(8)}>
        <DraftSection
          draft={draft}
          readOnly={readOnly}
          applyingProposal={applyingProposal}
          onApplyToProposal={applyToProposal}
          onCopyDraft={copyDraft}
        />
      </Section>

      {!readOnly && (
        <EditorSaveBar
          dirty={dirty}
          saving={saving}
          savedAt={savedAt}
          onSave={() => void doSave(true)}
        />
      )}

      {!readOnly && methodGuideOpen && (
        <MethodRecommenderDialog
          open={methodGuideOpen}
          onOpenChange={setMethodGuideOpen}
          methods={methods}
          onSelect={applyRecommendedMethod}
        />
      )}
      {!readOnly && statGuideOpen && (
        <StatMethodGuideDialog
          open={statGuideOpen}
          onOpenChange={setStatGuideOpen}
          methods={statMethods}
          selected={form.selectedStatMethods}
          onToggle={toggleStatMethod}
          designConditions={form.designConditions}
          onDesignConditionsChange={setDesignConditions}
        />
      )}
    </div>
  );
}
