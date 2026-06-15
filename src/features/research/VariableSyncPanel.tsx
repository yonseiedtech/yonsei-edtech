"use client";

/**
 * VariableSyncPanel — 연구 모형 ↔ 보고서 변인 동기화 패널 (M2, 2026-06)
 *
 * 연구 보고서 편집기(이론 단계)에 삽입. 사용자의 연구 모형(research_models)에서
 * 정의한 변인을 보고서로 import 하고, 반대로 보고서 변인을 모형으로 export 한다.
 * 같은 변인을 양쪽에 중복 입력하는 부담을 제거한다.
 *
 * 데이터 재사용:
 *  - 보고서 변인 = ResearchReport.variables (PaperVariables, 신규 옵셔널 필드)
 *  - 모형 변인   = research_models 컬렉션의 ResearchModelData (변인 노드)
 *  - 변환은 lib/research-variable-sync.ts
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownToLine, ArrowUpFromLine, Network, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { PaperVariables } from "@/types";
import { researchModelsApi } from "@/lib/research-models-api";
import {
  modelToVariables,
  variablesToModel,
  countVariables,
  sameVariables,
  hasAnyVariable,
  VARIABLE_KIND_LABELS,
  VARIABLE_SYNC_KINDS,
} from "@/lib/research-variable-sync";
import { EMPTY_RESEARCH_MODEL } from "@/types/research-model";
import VariablesInput from "./VariablesInput";

interface Props {
  userId: string;
  value: PaperVariables;
  onChange: (next: PaperVariables) => void;
  readOnly?: boolean;
}

export default function VariableSyncPanel({ userId, value, onChange, readOnly = false }: Props) {
  const qc = useQueryClient();
  const [exporting, setExporting] = useState(false);

  const { data: modelDoc, isLoading } = useQuery({
    queryKey: ["research-model", userId],
    queryFn: () => researchModelsApi.get(userId),
    enabled: !!userId,
    staleTime: 60_000,
  });

  const modelData = modelDoc?.data ?? EMPTY_RESEARCH_MODEL;
  const modelVars = modelToVariables(modelData);
  const modelCount = countVariables(modelVars);
  const reportCount = countVariables(value);

  // import: 모형 변인이 있고, 보고서와 다를 때만 활성
  const canImport = !readOnly && modelCount > 0 && !sameVariables(modelVars, value);
  // export: 보고서 변인이 있고, 모형과 다를 때만 활성
  const canExport = !readOnly && reportCount > 0 && !sameVariables(value, modelVars);

  function handleImport() {
    if (!canImport) return;
    onChange(modelVars);
    toast.success(`연구 모형에서 변인 ${modelCount}개를 가져왔습니다.`);
  }

  async function handleExport() {
    if (!canExport) return;
    setExporting(true);
    try {
      // 기존 모형의 엣지·위치를 보존하며 변인 노드만 동기화
      const nextModel = variablesToModel(value, modelData);
      await researchModelsApi.save(userId, nextModel);
      qc.invalidateQueries({ queryKey: ["research-model", userId] });
      toast.success(`보고서 변인 ${reportCount}개를 연구 모형으로 보냈습니다.`);
    } catch {
      toast.error("연구 모형으로 보내기에 실패했습니다.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* 모형 ↔ 보고서 동기화 헤더 */}
      <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Network size={16} className="text-primary" />
            <div>
              <p className="text-xs font-semibold text-foreground">연구 모형과 변인 동기화</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {isLoading
                  ? "연구 모형을 불러오는 중…"
                  : modelCount > 0
                    ? `연구 모형에 변인 ${modelCount}개가 있습니다.`
                    : "아직 연구 모형에 변인이 없습니다. ‘연구 모형 그리기’에서 변인을 추가하거나, 아래에 직접 입력 후 모형으로 보낼 수 있습니다."}
              </p>
            </div>
          </div>
          {!readOnly && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleImport}
                disabled={!canImport}
                title="연구 모형의 변인을 보고서로 가져옵니다 (보고서 변인을 덮어씁니다)."
                className="inline-flex h-8 items-center gap-1 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowDownToLine size={13} />
                모형에서 가져오기
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={!canExport || exporting}
                title="보고서 변인을 연구 모형으로 보냅니다 (모형의 관계선·배치는 유지)."
                className="inline-flex h-8 items-center gap-1 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {exporting ? <Loader2 size={13} className="animate-spin" /> : <ArrowUpFromLine size={13} />}
                모형으로 보내기
              </button>
            </div>
          )}
        </div>

        {/* 모형 변인 미리보기 (있을 때) */}
        {modelCount > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-primary/15 pt-2.5">
            {VARIABLE_SYNC_KINDS.map((kind) => {
              const labels = modelVars[kind] ?? [];
              if (labels.length === 0) return null;
              return (
                <span key={kind} className="inline-flex flex-wrap items-center gap-1 text-[11px]">
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
                    {VARIABLE_KIND_LABELS[kind]}
                  </span>
                  <span className="text-muted-foreground">{labels.join(", ")}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* 보고서 변인 직접 편집 (VariablesInput 재사용) */}
      {readOnly ? (
        hasAnyVariable(value) ? (
          <div className="flex flex-wrap gap-2">
            {VARIABLE_SYNC_KINDS.map((kind) => {
              const labels = value[kind] ?? [];
              if (labels.length === 0) return null;
              return (
                <span key={kind} className="inline-flex flex-wrap items-center gap-1 text-xs">
                  <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-foreground">
                    {VARIABLE_KIND_LABELS[kind]}
                  </span>
                  <span className="text-muted-foreground">{labels.join(", ")}</span>
                </span>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">등록된 변인이 없습니다.</p>
        )
      ) : (
        <VariablesInput value={value} onChange={onChange} />
      )}
    </div>
  );
}
