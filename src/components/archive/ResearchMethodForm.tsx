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
import { researchMethodsApi, alumniThesesApi, statisticalMethodsApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  RESEARCH_METHOD_KIND_LABELS,
  RESEARCH_METHOD_TOOL_LABELS,
  STATISTICAL_METHOD_CATEGORY_LABELS,
  type ResearchMethod,
  type ResearchMethodKind,
  type ResearchMethodAssumption,
  type ResearchMethodProcedureStep,
  type ResearchMethodReference,
  type ResearchMethodToolGuide,
  type AlumniThesis,
  type StatisticalMethod,
} from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  initial: ResearchMethod | null;
  userId: string;
}

const KIND_OPTIONS: ResearchMethodKind[] = ["quantitative", "qualitative", "mixed"];
const TOOL_OPTIONS: ResearchMethodToolGuide[] = ["spss", "amos", "r"];

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

export default function ResearchMethodForm({ initial, userId }: Props) {
  const router = useRouter();
  const isEdit = !!initial;
  const { user: authUser } = useAuthStore();

  const [name, setName] = useState(initial?.name ?? "");
  // 순화어 — 노션 용어사전집 병기. 운영진 자유 수정 가능.
  const [purifiedName, setPurifiedName] = useState(initial?.purifiedName ?? "");
  const [kind, setKind] = useState<ResearchMethodKind>(initial?.kind ?? "quantitative");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [accessibleSummary, setAccessibleSummary] = useState(initial?.accessibleSummary ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [educationalTechExamples, setEducationalTechExamples] = useState(
    (initial?.educationalTechExamples ?? []).join("\n"),
  );
  const [strengths, setStrengths] = useState((initial?.strengths ?? []).join("\n"));
  const [limitations, setLimitations] = useState((initial?.limitations ?? []).join("\n"));
  const [procedures, setProcedures] = useState<ResearchMethodProcedureStep[]>(
    initial?.procedures ?? [],
  );
  const [assumptions, setAssumptions] = useState<ResearchMethodAssumption[]>(
    initial?.assumptions ?? [],
  );
  const [references, setReferences] = useState<ResearchMethodReference[]>(
    initial?.references ?? [],
  );
  const [relatedToolGuides, setRelatedToolGuides] = useState<ResearchMethodToolGuide[]>(
    initial?.relatedToolGuides ?? [],
  );
  const [alumniThesisIds, setAlumniThesisIds] = useState<string[]>(
    initial?.alumniThesisIds ?? [],
  );
  const [statisticalMethodIds, setStatisticalMethodIds] = useState<string[]>(
    initial?.statisticalMethodIds ?? [],
  );
  const [published, setPublished] = useState<boolean>(initial?.published ?? false);

  // 졸업생 학위논문 picker
  const [theses, setTheses] = useState<AlumniThesis[]>([]);
  const [thesisQuery, setThesisQuery] = useState("");
  const [loadingTheses, setLoadingTheses] = useState(false);

  // 통계방법 picker
  const [statisticalMethods, setStatisticalMethods] = useState<StatisticalMethod[]>([]);
  const [statQuery, setStatQuery] = useState("");
  const [loadingStat, setLoadingStat] = useState(false);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingTheses(true);
    setLoadingStat(true);
    (async () => {
      try {
        const [tRes, sRes] = await Promise.all([
          alumniThesesApi.list(),
          statisticalMethodsApi.list(),
        ]);
        if (cancelled) return;
        setTheses(tRes.data);
        setStatisticalMethods(sRes.data);
      } catch (err) {
        console.error("[ResearchMethodForm] picker data load failed", err);
      } finally {
        if (!cancelled) {
          setLoadingTheses(false);
          setLoadingStat(false);
        }
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

  const selectedStatSet = useMemo(
    () => new Set(statisticalMethodIds),
    [statisticalMethodIds],
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

  const filteredStat = useMemo(() => {
    const q = statQuery.trim().toLowerCase();
    if (!q) return statisticalMethods.slice(0, 50);
    return statisticalMethods
      .filter((s) => {
        const hay = [s.name, s.summary].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 50);
  }, [statisticalMethods, statQuery]);

  function toggleThesis(id: string) {
    setAlumniThesisIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleStat(id: string) {
    setStatisticalMethodIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleTool(t: ResearchMethodToolGuide) {
    setRelatedToolGuides((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  }

  function addProcedure() {
    setProcedures((prev) => [...prev, { id: newId(), step: "", detail: "" }]);
  }
  function updateProcedure(id: string, patch: Partial<ResearchMethodProcedureStep>) {
    setProcedures((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }
  function moveProcedure(id: string, dir: -1 | 1) {
    setProcedures((prev) => {
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
    setProcedures((prev) => prev.filter((p) => p.id !== id));
  }

  function addAssumption() {
    setAssumptions((prev) => [
      ...prev,
      { id: newId(), name: "", description: "" },
    ]);
  }
  function updateAssumption(id: string, patch: Partial<ResearchMethodAssumption>) {
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
  function updateReference(id: string, patch: Partial<ResearchMethodReference>) {
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
      const cleanProcedures = procedures
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

      // Phase 3.5 — 운영 메타 자동 주입.
      // published 가 false→true 로 새로 전환되는 순간에만 reviewedBy/Uid/At 기록.
      const becamePublished = published && !initial?.published;
      const reviewMeta = becamePublished
        ? {
            reviewedBy: authUser?.name ?? undefined,
            reviewedByUid: authUser?.id ?? userId ?? undefined,
            reviewedAt: new Date().toISOString(),
          }
        : {};

      const payload = {
        name: name.trim(),
        purifiedName: purifiedName.trim() || undefined,
        kind,
        summary: summary.trim(),
        accessibleSummary: accessibleSummary.trim() || undefined,
        description: description.trim() || undefined,
        educationalTechExamples: lineParse(educationalTechExamples),
        strengths: lineParse(strengths),
        limitations: lineParse(limitations),
        procedures: cleanProcedures.length > 0 ? cleanProcedures : undefined,
        assumptions: cleanAssumptions.length > 0 ? cleanAssumptions : undefined,
        references: cleanReferences.length > 0 ? cleanReferences : undefined,
        relatedToolGuides: relatedToolGuides.length > 0 ? relatedToolGuides : undefined,
        alumniThesisIds: alumniThesisIds.length > 0 ? alumniThesisIds : undefined,
        statisticalMethodIds:
          statisticalMethodIds.length > 0 ? statisticalMethodIds : undefined,
        published,
        curatedBy: userId,
        updatedBy: authUser?.name ?? undefined,
        updatedByUid: authUser?.id ?? userId ?? undefined,
        ...reviewMeta,
      };

      let savedId = initial?.id ?? "";
      if (isEdit && initial) {
        await researchMethodsApi.update(initial.id, payload);
      } else {
        const created = await researchMethodsApi.create({
          ...payload,
          createdBy: userId,
        });
        savedId = created.id;
      }

      toast.success("저장 완료");
      router.push(`/console/archive/research-methods`);
      // 새로 만든 경우, 운영자가 바로 상세 진입하려면 detail 로 보내는 옵션도 가능
      if (!isEdit && savedId) {
        // 약간의 지연 후 detail 도 이동 시도 — 운영진 흐름 단순화 위해 목록 우선
      }
    } catch (err) {
      console.error("[ResearchMethodForm] save failed", err);
      toast.error(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/console/archive/research-methods">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            연구방법 목록
          </Button>
        </Link>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
          저장
        </Button>
      </div>

      <h1 className="text-2xl font-bold">
        {isEdit ? "연구방법 편집" : "새 연구방법"}
      </h1>

      <Card>
        <CardContent className="space-y-4 py-5">
          <Field label="이름 *">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 설문조사연구" />
          </Field>
          <Field label="순화어 (우리말 다듬은 용어)">
            <Input
              value={purifiedName}
              onChange={(e) => setPurifiedName(e.target.value)}
              placeholder="예: 우리말 순화어 (기존 용어)"
            />
          </Field>
          <Field label="유형 *">
            <div className="flex flex-wrap gap-1.5">
              {KIND_OPTIONS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  aria-pressed={kind === k}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm transition-colors",
                    kind === k
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted",
                  )}
                >
                  {RESEARCH_METHOD_KIND_LABELS[k]}
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
          <Field label="쉽게 이해하기 (일상 비유)">
            <Textarea
              rows={5}
              value={accessibleSummary}
              onChange={(e) => setAccessibleSummary(e.target.value)}
              placeholder="통계·수학에 어려움을 느끼는 분들을 위한 일상 비유 설명. 예: 'XX 처럼 …'"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              학술적 정의가 아닌 단순화된 일상 비유 수준으로 작성하세요. 강한 정의·주장은 피해 주세요.
            </p>
          </Field>
          <Field label="상세 설명">
            <Textarea
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="긴 본문 (마크다운/일반 텍스트)"
            />
          </Field>
          <Field label="교육공학 활용 예 (줄바꿈으로 구분)">
            <Textarea
              rows={3}
              value={educationalTechExamples}
              onChange={(e) => setEducationalTechExamples(e.target.value)}
              placeholder="예: 학습몰입에 미치는 영향 검증"
            />
          </Field>
          <Field label="강점 (줄바꿈으로 구분)">
            <Textarea
              rows={3}
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
            />
          </Field>
          <Field label="한계/약점 (줄바꿈으로 구분)">
            <Textarea
              rows={3}
              value={limitations}
              onChange={(e) => setLimitations(e.target.value)}
            />
          </Field>
        </CardContent>
      </Card>

      {/* 절차 */}
      <Card>
        <CardContent className="space-y-3 py-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">연구 절차</h2>
            <Button type="button" variant="outline" size="sm" onClick={addProcedure}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              단계 추가
            </Button>
          </div>
          {procedures.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              아직 단계가 없습니다. &quot;단계 추가&quot;를 눌러 절차를 입력하세요.
            </p>
          ) : (
            <div className="space-y-2">
              {procedures.map((p, i) => (
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
                        disabled={i === procedures.length - 1}
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
              가정 항목이 없습니다. 양적 연구의 정규성·등분산성 등 검정 가정을 입력하세요.
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

      {/* 관련 도구 가이드 (Phase 3 placeholder) */}
      <Card>
        <CardContent className="space-y-3 py-5">
          <h2 className="text-sm font-semibold">관련 도구 가이드 (Phase 3)</h2>
          <div className="flex flex-wrap gap-1.5">
            {TOOL_OPTIONS.map((t) => {
              const active = relatedToolGuides.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTool(t)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted",
                  )}
                >
                  {RESEARCH_METHOD_TOOL_LABELS[t]}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 관련 통계방법 (양방향) */}
      <Card>
        <CardContent className="space-y-3 py-5">
          <h2 className="text-sm font-semibold">관련 통계방법 (양방향 연계)</h2>
          <p className="text-[11px] text-muted-foreground">
            이 연구방법에서 자주 사용되는 통계기법을 선택하세요. 상세 페이지에서
            <strong> 이 방법에서 자주 쓰는 통계기법</strong>으로 노출됩니다.
          </p>

          {statisticalMethodIds.length > 0 && (
            <div className="rounded-md border bg-muted/30 p-2">
              <p className="mb-1 text-[11px] font-medium text-muted-foreground">
                선택됨 ({statisticalMethodIds.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {statisticalMethodIds.map((id) => {
                  const s = statisticalMethods.find((x) => x.id === id);
                  return (
                    <Badge
                      key={id}
                      variant="outline"
                      className="cursor-pointer text-[10px] hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => toggleStat(id)}
                    >
                      {s ? s.name : id.slice(0, 6) + "…"} ×
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          <Input
            placeholder="이름·요약으로 검색"
            value={statQuery}
            onChange={(e) => setStatQuery(e.target.value)}
          />
          <div className="max-h-56 overflow-y-auto rounded-md border">
            {loadingStat ? (
              <p className="px-3 py-4 text-xs text-muted-foreground">불러오는 중...</p>
            ) : filteredStat.length === 0 ? (
              <p className="px-3 py-4 text-xs text-muted-foreground">
                {statQuery ? "검색 결과 없음" : "등록된 통계방법이 없습니다."}
              </p>
            ) : (
              <ul className="divide-y">
                {filteredStat.map((s) => {
                  const active = selectedStatSet.has(s.id);
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => toggleStat(s.id)}
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

      {/* 졸업생 학위논문 매핑 */}
      <Card>
        <CardContent className="space-y-3 py-5">
          <h2 className="text-sm font-semibold">관련 졸업생 학위논문 (큐레이트)</h2>
          <p className="text-[11px] text-muted-foreground">
            이 연구방법을 사용한 학회 졸업생 논문을 선택하세요. 양방향 동기화 의무는 없으며,
            졸업생 논문 편집 화면에서도 동일하게 매핑할 수 있습니다.
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
            {loadingTheses ? (
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
