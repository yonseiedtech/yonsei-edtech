"use client";

/**
 * 논문 쓰기 가이드 (사이클 105, 사용자 요청)
 *
 * 교육공학 학위논문의 장(章)별 구성·작성 요령 + 실험 연구 유의사항.
 * 일반적 학술 논문 작성 원칙을 교육공학 맥락에서 객관적으로 재서술 — 특정 저작물
 * 인용 없이 보편 지식으로 구성. 세부 형식은 소속 규정·지도교수 안내 우선.
 */

import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Lightbulb,
  Microscope,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/ui/page-header";
import PageContainer from "@/components/ui/page-container";

interface Chapter {
  id: string;
  num: number;
  title: string;
  en: string;
  icon: typeof BookOpen;
  purpose: string;
  includes: string[];
  tips: string[];
}

const CHAPTERS: Chapter[] = [
  {
    id: "intro",
    num: 1,
    title: "서론",
    en: "Introduction",
    icon: Lightbulb,
    purpose: "연구의 필요성과 방향을 제시하고 독자를 연구 문제로 자연스럽게 안내한다.",
    includes: [
      "연구의 배경과 필요성 — 왜 지금 이 연구가 필요한가",
      "연구 목적 — 무엇을 밝히려 하는가",
      "연구 문제 또는 연구 가설",
      "주요 용어의 정의(조작적 정의 포함)",
      "연구의 의의·기대 효과(선택)",
    ],
    tips: [
      "일반적 현상 → 구체적 문제로 좁혀가는 '깔때기' 구조로 전개한다.",
      "선행연구를 간략히 언급해 아직 해결되지 않은 공백(gap)을 부각한다.",
      "연구 문제는 측정·검증 가능한 형태로 진술한다.",
    ],
  },
  {
    id: "background",
    num: 2,
    title: "이론적 배경",
    en: "Literature Review",
    icon: BookOpen,
    purpose:
      "연구를 뒷받침하는 이론과 선행연구를 체계적으로 고찰하고 연구 모형·가설의 근거를 마련한다.",
    includes: [
      "핵심 개념·변인의 이론적 정의",
      "관련 이론과 모형",
      "선행연구 동향과 쟁점",
      "변인 간 관계에 대한 근거",
      "이를 종합한 연구 가설·연구 모형 도출",
    ],
    tips: [
      "선행연구를 단순 나열하지 말고 주제별로 종합·비판적으로 검토한다.",
      "각 이론·연구가 본 연구와 어떻게 연결되는지 명시한다.",
      "교육공학 아카이브의 개념·변인·측정도구 항목을 근거 자료로 활용할 수 있다.",
    ],
  },
  {
    id: "method",
    num: 3,
    title: "연구 방법",
    en: "Method",
    icon: Microscope,
    purpose: "다른 연구자가 재현할 수 있도록 연구 절차를 구체적으로 기술한다.",
    includes: [
      "연구 대상과 표집 방법(인원·특성)",
      "연구 설계(실험·조사·질적 등)",
      "측정 도구와 그 신뢰도·타당도",
      "실험 처치 또는 자료 수집 절차",
      "자료 분석 방법(통계 기법 등)",
    ],
    tips: [
      "재현 가능성이 핵심 — 읽고 그대로 따라 할 수 있을 만큼 구체적으로 쓴다.",
      "측정 도구는 출처와 신뢰도(Cronbach α 등)를 함께 제시한다.",
      "분석 방법이 연구 문제·자료 형태에 맞는지 점검한다.",
    ],
  },
  {
    id: "results",
    num: 4,
    title: "연구 결과",
    en: "Results",
    icon: BarChart3,
    purpose: "분석 결과를 객관적으로 제시한다 — 해석은 다음 장(논의)에서 다룬다.",
    includes: [
      "기술통계(평균·표준편차 등)",
      "연구 문제·가설별 검증 결과",
      "표와 그림",
      "통계치(유의확률 p, 효과크기 등)",
    ],
    tips: [
      "표·그림과 본문 서술의 중복을 최소화한다.",
      "유의확률과 함께 효과크기(Cohen's d, η² 등)를 보고한다.",
      "결과는 사실만 — 해석·추론은 다음 장으로 미룬다.",
    ],
  },
  {
    id: "conclusion",
    num: 5,
    title: "결론 및 논의",
    en: "Discussion & Conclusion",
    icon: CheckCircle2,
    purpose: "결과의 의미를 해석하고 연구의 시사점과 한계를 논한다.",
    includes: [
      "주요 결과 요약",
      "선행연구와 비교한 해석",
      "이론적·실천적 시사점",
      "연구의 제한점",
      "후속 연구를 위한 제언",
    ],
    tips: [
      "결과를 반복하지 말고 '왜 그런 결과가 나왔는가'를 해석한다.",
      "표본·맥락의 한계를 인정하고 과잉 일반화를 경계한다.",
      "교육 현장·실천에 주는 함의를 구체적으로 제시한다.",
    ],
  },
];

