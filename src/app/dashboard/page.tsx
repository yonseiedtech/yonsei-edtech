"use client";

import { Fragment, useEffect, useState, type ReactNode, useRef } from "react";
import { profilesApi } from "@/lib/bkend";
import Link from "next/link";
import Image from "next/image";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
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
import { cn, formatDate } from "@/lib/utils";
import { STATUS_CHIP } from "@/lib/design-tokens";
import {
  inferSeminarMode,
  SEMINAR_MODE_BADGE,
  SEMINAR_MODE_LABEL,
} from "@/features/dashboard/timeline/types";
import ActivityFeed from "@/features/dashboard/ActivityFeed";
import AcademicCalendarProgress from "@/features/dashboard/AcademicCalendarProgress";
import DailyClassTimelineWidget from "@/features/dashboard/DailyClassTimelineWidget";
import TodayCard from "@/features/dashboard/TodayCard";
import MyTodosWidget from "@/features/dashboard/MyTodosWidget";
import TodayTodosPopup from "@/features/dashboard/TodayTodosPopup";
import NextActionBanner from "@/features/dashboard/NextActionBanner";
import StaffPriorityPanel from "@/features/dashboard/StaffPriorityPanel";
import PushPermissionPrompt from "@/features/dashboard/PushPermissionPrompt";
import PeerActivityFeed from "@/features/dashboard/PeerActivityFeed";
import MyAcademicActivitiesWidget from "@/features/dashboard/MyAcademicActivitiesWidget";
import RecentPostsWidget from "@/features/dashboard/RecentPostsWidget";
import ComprehensiveExamCountdown from "@/features/dashboard/ComprehensiveExamCountdown";
import PageHeader from "@/components/ui/page-header";
import TermBriefHero from "@/components/dashboard/TermBriefHero";
import NewMemberOnboardingCard from "@/features/dashboard/NewMemberOnboardingCard";
import AlumniHomeWidgets from "@/features/dashboard/AlumniHomeWidgets";
import AIForumLiveWidget from "@/features/dashboard/AIForumLiveWidget";
import SpacedRepetitionWidget from "@/features/dashboard/SpacedRepetitionWidget";
import DiagnosisReadinessWidget from "@/features/dashboard/DiagnosisReadinessWidget";
import MyGrowthWidget from "@/features/dashboard/MyGrowthWidget";
import ThesisProgressWidget from "@/features/research/ThesisProgressWidget";
import SemesterCalendarWidget from "@/features/dashboard/SemesterCalendarWidget";
import DailyReflectionPrompt from "@/features/dashboard/DailyReflectionPrompt";
import { canShowWidget, isAlumni } from "@/features/dashboard/widget-visibility";
import DraggableWidget from "@/features/dashboard/editing/DraggableWidget";
import EditModePresetBar from "@/features/dashboard/editing/EditModePresetBar";
import JourneyGreetingHeader from "@/features/dashboard/JourneyGreetingHeader";
import DashboardCommandCenter from "@/features/dashboard/DashboardCommandCenter";
import ProfileSummaryCard from "@/features/dashboard/ProfileSummaryCard";
import ProfileSideWidget from "@/features/dashboard/ProfileSideWidget";
import QuickLinks from "@/features/dashboard/QuickLinks";
import NewPostsBadge from "@/features/dashboard/NewPostsBadge";
import SemesterKickoffBanner from "@/features/dashboard/SemesterKickoffBanner";
import HackathonCtaBanner from "@/features/hackathon/HackathonCtaBanner";
import LearningStreak from "@/features/mypage/LearningStreak";
import InactivityCoachingCard from "@/features/dashboard/InactivityCoachingCard";
import WeeklyGoalCard from "@/features/dashboard/WeeklyGoalCard";
import StageRecommendationPanel from "@/features/dashboard/StageRecommendationPanel";
import NewcomerProgressWidget from "@/features/dashboard/NewcomerProgressWidget";
import KudosWidget from "@/features/dashboard/KudosWidget";
import {
  useDashboardLayout,
  isWidgetVisible,
  isWidgetMuted,
  getSortedWidgets,
  saveLayoutWithSync,
  loadLayoutFromFirestore,
} from "@/lib/dashboard-layout";
import { buildPresetLayout } from "@/lib/dashboard-presets";
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
  Pencil,
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
  // RT-1(2026-07-04): "지난 방문 이후 새 글" 기준 시각 — 갱신 전에 이전 값을 캡처
  const prevVisitRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!user?.id) return;
    if (prevVisitRef.current === undefined) {
      prevVisitRef.current = (user.lastVisitAt as string | undefined) ?? null;
    }
    const prev = user.lastVisitAt ? new Date(user.lastVisitAt).getTime() : 0;
    if (Date.now() - prev > 60 * 60 * 1000) {
      void profilesApi.update(user.id, { lastVisitAt: new Date().toISOString() }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
  const isStaff = isAtLeast(user, "staff");

  // D-2c: 인라인 편집 모드 (드래그·토글 즉시 저장)
  const [editMode, setEditMode] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // D-1b: 사용자 위젯 가시성 레이아웃 (localStorage 기반, AND 게이트)
  // D-3c: layout 을 usePosts/useSeminars 보다 먼저 읽어야 staleTime 분기 가능
  const layout = useDashboardLayout(user?.id);

  // Sprint UX-4a: 신규 회원(가입 30일 이내)이 저장된 레이아웃 없이 첫 방문하면
  // 미니멀 프리셋(핵심 3위젯)을 1회 자동 적용 — 위젯 14개 과밀 첫인상 방지.
  useEffect(() => {
    if (!user || layout) return;
    const appliedKey = `yedu_minimal_preset_applied.${user.id}`;
    try {
      if (window.localStorage.getItem(appliedKey) === "1") return;
    } catch {
      return;
    }
    const createdRaw = (user as { createdAt?: unknown }).createdAt;
    let createdMs: number | null = null;
    if (typeof createdRaw === "string" || typeof createdRaw === "number") {
      const t = new Date(createdRaw).getTime();
      createdMs = Number.isFinite(t) ? t : null;
    } else if (createdRaw && typeof createdRaw === "object" && "seconds" in (createdRaw as Record<string, unknown>)) {
      const s = (createdRaw as { seconds?: number }).seconds;
      if (typeof s === "number") createdMs = s * 1000;
    }
    if (createdMs == null || Date.now() - createdMs > 30 * 24 * 60 * 60 * 1000) return;
    let cancelled = false;
    void (async () => {
      // Firestore 에 다른 기기에서 저장한 레이아웃이 있으면 존중
      const remote = await loadLayoutFromFirestore(user.id);
      if (cancelled || remote) return;
      void saveLayoutWithSync(user.id, buildPresetLayout("minimal"));
      try {
        window.localStorage.setItem(appliedKey, "1");
      } catch {
        // ignore
      }
      const { toast } = await import("sonner");
      toast.info("신규 회원을 위한 미니멀 대시보드가 적용되었습니다. 우측 상단 '편집'에서 위젯을 추가할 수 있어요.");
    })();
    return () => {
      cancelled = true;
    };
  }, [user, layout]);

  // 체감 스프린트: 기본 위젯 다이어트(14→8) 1회 안내 — 저장 레이아웃 없는 기존 사용자 한정
  useEffect(() => {
    if (!user || layout) return;
    const noticeKey = "yedu_dashboard_diet_notice_v1";
    try {
      if (window.localStorage.getItem(noticeKey) === "1") return;
      // 신규회원 미니멀 프리셋이 적용된 경우는 해당 안내가 이미 나갔으므로 생략
      if (window.localStorage.getItem(`yedu_minimal_preset_applied.${user.id}`) === "1") return;
      window.localStorage.setItem(noticeKey, "1");
    } catch {
      return;
    }
    void import("sonner").then(({ toast }) =>
      toast.info("대시보드가 핵심 위젯 중심으로 정리되었습니다. 우측 상단 '편집'에서 언제든 위젯을 추가할 수 있어요."),
    );
  }, [user, layout]);

  // D-3c: seminars / staffAlerts mute 가드
  const seminarsMuted = isWidgetMuted(layout, "seminars");
  const staffAlertsMuted = isWidgetMuted(layout, "staffAlerts");

  const { posts } = usePosts();
  const { seminars } = useSeminars(undefined, {
    staleTime: seminarsMuted ? 180_000 : 60_000,
  });
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
    // dailyTimeline: 사이클 104 — 상단 2단 그리드로 승격(F-패턴). 위젯맵에서 제거해 중복 방지.
    //   DASHBOARD_WIDGET_KEYS 에 키는 남지만 widgetMap 미존재 → !node 가드로 렌더·편집UI 모두 자동 제외.
    myTodos: canShowWidget(user.role, "myTodos") ? (
      <section className="mx-auto mt-6 max-w-6xl px-4">
        <MyTodosWidget />
      </section>
    ) : null,
    notices: (
      <section className="mx-auto mt-8 max-w-6xl px-4">
        <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
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
    recentPosts: (
      <section className="mx-auto mt-6 max-w-6xl px-4">
        <RecentPostsWidget />
      </section>
    ),
    // miniCalendar: 사이클 114 — 시간표 월간 뷰(MonthlyGrid)로 통합. 하단 세미나 캘린더 제거(중복).
    statCards: (
      <section className="mx-auto mt-6 max-w-6xl px-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            icon={FileText}
            label="내 글"
            value={myPosts.length}
            color="bg-info/10 text-info"
            href="/board"
          />
          <StatCard
            icon={Calendar}
            label="신청 세미나"
            value={mySeminars.length}
            color="bg-success/10 text-success"
            href="/seminars"
          />
          {isStaff ? (
            <>
              <StatCard
                icon={Shield}
                label="승인 대기"
                value={pendingCount}
                color={STATUS_CHIP.warning}
                href="/console/members"
              />
              <StatCard
                icon={HelpCircle}
                label="미답변 문의"
                value={unansweredCount}
                color={STATUS_CHIP.danger}
                href="/console/inquiries"
              />
            </>
          ) : (
            <>
              <StatCard
                icon={Clock}
                label="예정 세미나"
                value={upcomingSeminars.length}
                color="bg-cat-5/10 text-cat-5"
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
                color="bg-destructive/10 text-destructive"
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
    diagnosisReadiness: (
      <section className="mx-auto mt-6 max-w-6xl px-4">
        <DiagnosisReadinessWidget />
      </section>
    ),
    myGrowth: (
      <section className="mx-auto mt-6 max-w-6xl px-4">
        <MyGrowthWidget />
      </section>
    ),
    thesisProgress: (
      <section className="mx-auto mt-6 max-w-6xl px-4">
        <ThesisProgressWidget variant="card" />
      </section>
    ),
    // M3: 이번 학기 주요 일정 — 학사 컨텍스트 위젯이므로 재학생 전용(졸업생/자문 제외).
    //   콘솔 academic-calendar 와 동일 정책(academicCalendar 페르소나 게이트)을 재사용.
    //   데이터/다가오는 일정 없으면 위젯 컴포넌트가 null 렌더로 자동 숨김.
    semesterCalendar: canShowWidget(user.role, "academicCalendar") ? (
      <section className="mx-auto mt-6 max-w-6xl px-4">
        <SemesterCalendarWidget />
      </section>
    ) : null,
  };

  const sortedWidgets = getSortedWidgets(layout);

  // D-2c: 드래그 종료 시 order 재계산 + 즉시 저장 (localStorage + Firestore sync)
  function handleDragEnd(event: DragEndEvent) {
    if (!user) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = sortedWidgets.findIndex((w) => w.key === active.id);
    const newIdx = sortedWidgets.findIndex((w) => w.key === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(sortedWidgets, oldIdx, newIdx);
    void saveLayoutWithSync(user.id, {
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      widgets: reordered.map((cfg, idx) => ({ ...cfg, order: idx })),
    });
  }

  // D-2c: 위젯 visible 토글 시 즉시 저장
  function handleVisibilityToggle(key: DashboardWidgetKey, visible: boolean) {
    if (!user) return;
    void saveLayoutWithSync(user.id, {
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      widgets: sortedWidgets.map((cfg, idx) => ({
        ...cfg,
        visible: cfg.key === key ? visible : cfg.visible,
        order: idx,
      })),
    });
  }

  // D-2c: 편집 모드 진입 시 안내 토스트 (1회)
  async function handleToggleEditMode() {
    const next = !editMode;
    setEditMode(next);
    const { toast } = await import("sonner");
    if (next) {
      // 모바일 환경 감지: pointer 가 coarse 이면 터치 디바이스
      const isTouch =
        typeof window !== "undefined" &&
        window.matchMedia("(pointer: coarse)").matches;
      if (isTouch) {
        toast.info("터치 길게 눌러 드래그, 토글로 숨김. 자동 저장됩니다.");
      } else {
        toast.info("드래그로 순서 변경, 토글로 숨김. 자동 저장됩니다.");
      }
    } else {
      toast.success("대시보드 설정이 저장되었습니다");
    }
  }

  // EditModePresetBar 의 "완료" 버튼 콜백
  function handleEditComplete() {
    setEditMode(false);
    // 토스트는 EditModePresetBar 내부에서 발행
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 py-6 sm:py-10">
      {/* ── 플로팅 레이어: 팝업·배너·알림 (레이아웃 흐름 밖) ── */}
      <TodayTodosPopup />
      <PushPermissionPrompt />

      {/* ── 섹션 0: 신입 온보딩 레이어 (UX 보고서 H1) ──
       *  "환영 + 첫 3가지 핵심 할 일"을 최상단에 두어 Next Action 우선화(H2)의 시각적 1순위 확보.
       *  만료성 게이트 없이 미완료 시 상시 노출, 3항목 모두 완료 시 카드 자체가 null 렌더 → 자동 숨김.
       *  empty:hidden — 완료/닫힘 회원에게 빈 div 유령 여백 제거. */}
      <div className="mx-auto max-w-6xl px-4 empty:hidden">
        <NewMemberOnboardingCard />
      </div>

      {/* ── 섹션 1: 헤더 영역 ── */}
      {/* 사이클 86: 상단 이중 마진(py + mt) 제거 — 최상위 py 가 상단 여백 담당, 섹션 mt 제거로 과다 여백 해소 */}
      <section className="mx-auto max-w-6xl px-4">
        <PageHeader
          icon={
            // PageHeader 가 JSX 아이콘을 48px 칩 박스로 감싸므로, 엠블럼은 박스 안에
            // 여백을 두는 크기(36px)로 — 사이트 전체 헤더 아이콘(48px 박스+24px 심볼)과 동일 규격 (사이클 85)
            <Image
              src="/yonsei-emblem.svg"
              alt="연세대학교"
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
            />
          }
          title={`안녕하세요, ${user.name}님`}
          description="오늘의 학회 활동 현황을 확인하세요."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {/* 편집 모드 ON 일 때는 EditModePresetBar 의 완료 버튼으로 대체 */}
              {!editMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={handleToggleEditMode}
                  aria-pressed={false}
                  title="대시보드 편집"
                >
                  <Pencil size={14} className="mr-1.5" />
                  편집
                </Button>
              )}
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

        {/* 체감 스프린트: 여정 인사 헤더 — 리브랜딩 시그니처를 매일 보는 곳에 */}
        {/* 사이클 86: PageHeader 와 간격 부여(mt-6) — 인사 헤더가 PageHeader 에 붙던 문제 해소 */}
        <div className="mt-6 mb-5">
          <JourneyGreetingHeader user={user} />
        </div>

        {/* Phase 3: 오늘 카드 — 개인 액션(복습·이어쓰기·지도노트·참석 모임)만 압축한 히어로.
            영역 카운트는 아래 커맨드센터 담당. 액션 없으면 자동 숨김. */}
        <TodayCard />

        {/* 사이클 104: F-패턴·정보 빈도 기반 상단 재편 (사용자 요청 — Mayer 멀티미디어/마케팅 시선흐름).
            좌상단(최고 시선)에 매일 보는 '오늘의 시간표', 우측 좁은 컬럼에 프로필 요약(정체성·완성도).
            시간표 비대상(졸업생 등)은 프로필 풀폭 폴백. */}
        {/* 사이클 111: 시간표·커맨드센터를 좌측 1fr 로 묶어 폭 정렬(사용자 — 시간표 폭 ≠ 커맨드 그리드),
            우측 컬럼에 프로필 요약 + 알림·할일 미니위젯으로 하단 공백 채움(사용자 요청). */}
        {/* 사이클 124: 좌·우 컬럼 하단 라인 정렬 (사용자 요청).
            items-stretch 로 두 컬럼 높이를 맞추고, 우측 마지막 위젯(학습 잔디)을 flex-1 로 늘려
            좌측 타임라인+커맨드센터 하단과 우측 잔디 하단 라인을 일치시킨다. */}
        {canShowWidget(user.role, "dailyClassTimeline") ? (
          <div className="mb-6 grid items-stretch gap-4 lg:grid-cols-[1fr_336px]">
            <div className="flex min-w-0 flex-col gap-5">
              <DailyClassTimelineWidget />
              <DashboardCommandCenter />
            </div>
            <div className="flex flex-col gap-4">
              <ProfileSummaryCard user={user} />
              <ProfileSideWidget userId={user.id} />
              <div className="flex flex-1 flex-col [&>*]:flex-1">
                <LearningStreak compact />
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-6 space-y-5">
            <ProfileSummaryCard user={user} />
            <DashboardCommandCenter />
          </div>
        )}

        {/* M4: 잔디 비활성 영역 자동 코칭 — 위 잔디/활동 위젯에 인접.
            최근 14일 멈춘 연구 습관 1개만 가벼운 다음 한 걸음으로 제안.
            신입·활동 고른 회원·해당 없음이면 컴포넌트가 null 렌더로 자동 숨김. */}
        <div className="mb-6 empty:hidden">
          <InactivityCoachingCard />
        </div>

        {/* M1(v5): 주간 학습 목표 설정·달성 루프 — 코칭 카드 형제.
            목표 설정 시 진행 바·달성 축하, 미설정 시 프리셋 3종 CTA + 지난주 회고. */}
        <div className="mb-6 empty:hidden">
          <WeeklyGoalCard />
        </div>

        {/* v8-H5: 신입 첫 2주 진행 위젯 — 현재 학기 코호트·가입 14일 이내에만 노출.
            4단계 전부 완료·창 밖·코호트 미상이면 컴포넌트가 null 렌더로 자동 숨김. */}
        <div className="mb-6 empty:hidden">
          <NewcomerProgressWidget />
        </div>

        {/* v8-H2: 응원(kudos) 위젯 — 이번 주 받은 응원 + 코호트 동기에게 응원 보내기.
            받은 응원·보낼 대상 모두 없으면 null 렌더로 자동 숨김. */}
        <div className="mb-6 empty:hidden">
          <KudosWidget />
        </div>

        {/* C-1: 개강 주간(D-7~D+14) 자동 노출 재활성화 배너 */}
        <SemesterKickoffBanner />

        {/* H6: 해커톤 참가 CTA 배너 — 행사 종료 전까지 1회 노출 (닫기 가능) */}
        <HackathonCtaBanner />

        {/* RT-1: 지난 방문 이후 새 글 뱃지 — 게시판 재방문 트리거 */}
        <NewPostsBadge prevVisit={prevVisitRef.current ?? null} />

        {/* 사이클 113b: 빠른 바로가기 한 줄 (사용자 요청 — 별도 영역) */}
        <div className="mb-6">
          <QuickLinks />
        </div>

        {/* 사이클 85: 이번 학기 추천 한 걸음 — 커맨드센터 아래, JOURNEY_STAGES 현재 학기 추천 행동 (여정 문서 High ②).
            학기 미설정자는 JourneyGreetingHeader 가 유도하므로 패널 내부에서 null 렌더. */}
        <div className="mb-6 empty:hidden">
          <StageRecommendationPanel user={user} />
        </div>

        {/* 스프린트3 H4: 신입 온보딩 표면 통합 — 기존 WelcomeBanner·ChecklistWidget 2종을
            상단 NewMemberOnboardingCard(자족형) 단일 카드로 수렴. 전체 가이드는 카드 하단
            브리지에서 /steppingstone/onboarding(정본 온보딩)으로 위임. */}

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
        {isStaff && isWidgetVisible(layout, "staffAlerts") && (
          <StaffPriorityPanel muted={staffAlertsMuted} />
        )}
      </div>

      {/* 숨겨진 위젯 재활성 안내 (사이클 45, ③a-3 결정 — 기본 숨김 위젯의 발견성) */}
      {!editMode && (
        <p className="mx-auto mt-3 max-w-6xl px-4 text-[11px] text-muted-foreground">
          AI 포럼 라이브·복습 카드·데일리 회고 등 일부 위젯은 기본 숨김이에요 —{" "}
          <button
            type="button"
            onClick={handleToggleEditMode}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            위젯 편집
          </button>
          에서 켤 수 있습니다.
        </p>
      )}

      {/* ── 섹션 2.5: 졸업생 전용 콘텐츠 (Phase C) ──
       *  학사 위젯이 모두 숨겨지는 alumni 에게 의미 있는 콘텐츠 노출.
       *  isAlumni(user) === false 일 때는 null 반환되므로 일반 회원에게 영향 없음.
       */}
      {isAlumni(user) && (
        <section className="mx-auto mt-6 max-w-6xl px-4">
          <AlumniHomeWidgets />
        </section>
      )}

      {/* ── D-2b/D-2c: 12개 핵심 위젯 — 사용자 정의 순서대로 렌더 ──
       *  widgetMap 의 각 항목은 자체 wrapper(section/spacing)를 포함.
       *  staffAlerts 는 상단 별도 영역, seminars(내 신청 세미나)는 데이터 의존성 때문에 하단 유지.
       *
       *  D-2c 인라인 편집 모드:
       *   - editMode=ON 일 때만 DndContext + SortableContext 활성.
       *   - 편집 모드에서는 숨겨진 위젯도 흐리게 렌더하여 토글로 복구 가능.
       *   - 편집 모드 OFF 면 기존 동작 (가시성 필터 + Fragment) 그대로.
       */}
      {editMode ? (
        <>
          {/* 편집 모드 프리셋 바 — DndContext 밖에서 sticky 배치 */}
          <EditModePresetBar userId={user.id} onComplete={handleEditComplete} />
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedWidgets.map((w) => w.key)}
            strategy={verticalListSortingStrategy}
          >
            {sortedWidgets.map((cfg) => {
              const node = widgetMap[cfg.key];
              if (!node) return null;
              return (
                <DraggableWidget
                  key={cfg.key}
                  widgetKey={cfg.key}
                  editMode
                  visible={isWidgetVisible(layout, cfg.key)}
                  onToggle={(v) => handleVisibilityToggle(cfg.key, v)}
                >
                  {node}
                </DraggableWidget>
              );
            })}
          </SortableContext>
        </DndContext>
        </>
      ) : (
        sortedWidgets.map((cfg) => {
          if (!isWidgetVisible(layout, cfg.key)) return null;
          const node = widgetMap[cfg.key];
          if (!node) return null;
          return <Fragment key={cfg.key}>{node}</Fragment>;
        })
      )}

      {/* ── 섹션 8: 소셜·활동 피드 (seminars + ActivityFeed 는 데이터 의존성으로 인라인 유지) ── */}
      <section className="mx-auto mt-8 max-w-6xl px-4 space-y-6">
        {/* 내 신청 세미나 */}
        {isWidgetVisible(layout, "seminars") && mySeminars.length > 0 && (
          <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
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
                    {(() => {
                      const mode = inferSeminarMode(s);
                      return (
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                            SEMINAR_MODE_BADGE[mode],
                          )}
                        >
                          {SEMINAR_MODE_LABEL[mode]}
                        </span>
                      );
                    })()}
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
        <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
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
