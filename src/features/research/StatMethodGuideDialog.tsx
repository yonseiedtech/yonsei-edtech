"use client";

/**
 * 통계방법 가이드 팝업 (2026-07-13)
 *
 * 자료 분석 섹션의 '가이드에서 통계방법 찾기' — 공개 통계방법(archive_statistical_methods)을
 * 목적별 그룹(집단 비교/관계·예측/요인 구조/매개·조절)으로 탐색하고, 각 방법의
 * summary·적용 조건(whenToUse)을 확인한 뒤 '선택'으로 selectedStatMethods 에 반영한다.
 * 통계 시드 데이터를 직접 사용하지 않고 공개(published) 데이터를 재사용한다.
 */

import { useMemo, useState } from "react";
import { Sigma, Check, Plus } from "lucide-react";
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  methods: StatisticalMethod[];
  /** 선택된 통계방법 이름 목록 */
  selected: string[];
  /** 선택 토글 (이름 기준) */
  onToggle: (name: string) => void;
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

export default function StatMethodGuideDialog({
  open,
  onOpenChange,
  methods,
  selected,
  onToggle,
}: Props) {
  const [q, setQ] = useState("");

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
            목적별로 통계방법을 살펴보고 &lsquo;선택&rsquo;하면 자료 분석 계획에 추가됩니다. 여러 개를
            선택할 수 있어요(가설별로 다른 방법 가능).
          </DialogDescription>
        </DialogHeader>

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
      </DialogContent>
    </Dialog>
  );
}
