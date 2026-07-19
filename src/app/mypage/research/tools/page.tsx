"use client";

import Link from "next/link";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import PageHeader from "@/components/ui/page-header";
import { useResearchPapers } from "@/features/research/useResearchPapers";
import { useWritingPaper } from "@/features/research/useWritingPaper";
import { useUserDiagnostics } from "@/features/dashboard/useUserDiagnostics";
import {
  Wrench, ArrowRight, Lightbulb, BookOpenCheck, DraftingCompass,
  FileText, GraduationCap, type LucideIcon,
} from "lucide-react";

// M1(v8): 논문 도구 통합 허브 — 흩어진 연구·논문 지원 도구를 연구 여정 단계별로
// 한 진입점에 재조직한다. 신규 기능이 아니라 기존 산출물의 발견성 정리이므로
// 모든 카드는 기존 페이지·탭으로 연결만 하고, 도구 자체는 이동하지 않는다.

interface Tool {
  label: string;
  href: string;
  desc: string;
  /** 뱃지 계산 키 — 존재하는 값이 있을 때만 상태 뱃지 노출 (과설계 금지) */
  badgeKey?: "papers" | "writing" | "diagnostic";
}

interface Stage {
  id: string;
  label: string;
  icon: LucideIcon;
  hint: string;
  tools: Tool[];
}

// 연구 여정 순서: 주제 탐색 → 선행연구 → 설계 → 집필 → 인용·심사
const STAGES: Stage[] = [
  {
    id: "explore",
    label: "1. 주제 탐색",
    icon: Lightbulb,
    hint: "무엇을 연구할지 좁혀가는 단계",
    tools: [
      { label: "주제 탐색 인터뷰", href: "/mypage/research?tab=explore", desc: "질문에 답하며 연구 주제·문제를 구체화합니다." },
      { label: "연구 준비도 진단평가", href: "/diagnosis", desc: "통계·연구방법·핵심개념을 진단해 약점을 아카이브로 연결합니다.", badgeKey: "diagnostic" },
      { label: "연구방법 찾기 마법사", href: "/archive/research-finder", desc: "연구 목적·상황에 답하면 적합한 연구방법과 분석 통계를 추천합니다." },
    ],
  },
  {
    id: "literature",
    label: "2. 선행연구·문헌고찰",
    icon: BookOpenCheck,
    hint: "읽고 정리해 서론의 논리를 세우는 단계",
    tools: [
      { label: "내 논문 읽기", href: "/mypage/research?tab=reading", desc: "읽은 논문을 기록·정리하고 문헌 매트릭스로 비교합니다.", badgeKey: "papers" },
      { label: "선행연구 정리·서론 가이드", href: "/archive/literature-review-guide", desc: "선행연구를 한계로 연결해 서론으로 엮는 절차와 예시." },
      { label: "연구방법 가이드", href: "/archive/research-methods", desc: "양적·질적·혼합 연구방법을 졸업생 학위논문과 함께 정리." },
      { label: "졸업생 학위논문", href: "/alumni/thesis", desc: "학회 졸업생들의 학위논문 아카이브로 선행연구를 탐색합니다." },
      { label: "교육공학 논문 리뷰", href: "/board/paper-review", desc: "회원이 읽은 논문의 리뷰·요약을 공유하고 메타데이터를 가져옵니다." },
    ],
  },
  {
    id: "design",
    label: "3. 연구 설계",
    icon: DraftingCompass,
    hint: "변인·모형·방법을 구조화하는 단계",
    tools: [
      { label: "연구 설계", href: "/mypage/research?tab=design", desc: "연구문제·변인·설계를 정리하고 논문·계획서로 이어씁니다." },
      { label: "연구 모형 그리기", href: "/research-model", desc: "변인(독립·종속·매개·조절)과 관계를 다이어그램으로 그립니다." },
      { label: "공동 연구", href: "/collab", desc: "동료와 함께 진행하는 공동 연구를 관리하고 연구지에 발간합니다." },
    ],
  },
  {
    id: "writing",
    label: "4. 집필",
    icon: FileText,
    hint: "계획서·보고서·논문을 써 나가는 단계",
    tools: [
      { label: "연구계획서", href: "/mypage/research?tab=proposal", desc: "연구 설계를 계획서 형식으로 정리합니다." },
      { label: "연구보고서", href: "/mypage/research?tab=reportdoc", desc: "수업·과제용 연구보고서를 작성합니다." },
      { label: "논문 작성", href: "/mypage/research?tab=writing", desc: "장(章)별로 학위논문을 써 나가고 버전을 관리합니다.", badgeKey: "writing" },
      { label: "논문 쓰기 가이드", href: "/archive/paper-guide", desc: "교육공학 학위논문의 장별 구성과 작성 요령." },
      { label: "학술 글쓰기 가이드", href: "/archive/writing-tips", desc: "번역투·주술호응·시제·학술 관례를 잘못된 예↔권장 예로 비교." },
      { label: "연구 타이머", href: "/mypage/research?tab=report&focus=timer", desc: "읽기·집필 시간을 기록해 연구 활동을 잔디로 시각화합니다." },
    ],
  },
  {
    id: "review",
    label: "5. 인용·심사",
    icon: GraduationCap,
    hint: "인용을 다듬고 심사·지도를 준비하는 단계",
    tools: [
      { label: "논문 인용 가이드", href: "/archive/citation-guide", desc: "직접·간접 인용, 표절 회피, 본문 인용 표기와 재인용 윤리." },
      { label: "APA 7판 참고문헌 가이드", href: "/archive/apa-style", desc: "APA 7th edition 인용·참고문헌 형식 요약." },
      { label: "지도 노트", href: "/mypage/research?tab=feedback", desc: "교수 피드백을 기록하고 반영 여부를 추적합니다." },
      { label: "암기카드 복습", href: "/flashcards", desc: "진단평가에서 틀린 개념을 간격 반복으로 복습합니다." },
    ],
  },
];

