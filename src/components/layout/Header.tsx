"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, User, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import type { UserRole } from "@/types";

interface NavItem {
  href: string;
  label: string;
  /** 이 역할 이상만 노출. 생략하면 모두에게 노출 */
  minRole?: UserRole;
}

const PUBLIC_NAV: NavItem[] = [
  { href: "/", label: "홈" },
  { href: "/about", label: "소개" },
  { href: "/activities", label: "활동" },
  { href: "/newsletter", label: "학회보" },
  { href: "/notices", label: "공지" },
  { href: "/contact", label: "문의" },
];

const MEMBER_NAV: NavItem[] = [
  { href: "/dashboard", label: "대시보드", minRole: "member" },
  { href: "/board", label: "게시판", minRole: "member" },
  { href: "/seminars", label: "세미나", minRole: "member" },
  { href: "/members", label: "멤버", minRole: "member" },
  { href: "/directory", label: "연락망", minRole: "member" },
];

export default function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuthStore();

  const visibleMemberNav = MEMBER_NAV.filter(
    (item) => !item.minRole || isAtLeast(user, item.minRole)
  );

  const allVisibleItems = [...PUBLIC_NAV, ...visibleMemberNav];

  const showAdminLink = isAtLeast(user, "staff");

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/yonsei-emblem.svg"
            alt="연세대학교 엠블럼"
            width={32}
            height={32}
            className="h-8 w-8"
          />
          <Image
            src="/logo-text.png"
            alt="연세교육공학회"
            width={200}
            height={40}
            className="h-8 w-auto"
            priority
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {PUBLIC_NAV.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted",
                  isActive
                    ? "font-semibold text-primary underline underline-offset-4"
                    : "text-muted-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
          {visibleMemberNav.length > 0 && (
            <>
              <Separator orientation="vertical" className="mx-1 h-5" />
              {visibleMemberNav.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted",
                      isActive
                        ? "font-semibold text-primary underline underline-offset-4"
                        : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Auth Area (Desktop) */}
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              {showAdminLink && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                >
                  <Shield size={14} />
                  관리자
                </Link>
              )}
              <Link
                href="/mypage"
                className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
              >
                <User size={16} />
                {user.name}
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              로그인
            </Link>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="메뉴 열기"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="border-t bg-white px-4 pb-4 md:hidden">
          <nav className="flex flex-col gap-1 pt-2">
            {allVisibleItems.map((item) => {
              const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 font-semibold text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            {user ? (
              <>
                {showAdminLink && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                  >
                    관리자
                  </Link>
                )}
                <Link
                  href="/mypage"
                  onClick={() => setMobileOpen(false)}
                  className="mt-2 rounded-xl bg-primary/10 px-4 py-2 text-center text-sm font-medium text-primary"
                >
                  {user.name} · 마이페이지
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="mt-2 rounded-xl bg-primary px-4 py-2 text-center text-sm font-medium text-white"
              >
                로그인
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
