"use client";

/**
 * 디딤판 — 학술대회 대비 (Sprint 67-AR)
 *
 * 외부 피드백: "학술대회 대비 콘텐츠 비어있음" 직접 해결.
 * 주요 학회 일정·발표 신청·포스터 작성·후기 작성 연계.
 */

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Megaphone,
  ScrollText,
  Users,
} from "lucide-react";

const MAJOR_CONFERENCES = [
  {
    name: "한국교육공학회 춘계학술대회",
    season: "5월",
    description: "교육공학 분야 국내 최대 학술대회 — 발표·포스터 신청 권장.",
  },
  {
    name: "한국교육공학회 추계학술대회",
    season: "10월",
    description: "춘계와 함께 1년에 두 번 — 본인 연구 진행 단계에 맞춰 도전.",
  },
  {
    name: "AECT (Association for Educational Communications and Technology)",
    season: "10월~11월 (미국)",
    description: "교육공학 분야 세계 최대 학회 — 국제 발표 경험 기회.",
  },
  {
    name: "한국교육학회 학술대회",
    season: "6월·12월",
    description: "교육학 전반 — 교육공학 세션 적극 활용.",
  },
];

const PRESENTATION_STEPS = [
  {
    step: 1,
    title: "발표 형식 결정 — 구두 발표 vs 포스터",
    note: "초보자는 포스터부터 시작하는 것을 권장. 1:1 토론 기회가 많아 학습에 유리.",
  },
  {
    step: 2,
    title: "초록 작성 (보통 마감 2~3개월 전)",
    note: "연구 목적·방법·잠정 결과·시사점을 500~800자 내외로 압축.",
  },
  {
    step: 3,
    title: "발표문/포스터 본격 작성",
    note: "포스터는 가독성이 핵심 — 큰 글씨, 시각 요소 활용. 발표문은 청자 관점에서 흐름 검토.",
  },
  {
    step: 4,
    title: "사전 리허설 (5회 이상 권장)",
    note: "연구실 동료·지도교수 앞에서 연습. 디펜스 연습 도구 활용 가능.",
  },
  {
    step: 5,
    title: "현장 발표 + 질의응답",
    note: "예상 질문 10개 미리 준비. 답을 모르면 솔직히 인정하고 추후 답변 약속.",
  },
];

export default function ConferenceGuidePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link
        href="/steppingstone"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} />
        인지디딤판으로
      </Link>

      <header className="mb-8 flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
          <ScrollText size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">학술대회 대비</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            국내·국제 주요 학술대회 일정부터 발표 신청·포스터 작성·발표 후기 작성까지 한 흐름으로 안내합니다.
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <Clock size={11} />
            예상 소요 7분
          </div>
        </div>
      </header>

      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-primary" />
          <h2 className="text-lg font-bold">주요 학술대회 연간 일정</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          교육공학 전공자가 주로 참여하는 학회 — 본인 연구 단계에 맞춰 1~2회 도전을 권장합니다.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {MAJOR_CONFERENCES.map((conf) => (
            <li
              key={conf.name}
              className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-900 dark:bg-amber-950/20"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-amber-700 dark:text-amber-300">{conf.name}</span>
                <span className="shrink-0 rounded-full bg-amber-200/60 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                  {conf.season}
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{conf.description}</p>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-end">
          <Link
            href="/activities/external"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            대외 학술대회 프로그램 보기
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Megaphone size={18} className="text-primary" />
          <h2 className="text-lg font-bold">발표·포스터 신청 단계</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          처음 학술대회 발표를 준비하는 분들을 위한 5단계 가이드입니다.
        </p>
        <ol className="mt-4 space-y-3">
          {PRESENTATION_STEPS.map((s) => (
            <li key={s.step} className="flex gap-3 rounded-2xl border bg-background p-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                {s.step}
              </span>
              <div className="flex-1">
                <h3 className="text-sm font-bold">{s.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.note}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-6 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-primary" />
          <h2 className="text-lg font-bold">발표 후 — 후기·자산화</h2>
        </div>
        <ul className="mt-3 space-y-2">
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" />
            <Link
              href="/activities/external"
              className="text-sm font-medium underline-offset-2 hover:text-primary hover:underline"
            >
              내가 참석한 학술대회 후기 작성
            </Link>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" />
            <span className="text-sm font-medium">
              발표 자료·포스터를{" "}
              <Link href="/edutech-archive" className="text-primary underline-offset-2 hover:underline">
                에듀테크 아카이브
              </Link>
              에 보관 — 향후 연구에 재활용
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" />
            <Link
              href="/board/seminar"
              className="text-sm font-medium underline-offset-2 hover:text-primary hover:underline"
            >
              세미나에서 본인 발표 내용 공유 — 동료 피드백 수집
            </Link>
          </li>
        </ul>
      </section>

      <section className="mt-6 rounded-2xl border-2 border-primary/20 bg-primary/5 p-6 text-center">
        <Users size={24} className="mx-auto mb-2 text-primary" />
        <h3 className="text-base font-bold">처음 학술대회를 준비 중이라면</h3>
        <p className="mt-1.5 text-xs text-muted-foreground">
          선배·졸업생 인터뷰에서 학술대회 경험담을 찾아보세요. 실제 시행착오와 노하우가 가장 큰 자산입니다.
        </p>
        <Link
          href="/board/interview"
          className="mt-4 inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          인터뷰 게시판 가기
          <ArrowRight size={14} />
        </Link>
      </section>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        보완할 정보가 있다면{" "}
        <Link href="/contact" className="underline hover:text-primary">
          문의 게시판
        </Link>
        으로 알려주세요.
      </p>
    </div>
  );
}
