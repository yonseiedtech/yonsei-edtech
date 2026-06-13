"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  CheckSquare,
  Bell,
  Archive,
  Trophy,
  ArrowRight,
  Sparkles,
  ChevronRight,
  MessageSquare,
  Compass,
  GraduationCap,
  Quote,
  BarChart3,
} from "lucide-react";
import PageContainer from "@/components/ui/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const WHATS_NEW_KEY = "yonsei_whats_new_dismissed_v2";

interface Feature {
  id: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge: string;
  badgeVariant?: "default" | "secondary" | "outline";
  title: string;
  description: string;
  highlights: string[];
  cta: string;
  ctaHref: string;
  color: string;
  iconBg: string;
  iconColor: string;
}

const FEATURES: Feature[] = [
  {
    id: "stat-model-diagrams",
    icon: BarChart3,
    badge: "NEW · 통계 가이드",
    badgeVariant: "default",
    title: "통계방법이 그림으로 — 연구모형 다이어그램",
    description:
      "ANCOVA·SEM 같은 통계방법이 변인 사이의 어떤 관계를 보는지 애니메이션 다이어그램으로 보여드립니다. 집단 수 구분, 최소 표본 참고, 가정이 깨졌을 때의 대처, 무료 SW jamovi 실습 경로까지 — 분석 선택부터 실행까지 한 페이지에서 해결됩니다.",
    highlights: [
      "12종 변인 관계 모형 — 화살표가 그려지는 애니메이션",
      "가정 위반 시 대처(Welch·비모수 대체 등) + 최소 표본 참고",
      "'jamovi로 따라하기' 단계별 메뉴 경로 (무료 SW)",
    ],
    cta: "통계방법 가이드 열기",
    ctaHref: "/archive/statistical-methods",
    color: "from-cyan-50 to-cyan-100/60",
    iconBg: "bg-cyan-100/80",
    iconColor: "text-cyan-700",
  },
  {
    id: "archive-foundation-expansion",
    icon: GraduationCap,
    badge: "NEW · 아카이브 확장",
    badgeVariant: "default",
    title: "학습이론부터 통계 기호까지 — 아카이브 대확장",
    description:
      "행동주의·구성주의 등 학습이론 8종(대표 학자·원전 포함), 측정 척도(명목~비율)와 모수/비모수, 결과표 기호(p·t·F·df·효과크기), 척도 개발·타당도 검증 가이드까지 — 수업과 논문에서 만나는 개념들을 한곳에 정리했습니다.",
    highlights: [
      "학습이론 8종 신설 — 검증된 원전 링크와 함께",
      "측정 척도·통계 기호 기초 용어 (결과표 읽는 법)",
      "척도 개발 8단계·프로그램 타당화 연구방법 가이드",
    ],
    cta: "기초 용어 사전 열기",
    ctaHref: "/archive/foundation-terms",
    color: "from-amber-50 to-amber-100/60",
    iconBg: "bg-amber-100/80",
    iconColor: "text-amber-700",
  },
  {
    id: "thesis-journey-suite",
    icon: Compass,
    badge: "NEW · 논문 여정",
    badgeVariant: "default",
    title: "논문 여정 — 계획서가 본문의 초안이 됩니다",
    description:
      "나의 논문 여정에서 단계별 산출물(완독·보고서·계획서·본문 진행률)을 한눈에 확인하고, 논문 에디터에서는 연구계획서의 목적·범위·방법을 서론과 연구 방법 장의 초안으로 한 번에 가져올 수 있습니다.",
    highlights: [
      "여정 단계 카드에 '내 산출물' 칩 — 완독 N편·계획서·본문 %",
      "에디터 '계획서에서 가져오기' — 빈 장에만 안전하게 시딩",
      "대시보드 여정 헤더에서 진행률·미반영 지도 바로 확인",
    ],
    cta: "나의 논문 여정 열기",
    ctaHref: "/mypage/research",
    color: "from-sky-50 to-sky-100/60",
    iconBg: "bg-sky-100/80",
    iconColor: "text-sky-700",
  },
  {
    id: "reading-apa-doi",
    icon: Quote,
    badge: "NEW · 논문 읽기",
    badgeVariant: "default",
    title: "DOI 자동 채움 · APA 인용 복사",
    description:
      "논문 등록 시 DOI만 입력하면 제목·저자·연도·저널 정보가 자동으로 채워지고, 분석 노트 카드에서 APA 7 인용을 바로 복사하거나 현재 목록 전체를 참고문헌으로 내보낼 수 있습니다.",
    highlights: [
      "DOI '자동 채움' — Crossref 서지정보, 빈 칸만 채움",
      "카드 hover 'APA 인용 복사' 원클릭",
      "'APA 내보내기' — 필터 결과를 가나다순 참고문헌으로",
    ],
    cta: "논문 읽기 노트 열기",
    ctaHref: "/mypage/research",
    color: "from-emerald-50 to-emerald-100/60",
    iconBg: "bg-emerald-100/80",
    iconColor: "text-emerald-700",
  },
  {
    id: "scholar-seminal-works",
    icon: GraduationCap,
    badge: "NEW · 아카이브",
    badgeVariant: "default",
    title: "이론 개념마다 대표 학자와 원전 링크",
    description:
      "인지부하·자기효능감·TPACK 등 26개 이론 개념에 대표 학자와 원전(seminal work)을 연결했습니다. 모든 링크는 검증을 거쳤으며, 무료 공개 원문은 배지로 표시됩니다.",
    highlights: [
      "대표 학자 칩 + 원전 서지·링크 (DOI/무료 공개 구분)",
      "Sweller 1988 · Bandura 1977 · Wing 2006 등 고전 원문 연결",
      "개념 → 변인 → 측정도구 → 졸업생 논문으로 이어지는 학습 동선",
    ],
    cta: "아카이브 개념 보기",
    ctaHref: "/archive/concept",
    color: "from-indigo-50 to-indigo-100/60",
    iconBg: "bg-indigo-100/80",
    iconColor: "text-indigo-700",
  },
  {
    id: "research-design-profile",
    icon: BarChart3,
    badge: "NEW · 연구 분석",
    badgeVariant: "default",
    title: "졸업생 논문 연구 설계 프로파일",
    description:
      "졸업생 학위논문의 제목·초록에서 연구대상·변인·통계방법·연구방법을 자동 추출해 구조화했습니다. 선배들이 어떤 설계와 통계로 연구했는지 경향을 보고, 클릭 한 번으로 해당 방법의 가이드로 이동하세요.",
    highlights: [
      "논문 상세 '연구 분석 프로필' — 대상·독립/종속 변인·방법 칩",
      "/research 통계방법 Top 10 · 연구방법 분포 차트",
      "막대 클릭 → 아카이브 가이드(가정·절차·보고 문장)로 연결",
    ],
    cta: "연구 동향 분석 열기",
    ctaHref: "/research",
    color: "from-violet-50 to-violet-100/60",
    iconBg: "bg-violet-100/80",
    iconColor: "text-violet-700",
  },
  {
    id: "dashboard-phase-d",
    icon: LayoutDashboard,
    badge: "Dashboard Phase D",
    badgeVariant: "default",
    title: "대시보드 개인화",
    description:
      "14개 위젯의 가시성·순서·알림을 자유롭게 조합하세요. 학습 스타일에 맞는 5종 프리셋을 제공하며, 설정은 기기 간에 자동 동기화됩니다.",
    highlights: [
      "14개 위젯 가시성·순서·알림 토글",
      "학생·운영진·연구·미니멀 5종 프리셋",
      "localStorage + Firestore 기기간 sync",
    ],
    cta: "대시보드 설정 열기",
    ctaHref: "/mypage/dashboard-settings",
    color: "from-blue-50 to-blue-100/60",
    iconBg: "bg-blue-100/80",
    iconColor: "text-blue-700",
  },
  {
    id: "onboarding-checklist",
    icon: CheckSquare,
    badge: "시작하기",
    badgeVariant: "secondary",
    title: "시작하기 체크리스트",
    description:
      "신입 회원을 위한 5단계 온보딩 체크리스트입니다. 항목을 완료할 때마다 학습 잔디 가산점이 부여되고, 마일스톤 배지를 획득할 수 있습니다.",
    highlights: [
      "5단계 체크리스트 (운영진 편집 가능)",
      "마일스톤 배지 4종 — 첫걸음·절반·완성·신속적응",
      "항목 완료 시 다음 추천 액션 토스트",
    ],
    cta: "대시보드에서 확인",
    ctaHref: "/dashboard",
    color: "from-green-50 to-green-100/60",
    iconBg: "bg-green-100/80",
    iconColor: "text-green-700",
  },
  {
    id: "notification-center",
    icon: Bell,
    badge: "알림센터",
    badgeVariant: "secondary",
    title: "알림센터",
    description:
      "헤더 Bell 아이콘에서 미열람 알림 수를 확인하고 전체 목록을 조회할 수 있습니다. 세미나·학술활동·수업 등 주요 이벤트 알림을 한 곳에서 관리하세요.",
    highlights: [
      "헤더 Bell 아이콘 — 미열람 카운트 표시",
      "전체 알림 목록 페이지",
      "마이페이지에서 알림 수신 설정 가능",
    ],
    cta: "알림 설정 열기",
    ctaHref: "/mypage/notifications",
    color: "from-purple-50 to-purple-100/60",
    iconBg: "bg-purple-100/80",
    iconColor: "text-purple-700",
  },
  {
    id: "archive-enhanced",
    icon: Archive,
    badge: "아카이브",
    badgeVariant: "outline",
    title: "교육공학 아카이브 강화",
    description:
      "개념·변인·측정도구 8개 컬렉션에 sticky 목차가 추가되어 탐색이 편해졌습니다. 항목 간 관계를 그래프로 시각화하는 아카이브 그래프 페이지도 새로 오픈했습니다.",
    highlights: [
      "8개 컬렉션 sticky 목차 네비게이션",
      "관계 그래프 시각화 /archive/graph",
      "태그 다중 필터·즐겨찾기·정렬 기능",
    ],
    cta: "아카이브 보러 가기",
    ctaHref: "/archive",
    color: "from-amber-50 to-amber-100/60",
    iconBg: "bg-amber-100/80",
    iconColor: "text-amber-700",
  },
  {
    id: "external-activity-status",
    icon: Trophy,
    badge: "대외 학술대회",
    badgeVariant: "outline",
    title: "대외 학술대회 모집 기간 자동 상태",
    description:
      "대외 학술대회 활동에 모집 상태(예정·모집중·마감)가 자동으로 표시됩니다. D-day 카운트와 신청 게이트, D-1 알림 cron도 함께 지원합니다.",
    highlights: [
      "scheduled / open / closed 자동 상태 표시",
      "D-day 카운트 + 신청 게이트",
      "D-1 cron 알림 발송",
    ],
    cta: "대외활동 보러 가기",
    ctaHref: "/activities/external",
    color: "from-rose-50 to-rose-100/60",
    iconBg: "bg-rose-100/80",
    iconColor: "text-rose-700",
  },
];

