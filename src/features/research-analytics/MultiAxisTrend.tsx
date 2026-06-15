"use client";

/**
 * MultiAxisTrend — 다축 트렌드 + 모음 (사이클 121 리브랜딩)
 * 연구방법·변인·측정도구·연구대상을 축 토글로 전환하며
 * (1) 상위 항목 빈도 + 시대별 흐름 스파크, (2) 항목 클릭 시 해당 논문 모음(drill-down).
 * 변인·측정도구는 id→name 맵(nameOf)으로 라벨링.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { Layers, ChevronRight, X, GraduationCap } from "lucide-react";
import type { AlumniThesis } from "@/types";
import {
  AXIS_ACCESSORS,
  AXIS_LABELS,
  axisTrendByEra,
  collectByItem,
  topItems,
  type AxisKey,
} from "./multi-axis";
import { dynamicEras, thesesYearRange, yearFrom } from "./shared";

interface Props {
  theses: AlumniThesis[];
  /** 변인·측정도구 id를 사람이 읽는 이름으로 (method/subject/keyword는 값 그대로) */
  nameOf: (axis: AxisKey, value: string) => string;
}

const AXES: AxisKey[] = ["method", "variable", "measurement", "subject"];
// 네이비 계열 (연세 네이비 톤) — 사이클 122 사용자 요청
const AXIS_ACCENT: Record<AxisKey, string> = {
  method: "#1e3a8a",
  variable: "#3730a3",
  measurement: "#1e40af",
  subject: "#4338ca",
  keyword: "#312e81",
};

export default function MultiAxisTrend({ theses, nameOf }: Props) {
  const [axis, setAxis] = useState<AxisKey>("method");
  const [selected, setSelected] = useState<string | null>(null);

  const accessor = AXIS_ACCESSORS[axis];
  const accent = AXIS_ACCENT[axis];

  const top = useMemo(() => topItems(theses, accessor, 10), [theses, accessor]);
  const { min, max } = useMemo(() => thesesYearRange(theses), [theses]);
  const eras = useMemo(() => dynamicEras(min, max, 5), [min, max]);
  const trend = useMemo(
    () => axisTrendByEra(theses, accessor, eras, top.map((t) => t.item)),
    [theses, accessor, eras, top],
  );
  const maxCount = Math.max(1, ...top.map((t) => t.count));

  const collected = useMemo(
    () => (selected ? collectByItem(theses, accessor, selected) : []),
    [theses, accessor, selected],
  );

  function switchAxis(a: AxisKey) {
    setAxis(a);
    setSelected(null);
  }

  return (
    <section id="multi-axis" className="scroll-mt-20 rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <Layers className="h-5 w-5" style={{ color: accent }} />
        <h3 className="text-base font-semibold tracking-tight">다축 연구 트렌드</h3>
        <span className="text-xs text-muted-foreground">— 항목을 누르면 해당 논문을 모아 봅니다</span>
      </div>

      {/* 축 토글 */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {AXES.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => switchAxis(a)}
            className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
            style={
              a === axis
                ? { backgroundColor: AXIS_ACCENT[a], color: "#fff" }
                : { backgroundColor: "var(--muted, #f1f5f9)", color: "#475569" }
            }
          >
            {AXIS_LABELS[a]}
          </button>
        ))}
      </div>

      {/* 상위 항목 — 빈도 바 + 시대 스파크 */}
      <ul className="space-y-1.5" aria-label={`${AXIS_LABELS[axis]} 상위 항목별 논문 빈도 — 항목별 논문 수`}>
        {top.map(({ item, count }) => {
          const label = nameOf(axis, item);
          const isSel = selected === item;
          return (
            <li key={item}>
              <button
                type="button"
                onClick={() => setSelected(isSel ? null : item)}
                aria-label={`${label} ${count}편 — 누르면 해당 논문 모아보기`}
                aria-expanded={isSel}
                className="group flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-muted/50"
                style={isSel ? { backgroundColor: `${accent}14` } : undefined}
              >
                <span className="w-32 shrink-0 truncate text-xs font-medium sm:w-40" title={label}>
                  {label}
                </span>
                {/* 빈도 바 */}
                <span className="relative h-4 flex-1 overflow-hidden rounded bg-muted/60">
                  <span
                    className="absolute inset-y-0 left-0 rounded transition-all"
                    style={{ width: `${(count / maxCount) * 100}%`, backgroundColor: accent, opacity: isSel ? 1 : 0.7 }}
                  />
                </span>
                {/* 시대 스파크 */}
                <span className="hidden items-end gap-0.5 sm:flex" aria-hidden>
                  {trend.map((e) => {
                    const c = e.counts[item] ?? 0;
                    const eMax = Math.max(1, ...trend.map((x) => x.counts[item] ?? 0));
                    return (
                      <span
                        key={e.era.label}
                        className="w-1.5 rounded-sm"
                        style={{ height: `${4 + (c / eMax) * 14}px`, backgroundColor: accent, opacity: c ? 0.85 : 0.18 }}
                        title={`${e.era.label}: ${c}`}
                      />
                    );
                  })}
                </span>
                <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{count}</span>
                <ChevronRight
                  className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${isSel ? "rotate-90" : ""}`}
                />
              </button>
            </li>
          );
        })}
      </ul>

      {/* drill-down 모음 */}
      {selected && (
        <div className="mt-3 rounded-xl border bg-background p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">
              <span style={{ color: accent }}>{nameOf(axis, selected)}</span>
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                {collected.length}편의 논문
              </span>
            </p>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              aria-label="닫기"
            >
              <X size={14} />
            </button>
          </div>
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {collected.map((t) => {
              const y = yearFrom(t);
              return (
                <li key={t.id}>
                  <Link
                    href={`/alumni/thesis/${t.id}`}
                    className="flex items-start justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{t.title}</span>
                      <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        {y && <span>{y}</span>}
                        {t.advisorName && (
                          <span className="inline-flex items-center gap-0.5">
                            <GraduationCap className="h-3 w-3" />
                            {t.advisorName}
                          </span>
                        )}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
