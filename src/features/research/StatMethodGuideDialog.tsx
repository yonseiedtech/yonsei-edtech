"use client";

/**
 * 통계방법 가이드 팝업 (2026-07-13)
 *
 * 자료 분석 섹션의 '가이드에서 통계방법 찾기'. 두 개의 스텝(탭)으로 구성한다:
 *  1) 설계 조건 추천(첫 화면) — 집단 수·사전검사·무선할당·사전 동질성 4개 조건을 고르면
 *     설계에 맞는 통계방법(사후 t/ANOVA·ANCOVA·대응 t 등)을 근거·주의와 함께 추천하고 바로 선택.
 *  2) 전체 보기 — 공개 통계방법(archive_statistical_methods)을 목적별 그룹으로 탐색·선택.
 * 통계 시드 데이터를 직접 사용하지 않고 공개(published) 데이터를 재사용한다.
 */

import { useMemo, useState } from "react";
import { Sigma, Check, Plus, ListFilter, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type {
  StatisticalMethod,
  StatisticalMethodCategory,
} from "@/types/statistical-method";
import type { DesignConditions } from "@/types/research-design";
import { recommendStatMethods } from "@/lib/stat-method-recommender";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  methods: StatisticalMethod[];
  /** 선택된 통계방법 이름 목록 */
  selected: string[];
  /** 선택 토글 (이름 기준) */
  onToggle: (name: string) => void;
  /** 설계 조건 (집단 수·사전검사·무선할당·사전 동질성) */
  designConditions: DesignConditions;
  /** 설계 조건 변경 */
  onDesignConditionsChange: (next: DesignConditions) => void;
}

/** 목적별 그룹 — 카테고리를 4대 그룹으로 묶는다 */
const PURPOSE_GROUPS: {
  id: string;
  label: string;
  hint: string;
  categories: StatisticalMethodCategory[];
}[] = [
  {
    id: "compare",
    label: "집단 비교",
    hint: "집단 간 평균 차이를 검정 (t-test·ANOVA·ANCOVA 등)",
    categories: ["anova_family", "basic", "nonparametric"],
  },
  {
    id: "relate",
    label: "관계·예측",
    hint: "변인 간 관계·예측·경로 검증 (회귀·SEM 등)",
    categories: ["regression", "sem"],
  },
  {
    id: "factor",
    label: "요인 구조",
    hint: "문항의 잠재 요인 구조·측정 타당도 (EFA·CFA 등)",
    categories: ["factor", "measurement"],
  },
  {
    id: "mediation",
    label: "매개·조절",
    hint: "간접효과·상호작용 검증 (매개·조절·조절된 매개)",
    categories: ["mediation_moderation"],
  },
  {
    id: "etc",
    label: "기타",
    hint: "다층모형 등",
    categories: ["multilevel", "other"],
  },
];

type Tab = "conditions" | "all";

