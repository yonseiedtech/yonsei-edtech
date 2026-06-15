"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronUp,
  ChevronDown,
  Type,
  CircleDot,
  Link2,
  Lightbulb,
  FileText,
  Network,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DIAGNOSTIC_AREA_COLORS,
  DIAGNOSTIC_AREA_LABELS,
  questionType,
  type DiagnosticAnswer,
  type DiagnosticQuestion,
} from "@/types";
import { cn } from "@/lib/utils";

interface DiagnosisRunnerProps {
  /** 출제 순서대로 정렬된 문항 */
  questions: DiagnosticQuestion[];
  /** 모든 문항 응답 완료 — 문항 id → 유형별 응답(number | string[] | string) */
  onComplete: (answers: Record<string, DiagnosticAnswer>) => void;
  /** 진단 취소 (랜딩으로 복귀) */
  onCancel: () => void;
}

/** Fisher-Yates 셔플 (원본 불변) */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 정답 순서와 다르게 한 번 더 섞기 — 우연히 정답 순서로 시작하지 않도록(2개 이상일 때) */
function shuffledDifferent(items: string[]): string[] {
  if (items.length < 2) return [...items];
  for (let attempt = 0; attempt < 8; attempt++) {
    const s = shuffle(items);
    if (s.some((v, i) => v !== items[i])) return s;
  }
  // 폴백: 첫 두 개 스왑
  const s = [...items];
  [s[0], s[1]] = [s[1], s[0]];
  return s;
}

