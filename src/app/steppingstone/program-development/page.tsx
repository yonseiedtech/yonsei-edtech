"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Blocks,
  CheckCircle2,
  Circle,
  Info,
  ArrowRight,
  Layers,
  Lightbulb,
  FlaskConical,
} from "lucide-react";
import PageContainer from "@/components/ui/page-container";
import BackButton from "@/components/ui/back-button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { archiveConceptsApi } from "@/lib/bkend";
import {
  PROGRAM_DEVELOPMENT_STAGES,
  RELATED_RESEARCH_METHOD_NAME,
  type ProgramDevelopmentStage,
} from "@/lib/program-development-guide";

const STORAGE_KEY = "program-development-guide:checked:v1";

/** 공백·대소문자 무시 정규화 (AectTerminologyBrowser 패턴 재사용) */
function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** 산출물 체크 항목의 안정적 키 */
function outputKey(stageKey: string, idx: number): string {
  return `${stageKey}:${idx}`;
}

const LENS_ROWS: { key: keyof ProgramDevelopmentStage["theoryLens"]; label: string; color: string }[] = [
  { key: "behaviorism", label: "행동주의", color: "text-rose-700 dark:text-rose-300" },
  { key: "cognitivism", label: "인지주의", color: "text-sky-700 dark:text-sky-300" },
  { key: "constructivism", label: "구성주의", color: "text-emerald-700 dark:text-emerald-300" },
];

export default function ProgramDevelopmentGuidePage() {
  // localStorage 체크 상태 (로그인 불필요)
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);
  // 개념 매칭: normalize(name/altName/aectTerm) → conceptId
  const [conceptIndex, setConceptIndex] = useState<Map<string, string>>(new Map());
  const [conceptLoading, setConceptLoading] = useState(true);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await archiveConceptsApi.list();
        if (cancelled) return;
        const idx = new Map<string, string>();
        for (const c of res.data) {
          const keys = [c.name, c.aectTerm, ...(c.altNames ?? [])].filter(
            (x): x is string => !!x && x.trim().length > 0,
          );
          for (const k of keys) {
            const nk = normalize(k);
            if (nk && !idx.has(nk)) idx.set(nk, c.id);
          }
        }
        setConceptIndex(idx);
      } catch (err) {
        console.error("[program-development] concept load failed", err);
      } finally {
        if (!cancelled) setConceptLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  /** 단계별 완료 여부 (모든 산출물 체크 시 완료로 간주) */
  function stageDone(stage: ProgramDevelopmentStage): boolean {
    return stage.outputs.every((_, i) => checked[outputKey(stage.key, i)]);
  }

  function matchedConceptId(name: string): string | undefined {
    return conceptIndex.get(normalize(name));
  }

  return (
    <PageContainer width="narrow">
      <BackButton href="/steppingstone" label="인지디딤판" className="mb-4" />

      <header className="mb-6 flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
          <Blocks size={28} />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">교육훈련 프로그램 개발 가이드</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            연수·수업·HRD 프로그램을 개발할 때 ADDIE 다섯 단계
            <span className="whitespace-nowrap"> (분석·설계·개발·실행·평가) </span>
            를 따라가며, 각 단계에서 참고할 교육공학 이론과 산출물 체크리스트를 안내합니다.
          </p>
          <Badge variant="secondary" className="mt-2 text-[10px]">
            순화 표기: 교육 훈련 프로그램 개발 모형
          </Badge>
        </div>
      </header>

      {/* 자체 구성 고지 */}
      <div className="mb-6 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>
          본 가이드는 『교수학습공학』(이명근, 2025)의 &ldquo;이론 → 교수학습원리 → 공학 방안&rdquo; 체계와
          AECT 교육공학 정의를 <strong>참고해 학회가 자체 재서술</strong>한 셀프 가이드입니다.
          원문을 그대로 옮기지 않았으며, 실제 프로그램 설계는 지도교수·현장 여건과 함께 조정하세요.
        </p>
      </div>

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
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
                      : "border-border bg-background text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                      done ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground",
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
                    done ? "bg-emerald-600 text-white" : "bg-primary/10 text-primary",
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
                            ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20"
                            : "border-border bg-background hover:border-primary/30",
                        )}
                      >
                        {isDone ? (
                          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
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
                  <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden />
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
                      const conceptId = conceptLoading ? undefined : matchedConceptId(link.conceptName);
                      return (
                        <div
                          key={link.conceptName}
                          className="rounded-xl border bg-background p-3"
                        >
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

      {/* 관련 연구방법 참조 */}
      <div className="mt-8 rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <div className="flex items-start gap-3">
          <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div className="flex-1">
            <h3 className="text-sm font-semibold">
              프로그램을 연구로 발전시키려면?
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              개발한 프로그램의 효과와 타당성을 학위논문·학술연구로 입증하고 싶다면, 연구방법
              가이드의 <strong>&ldquo;{RELATED_RESEARCH_METHOD_NAME}&rdquo;</strong> 절차를 참고하세요.
            </p>
            <Link
              href={`/archive/research-methods?q=${encodeURIComponent(RELATED_RESEARCH_METHOD_NAME)}`}
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              연구방법 가이드에서 보기
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        내용에 보완이 필요하면{" "}
        <Link href="/contact" className="underline hover:text-primary">
          문의 게시판
        </Link>
        으로 알려주세요.
      </p>
    </PageContainer>
  );
}
