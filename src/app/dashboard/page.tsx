"use client";

import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import { usePosts } from "@/features/board/useBoard";
import { useSeminars } from "@/features/seminar/useSeminar";
import { usePendingMembers } from "@/features/member/useMembers";
import { useInquiries } from "@/features/inquiry/useInquiry";
import { useNewsletters } from "@/features/newsletter/newsletter-store";
import { isAtLeast } from "@/lib/permissions";
import { ROLE_LABELS } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import MiniCalendar from "@/features/dashboard/MiniCalendar";
import ActivityFeed from "@/features/dashboard/ActivityFeed";
import AcademicCalendarProgress from "@/features/dashboard/AcademicCalendarProgress";
import DailyClassTimelineWidget from "@/features/dashboard/DailyClassTimelineWidget";
import MyTodosWidget from "@/features/dashboard/MyTodosWidget";
import TodayTodosPopup from "@/features/dashboard/TodayTodosPopup";
import NextActionBanner from "@/features/dashboard/NextActionBanner";
import TodaySummaryCard from "@/features/dashboard/TodaySummaryCard";
import StaffPriorityPanel from "@/features/dashboard/StaffPriorityPanel";
import PushPermissionPrompt from "@/features/dashboard/PushPermissionPrompt";
import PeerActivityFeed from "@/features/dashboard/PeerActivityFeed";
import MyAcademicActivitiesWidget from "@/features/dashboard/MyAcademicActivitiesWidget";
import ComprehensiveExamCountdown from "@/features/dashboard/ComprehensiveExamCountdown";
import PageHeader from "@/components/ui/page-header";
import TermBriefHero from "@/components/dashboard/TermBriefHero";
import NewMemberWelcomeBanner from "@/features/dashboard/NewMemberWelcomeBanner";
import NewMemberChecklistWidget from "@/features/dashboard/NewMemberChecklistWidget";
import AlumniHomeWidgets from "@/features/dashboard/AlumniHomeWidgets";
import AIForumLiveWidget from "@/features/dashboard/AIForumLiveWidget";
import SpacedRepetitionWidget from "@/features/dashboard/SpacedRepetitionWidget";
import DailyReflectionPrompt from "@/features/dashboard/DailyReflectionPrompt";
import { canShowWidget, isAlumni } from "@/features/dashboard/widget-visibility";
import {
  useDashboardLayout,
  isWidgetVisible,
  getSortedWidgets,
} from "@/lib/dashboard-layout";
import {
  DASHBOARD_WIDGET_KEYS,
  type DashboardWidgetKey,
} from "@/types/dashboard-layout";
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Clock,
  Newspaper,
  PenSquare,
  BookOpen,
  Shield,
  Megaphone,
  MessageSquare,
  HelpCircle,
} from "lucide-react";

/**
 * StatCard — 표준 카드 패턴 (DESIGN.md §5: rounded-2xl · shadow-sm)
 */