const CAUTIONS: { title: string; body: string }[] = [
  {
    title: "집단 동등성",
    body: "무선할당이 어려운 교육 현장에서는 사전검사로 집단 동등성을 확인하고, 차이가 있으면 공변량 분석(ANCOVA) 등으로 통제한다.",
  },
  {
    title: "가외변인 통제",
    body: "교사·수업 시간·물리적 환경 등 처치 외 변인이 결과에 끼어들지 않도록 가능한 한 동일하게 유지한다.",
  },
  {
    title: "처치 충실도",
    body: "설계한 처치(수업·프로그램)가 계획대로 시행됐는지 점검·기록한다. 충실도가 낮으면 효과 해석이 어렵다.",
  },
  {
    title: "측정도구 신뢰도·타당도",
    body: "검사·설문의 신뢰도(Cronbach α)와 타당도를 확보하고, 사전·사후에는 동형 검사를 사용한다.",
  },
  {
    title: "표본 크기·검정력",
    body: "효과를 검출할 만큼 충분한 표본을 확보한다. 사전 검정력 분석으로 필요한 표본 수를 추정할 수 있다.",
  },
  {
    title: "효과크기 보고",
    body: "통계적 유의성(p)만이 아니라 효과의 실질적 크기(Cohen's d, η² 등)를 함께 보고한다.",
  },
  {
    title: "신기성 효과 경계",
    body: "새로운 매체·도구에 대한 일시적 흥미가 학습 효과로 오인되지 않도록 충분한 적용 기간을 둔다.",
  },
  {
    title: "연구 윤리",
    body: "기관생명윤리위원회(IRB) 승인·사전 동의·익명성 보장. 통제집단에도 사후에 동등한 학습 기회를 제공하는 형평을 고려한다.",
  },
];

export default function PaperGuidePage() {
  return (
    <PageContainer width="default">
      <Link href="/archive">
        <Button variant="ghost" size="sm" className="mb-3">
          <ArrowLeft className="mr-1 h-4 w-4" />
          아카이브
        </Button>
      </Link>

      <PageHeader
        icon={<FileText className="h-6 w-6" />}
        title="논문 쓰기 가이드"
        description="교육공학 학위논문의 장(章)별 구성과 작성 요령, 실험 연구 시 유의사항을 정리했습니다."
      />

      {/* 전체 구조 흐름 */}
      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4 text-primary" />
            논문의 전체 구조
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {CHAPTERS.map((c, i) => (
              <span key={c.id} className="flex items-center gap-2">
                <a
                  href={`#${c.id}`}
                  className="rounded-full border bg-muted/40 px-3 py-1 font-medium transition-colors hover:bg-muted"
                >
                  {c.num}. {c.title}
                </a>
                {i < CHAPTERS.length - 1 && (
                  <span aria-hidden className="text-muted-foreground">
                    →
                  </span>
                )}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            연구 문제에서 출발해 이론으로 근거를 세우고, 방법으로 검증하며, 결과를 해석해
            시사점에 이르는 하나의 논리적 흐름입니다.
          </p>
        </CardContent>
      </Card>

      {/* 장별 가이드 */}
      <div className="mt-6 space-y-5">
        {CHAPTERS.map((c) => (
          <Card
            key={c.id}
            id={c.id}
            className="scroll-mt-24 border-l-4 border-l-primary/40"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <c.icon className="h-4 w-4" />
                </div>
                <CardTitle className="text-base">
                  {c.num}. {c.title}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {c.en}
                  </span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">{c.purpose}</p>
              <div>
                <p className="mb-1 font-semibold">담아야 할 내용</p>
                <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
                  {c.includes.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/20">
                <p className="mb-1 flex items-center gap-1 font-semibold text-amber-800 dark:text-amber-300">
                  <Lightbulb className="h-3.5 w-3.5" /> 작성 팁
                </p>
                <ul className="list-disc space-y-0.5 pl-5 text-amber-900/80 dark:text-amber-200/70">
                  {c.tips.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 교육공학 실험 유의사항 */}
      <Card
        id="cautions"
        className="mt-8 scroll-mt-24 border-l-4 border-l-rose-400"
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-rose-500" />
            교육공학 실험 연구 유의사항
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            교육 현장에서 처치 효과를 검증하는 실험·준실험 연구에서 타당한 결론을 얻으려면
            다음을 점검하세요.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {CAUTIONS.map((c) => (
              <div key={c.title} className="rounded-lg border bg-card p-3">
                <p className="mb-1 text-sm font-semibold">{c.title}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {c.body}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
        본 가이드는 일반적인 학술 논문 작성 원칙을 교육공학 맥락에서 정리한 참고 자료입니다.
        세부 형식은 소속 대학원·학회의 규정과 지도교수의 안내를 우선합니다.
      </p>
    </PageContainer>
  );
}
