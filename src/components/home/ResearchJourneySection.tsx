"use client";

/**
 * 연구 성장 여정 섹션 (2026-06-11 리브랜딩)
 *
 * 서비스 정체성 "대학원생 연구 성장 동반자"를 랜딩에서 시각적으로 선언하는
 * 시그니처 섹션. 석사 5학기 여정(주제 탐색→구체화→계획서→데이터·본문→완성·심사)을
 * 인터랙티브 타임라인으로 보여주고, 회원의 '나의 논문 여정'(마이페이지 연구 탭)과 연결된다.
 */

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  Compass,
  Target,
  FileText,
  Database,
  Award,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PublicStage {
  stage: number;
  semesterLabel: string;
  title: string;
  icon: React.ElementType;
  summary: string;
  features: { label: string; href: string }[];
}

const STAGES: PublicStage[] = [
  {
    stage: 1,
    semesterLabel: "1학기",
    title: "주제 탐색",
    icon: Compass,
    summary: "선배들의 학위논문과 시대별 연구 흐름을 보며 내 관심 분야의 지형을 그립니다.",
    features: [
      { label: "연구 흐름 분석", href: "/research" },
      { label: "졸업생 학위논문", href: "/alumni/thesis" },
      { label: "교육공학 아카이브", href: "/archive" },
    ],
  },
  {
    stage: 2,
    semesterLabel: "2학기",
    title: "주제 구체화",
    icon: Target,
    summary: "개념→변인→측정도구 연결로 연구 문제를 측정 가능한 형태로 좁힙니다.",
    features: [
      { label: "아카이브 변인·측정도구", href: "/archive" },
      { label: "연구보고서 인터뷰 모드", href: "/mypage/research?tab=reportdoc" },
    ],
  },
  {
    stage: 3,
    semesterLabel: "3학기",
    title: "연구계획서",
    icon: FileText,
    summary: "질문에 답하면 계획서가 완성되는 인터뷰 모드로 연구 설계를 정당화합니다.",
    features: [
      { label: "계획서 인터뷰 모드", href: "/mypage/research?tab=proposal" },
      { label: "연구방법론 개념", href: "/archive" },
    ],
  },
  {
    stage: 4,
    semesterLabel: "4학기",
    title: "데이터·본문",
    icon: Database,
    summary: "연구 타이머로 집필 루틴을 만들고 5장 에디터에서 본문을 채워갑니다.",
    features: [
      { label: "학위논문 에디터", href: "/mypage/research?tab=writing" },
      { label: "연구 타이머", href: "/mypage/research?tab=report" },
    ],
  },
  {
    stage: 5,
    semesterLabel: "5학기",
    title: "완성·심사",
    icon: Award,
    summary: "STT 따라읽기 심사 연습과 타당도 방어 체크로 마지막 관문을 준비합니다.",
    features: [
      { label: "논문 심사 연습", href: "/steppingstone/thesis-defense" },
      { label: "작성 원칙·타당도", href: "/archive" },
    ],
  },
];

export default function ResearchJourneySection() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const stage = STAGES[active];
  const StageIcon = stage.icon;

  return (
    <section className="border-b bg-gradient-to-b from-background to-primary/[0.03] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        {/* ── 섹션 헤더 ── */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <p className="text-sm font-semibold tracking-wide text-primary">
            RESEARCH JOURNEY
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
            입학부터 학위논문까지,
            <br className="sm:hidden" />{" "}
            <span className="bg-gradient-to-r from-primary via-sky-500 to-blue-500 bg-clip-text text-transparent">
              학기마다 다음 한 걸음
            </span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            연세교육공학회는 대학원생의 연구 성장 동반자입니다.
            석사 5학기 여정의 단계마다 필요한 도구와 방법론 가이드를 제공합니다.
          </p>
        </motion.div>

        {/* ── 인터랙티브 타임라인 ── */}
        <div className="mt-10 flex items-center justify-center gap-0 overflow-x-auto pb-2 sm:mt-12">
          {STAGES.map((s, idx) => {
            const Icon = s.icon;
            const isActive = idx === active;
            const passed = idx < active;
            return (
              <div key={s.stage} className="flex items-center">
                <motion.button
                  type="button"
                  onClick={() => setActive(idx)}
                  whileHover={reduce ? undefined : { y: -4 }}
                  className="group flex flex-col items-center gap-2 px-2 sm:px-3"
                  aria-pressed={isActive}
                  aria-label={`${s.semesterLabel} ${s.title}`}
                >
                  <span
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-2xl border-2 transition-all duration-300 sm:h-14 sm:w-14",
                      isActive
                        ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-110"
                        : passed
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground group-hover:border-primary/40 group-hover:text-primary",
                    )}
                  >
                    <Icon size={20} />
                  </span>
                  <span
                    className={cn(
                      "whitespace-nowrap text-[11px] font-medium transition-colors sm:text-xs",
                      isActive ? "text-primary font-bold" : "text-muted-foreground",
                    )}
                  >
                    {s.semesterLabel}
                  </span>
                </motion.button>
                {idx < STAGES.length - 1 && (
                  <div className="relative mb-6 h-0.5 w-6 overflow-hidden rounded-full bg-muted sm:w-12">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-primary"
                      animate={{ width: idx < active ? "100%" : "0%" }}
                      transition={{ duration: reduce ? 0 : 0.4 }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── 선택 단계 카드 ── */}
        <motion.div
          key={stage.stage}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mx-auto mt-6 max-w-2xl rounded-3xl border bg-card/80 p-6 shadow-sm backdrop-blur sm:p-8"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <StageIcon size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                {stage.semesterLabel}
              </p>
              <h3 className="mt-0.5 text-lg font-bold tracking-tight">{stage.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {stage.summary}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {stage.features.map((f) => (
                  <Link
                    key={f.href + f.label}
                    href={f.href}
                    className="inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                  >
                    {f.label}
                    <ArrowRight size={11} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── CTA ── */}
        <div className="mt-8 text-center">
          <Link
            href="/mypage/research"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90"
          >
            나의 논문 여정 시작하기
            <ArrowRight size={15} />
          </Link>
          <p className="mt-2 text-[11px] text-muted-foreground">
            회원이라면 입학 학기 기준으로 현재 단계가 자동 설정됩니다.
          </p>
        </div>
      </div>
    </section>
  );
}