export default function DiagnosisRunner({
  questions,
  onComplete,
  onCancel,
}: DiagnosisRunnerProps) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, DiagnosticAnswer>>({});

  const total = questions.length;
  const current = questions[index];
  const isLast = index === total - 1;
  const progress = total > 0 ? Math.round(((index + 1) / total) * 100) : 0;

  // ordering 문항의 초기 셔플 순서를 문항 id 별로 1회 생성(네비게이션 간 유지).
  const orderingInit = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const q of questions) {
      if (questionType(q) === "ordering" && q.items) {
        map[q.id] = shuffledDifferent(q.items);
      }
    }
    return map;
  }, [questions]);

  // ordering 문항은 처음 진입 시 셔플 순서를 응답 기본값으로 채워 둔다(제출 가능).
  useEffect(() => {
    setAnswers((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const q of questions) {
        if (questionType(q) === "ordering" && next[q.id] === undefined) {
          next[q.id] = [...(orderingInit[q.id] ?? q.items ?? [])];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [questions, orderingInit]);

  /** 유형별 "응답 완료" 판정 */
  const isAnswered = (q: DiagnosticQuestion): boolean => {
    const a = answers[q.id];
    switch (questionType(q)) {
      case "ordering":
        return Array.isArray(a) && a.length === (q.items?.length ?? 0);
      case "term":
        return typeof a === "string" && a.trim().length > 0;
      case "ox":
        return typeof a === "boolean";
      case "matching":
        // 모든 왼쪽 항목에 오른쪽 선택이 채워져야(-1 없음) 완료.
        return (
          Array.isArray(a) &&
          a.length === (q.leftItems?.length ?? 0) &&
          (a as number[]).every((v) => typeof v === "number" && v >= 0)
        );
      case "compare":
      case "scenario":
      case "passage":
      case "diagram":
      case "mcq":
      default:
        return typeof a === "number";
    }
  };

  const answeredCount = useMemo(
    () => questions.filter((q) => isAnswered(q)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [questions, answers],
  );

  if (!current) return null;

  const currentAnswered = isAnswered(current);

  // ── mcq ──
  const selectOption = (optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [current.id]: optionIndex }));
  };

  // ── ordering: 항목 위/아래 이동 ──
  const moveItem = (from: number, dir: -1 | 1) => {
    const to = from + dir;
    const arr = Array.isArray(answers[current.id])
      ? [...(answers[current.id] as string[])]
      : [...(orderingInit[current.id] ?? current.items ?? [])];
    if (to < 0 || to >= arr.length) return;
    [arr[from], arr[to]] = [arr[to], arr[from]];
    setAnswers((prev) => ({ ...prev, [current.id]: arr }));
  };

  // ── term: 텍스트 입력 ──
  const setText = (value: string) => {
    setAnswers((prev) => ({ ...prev, [current.id]: value }));
  };

  // ── ox: 참/거짓 선택 ──
  const selectBool = (value: boolean) => {
    setAnswers((prev) => ({ ...prev, [current.id]: value }));
  };

  // ── matching: 왼쪽 leftIdx 에 오른쪽 rightIdx 연결 ──
  const setMatch = (leftIdx: number, rightIdx: number) => {
    const leftLen = current.leftItems?.length ?? 0;
    const arr = Array.isArray(answers[current.id])
      ? [...(answers[current.id] as number[])]
      : new Array<number>(leftLen).fill(-1);
    // 길이 보정(혹시 모를 불일치 방어)
    while (arr.length < leftLen) arr.push(-1);
    arr[leftIdx] = rightIdx;
    setAnswers((prev) => ({ ...prev, [current.id]: arr }));
  };

  const goNext = () => {
    if (!currentAnswered) return;
    if (isLast) {
      onComplete(answers);
    } else {
      setIndex((i) => Math.min(i + 1, total - 1));
    }
  };

  const goPrev = () => {
    if (index === 0) {
      onCancel();
    } else {
      setIndex((i) => Math.max(i - 1, 0));
    }
  };

  const type = questionType(current);
  // 화면에 표시할 문제 본문 — term 은 prompt, ox 는 statement, 그 외는 question
  const promptText =
    type === "term"
      ? current.prompt ?? current.question
      : type === "ox"
        ? current.statement ?? current.question
        : current.question;
  // compare·scenario·passage·diagram 는 mcq 와 동일하게 options/answerIndex 사용
  const isChoiceType =
    type === "mcq" ||
    type === "compare" ||
    type === "scenario" ||
    type === "passage" ||
    type === "diagram";
  const orderingValue = Array.isArray(answers[current.id])
    ? (answers[current.id] as string[])
    : orderingInit[current.id] ?? current.items ?? [];
  const termValue = typeof answers[current.id] === "string" ? (answers[current.id] as string) : "";
  const boolValue =
    typeof answers[current.id] === "boolean" ? (answers[current.id] as boolean) : undefined;
  const matchingValue: number[] = Array.isArray(answers[current.id])
    ? (answers[current.id] as number[])
    : new Array<number>(current.leftItems?.length ?? 0).fill(-1);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* 진행바 */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn("text-[10px]", DIAGNOSTIC_AREA_COLORS[current.area])}
            >
              {DIAGNOSTIC_AREA_LABELS[current.area]}
            </Badge>
            <span className="tabular-nums">
              {index + 1} / {total}
            </span>
          </span>
          <span className="tabular-nums">응답 {answeredCount} / {total}</span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="진단 진행률"
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 문항 카드 */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="py-6">
          {/* 유형 안내 배지 */}
          <div className="mb-2">
            {type === "ordering" ? (
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <ChevronUp className="h-3 w-3" aria-hidden />
                순서 정렬
              </Badge>
            ) : type === "term" ? (
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <Type className="h-3 w-3" aria-hidden />
                단어 맞추기
              </Badge>
            ) : type === "ox" ? (
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <CircleDot className="h-3 w-3" aria-hidden />
                참 / 거짓
              </Badge>
            ) : type === "matching" ? (
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <Link2 className="h-3 w-3" aria-hidden />
                짝짓기
              </Badge>
            ) : type === "compare" ? (
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <ArrowRight className="h-3 w-3" aria-hidden />
                개념 구분
              </Badge>
            ) : type === "scenario" ? (
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <Lightbulb className="h-3 w-3" aria-hidden />
                상황 적용
              </Badge>
            ) : type === "passage" ? (
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <FileText className="h-3 w-3" aria-hidden />
                지문 분석
              </Badge>
            ) : type === "diagram" ? (
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <Network className="h-3 w-3" aria-hidden />
                연구모형 도형
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">
                객관식
              </Badge>
            )}
          </div>

          {/* passage(지문 분석): 가상 연구 서술을 질문 위에 본문으로 표시 */}
          {type === "passage" && current.passage && (
            <div className="mb-4 rounded-xl border border-border bg-muted/40 p-4">
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                연구 서술 (가상)
              </p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                {current.passage}
              </p>
            </div>
          )}

          {/* diagram(연구모형 도형): 인라인 SVG 연구모형을 질문 위에 도형으로 표시.
              신뢰된 시드/운영진 검수 문자열만 적재되므로 dangerouslySetInnerHTML 로 렌더.
              text-foreground 로 currentColor 기반 stroke/fill 이 다크모드까지 대응된다. */}
          {type === "diagram" && current.svg && (
            <div className="mb-4 rounded-xl border border-border bg-muted/30 p-4">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                연구모형
              </p>
              <div
                className="mx-auto max-w-md text-foreground/90 [&_svg]:h-auto [&_svg]:w-full"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: current.svg }}
              />
            </div>
          )}

          <p className="text-base font-semibold leading-relaxed sm:text-lg">
            {promptText}
          </p>

          {/* ── mcq · compare(개념 구분) · scenario(상황 적용): 보기 선택 ── */}
          {isChoiceType && (
            <div className="mt-5 flex flex-col gap-2.5">
              {(current.options ?? []).map((option, i) => {
                const isSelected = answers[current.id] === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectOption(i)}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-3.5 text-left text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1",
                      isSelected
                        ? "border-primary bg-primary/5 font-medium shadow-sm"
                        : "border-border bg-card hover:border-primary/40 hover:bg-muted/40",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30 text-muted-foreground",
                      )}
                      aria-hidden
                    >
                      {isSelected ? <Check className="h-3.5 w-3.5" /> : String.fromCharCode(65 + i)}
                    </span>
                    <span className="leading-relaxed">{option}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── ordering: ▲▼ 재배열 리스트 ── */}
          {type === "ordering" && (
            <div className="mt-5">
              <p className="mb-3 text-xs text-muted-foreground">
                ▲▼ 버튼으로 순서를 올바르게 배열하세요. 위에서 아래로 진행 순서입니다.
              </p>
              <ol className="flex flex-col gap-2">
                {orderingValue.map((item, i) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm"
                  >
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/5 text-xs font-semibold text-primary tabular-nums"
                      aria-hidden
                    >
                      {i + 1}
                    </span>
                    <span className="flex-1 leading-relaxed">{item}</span>
                    <span className="flex shrink-0 flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => moveItem(i, -1)}
                        disabled={i === 0}
                        aria-label={`${item} 위로 이동`}
                        className="rounded-md border border-border p-1 text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(i, 1)}
                        disabled={i === orderingValue.length - 1}
                        aria-label={`${item} 아래로 이동`}
                        className="rounded-md border border-border p-1 text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* ── term: 텍스트 입력 ── */}
          {type === "term" && (
            <div className="mt-5">
              <label htmlFor="term-answer" className="mb-2 block text-xs text-muted-foreground">
                정답이라고 생각하는 용어를 입력하세요. (한글 또는 영문, 띄어쓰기·괄호는 무시됩니다)
              </label>
              <Input
                id="term-answer"
                value={termValue}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && currentAnswered) {
                    e.preventDefault();
                    goNext();
                  }
                }}
                placeholder="예: 자기효능감 / self-efficacy"
                autoComplete="off"
                className="text-base"
              />
            </div>
          )}

          {/* ── ox: 참 / 거짓 ── */}
          {type === "ox" && (
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                { value: true, label: "참 (O)" },
                { value: false, label: "거짓 (X)" },
              ].map((opt) => {
                const isSelected = boolValue === opt.value;
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => selectBool(opt.value)}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl border p-4 text-base font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card hover:border-primary/40 hover:bg-muted/40",
                    )}
                  >
                    {isSelected && <Check className="h-4 w-4 text-primary" aria-hidden />}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── matching: 왼쪽 개념 ↔ 오른쪽 학자/모델 짝짓기 ── */}
          {type === "matching" && (
            <div className="mt-5">
              <p className="mb-3 text-xs text-muted-foreground">
                왼쪽 개념에 알맞은 오른쪽 항목을 각각 선택하세요.
              </p>
              <ul className="flex flex-col gap-3">
                {(current.leftItems ?? []).map((left, li) => (
                  <li
                    key={left}
                    className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:gap-3"
                  >
                    <span className="flex-1 text-sm font-medium leading-relaxed">{left}</span>
                    <ArrowRight
                      className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block"
                      aria-hidden
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {(current.rightItems ?? []).map((right, ri) => {
                        const isSelected = matchingValue[li] === ri;
                        return (
                          <button
                            key={right}
                            type="button"
                            onClick={() => setMatch(li, ri)}
                            aria-pressed={isSelected}
                            aria-label={`${left} 에 ${right} 연결`}
                            className={cn(
                              "rounded-lg border px-2.5 py-1.5 text-xs transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1",
                              isSelected
                                ? "border-primary bg-primary/10 font-medium text-primary shadow-sm"
                                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-muted/40",
                            )}
                          >
                            {right}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 네비게이션 */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={goPrev}>
          <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
          {index === 0 ? "그만두기" : "이전"}
        </Button>
        <Button onClick={goNext} disabled={!currentAnswered}>
          {isLast ? "채점하기" : "다음"}
          {!isLast && <ArrowRight className="ml-1 h-4 w-4" aria-hidden />}
        </Button>
      </div>
    </div>
  );
}
