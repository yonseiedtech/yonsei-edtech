"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2, X, HelpCircle, Compass, BarChart3, Network, ListPlus, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { researchMethodsApi, statisticalMethodsApi } from "@/lib/bkend";
import { researchModelsApi } from "@/lib/research-models-api";
import { generateQuestions } from "@/lib/research-question-generator";
import { EMPTY_RESEARCH_MODEL } from "@/types/research-model";
import { useAuthStore } from "@/features/auth/auth-store";
import type { ResearchQuestionItem, ResearchMethod, StatisticalMethod } from "@/types";

/**
 * R2: 연구문제 의문문 → 가설 서술문 초안 변환 (규칙 기반).
 * 규칙에 안 걸리면 물음표만 떼고 반환 — 사용자가 다듬는다.
 */
function toHypothesisDraft(question: string): string {
  const t = question.trim().replace(/\?+\s*$/, "");
  if (!t) return "";
  const rules: [RegExp, string][] = [
    [/차이가 있는가$/, "차이가 있을 것이다."],
    [/차이가 있을 것인가$/, "차이가 있을 것이다."],
    [/영향을 미치는가$/, "영향을 미칠 것이다."],
    [/효과가 있는가$/, "효과가 있을 것이다."],
    [/관계가 있는가$/, "관계가 있을 것이다."],
    [/향상시키는가$/, "향상시킬 것이다."],
    [/어떠한가$/, "유의한 차이가 있을 것이다."],
  ];
  for (const [re, repl] of rules) {
    if (re.test(t)) return t.replace(re, repl);
  }
  return `${t}.`;
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `rq-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }
}

interface TagPickerProps {
  icon: typeof Compass;
  label: string;
  accent: string;
  options: { id: string; name: string }[];
  selectedIds: string[];
  readOnly?: boolean;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}

function TagPicker({ icon: Icon, label, accent, options, selectedIds, readOnly, onAdd, onRemove }: TagPickerProps) {
  const nameOf = useMemo(() => {
    const m = new Map(options.map((o) => [o.id, o.name]));
    return (id: string) => m.get(id) ?? id;
  }, [options]);
  const available = options.filter((o) => !selectedIds.includes(o.id));

  return (
    <div>
      <p className={cn("flex items-center gap-1 text-[11px] font-semibold", accent)}>
        <Icon size={12} />
        {label}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        {selectedIds.length === 0 && (
          <span className="text-[11px] text-muted-foreground">아직 없음</span>
        )}
        {selectedIds.map((id) => (
          <span
            key={id}
            className="inline-flex items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-[11px]"
          >
            {nameOf(id)}
            {!readOnly && (
              <button
                type="button"
                onClick={() => onRemove(id)}
                aria-label={`${nameOf(id)} 제거`}
                className="text-muted-foreground hover:text-destructive"
              >
                <X size={11} />
              </button>
            )}
          </span>
        ))}
        {!readOnly && available.length > 0 && (
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) onAdd(e.target.value);
            }}
            className="rounded-full border border-dashed bg-transparent px-2 py-0.5 text-[11px] text-muted-foreground hover:border-primary/40"
          >
            <option value="">+ {label} 추가</option>
            {available.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

export default function ResearchQuestionsPanel({
  items,
  readOnly,
  onChange,
}: {
  items: ResearchQuestionItem[];
  readOnly?: boolean;
  onChange: (next: ResearchQuestionItem[]) => void;
}) {
  const [researchMethods, setResearchMethods] = useState<ResearchMethod[]>([]);
  const [statMethods, setStatMethods] = useState<StatisticalMethod[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rm, sm] = await Promise.all([
          researchMethodsApi.listPublished(),
          statisticalMethodsApi.listPublished(),
        ]);
        if (cancelled) return;
        setResearchMethods(rm.data);
        setStatMethods(sm.data);
      } catch (err) {
        console.error("[research-questions] method load failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rmOptions = useMemo(
    () => researchMethods.map((r) => ({ id: r.id, name: r.name })).sort((a, b) => a.name.localeCompare(b.name, "ko")),
    [researchMethods],
  );
  const smOptions = useMemo(
    () => statMethods.map((s) => ({ id: s.id, name: s.name })).sort((a, b) => a.name.localeCompare(b.name, "ko")),
    [statMethods],
  );

  function patch(id: string, fn: (q: ResearchQuestionItem) => ResearchQuestionItem) {
    onChange(items.map((q) => (q.id === id ? fn(q) : q)));
  }
  function addQuestion() {
    onChange([...items, { id: newId(), text: "", researchMethodIds: [], statMethodIds: [] }]);
  }
  function removeQuestion(id: string) {
    onChange(items.filter((q) => q.id !== id));
  }

  // Phase 4-B: 연구 모형(research_models) → 연구문제 가져오기 (리포트/계획서와 동일 생성 로직)
  const { user } = useAuthStore();
  const { data: modelDoc } = useQuery({
    queryKey: ["research-model", user?.id],
    queryFn: () => researchModelsApi.get(user!.id),
    enabled: !!user?.id && !readOnly,
    staleTime: 60_000,
  });
  const modelQuestions = useMemo(
    () => generateQuestions(modelDoc?.data ?? EMPTY_RESEARCH_MODEL).map((q) => q.text),
    [modelDoc],
  );
  const newModelQuestions = useMemo(() => {
    const existing = new Set(items.map((q) => q.text.trim()));
    return modelQuestions.filter((t) => !existing.has(t.trim()));
  }, [modelQuestions, items]);
  function importFromModel() {
    if (newModelQuestions.length === 0) return;
    onChange([
      ...items,
      ...newModelQuestions.map((text) => ({
        id: newId(),
        text,
        researchMethodIds: [],
        statMethodIds: [],
      })),
    ]);
    toast.success(`연구 모형에서 연구문제 ${newModelQuestions.length}개를 가져왔습니다.`);
  }

  return (
    <div className="mt-3 rounded-xl border border-amber-200/70 bg-amber-50/40 p-4 dark:border-amber-800/50 dark:bg-amber-950/10">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-200">
          <HelpCircle size={13} />
          연구 문제
        </p>
        <span className="text-[11px] text-muted-foreground">{items.length}개</span>
      </div>
      <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
        연구 문제는 연구방법·통계방법을 압축해 담습니다. 각 문제에 태그를 달아두면 방법·분석 설계가 한눈에 정리됩니다.
        태그는 아카이브(연구방법·통계방법 가이드)에 등록된 항목에서 선택합니다.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Link
          href="/research-model"
          className="inline-flex items-center gap-1 rounded-lg border border-dashed border-primary/30 px-2.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/5"
        >
          <Network size={12} />
          변인(독립·종속·매개)으로 연구문제 만들기 — 연구 모형 도구
        </Link>
        {!readOnly && newModelQuestions.length > 0 && (
          <button
            type="button"
            onClick={importFromModel}
            className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            <ListPlus size={12} />
            모형에서 연구문제 {newModelQuestions.length}개 가져오기
          </button>
        )}
      </div>

      <div className="mt-3 space-y-3">
        {items.length === 0 && (
          <p className="rounded-lg border border-dashed bg-card/50 px-3 py-4 text-center text-xs text-muted-foreground">
            아직 연구 문제가 없습니다. 아래 &lsquo;연구 문제 추가&rsquo;로 시작하세요.
          </p>
        )}
        {items.map((q, i) => (
          <div key={q.id} className="rounded-xl border bg-card p-3">
            <div className="flex items-start gap-2">
              <span className="mt-2 shrink-0 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                {i + 1}
              </span>
              <Textarea
                className="min-h-[52px] flex-1 font-sans text-sm leading-relaxed"
                rows={2}
                value={q.text}
                placeholder="예: 학습자 유형에 따라 학업 성취도에 차이가 있는가?"
                onChange={(e) => patch(q.id, (cur) => ({ ...cur, text: e.target.value }))}
                disabled={readOnly}
              />
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removeQuestion(q.id)}
                  aria-label="연구 문제 삭제"
                  className="mt-2 shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
            {/* R2: 연구 가설 — 문제와 1:1 쌍 (서술문으로 바꿨을 때 그대로 가설이 되는지가 시금석) */}
            <div className="mt-2 pl-8">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  연구 가설{" "}
                  <span className="font-normal text-muted-foreground">
                    (선택 — 분석 방향 설계용. 우리 전공 논문은 가설을 본문에 직접 쓰지 않는 관례가 있어요)
                  </span>
                </p>
                {!readOnly && !q.hypothesisText?.trim() && q.text.trim() && (
                  <button
                    type="button"
                    onClick={() =>
                      patch(q.id, (cur) => ({ ...cur, hypothesisText: toHypothesisDraft(cur.text) }))
                    }
                    className="inline-flex items-center gap-1 rounded-full border border-dashed border-emerald-400/60 px-2 py-0.5 text-[10px] text-emerald-700 transition-colors hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                    title="연구문제를 서술문 가설 초안으로 변환"
                  >
                    <ArrowRightLeft size={10} />
                    문제 → 가설 초안
                  </button>
                )}
              </div>
              <div className="mt-1 flex flex-col gap-1.5 sm:flex-row">
                <select
                  value={q.hypothesisDirection ?? ""}
                  onChange={(e) =>
                    patch(q.id, (cur) => ({
                      ...cur,
                      hypothesisDirection: e.target.value as ResearchQuestionItem["hypothesisDirection"],
                    }))
                  }
                  disabled={readOnly}
                  className="h-9 rounded-lg border bg-background px-2 text-[11px] sm:w-40"
                  aria-label="가설 방향"
                >
                  <option value="">방향 미지정</option>
                  <option value="positive">정적(+) 영향·관계</option>
                  <option value="negative">부적(−) 영향·관계</option>
                  <option value="difference">집단 간 차이</option>
                  <option value="nondirectional">비방향적</option>
                </select>
                <Textarea
                  className="min-h-[36px] flex-1 font-sans text-xs leading-relaxed"
                  rows={1}
                  value={q.hypothesisText ?? ""}
                  placeholder="예: 프로그램에 참여한 집단은 참여하지 않은 집단보다 학업 성취도가 높을 것이다."
                  onChange={(e) => patch(q.id, (cur) => ({ ...cur, hypothesisText: e.target.value }))}
                  disabled={readOnly}
                />
              </div>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 pl-8 sm:grid-cols-2">
              <TagPicker
                icon={Compass}
                label="연구방법"
                accent="text-amber-700 dark:text-amber-300"
                options={rmOptions}
                selectedIds={q.researchMethodIds}
                readOnly={readOnly}
                onAdd={(id) => patch(q.id, (cur) => ({ ...cur, researchMethodIds: [...cur.researchMethodIds, id] }))}
                onRemove={(id) => patch(q.id, (cur) => ({ ...cur, researchMethodIds: cur.researchMethodIds.filter((x) => x !== id) }))}
              />
              <TagPicker
                icon={BarChart3}
                label="통계방법"
                accent="text-blue-700 dark:text-blue-300"
                options={smOptions}
                selectedIds={q.statMethodIds}
                readOnly={readOnly}
                onAdd={(id) => patch(q.id, (cur) => ({ ...cur, statMethodIds: [...cur.statMethodIds, id] }))}
                onRemove={(id) => patch(q.id, (cur) => ({ ...cur, statMethodIds: cur.statMethodIds.filter((x) => x !== id) }))}
              />
            </div>
          </div>
        ))}
      </div>

      {!readOnly && (
        <Button variant="outline" size="sm" className="mt-3" onClick={addQuestion}>
          <Plus size={14} className="mr-1" />
          연구 문제 추가
        </Button>
      )}
    </div>
  );
}
