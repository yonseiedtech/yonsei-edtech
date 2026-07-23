"use client";

import Link from "next/link";
import {
  Users, ClipboardList, BarChart3, ShieldCheck, BookOpen,
  MessageSquare, Archive, Network, CalendarDays, ClipboardCheck,
  ExternalLink,
} from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAdminOrSysadmin } from "@/lib/permissions";

interface ConsoleLink {
  href: string;
  label: string;
  description: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const CONSOLE_LINKS: ConsoleLink[] = [
  {
    href: "/console/handover",
    label: "업무노트",
    description: "인수인계·운영 메모",
    icon: ClipboardList,
  },
  {
    href: "/console/members",
    label: "회원관리",
    description: "가입 승인·회원 목록",
    icon: Users,
    adminOnly: true,
  },
  {
    href: "/console/directory",
    label: "연락망",
    description: "운영진·회원 연락처",
    icon: Network,
  },
  {
    href: "/console/insights",
    label: "인사이트",
    description: "방문·활동 분석",
    icon: BarChart3,
  },
  {
    href: "/console/archive/review-queue",
    label: "검수 큐",
    description: "아카이브 미검수 목록",
    icon: ShieldCheck,
  },
  {
    href: "/console/academic/seminars",
    label: "세미나 관리",
    description: "세미나 일정·자료",
    icon: BookOpen,
  },
  {
    href: "/console/inquiries",
    label: "문의 답변",
    description: "미답변 문의 처리",
    icon: MessageSquare,
  },
  {
    href: "/console/archive",
    label: "아카이브",
    description: "교육공학 아카이브 관리",
    icon: Archive,
  },
  {
    href: "/console/academic-calendar",
    label: "학사일정",
    description: "학기별 일정 관리",
    icon: CalendarDays,
  },
  {
    href: "/console/academic/applications",
    label: "신청 승인",
    description: "활동 신청 승인 대시보드",
    icon: ClipboardCheck,
    adminOnly: true,
  },
  {
    href: "/console/org",
    label: "운영진 설정",
    description: "학기별 조직도·구성원",
    icon: Network,
  },
];

export default function StaffConsoleTab() {
  const { user } = useAuthStore();
  const isAdmin = isAdminOrSysadmin(user);
  const visibleLinks = CONSOLE_LINKS.filter((l) => !l.adminOnly || isAdmin);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">콘솔 바로가기</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          운영 콘솔의 주요 기능에 빠르게 접근합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {visibleLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/30 group"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/15">
                <Icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm leading-none">{link.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{link.description}</p>
              </div>
              <ExternalLink size={13} className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          );
        })}
      </div>

      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs font-semibold text-muted-foreground mb-2">전체 콘솔</p>
        <Link
          href="/console"
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ExternalLink size={14} />
          운영 콘솔 홈 열기
        </Link>
      </div>
    </div>
  );
}
