"use client";

import { Input } from "@/components/ui/input";
import FileUploader from "@/components/ui/file-uploader";
import type { FormField } from "@/types";
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
          case "short_text":
          case "email":
          case "phone":
            return (
              <div key={f.id}>{base}
                <Input
                  type={f.type === "email" ? "email" : "text"}
                  value={typeof v === "string" ? v : ""}
                  onChange={(e) => onChange(f.id, e.target.value)}
                  placeholder={f.placeholder}
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
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            );
          case "date":
            return (
              <div key={f.id}>{base}
                <Input type="date" value={typeof v === "string" ? v : ""} onChange={(e) => onChange(f.id, e.target.value)} />
              </div>
            );
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
        }
      })}
    </div>
  );
}
