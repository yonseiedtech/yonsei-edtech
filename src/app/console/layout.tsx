"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import { isPresidentOrAbove, isAdminOrSysadmin } from "@/lib/permissions";
import { useInquiries } from "@/features/inquiry/useInquiry";
import { usePosts } from "@/features/board/useBoard";
import { profilesApi } from "@/lib/bkend";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, ClipboardList, MessageSquare, FileText, Newspaper,
  BarChart3, GraduationCap, Wallet, Users, BookUser,
  BookOpen, FlaskConical, FolderKanban, Globe, Award, NotebookPen,
  Settings, MessageCircle, ScrollText, ChevronDown, ChevronRight,
  ShieldCheck, Megaphone, CalendarDays, MessageSquareQuote, Images, ClipboardCheck, Workflow, LayoutGrid,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  adminOnly?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  presidentOnly?: boolean;
}

function SidebarGroup({
  group,
  pathname,
}: {
  group: NavGroup;
  pathname: string;
}) {
  const isAnyActive = group.items.some((item) => pathname.startsWith(item.href));
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
        <ul className="mt-0.5 space-y-0.5">
          {group.items.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/console" && pathname.startsWith(item.href));
            return (
              <li key={item.href}>
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
                    <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
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
  const { posts } = usePosts("all");
  const unansweredCount = inquiries.filter((i) => i.status === "pending").length;

  const { data: pendingData } = useQuery({
    queryKey: ["admin", "pending"],
    queryFn: () => profilesApi.list({ "filter[approved]": "false", limit: 0 }),
    retry: false,
  });

  const pendingCount = pendingData?.total ?? 0;

  const NAV_GROUPS: NavGroup[] = [
    {
      label: "홈",
      items: [
        { href: "/console", label: "홈", icon: LayoutDashboard },
      ],
    },
    {
      label: "업무노트",
      presidentOnly: true,
      items: [
        { href: "/console/handover", label: "업무노트", icon: ClipboardList },
      ],
    },
    {
      label: "학술활동",
      items: [
        { href: "/console/academic/manage", label: "대시보드", icon: GraduationCap },
        { href: "/console/academic/seminars", label: "세미나", icon: BookOpen },
        { href: "/console/academic/projects", label: "프로젝트", icon: FolderKanban },
        { href: "/console/academic/studies", label: "스터디", icon: NotebookPen },
        { href: "/console/academic/external", label: "대외 학술대회", icon: Globe },
        { href: "/console/academic/applications", label: "신청 승인 대시보드", icon: ClipboardCheck, adminOnly: true },
        { href: "/console/courses", label: "수강과목 마스터", icon: BookOpen },
        { href: "/console/steppingstone", label: "인지디딤판", icon: ClipboardList },
      ],
    },
    {
      label: "연구",
      items: [
        { href: "/console/research", label: "연구활동", icon: FlaskConical },
      ],
    },
    {
      label: "대학원 생활",
      items: [
        { href: "/console/grad-life/positions", label: "활동 이력 (전공대표·조교·학회)", icon: GraduationCap },
        { href: "/console/grad-life/thesis-defense", label: "논문 심사 연습", icon: MessageSquareQuote },
        { href: "/console/grad-life/thesis-defense-templates", label: "심사 질문 템플릿", icon: ClipboardList, adminOnly: true },
      ],
    },
    {
      label: "회원",
      items: [
        { href: "/console/members", label: "회원관리", icon: Users, badge: pendingCount, adminOnly: true },
        { href: "/console/directory", label: "연락망", icon: BookUser },
        { href: "/console/members/audit", label: "회원 검증", icon: ShieldCheck },
        { href: "/console/members/migrate-teacher-affiliation", label: "교사 affiliation 분리", icon: GraduationCap, adminOnly: true },
        { href: "/console/applicant-link-by-studentid", label: "신청자 학번 연동", icon: GraduationCap, adminOnly: true },
        { href: "/console/portfolio-verification", label: "포트폴리오 검증", icon: Award },
        { href: "/console/alumni-mapping", label: "졸업논문 매핑", icon: GraduationCap },
      ],
    },
    {
      label: "커뮤니티 관리",
      items: [
        { href: "/console/posts", label: "게시글", icon: FileText },
        { href: "/console/newsletter", label: "학회보", icon: Newspaper },
        { href: "/console/card-news", label: "카드뉴스", icon: Images },
      ],
    },
    {
      label: "학회비",
      items: [
        { href: "/console/fees", label: "학회비", icon: Wallet },
      ],
    },
    {
      label: "발급 문서",
      items: [
        { href: "/console/academic/certificates", label: "발급 문서", icon: Award },
      ],
    },
    {
      label: "인사이트",
      items: [
        { href: "/console/insights", label: "인사이트", icon: BarChart3 },
      ],
    },
    {
      label: "시스템",
      presidentOnly: true,
      items: [
        { href: "/console/settings", label: "사이트 설정", icon: Settings },
        { href: "/console/academic-calendar", label: "학사일정", icon: CalendarDays },
        { href: "/console/popups", label: "팝업 공지", icon: Megaphone },
        { href: "/console/ai", label: "챗봇 설정", icon: MessageCircle },
        { href: "/console/agents", label: "AI 에이전트 관리", icon: ShieldCheck },
        { href: "/console/agent-workflows", label: "에이전트 워크플로우", icon: Workflow },
        { href: "/console/agent-board", label: "에이전트 작업 보드", icon: LayoutGrid },
        { href: "/console/audit-log", label: "감사로그", icon: ScrollText },
        { href: "/console/labs", label: "실험실", icon: FlaskConical },
        { href: "/console/inquiries", label: "문의 답변", icon: MessageSquare, badge: unansweredCount },
      ],
    },
  ];

  const visibleGroups = NAV_GROUPS
    .filter((g) => !g.presidentOnly || isPresident)
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.adminOnly || isAdmin) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16">
      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className="hidden w-52 shrink-0 lg:block">
          <nav className="sticky top-24 space-y-4">
            {visibleGroups.map((group) => (
              <SidebarGroup key={group.label} group={group} pathname={pathname} />
            ))}
          </nav>
        </aside>

        {/* Mobile tab bar */}
        <div className="w-full lg:hidden">
          <div className="mb-6 flex flex-wrap gap-0 overflow-x-auto border-b">
            {visibleGroups.flatMap((g, gi) => {
              const items = g.items.map((item) => {
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
                      <span className="rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
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
