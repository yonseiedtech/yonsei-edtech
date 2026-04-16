"use client";

import { Input } from "@/components/ui/input";
import FileUploader from "@/components/ui/file-uploader";
import ScheduleSelector from "@/components/ui/ScheduleSelector";
import type { FormField, ScheduleSlot } from "@/types";
import type { UploadedFile } from "@/lib/storage";

type AnswerValue = string | string[] | UploadedFile[];

interface Props {
  fields: FormField[];
  value: Record<string, AnswerValue>;
  onChange: (id: string, v: AnswerValue) => void;
}

export default function FormRenderer({ fields, value, onChange }: Props) {
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
          case "schedule": {
            // 답변은 JSON 문자열로 저장 (기존 AnswerValue 타입 유지)
            let slots: ScheduleSlot[] = [];
            if (typeof v === "string" && v) {
              try {
                const parsed = JSON.parse(v);
                if (Array.isArray(parsed)) slots = parsed as ScheduleSlot[];
              } catch { /* ignore */ }
            }
            return (
              <div key={f.id}>{base}
                <ScheduleSelector
                  startDate={f.scheduleStartDate ?? ""}
                  endDate={f.scheduleEndDate ?? f.scheduleStartDate ?? ""}
                  startTime={f.scheduleStartTime ?? "09:00"}
                  endTime={f.scheduleEndTime ?? "18:00"}
                  slotMinutes={f.scheduleSlotMinutes ?? 30}
                  value={slots}
                  onChange={(next) => onChange(f.id, JSON.stringify(next))}
                />
              </div>
            );
          }
        }
      })}
    </div>
  );
}
