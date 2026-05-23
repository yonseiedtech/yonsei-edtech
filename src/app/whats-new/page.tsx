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
} from "lucide-react";
import PageContainer from "@/components/ui/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const WHATS_NEW_KEY = "yonsei_whats_new_dismissed_v1";

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

      {/* 하단 — 대시보드로 돌아가기 */}
      <div className="mt-10 flex justify-center">
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
