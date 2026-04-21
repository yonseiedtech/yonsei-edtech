"use client";

/**
 * CourseOffering.schedule 구조화 입력기.
 *
 * - 요일 칩(일~토 다중 선택) + 시작/종료 시간 입력
 * - parseSchedule()이 읽을 수 있는 자유 텍스트("월수 18:30~21:00")로 직렬화
 * - 기존 자유 텍스트 값도 초기 파싱해서 채워주고, 파싱 실패 시 자유 텍스트 모드로 fallback
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { parseSchedule, fmtMin } from "@/lib/courseSchedule";

interface Props {
  value: string;
  onChange: (next: string) => void;
}

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

function buildScheduleString(
  weekdays: number[],
  startMin: number | null,
  endMin: number | null,
): string {
  const dayPart = weekdays
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DAY_LABELS[d])
    .join("");
  const timePart =
    startMin !== null && endMin !== null
      ? `${fmtMin(startMin)}~${fmtMin(endMin)}`
      : "";
  return [dayPart, timePart].filter(Boolean).join(" ");
}

function timeStrToMin(t: string): number | null {
  if (!t) return null;
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return h * 60 + mm;
}

export default function ScheduleEditor({ value, onChange }: Props) {
  const initial = useMemo(() => parseSchedule(value), [value]);
  const [weekdays, setWeekdays] = useState<number[]>(initial.weekdays);
  const [startTime, setStartTime] = useState<string>(
    initial.startMin !== null ? fmtMin(initial.startMin) : "",
  );
  const [endTime, setEndTime] = useState<string>(
    initial.endMin !== null ? fmtMin(initial.endMin) : "",
  );
  const [freeMode, setFreeMode] = useState<boolean>(false);

  // value prop이 외부에서 변경(다른 강의로 바뀌는 경우)되면 재동기화
  const lastSyncedValue = useRef(value);
  useEffect(() => {
    if (value !== lastSyncedValue.current) {
      const p = parseSchedule(value);
      setWeekdays(p.weekdays);
      setStartTime(p.startMin !== null ? fmtMin(p.startMin) : "");
      setEndTime(p.endMin !== null ? fmtMin(p.endMin) : "");
      lastSyncedValue.current = value;
    }
  }, [value]);

  const toggleDay = (idx: number) => {
    const next = weekdays.includes(idx)
      ? weekdays.filter((d) => d !== idx)
      : [...weekdays, idx];
    setWeekdays(next);
    emit(next, startTime, endTime);
  };

  const onStartChange = (v: string) => {
    setStartTime(v);
    emit(weekdays, v, endTime);
  };
  const onEndChange = (v: string) => {
    setEndTime(v);
    emit(weekdays, startTime, v);
  };

  const emit = (
    days: number[],
    sStr: string,
    eStr: string,
  ) => {
    const s = timeStrToMin(sStr);
    const e = timeStrToMin(eStr);
    const next = buildScheduleString(days, s, e);
    lastSyncedValue.current = next;
    onChange(next);
  };

  const onFreeChange = (v: string) => {
    lastSyncedValue.current = v;
    onChange(v);
  };

  if (freeMode) {
    return (
      <div className="rounded-md border bg-muted/20 p-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">자유 입력 모드</span>
          <button
            type="button"
            onClick={() => {
              setFreeMode(false);
              const p = parseSchedule(value);
              setWeekdays(p.weekdays);
              setStartTime(p.startMin !== null ? fmtMin(p.startMin) : "");
              setEndTime(p.endMin !== null ? fmtMin(p.endMin) : "");
            }}
            className="text-[11px] text-primary hover:underline"
          >
            구조화 입력으로
          </button>
        </div>
        <Input
          className="mt-1"
          placeholder='예: "월수 18:30~21:00", "비대면 강의"'
          value={value}
          onChange={(e) => onFreeChange(e.target.value)}
        />
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-muted-foreground">요일</span>
        <button
          type="button"
          onClick={() => setFreeMode(true)}
          className="text-[11px] text-primary hover:underline"
        >
          자유 입력
        </button>
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        {DAY_LABELS.map((label, idx) => {
          const active = weekdays.includes(idx);
          return (
            <button
              key={label}
              type="button"
              onClick={() => toggleDay(idx)}
              className={`h-7 w-7 rounded-md border text-xs transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background text-foreground hover:bg-muted"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <input
          type="time"
          value={startTime}
          onChange={(e) => onStartChange(e.target.value)}
          className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
        />
        <span className="text-xs text-muted-foreground">~</span>
        <input
          type="time"
          value={endTime}
          onChange={(e) => onEndChange(e.target.value)}
          className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
        />
      </div>
      <p className="mt-1.5 truncate text-[11px] text-muted-foreground">
        {value ? <>저장값: <span className="font-mono text-foreground/80">{value}</span></> : "요일·시간을 선택하세요"}
      </p>
    </div>
  );
}
