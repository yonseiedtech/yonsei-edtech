"use client";

/**
 * 연구 방법 구조화 위젯 (R5, 2026-07-03)
 *
 * 방법 장 하단의 두 편집기:
 *  A. 측정도구 신뢰도 표 — 도구명·출처·문항 수·척도·α(선행/본 연구) 행 편집
 *     → '측정 도구' 절에 표 삽입 (심사 단골: 도구별 신뢰도·타당도 표)
 *  B. 연구 절차 타임라인 — 시기·단계·내용 행 편집 (사전검사→처치→사후검사 프리셋)
 *     → '연구 절차' 절에 표 삽입
 * 행 데이터는 WritingPaper.instruments / procedureSteps 로 저장(문서 단위 영속).
 */

import { useState } from "react";
import { Ruler, CalendarRange, Plus, Trash2, ChevronRight, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { InstrumentItem, ProcedureStep, ResearchApproachType } from "@/types";

function newId(prefix: string): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }
}

function cellOf(v: string): string {
  const t = (v ?? "").replace(/\|/g, "/").replace(/\s+/g, " ").trim();
  return t || "___";
}

/**
 * 측정도구 표 텍스트 — 도구명이 있는 행만 포함.
 * 질적 연구는 α 열 없이 '자료 수집 도구' 표로 생성 (2026-07-03 — 질적·혼합 사용자 대응).
 */
export function buildInstrumentTable(items: InstrumentItem[], qual = false): string {
  const rows = items.filter((i) => i.name.trim());
  if (rows.length === 0) return "";
  if (qual) {
    const header = "자료 수집 도구 | 출처(개발·검토) | 구성 | 유형";
    const body = rows.map((i) => [i.name, i.source, i.itemCount, i.scale].map(cellOf).join(" | "));
    return `<표 _-_> 자료 수집 도구의 구성\n${header}\n${body.join("\n")}`;
  }
  const header = "측정 도구 | 출처(개발·번안) | 문항 수 | 척도 | 선행연구 α | 본 연구 α";
  const body = rows.map((i) =>
    [i.name, i.source, i.itemCount, i.scale, i.alphaPrior, i.alphaCurrent].map(cellOf).join(" | "),
  );
  return `<표 _-_> 측정도구의 구성과 신뢰도\n${header}\n${body.join("\n")}`;
}

/** 연구 절차 표 텍스트 — 내용이 있는 행만 포함 */
export function buildProcedureTable(steps: ProcedureStep[]): string {
  const rows = steps.filter((s) => s.activity.trim() || s.label.trim());
  if (rows.length === 0) return "";
  const header = "시기 | 단계 | 주요 내용";
  const body = rows.map((s) => [s.period, s.label, s.activity].map(cellOf).join(" | "));
  return `<표 _-_> 연구 절차\n${header}\n${body.join("\n")}`;
}

/** 절차 프리셋 — 양적: 준실험(사전-처치-사후) / 질적: 모집-수집-분석-확인 (혼합은 둘 다 제공) */
const PROCEDURE_PRESET_QUANT: Omit<ProcedureStep, "id">[] = [
  { period: "1주차", label: "사전검사", activity: "실험·통제집단 대상 사전검사 실시 (___ 척도)" },
  { period: "2~9주차", label: "처치(프로그램 적용)", activity: "실험집단에 ___ 프로그램 8차시 적용, 통제집단은 기존 수업" },
  { period: "10주차", label: "사후검사", activity: "두 집단 대상 사후검사 실시 (사전과 동일 도구)" },
];
const PROCEDURE_PRESET_QUAL: Omit<ProcedureStep, "id">[] = [
  { period: "1~2주차", label: "참여자 모집·동의", activity: "선정 기준에 따라 참여자 모집, 연구 설명 후 동의 확보·라포 형성" },
  { period: "3~8주차", label: "자료 수집", activity: "심층 면담(회당 ___분, 총 ___회)·참여 관찰·문서 수집" },
  { period: "9~11주차", label: "전사·코딩·분석", activity: "면담 전사 후 개방 코딩 → 범주화 → 주제 도출" },
  { period: "12주차", label: "참여자 확인", activity: "분석 결과를 참여자에게 확인받고(member check) 해석 보완" },
];

