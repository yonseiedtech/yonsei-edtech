"use client";

/**
 * ArchiveStartHere — 신입용 추천 경로 (M5 콘텐츠 발견성)
 *
 * 아카이브가 처음인 사용자를 위한 "처음이라면 여기서 시작" 안내.
 * 7종 타입·다수 가이드로 과밀한 랜딩에서, 권장 순서(① 정의 → ② 입문 용어 →
 * ③ 핵심 개념 → ④ 연구방법)와 진입점을 명확히 제시한다.
 *
 * 정적 안내(읽기 전용). 추가 데이터 조회 없음.
 */

import Link from "next/link";
import { Rocket, ArrowRight } from "lucide-react";

interface StartStep {
  step: number;
  title: string;
  desc: string;
  href: string;
}

/** 권장 입문 순서 — 분야 정의 → 기초 용어 → 핵심 개념 → 연구방법 → 자가 진단. */
const STEPS: StartStep[] = [
  {
    step: 1,
    title: "교육공학이 무엇인지부터",
    desc: "분야 정의·5대 탐구 영역 개관을 훑어보며 큰 그림을 잡습니다.",
    href: "/archive/concept",
  },
  {
    step: 2,
    title: "기초 용어 익히기",
    desc: "변인·연구설계·측정 등 자주 쓰는 용어와 헷갈리는 용어 페어를 정리합니다.",
    href: "/archive/foundation-terms",
  },
  {
    step: 3,
    title: "핵심 개념 한두 개 깊이 보기",
    desc: "자기효능감·학습동기처럼 자주 다루는 개념을 변인·측정도구까지 따라갑니다.",
    href: "/archive/concept",
  },
  {
    step: 4,
    title: "연구방법으로 연결",
    desc: "양적·질적·혼합 연구방법의 절차와 같은 방법을 쓴 졸업생 논문을 살펴봅니다.",
    href: "/archive/research-methods",
  },
];

export default function ArchiveStartHere() {
  return (
    <section
      aria-labelledby="archive-start-here"
      className="mt-6 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-teal-50/50 to-cyan-50/40 p-5 shadow-sm dark:border-emerald-800 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-cyan-950/20"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/70 text-emerald-700 shadow-sm dark:bg-slate-900/60 dark:text-emerald-300">
          <Rocket className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2
            id="archive-start-here"
            className="text-base font-semibold tracking-tight"
          >
            처음이라면 여기서 시작하세요
          </h2>
          <p className="text-xs text-muted-foreground">
            아래 순서를 따라가면 아카이브 전체를 빠르게 파악할 수 있습니다.
          </p>
        </div>
      </div>

      <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {STEPS.map((s) => (
          <li key={s.step}>
            <Link
              href={s.href}
              className="group flex h-full items-start gap-3 rounded-xl border bg-card p-3 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label={`${s.step}단계: ${s.title}`}
            >
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                {s.step}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-sm font-semibold">
                  <span className="truncate">{s.title}</span>
                  <ArrowRight
                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                  {s.desc}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
