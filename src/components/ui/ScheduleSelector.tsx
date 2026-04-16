"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { ScheduleSlot } from "@/types";

interface Props {
  /** 행사 시작 날짜 YYYY-MM-DD */
  startDate: string;
  /** 행사 종료 날짜 YYYY-MM-DD (단일 날짜면 startDate와 동일) */
  endDate: string;
  /** 하루 중 시작 시간 HH:MM */
  startTime: string;
  /** 하루 중 종료 시간 HH:MM */
  endTime: string;
  /** 슬롯 단위 분 (기본 30) */
  slotMinutes?: number;
  /** 현재 선택값 */
  value: ScheduleSlot[];
  onChange: (slots: ScheduleSlot[]) => void;
  /** 읽기 전용 (리포트 등) */
  readOnly?: boolean;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToTime(m: number): string {
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

function listDates(startDate: string, endDate: string): string[] {
  if (!startDate) return [];
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate || startDate}T00:00:00`);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return [startDate];
  const dates: string[] = [];
  const cur = new Date(start);
  while (cur.getTime() <= end.getTime()) {
    dates.push(`${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

/**
 * PR8: 학술대회 신청용 시간표 드래그 선택 컴포넌트
 * - 30분 단위 격자
 * - 다중 시간대 선택 가능 (중간에 불가능 시간대를 두고 분할 선택)
 * - 단일 날짜 + 다일자 모두 지원
 */
export default function ScheduleSelector({
  startDate,
  endDate,
  startTime,
  endTime,
  slotMinutes = 30,
  value,
  onChange,
  readOnly = false,
}: Props) {
  const dates = useMemo(() => listDates(startDate, endDate), [startDate, endDate]);
  const startMin = timeToMinutes(startTime || "09:00");
  const endMin = timeToMinutes(endTime || "18:00");
  const slots = useMemo(() => {
    const arr: { startM: number; endM: number; label: string }[] = [];
    for (let m = startMin; m + slotMinutes <= endMin; m += slotMinutes) {
      arr.push({ startM: m, endM: m + slotMinutes, label: minutesToTime(m) });
    }
    return arr;
  }, [startMin, endMin, slotMinutes]);

  // 선택 상태: Set of "date|startM"
  const selectedKeys = useMemo(() => {
    const set = new Set<string>();
    value.forEach((s) => {
      const sm = timeToMinutes(s.start);
      const em = timeToMinutes(s.end);
      for (let m = sm; m < em; m += slotMinutes) {
        set.add(`${s.date}|${m}`);
      }
    });
    return set;
  }, [value, slotMinutes]);

  const [drag, setDrag] = useState<{ date: string; startM: number; endM: number; mode: "add" | "remove" } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 마우스 업 전역 핸들러
  useEffect(() => {
    function commit() {
      if (!drag) return;
      const newSet = new Set(selectedKeys);
      const lo = Math.min(drag.startM, drag.endM);
      const hi = Math.max(drag.startM, drag.endM);
      for (let m = lo; m <= hi; m += slotMinutes) {
        const key = `${drag.date}|${m}`;
        if (drag.mode === "add") newSet.add(key);
        else newSet.delete(key);
      }
      onChange(setToSlots(newSet, slotMinutes));
      setDrag(null);
    }
    function onMouseUp() {
      commit();
    }
    function onTouchEnd() {
      commit();
    }
    if (drag) {
      window.addEventListener("mouseup", onMouseUp);
      window.addEventListener("touchend", onTouchEnd);
      return () => {
        window.removeEventListener("mouseup", onMouseUp);
        window.removeEventListener("touchend", onTouchEnd);
      };
    }
  }, [drag, selectedKeys, slotMinutes, onChange]);

  function handleSlotDown(date: string, startM: number) {
    if (readOnly) return;
    const key = `${date}|${startM}`;
    const mode = selectedKeys.has(key) ? "remove" : "add";
    setDrag({ date, startM, endM: startM, mode });
  }

  function handleSlotEnter(date: string, startM: number) {
    if (!drag || drag.date !== date) return;
    setDrag({ ...drag, endM: startM });
  }

  function isInDragRange(date: string, m: number): "add" | "remove" | null {
    if (!drag || drag.date !== date) return null;
    const lo = Math.min(drag.startM, drag.endM);
    const hi = Math.max(drag.startM, drag.endM);
    if (m < lo || m > hi) return null;
    return drag.mode;
  }

  function clearAll() {
    if (readOnly) return;
    onChange([]);
  }

  function clearDate(date: string) {
    if (readOnly) return;
    onChange(value.filter((s) => s.date !== date));
  }

  if (!startDate) {
    return (
      <div className="rounded-lg border bg-muted/20 p-4 text-center text-sm text-muted-foreground">
        행사 일정이 설정되지 않았습니다. (운영진에게 문의하세요)
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-3">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-primary/5 p-2.5 text-xs text-muted-foreground">
          <span>드래그하여 가능한 시간대를 선택하세요. (다중 시간대 선택 가능)</span>
          {value.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="ml-auto rounded border bg-white px-2 py-1 text-[11px] hover:bg-muted"
            >
              전체 초기화
            </button>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="inline-flex gap-2 select-none">
          {dates.map((date) => (
            <div key={date} className="min-w-[120px] rounded-lg border bg-white">
              <div className="flex items-center justify-between border-b bg-muted/30 px-2 py-1.5">
                <div className="text-xs font-semibold">{formatDateLabel(date)}</div>
                {!readOnly && value.some((s) => s.date === date) && (
                  <button
                    type="button"
                    onClick={() => clearDate(date)}
                    className="text-[10px] text-muted-foreground hover:text-red-500"
                  >
                    초기화
                  </button>
                )}
              </div>
              <div>
                {slots.map((slot) => {
                  const key = `${date}|${slot.startM}`;
                  const isSelected = selectedKeys.has(key);
                  const dragMode = isInDragRange(date, slot.startM);
                  const visualSelected = dragMode === "add" || (isSelected && dragMode !== "remove");
                  return (
                    <div
                      key={slot.startM}
                      onMouseDown={() => handleSlotDown(date, slot.startM)}
                      onMouseEnter={() => handleSlotEnter(date, slot.startM)}
                      onTouchStart={() => handleSlotDown(date, slot.startM)}
                      onTouchMove={(e) => {
                        const t = e.touches[0];
                        const el = document.elementFromPoint(t.clientX, t.clientY) as HTMLElement | null;
                        const targetDate = el?.dataset?.date;
                        const targetMin = el?.dataset?.minutes;
                        if (targetDate && targetMin) handleSlotEnter(targetDate, Number(targetMin));
                      }}
                      data-date={date}
                      data-minutes={slot.startM}
                      className={cn(
                        "flex h-7 cursor-pointer items-center justify-between border-b border-muted/40 px-2 text-[10px] transition-colors",
                        readOnly && "cursor-default",
                        visualSelected
                          ? "bg-primary/80 text-primary-foreground"
                          : "bg-white text-muted-foreground hover:bg-primary/10",
                      )}
                    >
                      <span>{slot.label}</span>
                      {visualSelected && <span className="text-[9px]">✓</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {value.length > 0 && (
        <div className="rounded-lg bg-muted/20 p-2.5 text-xs">
          <div className="mb-1 font-medium text-muted-foreground">선택한 시간대 ({value.length}개)</div>
          <ul className="space-y-1">
            {value.map((s, i) => (
              <li key={`${s.date}-${s.start}-${i}`} className="flex items-center gap-2">
                <span className="font-mono">{formatDateShort(s.date)}</span>
                <span>{s.start} ~ {s.end}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** 인접한 슬롯들을 하나의 ScheduleSlot으로 병합 */
function setToSlots(set: Set<string>, slotMinutes: number): ScheduleSlot[] {
  const byDate = new Map<string, number[]>();
  set.forEach((key) => {
    const [date, m] = key.split("|");
    const arr = byDate.get(date) ?? [];
    arr.push(Number(m));
    byDate.set(date, arr);
  });
  const out: ScheduleSlot[] = [];
  Array.from(byDate.keys())
    .sort()
    .forEach((date) => {
      const mins = (byDate.get(date) ?? []).sort((a, b) => a - b);
      let i = 0;
      while (i < mins.length) {
        const startM = mins[i];
        let endM = startM + slotMinutes;
        let j = i + 1;
        while (j < mins.length && mins[j] === endM) {
          endM += slotMinutes;
          j++;
        }
        out.push({ date, start: minutesToTime(startM), end: minutesToTime(endM) });
        i = j;
      }
    });
  return out;
}

function formatDateLabel(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (isNaN(d.getTime())) return date;
  const dow = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()} (${dow})`;
}

function formatDateShort(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (isNaN(d.getTime())) return date;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
