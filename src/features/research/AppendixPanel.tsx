"use client";

import { Plus, Trash2, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AppendixItem } from "@/types";

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `ap-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }
}

export default function AppendixPanel({
  items,
  readOnly,
  onChange,
}: {
  items: AppendixItem[];
  readOnly?: boolean;
  onChange: (next: AppendixItem[]) => void;
}) {
  function patch(id: string, fn: (a: AppendixItem) => AppendixItem) {
    onChange(items.map((a) => (a.id === id ? fn(a) : a)));
  }
  function add() {
    onChange([...items, { id: newId(), title: "", note: "" }]);
  }
  function remove(id: string) {
    onChange(items.filter((a) => a.id !== id));
  }

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-sm font-semibold">
          <Paperclip size={14} />
          부록
        </h4>
        <span className="text-[11px] text-muted-foreground">{items.length}개</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        설문지·측정도구·동의서·추가 표 등 본문에 넣기 어려운 자료를 목록으로 정리하세요. 제목과 메모(내용·위치·링크 등)를 적어둘 수 있습니다.
      </p>

      <div className="mt-4 space-y-3">
        {items.length === 0 && (
          <p className="rounded-lg border border-dashed bg-muted/30 px-3 py-6 text-center text-xs text-muted-foreground">
            아직 부록이 없습니다. 아래 &lsquo;부록 추가&rsquo;로 항목을 만들어 보세요.
          </p>
        )}
        {items.map((a, i) => (
          <div key={a.id} className="rounded-xl border bg-background/50 p-3.5">
            <div className="flex items-center gap-2">
              <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                부록 {String.fromCharCode(65 + i)}
              </span>
              <Input
                className="h-8 flex-1 text-sm font-semibold"
                value={a.title}
                placeholder="부록 제목 (예: 설문지 전문)"
                onChange={(e) => patch(a.id, (cur) => ({ ...cur, title: e.target.value }))}
                disabled={readOnly}
              />
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  aria-label="부록 삭제"
                  className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
            <Textarea
              className="mt-2 min-h-[56px] text-sm leading-relaxed"
              rows={2}
              value={a.note}
              placeholder="메모 — 내용 요약, 첨부 위치/링크, 비고 등"
              onChange={(e) => patch(a.id, (cur) => ({ ...cur, note: e.target.value }))}
              disabled={readOnly}
            />
          </div>
        ))}
      </div>

      {!readOnly && (
        <Button variant="outline" size="sm" className="mt-3" onClick={add}>
          <Plus size={14} className="mr-1" />
          부록 추가
        </Button>
      )}
    </div>
  );
}
