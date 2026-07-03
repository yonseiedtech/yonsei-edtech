"use client";

/**
 * 표 빌더 팝업 (2026-07-03 사용자 요청)
 *
 * 기존 '표 추가'가 고정 3×3 골격 텍스트만 삽입하던 것을 대체:
 *  - 표 이름(캡션) 별도 입력
 *  - 행·열 수를 팝업에서 조정(+/-), 행/열 개별 삭제
 *  - 셀 내용을 미리 입력한 뒤 본문에 삽입
 * 본문은 텍스트 기반이므로 셀 병합은 미지원 — 한글/워드로 옮긴 후 적용을 안내한다.
 */

import { useState } from "react";
import { Plus, Minus, X, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const MAX_ROWS = 12;
const MAX_COLS = 8;

function emptyGrid(rows: number, cols: number): string[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => ""));
}

export default function TableBuilderDialog({
  open,
  onOpenChange,
  onInsert,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** 완성된 표 텍스트(캡션 포함)를 현재 절에 단락으로 삽입 */
  onInsert: (text: string) => void;
}) {
  const [caption, setCaption] = useState("");
  const [grid, setGrid] = useState<string[][]>(() => emptyGrid(3, 3));

  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  function setCell(r: number, c: number, v: string) {
    setGrid((g) => g.map((row, ri) => (ri === r ? row.map((cell, ci) => (ci === c ? v : cell)) : row)));
  }
  function addRow() {
    if (rows >= MAX_ROWS) return;
    setGrid((g) => [...g, Array.from({ length: cols }, () => "")]);
  }
  function addCol() {
    if (cols >= MAX_COLS) return;
    setGrid((g) => g.map((row) => [...row, ""]));
  }
  function removeRow(r: number) {
    if (rows <= 1) return;
    setGrid((g) => g.filter((_, ri) => ri !== r));
  }
  function removeCol(c: number) {
    if (cols <= 1) return;
    setGrid((g) => g.map((row) => row.filter((_, ci) => ci !== c)));
  }

  function insert() {
    const lines = grid.map((row) => row.map((cell) => cell.trim() || "___").join(" | "));
    const text = `<표 _-_> ${caption.trim() || "표 제목"}\n${lines.join("\n")}`;
    onInsert(text);
    onOpenChange(false);
    // 다음 사용을 위해 초기화
    setCaption("");
    setGrid(emptyGrid(3, 3));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Table2 size={16} className="text-primary" />
            표 만들기
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <label className="block text-sm">
            <span className="font-semibold">표 이름 (캡션)</span>
            <span className="ml-1 text-xs text-muted-foreground">— 번호(&lt;표 _-_&gt;)는 최종 편집 시 확정</span>
            <Input
              className="mt-1"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="예: 집단별 사전·사후 기술통계"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold">크기</span>
            <span className="inline-flex items-center gap-1 rounded-lg border px-1 py-0.5">
              행 {rows}
              <button type="button" aria-label="행 추가" onClick={addRow} className="rounded p-1 hover:bg-muted"><Plus size={12} /></button>
              <button type="button" aria-label="행 줄이기" onClick={() => removeRow(rows - 1)} className="rounded p-1 hover:bg-muted"><Minus size={12} /></button>
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg border px-1 py-0.5">
              열 {cols}
              <button type="button" aria-label="열 추가" onClick={addCol} className="rounded p-1 hover:bg-muted"><Plus size={12} /></button>
              <button type="button" aria-label="열 줄이기" onClick={() => removeCol(cols - 1)} className="rounded p-1 hover:bg-muted"><Minus size={12} /></button>
            </span>
            <span className="text-muted-foreground">첫 행은 머리글로 쓰는 것을 권장합니다. 빈 셀은 ___ 로 삽입됩니다.</span>
          </div>

          {/* 그리드 편집 */}
          <div className="overflow-x-auto rounded-xl border p-2">
            <table className="border-separate border-spacing-1">
              <thead>
                <tr>
                  <th />
                  {Array.from({ length: cols }, (_, c) => (
                    <th key={c} className="text-center">
                      <button
                        type="button"
                        aria-label={`${c + 1}열 삭제`}
                        title="이 열 삭제"
                        onClick={() => removeCol(c)}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X size={11} />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.map((row, r) => (
                  <tr key={r}>
                    <td>
                      <button
                        type="button"
                        aria-label={`${r + 1}행 삭제`}
                        title="이 행 삭제"
                        onClick={() => removeRow(r)}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X size={11} />
                      </button>
                    </td>
                    {row.map((cell, c) => (
                      <td key={c}>
                        <Input
                          value={cell}
                          onChange={(e) => setCell(r, c, e.target.value)}
                          placeholder={r === 0 ? `머리글${c + 1}` : ""}
                          className={
                            "h-8 w-28 text-xs " + (r === 0 ? "font-semibold" : "")
                          }
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-muted-foreground">
            ※ 본문은 텍스트 기반이라 셀 병합은 지원하지 않습니다 — 최종 제출본(한글/워드)으로 옮긴 뒤 병합·서식을 적용하세요.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={insert}>
            <Table2 size={14} className="mr-1.5" />
            본문에 삽입
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
