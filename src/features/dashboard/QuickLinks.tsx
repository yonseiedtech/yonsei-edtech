"use client";

/**
 * QuickLinks — 대시보드 빠른 바로가기 한 줄 (사이클 113b, 사용자 요청)
 * 자주 가는 곳을 아이콘 한 줄로. 2단 그리드 아래 별도 영역.
 *
 * 스프린트3 H6: 고정 6칸 → 회원 단계(getMemberStage)별 세트로 교체.
 *  - 신입(newcomer)     : 진단·온보딩·아카이브 입문 중심
 *  - 재학·논문(researcher): 연구 여정(설계·집필)·심사 연습·암기카드
 *  - 졸업생(alumni)     : 졸업생 논문·아카이브·모임
 * 판정은 순수 함수(member-stage)로 분리하고, 진단 이력은 대시보드 상주 위젯과
 * 동일 쿼리 키(["stage-rec-diagnostics", userId])를 재사용해 추가 로드 0.
 */

import Link from "next/link";
import { useMemo } from "react";
import { useUserDiagnostics } from "@/features/dashboard/useUserDiagnostics";
import {
  FlaskConical,
  CalendarRange,
  Award,
  BookOpen,
  FileText,
  Sparkles,
  Activity,
  Compass,
  Library,
  DraftingCompass,
  PenLine,
  Layers,
  GraduationCap,
  Users,
} from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import { getMemberStage, type MemberStage } from "@/lib/member-stage";

type QuickLink = { href: string; label: string; icon: typeof FlaskConical };

const NEWCOMER_LINKS: QuickLink[] = [
  { href: "/diagnosis", label: "연구 준비도 진단", icon: Activity },
  { href: "/steppingstone/onboarding", label: "온보딩 가이드", icon: Compass },
  { href: "/archive", label: "아카이브 입문", icon: Library },
  { href: "/seminars", label: "세미나", icon: BookOpen },
  { href: "/mypage/research", label: "내 연구", icon: FlaskConical },
  { href: "/whats-new", label: "새 기능", icon: Sparkles },
];

const RESEARCHER_LINKS: QuickLink[] = [
  { href: "/mypage/research?tab=design", label: "연구 설계", icon: DraftingCompass },
  { href: "/mypage/research", label: "논문 집필", icon: PenLine },
  { href: "/steppingstone/thesis-defense", label: "심사 연습", icon: GraduationCap },
  { href: "/flashcards", label: "암기카드", icon: Layers },
  { href: "/archive/paper-guide", label: "논문 가이드", icon: FileText },
  { href: "/mypage/activities?tab=certificates", label: "수료증", icon: Award },
];

const ALUMNI_LINKS: QuickLink[] = [
  { href: "/alumni/thesis", label: "졸업생 논문", icon: FileText },
  { href: "/archive", label: "아카이브", icon: Library },
  { href: "/gatherings", label: "모임", icon: Users },
  { href: "/seminars", label: "세미나", icon: BookOpen },
  { href: "/mypage/activities", label: "학술 활동", icon: CalendarRange },
  { href: "/whats-new", label: "새 기능", icon: Sparkles },
];

const LINK_SETS: Record<MemberStage, QuickLink[]> = {
  newcomer: NEWCOMER_LINKS,
  researcher: RESEARCHER_LINKS,
  alumni: ALUMNI_LINKS,
};

export default function QuickLinks() {
  const { user } = useAuthStore();
  const userId = user?.id;

  // 진단 이력 — NextActionBanner·StageRecommendationPanel 과 동일 캐시 키 재사용(dedupe, 추가 로드 0).
  const { data: diagnostics } = useUserDiagnostics(userId);

  const links = useMemo(() => {
    const stage = getMemberStage(user, diagnostics?.length);
    return LINK_SETS[stage];
  }, [user, diagnostics]);

  return (
    <nav
      aria-label="빠른 바로가기"
      className="grid grid-cols-3 gap-2 sm:grid-cols-6"
    >
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="flex flex-col items-center gap-1.5 rounded-2xl border bg-card py-3 text-[11px] font-medium text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-primary"
        >
          <l.icon size={18} className="text-primary/80" />
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
