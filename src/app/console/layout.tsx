"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import { isPresidentOrAbove, isAdminOrSysadmin } from "@/lib/permissions";
import { useInquiries } from "@/features/inquiry/useInquiry";
import {
  profilesApi,
  userFeedbackApi,
  researchMethodsApi,
  statisticalMethodsApi,
  foundationTermsApi,
  writingTipsApi,
} from "@/lib/bkend";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, ClipboardList, MessageSquare, FileText, Newspaper,
  BarChart3, GraduationCap, Wallet, Users, BookUser,
  BookOpen, FlaskConical, FolderKanban, Globe, Award, NotebookPen,
  BarChart3 as BarChart3Icon, PenLine,
  Settings, MessageCircle, ScrollText, ChevronDown, ChevronRight,
  ShieldCheck, Megaphone, CalendarDays, MessageSquareQuote, Images, ClipboardCheck, Workflow, LayoutGrid,
  UserPlus, ListChecks, AlertTriangle, Archive, Map, Bot, Sparkles, Trophy,
  PackageSearch, Network, Gift, BookMarked,
} from "lucide-react";
import { fetchPendingDrafts } from "@/features/content-draft/content-draft-store";
import { useState } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  adminOnly?: boolean;
}

interface NavSubsection {
  label: string;
  items: NavItem[];
  /** true = 파선 border + muted 배경의 접기 영역(기본 접힘). undefined/false = 라벨 구분 헤더(항상 펼침) */
  collapsed?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  subsections?: NavSubsection[];
  presidentOnly?: boolean;
}

interface ReviewItem {
  label: string;
  count: number;
  href: string;
}

/** 서브섹션/그룹에서 공통으로 쓰는 링크 항목 렌더 */
function NavItemLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = pathname === item.href || (item.href !== "/console" && pathname.startsWith(item.href));
  return (
    <li>
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
          isActive
            ? "bg-primary/10 font-semibold text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <item.icon size={15} className="shrink-0" />
        <span className="flex-1">{item.label}</span>
        {item.badge != null && item.badge > 0 && (
          <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-white">
            {item.badge}
          </span>
        )}
      </Link>
    </li>
  );
}

