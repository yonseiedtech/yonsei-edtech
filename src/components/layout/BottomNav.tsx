"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, BookOpen, MessagesSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/auth-store";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  /** 활성 매칭에 쓸 프리픽스(없으면 href 자체) */
  matchPrefixes?: string[];
}

const ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "홈",
    icon: Home,
    matchPrefixes: ["/dashboard", "/"],
  },
  {
    href: "/seminars",
    label: "세미나",
    icon: CalendarDays,
    matchPrefixes: ["/seminars", "/calendar"],
  },
  {
    href: "/activities",
    label: "학술활동",
    icon: BookOpen,
    matchPrefixes: ["/activities", "/research", "/courses"],
  },
  {
    href: "/board/free",
    label: "커뮤니티",
    icon: MessagesSquare,
    matchPrefixes: ["/board", "/notices"],
  },
  {
    href: "/mypage",
    label: "마이",
    icon: User,
    matchPrefixes: ["/mypage", "/profile"],
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  const prefixes = item.matchPrefixes ?? [item.href];
  // 정확 일치 우선, 그 다음 prefix 매칭 (단, "/"는 정확 일치만)
  return prefixes.some((p) =>
    p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(`${p}/`),
  );
}

export default function BottomNav() {
  const pathname = usePathname() ?? "";
  const { user } = useAuthStore();

  // 비로그인 상태에서는 숨김 (랜딩에 방해)
  if (!user) return null;

  // 콘솔/관리자 페이지에서는 숨김 (자체 사이드바가 있음)
  if (pathname.startsWith("/console") || pathname.startsWith("/admin") || pathname.startsWith("/academic-admin") || pathname.startsWith("/staff-admin")) {
    return null;
  }

  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white/95 backdrop-blur shadow-[0_-2px_8px_rgba(0,0,0,0.04)] supports-[backdrop-filter]:bg-white/80 sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex items-stretch justify-around">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[52px] flex-col items-center justify-center gap-0.5 px-2 py-1.5 text-[11px] font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon size={20} className={cn(active && "scale-110 transition-transform")} />
                <span className="leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
