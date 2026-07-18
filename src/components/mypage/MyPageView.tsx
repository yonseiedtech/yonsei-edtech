"use client";

import { useRef, useEffect, useState, startTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuthStore } from "@/features/auth/auth-store";
import ProfileEditor from "@/features/auth/ProfileEditor";
import PasswordChangeForm from "@/features/auth/PasswordChangeForm";
import { usePosts } from "@/features/board/useBoard";
import { useSeminars } from "@/features/seminar/useSeminar";
import { useQuery } from "@tanstack/react-query";
import { certificatesApi, activitiesApi, profilesApi, reviewsApi, diagnosticResultsApi, flashcardsApi } from "@/lib/bkend";
import { auth } from "@/lib/firebase";
import { enrichCertificates } from "@/lib/denorm-sync";
import { todayYmdLocal, todayYmdKst } from "@/lib/dday";
import { useResearchPapers } from "@/features/research/useResearchPapers";
import { useMyInterviewResponses } from "@/features/board/interview-store";
import type { Certificate, Activity, User, SeminarReview } from "@/types";
import type { DiagnosticResult } from "@/types/diagnostic";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/ui/page-header";
import PageContainer from "@/components/ui/page-container";
import { cn } from "@/lib/utils";
import { SEMANTIC, STATUS_CHIP } from "@/lib/design-tokens";
import {
  User as UserIcon,
  LogOut,
  Award,
  Home,
  ChevronRight,
  BookOpen,
  QrCode,
  Eye,
  ClipboardList,
  FileText,
  Mic,
  ArrowRight,
  Calendar,
  Clock,
  FolderKanban,
  AlertCircle,
  PenSquare,
  Sparkles,
  Bell,
  Settings,
  LayoutDashboard,
  X,
  CalendarDays,
  NotebookPen,
  PackageOpen,
  ClipboardCheck,
  Layers,
} from "lucide-react";

// react-easy-crop(39KB gzipped) — 명함 탭 클릭 시에만 chunk 로드
const CardSection = dynamic(
  () => import("@/features/card/CardSection"),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse h-96 rounded-2xl bg-muted" aria-busy="true" aria-label="명함 불러오는 중" />
    ),
  },
);
import EmptyState from "@/components/ui/empty-state";
import LearningStreak from "@/features/mypage/LearningStreak";
import ProfileViewsWidget from "@/features/mypage/ProfileViewsWidget";
import ProfileOnboardingBadges from "@/components/profile/ProfileOnboardingBadges";
import ARCSPanel from "@/features/mypage/ARCSPanel";
import ConnectivismPanel from "@/features/mypage/ConnectivismPanel";
import DiagnosticWeakConceptPath from "@/components/mypage/DiagnosticWeakConceptPath";
import LearningEffectCard from "@/features/mypage/LearningEffectCard";
import ReadingResearchLoopCard from "@/features/mypage/ReadingResearchLoopCard";
import DefensePracticeTrendCard from "@/features/mypage/DefensePracticeTrendCard";
import MyActivityHub from "@/components/mypage/MyActivityHub";
import ThesisProgressWidget from "@/features/research/ThesisProgressWidget";
import GraduationChecklistCard from "@/features/mypage/GraduationChecklistCard";
import { isWrappedSeason } from "@/features/mypage/useSemesterWrapped";
import { useAuth } from "@/features/auth/useAuth";
import { ROLE_LABELS, ENROLLMENT_STATUS_LABELS } from "@/types";
import { formatDate } from "@/lib/utils";

const TABS = [
  { key: "overview", label: "개요", icon: Home },
  { key: "card", label: "내 명함", icon: QrCode },
  { key: "activities", label: "내 활동", icon: ClipboardList },
  { key: "research", label: "내 연구", icon: BookOpen },
  { key: "settings", label: "설정", icon: Settings },
] as const;

// 구 URL ?tab=X 에 대한 레거시 매핑
const LEGACY_TAB_MAP: Record<string, (typeof TABS)[number]["key"]> = {
  home: "overview",
  profile: "settings",
  password: "settings",
  certificates: "activities",
  posts: "activities",
  interviews: "activities",
};

type TabKey = (typeof TABS)[number]["key"];

interface Props {
  userId: string;
  readOnly?: boolean;
}

