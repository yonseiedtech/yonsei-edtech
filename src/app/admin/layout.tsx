"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import { isPresidentOrAbove } from "@/lib/permissions";
import { useInquiries } from "@/features/inquiry/useInquiry";
import { usePosts } from "@/features/board/useBoard";
import { profilesApi } from "@/lib/bkend";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  Shield, Users, FileText, MessageSquare, MessageCircle,
  Clock, HelpCircle, Newspaper, Settings, Bot, Award, Wallet, BarChart3, RefreshCw,
  ClipboardList, ScrollText, LayoutDashboard,
} from "lucide-react";

const ADMIN_TABS = [
  { href: "/admin/members", label: "회원", icon: Users },
  { href: "/admin/fees", label: "학회비", icon: Wallet },
  { href: "/admin/posts", label: "게시글", icon: FileText },
  { href: "/admin/inquiries", label: "문의", icon: MessageSquare },
  { href: "/admin/chatbot", label: "챗봇 관리", icon: MessageCircle },
  { href: "/admin/newsletter", label: "학회보", icon: Newspaper },
  { href: "/admin/certificates", label: "수료증/감사장", icon: Award },
  { href: "/admin/todos", label: "To-Do", icon: ClipboardList },
  { href: "/admin/activity-dashboard", label: "학술활동", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "분석", icon: BarChart3 },
  { href: "/admin/semester-report", label: "학기보고서", icon: BarChart3 },
  { href: "/admin/audit-log", label: "감사로그", icon: ScrollText, presidentOnly: true },
  { href: "/admin/transition", label: "운영진", icon: RefreshCw, presidentOnly: true },
  { href: "/admin/agents", label: "에이전트", icon: Bot },
  { href: "/admin/settings", label: "사이트 설정", icon: Settings, presidentOnly: true },
];

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const isPresident = isPresidentOrAbove(user);
  const { inquiries } = useInquiries();
  const { posts } = usePosts("all");
  const unansweredCount = inquiries.filter((i) => i.status === "pending").length;

  const { data: membersData } = useQuery({
    queryKey: ["admin", "members"],
    queryFn: () => profilesApi.list({ limit: 0 }),
    retry: false,
  });
  const { data: pendingData } = useQuery({
    queryKey: ["admin", "pending"],
    queryFn: () => profilesApi.list({ "filter[approved]": "false", limit: 0 }),
    retry: false,
  });

  const visibleTabs = ADMIN_TABS.filter(
    (tab) => !tab.presidentOnly || isPresident,
  );

  return (
    <div className="py-16">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex items-center gap-3">
          <Shield size={28} className="text-primary" />
          <h1 className="text-3xl font-bold">관리자</h1>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard icon={Users} label="전체 회원" value={membersData?.total ?? 0} color="bg-blue-50 text-blue-600" />
          <StatCard icon={Clock} label="승인 대기" value={pendingData?.total ?? 0} color="bg-amber-50 text-amber-600" />
          <StatCard icon={FileText} label="게시글" value={posts.length} color="bg-green-50 text-green-600" />
          <StatCard icon={HelpCircle} label="미답변 문의" value={unansweredCount} color="bg-red-50 text-red-600" />
        </div>

        <nav className="mt-8 flex flex-wrap gap-0 border-b sm:overflow-x-auto">
          {visibleTabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex flex-none items-center gap-1 border-b-2 px-2.5 py-2 text-xs font-medium transition-colors sm:gap-1.5 sm:px-4 sm:py-2.5 sm:text-sm",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <tab.icon size={16} />
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="pt-6">{children}</div>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["staff", "president", "admin"]}>
      <AdminShell>{children}</AdminShell>
    </AuthGuard>
  );
}
