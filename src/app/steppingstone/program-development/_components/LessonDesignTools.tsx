"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Plus, Sparkles, Target, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { GAGNE_NINE_EVENTS } from "@/lib/program-development-guide";
import {
  BASIC_LESSON_STAGES,
  buildLessonPlanText,
  buildObjectiveSentence,
  type LearningObjective,
  type LessonPlanRow,
} from "@/lib/lesson-design";

const OBJECTIVES_KEY = "program-development:objectives:v1";
const LESSON_PLAN_KEY = "program-development:lesson-plan:v1";

function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyObjective(): LearningObjective {
  return { id: genId(), condition: "", behavior: "", criterion: "" };
}

function emptyRow(): LessonPlanRow {
  return { id: genId(), stage: "", activity: "", materials: "", minutes: "" };
}

/** 클립보드 복사 (권한 실패 시 조용히 무시하고 false 반환) */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* 폴백으로 진행 */
  }
  return false;
}

interface LessonPlanState {
  title: string;
  objective: string;
  rows: LessonPlanRow[];
}

interface LessonDesignToolsProps {
  /** 현재 선택된 설계 모델 — 가네 프리필 버튼 강조용 */
  model: "addie" | "gagne";
}

export default function LessonDesignTools({ model }: LessonDesignToolsProps) {
  const [hydrated, setHydrated] = useState(false);
  const [objectives, setObjectives] = useState<LearningObjective[]>([emptyObjective()]);
  const [plan, setPlan] = useState<LessonPlanState>({ title: "", objective: "", rows: [] });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 로드
  useEffect(() => {
    try {
      const rawObj = localStorage.getItem(OBJECTIVES_KEY);
      if (rawObj) {
        const parsed = JSON.parse(rawObj) as LearningObjective[];
        if (Array.isArray(parsed) && parsed.length > 0) setObjectives(parsed);
      }
      const rawPlan = localStorage.getItem(LESSON_PLAN_KEY);
      if (rawPlan) {
        const parsed = JSON.parse(rawPlan) as LessonPlanState;
        if (parsed && Array.isArray(parsed.rows)) setPlan(parsed);
      }
    } catch {
      /* 손상된 값 무시 */
    }
    setHydrated(true);
  }, []);

  // 저장
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(OBJECTIVES_KEY, JSON.stringify(objectives));
    } catch {
      /* 무시 */
    }
  }, [objectives, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(LESSON_PLAN_KEY, JSON.stringify(plan));
    } catch {
      /* 무시 */
    }
  }, [plan, hydrated]);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  function flashCopied(key: string) {
    setCopiedKey(key);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopiedKey(null), 1800);
  }

  // ── 학습목표 작성기 핸들러 ──
  function updateObjective(id: string, patch: Partial<LearningObjective>) {
    setObjectives((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }
  function addObjective() {
    setObjectives((prev) => [...prev, emptyObjective()]);
  }
  function removeObjective(id: string) {
    setObjectives((prev) => (prev.length <= 1 ? prev : prev.filter((o) => o.id !== id)));
  }

  const objectiveSentences = objectives
    .map((o) => buildObjectiveSentence(o))
    .filter((s) => s.length > 0);

  async function copyObjectives() {
    const text = objectiveSentences.map((s, i) => `${i + 1}. ${s}`).join("\n");
    if (await copyText(text)) flashCopied("objectives");
  }

  // ── 과정안 작성기 핸들러 ──
  function updateRow(id: string, patch: Partial<LessonPlanRow>) {
    setPlan((prev) => ({
      ...prev,
      rows: prev.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  }
  function addRow() {
    setPlan((prev) => ({ ...prev, rows: [...prev.rows, emptyRow()] }));
  }
  function removeRow(id: string) {
    setPlan((prev) => ({ ...prev, rows: prev.rows.filter((r) => r.id !== id) }));
  }
  function prefillBasic() {
    setPlan((prev) => ({
      ...prev,
      rows: BASIC_LESSON_STAGES.map((s) => ({
        id: genId(),
        stage: s.stage,
        activity: s.activity,
        materials: "",
        minutes: "",
      })),
    }));
  }
  function prefillGagne() {
    setPlan((prev) => ({
      ...prev,
      rows: GAGNE_NINE_EVENTS.map((ev) => ({
        id: genId(),
        stage: `${ev.order}. ${ev.title}`,
        activity: ev.lessonActivity,
        materials: "",
        minutes: "",
      })),
    }));
  }

  async function copyPlan() {
    const text = buildLessonPlanText(plan.rows, { title: plan.title, objective: plan.objective });
    if (await copyText(text)) flashCopied("plan");
  }

  return (
    <div className="mt-10 space-y-8">
      <div>
        <h2 className="text-lg font-bold tracking-tight">교수학습 목표·과정안 작성 도구</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          한 차시 수업을 설계할 때 쓰는 작성 도구입니다. 입력한 내용은 이 브라우저에만 저장되며(로그인
          불필요), 완성본은 텍스트로 복사할 수 있습니다.
        </p>
      </div>

      {/* 학습목표 작성기 */}
      <section className="rounded-2xl border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-1.5">
          <Target className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="text-base font-semibold">학습목표 작성기</h3>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Mager 식 3요소를 채우면 <strong>&ldquo;~할 수 있다&rdquo;</strong> 형태의 목표 문장이 자동으로
          조립됩니다. 조건·준거는 비워도 됩니다.
        </p>

        <div className="mt-4 space-y-4">
          {objectives.map((o, i) => {
            const sentence = buildObjectiveSentence(o);
            return (
              <div key={o.id} className="rounded-xl border bg-background p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">목표 {i + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeObjective(o.id)}
                    disabled={objectives.length <= 1}
                    aria-label={`목표 ${i + 1} 삭제`}
                    className="h-7 px-2 text-muted-foreground"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="flex flex-col gap-1 text-xs font-medium">
                    <span className="text-muted-foreground">조건 (선택)</span>
                    <Input
                      value={o.condition}
                      onChange={(e) => updateObjective(o.id, { condition: e.target.value })}
                      placeholder="예: 지도를 보고"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium">
                    <span className="text-muted-foreground">수행 행동</span>
                    <Input
                      value={o.behavior}
                      onChange={(e) => updateObjective(o.id, { behavior: e.target.value })}
                      placeholder="예: 현재 위치를 찾다"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium">
                    <span className="text-muted-foreground">준거 (선택)</span>
                    <Input
                      value={o.criterion}
                      onChange={(e) => updateObjective(o.id, { criterion: e.target.value })}
                      placeholder="예: 정확하게"
                    />
                  </label>
                </div>
                <div
                  className="mt-3 rounded-lg border border-dashed bg-muted/30 p-3 text-sm"
                  aria-live="polite"
                >
                  {sentence ? (
                    <span className="font-medium">{sentence}</span>
                  ) : (
                    <span className="text-muted-foreground">
                      수행 행동을 입력하면 목표 문장이 여기에 표시됩니다.
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addObjective}>
            <Plus className="h-4 w-4" aria-hidden />
            목표 추가
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={copyObjectives}
            disabled={objectiveSentences.length === 0}
          >
            {copiedKey === "objectives" ? (
              <Check className="h-4 w-4" aria-hidden />
            ) : (
              <Copy className="h-4 w-4" aria-hidden />
            )}
            {copiedKey === "objectives" ? "복사됨" : "목표 전체 복사"}
          </Button>
        </div>
      </section>

      {/* 교수학습 과정안 작성기 */}
      <section className="rounded-2xl border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="text-base font-semibold">교수학습 과정안 작성기</h3>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          도입-전개-정리 또는 가네 9절차로 과정안을 작성합니다. 아래 프리필 버튼으로 단계를 채운 뒤 활동을
          다듬으세요.
        </p>

        {/* 메타 */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-medium">
            <span className="text-muted-foreground">수업 주제 (선택)</span>
            <Input
              value={plan.title}
              onChange={(e) => setPlan((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="예: 분수의 덧셈"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">
            <span className="text-muted-foreground">대표 학습목표 (선택)</span>
            <Input
              value={plan.objective}
              onChange={(e) => setPlan((prev) => ({ ...prev, objective: e.target.value }))}
              placeholder="예: 분모가 같은 분수를 더할 수 있다."
            />
          </label>
        </div>

        {/* 프리필 */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">단계 프리필:</span>
          <Button type="button" variant="outline" size="sm" onClick={prefillBasic}>
            도입-전개-정리
          </Button>
          <Button
            type="button"
            variant={model === "gagne" ? "default" : "outline"}
            size="sm"
            onClick={prefillGagne}
          >
            가네 9절차
            {model === "gagne" && (
              <Badge variant="secondary" className="ml-1 text-[9px]">
                선택한 모델
              </Badge>
            )}
          </Button>
        </div>

        {/* 표 */}
        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[1.2fr_2fr_1.6fr_0.7fr_auto] gap-2 border-b pb-2 text-xs font-semibold text-muted-foreground">
              <span>단계</span>
              <span>교수학습 활동</span>
              <span>자료·유의점</span>
              <span>시간(분)</span>
              <span className="sr-only">삭제</span>
            </div>
            {plan.rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                프리필 버튼을 누르거나 &lsquo;행 추가&rsquo;로 과정안을 시작하세요.
              </p>
            ) : (
              <div className="divide-y">
                {plan.rows.map((r, i) => (
                  <div
                    key={r.id}
                    className="grid grid-cols-[1.2fr_2fr_1.6fr_0.7fr_auto] items-start gap-2 py-2"
                  >
                    <Input
                      value={r.stage}
                      onChange={(e) => updateRow(r.id, { stage: e.target.value })}
                      aria-label={`${i + 1}행 단계`}
                      placeholder="단계"
                    />
                    <Textarea
                      value={r.activity}
                      onChange={(e) => updateRow(r.id, { activity: e.target.value })}
                      aria-label={`${i + 1}행 교수학습 활동`}
                      placeholder="활동"
                      rows={2}
                      className="min-h-0 resize-y"
                    />
                    <Textarea
                      value={r.materials}
                      onChange={(e) => updateRow(r.id, { materials: e.target.value })}
                      aria-label={`${i + 1}행 자료·유의점`}
                      placeholder="자료·유의점"
                      rows={2}
                      className="min-h-0 resize-y"
                    />
                    <Input
                      value={r.minutes}
                      onChange={(e) => updateRow(r.id, { minutes: e.target.value })}
                      aria-label={`${i + 1}행 시간(분)`}
                      placeholder="분"
                      inputMode="numeric"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRow(r.id)}
                      aria-label={`${i + 1}행 삭제`}
                      className="h-8 px-2 text-muted-foreground"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-4 w-4" aria-hidden />
            행 추가
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={copyPlan}
            disabled={plan.rows.length === 0}
          >
            {copiedKey === "plan" ? (
              <Check className="h-4 w-4" aria-hidden />
            ) : (
              <Copy className="h-4 w-4" aria-hidden />
            )}
            {copiedKey === "plan" ? "복사됨" : "과정안 복사"}
          </Button>
        </div>
      </section>
    </div>
  );
}
