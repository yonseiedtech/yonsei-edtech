"use client";

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
import PushPermissionPrompt from "@/features/dashboard/PushPermissionPrompt";
import PeerActivityFeed from "@/features/dashboard/PeerActivityFeed";
import MyAcademicActivitiesWidget from "@/features/dashboard/MyAcademicActivitiesWidget";
import ComprehensiveExamCountdown from "@/features/dashboard/ComprehensiveExamCountdown";
import PageHeader from "@/components/ui/page-header";
import TermBriefHero from "@/components/dashboard/TermBriefHero";
import NewMemberWelcomeBanner from "@/features/dashboard/NewMemberWelcomeBanner";
import AIForumLiveWidget from "@/features/dashboard/AIForumLiveWidget";
import SpacedRepetitionWidget from "@/features/dashboard/SpacedRepetitionWidget";
import DailyReflectionPrompt from "@/features/dashboard/DailyReflectionPrompt";
import { canShowWidget } from "@/features/dashboard/widget-visibility";
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

        {/* 학기 진행 Hero (학사일정 통합) */}
        <TermBriefHero
          user={user}
          academicCalendarSlot={
            canShowWidget(user.role, "academicCalendar") ? <AcademicCalendarProgress /> : null
          }
        />
      </section>

      {/* ── 섹션 2: 다음 액션 배너 (헤더와 본문 위젯 사이 브릿지) ── */}
      <div className="mx-auto mt-4 max-w-6xl px-4">
        <NextActionBanner />
      </div>

      {/* ── 섹션 3: 학사 컨텍스트 위젯 (재학생 전용) ── */}
      <section className="mx-auto mt-6 max-w-6xl px-4">
        {/* 오늘의 수업 — 일일 타임라인 */}
        {canShowWidget(user.role, "dailyClassTimeline") && (
          <DailyClassTimelineWidget />
        )}

        {/* 나의 할 일 — 수업/연구활동/학술활동/운영진 통합 */}
        {canShowWidget(user.role, "myTodos") && (
          <div className="mt-6">
            <MyTodosWidget />
          </div>
        )}
      </section>

      {/* ── 섹션 4: 핵심 지표 — 통계 카드 그리드 ── */}
      <section className="mx-auto mt-8 max-w-6xl px-4">
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

      {/* ── 섹션 5: 일정·공지 — 2열 그리드 ── */}
      <section className="mx-auto mt-6 max-w-6xl px-4">
        <div className="grid gap-6 md:grid-cols-2">
          {/* 최근 공지 */}
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

          {/* 세미나 일정 캘린더 */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-primary" />
              <h2 className="font-bold">세미나 일정</h2>
            </div>
            <div className="mt-4">
              <MiniCalendar seminars={seminars} />
            </div>
          </div>
        </div>
      </section>

      {/* ── 섹션 6: 학술 포트폴리오 위젯 (재학생 전용) ── */}
      {(canShowWidget(user.role, "myAcademicActivities") ||
        canShowWidget(user.role, "comprehensiveExam")) && (
        <section className="mx-auto mt-6 max-w-6xl px-4">
          <div className="grid gap-6 md:grid-cols-2">
            {canShowWidget(user.role, "myAcademicActivities") && (
              <MyAcademicActivitiesWidget />
            )}
            {canShowWidget(user.role, "comprehensiveExam") && (
              <ComprehensiveExamCountdown />
            )}
          </div>
        </section>
      )}

      {/* ── 섹션 7: 학습 보조 — 교육공학 이론 기반 위젯 ── */}
      {/*
       * 배치 근거:
       * - DailyReflectionPrompt: full-width, 매일 1회 유도 — 시선 집중 위해 단독 배치
       * - AIForumLiveWidget + SpacedRepetitionWidget: 대등한 2열 (둘 다 콘텐츠 발견용)
       * 세 위젯 모두 "학습 보조" 그룹으로 mt-8 으로 상위 섹션과 시각 분리
       */}
      <section className="mx-auto mt-8 max-w-6xl px-4 space-y-6">
        {/* 오늘의 5분 회고 — full-width CTA */}
        <DailyReflectionPrompt />

        {/* AI 포럼 라이브 + Spaced Repetition — 2열 */}
        <div className="grid gap-6 md:grid-cols-2">
          <AIForumLiveWidget />
          <SpacedRepetitionWidget />
        </div>
      </section>

      {/* ── 섹션 8: 소셜·활동 피드 ── */}
      {/*
       * PeerActivityFeed 와 ActivityFeed(개인 타임라인)를 하나의 섹션으로 묶음.
       * 둘 다 피드 성격 — mt-8 로 학습 보조 섹션과 명확히 분리.
       * 내 신청 세미나 카드도 개인 활동 맥락이므로 이 섹션 내 배치.
       */}
      <section className="mx-auto mt-8 max-w-6xl px-4 space-y-6">
        {/* 동료의 최근 활동 */}
        <PeerActivityFeed />

        {/* 내 신청 세미나 */}
        {mySeminars.length > 0 && (
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

        {/* 활동 피드 (개인 타임라인) */}
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
      {isStaff && (pendingCount > 0 || unansweredCount > 0) && (
        <section className="mx-auto mt-6 max-w-6xl px-4 pb-8">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 dark:border-amber-800 dark:bg-amber-950/20">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-amber-600 dark:text-amber-400" />
              <h2 className="font-bold text-amber-800 dark:text-amber-200">관리 알림</h2>
            </div>
            <div className="mt-4 space-y-2">
              {pendingCount > 0 && (
                <Link
                  href="/console/members"
                  className="flex items-center justify-between rounded-xl bg-card px-4 py-3 transition-colors hover:bg-amber-50 dark:hover:bg-amber-950/30"
                >
                  <span className="text-sm font-medium">
                    승인 대기 회원 {pendingCount}명
                  </span>
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                    처리 필요
                  </Badge>
                </Link>
              )}
              {unansweredCount > 0 && (
                <Link
                  href="/console/inquiries"
                  className="flex items-center justify-between rounded-xl bg-card px-4 py-3 transition-colors hover:bg-amber-50 dark:hover:bg-amber-950/30"
                >
                  <span className="text-sm font-medium">
                    미답변 문의 {unansweredCount}건
                  </span>
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                    답변 필요
                  </Badge>
                </Link>
              )}
            </div>
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