function ResearchToolsHubContent() {
  const { user } = useAuthStore();
  const userId = user?.id;

  const { papers } = useResearchPapers(userId);
  const { paper: writingPaper } = useWritingPaper(userId);
  const { data: diagnostics } = useUserDiagnostics(userId, (rows) => rows.length);

  function badgeFor(key: Tool["badgeKey"]): string | null {
    if (key === "papers") return papers.length > 0 ? `${papers.length}편 분석` : null;
    if (key === "writing") return writingPaper ? "집필 중" : null;
    if (key === "diagnostic") return diagnostics && diagnostics > 0 ? `${diagnostics}회 응시` : null;
    return null;
  }

  return (
    <div className="py-6 sm:py-10">
      <div className="mx-auto max-w-6xl px-4">
        <PageHeader
          icon={Wrench}
          title="논문 도구 모아보기"
          description="흩어진 연구·논문 지원 도구를 연구 여정 단계별로 모았습니다. 필요한 단계의 도구로 바로 이동하세요."
          actions={
            <Link
              href="/mypage/research"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              내 연구활동으로 돌아가기
            </Link>
          }
        />

        <div className="mt-8 space-y-10">
          {STAGES.map((stage) => {
            const StageIcon = stage.icon;
            return (
              <section key={stage.id}>
                <div className="flex items-baseline gap-2">
                  <h2 className="flex items-center gap-1.5 text-base font-semibold text-foreground">
                    <StageIcon size={16} className="text-primary" />
                    {stage.label}
                  </h2>
                  <span className="text-xs text-muted-foreground">{stage.hint}</span>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {stage.tools.map((tool) => {
                    const badge = badgeFor(tool.badgeKey);
                    return (
                      <Link
                        key={tool.href}
                        href={tool.href}
                        className="group flex flex-col rounded-2xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold text-foreground group-hover:text-primary">
                            {tool.label}
                          </h3>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {badge && (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                                {badge}
                              </span>
                            )}
                            <ArrowRight
                              size={14}
                              className="text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                              aria-hidden
                            />
                          </div>
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                          {tool.desc}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ResearchToolsHubPage() {
  return (
    <AuthGuard>
      <ResearchToolsHubContent />
    </AuthGuard>
  );
}
