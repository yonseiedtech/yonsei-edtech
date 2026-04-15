"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical, Copy, Type, AlignLeft, CircleDot, SquareCheck, ChevronDown, Calendar, Mail, Phone, FileText, Image as ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { FormField, FormFieldType } from "@/types";

const TYPE_META: Record<FormFieldType, { label: string; icon: typeof Type }> = {
  short_text: { label: "단답형", icon: Type },
  long_text: { label: "장문형", icon: AlignLeft },
  radio: { label: "객관식", icon: CircleDot },
  checkbox: { label: "체크박스", icon: SquareCheck },
  select: { label: "드롭다운", icon: ChevronDown },
  date: { label: "날짜", icon: Calendar },
  email: { label: "이메일", icon: Mail },
  phone: { label: "전화번호", icon: Phone },
  file: { label: "파일 업로드", icon: FileText },
  image: { label: "이미지 업로드", icon: ImageIcon },
};

const HAS_OPTIONS: FormFieldType[] = ["radio", "checkbox", "select"];

function uid() { return `f_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

interface Props {
  value: FormField[];
  onChange: (fields: FormField[]) => void;
}

export default function FormBuilder({ value, onChange }: Props) {
  const [newType, setNewType] = useState<FormFieldType>("short_text");

  function add() {
    const f: FormField = {
      id: uid(),
      type: newType,
      label: TYPE_META[newType].label + " 질문",
      required: false,
      options: HAS_OPTIONS.includes(newType) ? ["옵션 1"] : undefined,
    };
    onChange([...value, f]);
  }
  function update(i: number, patch: Partial<FormField>) {
    onChange(value.map((f, idx) => idx === i ? { ...f, ...patch } : f));
  }
  function remove(i: number) { onChange(value.filter((_, idx) => idx !== i)); }
  function move(i: number, dir: -1 | 1) {
    const next = [...value]; const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]]; onChange(next);
  }
  function duplicate(i: number) {
    const f = value[i]; if (!f) return;
    onChange([...value.slice(0, i + 1), { ...f, id: uid() }, ...value.slice(i + 1)]);
  }

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <p className="rounded-lg border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
          아직 추가된 질문이 없습니다. 아래에서 질문 유형을 선택해 추가하세요.
        </p>
      )}

      {value.map((f, i) => {
        const Icon = TYPE_META[f.type].icon;
        return (
          <div key={f.id} className="rounded-xl border bg-white p-4">
            <div className="flex items-start gap-2">
              <button type="button" onClick={() => move(i, -1)} className="mt-1 cursor-grab text-muted-foreground hover:text-foreground">
                <GripVertical size={14} />
              </button>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Icon size={14} className="text-primary" />
                  <span className="text-[10px] font-medium text-muted-foreground">{TYPE_META[f.type].label}</span>
                  <label className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
                    <input type="checkbox" checked={!!f.required} onChange={(e) => update(i, { required: e.target.checked })} />
                    필수
                  </label>
                </div>
                <Input value={f.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="질문 내용" />
                <Input value={f.description ?? ""} onChange={(e) => update(i, { description: e.target.value })} placeholder="설명 (선택)" className="text-xs" />
                {HAS_OPTIONS.includes(f.type) && (
                  <div className="space-y-1.5 rounded-lg bg-muted/20 p-2">
                    {(f.options ?? []).map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <Input
                          value={opt}
                          onChange={(e) => {
                            const next = [...(f.options ?? [])]; next[oi] = e.target.value;
                            update(i, { options: next });
                          }}
                          placeholder={`옵션 ${oi + 1}`}
                          className="h-8 text-xs"
                        />
                        <button type="button" onClick={() => update(i, { options: (f.options ?? []).filter((_, x) => x !== oi) })} className="shrink-0 rounded p-1 text-muted-foreground hover:text-red-500">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={() => update(i, { options: [...(f.options ?? []), `옵션 ${(f.options?.length ?? 0) + 1}`] })} className="flex items-center gap-1 text-[10px] text-primary hover:underline">
                      <Plus size={12} />옵션 추가
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <button type="button" onClick={() => duplicate(i)} className="rounded p-1 text-muted-foreground hover:bg-muted"><Copy size={12} /></button>
                <button type="button" onClick={() => remove(i)} className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-500"><Trash2 size={12} /></button>
              </div>
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed bg-muted/10 p-3">
        <select
          value={newType}
          onChange={(e) => setNewType(e.target.value as FormFieldType)}
          className="rounded-md border bg-white px-2 py-1.5 text-xs"
        >
          {Object.entries(TYPE_META).map(([k, m]) => (
            <option key={k} value={k}>{m.label}</option>
          ))}
        </select>
        <Button type="button" size="sm" variant="outline" onClick={add}>
          <Plus size={14} className="mr-1" />질문 추가
        </Button>
      </div>
    </div>
  );
}
