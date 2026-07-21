"use client";

/**
 * 연구 방법·분석 도우미 (2026-06-12, 사이클 31)
 *
 * 연구 방법(method) 장 전용 레퍼런스 패널 — 온보딩 선택과 무관하게
 * 연구 설계 9종·통계 분석 8종을 찾아보고 정의·적용 조건·주의점을 확인한 뒤
 * 기술 골격 삽입 / 내 연구 방향 추가까지 한 곳에서 처리한다.
 * 내용은 부심 강의(2·10~14주차) 일반화.
 */

import { useState } from "react";
import Link from "next/link";
import { Compass, FlaskConical, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { STAT_METHOD_LABELS } from "@/types";
import { logEditorEvent } from "./editor-telemetry";
import type { StatMethodType } from "@/types";

// ── 연구 설계 레퍼런스 ──

export interface DesignRef {
  key: string;
  label: string;
  definition: string;
  whenToUse: string;
  caution?: string;
  archiveHref?: string;
  /** '연구 설계' 섹션 기술 골격 */
  skeleton?: string;
}

const DESIGN_REFS: DesignRef[] = [
  {
    key: "experimental",
    label: "실험설계 (무선할당)",
    definition: "연구자가 처치를 조작하고 참여자를 무선할당해 집단을 구성하는 설계입니다.",
    whenToUse: "무선할당이 가능하고 인과 추론이 목적일 때 — 인과 추론력이 가장 강합니다.",
    caution: "학교·군 등 현장에서는 무선할당이 현실적으로 어려워 준실험으로 대체되는 경우가 많습니다.",
    archiveHref: "/archive/research-methods?q=%EB%82%B4%EC%A0%81%20%ED%83%80%EB%8B%B9%EB%8F%84",
    skeleton: "본 연구는 참여자를 실험집단과 통제집단에 무선할당한 진실험설계를 적용하였다.",
  },
  {
    key: "quasi",
    label: "준실험설계 (비동등 통제집단)",
    definition: "기존 집단(학급·부대 등)을 그대로 활용해 실험·통제집단을 구성하는 설계입니다 (O1-X-O2 / O3-O4).",
    whenToUse: "현장에서 무선할당이 불가능할 때 — 교육학에서 가장 강력하고 일반적인 설계입니다(이질 통제집단 사전-사후).",
    caution: "집단 간 사전 차이(선발 위협)는 ANCOVA로 통계적으로 통제하고, 성숙·호손효과 등 경쟁가설을 한계에서 논의하세요.",
    archiveHref: "/archive/research-methods?q=%EC%A4%80%EC%8B%A4%ED%97%98",
    skeleton: "본 연구는 기존 학급 단위로 실험집단과 통제집단을 구성한 비동등 통제집단 사전-사후 설계를 적용하였다.",
  },
  {
    key: "survey",
    label: "비실험 (조사·상관)",
    definition: "변인을 조작하지 않고 설문·검사로 변인 간 관계를 파악하는 설계입니다.",
    whenToUse: "처치가 불가능하거나 변인 간 관계·예측이 목적일 때 적합합니다.",
    caution: "집단 비교든 상관이든 인과관계를 주장할 수 없습니다 — '관련이 있다' 수위로 기술하세요.",
    archiveHref: "/archive/statistical-methods?q=%ED%9A%8C%EA%B7%80",
    skeleton: "본 연구는 ___을 대상으로 설문조사를 실시하여 변인 간 관계를 분석하는 조사연구로 설계되었다.",
  },
  {
    key: "timeseries",
    label: "시계열 설계",
    definition: "한 집단을 처치 전후로 여러 차례 반복 측정하는 설계입니다 (O1 O2 O3 X O4 O5 O6).",
    whenToUse: "통제집단을 구할 수 없을 때 — 반복측정으로 성숙 효과를 일부 통제합니다.",
    caution: "역사(동시 발생 사건) 위협에는 여전히 취약합니다.",
    skeleton: "본 연구는 통제집단 확보가 어려운 현장 여건을 고려하여 단일집단 시계열 설계를 적용하고, 처치 전후 각 ___회 반복 측정하였다.",
  },
  {
    key: "onegroup",
    label: "단일집단 전후검사 ⚠",
    definition: "한 집단에 사전검사-처치-사후검사만 실시하는 설계입니다 (O1-X-O2).",
    whenToUse: "탐색적 예비연구 외에는 권장되지 않습니다.",
    caution: "성숙·역사·검사 효과가 통제되지 않아 실제 학위논문에서는 거의 쓰지 않습니다 — 통제집단 또는 시계열 확보를 우선 검토하세요.",
  },
  {
    key: "qualitative",
    label: "질적 설계 (사례·현상학·근거이론)",
    definition: "소수 참여자를 심층 면담·관찰해 현상의 의미를 이해·해석하는 설계입니다 (귀납적 추론).",
    whenToUse: "현상의 이해·해석·의미 파악이 목적일 때 — 연구자 자신이 중요한 연구 도구가 됩니다.",
    caution: "일반화에 한계가 있습니다 — 맥락의 풍부한 기술과 신뢰성 전략(삼각검증·member check)으로 방어하세요.",
    skeleton: "본 연구는 ___의 경험과 그 의미를 심층적으로 이해하기 위해 질적 사례연구로 설계되었다.",
  },
  {
    key: "mixed",
    label: "혼합 설계",
    definition: "양적·질적 자료를 함께 수집·통합하는 설계입니다 (수렴적/설명적/탐색적/내재적).",
    whenToUse: "수치로 효과를 확인하고 그 기제·맥락을 질적으로 설명하고 싶을 때 적합합니다.",
    caution: "두 자료의 우선순위와 통합(integration) 방식을 설계 단계에서 명시해야 합니다.",
    skeleton: "본 연구는 양적 자료로 효과를 검증하고 질적 자료로 그 과정을 탐색하는 설명적 순차 혼합설계를 적용하였다.",
  },
  {
    key: "development",
    label: "개발연구 (교육공학 고유)",
    definition: "교육 프로그램·모형의 설계→개발→평가를 수행하는 연구입니다 — Type 1(특정 프로그램 개발·활용) / Type 2(모형 일반화·검증).",
    whenToUse: "'OOO 프로그램 개발' 형태의 연구 — 산출물과 그 효과·타당화가 목적일 때.",
    caution: "Type 1은 구체적 결론(개선점·활용 조건)을, Type 2는 모형의 타당도·효과성 증거를 결론으로 제시합니다.",
    archiveHref: "/archive/concept?q=%EA%B5%90%EC%88%98%EC%84%A4%EA%B3%84",
    skeleton: "본 연구는 ___ 프로그램을 설계·개발하고 그 효과를 검증하는 개발연구(Type 1)로 수행되었다.",
  },
  {
    key: "action",
    label: "액션리서치 (실행연구)",
    definition: "현장 실천가가 자신의 실천을 계획-실행-관찰-성찰(Plan-Act-Observe-Reflect) 사이클로 개선하는 연구입니다.",
    whenToUse: "연구자가 현장의 당사자이고, 실천 개선 자체가 목적일 때.",
    caution: "자기 정당화 위험이 있습니다 — member check·동료 검토·삼각검증으로 타당성을 방어하세요.",
    skeleton: "본 연구는 연구자가 속한 현장의 문제를 개선하기 위해 계획-실행-관찰-성찰의 순환 과정을 따르는 실행연구로 설계되었다.",
  },
];

// ── 통계 분석 설명 (가정·골격은 에디터의 기존 자산을 props 로 전달받음) ──

export const STAT_METHOD_DESCRIPTIONS: Record<StatMethodType, { definition: string; whenToUse: string }> = {
  ttest: {
    definition: "두 집단의 평균 차이를 검증합니다 (독립표본/대응표본).",
    whenToUse: "실험-통제 두 집단 비교, 사전-사후 비교 — 셀당 최소 5~7명 이상이 권장됩니다.",
  },
  anova: {
    definition: "세 집단 이상의 평균 차이를 검증합니다 (일원/이원 — 주효과+상호작용).",
    whenToUse: "집단이 3개 이상이거나, 두 독립변인의 상호작용까지 볼 때.",
  },
  ancova: {
    definition: "공변량(사전점수 등)의 영향을 제거한 뒤 집단을 비교합니다.",
    whenToUse: "집단 간 사전 점수에 차이가 있을 때 — 통계적으로 통제(조정)한 뒤 비교해야 합니다.",
  },
  regression: {
    definition: "독립변인이 종속변인에 미치는 영향력을 수치(R²·β)로 추정합니다.",
    whenToUse: "예측·설명력이 목적일 때 — 이분 종속변인은 로지스틱 회귀를 사용합니다.",
  },
  correlation: {
    definition: "두 변인의 선형 관계 강도와 방향을 봅니다 (|r| ≥ .7이면 강한 상관).",
    whenToUse: "변인 간 관련성 탐색 — 상관은 인과관계를 의미하지 않습니다.",
  },
  chisquare: {
    definition: "범주형 변인 간 관련성(독립성)·분포 차이를 검증합니다.",
    whenToUse: "성별·계급 등 범주형 배경변수의 집단 간 동질성 검증에 정석입니다.",
  },
  sem: {
    definition: "다수 변인 간 구조적 관계와 매개·간접효과를 통합 분석합니다.",
    whenToUse: "이론 기반 모형 검증, 매개효과 분석 — 매개 분석은 SEM이 가장 정확합니다.",
  },
  factor_analysis: {
    definition: "문항 간 상관으로 잠재 요인을 규명합니다.",
    whenToUse: "척도의 구성타당도 검증, 문항 축약이 목적일 때.",
  },
};

interface Props {
  userId?: string;
  selectedMethods: StatMethodType[];
  /** 분석 방법별 가정 체크리스트 — 에디터의 ASSUMPTION_GUIDES.assumptions */
  assumptionsByMethod: Record<StatMethodType, string[]>;
  /** 분석 방법별 아카이브 개념명 */
  archiveByMethod: Partial<Record<StatMethodType, string>>;
  readOnly: boolean;
  hasProfile: boolean;
  onInsertAnalysis: (m: StatMethodType) => void;
  onInsertDesign: (ref: DesignRef) => void;
  onAddMethod: (m: StatMethodType) => void;
  onOpenProfile: () => void;
}

export default function MethodHelper({
  userId,
  selectedMethods,
  assumptionsByMethod,
  archiveByMethod,
  readOnly,
  hasProfile,
  onInsertAnalysis,
  onInsertDesign,
  onAddMethod,
  onOpenProfile,
}: Props) {
  const [open, setOpen] = useState(false);
  const [activeDesign, setActiveDesign] = useState<string | null>(null);
  const [activeStat, setActiveStat] = useState<StatMethodType | null>(null);

  const design = DESIGN_REFS.find((d) => d.key === activeDesign) ?? null;
  const statDesc = activeStat ? STAT_METHOD_DESCRIPTIONS[activeStat] : null;

  return (
    <div className="mt-3 rounded-xl border border-info/20 bg-info/5">
      <button
        type="button"
        onClick={() => {
          if (!open) logEditorEvent(userId, "method_helper_open");
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-3.5 py-2.5 text-left"
      >
        <span className="flex items-center gap-1.5 text-xs font-semibold text-info">
          <Compass size={13} />
          연구 방법·분석 도우미 — 설계 9종 · 통계 8종 찾아보기
        </span>
        <ChevronRight
          size={14}
          className={cn(
            "shrink-0 text-info/70 transition-transform",
            open && "rotate-90",
          )}
        />
      </button>

      {open && (
        <div className="space-y-4 border-t border-info/20 px-3.5 py-3">
          {/* ── 연구 설계 ── */}
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-info/80">
              연구 설계 — 어떤 설계로 연구할 것인가
            </p>
            <div className="flex flex-wrap gap-1">
              {DESIGN_REFS.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setActiveDesign((cur) => (cur === d.key ? null : d.key))}
                  className={cn(
                    "rounded-lg border px-2 py-1 text-[11px] transition-colors",
                    activeDesign === d.key
                      ? "border-info bg-info font-medium text-white"
                      : "bg-card hover:bg-muted",
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
            {design && (
              <div className="mt-2 rounded-lg bg-card/70 p-3">
                <p className="text-xs font-bold">{design.label}</p>
                <dl className="mt-1.5 space-y-1 text-[11px] leading-relaxed">
                  <div>
                    <dt className="inline font-semibold text-info">정의 · </dt>
                    <dd className="inline text-foreground/85">{design.definition}</dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold text-info">언제 쓰나 · </dt>
                    <dd className="inline text-foreground/85">{design.whenToUse}</dd>
                  </div>
                  {design.caution && (
                    <div>
                      <dt className="inline font-semibold text-warning">주의 · </dt>
                      <dd className="inline text-foreground/85">{design.caution}</dd>
                    </div>
                  )}
                </dl>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {!readOnly && design.skeleton && (
                    <button
                      type="button"
                      onClick={() => onInsertDesign(design)}
                      className="rounded-full border border-dashed border-info/60 px-2 py-0.5 text-[10px] font-medium text-info transition-colors hover:bg-info hover:text-white"
                    >
                      + 연구 설계 섹션에 기술 골격 삽입
                    </button>
                  )}
                  {design.archiveHref && (
                    <Link
                      href={design.archiveHref}
                      className="rounded-full border border-info/30 px-2 py-0.5 text-[10px] text-info transition-colors hover:bg-info/10"
                    >
                      아카이브 개념 보기
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── 통계 분석 ── */}
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-info/80">
              통계 분석 — 무엇으로 검증할 것인가
            </p>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(STAT_METHOD_LABELS) as StatMethodType[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setActiveStat((cur) => (cur === m ? null : m))}
                  className={cn(
                    "rounded-lg border px-2 py-1 text-[11px] transition-colors",
                    activeStat === m
                      ? "border-info bg-info font-medium text-white"
                      : "bg-card hover:bg-muted",
                    selectedMethods.includes(m) && activeStat !== m && "border-info/40",
                  )}
                >
                  {STAT_METHOD_LABELS[m]}
                  {selectedMethods.includes(m) && " ✓"}
                </button>
              ))}
            </div>
            {activeStat && statDesc && (
              <div className="mt-2 rounded-lg bg-card/70 p-3">
                <p className="text-xs font-bold">{STAT_METHOD_LABELS[activeStat]}</p>
                <dl className="mt-1.5 space-y-1 text-[11px] leading-relaxed">
                  <div>
                    <dt className="inline font-semibold text-info">정의 · </dt>
                    <dd className="inline text-foreground/85">{statDesc.definition}</dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold text-info">언제 쓰나 · </dt>
                    <dd className="inline text-foreground/85">{statDesc.whenToUse}</dd>
                  </div>
                </dl>
                <p className="mt-2 text-[10px] font-semibold text-info/80">기본 가정 검정</p>
                <ul className="mt-0.5 space-y-0.5">
                  {(assumptionsByMethod[activeStat] ?? []).map((a, ai) => (
                    <li key={ai} className="flex gap-1.5 text-[11px] leading-relaxed text-foreground/80">
                      <span className="mt-0.5 shrink-0 text-info">·</span>
                      {a}
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => onInsertAnalysis(activeStat)}
                      className="rounded-full border border-dashed border-info/60 px-2 py-0.5 text-[10px] font-medium text-info transition-colors hover:bg-info hover:text-white"
                    >
                      + 자료 분석 섹션에 기술 문장 삽입
                    </button>
                  )}
                  {!readOnly && !selectedMethods.includes(activeStat) && (
                    <button
                      type="button"
                      onClick={() => (hasProfile ? onAddMethod(activeStat) : onOpenProfile())}
                      className="inline-flex items-center gap-0.5 rounded-full border border-info/60 px-2 py-0.5 text-[10px] font-medium text-info transition-colors hover:bg-info hover:text-white"
                      title="내 연구 방향에 추가하면 연구 결과 장에서 가정 검정 가이드가 자동 표시됩니다"
                    >
                      <Plus size={10} />
                      내 연구 방향에 추가
                    </button>
                  )}
                  {archiveByMethod[activeStat] && (
                    <Link
                      href={archiveByMethod[activeStat]!}
                      className="rounded-full border border-info/30 px-2 py-0.5 text-[10px] text-info transition-colors hover:bg-info/10"
                    >
                      아카이브 개념 보기
                    </Link>
                  )}
                </div>
                <p className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                  <FlaskConical size={10} />
                  내 연구 방향에 추가하면 연구 결과 장에서 이 방법의 가정 검정 가이드가 자동으로 표시됩니다.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
