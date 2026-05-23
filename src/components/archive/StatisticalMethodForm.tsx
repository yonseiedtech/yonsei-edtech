"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  statisticalMethodsApi,
  researchMethodsApi,
  alumniThesesApi,
} from "@/lib/bkend";
import {
  STATISTICAL_METHOD_CATEGORY_LABELS,
  RESEARCH_METHOD_KIND_LABELS,
  type StatisticalMethod,
  type StatisticalMethodCategory,
  type StatisticalAssumption,
  type StatisticalProcedureStep,
  type StatisticalReference,
  type StatisticalMethodAlternative,
  type ComparisonProfile,
  type ResearchMethod,
  type AlumniThesis,
} from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  initial: StatisticalMethod | null;
  userId: string;
}

const CATEGORY_OPTIONS: StatisticalMethodCategory[] = [
  "anova_family",
  "regression",
  "factor",
  "sem",
  "nonparametric",
  "mediation_moderation",
  "multilevel",
  "other",
];

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function lineParse(s: string): string[] | undefined {
  const arr = s
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean);
  return arr.length > 0 ? arr : undefined;
}

export default function StatisticalMethodForm({ initial, userId }: Props) {
  const router = useRouter();
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState<StatisticalMethodCategory>(
    initial?.category ?? "anova_family",
  );
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [whenToUse, setWhenToUse] = useState(initial?.whenToUse ?? "");
  const [spssCommand, setSpssCommand] = useState(initial?.spssCommand ?? "");
  const [amosCommand, setAmosCommand] = useState(initial?.amosCommand ?? "");
  const [rCommand, setRCommand] = useState(initial?.rCommand ?? "");
  const [interpretationKeys, setInterpretationKeys] = useState(
    (initial?.interpretationKeys ?? []).join("\n"),
  );
  const [procedure, setProcedure] = useState<StatisticalProcedureStep[]>(
    initial?.procedure ?? [],
  );
  const [assumptions, setAssumptions] = useState<StatisticalAssumption[]>(
    initial?.assumptions ?? [],
  );
  const [references, setReferences] = useState<StatisticalReference[]>(
    initial?.references ?? [],
  );
  const [comparisonProfile, setComparisonProfile] = useState<ComparisonProfile>(
    initial?.comparisonProfile ?? {},
  );
  const [keyAssumptionsText, setKeyAssumptionsText] = useState(
    (initial?.comparisonProfile?.keyAssumptions ?? []).join("\n"),
  );
  const [alternativeMethods, setAlternativeMethods] = useState<StatisticalMethodAlternative[]>(
    initial?.alternativeMethods ?? [],
  );
  const [relatedResearchMethodIds, setRelatedResearchMethodIds] = useState<string[]>(
    initial?.relatedResearchMethodIds ?? [],
  );
  const [alumniThesisIds, setAlumniThesisIds] = useState<string[]>(
    initial?.alumniThesisIds ?? [],
  );
  const [published, setPublished] = useState<boolean>(initial?.published ?? false);

  // 픽커용 데이터 로드
  const [allStatisticals, setAllStatisticals] = useState<StatisticalMethod[]>([]);
  const [researchMethods, setResearchMethods] = useState<ResearchMethod[]>([]);
  const [theses, setTheses] = useState<AlumniThesis[]>([]);
  const [thesisQuery, setThesisQuery] = useState("");
  const [researchQuery, setResearchQuery] = useState("");
  const [altQuery, setAltQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [s, r, t] = await Promise.all([
          statisticalMethodsApi.list(),
          researchMethodsApi.list(),
          alumniThesesApi.list(),
        ]);
        if (cancelled) return;
        setAllStatisticals(s.data);
        setResearchMethods(r.data);
        setTheses(t.data);
      } catch (err) {
        console.error("[StatisticalMethodForm] picker data load failed", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedThesisSet = useMemo(
    () => new Set(alumniThesisIds),
    [alumniThesisIds],
  );
  const selectedResearchSet = useMemo(
    () => new Set(relatedResearchMethodIds),
    [relatedResearchMethodIds],
  );
  const selectedAlternativeSet = useMemo(
    () => new Set(alternativeMethods.map((a) => a.methodId)),
    [alternativeMethods],
  );

  const filteredTheses = useMemo(() => {
    const q = thesisQuery.trim().toLowerCase();
    if (!q) return theses.slice(0, 30);
    return theses
      .filter((t) => {
        const hay = [t.title, t.authorName, t.advisorName, ...(t.keywords ?? [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 30);
  }, [theses, thesisQuery]);

  const filteredResearchMethods = useMemo(() => {
    const q = researchQuery.trim().toLowerCase();
    if (!q) return researchMethods.slice(0, 50);
    return researchMethods
      .filter((m) => {
        const hay = [m.name, m.summary].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 50);
  }, [researchMethods, researchQuery]);

  const filteredAltCandidates = useMemo(() => {
    // 자기 자신 제외
    const candidates = allStatisticals.filter((s) => s.id !== initial?.id);
    const q = altQuery.trim().toLowerCase();
    if (!q) return candidates.slice(0, 50);
    return candidates
      .filter((s) => {
        const hay = [s.name, s.summary].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 50);
  }, [allStatisticals, altQuery, initial?.id]);

  function toggleThesis(id: string) {
    setAlumniThesisIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }
  function toggleResearch(id: string) {
    setRelatedResearchMethodIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }
  function toggleAlternative(methodId: string) {
    setAlternativeMethods((prev) => {
      if (prev.some((a) => a.methodId === methodId)) {
        return prev.filter((a) => a.methodId !== methodId);
      }
      return [...prev, { methodId, reason: "" }];
    });
  }
  function updateAlternativeReason(methodId: string, reason: string) {
    setAlternativeMethods((prev) =>
      prev.map((a) => (a.methodId === methodId ? { ...a, reason } : a)),
    );
  }

  function addProcedure() {
    setProcedure((prev) => [...prev, { id: newId(), step: "", detail: "" }]);
  }
  function updateProcedure(id: string, patch: Partial<StatisticalProcedureStep>) {
    setProcedure((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }
  function moveProcedure(id: string, dir: -1 | 1) {
    setProcedure((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx === -1) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const out = prev.slice();
      const [picked] = out.splice(idx, 1);
      out.splice(next, 0, picked);
      return out;
    });
  }
  function removeProcedure(id: string) {
    setProcedure((prev) => prev.filter((p) => p.id !== id));
  }

  function addAssumption() {
    setAssumptions((prev) => [
      ...prev,
      { id: newId(), name: "", description: "" },
    ]);
  }
  function updateAssumption(id: string, patch: Partial<StatisticalAssumption>) {
    setAssumptions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    );
  }
  function removeAssumption(id: string) {
    setAssumptions((prev) => prev.filter((a) => a.id !== id));
  }

  function addReference() {
    setReferences((prev) => [...prev, { id: newId(), title: "" }]);
  }
  function updateReference(id: string, patch: Partial<StatisticalReference>) {
    setReferences((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function removeReference(id: string) {
    setReferences((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("이름은 필수입니다");
      return;
    }
    if (!summary.trim()) {
      toast.error("요약(summary) 은 필수입니다");
      return;
    }
    setSaving(true);
    try {
      const cleanProcedure = procedure
        .filter((p) => p.step.trim())
        .map((p) => ({
          id: p.id,
          step: p.step.trim(),
          detail: p.detail?.trim() || undefined,
        }));
      const cleanAssumptions = assumptions
        .filter((a) => a.name.trim())
        .map((a) => ({
          id: a.id,
          name: a.name.trim(),
          description: a.description.trim(),
          howToCheck: a.howToCheck?.trim() || undefined,
          spssCommand: a.spssCommand?.trim() || undefined,
          rCommand: a.rCommand?.trim() || undefined,
          threshold: a.threshold?.trim() || undefined,
        }));
      const cleanReferences = references
        .filter((r) => r.title.trim())
        .map((r) => ({
          id: r.id,
          title: r.title.trim(),
          author: r.author?.trim() || undefined,
          year: r.year || undefined,
          url: r.url?.trim() || undefined,
        }));
      const cleanAlternatives = alternativeMethods
        .filter((a) => a.methodId)
        .map((a) => ({ methodId: a.methodId, reason: a.reason.trim() }));

      const keyAssumptionsArr = lineParse(keyAssumptionsText);
      const cleanComparisonProfile: ComparisonProfile = {
        focus: comparisonProfile.focus?.trim() || undefined,
        dependentVariable: comparisonProfile.dependentVariable?.trim() || undefined,
        independentVariable: comparisonProfile.independentVariable?.trim() || undefined,
        minSampleSize: comparisonProfile.minSampleSize?.trim() || undefined,
        keyAssumptions: keyAssumptionsArr,
        strengthOneliner: comparisonProfile.strengthOneliner?.trim() || undefined,
        limitationOneliner: comparisonProfile.limitationOneliner?.trim() || undefined,
      };
      const hasComparison = Object.values(cleanComparisonProfile).some(
        (v) => v !== undefined && (Array.isArray(v) ? v.length > 0 : true),
      );

      const payload = {
        name: name.trim(),
        category,
        summary: summary.trim(),
        description: description.trim() || undefined,
        whenToUse: whenToUse.trim() || undefined,
        spssCommand: spssCommand.trim() || undefined,
        amosCommand: amosCommand.trim() || undefined,
        rCommand: rCommand.trim() || undefined,
        interpretationKeys: lineParse(interpretationKeys),
        procedure: cleanProcedure.length > 0 ? cleanProcedure : undefined,
        assumptions: cleanAssumptions.length > 0 ? cleanAssumptions : undefined,
        references: cleanReferences.length > 0 ? cleanReferences : undefined,
        comparisonProfile: hasComparison ? cleanComparisonProfile : undefined,
        alternativeMethods: cleanAlternatives.length > 0 ? cleanAlternatives : undefined,
        relatedResearchMethodIds:
          relatedResearchMethodIds.length > 0 ? relatedResearchMethodIds : undefined,
        alumniThesisIds: alumniThesisIds.length > 0 ? alumniThesisIds : undefined,
        published,
        curatedBy: userId,
      };

      if (isEdit && initial) {
        await statisticalMethodsApi.update(initial.id, payload);
      } else {
        await statisticalMethodsApi.create({
          ...payload,
          createdBy: userId,
        });
      }

      toast.success("저장 완료");
      router.push(`/console/archive/statistical-methods`);
    } catch (err) {
      console.error("[StatisticalMethodForm] save failed", err);
      toast.error(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/console/archive/statistical-methods">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            통계방법 목록
          </Button>
        </Link>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
          저장
        </Button>
      </div>

      <h1 className="text-2xl font-bold">
        {isEdit ? "통계방법 편집" : "새 통계방법"}
      </h1>

      <Card>
        <CardContent className="space-y-4 py-5">
          <Field label="이름 *">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: ANCOVA (공분산분석)" />
          </Field>
          <Field label="카테고리 *">
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  aria-pressed={category === c}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm transition-colors",
                    category === c
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted",
                  )}
                >
                  {STATISTICAL_METHOD_CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          </Field>
          <Field label="한 줄 요약 *">
            <Textarea
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="객관적인 짧은 정의 1~2문장"
            />
          </Field>
          <Field label="상세 설명">
            <Textarea
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="긴 본문 (마크다운/일반 텍스트)"
            />
          </Field>
          <Field label="언제 사용하는가 (whenToUse)">
            <Textarea
              rows={3}
              value={whenToUse}
              onChange={(e) => setWhenToUse(e.target.value)}
              placeholder="예: 공변량을 통제한 상태에서 집단 간 평균 차이를 검정하고 싶을 때"
            />
          </Field>
        </CardContent>
      </Card>

      {/* 절차 */}
      <Card>
        <CardContent className="space-y-3 py-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">분석 절차</h2>
            <Button type="button" variant="outline" size="sm" onClick={addProcedure}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              단계 추가
            </Button>
          </div>
          {procedure.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              아직 단계가 없습니다. &quot;단계 추가&quot;를 눌러 절차를 입력하세요.
            </p>
          ) : (
            <div className="space-y-2">
              {procedure.map((p, i) => (
                <div key={p.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      단계 {i + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveProcedure(p.id, -1)}
                        disabled={i === 0}
                        className="rounded border px-2 py-0.5 text-xs disabled:opacity-40"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveProcedure(p.id, 1)}
                        disabled={i === procedure.length - 1}
                        className="rounded border px-2 py-0.5 text-xs disabled:opacity-40"
                      >
                        ↓
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProcedure(p.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <Input
                    className="mt-2"
                    value={p.step}
                    onChange={(e) => updateProcedure(p.id, { step: e.target.value })}
                    placeholder="단계 제목"
                  />
                  <Textarea
                    className="mt-2"
                    rows={2}
                    value={p.detail ?? ""}
                    onChange={(e) => updateProcedure(p.id, { detail: e.target.value })}
                    placeholder="상세 설명 (선택)"
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 기본 가정 */}
      <Card>
        <CardContent className="space-y-3 py-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">사용 전 기본 가정</h2>
            <Button type="button" variant="outline" size="sm" onClick={addAssumption}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              가정 추가
            </Button>
          </div>
          {assumptions.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              가정 항목이 없습니다. 정규성·등분산성·구형성 등 검정 가정을 입력하세요.
            </p>
          ) : (
            <div className="space-y-2">
              {assumptions.map((a) => (
                <div key={a.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAssumption(a.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Field label="가정 이름">
                      <Input
                        value={a.name}
                        onChange={(e) => updateAssumption(a.id, { name: e.target.value })}
                        placeholder="예: 정규성"
                      />
                    </Field>
                    <Field label="검정 방법">
                      <Input
                        value={a.howToCheck ?? ""}
                        onChange={(e) => updateAssumption(a.id, { howToCheck: e.target.value })}
                        placeholder="예: Shapiro-Wilk"
                      />
                    </Field>
                    <Field label="SPSS 구문">
                      <Input
                        value={a.spssCommand ?? ""}
                        onChange={(e) => updateAssumption(a.id, { spssCommand: e.target.value })}
                        placeholder="예: EXAMINE VARIABLES=..."
                      />
                    </Field>
                    <Field label="R 구문">
                      <Input
                        value={a.rCommand ?? ""}
                        onChange={(e) => updateAssumption(a.id, { rCommand: e.target.value })}
                        placeholder="예: shapiro.test(x)"
                      />
                    </Field>
                    <Field label="판정 기준">
                      <Input
                        value={a.threshold ?? ""}
                        onChange={(e) => updateAssumption(a.id, { threshold: e.target.value })}
                        placeholder="예: p > .05"
                      />
                    </Field>
                  </div>
                  <Field label="설명">
                    <Textarea
                      rows={2}
                      value={a.description}
                      onChange={(e) => updateAssumption(a.id, { description: e.target.value })}
                    />
                  </Field>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 도구 구문 + 해석 포인트 */}
      <Card>
        <CardContent className="space-y-3 py-5">
          <h2 className="text-sm font-semibold">도구 구문 · 결과 해석</h2>
          <Field label="SPSS 구문">
            <Textarea
              rows={3}
              value={spssCommand}
              onChange={(e) => setSpssCommand(e.target.value)}
              placeholder="UNIANOVA Y BY GROUP WITH COVARIATE..."
            />
          </Field>
          <Field label="AMOS 구문">
            <Textarea
              rows={3}
              value={amosCommand}
              onChange={(e) => setAmosCommand(e.target.value)}
              placeholder="AMOS path 명세 (선택)"
            />
          </Field>
          <Field label="R 구문">
            <Textarea
              rows={3}
              value={rCommand}
              onChange={(e) => setRCommand(e.target.value)}
              placeholder="aov(y ~ group + covariate, data=...)"
            />
          </Field>
          <Field label="해석 핵심 포인트 (줄바꿈으로 구분)">
            <Textarea
              rows={4}
              value={interpretationKeys}
              onChange={(e) => setInterpretationKeys(e.target.value)}
              placeholder="예: F값·p값 확인&#10;효과크기 (η²) 보고&#10;사후검정 결과 해석"
            />
          </Field>
        </CardContent>
      </Card>

      {/* 비교 프로파일 */}
      <Card>
        <CardContent className="space-y-3 py-5">
          <h2 className="text-sm font-semibold">비교 프로파일</h2>
          <p className="text-[11px] text-muted-foreground">
            상세 페이지의 &quot;대안 통계방법 비교표&quot;에서 행으로 사용됩니다.
          </p>
          <Field label="분석 초점 (focus)">
            <Input
              value={comparisonProfile.focus ?? ""}
              onChange={(e) =>
                setComparisonProfile({ ...comparisonProfile, focus: e.target.value })
              }
              placeholder="예: 공변량 통제 후 집단 평균 차이"
            />
          </Field>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Field label="종속변수">
              <Input
                value={comparisonProfile.dependentVariable ?? ""}
                onChange={(e) =>
                  setComparisonProfile({
                    ...comparisonProfile,
                    dependentVariable: e.target.value,
                  })
                }
                placeholder="예: 연속형 1개"
              />
            </Field>
            <Field label="독립변수">
              <Input
                value={comparisonProfile.independentVariable ?? ""}
                onChange={(e) =>
                  setComparisonProfile({
                    ...comparisonProfile,
                    independentVariable: e.target.value,
                  })
                }
                placeholder="예: 범주형 1~K개"
              />
            </Field>
          </div>
          <Field label="최소 표본 크기">
            <Input
              value={comparisonProfile.minSampleSize ?? ""}
              onChange={(e) =>
                setComparisonProfile({
                  ...comparisonProfile,
                  minSampleSize: e.target.value,
                })
              }
              placeholder="예: 셀당 20명 이상 권장"
            />
          </Field>
          <Field label="핵심 가정 (줄바꿈으로 구분)">
            <Textarea
              rows={3}
              value={keyAssumptionsText}
              onChange={(e) => setKeyAssumptionsText(e.target.value)}
              placeholder="예: 정규성&#10;등분산성&#10;공변량과 종속변수 선형성"
            />
          </Field>
          <Field label="강점 (한 줄)">
            <Input
              value={comparisonProfile.strengthOneliner ?? ""}
              onChange={(e) =>
                setComparisonProfile({
                  ...comparisonProfile,
                  strengthOneliner: e.target.value,
                })
              }
            />
          </Field>
          <Field label="한계 (한 줄)">
            <Input
              value={comparisonProfile.limitationOneliner ?? ""}
              onChange={(e) =>
                setComparisonProfile({
                  ...comparisonProfile,
                  limitationOneliner: e.target.value,
                })
              }
            />
          </Field>
        </CardContent>
      </Card>

      {/* 대안 통계방법 */}
      <Card>
        <CardContent className="space-y-3 py-5">
          <h2 className="text-sm font-semibold">대안 통계방법 (동일 데이터)</h2>
          <p className="text-[11px] text-muted-foreground">
            동일 데이터로 시도해볼 수 있는 다른 통계방법을 선택하고 추천 사유를 입력하세요. 상세 페이지에서 비교표로 함께 노출됩니다.
          </p>

          {alternativeMethods.length > 0 && (
            <div className="rounded-md border bg-muted/30 p-2 space-y-2">
              <p className="text-[11px] font-medium text-muted-foreground">
                선택됨 ({alternativeMethods.length})
              </p>
              {alternativeMethods.map((a) => {
                const m = allStatisticals.find((x) => x.id === a.methodId);
                return (
                  <div key={a.methodId} className="rounded-md border bg-background p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium">
                        {m ? m.name : a.methodId.slice(0, 8) + "…"}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleAlternative(a.methodId)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Input
                      className="mt-1 text-xs"
                      placeholder="추천 사유 (예: 공변량을 통제하고 싶을 때)"
                      value={a.reason}
                      onChange={(e) => updateAlternativeReason(a.methodId, e.target.value)}
                    />
                  </div>
                );
              })}
            </div>
          )}

          <Input
            placeholder="이름·요약으로 검색"
            value={altQuery}
            onChange={(e) => setAltQuery(e.target.value)}
          />
          <div className="max-h-64 overflow-y-auto rounded-md border">
            {loading ? (
              <p className="px-3 py-4 text-xs text-muted-foreground">불러오는 중...</p>
            ) : filteredAltCandidates.length === 0 ? (
              <p className="px-3 py-4 text-xs text-muted-foreground">
                {altQuery ? "검색 결과 없음" : "선택할 통계방법이 없습니다."}
              </p>
            ) : (
              <ul className="divide-y">
                {filteredAltCandidates.map((s) => {
                  const active = selectedAlternativeSet.has(s.id);
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => toggleAlternative(s.id)}
                        className={cn(
                          "flex w-full items-start gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-muted/50",
                          active && "bg-primary/5",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]",
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted-foreground/40",
                          )}
                          aria-hidden
                        >
                          {active ? "✓" : ""}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium leading-snug">{s.name}</span>
                          <span className="block text-muted-foreground">
                            {STATISTICAL_METHOD_CATEGORY_LABELS[s.category]}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 관련 연구방법 */}
      <Card>
        <CardContent className="space-y-3 py-5">
          <h2 className="text-sm font-semibold">관련 연구방법 (양방향 연계)</h2>
          <p className="text-[11px] text-muted-foreground">
            이 통계방법이 자주 사용되는 연구방법을 선택하세요.
          </p>

          {relatedResearchMethodIds.length > 0 && (
            <div className="rounded-md border bg-muted/30 p-2">
              <p className="mb-1 text-[11px] font-medium text-muted-foreground">
                선택됨 ({relatedResearchMethodIds.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {relatedResearchMethodIds.map((id) => {
                  const r = researchMethods.find((x) => x.id === id);
                  return (
                    <Badge
                      key={id}
                      variant="outline"
                      className="cursor-pointer text-[10px] hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => toggleResearch(id)}
                    >
                      {r ? r.name : id.slice(0, 6) + "…"} ×
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          <Input
            placeholder="이름·요약으로 검색"
            value={researchQuery}
            onChange={(e) => setResearchQuery(e.target.value)}
          />
          <div className="max-h-56 overflow-y-auto rounded-md border">
            {loading ? (
              <p className="px-3 py-4 text-xs text-muted-foreground">불러오는 중...</p>
            ) : filteredResearchMethods.length === 0 ? (
              <p className="px-3 py-4 text-xs text-muted-foreground">
                {researchQuery ? "검색 결과 없음" : "연구방법이 없습니다."}
              </p>
            ) : (
              <ul className="divide-y">
                {filteredResearchMethods.map((r) => {
                  const active = selectedResearchSet.has(r.id);
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => toggleResearch(r.id)}
                        className={cn(
                          "flex w-full items-start gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-muted/50",
                          active && "bg-primary/5",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]",
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted-foreground/40",
                          )}
                          aria-hidden
                        >
                          {active ? "✓" : ""}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium leading-snug">{r.name}</span>
                          <span className="block text-muted-foreground">
                            {RESEARCH_METHOD_KIND_LABELS[r.kind]}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 참고 자료 */}
      <Card>
        <CardContent className="space-y-3 py-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">참고 자료</h2>
            <Button type="button" variant="outline" size="sm" onClick={addReference}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              참고 추가
            </Button>
          </div>
          {references.length === 0 ? (
            <p className="text-xs text-muted-foreground">참고 자료가 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {references.map((r) => (
                <div key={r.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeReference(r.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Field label="제목">
                      <Input
                        value={r.title}
                        onChange={(e) => updateReference(r.id, { title: e.target.value })}
                      />
                    </Field>
                    <Field label="저자">
                      <Input
                        value={r.author ?? ""}
                        onChange={(e) => updateReference(r.id, { author: e.target.value })}
                      />
                    </Field>
                    <Field label="연도">
                      <Input
                        type="number"
                        value={r.year ?? ""}
                        onChange={(e) =>
                          updateReference(r.id, {
                            year: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                      />
                    </Field>
                    <Field label="URL">
                      <Input
                        value={r.url ?? ""}
                        onChange={(e) => updateReference(r.id, { url: e.target.value })}
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 졸업생 학위논문 매핑 */}
      <Card>
        <CardContent className="space-y-3 py-5">
          <h2 className="text-sm font-semibold">관련 졸업생 학위논문 (큐레이트)</h2>
          <p className="text-[11px] text-muted-foreground">
            이 통계방법을 사용한 학회 졸업생 논문을 선택하세요.
          </p>

          {alumniThesisIds.length > 0 && (
            <div className="rounded-md border bg-muted/30 p-2">
              <p className="mb-1 text-[11px] font-medium text-muted-foreground">
                선택됨 ({alumniThesisIds.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {alumniThesisIds.map((id) => {
                  const t = theses.find((x) => x.id === id);
                  return (
                    <Badge
                      key={id}
                      variant="outline"
                      className="cursor-pointer text-[10px] hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => toggleThesis(id)}
                    >
                      {t ? t.title : id.slice(0, 6) + "…"} ×
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          <Input
            placeholder="제목·저자·지도교수·키워드로 검색"
            value={thesisQuery}
            onChange={(e) => setThesisQuery(e.target.value)}
          />
          <div className="max-h-72 overflow-y-auto rounded-md border">
            {loading ? (
              <p className="px-3 py-4 text-xs text-muted-foreground">불러오는 중...</p>
            ) : filteredTheses.length === 0 ? (
              <p className="px-3 py-4 text-xs text-muted-foreground">
                {thesisQuery ? "검색 결과 없음" : "졸업생 논문이 없습니다."}
              </p>
            ) : (
              <ul className="divide-y">
                {filteredTheses.map((t) => {
                  const active = selectedThesisSet.has(t.id);
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => toggleThesis(t.id)}
                        className={cn(
                          "flex w-full items-start gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-muted/50",
                          active && "bg-primary/5",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]",
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted-foreground/40",
                          )}
                          aria-hidden
                        >
                          {active ? "✓" : ""}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium leading-snug">{t.title}</span>
                          <span className="block text-muted-foreground">
                            {t.authorName}
                            {t.awardedYearMonth && ` · ${t.awardedYearMonth.slice(0, 4)}`}
                            {t.advisorName && ` · 지도 ${t.advisorName}`}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 공개 토글 */}
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm font-medium">공개 (published)</p>
            <p className="text-xs text-muted-foreground">
              비공개(draft) 상태에서는 회원에게 노출되지 않습니다.
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm">{published ? "공개" : "비공개 (draft)"}</span>
          </label>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
          저장
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
