"use client";

import { useState } from "react";
import type { ResearchReport } from "@/types";
import { DetailBlock } from "../components/DetailBlock";
import { KV } from "../components/KV";
import { ProgressBar } from "../components/ProgressBar";
import { ToggleFullButton } from "../components/ToggleFullButton";
import { FullField } from "../components/FullField";
import { formatDate } from "../utils";

export function ReportTab({
  report,
  reportProgress,
}: {
  report?: ResearchReport;
  reportProgress: number;
}) {
  const [showFull, setShowFull] = useState(false);
  if (!report) {
    return (
      <DetailBlock title="연구 보고서">
        <p className="text-xs text-muted-foreground">아직 작성된 보고서가 없습니다.</p>
      </DetailBlock>
    );
  }
  return (
    <div className="space-y-3">
      <DetailBlock title="연구 보고서">
        <div className="space-y-2 text-xs">
          <KV label="대상 학습자" value={report.fieldAudience} />
          <KV label="교육 형태" value={report.fieldFormat} />
          <KV label="교과/주제" value={report.fieldSubject} />
          <KV
            label="현상"
            value={(report.problemPhenomena ?? [])
              .filter((p) => p.trim())
              .slice(0, 2)
              .join(" / ")}
          />
          <KV label="이론 카드" value={`${report.theoryCards?.length ?? 0}개`} />
          <KV
            label="선행 연구 그룹"
            value={`${report.priorResearchGroups?.length ?? 0}개 / 논문 ${report.priorResearchPaperIds?.length ?? 0}편 인용`}
          />
          <div className="pt-1 text-[11px] text-muted-foreground">
            마지막 수정: {formatDate(report.updatedAt)}
          </div>
          <div className="pt-1">
            <ProgressBar value={reportProgress} />
            <div className="mt-1 text-[10px] text-muted-foreground">진행률 {reportProgress}%</div>
          </div>
          <div className="pt-2">
            <ToggleFullButton showFull={showFull} setShowFull={setShowFull} />
          </div>
        </div>
      </DetailBlock>

      {showFull && (
        <DetailBlock title="연구 보고서 전체">
          <div className="space-y-3 text-[11px]">
            {/* 1. 교육 현장 */}
            <FullField label="대상 학습자" value={report.fieldAudience} />
            <FullField label="교육 형태" value={report.fieldFormat} />
            <FullField label="교과/주제" value={report.fieldSubject} />

            {/* 1.2 문제: 현상·근거·원인 */}
            <FullField
              label="관찰된 현상"
              value={(report.problemPhenomena ?? []).filter((x) => x.trim()).join("\n\n")}
            />
            {(report.problemEvidences ?? []).length > 0 && (
              <div>
                <p className="mb-1 text-muted-foreground">근거</p>
                <div className="space-y-1">
                  {(report.problemEvidences ?? []).map((e) => (
                    <pre
                      key={e.id}
                      className="whitespace-pre-wrap rounded-md border bg-muted/30 p-2 leading-relaxed text-foreground"
                    >
                      {[e.type && `[${e.type}]`, e.content].filter(Boolean).join(" ")}
                    </pre>
                  ))}
                </div>
              </div>
            )}
            {(report.problemCauses ?? []).length > 0 && (
              <div>
                <p className="mb-1 text-muted-foreground">원인</p>
                <div className="space-y-1">
                  {(report.problemCauses ?? []).map((c) => (
                    <pre
                      key={c.id}
                      className="whitespace-pre-wrap rounded-md border bg-muted/30 p-2 leading-relaxed text-foreground"
                    >
                      {[c.type && `[${c.type}]`, c.content].filter(Boolean).join(" ")}
                    </pre>
                  ))}
                </div>
              </div>
            )}

            {/* 1.3 영향·중요성 */}
            <FullField label="문제의 영향" value={report.problemImpact} />
            <FullField label="문제의 중요성" value={report.problemImportance} />

            {/* 1.4 범위 */}
            <FullField label="주요 대상 (범위)" value={report.scopeAudience} />
            <FullField label="초점 상황/맥락" value={report.scopeContext} />
            <FullField label="제외/한정 범위" value={report.scopeExclusion} />

            {/* 1.5 측정 가능성 */}
            {(report.problemMeasurements ?? []).length > 0 && (
              <div>
                <p className="mb-1 text-muted-foreground">측정 가능성 (요소 + 지표)</p>
                <div className="space-y-1">
                  {(report.problemMeasurements ?? []).map((m) => (
                    <pre
                      key={m.id}
                      className="whitespace-pre-wrap rounded-md border bg-muted/30 p-2 leading-relaxed text-foreground"
                    >
                      {`요소: ${m.factor || "—"}\n지표: ${m.indicator || "—"}`}
                    </pre>
                  ))}
                </div>
              </div>
            )}

            {/* 1.5 진단 (분석형) */}
            <FullField label="시도한 해결책과 결과" value={report.diagnosisAttempts} />
            <FullField label="현재 vs 도달하려는 상태의 격차" value={report.diagnosisGap} />
            <FullField label="핵심 원인 (이론 선택의 근거)" value={report.diagnosisPrimaryCause} />

            {/* 2. 이론 카드 */}
            {(report.theoryCards ?? []).length > 0 && (
              <div>
                <p className="mb-1 text-muted-foreground">이론 카드</p>
                <div className="space-y-2">
                  {(report.theoryCards ?? []).map((c) => (
                    <pre
                      key={c.id}
                      className="whitespace-pre-wrap rounded-md border bg-muted/30 p-2 leading-relaxed text-foreground"
                    >
                      {[
                        c.name && `이론: ${c.name}`,
                        c.scholar && `학자: ${c.scholar}${c.year ? ` (${c.year})` : ""}`,
                        c.selectionReason && `선택 이유:\n${c.selectionReason}`,
                        c.problemLink && `문제 연결:\n${c.problemLink}`,
                      ]
                        .filter(Boolean)
                        .join("\n\n")}
                    </pre>
                  ))}
                </div>
              </div>
            )}

            {/* 3. 선행연구 */}
            <FullField label="선행연구 분석" value={report.priorResearchAnalysis} />
            {(report.priorResearchGroups ?? []).length > 0 && (
              <div>
                <p className="mb-1 text-muted-foreground">선행연구 그룹</p>
                <div className="space-y-2">
                  {(report.priorResearchGroups ?? []).map((g) => (
                    <pre
                      key={g.id}
                      className="whitespace-pre-wrap rounded-md border bg-muted/30 p-2 leading-relaxed text-foreground"
                    >
                      {[
                        g.name && `그룹명: ${g.name}`,
                        `논문 수: ${g.paperIds?.length ?? 0}편`,
                        g.integration && `통합 분석:\n${g.integration}`,
                        g.insight && `인사이트:\n${g.insight}`,
                      ]
                        .filter(Boolean)
                        .join("\n\n")}
                    </pre>
                  ))}
                </div>
              </div>
            )}
            {(report.priorResearchPaperIds ?? []).length > 0 && (
              <p className="text-muted-foreground">
                인용된 논문 총 {report.priorResearchPaperIds.length}편
              </p>
            )}
          </div>
        </DetailBlock>
      )}
    </div>
  );
}