type InstField = { key: keyof Omit<InstrumentItem, "id">; label: string; ph: string; w: string };
const INSTRUMENT_FIELDS_QUANT: InstField[] = [
  { key: "name", label: "측정 도구", ph: "예: 학습동기 척도", w: "sm:col-span-3" },
  { key: "source", label: "출처(개발·번안)", ph: "예: 김○○(2018) 번안", w: "sm:col-span-3" },
  { key: "itemCount", label: "문항 수", ph: "예: 20(4요인)", w: "sm:col-span-2" },
  { key: "scale", label: "척도", ph: "예: 5점 Likert", w: "sm:col-span-2" },
  { key: "alphaPrior", label: "선행 α", ph: ".89", w: "sm:col-span-1" },
  { key: "alphaCurrent", label: "본 연구 α", ph: ".91", w: "sm:col-span-1" },
];
const INSTRUMENT_FIELDS_QUAL: InstField[] = [
  { key: "name", label: "자료 수집 도구", ph: "예: 반구조화 면담 가이드", w: "sm:col-span-4" },
  { key: "source", label: "출처(개발·검토)", ph: "예: 연구자 개발, 전문가 2인 검토", w: "sm:col-span-4" },
  { key: "itemCount", label: "구성", ph: "예: 핵심 질문 12개", w: "sm:col-span-2" },
  { key: "scale", label: "유형", ph: "예: 면담/관찰/문서", w: "sm:col-span-2" },
];

