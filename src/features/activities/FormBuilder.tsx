"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus, Trash2, GripVertical, Copy, Type, AlignLeft, CircleDot, SquareCheck,
  ChevronDown, ChevronUp, Calendar, Clock, CalendarClock, Mail, Phone, FileText,
  Image as ImageIcon, Link2, Hash, SlidersHorizontal, Minus, CalendarRange, CalendarCheck2,
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
  datetime_slots: { label: "가능한 날짜·시간", icon: CalendarCheck2 },
};

const HAS_OPTIONS: FormFieldType[] = ["radio", "checkbox", "select"];
const HIDE_REQUIRED: FormFieldType[] = ["section_break"];

/** 부모로의 onChange 전파 디바운스 (ms) — 키 입력마다 네트워크 저장/캐시 round-trip 방지 */
const COMMIT_DEBOUNCE_MS = 400;

function uid() { return `f_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

interface Props {
  value: FormField[];
  onChange: (fields: FormField[]) => void;
}

export default function FormBuilder({ value, onChange }: Props) {
  const [newType, setNewType] = useState<FormFieldType>("short_text");
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, string | string[] | UploadedFile[]>>({});

  // 로컬 작업 사본 — 입력 필드는 이 state 를 읽는다.
  // value prop 은 React Query 캐시를 거쳐 돌아오므로, 한글 IME 조합 중
  // controlled <Input> 값이 캐시 churn 으로 재설정되면 조합 버퍼가 깨진다.
  // 로컬 state 로 입력을 격리하면 IME 가 안전하다. (ActivityInfoEditor 와 동일 패턴)
  const [fields, setFields] = useState<FormField[]>(value);
  const lastEmitted = useRef<FormField[]>(value);
  const dirty = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // 외부(value prop) 변경 동기화 — 단, 보류 중인 로컬 편집이 있으면 덮어쓰지 않는다.
  useEffect(() => {
    if (dirty.current) return;
    if (value !== lastEmitted.current) {
      setFields(value);
      lastEmitted.current = value;
    }
  }, [value]);

  // 보류 중인 변경 즉시 전파 (언마운트 시 유실 방지)
  const flush = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
      dirty.current = false;
      onChangeRef.current(lastEmitted.current);
    }
  }, []);
  useEffect(() => flush, [flush]);

  // 로컬 state 즉시 갱신 + 부모로의 전파는 디바운스
  const commit = useCallback((next: FormField[]) => {
    setFields(next);
    lastEmitted.current = next;
    dirty.current = true;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null;
      dirty.current = false;
      onChangeRef.current(next);
    }, COMMIT_DEBOUNCE_MS);
  }, []);

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
    if (t === "datetime_slots") return { scheduleStartDate: "", scheduleEndDate: "" };
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
    commit([...fields, f]);
  }
  function update(i: number, patch: Partial<FormField>) {
    commit(fields.map((f, idx) => idx === i ? { ...f, ...patch } : f));
  }
  function changeType(i: number, t: FormFieldType) {
    const f = fields[i]; if (!f) return;
    update(i, {
      type: t,
      options: HAS_OPTIONS.includes(t) ? (f.options ?? ["옵션 1"]) : undefined,
      ...defaultsFor(t),
    });
  }
  function remove(i: number) { commit(fields.filter((_, idx) => idx !== i)); }
  function move(i: number, dir: -1 | 1) {
    const next = [...fields]; const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]]; commit(next);
  }
  function duplicate(i: number) {
    const f = fields[i]; if (!f) return;
    commit([...fields.slice(0, i + 1), { ...f, id: uid() }, ...fields.slice(i + 1)]);
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
          onClick={() => { flush(); setMode("preview"); }}
          className={`rounded-md px-3 py-1 text-xs font-medium ${mode === "preview" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
        >
          미리보기
        </button>
      </div>

      {mode === "preview" ? (
        <div className="rounded-2xl border bg-card p-4">
          {fields.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground">추가된 질문이 없습니다.</p>
          ) : (
            <FormRenderer fields={fields} value={previewAnswers} onChange={(id, v) => setPreviewAnswers((p) => ({ ...p, [id]: v }))} />
          )}
        </div>
      ) : (
      <>
      {fields.length === 0 && (
        <p className="rounded-lg border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
          아직 추가된 질문이 없습니다. 아래에서 질문 유형을 선택해 추가하세요.
        </p>
      )}

      {fields.map((f, i) => {
        const Icon = TYPE_META[f.type].icon;
        const isSection = f.type === "section_break";
        return (
          <div key={f.id} className="rounded-2xl border bg-card p-4">
            <div className="flex items-start gap-2">
              <div className="mt-1 flex flex-col items-center gap-0.5 text-muted-foreground">
                <GripVertical size={14} />
                <button type="button" title="위로" onClick={() => move(i, -1)} className="rounded p-0.5 hover:bg-muted hover:text-foreground disabled:opacity-30" disabled={i === 0}>
                  <ChevronUp size={12} />
                </button>
                <button type="button" title="아래로" onClick={() => move(i, 1)} className="rounded p-0.5 hover:bg-muted hover:text-foreground disabled:opacity-30" disabled={i === fields.length - 1}>
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
                {f.type === "datetime_slots" && (
                  <div className="space-y-1.5 rounded-lg bg-muted/20 p-2">
                    <p className="text-[10px] leading-relaxed text-muted-foreground">
                      신청자가 <strong className="text-foreground">날짜 + 시작·종료 시간</strong>을 직접 추가해 여러 개 입력합니다.
                      아래 날짜 범위를 지정하면 신청자의 날짜 선택이 해당 범위로 제한됩니다. (비워두면 제한 없음)
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex flex-col gap-1 text-[10px] text-muted-foreground">
                        선택 가능 시작일 (선택)
                        <Input type="date" value={f.scheduleStartDate ?? ""} onChange={(e) => update(i, { scheduleStartDate: e.target.value })} className="h-7 text-xs" />
                      </label>
                      <label className="flex flex-col gap-1 text-[10px] text-muted-foreground">
                        선택 가능 종료일 (선택)
                        <Input type="date" value={f.scheduleEndDate ?? ""} onChange={(e) => update(i, { scheduleEndDate: e.target.value })} className="h-7 text-xs" />
                      </label>
                    </div>
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

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed bg-muted/10 p-3">
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
