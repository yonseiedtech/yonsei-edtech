"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Menu, X, User, Shield, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";

interface NavLink {
  href: string;
  label: string;
}

interface NavGroup {
  label: string;
  items: NavLink[];
}

const PUBLIC_NAV: NavGroup[] = [
  {
    label: "학회소개",
    items: [
      { href: "/about/greeting", label: "인사말" },
      { href: "/about", label: "소개" },
      { href: "/about/history", label: "연혁" },
      { href: "/members", label: "구성원" },
    ],
  },
  {
    label: "학술활동",
    items: [
      { href: "/seminars", label: "세미나" },
      { href: "/activities", label: "활동소개" },
    ],
  },
  {
    label: "커뮤니티",
    items: [
      { href: "/board", label: "게시판" },
      { href: "/newsletter", label: "학회보" },
    ],
  },
  {
    label: "소식",
    items: [{ href: "/notices", label: "공지사항" }],
  },
  {
    label: "문의",
    items: [{ href: "/contact", label: "문의하기" }],
  },
];

const MEMBER_NAV: NavLink[] = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/directory", label: "연락망" },
  { href: "/mypage", label: "마이페이지" },
];

/** Exact match for `/about`, prefix match for others */
function isItemActive(pathname: string, href: string): boolean {
  if (href === "/about") return pathname === "/about";
  return pathname.startsWith(href);
}

/* ── Dropdown (desktop) ── */
function NavDropdown({ group }: { group: NavGroup }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const isSingle = group.items.length === 1;
  const isGroupActive = group.items.some((item) => isItemActive(pathname, item.href));

  useEffect(() => {
    return () => clearTimeout(timeout.current);
  }, []);

  function handleEnter() {
    clearTimeout(timeout.current);
    setOpen(true);
  }

  function handleLeave() {
    timeout.current = setTimeout(() => setOpen(false), 150);
  }

  if (isSingle) {
    const item = group.items[0];
    const isActive = isItemActive(pathname, item.href);
    return (
      <Link
        href={item.href}
        className={cn(
          "rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted",
          isActive
            ? "font-semibold text-primary underline underline-offset-4"
            : "text-muted-foreground"
        )}
      >
        {group.label}
      </Link>
    );
  }

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        className={cn(
          "flex items-center gap-0.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted",
          isGroupActive
            ? "font-semibold text-primary underline underline-offset-4"
            : "text-muted-foreground"
        )}
      >
        {group.label}
        <ChevronDown
          size={14}
          className={cn("transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[140px] rounded-lg border bg-white py-1 shadow-lg">
          {group.items.map((item) => {
            const isActive = isItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block px-4 py-2 text-sm transition-colors hover:bg-muted",
                  isActive
                    ? "font-semibold text-primary"
                    : "text-muted-foreground"
                )}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Mobile group ── */
function MobileNavGroup({
  group,
  onClose,
}: {
  group: NavGroup;
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <div>
      <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
        {group.label}
      </div>
      {group.items.map((item) => {
        const isActive = isItemActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "block rounded-lg px-3 py-2 pl-6 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 font-semibold text-primary"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export default function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuthStore();

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
          {PUBLIC_NAV.map((group) => (
            <NavDropdown key={group.label} group={group} />
          ))}
          {user && (
            <>
              <Separator orientation="vertical" className="mx-1 h-5" />
              {MEMBER_NAV.map((item) => {
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
            {PUBLIC_NAV.map((group) => (
              <MobileNavGroup
                key={group.label}
                group={group}
                onClose={() => setMobileOpen(false)}
              />
            ))}
            {user && (
              <>
                <Separator className="my-1" />
                {MEMBER_NAV.map((item) => {
                  const isActive = pathname.startsWith(item.href);
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
              </>
            )}
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
