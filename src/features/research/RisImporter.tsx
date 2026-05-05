"use client";

import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileUp } from "lucide-react";
import { toast } from "sonner";
import type { ResearchPaper, PaperType } from "@/types";

interface ParsedRecord {
  paperType: PaperType;
  title: string;
  authors?: string;
  year?: number;
  venue?: string;
  doi?: string;
  url?: string;
  tags?: string[];
  findings?: string;
  selected: boolean;
  _rawIndex: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImport: (records: Partial<ResearchPaper>[]) => Promise<void> | void;
}

function parseRis(content: string): ParsedRecord[] {
  const records: ParsedRecord[] = [];
  const blocks = content.split(/\bER\s*-\s*\r?\n?/);
  blocks.forEach((block, idx) => {
    const lines = block.split(/\r?\n/);
    let paperType: PaperType = "academic";
    let title: string | undefined;
    const authors: string[] = [];
    let year: number | undefined;
    let venue: string | undefined;
    let venueAlt: string | undefined;
    let publisher: string | undefined;
    let doi: string | undefined;
    let url: string | undefined;
    const keywords: string[] = [];
    let abstract: string | undefined;
    let isThesisType = false;
    let hasContent = false;

    for (const raw of lines) {
      const m = raw.match(/^([A-Z][A-Z0-9])\s*-\s*(.*)$/);
      if (!m) continue;
      const tag = m[1];
      const value = m[2].trim();
      if (!value) continue;
      hasContent = true;

      switch (tag) {
        case "TY":
          if (value === "THES") {
            paperType = "thesis";
            isThesisType = true;
          } else {
            paperType = "academic";
          }
          break;
        case "TI":
        case "T1":
          title = value;
          break;
        case "AU":
        case "A1":
          authors.push(value);
          break;
        case "PY":
        case "Y1": {
          const y = parseInt(value.slice(0, 4), 10);
          if (!isNaN(y)) year = y;
          break;
        }
        case "JO":
        case "JF":
        case "T2":
          venue = value;
          break;
        case "JA":
          venueAlt = value;
          break;
        case "PB":
          publisher = value;
          break;
        case "DO":
          doi = value;
          break;
        case "UR":
          url = value;
          break;
        case "KW":
          keywords.push(value);
          break;
        case "AB":
        case "N2":
          abstract = value;
          break;
      }
    }

    if (!hasContent || !title) return;

    const finalVenue = isThesisType ? publisher ?? venue : venue ?? venueAlt;

    records.push({
      paperType,
      title,
      authors: authors.length > 0 ? authors.join(", ") : undefined,
      year,
      venue: finalVenue,
      doi,
      url,
      tags: keywords.length > 0 ? Array.from(new Set(keywords)) : undefined,
      findings: abstract,
      selected: true,
      _rawIndex: idx,
    });
  });
  return records;
}

export default function RisImporter({ open, onOpenChange, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [records, setRecords] = useState<ParsedRecord[]>([]);
  const [importing, setImporting] = useState(false);

  function reset() {
    setRecords([]);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseRis(text);
      if (parsed.length === 0) {
        toast.error("RIS 레코드를 찾지 못했습니다. 파일 형식을 확인해주세요.");
        return;
      }
      setRecords(parsed);
      toast.success(`${parsed.length}건 파싱 완료`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "파일 읽기 실패");
    }
  }

  function toggle(i: number) {
    setRecords((prev) => prev.map((r, idx) => (idx === i ? { ...r, selected: !r.selected } : r)));
  }
  function toggleAll(v: boolean) {
    setRecords((prev) => prev.map((r) => ({ ...r, selected: v })));
  }

  async function handleImport() {
    const chosen = records.filter((r) => r.selected);
    if (chosen.length === 0) {
      toast.error("최소 1건을 선택해주세요.");
      return;
    }
    setImporting(true);
    try {
      await onImport(
        chosen.map((r) => ({
          paperType: r.paperType,
          title: r.title,
          authors: r.authors,
          year: r.year,
          venue: r.venue,
          doi: r.doi,
          url: r.url,
          tags: r.tags,
          findings: r.findings,
          readStatus: "to_read",
        }))
      );
      toast.success(`${chosen.length}건 등록 완료`);
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "등록 실패");
    } finally {
      setImporting(false);
    }
  }

  const selectedCount = records.filter((r) => r.selected).length;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>RIS 파일 임포트</DialogTitle>
          <DialogDescription>
            EndNote, Mendeley, Zotero 등에서 내보낸 .ris 파일을 업로드하면 일괄 등록됩니다.
          </DialogDescription>
        </DialogHeader>

        {records.length === 0 ? (
          <div className="mt-4">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed bg-muted/30 p-10 hover:bg-muted/50">
              <FileUp size={28} className="text-muted-foreground" />
              <span className="text-sm font-medium">.ris 또는 .txt 파일 선택</span>
              <span className="text-xs text-muted-foreground">
                EndNote/Mendeley/Zotero export 호환
              </span>
              <input
                ref={fileRef}
                type="file"
                accept=".ris,.txt,text/plain"
                className="hidden"
                onChange={handleFile}
              />
            </label>
          </div>
        ) : (
          <div className="mt-4 max-h-[50vh] overflow-y-auto">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-semibold">
                {selectedCount} / {records.length} 선택됨
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => toggleAll(true)}
                >
                  전체 선택
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => toggleAll(false)}
                >
                  전체 해제
                </button>
              </div>
            </div>
            <ul className="space-y-2">
              {records.map((r, i) => (
                <li
                  key={i}
                  className={`rounded-lg border p-3 transition ${r.selected ? "border-primary/40 bg-primary/5" : "bg-card"}`}
                >
                  <label className="flex cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      checked={r.selected}
                      onChange={() => toggle(i)}
                      className="mt-0.5 h-4 w-4 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">
                        {r.paperType === "thesis" ? "학위논문" : "학술논문"}
                        {r.year ? ` · ${r.year}` : ""}
                        {r.venue ? ` · ${r.venue}` : ""}
                      </p>
                      <p className="truncate text-sm font-semibold">{r.title}</p>
                      {r.authors && (
                        <p className="truncate text-xs text-muted-foreground">{r.authors}</p>
                      )}
                      {r.tags && r.tags.length > 0 && (
                        <p className="mt-1 truncate text-[10px] text-muted-foreground">
                          #{r.tags.slice(0, 5).join(" #")}
                        </p>
                      )}
                    </div>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
            취소
          </Button>
          {records.length > 0 && (
            <Button onClick={handleImport} disabled={importing || selectedCount === 0}>
              <Upload size={14} className="mr-1" />
              {importing ? "등록 중..." : `${selectedCount}건 등록`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