export default function StatMethodGuideDialog({
  open,
  onOpenChange,
  methods,
  selected,
  onToggle,
  designConditions,
  onDesignConditionsChange,
}: Props) {
  const [tab, setTab] = useState<Tab>("conditions");
  const [q, setQ] = useState("");

  const rec = useMemo(
    () => recommendStatMethods(designConditions),
    [designConditions],
  );

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return methods;
    return methods.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        (m.accessibleSummary ?? "").toLowerCase().includes(query) ||
        (m.summary ?? "").toLowerCase().includes(query),
    );
  }, [methods, q]);

  const groups = useMemo(
    () =>
      PURPOSE_GROUPS.map((g) => ({
        ...g,
        items: filtered
          .filter((m) => g.categories.includes(m.category))
          .sort((a, b) => a.name.localeCompare(b.name, "ko")),
      })).filter((g) => g.items.length > 0),
    [filtered],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sigma size={16} className="text-primary" />
            통계방법 가이드에서 찾기
          </DialogTitle>
          <DialogDescription>
            설계 조건을 고르면 맞는 통계방법을 추천해요. 목적별 &lsquo;전체 보기&rsquo;에서 직접 찾을 수도
            있습니다. 여러 개 선택 가능(가설별로 다른 방법 가능).
          </DialogDescription>
        </DialogHeader>

        {/* 스텝(탭) */}
        <div className="mt-1 flex gap-1 rounded-lg border bg-muted/30 p-1">
          <button
            type="button"
            onClick={() => setTab("conditions")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
              tab === "conditions"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <SlidersHorizontal size={12} /> 설계 조건 추천
          </button>
          <button
            type="button"
            onClick={() => setTab("all")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
              tab === "all"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <ListFilter size={12} /> 전체 보기
          </button>
        </div>

        {tab === "conditions" ? (
          <div className="mt-3 space-y-4">
            <DesignConditionForm
              value={designConditions}
              onChange={onDesignConditionsChange}
            />

            {rec.recommended.length === 0 && rec.cautions.length === 0 ? (
              <p className="rounded-lg border border-dashed bg-muted/20 py-6 text-center text-xs text-muted-foreground">
                집단 수부터 선택하면 설계에 맞는 통계방법을 추천해 드려요.
              </p>
            ) : (
              <div className="space-y-2.5">
                {rec.recommended.map((r) => {
                  const on = selected.includes(r.name);
                  const m = methods.find((x) => x.name === r.name);
                  return (
                    <div
                      key={r.name}
                      className="rounded-lg border bg-card/60 p-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{r.name}</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-foreground/80">
                            <span className="font-medium text-primary">추천 이유 · </span>
                            {r.rationale}
                          </p>
                          {m?.accessibleSummary && (
                            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                              {m.accessibleSummary}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => onToggle(r.name)}
                          aria-pressed={on}
                          className={cn(
                            "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                            on
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                          )}
                        >
                          {on ? (
                            <>
                              <Check size={12} /> 선택됨
                            </>
                          ) : (
                            <>
                              <Plus size={12} /> 선택
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
                {rec.cautions.length > 0 && (
                  <ul className="space-y-1 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
                    {rec.cautions.map((c, i) => (
                      <li
                        key={i}
                        className="flex gap-1.5 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300"
                      >
                        <span aria-hidden>⚠</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="mt-2">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="통계방법 검색 (예: 회귀, ANOVA, 매개)"
                className="h-9 text-sm"
              />
            </div>

            {methods.length === 0 ? (
              <p className="mt-4 rounded-lg border border-dashed bg-muted/20 py-6 text-center text-xs text-muted-foreground">
                공개된 통계방법 데이터가 아직 없습니다.
              </p>
            ) : (
              <div className="mt-3 space-y-4">
                {groups.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    검색 결과가 없습니다.
                  </p>
                ) : (
                  groups.map((g) => (
                    <div key={g.id}>
                      <div className="mb-1.5">
                        <p className="text-xs font-semibold text-foreground">{g.label}</p>
                        <p className="text-[10px] text-muted-foreground">{g.hint}</p>
                      </div>
                      <ul className="space-y-1.5">
                        {g.items.map((m) => {
                          const on = selected.includes(m.name);
                          return (
                            <li
                              key={m.id}
                              className="rounded-lg border bg-card/60 p-2.5"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium">{m.name}</p>
                                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                                    {m.summary}
                                  </p>
                                  {m.whenToUse && (
                                    <p className="mt-1 text-[11px] leading-relaxed text-foreground/80">
                                      <span className="font-medium text-primary">적용 조건 · </span>
                                      {m.whenToUse}
                                    </p>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => onToggle(m.name)}
                                  aria-pressed={on}
                                  className={cn(
                                    "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                                    on
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                                  )}
                                >
                                  {on ? (
                                    <>
                                      <Check size={12} /> 선택됨
                                    </>
                                  ) : (
                                    <>
                                      <Plus size={12} /> 선택
                                    </>
                                  )}
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** 설계 조건 미니 폼 — 집단 수·사전검사·무선할당·사전 동질성 4개 선택 (에디터와 공유) */
export function DesignConditionForm({
  value,
  onChange,
}: {
  value: DesignConditions;
  onChange: (next: DesignConditions) => void;
}) {
  const twoPlus = value.groupCount === "2" || value.groupCount === "3plus";
  const selectClass =
    "w-full rounded-md border bg-background px-2.5 py-1.5 text-xs disabled:opacity-50";

  return (
    <div className="grid grid-cols-2 gap-2.5">
      <label className="text-[11px] font-medium text-muted-foreground">
        비교 집단 수
        <select
          value={value.groupCount ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              groupCount: (e.target.value || undefined) as DesignConditions["groupCount"],
            })
          }
          className={cn(selectClass, "mt-1")}
        >
          <option value="">— 선택 —</option>
          <option value="1">단일집단</option>
          <option value="2">2집단</option>
          <option value="3plus">3집단 이상</option>
        </select>
      </label>

      <label className="text-[11px] font-medium text-muted-foreground">
        사전검사
        <select
          value={
            value.hasPretest === undefined ? "" : value.hasPretest ? "yes" : "no"
          }
          onChange={(e) =>
            onChange({
              ...value,
              hasPretest:
                e.target.value === "" ? undefined : e.target.value === "yes",
            })
          }
          className={cn(selectClass, "mt-1")}
        >
          <option value="">— 선택 —</option>
          <option value="yes">있음 (사전-사후)</option>
          <option value="no">없음 (사후만)</option>
        </select>
      </label>

      <label
        className={cn(
          "text-[11px] font-medium text-muted-foreground",
          !twoPlus && "opacity-50",
        )}
      >
        무선할당
        <select
          value={
            value.randomAssignment === undefined
              ? ""
              : value.randomAssignment
                ? "yes"
                : "no"
          }
          disabled={!twoPlus}
          onChange={(e) =>
            onChange({
              ...value,
              randomAssignment:
                e.target.value === "" ? undefined : e.target.value === "yes",
            })
          }
          className={cn(selectClass, "mt-1")}
        >
          <option value="">— 선택 —</option>
          <option value="yes">예 (실험)</option>
          <option value="no">아니오 (준실험)</option>
        </select>
      </label>

      <label
        className={cn(
          "text-[11px] font-medium text-muted-foreground",
          !(twoPlus && value.hasPretest) && "opacity-50",
        )}
      >
        사전 동질성
        <select
          value={value.pretestEquivalence ?? ""}
          disabled={!(twoPlus && value.hasPretest)}
          onChange={(e) =>
            onChange({
              ...value,
              pretestEquivalence: (e.target.value ||
                undefined) as DesignConditions["pretestEquivalence"],
            })
          }
          className={cn(selectClass, "mt-1")}
        >
          <option value="">— 선택 —</option>
          <option value="equivalent">동질 확보</option>
          <option value="different">차이 존재</option>
          <option value="unknown">불확실</option>
        </select>
      </label>
    </div>
  );
}
