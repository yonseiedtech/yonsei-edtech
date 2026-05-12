"use client";

/**
 * 디딤판 — 재학생 학습 가이드 (Sprint 67-AR)
 *
 * 외부 피드백: "디딤판 노출은 강조됐지만 콘텐츠가 부족함" 직접 해결.
 * 학기별 학습 흐름·연구 노하우·세미나 활용법 안내.
 */

import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Lightbulb,
  Users,
} from "lucide-react";

interface Section {
  title: string;
  icon: typeof BookOpen;
  description: string;
  items: { label: string; href?: string; note?: string }[];
}

const SECTIONS: Section[] = [
  {
    title: "학기별 학습 흐름",
    icon: Calendar,
    description: "각 학기에 무엇에 집중해야 하는지 큰 그림.",
    items: [
      { label: "전체 학기별 로드맵 보기", href: "/steppingstone#학기별-로드맵" },
      { label: "1학기 — 적응과 기초 다지기", note: "교수설계론·학습이론 수강 권장" },
      { label: "2학기 — 연구 주제 탐색", note: "관심 키워드 등록 + 지도교수 협의" },
      { label: "3학기 — 본격 연구·학술대회 도전", note: "포스터/발표 신청" },
      { label: "4학기 — 논문 집필 + 디펜스 준비", note: "음성 채점 연습 시작" },
    ],
  },
  {
    title: "연구 노하우",
    icon: Lightbulb,
    description: "선배들이 알려준 실전 팁.",
    items: [
      { label: "분석 노트 작성으로 본인 연구 자산 누적", href: "/analysis-notes" },
      { label: "에듀테크 아카이브 — 선행연구 정리", href: "/edutech-archive" },
      { label: "논문 리뷰 게시판 — 동료 리뷰", href: "/board/paper-review" },
      { label: "디펜스 연습 도구 (음성 채점·따라 읽기)", href: "/defense-practice" },
    ],
  },
  {
    title: "세미나 활용법",
    icon: Users,
    description: "정기 세미나를 가장 잘 활용하는 방법.",
    items: [
      { label: "이번 학기 세미나 일정", href: "/seminars" },
      { label: "세미나 후기 작성으로 학습 강화", href: "/board/seminar" },
      { label: "발표자 신청 — 본인 연구 공유", href: "/seminars" },
      { label: "스터디 그룹 가입·개설", href: "/activities" },
    ],
  },
  {
    title: "필수 체크리스트",
    icon: CheckCircle2,
    description: "재학 중 놓치면 안 되는 행정·학사 항목.",
    items: [
      { label: "수강신청 기간 — 학사 일정 캘린더", href: "/calendar" },
      { label: "IRB 신청이 필요한 경우 미리 준비", note: "조사·실험 시 필수" },
      { label: "학회 회비 납부 (정회원 자격 유지)", href: "/mypage" },
      { label: "본인 명함·연구 주제 최신화", href: "/mypage" },
    ],
  },
];

export default function CurrentStudentGuidePage() {
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
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <BookOpen size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">재학생 학습 가이드</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            학기별 학습 흐름부터 연구 노하우, 세미나 활용법까지 — 재학 기간을 최대한 활용하기 위한 가이드입니다.
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <Clock size={11} />
            예상 소요 5분
          </div>
        </div>
      </header>

      <div className="space-y-6">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <section
              key={section.title}
              className="rounded-2xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-2">
                <Icon size={18} className="text-primary" />
                <h2 className="text-lg font-bold">{section.title}</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
              <ul className="mt-4 space-y-2">
                {section.items.map((item, i) => (
                  <li key={i} className="group flex items-start gap-2">
                    <CheckCircle2 size={14} className="mt-1 shrink-0 text-emerald-600" />
                    <div className="flex-1">
                      {item.href ? (
                        <Link
                          href={item.href}
                          className="text-sm font-medium text-foreground underline-offset-2 hover:text-primary hover:underline"
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium text-foreground">{item.label}</span>
                      )}
                      {item.note && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{item.note}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        도움이 안 되는 내용이 있나요?{" "}
        <Link href="/contact" className="underline hover:text-primary">
          문의 게시판
        </Link>
        에 알려주시면 더 좋은 가이드로 보완합니다.
      </p>
    </div>
  );
}
