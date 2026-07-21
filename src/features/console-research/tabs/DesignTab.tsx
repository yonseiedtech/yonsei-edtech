"use client";

import { useState } from "react";
import type { ResearchDesign } from "@/types";
import {
  designSectionStatus,
  RESEARCH_DESIGN_APPROACH_LABELS,
} from "@/types/research-design";
import { buildResearchMethodDraft } from "@/lib/research-design-draft";
import { cn } from "@/lib/utils";
import { DetailBlock } from "../components/DetailBlock";
import { KV } from "../components/KV";
import { ProgressBar } from "../components/ProgressBar";
import { ToggleFullButton } from "../components/ToggleFullButton";
import { formatDate } from "../utils";

const DESIGN_SECTION_LABELS: { key: keyof ReturnType<typeof designSectionStatus>; label: string }[] = [
  { key: "approach", label: "유형·접근" },
  { key: "model", label: "연구 모형" },
  { key: "participants", label: "연구 대상" },
  { key: "procedure", label: "연구 절차" },
  { key: "instruments", label: "연구 도구" },
  { key: "program", label: "프로그램" },
  { key: "collectionAnalysis", label: "수집·분석" },
];

export function DesignTab({
  design,
  designProgress,
}: {
  design?: ResearchDesign;
  designProgress: number;
}) {
  const [showFull, setShowFull] = useState(false);
  if (!design) {
    return (
      <DetailBlock title="연구 설계">
        <p className="text-xs text-muted-foreground">아직 작성된 연구 설계가 없습니다.</p>
      </DetailBlock>
    );
  }
  const status = designSectionStatus(design);
  const approachLabel = design.approach ? RESEARCH_DESIGN_APPROACH_LABELS[design.approach] : "미선택";
  return (
    <div className="space-y-3">
      <DetailBlock title="연구 설계">
        <div className="space-y-2 text-xs">
          <KV label="연구 접근" value={approachLabel} />
          <KV label="연구방법" value={design.methodName || "—"} />
          <KV label="연구 모형" value={design.modelId ? "연결됨" : "미연결"} />
          <div className="pt-1">
            <div className="flex flex-wrap gap-1">
              {DESIGN_SECTION_LABELS.map(({ key, label }) => (
                <span
                  key={key}
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                    status[key]
                      ? "bg-success/10 text-success"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className="pt-1 text-[11px] text-muted-foreground">
            마지막 수정: {formatDate(design.updatedAt ?? design.lastSavedAt)}
          </div>
          <div className="pt-1">
            <ProgressBar value={designProgress} />
            <div className="mt-1 text-[10px] text-muted-foreground">진행률 {designProgress}%</div>
          </div>
          <div className="pt-2">
            <ToggleFullButton showFull={showFull} setShowFull={setShowFull} />
          </div>
        </div>
      </DetailBlock>

      {showFull && (
        <DetailBlock title="연구방법 초안">
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-[11px] leading-relaxed text-foreground">
            {buildResearchMethodDraft(design)}
          </pre>
        </DetailBlock>
      )}
    </div>
  );
}