export default function MethodStructurePanel({
  instruments,
  procedure,
  readOnly,
  approach,
  onInstrumentsChange,
  onProcedureChange,
  onInsertInstruments,
  onInsertProcedure,
}: {
  instruments: InstrumentItem[];
  procedure: ProcedureStep[];
  readOnly?: boolean;
  /** 연구 접근 — 질적이면 α 열 없는 자료 수집 도구 표, 혼합이면 절차 프리셋 2종 */
  approach?: ResearchApproachType;
  onInstrumentsChange: (next: InstrumentItem[]) => void;
  onProcedureChange: (next: ProcedureStep[]) => void;
  /** 완성된 표 텍스트를 '측정 도구' 절에 삽입 */
  onInsertInstruments: (tableText: string) => void;
  /** 완성된 표 텍스트를 '연구 절차' 절에 삽입 */
  onInsertProcedure: (tableText: string) => void;
}) {
  const [instOpen, setInstOpen] = useState(false);
  const [procOpen, setProcOpen] = useState(false);

  const qual = approach === "qualitative";
  const mixed = approach === "mixed";
  const instFields = qual ? INSTRUMENT_FIELDS_QUAL : INSTRUMENT_FIELDS_QUANT;
  const instTable = buildInstrumentTable(instruments, qual);
  const procTable = buildProcedureTable(procedure);

  function patchInstrument(id: string, key: keyof Omit<InstrumentItem, "id">, v: string) {
    onInstrumentsChange(instruments.map((i) => (i.id === id ? { ...i, [key]: v } : i)));
  }
  function patchStep(id: string, key: keyof Omit<ProcedureStep, "id">, v: string) {
    onProcedureChange(procedure.map((s) => (s.id === id ? { ...s, [key]: v } : s)));
  }

  return (
    <>
      {/* ── A. 측정도구 신뢰도 표 ── */}
      <div className="mt-3 rounded-xl border border-sky-200/70 bg-sky-50/40 dark:border-sky-800/50 dark:bg-sky-950/10">
        <button
          type="button"
          onClick={() => setInstOpen((v) => !v)}
          aria-expanded={instOpen}
          className="flex w-full items-center justify-between px-3.5 py-2.5 text-left"
        >
          <span className="flex items-center gap-1.5 text-xs font-semibold text-sky-800 dark:text-sky-200">
            <Ruler size={13} />
            {qual ? "자료 수집 도구 표" : "측정도구 신뢰도 표"}
            {instruments.length > 0 && (
              <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
                {instruments.filter((i) => i.name.trim()).length}개 도구
              </span>
            )}
            <span className="font-normal text-sky-700/80 dark:text-sky-300/80">
              {qual
                ? "면담 가이드·관찰지의 출처와 구성을 표로 — 개발·검토 과정이 엄격성의 근거"
                : "도구별 α를 표로 — 선행·본 연구 함께 보고하면 방어가 강해집니다"}
            </span>
          </span>
          <ChevronRight
            size={14}
            className={cn("shrink-0 text-sky-700/70 transition-transform dark:text-sky-300/70", instOpen && "rotate-90")}
          />
        </button>
        {instOpen && (
          <div className="space-y-2 border-t border-sky-200/60 px-3.5 py-3 dark:border-sky-800/40">
            {instruments.length === 0 && (
              <p className="rounded-lg border border-dashed bg-card/50 px-3 py-3 text-center text-[11px] text-muted-foreground">
                아직 도구가 없습니다 — &lsquo;도구 추가&rsquo;로 {qual ? "수집 도구마다" : "측정 변인마다"} 한 행씩 채우세요.
              </p>
            )}
            {instruments.map((inst) => (
              <div key={inst.id} className="rounded-lg border bg-card p-2">
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-12">
                  {instFields.map((f) => (
                    <label key={f.key} className={cn("block", f.w)}>
                      <span className="text-[9px] font-medium text-muted-foreground">{f.label}</span>
                      <Input
                        className="h-7 text-[11px]"
                        value={inst[f.key]}
                        placeholder={f.ph}
                        disabled={readOnly}
                        onChange={(e) => patchInstrument(inst.id, f.key, e.target.value)}
                      />
                    </label>
                  ))}
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => onInstrumentsChange(instruments.filter((i) => i.id !== inst.id))}
                    className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={10} />
                    행 삭제
                  </button>
                )}
              </div>
            ))}
            {!readOnly && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() =>
                    onInstrumentsChange([
                      ...instruments,
                      { id: newId("inst"), name: "", source: "", itemCount: "", scale: "", alphaPrior: "", alphaCurrent: "" },
                    ])
                  }
                >
                  <Plus size={13} className="mr-1" />
                  도구 추가
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={!instTable}
                  onClick={() => onInsertInstruments(instTable)}
                >
                  <Table2 size={13} className="mr-1" />
                  &lsquo;{qual ? "자료 수집" : "측정 도구"}&rsquo; 절에 표 삽입
                </Button>
              </div>
            )}
            {qual && instruments.some((i) => i.alphaPrior.trim() || i.alphaCurrent.trim()) && (
              <p className="rounded-lg bg-amber-50 px-2 py-1 text-[10px] text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                ⚠ 양적 모드에서 입력한 신뢰도 α 값이 남아 있어요 — 질적 표에는 표시·삽입되지 않습니다(데이터는 보존).
              </p>
            )}
            <p className="text-[10px] text-muted-foreground">
              {qual
                ? "도구 개발·검토 과정(전문가 검토, 파일럿 면담)과 신뢰성 전략(삼각검증·참여자 확인)은 본문 문장으로 보완하세요."
                : "본 연구 α는 분석 후 채워도 됩니다(빈칸은 ___). 신뢰도와 별개로 타당도(내용·구인) 확보 방법은 본문에 문장으로 기술하세요."}
            </p>
          </div>
        )}
      </div>

      {/* ── B. 연구 절차 타임라인 ── */}
      <div className="mt-3 rounded-xl border border-violet-200/70 bg-violet-50/40 dark:border-violet-800/50 dark:bg-violet-950/10">
        <button
          type="button"
          onClick={() => setProcOpen((v) => !v)}
          aria-expanded={procOpen}
          className="flex w-full items-center justify-between px-3.5 py-2.5 text-left"
        >
          <span className="flex items-center gap-1.5 text-xs font-semibold text-violet-800 dark:text-violet-200">
            <CalendarRange size={13} />
            연구 절차 타임라인
            {procedure.length > 0 && (
              <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                {procedure.length}단계
              </span>
            )}
            <span className="font-normal text-violet-700/80 dark:text-violet-300/80">
              {qual
                ? "모집 → 자료 수집 → 분석 → 참여자 확인 흐름을 표로"
                : mixed
                  ? "양적(사전-처치-사후)·질적(면담) 절차를 한 표로"
                  : "사전검사 → 처치 → 사후검사 시점·간격을 표로"}
            </span>
          </span>
          <ChevronRight
            size={14}
            className={cn("shrink-0 text-violet-700/70 transition-transform dark:text-violet-300/70", procOpen && "rotate-90")}
          />
        </button>
        {procOpen && (
          <div className="space-y-2 border-t border-violet-200/60 px-3.5 py-3 dark:border-violet-800/40">
            {(procedure.length === 0 || mixed) && !readOnly && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed bg-card/50 px-3 py-2.5">
                <p className="text-[11px] text-muted-foreground">표준 골격으로 시작할 수 있어요:</p>
                {!qual && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[11px]"
                    onClick={() =>
                      onProcedureChange(PROCEDURE_PRESET_QUANT.map((s) => ({ ...s, id: newId("proc") })))
                    }
                  >
                    양적: 사전 → 처치 → 사후
                  </Button>
                )}
                {(qual || mixed) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[11px]"
                    onClick={() =>
                      onProcedureChange([
                        ...procedure,
                        ...PROCEDURE_PRESET_QUAL.map((s) => ({ ...s, id: newId("proc") })),
                      ])
                    }
                  >
                    질적: 모집 → 수집 → 분석 → 확인
                  </Button>
                )}
              </div>
            )}
            {procedure.map((s) => (
              <div key={s.id} className="rounded-lg border bg-card p-2">
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-12">
                  <label className="block sm:col-span-2">
                    <span className="text-[9px] font-medium text-muted-foreground">시기</span>
                    <Input
                      className="h-7 text-[11px]"
                      value={s.period}
                      placeholder="예: 1주차"
                      disabled={readOnly}
                      onChange={(e) => patchStep(s.id, "period", e.target.value)}
                    />
                  </label>
                  <label className="block sm:col-span-3">
                    <span className="text-[9px] font-medium text-muted-foreground">단계</span>
                    <Input
                      className="h-7 text-[11px]"
                      value={s.label}
                      placeholder="예: 사전검사"
                      disabled={readOnly}
                      onChange={(e) => patchStep(s.id, "label", e.target.value)}
                    />
                  </label>
                  <label className="col-span-2 block sm:col-span-7">
                    <span className="text-[9px] font-medium text-muted-foreground">주요 내용</span>
                    <Input
                      className="h-7 text-[11px]"
                      value={s.activity}
                      placeholder="예: 두 집단 대상 사전검사 실시"
                      disabled={readOnly}
                      onChange={(e) => patchStep(s.id, "activity", e.target.value)}
                    />
                  </label>
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => onProcedureChange(procedure.filter((x) => x.id !== s.id))}
                    className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={10} />
                    행 삭제
                  </button>
                )}
              </div>
            ))}
            {!readOnly && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() =>
                    onProcedureChange([...procedure, { id: newId("proc"), period: "", label: "", activity: "" }])
                  }
                >
                  <Plus size={13} className="mr-1" />
                  단계 추가
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={!procTable}
                  onClick={() => onInsertProcedure(procTable)}
                >
                  <Table2 size={13} className="mr-1" />
                  &lsquo;연구 절차&rsquo; 절에 표 삽입
                </Button>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground">
              {qual
                ? "자료 수집·분석의 감사 추적(audit trail)이 드러나게 — 회차·시간·전사 방식은 실제 수치로 보완하세요."
                : mixed
                  ? "양적·질적 자료의 수집 순서와 통합 시점(수렴/설명적/탐색적)이 표에서 드러나야 합니다."
                  : "처치 기간의 충분성(인지·태도 변화는 최소 5차시 내외)과 두 집단이 처치 외 조건에서 동일했음을 본문 문장으로 보완하세요."}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
