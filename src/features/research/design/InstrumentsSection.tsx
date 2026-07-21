"use client";

/** 5. 연구 도구 (+ 측정도구 picker) (2026-07-13, M1 분리 — 동작·UI 불변) */

import { useMemo, useState } from "react";
import { Link2, X, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ArchiveMeasurementTool } from "@/types";
import type { ResearchDesignInstrument } from "@/types/research-design";
import { Field } from "./Section";
import type { FormState } from "./types";

export function InstrumentsSection({
  form,
  readOnly,
  isQual,
  measurements,
  onQualChange,
  onAddInstrument,
  onUpdateInstrument,
  onRemoveInstrument,
}: {
  form: FormState;
  readOnly: boolean;
  isQual: boolean;
  measurements: ArchiveMeasurementTool[];
  onQualChange: (v: string) => void;
  onAddInstrument: (measurementId?: string, name?: string) => void;
  onUpdateInstrument: (id: string, patch: Partial<ResearchDesignInstrument>) => void;
  onRemoveInstrument: (id: string) => void;
}) {
  if (isQual) {
    return (
      <Field label="질적 도구 — 면담 프로토콜 개요·델파이 패널 구성·질문 초안">
        <Textarea value={form.qualInstruments} disabled={readOnly}
          onChange={(e) => onQualChange(e.target.value)}
          placeholder={`예:\n- 반구조화 면담 프로토콜(12문항): 도입·경험·의미·마무리 4부\n- 델파이 패널: 교육공학 전문가 8인, 2라운드\n- 주요 질문 초안: ...`}
          rows={6} />
      </Field>
    );
  }

  return (
    <>
      <p className="mb-2 text-xs text-muted-foreground">
        아카이브 측정도구를 선택하면 문항수·신뢰도를 참고할 수 있습니다. 자체 개발 도구는 &lsquo;직접 추가&rsquo; 후 타당화 절차를 적어 주세요.
      </p>
      {!readOnly && (
        <MeasurementPicker
          measurements={measurements}
          onPick={(m) => onAddInstrument(m.id, m.name)}
          onAddCustom={() => onAddInstrument(undefined, "")}
        />
      )}
      <ul className="mt-3 space-y-2">
        {form.instruments.map((it) => {
          const m = it.measurementId ? measurements.find((x) => x.id === it.measurementId) : undefined;
          return (
            <li key={it.id} className="rounded-lg border bg-card/60 p-2.5">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Input value={it.name} disabled={readOnly || !!it.measurementId}
                    onChange={(e) => onUpdateInstrument(it.id, { name: e.target.value })}
                    placeholder="도구 이름" className="h-8 text-sm" />
                  {m && (
                    <p className="text-[11px] text-muted-foreground">
                      {m.itemCount ? `${m.itemCount}문항` : ""}
                      {m.reliability ? ` · 신뢰도 ${m.reliability}` : ""}
                      {m.author ? ` · ${m.author}` : ""}
                    </p>
                  )}
                  <Textarea value={it.plan} disabled={readOnly}
                    onChange={(e) => onUpdateInstrument(it.id, { plan: e.target.value })}
                    placeholder={it.measurementId ? "이 도구의 사용·채점 계획" : "자체 개발 계획 — 문항 구성·타당화 절차(내용타당도·요인분석 등)"}
                    rows={2} className="text-xs" />
                </div>
                {!readOnly && (
                  <button type="button" onClick={() => onRemoveInstrument(it.id)}
                    className="mt-1 rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** 측정도구 검색 picker */
function MeasurementPicker({
  measurements,
  onPick,
  onAddCustom,
}: {
  measurements: ArchiveMeasurementTool[];
  onPick: (m: ArchiveMeasurementTool) => void;
  onAddCustom: () => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return measurements.slice(0, 30);
    return measurements
      .filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          (m.originalName ?? "").toLowerCase().includes(query) ||
          (m.author ?? "").toLowerCase().includes(query),
      )
      .slice(0, 30);
  }, [measurements, q]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <button type="button" onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground">
          <Link2 size={12} /> 아카이브 측정도구 추가
        </button>
        {open && (
          <div className="absolute left-0 top-full z-10 mt-1 w-80 rounded-lg border bg-card p-2 shadow-lg">
            <div className="mb-2 flex items-center gap-1">
              <Input value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="측정도구 검색..." className="h-8 text-xs" autoFocus />
              <button type="button" onClick={() => setOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"><X size={14} /></button>
            </div>
            <div className="max-h-56 space-y-0.5 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="py-3 text-center text-xs text-muted-foreground">검색 결과 없음</p>
              ) : (
                filtered.map((m) => (
                  <button key={m.id} type="button"
                    onClick={() => { onPick(m); setOpen(false); setQ(""); }}
                    className="flex w-full flex-col items-start rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted">
                    <span className="font-medium">{m.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {[m.itemCount ? `${m.itemCount}문항` : "", m.reliability ?? "", m.author ?? ""].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={onAddCustom}>
        <Plus size={12} className="mr-1" /> 자체 개발 도구 직접 추가
      </Button>
    </div>
  );
}
