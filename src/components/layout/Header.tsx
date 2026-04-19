"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Menu, X, User, Shield, ChevronDown, BookUser, LayoutDashboard, LogOut, Settings, BookOpen, Users, QrCode, ClipboardList, IdCard, FlaskConical, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/features/auth/auth-store";
import { useAuth } from "@/features/auth/useAuth";
import { isAtLeast } from "@/lib/permissions";
import NotificationBell from "@/features/notifications/NotificationBell";
import ThemeToggle from "@/components/ThemeToggle";
import GlobalSearch from "@/components/layout/GlobalSearch";
import SessionIndicator from "@/features/auth/SessionIndicator";

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
      { href: "/about", label: "학회 소개" },
      { href: "/about/fields", label: "활동 분야" },
      { href: "/about/history", label: "연혁" },
    ],
  },
  {
    label: "구성원",
    items: [
      { href: "/members?tab=professor", label: "주임교수" },
      { href: "/members?tab=staff", label: "운영진" },
      { href: "/members?tab=student", label: "재학생 회원" },
      { href: "/members?tab=alumni", label: "졸업생 회원" },
    ],
  },
  {
    label: "학술활동",
    items: [
      { href: "/activities", label: "활동 소개" },
      { href: "/calendar", label: "학술 캘린더" },
      { href: "/seminars", label: "세미나" },
      { href: "/activities/projects", label: "프로젝트" },
      { href: "/activities/studies", label: "스터디" },
      { href: "/activities/external", label: "대외 학술대회" },
      { href: "/courses", label: "내 수강과목" },
      { href: "/alumni/thesis", label: "졸업생 학위논문" },
      { href: "/steppingstone", label: "인지디딤판" },
    ],
  },
  {
    label: "커뮤니티",
    items: [
      { href: "/notices", label: "공지사항" },
      { href: "/board/free", label: "자유게시판" },
      { href: "/board/interview", label: "인터뷰 게시판" },
      { href: "/board/promotion", label: "홍보게시판" },
      { href: "/board/resources", label: "자료실" },
      { href: "/gallery", label: "포토갤러리" },
      { href: "/newsletter", label: "학회보" },
    ],
  },
  {
    label: "문의",
    items: [{ href: "/contact", label: "문의하기" }],
  },
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
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const isSingle = group.items.length === 1;
  const isGroupActive = group.items.some((item) => isItemActive(pathname, item.href));

  useEffect(() => {
    return () => clearTimeout(timeout.current);
  }, []);

  if (isSingle) {
    const item = group.items[0];
    const isActive = isItemActive(pathname, item.href);
    return (
      <Link
        href={item.href}
        className={cn(
          "rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted",
          isActive ? "font-semibold text-primary underline underline-offset-4" : "text-muted-foreground",
        )}
      >
        {group.label}
      </Link>
    );
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => { clearTimeout(timeout.current); setOpen(true); }}
      onMouseLeave={() => { timeout.current = setTimeout(() => setOpen(false), 150); }}
    >
      <button
        className={cn(
          "flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted",
          isGroupActive ? "font-semibold text-primary underline underline-offset-4" : "text-muted-foreground",
        )}
      >
        {group.label}
        <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[140px] rounded-lg border bg-popover py-1 shadow-lg">
          {group.items.map((item) => {
            const isActive = isItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block px-4 py-2 text-sm transition-colors hover:bg-muted",
                  isActive ? "font-semibold text-primary" : "text-muted-foreground",
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

/* ── User Profile Dropdown (desktop) ── */
function UserDropdown() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const showAdmin = isAtLeast(user, "staff");

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (!user) return null;

  const menuItems = [
    { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
    { href: "/mypage", label: "마이페이지", icon: User },
    { href: "/profile/me", label: "개인 페이지", icon: IdCard },
    { href: "/mypage/portfolio", label: "내 포트폴리오", icon: Award },
    { href: "/mypage/activities", label: "내 학회활동", icon: ClipboardList },
    { href: "/mypage/research", label: "내 연구활동", icon: BookOpen },
    { href: "/mypage/card", label: "내 명함", icon: QrCode },
    { href: "/labs", label: "실험실", icon: FlaskConical },
    ...(showAdmin
      ? [
          { href: "/console", label: "운영 콘솔", icon: Shield },
        ]
      : []),
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors",
          open ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary hover:bg-primary/20",
        )}
      >
        <User size={16} />
        {user.name}
        <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border bg-popover py-1 shadow-lg">
          {menuItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-muted",
                  isActive ? "font-semibold text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon size={15} />
                {item.label}
              </Link>
            );
          })}
          <Separator className="my-1" />
          <button
            onClick={() => { setOpen(false); logout(); }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-500 transition-colors hover:bg-red-50"
          >
            <LogOut size={15} />
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Mobile group ── */
function MobileNavGroup({ group, onClose }: { group: NavGroup; onClose: () => void }) {
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
              isActive ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-muted",
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
  const { logout } = useAuth();
  const showAdmin = isAtLeast(user, "staff");

  // 모바일 메뉴 열림 시 배경 스크롤 방지
  useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image src="/yonsei-emblem.svg" alt="연세대학교 엠블럼" width={32} height={32} className="h-8 w-8" />
          <Image src="/logo-text.png" alt="연세교육공학회" width={200} height={40} className="h-8 w-auto" priority />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {PUBLIC_NAV.filter((group) => !(user && group.label === "문의")).map((group) => (
            <NavDropdown key={group.label} group={group} />
          ))}
        </nav>

        {/* Auth Area (Desktop) */}
        <div className="hidden items-center gap-2 md:flex">
          <GlobalSearch />
          {user && <SessionIndicator />}
          <ThemeToggle />
          {user ? (
            <>
              <NotificationBell />
              <UserDropdown />
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

        {/* Mobile: theme + hamburger */}
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button onClick={() => setMobileOpen(!mobileOpen)} aria-label="메뉴 열기">
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="animate-in slide-in-from-top-2 fade-in duration-200 border-t bg-popover md:hidden flex flex-col max-h-[calc(100vh-4rem)]">
          {/* 모바일 프로필 카드 (스크롤 영역 바깥에 고정) */}
          {user && (
            <div className="shrink-0 border-b bg-popover px-4 pt-2 pb-2">
              <div className="flex items-center gap-3 rounded-xl bg-primary/5 px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {user.name?.[0] || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.role === "sysadmin" ? "시스템 관리자" : user.role === "admin" ? "관리자" : user.role === "president" ? "학회장" : user.role === "staff" ? "운영진" : user.role === "alumni" ? "졸업생" : "회원"}</p>
                </div>
                <NotificationBell />
                <button
                  onClick={() => { setMobileOpen(false); logout(); }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-red-500 hover:bg-red-50"
                  aria-label="로그아웃"
                  title="로그아웃"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
          <nav className="flex flex-col gap-1 pt-2">
            {!user && (
              <div className="mb-2 grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl bg-primary px-3 py-2 text-center text-sm font-semibold text-white shadow-sm"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl border border-primary px-3 py-2 text-center text-sm font-semibold text-primary"
                >
                  회원가입
                </Link>
              </div>
            )}
            {user && (
              <>
                <div className="px-3 py-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">내 메뉴</span>
                </div>
                {[
                  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
                  { href: "/mypage", label: "마이페이지", icon: User },
                  { href: "/profile/me", label: "개인 페이지", icon: IdCard },
                  { href: "/mypage/portfolio", label: "내 포트폴리오", icon: Award },
                  { href: "/mypage/activities", label: "내 학회활동", icon: ClipboardList },
                  { href: "/mypage/research", label: "내 연구활동", icon: BookOpen },
                  { href: "/mypage/card", label: "내 명함", icon: QrCode },
                  { href: "/labs", label: "실험실", icon: FlaskConical },
                  ...(showAdmin
                    ? [
                        { href: "/console", label: "운영 콘솔", icon: Shield },
                      ]
                    : []),
                ].map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-3 py-2 pl-6 text-sm font-medium transition-colors",
                        isActive ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-muted",
                      )}
                    >
                      <item.icon size={15} />
                      {item.label}
                    </Link>
                  );
                })}
                <Separator className="my-1" />
              </>
            )}
            {PUBLIC_NAV.filter((group) => !(user && group.label === "문의")).map((group) => (
              <MobileNavGroup key={group.label} group={group} onClose={() => setMobileOpen(false)} />
            ))}
            {user && (
              <>
                <Separator className="my-1" />
                <button
                  onClick={() => { setMobileOpen(false); logout(); }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 pl-6 text-sm font-medium text-red-500 hover:bg-red-50"
                >
                  <LogOut size={15} />
                  로그아웃
                </button>
              </>
            )}
          </nav>
          </div>
        </div>
      )}
    </header>
  );
}
