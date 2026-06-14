"use client";

/**
 * QuickLinks — 대시보드 빠른 바로가기 한 줄 (사이클 113b, 사용자 요청)
 * 자주 가는 곳을 아이콘 한 줄로. 2단 그리드 아래 별도 영역.
 */

import Link from "next/link";
import { FlaskConical, CalendarRange, Award, BookOpen, FileText } from "lucide-react";

const LINKS: { href: string; label: string; icon: typeof FlaskConical }[] = [
  { href: "/mypage/research", label: "내 연구", icon: FlaskConical },
  { href: "/mypage/activities", label: "학술 활동", icon: CalendarRange },
  { href: "/mypage/activities?tab=certificates", label: "수료증", icon: Award },
  { href: "/seminars", label: "세미나", icon: BookOpen },
  { href: "/archive/paper-guide", label: "논문 가이드", icon: FileText },
];

export default function QuickLinks() {
  return (
    <nav
      aria-label="빠른 바로가기"
      className="grid grid-cols-3 gap-2 sm:grid-cols-5"
    >
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="flex flex-col items-center gap-1.5 rounded-2xl border bg-card py-3 text-[11px] font-medium text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-primary"
        >
          <l.icon size={18} className="text-primary/80" />
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