export default function MyPageView({ userId, readOnly = false }: Props) {
  const { user: authUser } = useAuthStore();
  const { logout } = useAuth();
  const { posts } = usePosts();
  const { seminars } = useSeminars();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [whatsNewDismissed, setWhatsNewDismissed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("yonsei_whats_new_dismissed_v3") === "true",
  );
  // 체감 스프린트: 이론 인사이트 패널(ARCS·Connectivism) 기본 접힘 — 통계 중복·스크롤 깊이 축소
  const [insightsOpen, setInsightsOpen] = useState(false);

  // Legacy URL 자동 리다이렉트 + 탭 동기화
  useEffect(() => {
    if (readOnly) return;
    const t = searchParams.get("tab");
    const sub = searchParams.get("sub");
    // 구 /mypage?tab=activities&sub=research → /mypage/research
    if (t === "activities" && sub === "research") {
      router.replace("/mypage/research");
      return;
    }
    if (!t) {
      startTransition(() => setActiveTab("overview"));
      return;
    }
    // 현재 탭 키면 그대로 적용
    if (TABS.some((x) => x.key === t)) {
      startTransition(() => setActiveTab(t as TabKey));
      return;
    }
    // 레거시 탭 키면 매핑
    if (t in LEGACY_TAB_MAP) {
      const mapped = LEGACY_TAB_MAP[t];
      startTransition(() => setActiveTab(mapped));
      // URL도 정규화
      const qs = new URLSearchParams(searchParams.toString());
      if (mapped === "overview") qs.delete("tab");
      else qs.set("tab", mapped);
      const next = qs.toString();
      router.replace(next ? `/mypage?${next}` : "/mypage", { scroll: false });
    }
  }, [searchParams, router, readOnly]);

  const isSelf = authUser?.id === userId;
  const { data: fetchedUser } = useQuery({
    queryKey: ["mypage-user", userId],
    queryFn: async () => {
      const res = await profilesApi.get(userId);
      return res as unknown as User;
    },
    enabled: !isSelf,
  });
  const user = isSelf ? authUser : fetchedUser;

  const myPosts = Array.isArray(posts) ? posts.filter((p) => p.authorId === userId) : [];
  const mySeminars = Array.isArray(seminars)
    ? seminars.filter((s) => Array.isArray(s.attendeeIds) && s.attendeeIds.includes(userId))
    : [];
  const { responses: myInterviewResponses } = useMyInterviewResponses(userId);

  const { data: allActivities = [] } = useQuery({
    queryKey: ["activities", "all"],
    queryFn: async () => {
      const res = await activitiesApi.list();
      // 사이클 99: 런타임 비배열 방어 (eb.filter is not a function 크래시 원인)
      return Array.isArray(res.data) ? (res.data as unknown as Activity[]) : [];
    },
    enabled: !!user,
  });

  // data-split: 신청 내역은 비공개 컬렉션 → /api/me/applications 로 조회 (본인 전용).
  const { data: myApplications = [] } = useQuery({
    queryKey: ["me-applications", userId],
    enabled: !!user && isSelf,
    queryFn: async (): Promise<
      { activityId: string; status: string; participantType?: string; appliedAt: string; name: string }[]
    > => {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) return [];
      const res = await fetch("/api/me/applications", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) return [];
      const json = (await res.json()) as {
        applications: { activityId: string; status: string; participantType?: string; appliedAt: string; name: string }[];
      };
      return json.applications ?? [];
    },
  });
  const applicationByActivity = new Map(myApplications.map((ap) => [ap.activityId, ap]));

  const myActivities = allActivities.filter((a) => {
    if (!user) return false;
    const inMembers = a.members?.includes(user.id) || a.members?.includes(user.name);
    const inParticipants = a.participants?.includes(user.id) || a.participants?.includes(user.name);
    const isLeader = a.leader === user.id || a.leader === user.name;
    // 대외학술대회는 신청만으로 참여로 간주(rejected 제외)
    const myApp = applicationByActivity.get(a.id);
    const isApplicant = !!myApp &&
      (a.type === "external" ? myApp.status !== "rejected" : myApp.status === "approved");
    return inMembers || inParticipants || isLeader || isApplicant;
  });

  const { data: allCertificates = [] } = useQuery({
    queryKey: ["certificates", "my", userId],
    queryFn: async () => {
      const res = await certificatesApi.list();
      return enrichCertificates(res.data as unknown as Certificate[]);
    },
    enabled: !!user,
  });

  const { data: myReviews = [] } = useQuery({
    queryKey: ["my-reviews", userId],
    queryFn: async () => {
      const res = await reviewsApi.listByAuthor(userId);
      return res.data as unknown as SeminarReview[];
    },
    enabled: !!user && isSelf,
  });
  const myCertificates = allCertificates.filter((c) => {
    if (!user) return false;
    if (c.recipientUserId && c.recipientUserId === user.id) return true;
    if (c.recipientEmail && user.email && (c.recipientEmail as string).toLowerCase() === user.email.toLowerCase()) return true;
    if (!c.recipientUserId && !c.recipientEmail && c.recipientName === user.name) return true;
    return false;
  });

  // 연구활동 카드용 카운트 (임시저장 제외)
  const { papers: myPapers } = useResearchPapers(user?.id);
  const publishedPaperCount = Array.isArray(myPapers) ? myPapers.filter((p) => !p.isDraft).length : 0;

  // 진단평가 — 본인 최신 + 직전 결과 (diagnostic_results 본인 read, createdAt:desc).
  //  - latest: 준비도 요약 + 약점 개념 읽기 추천
  //  - previous: 직전(2번째) 결과로 재진단 델타 피드백 (성장 루프). listByUser 1회 호출 재사용.
  const { data: diagnosticData } = useQuery({
    queryKey: ["mypage-diagnostic", userId],
    queryFn: async (): Promise<{
      latest: DiagnosticResult | null;
      previous: DiagnosticResult | null;
      count: number;
    }> => {
      const res = await diagnosticResultsApi.listByUser(userId);
      const list = Array.isArray(res.data) ? res.data : [];
      return { latest: list[0] ?? null, previous: list[1] ?? null, count: list.length };
    },
    enabled: !!user && isSelf,
    staleTime: 5 * 60_000,
  });
  const latestDiagnostic = diagnosticData?.latest ?? null;
  const previousDiagnostic = diagnosticData?.previous ?? null;
  const diagnosticCount = diagnosticData?.count ?? 0;

  // 암기카드 — 본인 카드 수 + 오늘 복습 대상(dueAt<=today) 수. 정렬·필터는 클라이언트(복합 인덱스 회피).
  const { data: flashcardSummary } = useQuery({
    queryKey: ["mypage-flashcards", userId],
    queryFn: async (): Promise<{ total: number; dueToday: number }> => {
      const res = await flashcardsApi.listByUser(userId);
      const list = Array.isArray(res.data) ? res.data : [];
      const today = todayYmdKst();
      const dueToday = list.filter((c) => (c.dueAt ?? "") <= today).length;
      return { total: list.length, dueToday };
    },
    enabled: !!user && isSelf,
    staleTime: 5 * 60_000,
  });
  const flashcardTotal = flashcardSummary?.total ?? 0;
  const flashcardDueToday = flashcardSummary?.dueToday ?? 0;

  // 재진단 넛지 — 마지막 진단 후 14일 이상 경과 시 은은히 권장 (신규 점수 가산 없음, 표시만)
  const needsRediagnosis = (() => {
    if (!latestDiagnostic?.createdAt) return false;
    const last = new Date(latestDiagnostic.createdAt).getTime();
    if (Number.isNaN(last)) return false;
    return Date.now() - last >= 14 * 24 * 60 * 60 * 1000;
  })();

  if (!user) return null;

  return (
    <PageContainer width="default">
        {/* 헤더 */}
        <PageHeader
          icon={UserIcon}
          title="마이페이지"
          actions={
            !readOnly && isSelf ? (
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut size={16} className="mr-1" />
                로그아웃
              </Button>
            ) : readOnly ? (
              <Badge variant="secondary">
                <Eye size={12} className="mr-1" />
                읽기 전용
              </Badge>
            ) : null
          }
        />

        {/* 프로필 카드 */}
        <div className="mt-8 rounded-2xl border bg-card p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserIcon size={28} />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold">{user.name}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge>{ROLE_LABELS[user.role]}</Badge>
                  {user.enrollmentStatus && (
                    <Badge variant="outline">{ENROLLMENT_STATUS_LABELS[user.enrollmentStatus]}</Badge>
                  )}
                  {user.studentId && (
                    <span className="text-xs text-muted-foreground">{user.studentId}</span>
                  )}
                </div>
              </div>
            </div>
            {!readOnly && (
              <Link
                href={`/profile/${user.id}?from=mypage`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-xs hover:bg-muted"
              >
                <UserIcon size={14} />
                <span className="hidden sm:inline">공개 프로필 보기</span>
                <span className="sm:hidden">프로필</span>
              </Link>
            )}
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <nav className="mt-6 flex gap-1 overflow-x-auto border-b" aria-label="마이페이지 탭">
          {TABS.map((tab) => {
            // QA-v3 L: 명함 콘텐츠는 본인 전용 — readOnly/타인 열람에선 탭 자체를 숨겨 빈 패널 방지
            if (tab.key === "card" && (!isSelf || readOnly)) return null;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  if (!readOnly) {
                    const qs = new URLSearchParams(searchParams.toString());
                    if (tab.key === "overview") qs.delete("tab");
                    else qs.set("tab", tab.key);
                    const next = qs.toString();
                    router.replace(next ? `/mypage?${next}` : "/mypage", { scroll: false });
                  }
                }}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-none items-center gap-1 border-b-2 px-2.5 py-2 text-xs font-medium transition-colors sm:gap-1.5 sm:px-4 sm:py-2.5 sm:text-sm",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <tab.icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* 탭 콘텐츠 */}
        <div className="mt-6">
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Push 권한 안내 — 미결정 상태이고 dismiss 안 한 경우만 노출 */}

              {/* 신규 기능 안내 배너 — localStorage dismiss 후 사라짐 */}
              {!whatsNewDismissed && (
                <div className="relative rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-4">
                  <button
                    type="button"
                    aria-label="닫기"
                    onClick={() => {
                      localStorage.setItem("yonsei_whats_new_dismissed_v3", "true");
                      setWhatsNewDismissed(true);
                    }}
                    className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X size={14} />
                  </button>
                  <div className="flex items-start gap-3 pr-6">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <Sparkles size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">새로운 기능이 추가되었어요!</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        대시보드 개인화·체크리스트·알림센터·아카이브 강화 등 업데이트 내용을 확인하세요.
                      </p>
                      <Link
                        href="/whats-new"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        신규 기능 보기
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* P1: 시작하기 체크리스트 마일스톤 배지 (본인) */}
              {user.onboardingBadges && user.onboardingBadges.length > 0 && (
                <div className="rounded-2xl border bg-card p-4 shadow-sm">
                  <h3 className="mb-2 text-sm font-semibold">시작하기 마일스톤</h3>
                  <ProfileOnboardingBadges badges={user.onboardingBadges} />
                </div>
              )}

              {/* RT-3(2026-07-04): 최근 7일 프로필 조회 — 수집만 되고 미노출이던 사회적 신호 */}
              <ProfileViewsWidget />

              {/* Sprint 56: 학습 잔디 — 365일 활동 그리드 + streak + 마일스톤 */}
              <LearningStreak />

              {/* 체감 스프린트: 이론 인사이트 패널 2종을 기본 접힘 섹션으로 통합
                  — 학회활동 카드 chip 과 동일 카운트의 재표현이라 평시 노출 시 통계 중복·과밀 유발 */}
              <div className="rounded-2xl border bg-card shadow-sm">
                <button
                  type="button"
                  onClick={() => setInsightsOpen((v) => !v)}
                  aria-expanded={insightsOpen}
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <Sparkles size={15} className="text-primary" />
                    학습 동기·네트워크 인사이트
                    <span className="text-[11px] font-normal text-muted-foreground">
                      ARCS 동기 프로파일 · Connectivism
                    </span>
                  </span>
                  <ChevronRight
                    size={16}
                    className={cn(
                      "shrink-0 text-muted-foreground transition-transform",
                      insightsOpen && "rotate-90",
                    )}
                  />
                </button>
                {insightsOpen && (
                  <div className="space-y-4 border-t px-5 py-4">
                    {/* ARCS 동기 프로파일 — Keller (1987) 4축 시각화 */}
                    <ARCSPanel
                      inputs={{
                        interestKeywordCount: user.interestKeywords?.length ?? 0,
                        researchTopicCount: user.researchTopics?.length ?? 0,
                        researchInterestCount: user.researchInterests?.length ?? 0,
                        activityCount: myActivities.length + mySeminars.length,
                        certificateCount: myCertificates.length,
                        interviewCount: myInterviewResponses.filter(
                          (r) => r.status === "submitted",
                        ).length,
                        postCount: myPosts.length,
                      }}
                    />

                    {/* Connectivism 패널 — Siemens (2005) 네트워크 학습 이론 */}
                    <ConnectivismPanel />
                  </div>
                )}
              </div>

              {/* 내 학회활동 통합 안내 카드 */}
              <Link
                href="/mypage/activities"
                className="block rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-5 transition hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <ClipboardList size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold">내 학회활동</h3>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      학술활동·수료증·내 글·인터뷰를 한 화면에서 관리해보세요.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                      <span className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-0.5 text-muted-foreground">
                        <BookOpen size={11} /> 학술 {myActivities.length + mySeminars.length}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-0.5 text-muted-foreground">
                        <Award size={11} /> 수료증 {myCertificates.length}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-0.5 text-muted-foreground">
                        <FileText size={11} /> 내 글 {myPosts.length}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-0.5 text-muted-foreground">
                        <Mic size={11} /> 인터뷰
                      </span>
                    </div>
                  </div>
                  <ArrowRight size={18} className="shrink-0 self-center text-primary" />
                </div>
              </Link>

              {/* 내 연구활동 카드 (학회활동과 동일 격) */}
              <Link
                href="/mypage/research"
                className="block rounded-2xl border-2 border-amber-200/60 bg-gradient-to-br from-amber-50 to-amber-100/60 p-5 transition hover:border-amber-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:ring-offset-2"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-200/40 text-amber-700">
                    <BookOpen size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold">내 연구활동</h3>
                      <Badge variant="secondary" className="bg-amber-200/60 text-amber-800 text-[10px]">신규</Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      논문 여정 · 5장 작성 · 지도 노트를 한 화면에서 관리해보세요.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                      <span className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-0.5 text-muted-foreground">
                        <BookOpen size={11} /> 논문 {publishedPaperCount}
                      </span>
                    </div>
                  </div>
                  <ArrowRight size={18} className="shrink-0 self-center text-amber-700" />
                </div>
              </Link>

              {/* M1: 내 논문 진행도 — 보고서 완성도(작성률·분량 균형·lint 통과율) 상시 가시화 (본인만) */}
              {isSelf && !readOnly && <ThesisProgressWidget variant="card" />}

              {/* 졸업요건 체크표 — 학점 자동 합산 + 관문 자가 체크 (본인만) */}
              {isSelf && !readOnly && <GraduationChecklistCard userId={userId} />}

              {/* 진단평가 — 연구 준비도 진단 → 약점 개념 읽기 추천 → 재진단 루프 (본인만) */}
              {isSelf && !readOnly && (
                <div className="rounded-2xl border-2 border-violet-200/60 bg-gradient-to-br from-violet-50 to-violet-100/60 p-5 dark:border-violet-800/40 dark:from-violet-950/20 dark:to-violet-900/10">
                  {latestDiagnostic ? (
                    <>
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-200/40 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                          <ClipboardCheck size={22} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-bold">내 연구 준비도 진단</h3>
                            <span className="text-[11px] text-muted-foreground">
                              마지막 진단 {formatDate(latestDiagnostic.createdAt || "")}
                              {diagnosticCount > 1 && (
                                <span className="ml-1 text-violet-700/70 dark:text-violet-300/70">· {diagnosticCount}번째 진단</span>
                              )}
                            </span>
                          </div>
                          {previousDiagnostic && (
                            <p className="mt-1 text-[11px] text-muted-foreground">직전 진단 대비 변화</p>
                          )}
                          <div className="mt-2 grid grid-cols-2 gap-3">
                            <div className="rounded-xl border bg-card px-3 py-2.5">
                              <p className="text-[11px] text-muted-foreground">논문 작성 준비도</p>
                              <div className="mt-0.5 flex items-baseline gap-1.5">
                                <p className="text-lg font-bold tabular-nums text-violet-700 dark:text-violet-300">
                                  {latestDiagnostic.paperReadiness}
                                  <span className="ml-0.5 text-xs font-normal text-muted-foreground">/ 100</span>
                                </p>
                                {previousDiagnostic && (
                                  <ReadinessDelta delta={latestDiagnostic.paperReadiness - previousDiagnostic.paperReadiness} />
                                )}
                              </div>
                            </div>
                            <div className="rounded-xl border bg-card px-3 py-2.5">
                              <p className="text-[11px] text-muted-foreground">연구 분석 준비도</p>
                              <div className="mt-0.5 flex items-baseline gap-1.5">
                                <p className="text-lg font-bold tabular-nums text-violet-700 dark:text-violet-300">
                                  {latestDiagnostic.analysisReadiness}
                                  <span className="ml-0.5 text-xs font-normal text-muted-foreground">/ 100</span>
                                </p>
                                {previousDiagnostic && (
                                  <ReadinessDelta delta={latestDiagnostic.analysisReadiness - previousDiagnostic.analysisReadiness} />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 약점 개념 → 추천 학습 경로 (측정도구·졸업생 논문 큐레이션). 헤더/설명은 컴포넌트 내부. */}
                      {latestDiagnostic.weakConceptIds.length > 0 && (
                        <DiagnosticWeakConceptPath
                          weakConceptIds={latestDiagnostic.weakConceptIds}
                          weakConceptNames={latestDiagnostic.weakConceptNames}
                        />
                      )}

                      {needsRediagnosis && (
                        <p className="mt-4 rounded-lg bg-violet-100/70 px-3 py-2 text-[12px] text-violet-800 dark:bg-violet-900/30 dark:text-violet-200">
                          마지막 진단으로부터 2주가 지났어요. 그동안의 학습을 반영해 재진단해 보면 준비도 변화를 확인할 수 있어요.
                        </p>
                      )}

                      <div className="mt-4">
                        <Link href="/diagnosis">
                          <Button variant="outline" size="sm" className="border-violet-300 text-violet-700 hover:bg-violet-100 dark:border-violet-700 dark:text-violet-300">
                            다시 진단하기
                            <ArrowRight size={14} className="ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </>
                  ) : (
                    <Link href="/diagnosis" className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-200/40 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                        <ClipboardCheck size={22} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold">내 연구 준비도를 진단해보세요</h3>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          통계방법·연구방법·핵심개념을 진단해 논문 작성·연구 분석 준비도를 확인하고 약점 개념을 아카이브로 연결합니다.
                        </p>
                      </div>
                      <ArrowRight size={18} className="shrink-0 self-center text-violet-700 dark:text-violet-300" />
                    </Link>
                  )}
                  {/* 사이클 122 완료: 진단 완료를 학습 잔디 활동으로 인정 — LearningStreak SCORES.diagnosticComplete(+5)로 createdAt 일별 1회 가산(연구활동🔬). */}
                </div>
              )}

              {/* 학습효과 증명 루프 (G2) — 복습한 약점 개념이 재진단에서 개선됐는지 교차 분석 (본인만) */}
              {isSelf && !readOnly && <LearningEffectCard userId={userId} />}

              {/* 읽기 → 연구 진척 병치 (M5) — 최근 4주 논문 읽기 × 논문 작성 글자 증가 (본인만) */}
              {isSelf && !readOnly && <ReadingResearchLoopCard userId={userId} />}

              {/* 심사 연습 추세 (M5) — 논문 심사 연습 회차별 평균 점수 시계열 (본인만) */}
              {isSelf && !readOnly && <DefensePracticeTrendCard userId={userId} />}

              {/* 내 암기카드 — 진단 오답 복습(뒤집기·간격반복). 카드가 있을 때만 노출 (본인만) */}
              {isSelf && !readOnly && flashcardTotal > 0 && (
                <Link
                  href="/flashcards"
                  className="block rounded-2xl border-2 border-sky-200/60 bg-gradient-to-br from-sky-50 to-sky-100/60 p-5 transition hover:border-sky-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 focus-visible:ring-offset-2 dark:border-sky-800/40 dark:from-sky-950/20 dark:to-sky-900/10"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-200/40 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                      <Layers size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold">내 암기카드</h3>
                        {flashcardDueToday > 0 && (
                          <Badge className="bg-sky-600 text-[10px] tabular-nums text-white hover:bg-sky-600">
                            오늘 복습 {flashcardDueToday}장
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {flashcardDueToday > 0
                          ? `복습할 카드 ${flashcardDueToday}장이 준비되어 있어요. 뒤집기로 빠르게 점검해보세요.`
                          : `저장한 카드 ${flashcardTotal}장. 오늘 복습 대상은 없지만 미리 둘러볼 수 있어요.`}
                      </p>
                    </div>
                    <ArrowRight size={18} className="shrink-0 self-center text-sky-700 dark:text-sky-300" />
                  </div>
                </Link>
              )}

              {/* H2: 학기 Wrapped 진입 — 학기 말(≤6주) + 활동 데이터 충분 시에만 노출(과밀 방지, 본인만) */}
              {isSelf && !readOnly && isWrappedSeason() &&
                (diagnosticCount > 0 ||
                  flashcardTotal > 0 ||
                  publishedPaperCount > 0 ||
                  myPosts.length > 0 ||
                  myActivities.length + mySeminars.length > 0) && (
                  <Link
                    href="/mypage/wrapped"
                    className="block overflow-hidden rounded-2xl border-2 border-primary/30 bg-primary p-5 text-primary-foreground transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/15">
                        <Sparkles size={22} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold">이번 학기 나의 학회 발자취</h3>
                        <p className="mt-0.5 text-sm text-primary-foreground/80">
                          학습·읽기·집필·진단·세미나를 모아 이번 학기의 성장 이야기로 되돌려 드려요.
                        </p>
                      </div>
                      <ArrowRight size={18} className="shrink-0 self-center" />
                    </div>
                  </Link>
                )}

              {(() => {
                const today = todayYmdLocal();
                const upcomingActivities = myActivities
                  .filter((a) => (a.date || "") >= today)
                  .map((a) => ({ id: a.id, title: a.title, date: a.date, meta: "학술활동", href: `/activities` }));
                const upcomingSeminars = mySeminars
                  .filter((s) => (s.date || "") >= today)
                  .map((s) => ({ id: s.id, title: s.title, date: s.date, meta: `세미나 · ${s.location}`, href: `/seminars/${s.id}` }));
                const upcoming = [...upcomingActivities, ...upcomingSeminars]
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .slice(0, 3);

                return (
                  <div className="rounded-2xl border bg-card p-5">
                    <h3 className="text-sm font-semibold">다음 학술활동</h3>
                    {upcoming.length === 0 ? (
                      <EmptyState
                        icon={BookOpen}
                        title="예정된 학술활동이 없습니다"
                        description="프로젝트·스터디·세미나에 참여해보세요."
                        actionLabel="학술활동 둘러보기"
                        actionHref="/activities"
                        className="mt-3 border-0 bg-transparent py-6"
                      />
                    ) : (
                      <ul className="mt-3 divide-y">
                        {upcoming.map((item) => (
                          <li key={item.id} className="flex items-center justify-between py-2.5">
                            <div className="min-w-0">
                              <Link href={item.href} className="truncate text-sm font-medium hover:text-primary">{item.title}</Link>
                              <p className="text-xs text-muted-foreground">{formatDate(item.date)} · {item.meta}</p>
                            </div>
                            <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })()}

              {isSelf && !readOnly && (() => {
                const today = todayYmdLocal();

                const pendingApps = allActivities
                  .map((a) => {
                    const myApp = applicationByActivity.get(a.id);
                    return {
                      a,
                      mine: myApp && myApp.status !== "approved" ? myApp : undefined,
                    };
                  })
                  .filter(
                    (x): x is { a: Activity; mine: NonNullable<typeof x.mine> } => !!x.mine,
                  );

                const reviewedSeminarIds = new Set(
                  myReviews.filter((r) => r.type === "attendee").map((r) => r.seminarId)
                );
                const pendingReviews = mySeminars
                  .filter((s) => s.date && s.date < today)
                  .filter((s) => !reviewedSeminarIds.has(s.id))
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 3);

                if (pendingApps.length === 0 && pendingReviews.length === 0) return null;

                return (
                  <div className="space-y-2">
                    {pendingApps.length > 0 && (
                      <Link
                        href="/mypage/activities"
                        className={cn("block rounded-2xl border p-4 transition hover:border-amber-300 hover:bg-amber-50", SEMANTIC.warning.border, SEMANTIC.warning.bg)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-200/60", SEMANTIC.warning.accent)}>
                            <AlertCircle size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={cn("text-sm font-semibold", SEMANTIC.warning.titleStrong)}>
                              신청 결과 대기 {pendingApps.length}건
                            </p>
                            <p className={cn("mt-0.5 truncate text-xs", SEMANTIC.warning.textMuted)}>
                              {pendingApps.slice(0, 2).map((x) => x.a.title).join(" · ")}
                              {pendingApps.length > 2 ? ` 외 ${pendingApps.length - 2}건` : ""}
                            </p>
                          </div>
                          <ChevronRight size={16} className={cn("shrink-0 self-center", SEMANTIC.warning.accent)} />
                        </div>
                      </Link>
                    )}

                    {pendingReviews.map((s) => (
                      <Link
                        key={`prv-${s.id}`}
                        href={`/seminars/${s.id}/review`}
                        className={cn("block rounded-2xl border p-4 transition hover:border-blue-300 hover:bg-blue-50", SEMANTIC.info.border, SEMANTIC.info.bg)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-200/60", SEMANTIC.info.accent)}>
                            <PenSquare size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={cn("text-sm font-semibold", SEMANTIC.info.titleStrong)}>
                              세미나 리뷰를 작성해보세요
                            </p>
                            <p className={cn("mt-0.5 truncate text-xs", SEMANTIC.info.textMuted)}>
                              {s.title} · {formatDate(s.date)}
                            </p>
                          </div>
                          <ChevronRight size={16} className={cn("shrink-0 self-center", SEMANTIC.info.accent)} />
                        </div>
                      </Link>
                    ))}
                  </div>
                );
              })()}

              {isSelf && !readOnly && (() => {
                const today = todayYmdLocal();
                const ACTIVITY_LABELS: Record<string, string> = {
                  study: "스터디",
                  project: "프로젝트",
                  external: "대외활동",
                };

                // 사용자 취향 프로파일: 참여한 활동의 type/tag 빈도
                const typeWeights: Record<string, number> = {};
                const tagWeights: Record<string, number> = {};
                for (const a of myActivities) {
                  typeWeights[a.type] = (typeWeights[a.type] || 0) + 1;
                  for (const tag of a.tags || []) {
                    tagWeights[tag] = (tagWeights[tag] || 0) + 1;
                  }
                }

                const myActivityIds = new Set(myActivities.map((a) => a.id));

                // 후보: upcoming + 미참여 + 미신청
                const candidates = allActivities
                  .filter((a) => (a.date || "") >= today && a.status !== "completed")
                  .filter((a) => !myActivityIds.has(a.id))
                  .filter((a) => !applicationByActivity.has(a.id))
                  .map((a) => {
                    const typeScore = (typeWeights[a.type] || 0) * 3;
                    const tagScore = (a.tags || []).reduce(
                      (s, t) => s + (tagWeights[t] || 0) * 2,
                      0,
                    );
                    return { a, score: typeScore + tagScore };
                  })
                  .sort((x, y) => {
                    if (y.score !== x.score) return y.score - x.score;
                    return (x.a.date || "").localeCompare(y.a.date || "");
                  })
                  .slice(0, 3);

                if (candidates.length === 0) return null;

                const hasHistory = myActivities.length > 0;
                const heading = hasHistory ? "회원님 맞춤 추천" : "곧 시작하는 활동";

                return (
                  <div className="rounded-2xl border border-violet-200/70 bg-violet-50/50 p-5">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-violet-600" />
                      <h3 className="text-sm font-semibold text-violet-900">{heading}</h3>
                    </div>
                    <ul className="mt-3 divide-y divide-violet-100">
                      {candidates.map(({ a }) => {
                        const typeLabel = ACTIVITY_LABELS[a.type] || a.type;
                        const tagPreview = (a.tags || []).slice(0, 2).join(" · ");
                        return (
                          <li key={`rec-${a.id}`} className="py-2.5">
                            <Link
                              href={`/activities/${a.type}/${a.id}`}
                              className="flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-violet-900 hover:text-violet-700">
                                  {a.title}
                                </p>
                                <p className="mt-0.5 truncate text-xs text-violet-800/80">
                                  {typeLabel} · {formatDate(a.date)}
                                  {tagPreview && ` · ${tagPreview}`}
                                </p>
                              </div>
                              <ChevronRight size={14} className="shrink-0 text-violet-700" />
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })()}

              {(() => {
                type TLEvent = {
                  id: string;
                  ts: string;
                  iso: string;
                  title: string;
                  meta: string;
                  href: string;
                  type: "activity" | "seminar" | "certificate" | "post" | "interview";
                };
                const events: TLEvent[] = [];
                const cutoff = new Date();
                cutoff.setDate(cutoff.getDate() - 90);

                for (const a of myActivities) {
                  if (!a.date) continue;
                  const meta =
                    a.type === "project" ? "프로젝트"
                    : a.type === "study" ? "스터디"
                    : a.type === "external" ? "대외활동"
                    : "학술활동";
                  const href =
                    a.type === "project" ? `/activities/projects/${a.id}`
                    : a.type === "study" ? `/activities/studies/${a.id}`
                    : a.type === "external" ? `/activities/external/${a.id}`
                    : `/activities`;
                  events.push({ id: `act-${a.id}`, ts: a.date, iso: a.date, title: a.title, meta, href, type: "activity" });
                }
                for (const s of mySeminars) {
                  if (!s.date) continue;
                  events.push({ id: `sem-${s.id}`, ts: s.date, iso: s.date, title: s.title, meta: "세미나", href: `/seminars/${s.id}`, type: "seminar" });
                }
                for (const c of myCertificates) {
                  const label = c.type === "completion" ? "수료증" : c.type === "appointment" ? "임명장" : c.type === "participation" ? "참석확인서" : "감사장";
                  const title = c.activityTitle || c.seminarTitle || "수료증";
                  events.push({ id: `cert-${c.id}`, ts: c.issuedAt, iso: c.issuedAt, title, meta: label, href: `/mypage/activities?tab=certificates`, type: "certificate" });
                }
                for (const p of myPosts) {
                  if (!p.createdAt) continue;
                  events.push({ id: `post-${p.id}`, ts: p.createdAt, iso: p.createdAt, title: p.title, meta: "내 글 작성", href: `/board/${p.id}`, type: "post" });
                }
                for (const r of myInterviewResponses) {
                  const submitted = r.submittedAt || r.updatedAt;
                  if (!submitted || r.status !== "submitted") continue;
                  const post = posts.find((p) => p.id === r.postId);
                  if (!post) continue;
                  events.push({ id: `intv-${r.id}`, ts: submitted, iso: submitted, title: post.title, meta: "인터뷰 응답", href: `/board/${post.id}`, type: "interview" });
                }

                const recent = events
                  .filter((e) => new Date(e.iso) >= cutoff)
                  .sort((a, b) => b.iso.localeCompare(a.iso))
                  .slice(0, 8);

                if (recent.length === 0) return null;

                const ICON_MAP: Record<TLEvent["type"], { icon: typeof Calendar; bg: string; fg: string }> = {
                  activity: { icon: FolderKanban, bg: "bg-emerald-100 dark:bg-emerald-950/50", fg: "text-emerald-700 dark:text-emerald-300" },
                  seminar: { icon: Calendar, bg: "bg-primary/15", fg: "text-primary" },
                  certificate: { icon: Award, bg: "bg-amber-100 dark:bg-amber-950/50", fg: "text-amber-700 dark:text-amber-300" },
                  post: { icon: FileText, bg: "bg-muted", fg: "text-muted-foreground" },
                  interview: { icon: Mic, bg: "bg-blue-100 dark:bg-blue-950/50", fg: "text-blue-700 dark:text-blue-300" },
                };

                return (
                  <div className="rounded-2xl border bg-card p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                        <Clock size={14} className="text-muted-foreground" />
                        최근 활동
                      </h3>
                      <span className="text-[11px] text-muted-foreground">최근 90일</span>
                    </div>
                    <ol className="mt-4 space-y-3">
                      {recent.map((ev) => {
                        const cfg = ICON_MAP[ev.type];
                        const Icon = cfg.icon;
                        return (
                          <li key={ev.id} className="flex items-start gap-3">
                            <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", cfg.bg)}>
                              <Icon size={14} className={cfg.fg} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <Link href={ev.href} className="block truncate text-sm font-medium hover:text-primary">
                                {ev.title}
                              </Link>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                <span className={cn("mr-1.5 rounded-full px-1.5 py-0.5", cfg.bg, cfg.fg)}>{ev.meta}</span>
                                {formatDate(ev.iso)}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                );
              })()}

              {isSelf && !readOnly && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("card");
                      const qs = new URLSearchParams(searchParams.toString());
                      qs.set("tab", "card");
                      router.replace(`/mypage?${qs.toString()}`, { scroll: false });
                    }}
                    className="rounded-2xl border bg-card p-4 text-left hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <div className="flex items-center gap-2">
                      <QrCode size={16} className="text-primary" />
                      <p className="text-sm font-semibold">내 모바일 명함</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">QR·vCard·공유·교환 기록 관리</p>
                  </button>
                  <Link href="/activities" className="rounded-2xl border bg-card p-4 hover:border-primary/40 hover:shadow-sm">
                    <p className="text-sm font-semibold">학술활동 둘러보기</p>
                    <p className="mt-1 text-xs text-muted-foreground">프로젝트·스터디·대외활동</p>
                  </Link>
                  <Link href="/board" className="rounded-2xl border bg-card p-4 hover:border-primary/40 hover:shadow-sm">
                    <p className="text-sm font-semibold">게시판</p>
                    <p className="mt-1 text-xs text-muted-foreground">공지·자유·홍보·자료실</p>
                  </Link>
                  <Link href="/mypage/portfolio" className="rounded-2xl border bg-card p-4 hover:border-primary/40 hover:shadow-sm">
                    <p className="text-sm font-semibold">학술 포트폴리오</p>
                    <p className="mt-1 text-xs text-muted-foreground">수상·대외활동·콘텐츠 등록</p>
                  </Link>
                  <Link
                    href="/mypage/dashboard-settings"
                    className="rounded-2xl border bg-card p-4 hover:border-primary/40 hover:shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <LayoutDashboard size={16} className="text-primary" />
                      <p className="text-sm font-semibold">대시보드 설정</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">표시할 위젯을 선택합니다.</p>
                  </Link>
                  <Link
                    href="/mypage/calendar-sync"
                    className="rounded-2xl border bg-card p-4 hover:border-primary/40 hover:shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <CalendarDays size={16} className="text-primary" />
                      <p className="text-sm font-semibold">캘린더 Sync</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Google · Apple 캘린더에 일정 구독</p>
                  </Link>
                  <Link
                    href="/mypage/notes"
                    className="rounded-2xl border bg-card p-4 hover:border-primary/40 hover:shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <NotebookPen size={16} className="text-primary" />
                      <p className="text-sm font-semibold">내 메모</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">학습 노트·연구 메모·아이디어 관리</p>
                  </Link>
                </div>
              )}
            </div>
          )}

          {activeTab === "card" && isSelf && !readOnly && (
            <CardSection />
          )}

          {activeTab === "activities" && (
            <div className="space-y-4">
              {/* 내 활동 허브 — 신청·참여한 세미나·학술활동·모임 통합 (UX 보고서 §3.1 / M2). 본인만. */}
              {isSelf && !readOnly && (
                <div className="rounded-2xl border bg-card p-5">
                  <MyActivityHub
                    userId={userId}
                    mySeminars={mySeminars}
                    allActivities={allActivities}
                    myActivities={myActivities}
                    applicationByActivity={applicationByActivity}
                  />
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                학술활동·수료증·내 글·인터뷰를 한 화면에서 관리할 수 있습니다.
              </p>
              <Link
                href="/mypage/activities"
                className="flex items-center justify-between rounded-2xl border bg-card px-5 py-4 transition hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <ClipboardList size={20} />
                  </div>
                  <div>
                    <p className="font-semibold">내 학회활동 전체 보기</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">학술활동 {myActivities.length + mySeminars.length}건 · 수료증 {myCertificates.length}장 · 글 {myPosts.length}편</p>
                  </div>
                </div>
                <ArrowRight size={16} className="shrink-0 text-muted-foreground" />
              </Link>
              <Link
                href="/mypage/activities?tab=certificates"
                className="flex items-center justify-between rounded-2xl border bg-card px-5 py-4 transition hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    <Award size={20} />
                  </div>
                  <div>
                    <p className="font-semibold">수료증 · 임명장</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">발급된 수료증 {myCertificates.length}장</p>
                  </div>
                </div>
                <ArrowRight size={16} className="shrink-0 text-muted-foreground" />
              </Link>
              <Link
                href="/mypage/activities?tab=posts"
                className="flex items-center justify-between rounded-2xl border bg-card px-5 py-4 transition hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <FileText size={20} />
                  </div>
                  <div>
                    <p className="font-semibold">내 글</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">작성한 글 {myPosts.length}편</p>
                  </div>
                </div>
                <ArrowRight size={16} className="shrink-0 text-muted-foreground" />
              </Link>
            </div>
          )}

          {activeTab === "research" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                관심 연구분야·논문 분석 노트를 단계별로 정리할 수 있습니다.
              </p>
              <Link
                href="/mypage/research"
                className="flex items-center justify-between rounded-2xl border-2 border-amber-200/60 bg-gradient-to-br from-amber-50 to-amber-100/60 px-5 py-4 transition hover:border-amber-300 hover:shadow-sm dark:border-amber-800/40 dark:from-amber-950/20 dark:to-amber-900/10"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-200/40 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <p className="font-semibold">내 연구활동 전체 보기</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">논문 {publishedPaperCount}편 · 분석 노트</p>
                  </div>
                </div>
                <ArrowRight size={16} className="shrink-0 text-amber-700 dark:text-amber-300" />
              </Link>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-6">
              {/* 프로필 수정 */}
              <div className="rounded-2xl border bg-card p-6">
                <h3 className="mb-4 text-base font-bold">프로필 수정</h3>
                {readOnly ? (
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">이름:</span> {user.name}</p>
                    <p><span className="font-medium">이메일:</span> {user.email}</p>
                    <p><span className="font-medium">학번:</span> {user.studentId || "-"}</p>
                    <p className="text-xs text-muted-foreground pt-2">읽기 전용 모드에서는 프로필을 수정할 수 없습니다.</p>
                  </div>
                ) : (
                  <ProfileEditor user={user} />
                )}
              </div>

              {/* 비밀번호 변경 */}
              <div className="rounded-2xl border bg-card p-6">
                <h3 className="mb-4 text-base font-bold">비밀번호 변경</h3>
                {readOnly ? (
                  <p className="text-sm text-muted-foreground">읽기 전용 모드에서는 비밀번호를 변경할 수 없습니다.</p>
                ) : (
                  <PasswordChangeForm />
                )}
              </div>

              {/* 알림센터 안내 카드 */}
              {!readOnly && (
                <Link
                  href="/mypage/notifications"
                  className="flex items-center justify-between rounded-2xl border bg-card px-5 py-4 transition hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Bell size={20} />
                    </div>
                    <div>
                      <p className="font-semibold">알림센터</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">수신한 모든 알림 목록</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
                </Link>
              )}

              {/* 캘린더 Sync 안내 카드 */}
              {!readOnly && (
                <Link
                  href="/mypage/calendar-sync"
                  className="flex items-center justify-between rounded-2xl border bg-card px-5 py-4 transition hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <CalendarDays size={20} />
                    </div>
                    <div>
                      <p className="font-semibold">캘린더 Sync</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Google · Apple 캘린더에 학회 일정 구독</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
                </Link>
              )}

              {/* 내 데이터 다운로드 */}
              {!readOnly && (
                <Link
                  href="/mypage/data-export"
                  className="flex items-center justify-between rounded-2xl border bg-card px-5 py-4 transition hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <PackageOpen size={20} />
                    </div>
                    <div>
                      <p className="font-semibold">내 데이터 다운로드</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">활동·연구·수료증 등 본인 데이터를 JSON으로 저장</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
                </Link>
              )}

              {/* 알림 / 피드 설정 */}
              {!readOnly && <NotificationSettingsCard user={user} />}

              {/* 읽기 타이머 부엉이 표시 설정 */}
              {!readOnly && <ReadingOwlSettingsCard />}

              {/* 회원 탈퇴 */}
              {!readOnly && <SelfDeleteSection user={user} onDeleted={() => { logout(); router.push("/"); }} />}
            </div>
          )}
        </div>
    </PageContainer>
  );
}

/** 재진단 델타 배지 — 직전 진단 대비 준비도 변화(+/-)를 작은 인라인 배지로 표시 (성장 피드백 루프) */
function ReadinessDelta({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
        ─ 변화 없음
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span
      className={
        up
          ? cn("inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums", STATUS_CHIP.success)
          : cn("inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums", STATUS_CHIP.danger)
      }
    >
      {up ? "▲" : "▼"} {up ? "+" : ""}
      {delta}
    </span>
  );
}

/** Sprint 54·55·67 + Notif-Pref + Leaderboard: 알림 + 피드 노출 + 네트워크 노출 + Push 5종 + 순위 노출 설정 카드 */
function NotificationSettingsCard({ user }: { user: User }) {
  type PrefShape = {
    weeklyDigest?: boolean;
    feedOptIn?: boolean;
    networkOptIn?: boolean;
    pushStudySession?: boolean;
    pushStudyAssignment?: boolean;
    pushSeminarReminder?: boolean;
    pushSeminarReview?: boolean;
    pushClassReminder?: boolean;
    pushExternalRecruitment?: boolean;
    pushCollabInvite?: boolean;
    pushCollabMention?: boolean;
    pushCollabMilestone?: boolean;
    pushCollabReview?: boolean;
    pushJournalIssue?: boolean;
    pushCommBoard?: boolean;
    /** opt-in: undefined/false → 꺼짐. 명시 true 일 때만 켜짐 */
    pushFlashcardReview?: boolean;
  };
  const prefs = (user as User & { notificationPrefs?: PrefShape }).notificationPrefs;
  const [digest, setDigest] = useState<boolean>(prefs?.weeklyDigest !== false);
  const [feed, setFeed] = useState<boolean>(prefs?.feedOptIn !== false);
  const [network, setNetwork] = useState<boolean>(prefs?.networkOptIn !== false);
  const [leaderboard, setLeaderboard] = useState<boolean>(user.showInLeaderboard !== false);
  // Notif-Pref: push 5종 (default true, undefined 도 true 로 해석)
  const [pushStudySession, setPushStudySession] = useState<boolean>(prefs?.pushStudySession !== false);
  const [pushStudyAssignment, setPushStudyAssignment] = useState<boolean>(prefs?.pushStudyAssignment !== false);
  const [pushSeminarReminder, setPushSeminarReminder] = useState<boolean>(prefs?.pushSeminarReminder !== false);
  const [pushSeminarReview, setPushSeminarReview] = useState<boolean>(prefs?.pushSeminarReview !== false);
  const [pushClassReminder, setPushClassReminder] = useState<boolean>(prefs?.pushClassReminder !== false);
  const [pushExternalRecruitment, setPushExternalRecruitment] = useState<boolean>(prefs?.pushExternalRecruitment !== false);
  const [pushCollabInvite, setPushCollabInvite] = useState<boolean>(prefs?.pushCollabInvite !== false);
  const [pushCollabMention, setPushCollabMention] = useState<boolean>(prefs?.pushCollabMention !== false);
  const [pushCollabMilestone, setPushCollabMilestone] = useState<boolean>(prefs?.pushCollabMilestone !== false);
  const [pushCollabReview, setPushCollabReview] = useState<boolean>(prefs?.pushCollabReview !== false);
  const [pushJournalIssue, setPushJournalIssue] = useState<boolean>(prefs?.pushJournalIssue !== false);
  const [pushCommBoard, setPushCommBoard] = useState<boolean>(prefs?.pushCommBoard !== false);
  // QA-v3 H7: 서버 정책은 보유자 한정 opt-out(미설정=발송) — UI 도 동일 의미로 표시해야
  // "꺼짐으로 보이는데 발송되는" 역전이 없다. 명시 false 일 때만 꺼짐.
  const [pushFlashcardReview, setPushFlashcardReview] = useState<boolean>(prefs?.pushFlashcardReview !== false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function updateLeaderboardPref(next: boolean) {
    setBusyKey("leaderboard");
    setLeaderboard(next);
    try {
      await profilesApi.update(user.id, { showInLeaderboard: next });
      const { toast } = await import("sonner");
      toast.success(next ? "학습 잔디 순위에 표시됩니다." : "학습 잔디 순위에서 숨겨집니다.");
    } catch (e) {
      setLeaderboard(!next);
      const { toast } = await import("sonner");
      toast.error(`설정 변경 실패: ${(e as Error).message}`);
    } finally {
      setBusyKey(null);
    }
  }

  // 연속 토글 유실 방지 — stale prop 대신 세션 내 누적 변경분을 함께 병합
  const prefOverridesRef = useRef<Record<string, boolean>>({});
  async function updatePref(
    key: keyof PrefShape,
    next: boolean,
    setter: (v: boolean) => void,
    label: string,
  ) {
    setBusyKey(key);
    setter(next);
    prefOverridesRef.current[key] = next;
    try {
      await profilesApi.update(user.id, {
        notificationPrefs: {
          ...((user as User & { notificationPrefs?: Record<string, unknown> }).notificationPrefs ?? {}),
          ...prefOverridesRef.current,
        },
      });
      const { toast } = await import("sonner");
      toast.success(next ? `${label} 켰습니다.` : `${label} 껐습니다.`);
    } catch (e) {
      setter(!next);
      prefOverridesRef.current[key] = !next;
      const { toast } = await import("sonner");
      toast.error(`설정 변경 실패: ${(e as Error).message}`);
    } finally {
      setBusyKey(null);
    }
  }

  function ToggleRow({
    title,
    description,
    enabled,
    busy,
    onToggle,
    ariaLabel,
  }: {
    title: string;
    description: string;
    enabled: boolean;
    busy: boolean;
    onToggle: () => void;
    ariaLabel: string;
  }) {
    return (
      <div className="flex items-start justify-between gap-3 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          disabled={busy}
          role="switch"
          aria-checked={enabled}
          aria-label={ariaLabel}
          className={cn(
            "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors",
            enabled ? "bg-primary" : "bg-muted",
            busy && "opacity-50",
          )}
        >
          <span
            className={cn(
              "inline-block h-5 w-5 transform rounded-full bg-card shadow transition-transform",
              enabled ? "translate-x-6" : "translate-x-1",
            )}
          />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border bg-card p-6">
      <h3 className="flex items-center gap-2 text-base font-semibold">
        <Bell size={18} /> 알림 / 피드 설정
      </h3>
      <div className="mt-2 divide-y">
        <ToggleRow
          title="주간 다이제스트 메일"
          description="매주 월요일 09:00 — 다가오는 세미나 5건, 인기 게시글 3건, 다가오는 활동 3건."
          enabled={digest}
          busy={busyKey === "weeklyDigest"}
          onToggle={() =>
            void updatePref("weeklyDigest", !digest, setDigest, "주간 다이제스트를")
          }
          ariaLabel="주간 다이제스트 메일 수신 토글"
        />
        <ToggleRow
          title="활동 피드 노출"
          description="다른 회원의 대시보드 '동료의 최근 활동'에 내가 작성한 글·강의 후기가 표시됩니다."
          enabled={feed}
          busy={busyKey === "feedOptIn"}
          onToggle={() =>
            void updatePref("feedOptIn", !feed, setFeed, "활동 피드 노출을")
          }
          ariaLabel="활동 피드 노출 토글"
        />
        <ToggleRow
          title="전공 네트워킹 Map 노출"
          description="대학원 생활 → 네트워크 → 전공 네트워킹 Map 그래프에 내 노드가 표시됩니다. 끄면 다른 회원에게 비공개되며, 본인 화면에서는 항상 보입니다."
          enabled={network}
          busy={busyKey === "networkOptIn"}
          onToggle={() =>
            void updatePref("networkOptIn", !network, setNetwork, "전공 네트워킹 Map 노출을")
          }
          ariaLabel="전공 네트워킹 Map 노출 토글"
        />
        <ToggleRow
          title="학습 잔디 순위(leaderboard) 노출"
          description="켜면 /leaderboard 에 내 이름과 점수가 표시됩니다. 끄면 순위는 유지되지만 이름이 익명 처리됩니다."
          enabled={leaderboard}
          busy={busyKey === "leaderboard"}
          onToggle={() => void updateLeaderboardPref(!leaderboard)}
          ariaLabel="학습 잔디 순위 노출 토글"
        />
      </div>

      {/* Notif-Pref Sprint: Push 알림 5종 */}
      <div className="mt-6 border-t pt-4">
        <h4 className="text-sm font-semibold text-foreground">Push 알림 (브라우저/모바일 알림)</h4>
        <p className="mt-1 text-[11px] text-muted-foreground">
          서버 cron 이 각 일정 24시간 전 09:00 KST 에 자동 발송. 끄면 해당 종류 push 만 받지 않습니다 (이메일 별도).
        </p>
        <div className="mt-2 divide-y">
          <ToggleRow
            title="스터디 회차 D-1"
            description="내일 진행될 스터디/프로젝트 회차의 발제자/Pre-read/시간 안내."
            enabled={pushStudySession}
            busy={busyKey === "pushStudySession"}
            onToggle={() =>
              void updatePref("pushStudySession", !pushStudySession, setPushStudySession, "스터디 회차 D-1 알림을")
            }
            ariaLabel="스터디 회차 D-1 push 알림 토글"
          />
          <ToggleRow
            title="스터디 과제 마감 D-1"
            description="24시간 이내 마감인 미제출 과제 알림."
            enabled={pushStudyAssignment}
            busy={busyKey === "pushStudyAssignment"}
            onToggle={() =>
              void updatePref("pushStudyAssignment", !pushStudyAssignment, setPushStudyAssignment, "스터디 과제 마감 D-1 알림을")
            }
            ariaLabel="스터디 과제 마감 D-1 push 알림 토글"
          />
          <ToggleRow
            title="세미나 D-1"
            description="내일 진행될 세미나의 시간·장소 안내 (이메일과 별도)."
            enabled={pushSeminarReminder}
            busy={busyKey === "pushSeminarReminder"}
            onToggle={() =>
              void updatePref("pushSeminarReminder", !pushSeminarReminder, setPushSeminarReminder, "세미나 D-1 알림을")
            }
            ariaLabel="세미나 D-1 push 알림 토글"
          />
          <ToggleRow
            title="세미나 후기 요청 D+1"
            description="참석한 세미나 후기 작성 요청 (체크인 완료 + 미작성자만)."
            enabled={pushSeminarReview}
            busy={busyKey === "pushSeminarReview"}
            onToggle={() =>
              void updatePref("pushSeminarReview", !pushSeminarReview, setPushSeminarReview, "세미나 후기 요청 D+1 알림을")
            }
            ariaLabel="세미나 후기 요청 D+1 push 알림 토글"
          />
          <ToggleRow
            title="수업 일일 안내"
            description="오늘 진행될 수업의 시간·자료 사전 확인 안내."
            enabled={pushClassReminder}
            busy={busyKey === "pushClassReminder"}
            onToggle={() =>
              void updatePref("pushClassReminder", !pushClassReminder, setPushClassReminder, "수업 일일 안내를")
            }
            ariaLabel="수업 일일 안내 push 알림 토글"
          />
          <ToggleRow
            title="대외 학술대회 모집 D-1"
            description="내일 모집이 시작·마감되는 대외 학술대회 안내."
            enabled={pushExternalRecruitment}
            busy={busyKey === "pushExternalRecruitment"}
            onToggle={() =>
              void updatePref("pushExternalRecruitment", !pushExternalRecruitment, setPushExternalRecruitment, "대외 학술대회 모집 D-1 알림을")
            }
            ariaLabel="대외 학술대회 모집 D-1 push 알림 토글"
          />
          <ToggleRow
            title="소통 보드 새 답변"
            description="내가 올린 질문에 새 답변이 달릴 때 안내."
            enabled={pushCommBoard}
            busy={busyKey === "pushCommBoard"}
            onToggle={() =>
              void updatePref("pushCommBoard", !pushCommBoard, setPushCommBoard, "소통 보드 새 답변 알림을")
            }
            ariaLabel="소통 보드 새 답변 push 알림 토글"
          />
          <ToggleRow
            title="공동 연구 초대"
            description="다른 회원이 나를 공동 연구팀에 초대할 때 안내."
            enabled={pushCollabInvite}
            busy={busyKey === "pushCollabInvite"}
            onToggle={() =>
              void updatePref("pushCollabInvite", !pushCollabInvite, setPushCollabInvite, "공동 연구 초대 알림을")
            }
            ariaLabel="공동 연구 초대 push 알림 토글"
          />
          <ToggleRow
            title="공동 연구 댓글 멘션"
            description="공동 연구 챕터 댓글에서 @멘션 받을 때 안내."
            enabled={pushCollabMention}
            busy={busyKey === "pushCollabMention"}
            onToggle={() =>
              void updatePref("pushCollabMention", !pushCollabMention, setPushCollabMention, "공동 연구 댓글 멘션 알림을")
            }
            ariaLabel="공동 연구 댓글 멘션 push 알림 토글"
          />
          <ToggleRow
            title="공동 연구 마일스톤 D-1"
            description="내가 담당한 마일스톤의 목표일 하루 전 안내."
            enabled={pushCollabMilestone}
            busy={busyKey === "pushCollabMilestone"}
            onToggle={() =>
              void updatePref("pushCollabMilestone", !pushCollabMilestone, setPushCollabMilestone, "공동 연구 마일스톤 D-1 알림을")
            }
            ariaLabel="공동 연구 마일스톤 D-1 push 알림 토글"
          />
          <ToggleRow
            title="연구지 검수 알림"
            description="내 논문의 검수 요청·응답·수정 요청 안내."
            enabled={pushCollabReview}
            busy={busyKey === "pushCollabReview"}
            onToggle={() =>
              void updatePref("pushCollabReview", !pushCollabReview, setPushCollabReview, "연구지 검수 알림을")
            }
            ariaLabel="연구지 검수 push 알림 토글"
          />
          <ToggleRow
            title="연구지 신규 호수 발간"
            description="연세 교육공학 연구의 신규 호수가 발간될 때 안내."
            enabled={pushJournalIssue}
            busy={busyKey === "pushJournalIssue"}
            onToggle={() =>
              void updatePref("pushJournalIssue", !pushJournalIssue, setPushJournalIssue, "연구지 신규 호수 발간 알림을")
            }
            ariaLabel="연구지 신규 호수 발간 push 알림 토글"
          />
          <ToggleRow
            title="암기카드 복습 알림"
            description="오늘 복습할 암기카드(dueAt ≤ 오늘)가 1장 이상일 때 1일 1회 안내. 복습할 카드가 있는 회원에게만 발송되며 기본 켜짐."
            enabled={pushFlashcardReview}
            busy={busyKey === "pushFlashcardReview"}
            onToggle={() =>
              void updatePref("pushFlashcardReview", !pushFlashcardReview, setPushFlashcardReview, "암기카드 복습 알림을")
            }
            ariaLabel="암기카드 복습 알림 push 알림 토글"
          />
        </div>
      </div>
    </div>
  );
}

/** 읽기 타이머 부엉이(FloatingReadingTimer) 영구 표시 on/off — localStorage 플래그(omcReadingOwlOff, 별칭 yedu_owl_disabled) */
function ReadingOwlSettingsCard() {
  const OWL_OFF_KEY = "omcReadingOwlOff";
  const OWL_OFF_EVENT = "omc-reading-owl-changed";
  const [shown, setShown] = useState(true);

  useEffect(() => {
    setShown(localStorage.getItem(OWL_OFF_KEY) !== "true");
  }, []);

  async function toggle() {
    const next = !shown;
    setShown(next);
    if (next) {
      localStorage.removeItem(OWL_OFF_KEY);
    } else {
      localStorage.setItem(OWL_OFF_KEY, "true");
    }
    // FloatingReadingTimer 가 같은 탭에서 즉시 반영하도록 알림
    window.dispatchEvent(new Event(OWL_OFF_EVENT));
    const { toast } = await import("sonner");
    toast.success(next ? "읽기 타이머 부엉이를 다시 표시합니다 🦉" : "읽기 타이머 부엉이를 숨겼습니다. 언제든 이 설정에서 다시 켤 수 있어요.");
  }

  return (
    <div className="mt-6 rounded-2xl border bg-card p-6">
      <h3 className="flex items-center gap-2 text-base font-semibold">
        <BookOpen size={18} /> 읽기 타이머
      </h3>
      <div className="mt-2 divide-y">
        <div className="flex items-start justify-between gap-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">읽기 타이머 부엉이 표시</p>
            <p className="mt-1 text-xs text-muted-foreground">
              화면 구석을 따라다니는 학습 부엉이(읽기/쓰기 타이머)를 표시합니다. 끄면 모든 페이지에서 완전히 숨겨지며, 이 설정에서 다시 켤 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void toggle()}
            role="switch"
            aria-checked={shown}
            aria-label="읽기 타이머 부엉이 표시 토글"
            className={cn(
              "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors",
              shown ? "bg-primary" : "bg-muted",
            )}
          >
            <span
              className={cn(
                "inline-block h-5 w-5 transform rounded-full bg-card shadow transition-transform",
                shown ? "translate-x-6" : "translate-x-1",
              )}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

function SelfDeleteSection({ user, onDeleted }: { user: User; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (confirmText !== user.name) {
      const { toast } = await import("sonner");
      toast.error("이름이 일치하지 않습니다.");
      return;
    }
    setBusy(true);
    try {
      await profilesApi.delete(user.id);
      const { toast } = await import("sonner");
      toast.success("탈퇴가 완료되었습니다. 이용해 주셔서 감사합니다.");
      onDeleted();
    } catch {
      const { toast } = await import("sonner");
      toast.error("탈퇴 처리에 실패했습니다. 운영진에게 문의해주세요.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/[0.02] p-6">
        <h3 className="flex items-center gap-2 text-base font-semibold text-destructive">
          <AlertCircle size={18} /> 회원 탈퇴
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          탈퇴 시 계정 정보가 영구 삭제됩니다. 작성한 글·신청 기록은 저자 정보가 비표시 처리됩니다.
        </p>
        <Button
          variant="outline"
          className="mt-4 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setOpen(true)}
        >
          탈퇴 진행
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border-2 border-destructive bg-destructive/[0.04] p-6">
      <h3 className="flex items-center gap-2 text-base font-semibold text-destructive">
        <AlertCircle size={18} /> 회원 탈퇴 확인
      </h3>
      <p className="mt-2 text-sm text-foreground">
        정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.
      </p>
      <div className="mt-4">
        <label className="mb-1.5 block text-xs font-medium">
          확인을 위해 본인의 이름 <strong>{user.name}</strong>을(를) 입력하세요.
        </label>
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={user.name}
          className="w-full rounded-md border bg-card px-3 py-2 text-sm"
        />
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={() => { setOpen(false); setConfirmText(""); }}>취소</Button>
        <Button
          className="bg-destructive text-white hover:bg-destructive/90"
          onClick={handleDelete}
          disabled={busy || confirmText !== user.name}
        >
          {busy ? "처리 중…" : "탈퇴 확정"}
        </Button>
      </div>
    </div>
  );
}
