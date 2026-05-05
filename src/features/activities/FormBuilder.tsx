"use client";

import { useState } from "react";
import {
  Plus, Trash2, GripVertical, Copy, Type, AlignLeft, CircleDot, SquareCheck,
  ChevronDown, ChevronUp, Calendar, Clock, CalendarClock, Mail, Phone, FileText,
  Image as ImageIcon, Link2, Hash, SlidersHorizontal, Minus, CalendarRange,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import FormRenderer from "./FormRenderer";
import type { FormField, FormFieldType } from "@/types";
import type { UploadedFile } from "@/lib/storage";

const TYPE_META: Record<FormFieldType, { label: string; icon: typeof Type }> = {
  short_text: { label: "단답형", icon: Type },
  long_text: { label: "장문형", icon: AlignLeft },
  radio: { label: "객관식", icon: CircleDot },
  checkbox: { label: "체크박스", icon: SquareCheck },
  select: { label: "드롭다운", icon: ChevronDown },
  date: { label: "날짜", icon: Calendar },
  time: { label: "시간", icon: Clock },
  datetime: { label: "날짜+시간", icon: CalendarClock },
  email: { label: "이메일", icon: Mail },
  phone: { label: "전화번호", icon: Phone },
  url: { label: "URL", icon: Link2 },
  number: { label: "숫자", icon: Hash },
  linear_scale: { label: "선형척도", icon: SlidersHorizontal },
  file: { label: "파일 업로드", icon: FileText },
  image: { label: "이미지 업로드", icon: ImageIcon },
  section_break: { label: "섹션 구분", icon: Minus },
  schedule: { label: "가능 시간대 (시간표)", icon: CalendarRange },
};

const HAS_OPTIONS: FormFieldType[] = ["radio", "checkbox", "select"];
const HIDE_REQUIRED: FormFieldType[] = ["section_break"];

function uid() { return `f_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

interface Props {
  value: FormField[];
  onChange: (fields: FormField[]) => void;
}

export default function FormBuilder({ value, onChange }: Props) {
  const [newType, setNewType] = useState<FormFieldType>("short_text");
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, string | string[] | UploadedFile[]>>({});

  function defaultsFor(t: FormFieldType): Partial<FormField> {
    if (t === "linear_scale") return { min: 1, max: 5, minLabel: "매우 아니다", maxLabel: "매우 그렇다" };
    if (t === "number") return {};
    if (t === "schedule") return {
      scheduleStartDate: "",
      scheduleEndDate: "",
      scheduleStartTime: "09:00",
      scheduleEndTime: "18:00",
      scheduleSlotMinutes: 30,
    };
    return {};
  }
  function add() {
    const f: FormField = {
      id: uid(),
      type: newType,
      label: TYPE_META[newType].label + (newType === "section_break" ? "" : " 질문"),
      required: false,
      options: HAS_OPTIONS.includes(newType) ? ["옵션 1"] : undefined,
      ...defaultsFor(newType),
    };
    onChange([...value, f]);
  }
  function update(i: number, patch: Partial<FormField>) {
    onChange(value.map((f, idx) => idx === i ? { ...f, ...patch } : f));
  }
  function changeType(i: number, t: FormFieldType) {
    const f = value[i]; if (!f) return;
    update(i, {
      type: t,
      options: HAS_OPTIONS.includes(t) ? (f.options ?? ["옵션 1"]) : undefined,
      ...defaultsFor(t),
    });
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
      {/* 편집/미리보기 탭 */}
      <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1 w-fit">
        <button
          type="button"
          onClick={() => setMode("edit")}
          className={`rounded-md px-3 py-1 text-xs font-medium ${mode === "edit" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
        >
          편집
        </button>
        <button
          type="button"
          onClick={() => setMode("preview")}
          className={`rounded-md px-3 py-1 text-xs font-medium ${mode === "preview" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
        >
          미리보기
        </button>
      </div>

      {mode === "preview" ? (
        <div className="rounded-xl border bg-card p-4">
          {value.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground">추가된 질문이 없습니다.</p>
          ) : (
            <FormRenderer fields={value} value={previewAnswers} onChange={(id, v) => setPreviewAnswers((p) => ({ ...p, [id]: v }))} />
          )}
        </div>
      ) : (
      <>
      {value.length === 0 && (
        <p className="rounded-lg border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
          아직 추가된 질문이 없습니다. 아래에서 질문 유형을 선택해 추가하세요.
        </p>
      )}

      {value.map((f, i) => {
        const Icon = TYPE_META[f.type].icon;
        const isSection = f.type === "section_break";
        return (
          <div key={f.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-start gap-2">
              <div className="mt-1 flex flex-col items-center gap-0.5 text-muted-foreground">
                <GripVertical size={14} />
                <button type="button" title="위로" onClick={() => move(i, -1)} className="rounded p-0.5 hover:bg-muted hover:text-foreground disabled:opacity-30" disabled={i === 0}>
                  <ChevronUp size={12} />
                </button>
                <button type="button" title="아래로" onClick={() => move(i, 1)} className="rounded p-0.5 hover:bg-muted hover:text-foreground disabled:opacity-30" disabled={i === value.length - 1}>
                  <ChevronDown size={12} />
                </button>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Icon size={14} className="text-primary" />
                  <select
                    value={f.type}
                    onChange={(e) => changeType(i, e.target.value as FormFieldType)}
                    className="rounded border bg-card px-1.5 py-0.5 text-[10px]"
                  >
                    {Object.entries(TYPE_META).map(([k, m]) => (
                      <option key={k} value={k}>{m.label}</option>
                    ))}
                  </select>
                  {!HIDE_REQUIRED.includes(f.type) && (
                    <label className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
                      <input type="checkbox" checked={!!f.required} onChange={(e) => update(i, { required: e.target.checked })} />
                      필수
                    </label>
                  )}
                </div>
                <Input value={f.label} onChange={(e) => update(i, { label: e.target.value })} placeholder={isSection ? "섹션 제목" : "질문 내용"} />
                {!isSection && (
                  <Input value={f.description ?? ""} onChange={(e) => update(i, { description: e.target.value })} placeholder="설명 (선택)" className="text-xs" />
                )}
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
                {f.type === "number" && (
                  <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/20 p-2">
                    <label className="flex flex-col gap-1 text-[10px] text-muted-foreground">
                      최솟값
                      <Input type="number" value={f.min ?? ""} onChange={(e) => update(i, { min: e.target.value === "" ? undefined : Number(e.target.value) })} className="h-7 text-xs" />
                    </label>
                    <label className="flex flex-col gap-1 text-[10px] text-muted-foreground">
                      최댓값
                      <Input type="number" value={f.max ?? ""} onChange={(e) => update(i, { max: e.target.value === "" ? undefined : Number(e.target.value) })} className="h-7 text-xs" />
                    </label>
                    <label className="flex flex-col gap-1 text-[10px] text-muted-foreground">
                      placeholder
                      <Input value={f.placeholder ?? ""} onChange={(e) => update(i, { placeholder: e.target.value })} className="h-7 text-xs" />
                    </label>
                  </div>
                )}
                {f.type === "schedule" && (
                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/20 p-2">
                    <label className="flex flex-col gap-1 text-[10px] text-muted-foreground">
                      행사 시작일
                      <Input type="date" value={f.scheduleStartDate ?? ""} onChange={(e) => update(i, { scheduleStartDate: e.target.value })} className="h-7 text-xs" />
                    </label>
                    <label className="flex flex-col gap-1 text-[10px] text-muted-foreground">
                      행사 종료일 (단일이면 동일)
                      <Input type="date" value={f.scheduleEndDate ?? ""} onChange={(e) => update(i, { scheduleEndDate: e.target.value })} className="h-7 text-xs" />
                    </label>
                    <label className="flex flex-col gap-1 text-[10px] text-muted-foreground">
                      하루 시작 시간
                      <Input type="time" value={f.scheduleStartTime ?? "09:00"} onChange={(e) => update(i, { scheduleStartTime: e.target.value })} className="h-7 text-xs" />
                    </label>
                    <label className="flex flex-col gap-1 text-[10px] text-muted-foreground">
                      하루 종료 시간
                      <Input type="time" value={f.scheduleEndTime ?? "18:00"} onChange={(e) => update(i, { scheduleEndTime: e.target.value })} className="h-7 text-xs" />
                    </label>
                    <label className="col-span-2 flex flex-col gap-1 text-[10px] text-muted-foreground">
                      슬롯 단위 (분)
                      <select
                        value={f.scheduleSlotMinutes ?? 30}
                        onChange={(e) => update(i, { scheduleSlotMinutes: Number(e.target.value) })}
                        className="h-7 rounded border bg-card px-2 text-xs"
                      >
                        <option value={15}>15분</option>
                        <option value={30}>30분</option>
                        <option value={60}>60분</option>
                      </select>
                    </label>
                  </div>
                )}
                {f.type === "linear_scale" && (
                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/20 p-2">
                    <label className="flex flex-col gap-1 text-[10px] text-muted-foreground">
                      최솟값 (숫자)
                      <Input type="number" value={f.min ?? 1} onChange={(e) => update(i, { min: Number(e.target.value) })} className="h-7 text-xs" />
                    </label>
                    <label className="flex flex-col gap-1 text-[10px] text-muted-foreground">
                      최댓값 (숫자)
                      <Input type="number" value={f.max ?? 5} onChange={(e) => update(i, { max: Number(e.target.value) })} className="h-7 text-xs" />
                    </label>
                    <label className="flex flex-col gap-1 text-[10px] text-muted-foreground">
                      최솟값 라벨
                      <Input value={f.minLabel ?? ""} onChange={(e) => update(i, { minLabel: e.target.value })} className="h-7 text-xs" placeholder="예: 매우 아니다" />
                    </label>
                    <label className="flex flex-col gap-1 text-[10px] text-muted-foreground">
                      최댓값 라벨
                      <Input value={f.maxLabel ?? ""} onChange={(e) => update(i, { maxLabel: e.target.value })} className="h-7 text-xs" placeholder="예: 매우 그렇다" />
                    </label>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <button type="button" title="복제" onClick={() => duplicate(i)} className="rounded p-1 text-muted-foreground hover:bg-muted"><Copy size={12} /></button>
                <button type="button" title="삭제" onClick={() => remove(i)} className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-500"><Trash2 size={12} /></button>
              </div>
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed bg-muted/10 p-3">
        <select
          value={newType}
          onChange={(e) => setNewType(e.target.value as FormFieldType)}
          className="rounded-md border bg-card px-2 py-1.5 text-xs"
        >
          {Object.entries(TYPE_META).map(([k, m]) => (
            <option key={k} value={k}>{m.label}</option>
          ))}
        </select>
        <Button type="button" size="sm" variant="outline" onClick={add}>
          <Plus size={14} className="mr-1" />질문 추가
        </Button>
      </div>
      </>
      )}
    </div>
  );
}
