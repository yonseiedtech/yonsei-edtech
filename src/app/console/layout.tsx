"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import { isPresidentOrAbove, isStaffOrAbove } from "@/lib/permissions";
import { useInquiries } from "@/features/inquiry/useInquiry";
import { usePosts } from "@/features/board/useBoard";
import { profilesApi } from "@/lib/bkend";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, ClipboardList, MessageSquare, FileText, Newspaper, Award,
  BarChart3, GraduationCap, Wallet, Users, BookUser,
  BookOpen,
  Settings, MessageCircle, ScrollText, ChevronDown, ChevronRight,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
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
      label: "일일 운영",
      items: [
        { href: "/console", label: "홈", icon: LayoutDashboard },
        { href: "/console/todos", label: "To-Do", icon: ClipboardList },
        { href: "/console/inquiries", label: "문의 답변", icon: MessageSquare, badge: unansweredCount },
        { href: "/console/posts", label: "게시글", icon: FileText },
        { href: "/console/newsletter", label: "학회보", icon: Newspaper },
        { href: "/console/certificates", label: "수료증·감사장", icon: Award },
      ],
    },
    {
      label: "학술활동",
      items: [
        { href: "/console/academic/manage", label: "학술활동 관리", icon: GraduationCap },
        { href: "/console/fees", label: "학회비", icon: Wallet },
      ],
    },
    {
      label: "회원",
      items: [
        { href: "/console/members", label: "회원 DB", icon: Users, badge: pendingCount },
        { href: "/console/directory", label: "연락망", icon: BookUser },
      ],
    },
    {
      label: "인수인계",
      presidentOnly: true,
      items: [
        { href: "/console/handover", label: "인수인계", icon: BookOpen },
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
        { href: "/console/ai", label: "챗봇·AI / 에이전트", icon: MessageCircle },
        { href: "/console/audit-log", label: "감사로그", icon: ScrollText },
      ],
    },
  ];

  const visibleGroups = NAV_GROUPS.filter((g) => !g.presidentOnly || isPresident);

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
            {visibleGroups.flatMap((g) =>
              g.items.map((item) => {
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
              }),
            )}
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
    <AuthGuard allowedRoles={["staff", "president", "admin"]}>
      <ConsoleShell>{children}</ConsoleShell>
    </AuthGuard>
  );
}
