"use client";

/**
 * ResearchQuestionSyncPanel — 연구 모형 → 연구문제 자동 생성·반영 패널 (M4, 2026-06)
 *
 * 연구 보고서/계획서 편집기에 삽입. 사용자의 연구 모형(research_models)에서
 * 정의한 변인·관계 패턴을 읽어 연구문제 문장을 자동 생성하고, 보고서/계획서의
 * 연구문제 목록으로 가져온다(import). 가져온 뒤에는 직접 편집·추가·삭제할 수 있다.
 *
 * 데이터 재사용 (M2 VariableSyncPanel 패턴 차용):
 *  - 연구문제 = ResearchReport/Proposal.researchQuestions (string[], 신규 옵셔널 필드)
 *  - 모형     = research_models 컬렉션의 ResearchModelData
 *  - 생성 로직 = lib/research-question-generator.ts
 */

import { useQuery } from "@tanstack/react-query";
import { HelpCircle, ListPlus, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { researchModelsApi } from "@/lib/research-models-api";
import {
  generateQuestions,
  QUESTION_PATTERN_LABELS,
  sameQuestions,
} from "@/lib/research-question-generator";
import { EMPTY_RESEARCH_MODEL } from "@/types/research-model";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  userId: string;
  value: string[];
  onChange: (next: string[]) => void;
  readOnly?: boolean;
}

export default function ResearchQuestionSyncPanel({
  userId,
  value,
  onChange,
  readOnly = false,
}: Props) {
  const { data: modelDoc, isLoading } = useQuery({
    queryKey: ["research-model", userId],
    queryFn: () => researchModelsApi.get(userId),
    enabled: !!userId,
    staleTime: 60_000,
  });

  const modelData = modelDoc?.data ?? EMPTY_RESEARCH_MODEL;
  const generated = generateQuestions(modelData);
  const generatedTexts = generated.map((q) => q.text);

  const current = value.map((s) => s.trim()).filter(Boolean);
  // import: 모형으로 만든 연구문제가 있고, 현재 목록과 다를 때만 활성
  const canImport = !readOnly && generatedTexts.length > 0 && !sameQuestions(generatedTexts, current);
  // append: 생성 결과 중 아직 목록에 없는 항목이 하나라도 있을 때
  const newOnes = generatedTexts.filter((t) => !current.includes(t));
  const canAppend = !readOnly && newOnes.length > 0 && current.length > 0;

  function handleImport() {
    if (!canImport) return;
    onChange(generatedTexts);
    toast.success(`연구 모형에서 연구문제 ${generatedTexts.length}개를 가져왔습니다.`);
  }

  function handleAppend() {
    if (!canAppend) return;
    onChange([...value, ...newOnes]);
    toast.success(`연구문제 ${newOnes.length}개를 추가했습니다.`);
  }

  function setAt(idx: number, text: string) {
    onChange(value.map((q, i) => (i === idx ? text : q)));
  }
  function removeAt(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }
  function addEmpty() {
    onChange([...value, ""]);
  }

  return (
    <div className="space-y-4">
      {/* 모형 → 연구문제 동기화 헤더 */}
      <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <HelpCircle size={16} className="text-primary" />
            <div>
              <p className="text-xs font-semibold text-foreground">연구 모형에서 연구문제 생성</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {isLoading
                  ? "연구 모형을 불러오는 중…"
                  : generatedTexts.length > 0
                    ? `모형의 변인·관계로 연구문제 ${generatedTexts.length}개를 만들 수 있습니다.`
                    : "‘연구 모형 그리기’에서 변인(독립·종속 등)과 관계를 추가하면 연구문제가 자동 생성됩니다."}
              </p>
            </div>
          </div>
          {!readOnly && generatedTexts.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleImport}
                disabled={!canImport}
                title="생성된 연구문제로 목록을 덮어씁니다."
                className="inline-flex h-8 items-center gap-1 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? <Loader2 size={13} className="animate-spin" /> : <ListPlus size={13} />}
                가져오기(덮어쓰기)
              </button>
              <button
                type="button"
                onClick={handleAppend}
                disabled={!canAppend}
                title="기존 목록은 두고 새 연구문제만 아래에 추가합니다."
                className="inline-flex h-8 items-center gap-1 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={13} />
                추가만
              </button>
            </div>
          )}
        </div>

        {/* 생성 결과 미리보기 */}
        {generatedTexts.length > 0 && (
          <ol className="mt-2.5 space-y-1 border-t border-primary/15 pt-2.5">
            {generated.map((q, i) => (
              <li key={q.id} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <span className="font-semibold text-primary">{i + 1}.</span>
                <span className="flex-1 leading-relaxed">
                  {q.text}
                  <span className="ml-1 rounded bg-primary/10 px-1 py-0.5 text-[10px] font-medium text-primary">
                    {QUESTION_PATTERN_LABELS[q.pattern]}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* 연구문제 목록 직접 편집 */}
      {readOnly ? (
        current.length > 0 ? (
          <ol className="space-y-1.5">
            {current.map((q, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <span className="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-bold text-muted-foreground">
                  {i + 1}
                </span>
                <span className="flex-1 leading-relaxed">{q}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-xs text-muted-foreground">등록된 연구문제가 없습니다.</p>
        )
      ) : (
        <div className="space-y-2">
          {value.map((q, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-2.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[11px] font-bold text-primary">
                {i + 1}
              </span>
              <Textarea
                value={q}
                onChange={(e) => setAt(i, e.target.value)}
                placeholder="연구문제를 입력하거나 위에서 가져오세요…"
                rows={2}
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label={`연구문제 ${i + 1} 삭제`}
                className="mt-2 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/5 hover:text-destructive"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addEmpty}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-dashed border-input px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            <Plus size={13} />
            연구문제 추가
          </button>
        </div>
      )}
    </div>
  );
}