export default function WhatsNewPage() {
  const [dismissed, setDismissed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(WHATS_NEW_KEY) === "true",
  );

  function handleDismiss() {
    localStorage.setItem(WHATS_NEW_KEY, "true");
    setDismissed(true);
  }

  return (
    <PageContainer width="default">
      {/* 헤더 */}
      <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Sparkles size={20} className="text-primary" />
            <span className="text-sm font-semibold text-primary">신규 기능 안내</span>
          </div>
          <h1 className="text-2xl font-bold sm:text-3xl">이번 업데이트에서 추가된 기능</h1>
          <p className="mt-2 text-muted-foreground">
            대시보드 개인화·체크리스트·알림센터·아카이브 강화 등 새로운 기능을 소개합니다.
          </p>
        </div>
        {!dismissed && (
          <Button variant="outline" size="sm" className="shrink-0 self-start" onClick={handleDismiss}>
            다시 보지 않기
          </Button>
        )}
      </div>

      {/* 기능 카드 목록 */}
      <div className="space-y-5">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.id}
              className={`rounded-2xl border bg-gradient-to-br p-6 ${feature.color}`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                {/* 아이콘 */}
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${feature.iconBg} ${feature.iconColor}`}
                >
                  <Icon size={22} />
                </div>

                {/* 본문 */}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge variant={feature.badgeVariant ?? "secondary"} className="text-[10px]">
                      {feature.badge}
                    </Badge>
                    <h2 className="text-base font-bold">{feature.title}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>

                  {/* 하이라이트 목록 */}
                  <ul className="mt-3 space-y-1">
                    {feature.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-2 text-sm">
                        <ChevronRight size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <div className="mt-4">
                    <Link
                      href={feature.ctaHref}
                      className="inline-flex items-center gap-1.5 rounded-lg border bg-white/80 px-3 py-1.5 text-sm font-medium text-foreground shadow-xs transition hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {feature.cta}
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 피드백 CTA */}
      <div className="mt-10 rounded-2xl border bg-gradient-to-br from-slate-50 to-slate-100/60 p-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200/80 text-slate-600">
              <MessageSquare size={18} />
            </div>
            <div>
              <p className="font-semibold text-slate-800">이 기능에 대한 의견이 있으신가요?</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                버그 제보, UI 개선 제안, 새 기능 요청을 자유롭게 남겨주세요.
              </p>
            </div>
          </div>
          <Link
            href="/feedback"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border bg-white/80 px-4 py-2 text-sm font-medium text-foreground shadow-xs transition hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MessageSquare size={14} />
            피드백 남기기
          </Link>
        </div>
      </div>

      {/* 하단 — 대시보드로 돌아가기 */}
      <div className="mt-6 flex justify-center">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <LayoutDashboard size={16} />
          대시보드로 돌아가기
        </Link>
      </div>
    </PageContainer>
  );
}
