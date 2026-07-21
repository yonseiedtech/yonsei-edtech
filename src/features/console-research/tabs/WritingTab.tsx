"use client";

import { useState } from "react";
import type { WritingPaper } from "@/types";
import { DetailBlock } from "../components/DetailBlock";
import { KV } from "../components/KV";
import { ProgressBar } from "../components/ProgressBar";
import { ToggleFullButton } from "../components/ToggleFullButton";
import { formatDate, formatHours } from "../utils";

const WRITING_CHAPTER_LABELS: Record<string, string> = {
  intro: "서론",
  background: "이론적 배경",
  method: "연구 방법",
  results: "연구 결과",
  conclusion: "결론",
};
const WRITING_CHAPTER_KEYS = ["intro", "background", "method", "results", "conclusion"] as const;

export function WritingTab({
  writing,
  charCount,
  writingMinutes,
  writingSessionCount,
}: {
  writing?: WritingPaper;
  charCount: number;
  writingMinutes: number;
  writingSessionCount: number;
}) {
  const [showFull, setShowFull] = useState(false);
  if (!writing) {
    return (
      <DetailBlock title="논문 작성">
        <p className="text-xs text-muted-foreground">아직 논문 작성을 시작하지 않았습니다.</p>
      </DetailBlock>
    );
  }
  const chapters = writing.chapters ?? {};
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <DetailBlock title="논문 정보">
          <div className="space-y-2 text-xs">
            <KV label="제목" value={writing.title || "(제목 없음)"} />
            <KV label="총 글자수" value={`${charCount.toLocaleString()}자`} />
            <KV label="작성 타이머" value={`${writingSessionCount}회 · ${formatHours(writingMinutes)}`} />
            <div className="pt-1 text-[11px] text-muted-foreground">
              마지막 저장: {formatDate(writing.updatedAt ?? writing.lastSavedAt)}
            </div>
            <div className="pt-2">
              <ToggleFullButton showFull={showFull} setShowFull={setShowFull} />
            </div>
          </div>
        </DetailBlock>
        <DetailBlock title="장별 진행">
          <div className="space-y-1.5 text-xs">
            {WRITING_CHAPTER_KEYS.map((key) => {
              const text = chapters[key] ?? "";
              const len = text.length;
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 text-muted-foreground">
                    {WRITING_CHAPTER_LABELS[key] ?? key}
                  </span>
                  <div className="flex-1">
                    <ProgressBar value={Math.min(100, (len / 1500) * 100)} />
                  </div>
                  <span className="w-16 shrink-0 text-right text-[11px] text-muted-foreground">
                    {len.toLocaleString()}자
                  </span>
                </div>
              );
            })}
            <p className="pt-1 text-[10px] text-muted-foreground">
              ※ 1,500자를 100%로 환산한 시각화입니다.
            </p>
          </div>
        </DetailBlock>
      </div>

      {showFull && (
        <DetailBlock title="전체 본문">
          <div className="space-y-3">
            {WRITING_CHAPTER_KEYS.map((key) => {
              const text = (chapters[key] ?? "").trim();
              return (
                <div key={key}>
                  <h4 className="mb-1 flex items-center gap-2 text-[11px] font-semibold text-foreground">
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">
                      {WRITING_CHAPTER_LABELS[key] ?? key}
                    </span>
                    <span className="text-muted-foreground">{text.length.toLocaleString()}자</span>
                  </h4>
                  {text ? (
                    <pre className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-[11px] leading-relaxed text-foreground">
                      {text}
                    </pre>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">(아직 작성된 내용이 없습니다)</p>
                  )}
                </div>
              );
            })}
          </div>
        </DetailBlock>
      )}
    </div>
  );
}
