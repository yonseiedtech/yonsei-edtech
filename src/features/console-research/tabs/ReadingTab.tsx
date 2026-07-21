"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import type { ResearchPaper } from "@/types";
import { DetailBlock } from "../components/DetailBlock";
import { KV } from "../components/KV";
import { ToggleFullButton } from "../components/ToggleFullButton";
import { formatHours } from "../utils";

export function ReadingTab({
  papers,
  readingMinutes,
  readingSessionCount,
}: {
  papers: ResearchPaper[];
  readingMinutes: number;
  readingSessionCount: number;
}) {
  const [showFull, setShowFull] = useState(false);
  if (papers.length === 0 && readingSessionCount === 0) {
    return (
      <DetailBlock title="논문 읽기">
        <p className="text-xs text-muted-foreground">아직 정리한 논문이 없습니다.</p>
      </DetailBlock>
    );
  }
  const visible = showFull ? papers : papers.slice(0, 5);
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <DetailBlock title="요약">
          <div className="space-y-2 text-xs">
            <KV label="정리한 논문" value={`${papers.length}편`} />
            <KV label="읽기 타이머" value={`${readingSessionCount}회 · ${formatHours(readingMinutes)}`} />
            <div className="pt-2">
              <ToggleFullButton showFull={showFull} setShowFull={setShowFull} />
            </div>
          </div>
        </DetailBlock>
        <DetailBlock
          title={`정리 논문 (${showFull ? `${papers.length}편 전체` : papers.length > 5 ? "최근 5편" : `${papers.length}편`})`}
        >
          {papers.length === 0 ? (
            <p className="text-xs text-muted-foreground">정리된 논문이 없습니다.</p>
          ) : (
            <ul className="space-y-1.5 text-xs">
              {visible.map((p) => (
                <li key={p.id} className="flex items-start gap-1.5">
                  <BookOpen size={11} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.title || "(제목 없음)"}</p>
                    {(p.authors || p.year) && (
                      <p className="truncate text-[10px] text-muted-foreground">
                        {[p.authors, p.year].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DetailBlock>
      </div>

      {showFull && papers.length > 0 && (
        <div className="space-y-2">
          {papers.map((p) => (
            <DetailBlock
              key={p.id}
              title={`${p.title || "(제목 없음)"}${p.year ? ` · ${p.year}` : ""}`}
            >
              <div className="space-y-1 text-[11px]">
                {p.authors && <KV label="저자" value={p.authors} />}
                {p.venue && <KV label="출처" value={p.venue} />}
                {p.methodology && (
                  <div>
                    <p className="text-muted-foreground">방법론</p>
                    <pre className="mt-0.5 whitespace-pre-wrap rounded-md border bg-muted/30 p-2 text-foreground">
                      {p.methodology}
                    </pre>
                  </div>
                )}
                {p.findings && (
                  <div>
                    <p className="text-muted-foreground">주요 결과</p>
                    <pre className="mt-0.5 whitespace-pre-wrap rounded-md border bg-muted/30 p-2 text-foreground">
                      {p.findings}
                    </pre>
                  </div>
                )}
                {p.insights && (
                  <div>
                    <p className="text-muted-foreground">인사이트</p>
                    <pre className="mt-0.5 whitespace-pre-wrap rounded-md border bg-muted/30 p-2 text-foreground">
                      {p.insights}
                    </pre>
                  </div>
                )}
                {p.myConnection && (
                  <div>
                    <p className="text-muted-foreground">내 연구와의 연결</p>
                    <pre className="mt-0.5 whitespace-pre-wrap rounded-md border bg-muted/30 p-2 text-foreground">
                      {p.myConnection}
                    </pre>
                  </div>
                )}
              </div>
            </DetailBlock>
          ))}
        </div>
      )}
    </div>
  );
}