/** 그룹 내 서브섹션 — 접기 영역(collapsed) 또는 라벨 구분 헤더 */
function SidebarSubsection({ subsection, pathname }: { subsection: NavSubsection; pathname: string }) {
  const collapsible = subsection.collapsed === true;
  const isAnyActive = (subsection.items ?? []).some(
    (item) => item.href !== "/console" && pathname.startsWith(item.href),
  );
  const [open, setOpen] = useState(collapsible ? isAnyActive : true);

  if (!subsection.items || subsection.items.length === 0) return null;

  // 라벨 구분 헤더(접힘 없음)
  if (!collapsible) {
    return (
      <div className="mt-1.5">
        <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
          {subsection.label}
        </div>
        <ul className="space-y-0.5">
          {subsection.items.map((item) => (
            <NavItemLink key={item.href} item={item} pathname={pathname} />
          ))}
        </ul>
      </div>
    );
  }

  // 접기 영역(파선 border + muted 배경)
  return (
    <div className="mt-1.5 rounded-lg border border-dashed bg-muted/30 px-1 py-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground"
      >
        {subsection.label}
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
      </button>
      {open && (
        <ul className="mt-0.5 space-y-0.5">
          {subsection.items.map((item) => (
            <NavItemLink key={item.href} item={item} pathname={pathname} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SidebarGroup({
  group,
  pathname,
}: {
  group: NavGroup;
  pathname: string;
}) {
  const allItems = [...group.items, ...(group.subsections ?? []).flatMap((s) => s.items ?? [])];
  const isAnyActive = allItems.some((item) => pathname.startsWith(item.href));
  const [open, setOpen] = useState(isAnyActive);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 hover:text-muted-foreground"
      >
        {group.label}
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {open && (
        <div className="mt-0.5">
          {group.items.length > 0 && (
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <NavItemLink key={item.href} item={item} pathname={pathname} />
              ))}
            </ul>
          )}
          {group.subsections?.map((sub) => (
            <SidebarSubsection key={sub.label} subsection={sub} pathname={pathname} />
          ))}
        </div>
      )}
    </div>
  );
}

/** 사이드바 상단 통합 검수 대기 배너 */
function ReviewQueueBanner({ items }: { items: ReviewItem[] }) {
  const total = items.reduce((s, i) => s + i.count, 0);
  const [open, setOpen] = useState(false);

  if (total === 0) return null;

  return (
    <div className="rounded-lg border border-warning/30 bg-warning/5 text-warning">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold"
      >
        <AlertTriangle size={13} className="shrink-0 text-warning" />
        <span className="flex-1 text-left">검수 대기 {total}건</span>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {open && (
        <ul className="border-t border-warning/20 px-2 py-1 space-y-0.5">
          {items
            .filter((i) => i.count > 0)
            .map((i) => (
              <li key={i.href}>
                <Link
                  href={i.href}
                  className="flex items-center justify-between rounded px-2 py-1 text-xs hover:bg-warning/5"
                >
                  <span>{i.label}</span>
                  <span className="rounded-full bg-warning px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {i.count}
                  </span>
                </Link>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

function ConsoleShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const isPresident = isPresidentOrAbove(user);
  const isAdmin = isAdminOrSysadmin(user);
  const { inquiries } = useInquiries();
  const unansweredCount = inquiries.filter((i) => i.status === "pending").length;

  // 회원 승인 대기
  const { data: pendingData } = useQuery({
    queryKey: ["admin", "pending"],
    queryFn: () => profilesApi.list({ "filter[approved]": "false", limit: 0 }),
    retry: false,
  });
  const pendingCount = pendingData?.total ?? 0;

  // 피드백 new 카운트
  const { data: feedbackData } = useQuery({
    queryKey: ["admin", "feedback-new"],
    queryFn: () => userFeedbackApi.list(),
    retry: false,
    enabled: isAdmin,
  });
  const feedbackNewCount = (feedbackData?.data ?? []).filter(
    (f) => !f.status || f.status === "new",
  ).length;

  // 아카이브 검수 대기 — published=false 합계 (4 컬렉션)
  const { data: rmData } = useQuery({
    queryKey: ["admin", "archive-rm-draft"],
    queryFn: () => researchMethodsApi.list(),
    retry: false,
    enabled: isAdmin,
  });
  const { data: smData } = useQuery({
    queryKey: ["admin", "archive-sm-draft"],
    queryFn: () => statisticalMethodsApi.list(),
    retry: false,
    enabled: isAdmin,
  });
  const { data: ftData } = useQuery({
    queryKey: ["admin", "archive-ft-draft"],
    queryFn: () => foundationTermsApi.list(),
    retry: false,
    enabled: isAdmin,
  });
  const { data: wtData } = useQuery({
    queryKey: ["admin", "archive-wt-draft"],
    queryFn: () => writingTipsApi.list(),
    retry: false,
    enabled: isAdmin,
  });
  // v5-H2 후속(2026-07-19): 보류(held)는 "검수 대기"가 아니므로 배지에서 제외 —
  // 보류분은 통합 검수 큐의 보류 탭에서 별도 관리된다. (published=false 전체를 세면
  // 전부 보류 처리한 뒤에도 배지가 남아 "볼 게 없는데 N건" 불일치가 생긴다.)
  const isPendingReview = (i: { published?: boolean; reviewStatus?: string }) =>
    !i.published && i.reviewStatus !== "held";
  const archiveDraftCount =
    (rmData?.data ?? []).filter(isPendingReview).length +
    (smData?.data ?? []).filter(isPendingReview).length +
    (ftData?.data ?? []).filter(isPendingReview).length +
    (wtData?.data ?? []).filter(isPendingReview).length;

  // 콘텐츠 자동 초안 검토 대기 (content_drafts status=pending)
  const { data: contentDraftData } = useQuery({
    queryKey: ["admin", "content-drafts-pending"],
    queryFn: fetchPendingDrafts,
    retry: false,
  });
  const contentDraftCount = contentDraftData?.length ?? 0;

  const reviewItems: ReviewItem[] = [
    { label: "회원 승인 대기", count: pendingCount, href: "/console/members" },
    { label: "미답변 문의", count: unansweredCount, href: "/console/inquiries" },
    { label: "피드백 미확인", count: feedbackNewCount, href: "/console/feedback" },
    { label: "아카이브 미검수", count: archiveDraftCount, href: "/console/archive/review-queue" },
    { label: "콘텐츠 초안 대기", count: contentDraftCount, href: "/console/content-drafts" },
  ];

  const NAV_GROUPS: NavGroup[] = [
    // ── 1. 홈 ────────────────────────────────────────────────────
    {
      label: "홈",
      items: [
        { href: "/console", label: "홈", icon: LayoutDashboard },
        { href: "/console/handover", label: "업무노트", icon: ClipboardList },
        // 인사이트: (구)모니터링 → 홈으로 이동(운영 대시보드 성격, 발견성↑)
        { href: "/console/insights", label: "인사이트", icon: BarChart3 },
      ],
    },
    // ── 2. 회원 ──────────────────────────────────────────────────
    {
      label: "회원",
      items: [
        { href: "/console/members", label: "회원관리", icon: Users, badge: pendingCount, adminOnly: true },
        { href: "/console/inquiries", label: "문의 답변", icon: MessageSquare, badge: unansweredCount },
        { href: "/console/feedback", label: "피드백", icon: MessageCircle, badge: feedbackNewCount },
        { href: "/console/potential-members", label: "잠재회원", icon: UserPlus },
        { href: "/console/directory", label: "연락망", icon: BookUser },
        // (구)온보딩 그룹 해체 → 체크리스트를 회원으로 병합
        { href: "/console/onboarding-checklist", label: "신규 회원 체크리스트", icon: ListChecks },
        { href: "/console/org", label: "운영진 설정", icon: Network },
      ],
      subsections: [
        {
          label: "관리 도구",
          collapsed: true,
          items: [
            { href: "/console/members/audit", label: "회원 검증", icon: ShieldCheck },
            { href: "/console/portfolio-verification", label: "포트폴리오 검증", icon: Award },
            { href: "/console/alumni-mapping", label: "졸업논문 매핑", icon: GraduationCap },
            { href: "/console/applicant-link-by-studentid", label: "신청자 학번 연동", icon: GraduationCap, adminOnly: true },
            { href: "/console/members/migrate-teacher-affiliation", label: "교사 소속 분리", icon: GraduationCap, adminOnly: true },
          ],
        },
      ],
    },
    // ── 3. 학술 활동 ─────────────────────────────────────────────
    {
      label: "학술 활동",
      items: [
        { href: "/console/academic/manage", label: "활동 총괄", icon: GraduationCap },
        { href: "/console/academic/seminars", label: "세미나", icon: BookOpen },
        { href: "/console/academic/projects", label: "프로젝트", icon: FolderKanban },
        { href: "/console/academic/studies", label: "스터디", icon: NotebookPen },
        { href: "/console/academic/external", label: "대외 학술대회", icon: Globe },
        { href: "/console/networking", label: "모임·네트워킹", icon: Users },
        { href: "/console/hackathon", label: "해커톤 운영", icon: Trophy },
        { href: "/console/demand", label: "수요 조사 집계", icon: ClipboardCheck },
        { href: "/console/academic/applications", label: "활동 신청 승인", icon: ClipboardCheck, adminOnly: true },
      ],
    },
    // ── 4. 학사 ──────────────────────────────────────────────────
    {
      label: "학사",
      items: [
        { href: "/console/courses", label: "수강과목 마스터", icon: BookOpen },
        { href: "/console/graduation", label: "졸업요건", icon: GraduationCap },
        { href: "/console/research", label: "연구활동", icon: FlaskConical },
        { href: "/console/fees", label: "학회비", icon: Wallet },
        { href: "/console/academic/certificates", label: "발급 문서", icon: Award },
        { href: "/console/steppingstone", label: "인지디딤판", icon: ClipboardList },
        { href: "/console/roadmap", label: "학기별 로드맵", icon: Map },
        { href: "/console/grad-life/thesis-defense", label: "논문 심사 연습", icon: MessageSquareQuote },
      ],
      subsections: [
        {
          label: "관리 도구",
          collapsed: true,
          items: [
            { href: "/console/grad-life/thesis-defense-templates", label: "심사 질문 템플릿", icon: ClipboardList, adminOnly: true },
            { href: "/console/grad-life/positions", label: "활동 이력", icon: GraduationCap },
          ],
        },
      ],
    },
    // ── 5. 콘텐츠·아카이브 ───────────────────────────────────────
    {
      label: "콘텐츠·아카이브",
      items: [],
      subsections: [
        {
          label: "콘텐츠",
          items: [
            { href: "/console/posts", label: "게시글", icon: FileText },
            { href: "/console/newsletter", label: "학회보", icon: Newspaper },
            { href: "/console/journal", label: "학회지 운영", icon: BookOpen },
            { href: "/console/card-news", label: "카드뉴스", icon: Images },
            { href: "/console/celebration-card", label: "축하카드", icon: Gift },
            { href: "/console/content-drafts", label: "콘텐츠 초안함", icon: Sparkles, badge: contentDraftCount },
            { href: "/console/learning-guides", label: "러닝 가이드", icon: BookMarked },
            { href: "/console/popups", label: "팝업 공지", icon: Megaphone },
          ],
        },
        {
          label: "아카이브",
          items: [
            { href: "/console/archive", label: "아카이브 홈", icon: Archive },
            { href: "/console/archive/research-methods", label: "연구방법 가이드", icon: FlaskConical },
            { href: "/console/archive/statistical-methods", label: "통계방법 가이드", icon: BarChart3Icon },
            { href: "/console/archive/foundation-terms", label: "기초 용어 가이드", icon: BookOpen },
            { href: "/console/archive/writing-tips", label: "학술 글쓰기 가이드", icon: PenLine },
            { href: "/console/archive/concepts", label: "핵심 개념", icon: Archive },
            { href: "/console/archive/variables", label: "연구 변인", icon: Archive },
            { href: "/console/archive/measurements", label: "측정 도구", icon: Archive },
          ],
        },
        {
          label: "콘텐츠 갭",
          collapsed: true,
          items: [
            { href: "/console/archive/content-gaps", label: "콘텐츠 갭", icon: PackageSearch },
          ],
        },
      ],
    },
    // ── 6. AI & 자동화 ───────────────────────────────────────────
    {
      label: "AI & 자동화",
      items: [
        { href: "/console/ai-forum", label: "AI 포럼 운영", icon: Bot },
        { href: "/console/ai", label: "챗봇 설정", icon: MessageCircle },
        { href: "/console/agents", label: "AI 에이전트 관리", icon: ShieldCheck },
        { href: "/console/agent-workflows", label: "에이전트 워크플로우", icon: Workflow },
        { href: "/console/agent-board", label: "에이전트 작업 보드", icon: LayoutGrid },
      ],
    },
    // ── 7. 시스템 ────────────────────────────────────────────────
    {
      label: "시스템",
      presidentOnly: true,
      items: [
        { href: "/console/settings", label: "사이트 설정", icon: Settings },
        { href: "/console/academic-calendar", label: "학사일정", icon: CalendarDays },
        { href: "/console/audit-log", label: "감사로그", icon: ScrollText },
        { href: "/console/cron-logs", label: "Cron 이력", icon: ScrollText, adminOnly: true },
        { href: "/console/labs", label: "실험실", icon: FlaskConical },
      ],
    },
  ];

  const visibleGroups = NAV_GROUPS
    .filter((g) => !g.presidentOnly || isPresident)
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => !i.adminOnly || isAdmin),
      subsections: g.subsections
        ?.map((s) => ({ ...s, items: s.items.filter((i) => !i.adminOnly || isAdmin) }))
        .filter((s) => s.items.length > 0),
    }))
    .filter((g) => g.items.length > 0 || (g.subsections?.length ?? 0) > 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav className="sticky top-24 space-y-4">
            <ReviewQueueBanner items={reviewItems} />
            {visibleGroups.map((group) => (
              <SidebarGroup key={group.label} group={group} pathname={pathname} />
            ))}
          </nav>
        </aside>

        {/* Mobile tab bar */}
        <div className="w-full lg:hidden">
          <div className="mb-6 flex flex-wrap gap-0 overflow-x-auto border-b">
            {visibleGroups.flatMap((g, gi) => {
              const flatItems = [...g.items, ...(g.subsections ?? []).flatMap((s) => s.items)];
              const items = flatItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/console" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex shrink-0 items-center gap-1 border-b-2 px-3 py-2 text-xs font-medium transition-colors",
                      isActive
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <item.icon size={13} />
                    {item.label}
                    {item.badge != null && item.badge > 0 && (
                      <span className="rounded-full bg-destructive px-1 text-[9px] font-bold text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              });
              if (gi < visibleGroups.length - 1) {
                items.push(
                  <span key={`sep-${gi}`} className="mx-1 self-center text-muted-foreground/30">|</span>
                );
              }
              return items;
            })}
          </div>
          <main>{children}</main>
        </div>

        {/* Main content (desktop) */}
        <main className="hidden min-w-0 flex-1 lg:block">{children}</main>
      </div>
    </div>
  );
}

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["staff", "president", "admin", "sysadmin"]}>
      <ConsoleShell>{children}</ConsoleShell>
    </AuthGuard>
  );
}
