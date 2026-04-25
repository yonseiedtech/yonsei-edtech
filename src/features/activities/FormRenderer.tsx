"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, CalendarRange, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import FileUploader from "@/components/ui/file-uploader";
import ScheduleSelector from "@/components/ui/ScheduleSelector";
import type { FormField, ScheduleSlot } from "@/types";
import type { UploadedFile } from "@/lib/storage";

const ALL_AVAILABLE_MARKER = "__ALL__";

type AnswerValue = string | string[] | UploadedFile[];

interface ScheduleDefaults {
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  slotMinutes?: number;
}

interface Props {
  fields: FormField[];
  value: Record<string, AnswerValue>;
  onChange: (id: string, v: AnswerValue) => void;
  scheduleDefaults?: ScheduleDefaults;
}

export default function FormRenderer({ fields, value, onChange, scheduleDefaults }: Props) {
  return (
    <div className="space-y-3">
      {fields.map((f) => {
        const v = value[f.id];
        const req = f.required ? <span className="ml-1 text-red-500">*</span> : null;
        const base = (
          <div>
            <label className="mb-1 block text-sm font-medium">{f.label}{req}</label>
            {f.description && <p className="mb-1.5 text-xs text-muted-foreground">{f.description}</p>}
          </div>
        );

        switch (f.type) {
          case "section_break":
            return (
              <div key={f.id} className="pt-3">
                <h3 className="text-base font-semibold">{f.label}</h3>
                {f.description && <p className="mt-0.5 text-xs text-muted-foreground">{f.description}</p>}
                <hr className="mt-2 border-t" />
              </div>
            );
          case "short_text":
          case "email":
          case "phone":
          case "url":
            return (
              <div key={f.id}>{base}
                <Input
                  type={f.type === "email" ? "email" : f.type === "url" ? "url" : "text"}
                  value={typeof v === "string" ? v : ""}
                  onChange={(e) => onChange(f.id, e.target.value)}
                  placeholder={f.placeholder}
                  required={f.required}
                />
              </div>
            );
          case "number":
            return (
              <div key={f.id}>{base}
                <Input
                  type="number"
                  value={typeof v === "string" ? v : ""}
                  onChange={(e) => onChange(f.id, e.target.value)}
                  placeholder={f.placeholder}
                  min={f.min}
                  max={f.max}
                  required={f.required}
                />
              </div>
            );
          case "long_text":
            return (
              <div key={f.id}>{base}
                <textarea
                  value={typeof v === "string" ? v : ""}
                  onChange={(e) => onChange(f.id, e.target.value)}
                  rows={3}
                  required={f.required}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            );
          case "date":
            return (
              <div key={f.id}>{base}
                <Input type="date" value={typeof v === "string" ? v : ""} onChange={(e) => onChange(f.id, e.target.value)} required={f.required} />
              </div>
            );
          case "time":
            return (
              <div key={f.id}>{base}
                <Input type="time" value={typeof v === "string" ? v : ""} onChange={(e) => onChange(f.id, e.target.value)} required={f.required} />
              </div>
            );
          case "datetime":
            return (
              <div key={f.id}>{base}
                <Input type="datetime-local" value={typeof v === "string" ? v : ""} onChange={(e) => onChange(f.id, e.target.value)} required={f.required} />
              </div>
            );
          case "linear_scale": {
            const min = f.min ?? 1;
            const max = f.max ?? 5;
            const range: number[] = [];
            for (let n = min; n <= max; n++) range.push(n);
            return (
              <div key={f.id}>{base}
                <div className="flex items-center gap-2">
                  {f.minLabel && <span className="text-[11px] text-muted-foreground">{f.minLabel}</span>}
                  <div className="flex flex-1 flex-wrap items-center justify-around gap-2">
                    {range.map((n) => (
                      <label key={n} className="flex cursor-pointer flex-col items-center gap-1 text-xs">
                        <span>{n}</span>
                        <input
                          type="radio"
                          name={f.id}
                          checked={v === String(n)}
                          onChange={() => onChange(f.id, String(n))}
                        />
                      </label>
                    ))}
                  </div>
                  {f.maxLabel && <span className="text-[11px] text-muted-foreground">{f.maxLabel}</span>}
                </div>
              </div>
            );
          }
          case "radio":
            return (
              <div key={f.id}>{base}
                <div className="space-y-1.5">
                  {(f.options ?? []).map((opt) => (
                    <label key={opt} className="flex items-center gap-2 text-sm">
                      <input type="radio" name={f.id} checked={v === opt} onChange={() => onChange(f.id, opt)} />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            );
          case "select":
            return (
              <div key={f.id}>{base}
                <select
                  value={typeof v === "string" ? v : ""}
                  onChange={(e) => onChange(f.id, e.target.value)}
                  required={f.required}
                  className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
                >
                  <option value="">선택하세요</option>
                  {(f.options ?? []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            );
          case "checkbox": {
            const arr = Array.isArray(v) ? (v as string[]) : [];
            return (
              <div key={f.id}>{base}
                <div className="space-y-1.5">
                  {(f.options ?? []).map((opt) => (
                    <label key={opt} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={arr.includes(opt)}
                        onChange={(e) => onChange(f.id, e.target.checked ? [...arr, opt] : arr.filter((x) => x !== opt))}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            );
          }
          case "file":
          case "image":
            return (
              <div key={f.id}>{base}
                <FileUploader
                  folder={`applications/${f.id}`}
                  accept={f.type === "image" ? "image/*" : undefined}
                  multiple
                  value={(Array.isArray(v) && typeof v[0] !== "string" ? v : []) as UploadedFile[]}
                  onChange={(files) => onChange(f.id, files)}
                />
              </div>
            );
          case "schedule":
            return (
              <div key={f.id}>{base}
                <ScheduleField field={f} value={v} onChange={(next) => onChange(f.id, next)} defaults={scheduleDefaults} />
              </div>
            );
        }
      })}
    </div>
  );
}

interface ScheduleFieldProps {
  field: FormField;
  value: AnswerValue | undefined;
  onChange: (next: string) => void;
  defaults?: ScheduleDefaults;
}

function ScheduleField({ field, value, onChange, defaults }: ScheduleFieldProps) {
  const initialMode: "all" | "partial" = (() => {
    if (typeof value === "string" && value && value !== ALL_AVAILABLE_MARKER) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed) && parsed.length > 0) return "partial";
      } catch { /* ignore */ }
    }
    return "all";
  })();
  const initialSlots: ScheduleSlot[] = (() => {
    if (typeof value === "string" && value && value !== ALL_AVAILABLE_MARKER) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed as ScheduleSlot[];
      } catch { /* ignore */ }
    }
    return [];
  })();

  const [mode, setModeState] = useState<"all" | "partial">(initialMode);
  const [slots, setSlots] = useState<ScheduleSlot[]>(initialSlots);
  const [expanded, setExpanded] = useState(true);

  function setMode(next: "all" | "partial") {
    setModeState(next);
    if (next === "all") {
      onChange(ALL_AVAILABLE_MARKER);
    } else {
      onChange(JSON.stringify(slots));
      setExpanded(true);
    }
  }

  function updateSlots(next: ScheduleSlot[]) {
    setSlots(next);
    onChange(JSON.stringify(next));
  }

  const effectiveStartDate = field.scheduleStartDate || defaults?.startDate || "";
  const effectiveEndDate = field.scheduleEndDate || defaults?.endDate || effectiveStartDate;
  const effectiveStartTime = field.scheduleStartTime || defaults?.startTime || "09:00";
  const effectiveEndTime = field.scheduleEndTime || defaults?.endTime || "18:00";
  const effectiveSlotMinutes = field.scheduleSlotMinutes ?? defaults?.slotMinutes ?? 30;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode("all")}
          className={cn(
            "flex flex-col items-start gap-1 rounded-xl border-2 p-4 text-left transition-all",
            mode === "all"
              ? "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm dark:bg-emerald-950/40 dark:text-emerald-100"
              : "border-input bg-white text-muted-foreground hover:border-emerald-300 hover:bg-emerald-50/40 dark:bg-card dark:hover:bg-emerald-950/20",
          )}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className={mode === "all" ? "text-emerald-600" : "text-muted-foreground"} />
            <span className="text-sm font-semibold">전체 시간 가능</span>
          </div>
          <span className="text-[11px] leading-snug text-muted-foreground">
            행사 전 일정에 모두 참여할 수 있습니다.
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMode("partial")}
          className={cn(
            "flex flex-col items-start gap-1 rounded-xl border-2 p-4 text-left transition-all",
            mode === "partial"
              ? "border-primary bg-primary/10 text-foreground shadow-sm"
              : "border-input bg-white text-muted-foreground hover:border-primary/40 hover:bg-primary/5 dark:bg-card dark:hover:bg-primary/10",
          )}
        >
          <div className="flex items-center gap-2">
            <CalendarRange size={18} className={mode === "partial" ? "text-primary" : "text-muted-foreground"} />
            <span className="text-sm font-semibold">부분 참여</span>
          </div>
          <span className="text-[11px] leading-snug text-muted-foreground">
            가능한 시간대만 골라서 표시합니다.
          </span>
        </button>
      </div>

      {mode === "partial" && (
        <div className="rounded-xl border bg-muted/10">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium hover:bg-muted/30"
            aria-expanded={expanded}
          >
            <span className="flex items-center gap-2">
              <CalendarRange size={14} className="text-primary" />
              가능한 시간대 선택
              {slots.length > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {slots.length}개 선택됨
                </span>
              )}
            </span>
            {expanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
          </button>
          {expanded && (
            <div className="border-t bg-white p-3 dark:bg-card">
              <ScheduleSelector
                startDate={effectiveStartDate}
                endDate={effectiveEndDate}
                startTime={effectiveStartTime}
                endTime={effectiveEndTime}
                slotMinutes={effectiveSlotMinutes}
                value={slots}
                onChange={updateSlots}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
