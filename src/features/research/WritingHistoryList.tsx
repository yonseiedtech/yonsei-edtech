"use client";

import { useState } from "react";
import type { WritingPaperHistory, WritingPaperChapterKey } from "@/types";
import { History, ChevronDown, ChevronUp } from "lucide-react";

const PAGE_SIZE = 30;

const CHAPTER_LABEL: Record<WritingPaperChapterKey, string> = {
  intro: "서론",
  background: "이론적 배경",
  method: "연구 방법",
  results: "연구 결과",
  conclusion: "결론",
};

interface Props {
  history: WritingPaperHistory[];
}

function fmtDate(iso: string): string {
  if (!iso) return "";
  const t = new Date(iso);
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  const hh = String(t.getHours()).padStart(2, "0");
  const mm = String(t.getMinutes()).padStart(2, "0");
  return `${t.getFullYear()}-${m}-${d} ${hh}:${mm}`;
}

export default function WritingHistoryList({ history }: Props) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);

  const visible = history.slice(0, PAGE_SIZE * page);
  const hasMore = visible.length < history.length;

  return (
    <section className="rounded-2xl border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2">
          <History size={14} className="text-muted-foreground" />
          <span className="text-sm font-semibold">작성 이력</span>
          <span className="text-[11px] text-muted-foreground">{history.length}건</span>
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <div className="border-t">
          {history.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">
              아직 저장 이력이 없습니다. 자동 저장이 일어나면 5분 단위로 기록됩니다.
            </p>
          ) : (
            <ul className="max-h-[420px] divide-y overflow-y-auto">
              {visible.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-2 px-4 py-2 text-xs">
                  <span className="font-mono text-muted-foreground">{fmtDate(h.savedAt)}</span>
                  <span className="flex-1 truncate text-foreground">
                    {h.title?.trim() || "(제목 미정)"}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {h.charCount.toLocaleString()}자
                  </span>
                  {h.lastChapter && (
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      {CHAPTER_LABEL[h.lastChapter]}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {hasMore && (
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              className="block w-full border-t py-2 text-center text-xs text-muted-foreground hover:bg-muted/50"
            >
              더 보기 ({Math.min(PAGE_SIZE, history.length - visible.length)}건)
            </button>
          )}
        </div>
      )}
    </section>
  );
}