function StatCard({
  icon: Icon,
  label,
  value,
  color,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
  href?: string;
}) {
  const content = (
    <div className="rounded-2xl border bg-card p-5 transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}
        >
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-none tabular-nums">{value}</p>
          <p className="mt-1 truncate text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

function DashboardContent() {
  const { user } = useAuthStore();
  const isStaff = isAtLeast(user, "staff");
  const { posts } = usePosts();
  const { seminars } = useSeminars();
  const { issues } = useNewsletters();
  // staff 전용 데이터 — 일반 회원은 쿼리 자체를 실행하지 않음
  const { pendingMembers } = usePendingMembers({ enabled: isStaff });
  const { inquiries } = useInquiries({ enabled: isStaff });

  // D-1b: 사용자 위젯 가시성 레이아웃 (localStorage 기반, AND 게이트)
  const layout = useDashboardLayout(user?.id);

  if (!user) return null;

  const myPosts = posts.filter((p) => p.authorId === user.id);
  const mySeminars = seminars.filter((s) => s.attendeeIds.includes(user.id));
  const upcomingSeminars = seminars.filter((s) => s.status === "upcoming");
  const notices = posts
    .filter((p) => p.category === "notice")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5);
  const latestNewsletter = issues
    .filter((i) => i.status === "published")
    .sort((a, b) => b.issueNumber - a.issueNumber)[0];

  // staff 전용 데이터
  const pendingCount = pendingMembers.length;
  const unansweredCount = inquiries.filter(
    (q) => q.status === "pending"
  ).length;

  // ── D-2b: 위젯 키 → 렌더 노드 매핑 (옵션 P2 — 12개 핵심 위젯) ──
  //  각 항목은 자체 wrapper(section/spacing)를 포함하여 widgetMap 외부에서 추가 wrap 불필요.
  //  STUDENT_ONLY 정책은 canShowWidget() 으로 가드 — false 면 null 반환.
  //  staffAlerts(상단 별도) 와 seminars(내 신청 세미나, mySeminars 데이터 의존) 은 매핑하지 않음.
  const widgetMap: Partial<Record<DashboardWidgetKey, ReactNode>> = {
    nextActionBanner: (
      <div className="mx-auto mt-4 max-w-6xl px-4">
        <NextActionBanner />
      </div>
    ),
    dailyTimeline: canShowWidget(user.role, "dailyClassTimeline") ? (
      <section className="mx-auto mt-6 max-w-6xl px-4">
        <DailyClassTimelineWidget />
      </section>
    ) : null,
    myTodos: canShowWidget(user.role, "myTodos") ? (
      <section className="mx-auto mt-6 max-w-6xl px-4">
        <MyTodosWidget />
      </section>
    ) : null,
    notices: (
      <section className="mx-auto mt-8 max-w-6xl px-4">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Megaphone size={18} className="text-primary" />
            <h2 className="font-bold">최근 공지</h2>
          </div>
          {notices.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              공지사항이 없습니다.
            </p>
          ) : (
            <div className="mt-4 space-y-1">
              {notices.map((n) => (
                <Link
                  key={n.id}
                  href={`/board/${n.id}`}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                >
                  <span className="truncate font-medium">{n.title}</span>
                  <span className="ml-3 shrink-0 text-xs text-muted-foreground">
                    {formatDate(n.createdAt)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    ),
    miniCalendar: (
      <section className="mx-auto mt-6 max-w-6xl px-4">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-primary" />
            <h2 className="font-bold">세미나 일정</h2>
          </div>
          <div className="mt-4">
            <MiniCalendar seminars={seminars} />
          </div>
        </div>
      </section>
    ),
    statCards: (
      <section className="mx-auto mt-6 max-w-6xl px-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            icon={FileText}
            label="내 글"
            value={myPosts.length}
            color="bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
            href="/board"
          />
          <StatCard
            icon={Calendar}
            label="신청 세미나"
            value={mySeminars.length}
            color="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
            href="/seminars"
          />
          {isStaff ? (
            <>
              <StatCard
                icon={Shield}
                label="승인 대기"
                value={pendingCount}
                color="bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                href="/console/members"
              />
              <StatCard
                icon={HelpCircle}
                label="미답변 문의"
                value={unansweredCount}
                color="bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                href="/console/inquiries"
              />
            </>
          ) : (
            <>
              <StatCard
                icon={Clock}
                label="예정 세미나"
                value={upcomingSeminars.length}
                color="bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400"
                href="/seminars"
              />
              <StatCard
                icon={Newspaper}
                label="최신 학회보"
                value={
                  latestNewsletter
                    ? `제${latestNewsletter.issueNumber}호`
                    : "-"
                }
                color="bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                href="/newsletter"
              />
            </>
          )}
        </div>
      </section>
    ),
    myAcademicActivities: canShowWidget(user.role, "myAcademicActivities") ? (
      <section className="mx-auto mt-6 max-w-6xl px-4">
        <MyAcademicActivitiesWidget />
      </section>
    ) : null,
    comprehensiveExam: canShowWidget(user.role, "comprehensiveExam") ? (
      <section className="mx-auto mt-6 max-w-6xl px-4">
        <ComprehensiveExamCountdown />
      </section>
    ) : null,
    dailyReflection: (
      <section className="mx-auto mt-8 max-w-6xl px-4">
        <DailyReflectionPrompt />
      </section>
    ),
    aiForumLive: (
      <section className="mx-auto mt-6 max-w-6xl px-4">
        <AIForumLiveWidget />
      </section>
    ),
    spacedRepetition: (
      <section className="mx-auto mt-6 max-w-6xl px-4">
        <SpacedRepetitionWidget />
      </section>
    ),
    peerActivityFeed: (
      <section className="mx-auto mt-8 max-w-6xl px-4">
        <PeerActivityFeed />
      </section>
    ),
  };

  const sortedWidgets = getSortedWidgets(layout);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 py-8 sm:py-14">
      {/* ── 플로팅 레이어: 팝업·배너·알림 (레이아웃 흐름 밖) ── */}
      <TodayTodosPopup />
      <PushPermissionPrompt />

      {/* ── 섹션 1: 헤더 영역 ── */}
      <section className="mx-auto max-w-6xl px-4 mt-6 sm:mt-8">
        {/*
         * NewMemberWelcomeBanner — DESIGN.md §9 회원용 페이지 패턴:
         * PageHeader 아래에 배치. 신규 회원에게만 노출되므로
         * PageHeader 인사 다음에 이어지는 것이 자연스러운 플로우.
         */}
        <PageHeader
          icon={LayoutDashboard}
          title={`안녕하세요, ${user.name}님`}
          description="오늘의 학회 활동 현황을 확인하세요."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/board/write">
                <Button variant="outline" size="sm" className="shrink-0">
                  <PenSquare size={14} className="mr-1.5" />
                  글 작성
                </Button>
              </Link>
              <Link href="/seminars">
                <Button variant="outline" size="sm" className="shrink-0">
                  <BookOpen size={14} className="mr-1.5" />
                  세미나
                </Button>
              </Link>
              {isStaff && (
                <Link href="/console">
                  <Button variant="outline" size="sm" className="shrink-0">
                    <Shield size={14} className="mr-1.5" />
                    운영 콘솔
                  </Button>
                </Link>
              )}
              <Badge variant="secondary" className="ml-1">{ROLE_LABELS[user.role]}</Badge>
            </div>
          }
        />

        {/* 신규 회원 온보딩 배너 — PageHeader 바로 아래, TermBriefHero 위 */}
        <NewMemberWelcomeBanner />

        {/* 신규 회원 6단계 체크리스트 (Phase C) — 가입 30일 이내 또는 완성도 < 60% 일 때만 노출 */}
        <div className="mb-6">
          <NewMemberChecklistWidget />
        </div>

        {/* 학기 진행 Hero (학사일정 통합) */}
        <TermBriefHero
          user={user}
          academicCalendarSlot={
            canShowWidget(user.role, "academicCalendar") ? <AcademicCalendarProgress /> : null
          }
        />
      </section>

      {/* ── 섹션 2: 모바일 오늘 요약 카드 + 운영진 우선순위 패널 (개인화 비대상) ── */}
      <div className="mx-auto mt-4 max-w-6xl px-4 space-y-3">
        {/* Codex Phase B: 운영진 홈 모드 — 상단 우선순위 패널 (isStaff 분기, 사용자 토글 적용) */}
        {isStaff && isWidgetVisible(layout, "staffAlerts") && <StaffPriorityPanel />}
        {/* Codex Phase B: 모바일 상단 "오늘 요약" 통합 카드 (sm:hidden — 데스크톱에서는 자체 숨김) */}
        <TodaySummaryCard />
      </div>

      {/* ── 섹션 2.5: 졸업생 전용 콘텐츠 (Phase C) ──
       *  학사 위젯이 모두 숨겨지는 alumni 에게 의미 있는 콘텐츠 노출.
       *  isAlumni(user) === false 일 때는 null 반환되므로 일반 회원에게 영향 없음.
       */}
      {isAlumni(user) && (
        <section className="mx-auto mt-6 max-w-6xl px-4">
          <AlumniHomeWidgets />
        </section>
      )}

      {/* ── D-2b: 12개 핵심 위젯 — 사용자 정의 순서대로 렌더 (옵션 P2) ──
       *  widgetMap 의 각 항목은 자체 wrapper(section/spacing)를 포함.
       *  staffAlerts 는 상단 별도 영역, seminars(내 신청 세미나)는 데이터 의존성 때문에 하단 유지.
       */}
      {sortedWidgets.map((cfg) => {
        if (!isWidgetVisible(layout, cfg.key)) return null;
        const node = widgetMap[cfg.key];
        if (!node) return null;
        return <Fragment key={cfg.key}>{node}</Fragment>;
      })}

      {/* ── 섹션 8: 소셜·활동 피드 (seminars + ActivityFeed 는 데이터 의존성으로 인라인 유지) ── */}
      <section className="mx-auto mt-8 max-w-6xl px-4 space-y-6">
        {/* 내 신청 세미나 */}
        {isWidgetVisible(layout, "seminars") && mySeminars.length > 0 && (
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-primary" />
              <h2 className="font-bold">내 신청 세미나</h2>
            </div>
            <div className="mt-4 space-y-1">
              {mySeminars.map((s) => (
                <Link
                  key={s.id}
                  href={`/seminars/${s.id}`}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                >
                  <span className="truncate font-medium">{s.title}</span>
                  <div className="ml-3 flex shrink-0 items-center gap-2">
                    <Badge
                      variant={
                        s.status === "upcoming" ? "default" : "secondary"
                      }
                      className="text-[10px]"
                    >
                      {s.status === "upcoming"
                        ? "예정"
                        : s.status === "completed"
                          ? "완료"
                          : "취소"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(s.date)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 활동 피드 (개인 타임라인) — 사용자 토글 비대상 (개인화 비대상 위젯) */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-primary" />
            <h2 className="font-bold">최근 활동</h2>
          </div>
          <div className="mt-4">
            <ActivityFeed userId={user.id} posts={posts} />
          </div>
        </div>
      </section>

      {/* ── 섹션 9: 운영진 전용 관리 알림 ── */}
      {/* Codex Phase B (중복 제거): 기존 하단 "관리 알림" 섹션은 상단 `StaffPriorityPanel` 로 통합됨.
       *  - 일반 사용자(isStaff===false): 영향 없음 — 어차피 렌더되지 않았던 영역
       *  - 운영진: 상단 StaffPriorityPanel 이 같은 데이터(승인 대기 + 미답변 문의)를 더 풍부하게(운영진 todo 포함) 노출.
       *  - StaffPriorityPanel 자체가 totalPriorityCount===0 일 때 null 반환하므로, 처리할 항목이 없는 운영진도 시각적 노이즈 없음. */}

      {/* ── D-1b: 모든 위젯 숨김 안내 ── */}
      {layout !== null &&
        DASHBOARD_WIDGET_KEYS.every((k) => !isWidgetVisible(layout, k)) && (
          <section className="mx-auto mt-12 max-w-6xl px-4">
            <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
              <LayoutDashboard size={32} className="mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-base font-semibold text-foreground">
                표시할 위젯이 없습니다.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                마이페이지 → 대시보드 설정에서 위젯을 켜세요.
              </p>
              <Link
                href="/mypage/dashboard-settings"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                <LayoutDashboard size={15} />
                대시보드 설정 열기
              </Link>
            </div>
          </section>
        )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
