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
  foundationTermsApi,
  archiveConceptsApi,
  researchMethodsApi,
  statisticalMethodsApi,
} from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  FOUNDATION_TERM_CATEGORY_LABELS,
  type FoundationTerm,
  type FoundationTermCategory,
  type FoundationTermConfusion,
  type FoundationTermExample,
  type FoundationTermReference,
  type ArchiveConcept,
  type ResearchMethod,
  type StatisticalMethod,
} from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  initial: FoundationTerm | null;
  userId: string;
}

const CATEGORY_OPTIONS: FoundationTermCategory[] = [
  "variables",
  "research-design",
  "instructional-design",
  "systems-theory",
  "measurement",
  "learning-theory",
];

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function FoundationTermForm({ initial, userId }: Props) {
  const router = useRouter();
  const isEdit = !!initial;
  const { user: authUser } = useAuthStore();

  const [termName, setTermName] = useState(initial?.term ?? "");
  // 순화어 — 노션 용어사전집 병기. 운영진 자유 수정 가능.
  const [purifiedName, setPurifiedName] = useState(initial?.purifiedName ?? "");
  // AECT 공식 역어 — 『교육공학 용어해설』(학지사 2020) 표제어 병기.
  const [aectTerm, setAectTerm] = useState(initial?.aectTerm ?? "");
  const [abbreviation, setAbbreviation] = useState(initial?.abbreviation ?? "");
  const [englishName, setEnglishName] = useState(initial?.englishName ?? "");
  const [category, setCategory] = useState<FoundationTermCategory>(
    initial?.category ?? "variables",
  );
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [accessibleSummary, setAccessibleSummary] = useState(
    initial?.accessibleSummary ?? "",
  );
  const [definition, setDefinition] = useState(initial?.definition ?? "");
  const [etymology, setEtymology] = useState(initial?.etymology ?? "");
  const [examples, setExamples] = useState<FoundationTermExample[]>(
    initial?.examples ?? [],
  );
  const [confusedWith, setConfusedWith] = useState<FoundationTermConfusion[]>(
    initial?.confusedWith ?? [],
  );
  const [references, setReferences] = useState<FoundationTermReference[]>(
    initial?.references ?? [],
  );
  const [relatedTermIds, setRelatedTermIds] = useState<string[]>(
    initial?.relatedTermIds ?? [],
  );
  const [relatedConceptIds, setRelatedConceptIds] = useState<string[]>(
    initial?.relatedConceptIds ?? [],
  );
  const [relatedResearchMethodIds, setRelatedResearchMethodIds] = useState<string[]>(
    initial?.relatedResearchMethodIds ?? [],
  );
  const [relatedStatisticalMethodIds, setRelatedStatisticalMethodIds] = useState<
    string[]
  >(initial?.relatedStatisticalMethodIds ?? []);
  const [published, setPublished] = useState<boolean>(initial?.published ?? false);

  // 픽커 데이터
  const [allTerms, setAllTerms] = useState<FoundationTerm[]>([]);
  const [allConcepts, setAllConcepts] = useState<ArchiveConcept[]>([]);
  const [allResearchMethods, setAllResearchMethods] = useState<ResearchMethod[]>([]);
  const [allStatisticalMethods, setAllStatisticalMethods] = useState<
    StatisticalMethod[]
  >([]);

  // 검색
  const [termQuery, setTermQuery] = useState("");
  const [conceptQuery, setConceptQuery] = useState("");
  const [rmQuery, setRmQuery] = useState("");
  const [smQuery, setSmQuery] = useState("");

  const [loadingPickers, setLoadingPickers] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingPickers(true);
    (async () => {
      try {
        const [tRes, cRes, rmRes, smRes] = await Promise.all([
          foundationTermsApi.list(),
          archiveConceptsApi.list(),
          researchMethodsApi.list(),
          statisticalMethodsApi.list(),
        ]);
        if (cancelled) return;
        setAllTerms(tRes.data);
        setAllConcepts(cRes.data);
        setAllResearchMethods(rmRes.data);
        setAllStatisticalMethods(smRes.data);
      } catch (err) {
        console.error("[FoundationTermForm] picker data load failed", err);
      } finally {
        if (!cancelled) setLoadingPickers(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedTermSet = useMemo(() => new Set(relatedTermIds), [relatedTermIds]);
  const selectedConceptSet = useMemo(
    () => new Set(relatedConceptIds),
    [relatedConceptIds],
  );
  const selectedRmSet = useMemo(
    () => new Set(relatedResearchMethodIds),
    [relatedResearchMethodIds],
  );
  const selectedSmSet = useMemo(
    () => new Set(relatedStatisticalMethodIds),
    [relatedStatisticalMethodIds],
  );

  const filteredTerms = useMemo(() => {
    const q = termQuery.trim().toLowerCase();
    const base = allTerms.filter((t) => t.id !== initial?.id);
    if (!q) return base.slice(0, 50);
    return base
      .filter((t) => {
        const hay = [t.term, t.abbreviation, t.englishName, t.summary]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 50);
  }, [allTerms, termQuery, initial?.id]);

  const filteredConcepts = useMemo(() => {
    const q = conceptQuery.trim().toLowerCase();
    if (!q) return allConcepts.slice(0, 50);
    return allConcepts
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 50);
  }, [allConcepts, conceptQuery]);

  const filteredResearchMethods = useMemo(() => {
    const q = rmQuery.trim().toLowerCase();
    if (!q) return allResearchMethods.slice(0, 50);
    return allResearchMethods
      .filter((r) => {
        const hay = [r.name, r.summary].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 50);
  }, [allResearchMethods, rmQuery]);

  const filteredStatisticalMethods = useMemo(() => {
    const q = smQuery.trim().toLowerCase();
    if (!q) return allStatisticalMethods.slice(0, 50);
    return allStatisticalMethods
      .filter((s) => {
        const hay = [s.name, s.summary].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 50);
  }, [allStatisticalMethods, smQuery]);

  function toggleArrayId(
    list: string[],
    setList: (next: string[]) => void,
    id: string,
  ) {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  // ── examples ──
  function addExample() {
    setExamples((prev) => [...prev, { id: newId(), text: "" }]);
  }
  function updateExample(id: string, text: string) {
    setExamples((prev) => prev.map((e) => (e.id === id ? { ...e, text } : e)));
  }
  function removeExample(id: string) {
    setExamples((prev) => prev.filter((e) => e.id !== id));
  }

  // ── confusedWith ──
  function addConfusion() {
    setConfusedWith((prev) => [
      ...prev,
      { id: newId(), confusedTermLabel: "", distinction: "" },
    ]);
  }
  function updateConfusion(id: string, patch: Partial<FoundationTermConfusion>) {
    setConfusedWith((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  function removeConfusion(id: string) {
    setConfusedWith((prev) => prev.filter((c) => c.id !== id));
  }

  // ── references ──
  function addReference() {
    setReferences((prev) => [...prev, { id: newId(), title: "" }]);
  }
  function updateReference(id: string, patch: Partial<FoundationTermReference>) {
    setReferences((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function removeReference(id: string) {
    setReferences((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleSave() {
    if (!termName.trim()) {
      toast.error("용어(term) 는 필수입니다");
      return;
    }
    if (!summary.trim()) {
      toast.error("요약(summary) 은 필수입니다");
      return;
    }
    setSaving(true);
    try {
      const cleanExamples = examples
        .filter((e) => e.text.trim())
        .map((e) => ({ id: e.id, text: e.text.trim() }));
      const cleanConfusions = confusedWith
        .filter(
          (c) =>
            (c.confusedTermLabel?.trim() || c.confusedTermId?.trim()) &&
            c.distinction.trim(),
        )
        .map((c) => ({
          id: c.id,
          confusedTermId: c.confusedTermId?.trim() || undefined,
          confusedTermLabel: c.confusedTermLabel?.trim() || undefined,
          distinction: c.distinction.trim(),
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
      const becamePublished = published && !initial?.published;
      const reviewMeta = becamePublished
        ? {
            reviewedBy: authUser?.name ?? undefined,
            reviewedByUid: authUser?.id ?? userId ?? undefined,
            reviewedAt: new Date().toISOString(),
          }
        : {};

      const payload = {
        term: termName.trim(),
        purifiedName: purifiedName.trim() || undefined,
        aectTerm: aectTerm.trim() || undefined,
        abbreviation: abbreviation.trim() || undefined,
        englishName: englishName.trim() || undefined,
        category,
        summary: summary.trim(),
        accessibleSummary: accessibleSummary.trim() || undefined,
        definition: definition.trim() || undefined,
        etymology: etymology.trim() || undefined,
        examples: cleanExamples.length > 0 ? cleanExamples : undefined,
        confusedWith: cleanConfusions.length > 0 ? cleanConfusions : undefined,
        references: cleanReferences.length > 0 ? cleanReferences : undefined,
        relatedTermIds: relatedTermIds.length > 0 ? relatedTermIds : undefined,
        relatedConceptIds: relatedConceptIds.length > 0 ? relatedConceptIds : undefined,
        relatedResearchMethodIds:
          relatedResearchMethodIds.length > 0 ? relatedResearchMethodIds : undefined,
        relatedStatisticalMethodIds:
          relatedStatisticalMethodIds.length > 0
            ? relatedStatisticalMethodIds
            : undefined,
        published,
        curatedBy: userId,
        updatedBy: authUser?.name ?? undefined,
        updatedByUid: authUser?.id ?? userId ?? undefined,
        ...reviewMeta,
      };

      if (isEdit && initial) {
        await foundationTermsApi.update(initial.id, payload);
      } else {
        await foundationTermsApi.create({
          ...payload,
          createdBy: userId,
        });
      }
      toast.success("저장 완료");
      router.push(`/console/archive/foundation-terms`);
    } catch (err) {
      console.error("[FoundationTermForm] save failed", err);
      toast.error(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/console/archive/foundation-terms">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            기초 용어 목록
          </Button>
        </Link>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-1 h-4 w-4" />
          )}
          저장
        </Button>
      </div>

      <h1 className="text-2xl font-bold">
        {isEdit ? "기초 용어 편집" : "새 기초 용어"}
      </h1>

      <Card>
        <CardContent className="space-y-4 py-5">
          <Field label="용어 (한국어) *">
            <Input
              value={termName}
              onChange={(e) => setTermName(e.target.value)}
              placeholder="예: 독립변인"
            />
          </Field>
          <Field label="순화어 (우리말 다듬은 용어)">
            <Input
              value={purifiedName}
              onChange={(e) => setPurifiedName(e.target.value)}
              placeholder="예: 실험 (처치)"
            />
          </Field>
          <Field label="AECT 공식 역어">
            <Input
              value={aectTerm}
              onChange={(e) => setAectTerm(e.target.value)}
              placeholder="예: 사정 (Assessment)"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              『교육공학 용어해설』(학지사, 2020) 표제어 기준 공식 번역어. 용어명과 다를 때만 병기됩니다.
            </p>
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="약어">
              <Input
                value={abbreviation}
                onChange={(e) => setAbbreviation(e.target.value)}
                placeholder="예: IV, ISD"
              />
            </Field>
            <Field label="영문">
              <Input
                value={englishName}
                onChange={(e) => setEnglishName(e.target.value)}
                placeholder="예: Independent Variable"
              />
            </Field>
          </div>
          <Field label="카테고리 *">
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_OPTIONS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setCategory(k)}
                  aria-pressed={category === k}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm transition-colors",
                    category === k
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted",
                  )}
                >
                  {FOUNDATION_TERM_CATEGORY_LABELS[k]}
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
              rows={4}
              value={accessibleSummary}
              onChange={(e) => setAccessibleSummary(e.target.value)}
              placeholder="학부생도 직관적으로 이해할 수 있는 일상 비유"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              학술적 정의가 아닌 단순화된 일상 비유 수준으로 작성하세요.
            </p>
          </Field>
          <Field label="정의 (상세)">
            <Textarea
              rows={6}
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              placeholder="긴 본문 (마크다운/일반 텍스트)"
            />
          </Field>
          <Field label="어원·유래">
            <Textarea
              rows={3}
              value={etymology}
              onChange={(e) => setEtymology(e.target.value)}
              placeholder="용어의 어원이나 학사적 유래 (선택)"
            />
          </Field>
        </CardContent>
      </Card>

      {/* 사용 예시 */}
      <Card>
        <CardContent className="space-y-3 py-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">사용 예시</h2>
            <Button type="button" variant="outline" size="sm" onClick={addExample}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              예시 추가
            </Button>
          </div>
          {examples.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              아직 예시가 없습니다. &quot;예시 추가&quot; 를 눌러 사용 예를 입력하세요.
            </p>
          ) : (
            <div className="space-y-2">
              {examples.map((ex) => (
                <div key={ex.id} className="flex items-start gap-2 rounded-lg border p-2">
                  <Textarea
                    rows={2}
                    value={ex.text}
                    onChange={(e) => updateExample(ex.id, e.target.value)}
                    placeholder="구체적인 사용 예 (한 줄~몇 문장)"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeExample(ex.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* "비슷하지만 다른" 용어 페어 */}
      <Card>
        <CardContent className="space-y-3 py-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">비슷하지만 다른 용어</h2>
            <Button type="button" variant="outline" size="sm" onClick={addConfusion}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              페어 추가
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            사용자가 헷갈리기 쉬운 다른 용어와의 차이를 명시합니다. 같은 컬렉션 내 용어를
            선택하거나, 외부 용어는 자유 텍스트로 입력하세요.
          </p>
          {confusedWith.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              페어가 없습니다. &quot;페어 추가&quot; 를 눌러 입력하세요.
            </p>
          ) : (
            <div className="space-y-3">
              {confusedWith.map((c) => {
                const linkedTerm = allTerms.find((t) => t.id === c.confusedTermId);
                return (
                  <div key={c.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeConfusion(c.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Field label="헷갈리는 용어 (라벨, 외부 용어 가능)">
                      <Input
                        value={c.confusedTermLabel ?? ""}
                        onChange={(e) =>
                          updateConfusion(c.id, { confusedTermLabel: e.target.value })
                        }
                        placeholder="예: 종속변인 / Syllabus"
                      />
                    </Field>
                    <Field label="같은 컬렉션의 용어와 연결 (선택)">
                      {c.confusedTermId && linkedTerm ? (
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="bg-primary/5 cursor-pointer text-[10px] hover:bg-rose-50 hover:text-rose-700"
                            onClick={() =>
                              updateConfusion(c.id, { confusedTermId: undefined })
                            }
                          >
                            연결: {linkedTerm.term} ×
                          </Badge>
                        </div>
                      ) : (
                        <select
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                          value=""
                          onChange={(e) =>
                            updateConfusion(c.id, {
                              confusedTermId: e.target.value || undefined,
                            })
                          }
                        >
                          <option value="">선택 안 함 (라벨만 사용)</option>
                          {allTerms
                            .filter((t) => t.id !== initial?.id)
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.term}
                                {t.abbreviation ? ` (${t.abbreviation})` : ""}
                              </option>
                            ))}
                        </select>
                      )}
                    </Field>
                    <Field label="차이점 설명">
                      <Textarea
                        rows={3}
                        value={c.distinction}
                        onChange={(e) =>
                          updateConfusion(c.id, { distinction: e.target.value })
                        }
                        placeholder="짧고 명확하게 차이점을 설명"
                      />
                    </Field>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 관련 용어 (같은 컬렉션) */}
      <PickerCard
        title="관련 용어 (같은 컬렉션)"
        description="같은 기초 용어 가이드 내에서 함께 보면 좋은 용어를 선택합니다."
        items={filteredTerms.map((t) => ({
          id: t.id,
          name: t.term,
          sub: [t.englishName, FOUNDATION_TERM_CATEGORY_LABELS[t.category]]
            .filter(Boolean)
            .join(" · "),
        }))}
        allItems={allTerms.map((t) => ({ id: t.id, name: t.term }))}
        selectedIds={relatedTermIds}
        selectedSet={selectedTermSet}
        query={termQuery}
        setQuery={setTermQuery}
        loading={loadingPickers}
        onToggle={(id) => toggleArrayId(relatedTermIds, setRelatedTermIds, id)}
      />

      {/* 관련 개념 (외부 archive_concepts 단방향) */}
      <PickerCard
        title="관련 개념 (archive_concepts, 단방향)"
        description="외부 개념 카드와의 단방향 chip 연결. 양방향 동기화는 하지 않습니다."
        items={filteredConcepts.map((c) => ({ id: c.id, name: c.name }))}
        allItems={allConcepts.map((c) => ({ id: c.id, name: c.name }))}
        selectedIds={relatedConceptIds}
        selectedSet={selectedConceptSet}
        query={conceptQuery}
        setQuery={setConceptQuery}
        loading={loadingPickers}
        onToggle={(id) => toggleArrayId(relatedConceptIds, setRelatedConceptIds, id)}
      />

      {/* 관련 연구방법 */}
      <PickerCard
        title="관련 연구방법"
        description="이 용어와 자주 함께 등장하는 연구방법을 선택합니다."
        items={filteredResearchMethods.map((r) => ({ id: r.id, name: r.name }))}
        allItems={allResearchMethods.map((r) => ({ id: r.id, name: r.name }))}
        selectedIds={relatedResearchMethodIds}
        selectedSet={selectedRmSet}
        query={rmQuery}
        setQuery={setRmQuery}
        loading={loadingPickers}
        onToggle={(id) =>
          toggleArrayId(relatedResearchMethodIds, setRelatedResearchMethodIds, id)
        }
      />

      {/* 관련 통계방법 */}
      <PickerCard
        title="관련 통계방법"
        description="이 용어와 자주 함께 등장하는 통계방법을 선택합니다."
        items={filteredStatisticalMethods.map((s) => ({ id: s.id, name: s.name }))}
        allItems={allStatisticalMethods.map((s) => ({ id: s.id, name: s.name }))}
        selectedIds={relatedStatisticalMethodIds}
        selectedSet={selectedSmSet}
        query={smQuery}
        setQuery={setSmQuery}
        loading={loadingPickers}
        onToggle={(id) =>
          toggleArrayId(
            relatedStatisticalMethodIds,
            setRelatedStatisticalMethodIds,
            id,
          )
        }
      />

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
                        onChange={(e) =>
                          updateReference(r.id, { title: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="저자">
                      <Input
                        value={r.author ?? ""}
                        onChange={(e) =>
                          updateReference(r.id, { author: e.target.value })
                        }
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
          {saving ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-1 h-4 w-4" />
          )}
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

interface PickerItem {
  id: string;
  name: string;
  sub?: string;
}

interface PickerCardProps {
  title: string;
  description?: string;
  items: PickerItem[];
  allItems: { id: string; name: string }[];
  selectedIds: string[];
  selectedSet: Set<string>;
  query: string;
  setQuery: (v: string) => void;
  loading: boolean;
  onToggle: (id: string) => void;
}

function PickerCard({
  title,
  description,
  items,
  allItems,
  selectedIds,
  selectedSet,
  query,
  setQuery,
  loading,
  onToggle,
}: PickerCardProps) {
  return (
    <Card>
      <CardContent className="space-y-3 py-5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && (
          <p className="text-[11px] text-muted-foreground">{description}</p>
        )}

        {selectedIds.length > 0 && (
          <div className="rounded-md border bg-muted/30 p-2">
            <p className="mb-1 text-[11px] font-medium text-muted-foreground">
              선택됨 ({selectedIds.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {selectedIds.map((id) => {
                const item = allItems.find((x) => x.id === id);
                return (
                  <Badge
                    key={id}
                    variant="outline"
                    className="cursor-pointer text-[10px] hover:bg-rose-50 hover:text-rose-700"
                    onClick={() => onToggle(id)}
                  >
                    {item ? item.name : id.slice(0, 6) + "…"} ×
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        <Input
          placeholder="이름으로 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="max-h-56 overflow-y-auto rounded-md border">
          {loading ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">불러오는 중...</p>
          ) : items.length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">
              {query ? "검색 결과 없음" : "등록된 항목이 없습니다."}
            </p>
          ) : (
            <ul className="divide-y">
              {items.map((it) => {
                const active = selectedSet.has(it.id);
                return (
                  <li key={it.id}>
                    <button
                      type="button"
                      onClick={() => onToggle(it.id)}
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
                        <span className="block font-medium leading-snug">{it.name}</span>
                        {it.sub && (
                          <span className="block text-muted-foreground">{it.sub}</span>
                        )}
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
  );
}
