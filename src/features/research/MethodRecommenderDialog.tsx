"use client";

/**
 * 연구방법 추천 가이드 팝업 (2026-07-13)
 *
 * '가이드로 내 연구에 맞는 연구방법 찾기' — 간단한 결정 도우미.
 * 연구 목적·처치 여부·무선할당 가능성·개발 대상·이해 초점 질문에 답하면
 * recommendResearchMethods(순수 함수)로 후보 방법 1~3개를 추천한다.
 * '이 방법 선택' 시 methodName·접근(kind)을 설계 폼에 반영하고 팝업을 닫는다.
 */

import { useMemo, useState } from "react";
import { Wand2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  recommendResearchMethods,
  type RecommenderAnswers,
  type RecommenderDevelopKind,
  type RecommenderGoal,
  type RecommenderUnderstandFocus,
} from "@/lib/research-method-recommender";
import type { ResearchMethod, ResearchMethodKind } from "@/types";
import { RESEARCH_METHOD_KIND_LABELS } from "@/types/research-method";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 요약 표시용 — 공개 연구방법 목록(이름으로 매칭) */
  methods: ResearchMethod[];
  /** 선택 확정 — 연구방법 이름·접근 반영 */
  onSelect: (methodName: string, kind: ResearchMethodKind) => void;
}

const GOAL_OPTIONS: { value: Exclude<RecommenderGoal, "">; label: string; hint: string }[] = [
  { value: "verify", label: "숫자로 효과·관계를 검증", hint: "통계로 차이·관계·예측을 확인" },
  { value: "understand", label: "심층 경험·의미를 이해", hint: "소수의 경험·과정을 깊이 해석" },
  { value: "develop", label: "도구·프로그램을 직접 개발", hint: "프로그램·모형·측정도구 개발·타당화" },
];

const DEVELOP_OPTIONS: { value: Exclude<RecommenderDevelopKind, "">; label: string }[] = [
  { value: "program", label: "교육 프로그램(수업·연수·콘텐츠)" },
  { value: "model", label: "모형(교수설계·운영·역량)" },
  { value: "instrument", label: "측정도구(검사·척도)" },
];

const UNDERSTAND_OPTIONS: { value: Exclude<RecommenderUnderstandFocus, "">; label: string }[] = [
  { value: "experience", label: "체험의 공통된 본질·의미" },
  { value: "process", label: "왜·어떻게 일어나는가(과정·이론)" },
  { value: "culture", label: "한 집단의 문화·상호작용" },
  { value: "story", label: "한 사람의 이야기·생애 경험" },
  { value: "case", label: "하나(소수) 사례의 심층 이해" },
];

function OptionButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-lg border px-3 py-1.5 text-left text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:border-primary/40",
      )}
    >
      {children}
    </button>
  );
}

export default function MethodRecommenderDialog({
  open,
  onOpenChange,
  methods,
  onSelect,
}: Props) {
  const [answers, setAnswers] = useState<RecommenderAnswers>({});

  const recs = useMemo(() => recommendResearchMethods(answers), [answers]);

  function reset() {
    setAnswers({});
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  const goal = answers.goal ?? "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 size={16} className="text-primary" />
            내 연구에 맞는 연구방법 찾기
          </DialogTitle>
          <DialogDescription>
            몇 가지 질문에 답하면 후보 연구방법을 추천해 드립니다. 정답이 아니라 출발점이니
            추천 후 자유롭게 바꾸셔도 됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          {/* Q1. 목적 */}
          <div>
            <p className="mb-1.5 text-xs font-semibold text-foreground">
              1. 이 연구로 가장 하고 싶은 것은?
            </p>
            <div className="grid gap-1.5 sm:grid-cols-3">
              {GOAL_OPTIONS.map((o) => (
                <OptionButton
                  key={o.value}
                  active={goal === o.value}
                  onClick={() =>
                    setAnswers({ goal: o.value })
                  }
                >
                  <span className="block">{o.label}</span>
                  <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">
                    {o.hint}
                  </span>
                </OptionButton>
              ))}
            </div>
          </div>

          {/* Q2 (verify) 처치 여부 */}
          {goal === "verify" && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-foreground">
                2. 처치(프로그램·수업)를 적용해 집단을 비교하나요?
              </p>
              <div className="flex flex-wrap gap-1.5">
                <OptionButton
                  active={answers.hasTreatment === true}
                  onClick={() =>
                    setAnswers((p) => ({ ...p, hasTreatment: true, canRandomize: null }))
                  }
                >
                  예 — 처치 효과를 비교
                </OptionButton>
                <OptionButton
                  active={answers.hasTreatment === false}
                  onClick={() =>
                    setAnswers((p) => ({ ...p, hasTreatment: false, canRandomize: null }))
                  }
                >
                  아니오 — 설문·관계 조사
                </OptionButton>
              </div>
            </div>
          )}

          {/* Q3 (verify + 처치) 무선할당 */}
          {goal === "verify" && answers.hasTreatment === true && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-foreground">
                3. 참여자를 집단에 무선할당(무작위 배정)할 수 있나요?
              </p>
              <div className="flex flex-wrap gap-1.5">
                <OptionButton
                  active={answers.canRandomize === true}
                  onClick={() => setAnswers((p) => ({ ...p, canRandomize: true }))}
                >
                  예 — 무선할당 가능
                </OptionButton>
                <OptionButton
                  active={answers.canRandomize === false}
                  onClick={() => setAnswers((p) => ({ ...p, canRandomize: false }))}
                >
                  아니오 — 기존 학급 등
                </OptionButton>
              </div>
            </div>
          )}

          {/* Q2 (develop) 개발 대상 */}
          {goal === "develop" && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-foreground">
                2. 무엇을 개발하나요?
              </p>
              <div className="grid gap-1.5 sm:grid-cols-3">
                {DEVELOP_OPTIONS.map((o) => (
                  <OptionButton
                    key={o.value}
                    active={answers.developKind === o.value}
                    onClick={() => setAnswers((p) => ({ ...p, developKind: o.value }))}
                  >
                    {o.label}
                  </OptionButton>
                ))}
              </div>
            </div>
          )}

          {/* Q2 (understand) 초점 */}
          {goal === "understand" && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-foreground">
                2. 어떤 측면을 이해하고 싶나요?
              </p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {UNDERSTAND_OPTIONS.map((o) => (
                  <OptionButton
                    key={o.value}
                    active={answers.understandFocus === o.value}
                    onClick={() => setAnswers((p) => ({ ...p, understandFocus: o.value }))}
                  >
                    {o.label}
                  </OptionButton>
                ))}
              </div>
            </div>
          )}

          {/* 추천 결과 */}
          {recs.length > 0 && (
            <div className="border-t pt-3">
              <p className="mb-2 text-xs font-semibold text-foreground">추천 연구방법</p>
              <ul className="space-y-2">
                {recs.map((r) => {
                  const m = methods.find((x) => x.name === r.methodName);
                  const summary = m?.summary || r.reason;
                  return (
                    <li
                      key={r.methodName}
                      className="rounded-lg border bg-card/60 p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{r.methodName}</span>
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          {RESEARCH_METHOD_KIND_LABELS[r.kind]}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        {summary}
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-foreground/80">
                        <span className="font-medium text-primary">추천 이유 · </span>
                        {r.reason}
                      </p>
                      <Button
                        size="sm"
                        className="mt-2 h-7 text-xs"
                        onClick={() => {
                          onSelect(r.methodName, r.kind);
                          handleOpenChange(false);
                        }}
                      >
                        이 방법 선택 <ArrowRight size={12} className="ml-1" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
