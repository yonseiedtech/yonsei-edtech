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
import MyAcademicActivitiesWidget from "@/features/dashboard/MyAcademicActivitiesWidget";
import ComprehensiveExamCountdown from "@/features/dashboard/ComprehensiveExamCountdown";
import PageHeader from "@/components/ui/page-header";
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Clock,
  Newspaper,
  PenSquare,
  BookOpen,
  User,
  Shield,
  Megaphone,
  MessageSquare,
  HelpCircle,
} from "lucide-react";

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
    <div className="rounded-xl border bg-white p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}
        >
          <Icon size={20} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
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
    <div className="py-16">
      <TodayTodosPopup />
      <NextActionBanner />
      <section className="mx-auto mt-3 max-w-6xl px-4">
        <PageHeader
          icon={<LayoutDashboard size={24} />}
          title={`안녕하세요, ${user.name}님`}
          description="오늘의 학회 활동 현황을 확인하세요."
          actions={<Badge>{ROLE_LABELS[user.role]}</Badge>}
        />
      </section>

      <section className="mx-auto mt-8 max-w-6xl px-4">
        {/* 학사일정 진행바 (최상단) */}
        <AcademicCalendarProgress />

        {/* 오늘의 수업 — 일일 타임라인 (17~23시 시간축에 카드가 떠있는 뷰) */}
        <div className="mt-6">
          <DailyClassTimelineWidget />
        </div>

        {/* 나의 할 일 — 수업/연구활동/학술활동/운영진 통합 (수업 할 일은 여기에서 관리) */}
        <div className="mt-6">
          <MyTodosWidget />
        </div>

        {/* 통계 카드 */}
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            icon={FileText}
            label="내 글"
            value={myPosts.length}
            color="bg-blue-50 text-blue-600"
            href="/board"
          />
          <StatCard
            icon={Calendar}
            label="신청 세미나"
            value={mySeminars.length}
            color="bg-green-50 text-green-600"
            href="/seminars"
          />
          {isStaff ? (
            <>
              <StatCard
                icon={Shield}
                label="승인 대기"
                value={pendingCount}
                color="bg-amber-50 text-amber-600"
                href="/console/members"
              />
              <StatCard
                icon={HelpCircle}
                label="미답변 문의"
                value={unansweredCount}
                color="bg-rose-50 text-rose-600"
                href="/console/inquiries"
              />
            </>
          ) : (
            <>
              <StatCard
                icon={Clock}
                label="예정 세미나"
                value={upcomingSeminars.length}
                color="bg-purple-50 text-purple-600"
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
                color="bg-rose-50 text-rose-600"
                href="/newsletter"
              />
            </>
          )}
        </div>

        {/* 빠른 액션 */}
        <h2 className="mt-6 text-sm font-semibold text-muted-foreground">빠른 액션</h2>
        <div className="mt-2 flex flex-wrap gap-2 sm:gap-3">
          <Link href="/board/write">
            <Button variant="outline" size="sm" className="shrink-0">
              <PenSquare size={14} className="mr-1.5" />
              게시글 작성
            </Button>
          </Link>
          <Link href="/seminars">
            <Button variant="outline" size="sm" className="shrink-0">
              <BookOpen size={14} className="mr-1.5" />
              세미나
            </Button>
          </Link>
          <Link href="/mypage">
            <Button variant="outline" size="sm" className="shrink-0">
              <User size={14} className="mr-1.5" />
              마이페이지
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
        </div>

        {/* 2열 그리드: 최근 공지 + 미니 캘린더 */}
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {/* 최근 공지 */}
          <div className="rounded-2xl border bg-white p-6">
            <div className="flex items-center gap-2">
              <Megaphone size={18} className="text-primary" />
              <h2 className="font-bold">최근 공지</h2>
            </div>
            {notices.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                공지사항이 없습니다.
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {notices.map((n) => (
                  <Link
                    key={n.id}
                    href={`/board/${n.id}`}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                  >
                    <span className="truncate font-medium">{n.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(n.createdAt)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 미니 캘린더 */}
          <div className="rounded-2xl border bg-white p-6">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-primary" />
              <h2 className="font-bold">세미나 일정</h2>
            </div>
            <div className="mt-4">
              <MiniCalendar seminars={seminars} />
            </div>
          </div>
        </div>

        {/* 학술 위젯: 참여 학술활동 + 종합시험 D-Day */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <MyAcademicActivitiesWidget />
          <ComprehensiveExamCountdown />
        </div>

        {/* 활동 피드 */}
        <div className="mt-6 rounded-2xl border bg-white p-6">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-primary" />
            <h2 className="font-bold">최근 활동</h2>
          </div>
          <div className="mt-4">
            <ActivityFeed userId={user.id} posts={posts} />
          </div>
        </div>

        {/* 내 신청 세미나 */}
        {mySeminars.length > 0 && (
          <div className="mt-6 rounded-2xl border bg-white p-6">
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-primary" />
              <h2 className="font-bold">내 신청 세미나</h2>
            </div>
            <div className="mt-4 space-y-2">
              {mySeminars.map((s) => (
                <Link
                  key={s.id}
                  href={`/seminars/${s.id}`}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                >
                  <span className="font-medium">{s.title}</span>
                  <div className="flex items-center gap-2">
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

        {/* 운영진 전용: 관리 알림 */}
        {isStaff && (pendingCount > 0 || unansweredCount > 0) && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/50 p-6">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-amber-600" />
              <h2 className="font-bold text-amber-800">관리 알림</h2>
            </div>
            <div className="mt-4 space-y-2">
              {pendingCount > 0 && (
                <Link
                  href="/console/members"
                  className="flex items-center justify-between rounded-lg bg-white px-4 py-3 transition-colors hover:bg-amber-50"
                >
                  <span className="text-sm font-medium">
                    승인 대기 회원 {pendingCount}명
                  </span>
                  <Badge className="bg-amber-100 text-amber-700">
                    처리 필요
                  </Badge>
                </Link>
              )}
              {unansweredCount > 0 && (
                <Link
                  href="/console/inquiries"
                  className="flex items-center justify-between rounded-lg bg-white px-4 py-3 transition-colors hover:bg-amber-50"
                >
                  <span className="text-sm font-medium">
                    미답변 문의 {unansweredCount}건
                  </span>
                  <Badge className="bg-amber-100 text-amber-700">
                    답변 필요
                  </Badge>
                </Link>
              )}
            </div>
          </div>
        )}
      </section>
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
