"use client";

/** 7. 자료 수집·분석 (통계 추천·선택 포함) (2026-07-13, M1 분리 — 동작·UI 불변) */

import Link from "next/link";
import { CheckCircle2, Plus, X, Sigma, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { StatisticalMethod } from "@/types";
import type { DesignConditions } from "@/types/research-design";
import type { StatMethodRecommendResult } from "@/lib/stat-method-recommender";
import { Field } from "./Section";
import { DesignConditionForm } from "./DesignConditionForm";
import type { FormState } from "./types";

export function CollectionAnalysisSection({
  form,
  readOnly,
  isQual,
  showStatMethods,
  statMethods,
  statRecommend,
  onDataCollectionChange,
  onDataAnalysisChange,
  onDesignConditionsChange,
  onToggleStatMethod,
  onApplyRecommendedStats,
  onOpenStatGuide,
}: {
  form: FormState;
  readOnly: boolean;
  isQual: boolean;
  showStatMethods: boolean;
  statMethods: StatisticalMethod[];
  statRecommend: StatMethodRecommendResult;
  onDataCollectionChange: (v: string) => void;
  onDataAnalysisChange: (v: string) => void;
  onDesignConditionsChange: (next: DesignConditions) => void;
  onToggleStatMethod: (name: string) => void;
  onApplyRecommendedStats: () => void;
  onOpenStatGuide: () => void;
}) {
  return (
    <>
      <Field label="자료 수집 절차">
        <Textarea value={form.dataCollection} disabled={readOnly}
          onChange={(e) => onDataCollectionChange(e.target.value)}
          placeholder={isQual
            ? "예: 심층 면담(1인 60~90분)·참여관찰·문서 수집을 병행하고 전사한다."
            : "예: 사전-사후 검사를 동일 도구로 실시하고 온라인 설문을 2주간 배포·회수한다."}
          rows={3} />
      </Field>
      <Field label={isQual ? "자료 분석 — 코딩·주제분석·신뢰성 확보" : "자료 분석 — 가설별 통계방법"} className="mt-3">
        <Textarea value={form.dataAnalysis} disabled={readOnly}
          onChange={(e) => onDataAnalysisChange(e.target.value)}
          placeholder={isQual
            ? "예: 개방·축·선택 코딩으로 주제를 도출하고 삼각검증·구성원 확인(member check)으로 신뢰성을 확보한다."
            : "예: 가설1 — 사전점수 통제 ANCOVA / 가설2 — 위계적 회귀분석. SPSS 27 사용."}
          rows={4} />
      </Field>

      {/* 설계 조건 → 통계방법 추천 (양적·혼합, 집단 비교 연구) */}
      {showStatMethods && (
        <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs font-semibold text-foreground">
            설계 조건으로 통계방법 추천받기
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            집단 비교(효과 검증) 연구라면 아래 조건을 고르세요. 사전검사·무선할당·동질성에 따라 사후검사 t-test/ANOVA·ANCOVA 등이 달라집니다.
          </p>
          <div className="mt-2.5">
            <DesignConditionForm
              value={form.designConditions}
              onChange={readOnly ? () => {} : onDesignConditionsChange}
            />
          </div>

          {(statRecommend.recommended.length > 0 ||
            statRecommend.cautions.length > 0) && (
            <div className="mt-3 space-y-2">
              {statRecommend.recommended.map((r) => {
                const on = form.selectedStatMethods.includes(r.name);
                return (
                  <div
                    key={r.name}
                    className="rounded-lg border bg-card p-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground">
                          이 설계라면 · {r.name}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                          {r.rationale}
                        </p>
                      </div>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => onToggleStatMethod(r.name)}
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
                              <CheckCircle2 size={11} /> 선택됨
                            </>
                          ) : (
                            <>
                              <Plus size={11} /> 선택
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {statRecommend.cautions.length > 0 && (
                <ul className="space-y-1 rounded-lg border border-warning/30 bg-warning/5 p-2.5">
                  {statRecommend.cautions.map((c, i) => (
                    <li
                      key={i}
                      className="flex gap-1.5 text-[11px] leading-relaxed text-warning"
                    >
                      <span aria-hidden>⚠</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              )}

              {!readOnly && statRecommend.recommended.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={onApplyRecommendedStats}
                >
                  <CheckCircle2 size={12} className="mr-1" /> 추천 반영
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 통계방법 선택 (양적·혼합) */}
      {showStatMethods && (
        <div className="mt-3">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <label className="block text-xs font-medium text-muted-foreground">
              통계 분석 방법 (여러 개 선택 가능 — 가설별로 다른 방법 가능)
            </label>
            {!readOnly && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={onOpenStatGuide}
              >
                <Sigma size={12} className="mr-1" /> 가이드에서 통계방법 찾기
              </Button>
            )}
          </div>
          {statMethods.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {statMethods
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name, "ko"))
                .map((m) => {
                  const on = form.selectedStatMethods.includes(m.name);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      disabled={readOnly}
                      onClick={() => onToggleStatMethod(m.name)}
                      aria-pressed={on}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-60",
                        on
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {on && <CheckCircle2 size={10} className="mr-1 inline" />}
                      {m.name}
                    </button>
                  );
                })}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              공개된 통계방법 데이터가 아직 없습니다. 가이드 팝업에서 확인하세요.
            </p>
          )}

          {/* 선택된 통계방법 한 줄 설명 */}
          {form.selectedStatMethods.length > 0 && (
            <ul className="mt-2.5 space-y-1.5">
              {form.selectedStatMethods.map((name) => {
                const m = statMethods.find((x) => x.name === name);
                const desc = m?.accessibleSummary || m?.summary || "";
                return (
                  <li
                    key={name}
                    className="flex items-start gap-2 rounded-lg border bg-muted/20 px-2.5 py-1.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-foreground">{name}</p>
                      {desc && (
                        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                          {desc}
                        </p>
                      )}
                    </div>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => onToggleStatMethod(name)}
                        className="mt-0.5 rounded-md p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`${name} 제거`}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <Link
        href="/archive/statistical-methods"
        className="mt-2 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
      >
        통계방법 가이드 보기 <ExternalLink size={10} />
      </Link>
    </>
  );
}
