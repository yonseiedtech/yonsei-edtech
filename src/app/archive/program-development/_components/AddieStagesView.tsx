"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Circle, Layers, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  PROGRAM_DEVELOPMENT_STAGES,
  type ProgramDevelopmentStage,
} from "@/lib/program-development-guide";

const STORAGE_KEY = "program-development-guide:checked:v1";

/** 산출물 체크 항목의 안정적 키 */
function outputKey(stageKey: string, idx: number): string {
  return `${stageKey}:${idx}`;
}

const LENS_ROWS: {
  key: keyof ProgramDevelopmentStage["theoryLens"];
  label: string;
  color: string;
}[] = [
  { key: "behaviorism", label: "행동주의", color: "text-destructive" },
  { key: "cognitivism", label: "인지주의", color: "text-cat-1" },
  { key: "constructivism", label: "구성주의", color: "text-success" },
];

interface AddieStagesViewProps {
  /** 개념명 → 아카이브 개념 id (없으면 undefined) */
  matchConceptId: (name: string) => string | undefined;
  /** 개념 인덱스 로딩 여부 */
  conceptLoading: boolean;
}

export default function AddieStagesView({
  matchConceptId,
  conceptLoading,
}: AddieStagesViewProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setChecked(JSON.parse(raw));
    } catch {
      /* 손상된 값 무시 */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
    } catch {
      /* 저장 실패 무시 */
    }
  }, [checked, hydrated]);

  function toggle(key: string) {
    setChecked((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = true;
      return next;
    });
  }

  const totalOutputs = useMemo(
    () => PROGRAM_DEVELOPMENT_STAGES.reduce((sum, s) => sum + s.outputs.length, 0),
    [],
  );
  const doneOutputs = useMemo(
    () => Object.keys(checked).filter((k) => checked[k]).length,
    [checked],
  );
  const progressPct = totalOutputs === 0 ? 0 : Math.round((doneOutputs / totalOutputs) * 100);

  function stageDone(stage: ProgramDevelopmentStage): boolean {
    return stage.outputs.every((_, i) => checked[outputKey(stage.key, i)]);
  }

  return (
    <div>
      {/* 진행률 카드 */}
      <div className="mb-6 rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              산출물 체크 진행률
            </p>
            <p className="mt-1 text-2xl font-bold">
              {doneOutputs}
              <span className="text-sm font-normal text-muted-foreground">/{totalOutputs}</span>
              <span className="ml-2 text-base font-semibold text-primary">{progressPct}%</span>
            </p>
          </div>
          <p className="max-w-[10rem] text-right text-[11px] text-muted-foreground">
            체크 상태는 이 브라우저에만 저장됩니다 (로그인 불필요).
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* 단계 스텝퍼 */}
      <nav aria-label="ADDIE 단계 이동" className="mb-8">
        <ol className="flex flex-wrap items-center gap-2">
          {PROGRAM_DEVELOPMENT_STAGES.map((stage, i) => {
            const done = hydrated && stageDone(stage);
            return (
              <li key={stage.key} className="flex items-center gap-2">
                <a
                  href={`#stage-${stage.key}`}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:border-primary/40",
                    done
                      ? "border-success/30 bg-success/5 text-success"
                      : "border-border bg-background text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                      done ? "bg-success text-white" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  {stage.title.replace(/\s*\(.*\)$/, "")}
                </a>
                {i < PROGRAM_DEVELOPMENT_STAGES.length - 1 && (
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" aria-hidden />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* 단계 카드 */}
      <div className="space-y-6">
        {PROGRAM_DEVELOPMENT_STAGES.map((stage, i) => {
          const done = hydrated && stageDone(stage);
          return (
            <section
              key={stage.key}
              id={`stage-${stage.key}`}
              className="scroll-mt-24 rounded-2xl border bg-card p-5 sm:p-6"
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
                    done ? "bg-success text-white" : "bg-primary/10 text-primary",
                  )}
                >
                  {done ? "✓" : i + 1}
                </span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold tracking-tight">{stage.title}</h2>
                    {stage.purifiedTitle && (
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {stage.purifiedTitle}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {stage.summary}
                  </p>
                </div>
              </div>

              {/* 주요 활동 */}
              <div className="mt-5">
                <div className="mb-2 flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-primary" aria-hidden />
                  <h3 className="text-sm font-semibold">주요 활동</h3>
                </div>
                <ul className="space-y-1.5">
                  {stage.activities.map((a, ai) => (
                    <li key={ai} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
                      <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 산출물 체크리스트 */}
              <div className="mt-5">
                <div className="mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
                  <h3 className="text-sm font-semibold">산출물 체크리스트</h3>
                </div>
                <div className="space-y-1.5">
                  {stage.outputs.map((o, oi) => {
                    const key = outputKey(stage.key, oi);
                    const isDone = !!checked[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggle(key)}
                        aria-pressed={isDone}
                        className={cn(
                          "flex w-full items-start gap-2.5 rounded-xl border p-2.5 text-left text-sm transition-colors",
                          isDone
                            ? "border-success/20 bg-success/5"
                            : "border-border bg-background hover:border-primary/30",
                        )}
                      >
                        {isDone ? (
                          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" />
                        ) : (
                          <Circle size={18} className="mt-0.5 shrink-0 text-muted-foreground" />
                        )}
                        <span className={cn(isDone && "text-muted-foreground line-through")}>{o}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 이론 렌즈 */}
              <div className="mt-5 rounded-xl border border-dashed bg-muted/20 p-4">
                <div className="mb-2.5 flex items-center gap-1.5">
                  <Lightbulb className="h-4 w-4 text-warning" aria-hidden />
                  <h3 className="text-sm font-semibold">이론 렌즈 — 이 단계를 세 관점으로</h3>
                </div>
                <dl className="space-y-2">
                  {LENS_ROWS.map((row) => (
                    <div key={row.key} className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                      <dt className={cn("shrink-0 text-xs font-semibold sm:w-16", row.color)}>
                        {row.label}
                      </dt>
                      <dd className="text-xs leading-relaxed text-muted-foreground">
                        {stage.theoryLens[row.key]}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* 참고할 아카이브 개념 */}
              {stage.theoryLinks.length > 0 && (
                <div className="mt-5">
                  <div className="mb-2 flex items-center gap-1.5">
                    <Lightbulb className="h-4 w-4 text-primary" aria-hidden />
                    <h3 className="text-sm font-semibold">참고할 교육공학 개념</h3>
                  </div>
                  <div className="space-y-2">
                    {stage.theoryLinks.map((link) => {
                      const conceptId = conceptLoading ? undefined : matchConceptId(link.conceptName);
                      return (
                        <div key={link.conceptName} className="rounded-xl border bg-background p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold">{link.conceptName}</span>
                            {conceptId ? (
                              <Link
                                href={`/archive/concept/${conceptId}`}
                                className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
                              >
                                아카이브에서 보기
                                <ArrowRight className="h-3 w-3" aria-hidden />
                              </Link>
                            ) : conceptLoading ? (
                              <Skeleton className="h-4 w-20" />
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            {link.tip}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
