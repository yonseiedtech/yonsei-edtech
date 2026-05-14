"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Menu, X, User, Shield, ChevronDown, BookUser, LayoutDashboard, LogOut, Settings, Users, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/features/auth/auth-store";
import { useAuth } from "@/features/auth/useAuth";
import { isAtLeast } from "@/lib/permissions";
import NotificationBell from "@/features/notifications/NotificationBell";
import ThemeToggle from "@/components/ThemeToggle";
import SessionIndicator from "@/features/auth/SessionIndicator";

interface NavLink {
  href: string;
  label: string;
}

interface NavSection {
  /** sub-section 헤더 라벨 (옵셔널). 없으면 헤더 없이 링크만 렌더 */
  sectionLabel?: string;
  links: NavLink[];
}

interface NavGroup {
  label: string;
  /** 평탄 구조 — 단일 sub-section과 동일. items 또는 sections 중 하나만 사용 */
  items?: NavLink[];
  /** sub-section 분리 구조 — 청자/카테고리 구분 시 사용 */
  sections?: NavSection[];
  /**
   * Sprint 67-AM: 그룹 가시성 — 'both'(기본) / 'public'(비로그인만) / 'auth'(로그인만) / 'staff'(운영진만)
   * 사용자 유형별 다른 IA 노출.
   */
  visibility?: "both" | "public" | "auth" | "staff";
}

/** NavGroup 의 모든 링크를 sections 구조로 정규화 */
function getSections(group: NavGroup): NavSection[] {
  if (group.sections && group.sections.length > 0) return group.sections;
  return [{ links: group.items ?? [] }];
}

/** NavGroup 의 모든 링크를 평탄화 */
function getAllLinks(group: NavGroup): NavLink[] {
  return getSections(group).flatMap((s) => s.links);
}

/**
 * Sprint 67-AM: 그룹 가시성 분기.
 *   - both/undefined: 항상 노출
 *   - public: 비로그인만
 *   - auth: 로그인만
 *   - staff: 로그인 + 운영진(staff/admin/sysadmin)만
 */
function isGroupVisible(group: NavGroup, user: { role?: string } | null | undefined): boolean {
  const vis = group.visibility ?? "both";
  if (vis === "both") return true;
  if (vis === "public") return !user;
  if (vis === "auth") return !!user;
  if (vis === "staff") {
    if (!user) return false;
    return user.role === "staff" || user.role === "admin" || user.role === "sysadmin";
  }
  return true;
}

// Sprint 67-AL/AM: IA 개편 — 1차 메뉴 4개 + 로그인 전·후 분기.
// 비로그인 방문자: 학회소개·학술활동·연구 (외부 홍보 중심)
// 로그인 회원: 대학원 생활(디딤판 강조)·학술활동·연구·커뮤니티 (도구 중심)
const PUBLIC_NAV: NavGroup[] = [
  {
    label: "학회소개",
    visibility: "public",
    sections: [
      {
        links: [
          { href: "/about/greeting", label: "인사말" },
          { href: "/about", label: "학회 소개" },
          { href: "/about/fields", label: "활동 분야" },
          { href: "/about/history", label: "연혁" },
        ],
      },
      {
        sectionLabel: "주요 구성원",
        links: [
          { href: "/about/leadership?tab=professor", label: "주임교수" },
          { href: "/about/leadership?tab=staff", label: "운영진" },
        ],
      },
    ],
  },
  {
    label: "대학원 생활",
    visibility: "auth",
    sections: [
      {
        sectionLabel: "🌱 필수 — 학기별 로드맵",
        links: [
          { href: "/steppingstone", label: "인지디딤판" },
        ],
      },
      {
        sectionLabel: "학사 도구",
        links: [
          { href: "/courses", label: "내 수강과목" },
          { href: "/mypage/calendar", label: "캘린더" },
        ],
      },
      {
        sectionLabel: "구성원·네트워크",
        links: [
          { href: "/members?tab=student", label: "재학생 회원" },
          { href: "/members?tab=alumni", label: "졸업생 회원" },
          { href: "/network", label: "전공 네트워킹 Map" },
        ],
      },
    ],
  },
  {
    label: "학술 활동",
    visibility: "both",
    items: [
      { href: "/activities", label: "활동 소개" },
      { href: "/calendar", label: "학술 캘린더" },
      { href: "/seminars", label: "세미나" },
      { href: "/activities/projects", label: "프로젝트" },
      { href: "/activities/studies", label: "스터디" },
      { href: "/activities/external", label: "대외 학술대회" },
    ],
  },
  {
    label: "연구 활동",
    visibility: "both",
    items: [
      { href: "/research", label: "연세교육공학 연구 분석" },
      { href: "/alumni/thesis", label: "졸업생 학위논문" },
      { href: "/archive", label: "교육공학 아카이브" },
      { href: "/mypage/research", label: "내 연구활동" },
    ],
  },
  {
    label: "커뮤니티",
    visibility: "auth",
    items: [
      { href: "/notices", label: "공지사항" },
      { href: "/board/free", label: "자유게시판" },
      { href: "/board/interview", label: "인터뷰 게시판" },
      { href: "/board/paper-review", label: "교육공학 논문 리뷰" },
      { href: "/board/promotion", label: "홍보게시판" },
      { href: "/board/resources", label: "자료실" },
      { href: "/board/update", label: "업데이트 게시판" },
      { href: "/ai-forum", label: "AI 포럼 (실험)" },
      { href: "/gallery", label: "포토갤러리" },
      { href: "/newsletter", label: "학회보" },
      { href: "/card-news", label: "카드뉴스" },
    ],
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
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const sections = getSections(group);
  const allLinks = getAllLinks(group);
  const isSingle = allLinks.length === 1;
  const isGroupActive = allLinks.some((item) => isItemActive(pathname, item.href));

  useEffect(() => {
    return () => clearTimeout(timeout.current);
  }, []);

  // 외부 클릭으로 닫기 (키보드/클릭 토글 사용 시 필요)
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (isSingle) {
    const item = allLinks[0];
    const isActive = isItemActive(pathname, item.href);
    return (
      <Link
        href={item.href}
        className={cn(
          "rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isActive ? "font-semibold text-primary underline underline-offset-4" : "text-muted-foreground",
        )}
      >
        {group.label}
      </Link>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => { clearTimeout(timeout.current); setOpen(true); }}
      onMouseLeave={() => { timeout.current = setTimeout(() => setOpen(false), 150); }}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isGroupActive ? "font-semibold text-primary underline underline-offset-4" : "text-muted-foreground",
        )}
      >
        {group.label}
        <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={group.label}
          className="absolute left-0 top-full z-50 mt-1.5 min-w-[180px] rounded-2xl border bg-popover py-1.5 shadow-xl animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {sections.map((section, sIdx) => (
            <div key={section.sectionLabel ?? `__section_${sIdx}`}>
              {section.sectionLabel && (
                <>
                  {sIdx > 0 && <div className="my-1 border-t border-border/50" />}
                  <div className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    {section.sectionLabel}
                  </div>
                </>
              )}
              {section.links.map((item) => {
                const isActive = isItemActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    role="menuitem"
                    className={cn(
                      "block px-4 py-2 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:bg-muted",
                      isActive ? "font-semibold text-primary" : "text-muted-foreground",
                    )}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
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

  // Sprint 67-AR (마이페이지 통합): 진입점 1개로 통합 — `/mypage` 내부 탭으로 안내
  const menuItems = [
    { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
    { href: "/mypage", label: "마이페이지", icon: User },
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
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
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
  const sections = getSections(group);

  return (
    <div>
      <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
        {group.label}
      </div>
      {sections.map((section, sIdx) => (
        <div key={section.sectionLabel ?? `__section_${sIdx}`}>
          {section.sectionLabel && (
            <div className="px-6 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
              {section.sectionLabel}
            </div>
          )}
          {section.links.map((item) => {
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
      ))}
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
    <header
      className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-lg"
      style={{
        paddingLeft: "max(0px, env(safe-area-inset-left))",
        paddingRight: "max(0px, env(safe-area-inset-right))",
      }}
    >
      {/* 키보드 접근성: 메인 콘텐츠로 건너뛰기 (Tab 첫 포커스 시 표시) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        메인 콘텐츠로 건너뛰기
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image src="/yonsei-emblem.svg" alt="연세대학교 엠블럼" width={32} height={32} className="h-8 w-8" />
          <Image src="/logo-text.png" alt="연세교육공학회" width={200} height={40} className="h-8 w-auto" priority />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-3 md:flex">
          {PUBLIC_NAV.filter((group) => isGroupVisible(group, user)).map((group) => (
            <NavDropdown key={group.label} group={group} />
          ))}
        </nav>

        {/* Auth Area (Desktop) */}
        <div className="hidden items-center gap-2 md:flex">
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

        {/* Mobile: theme + hamburger (WCAG 2.5.5: 44px 터치 타겟) */}
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div
          id="mobile-nav"
          className="animate-in slide-in-from-top-2 fade-in duration-200 border-t bg-popover md:hidden flex flex-col max-h-[calc(100vh-4rem)]"
        >
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
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
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
                  // Sprint 67-AR (마이페이지 통합): 모바일도 desktop과 동일하게 마이페이지 1개 진입점
                  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
                  { href: "/mypage", label: "마이페이지", icon: User },
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
            {PUBLIC_NAV.filter((group) => isGroupVisible(group, user)).map((group) => (
              <MobileNavGroup key={group.label} group={group} onClose={() => setMobileOpen(false)} />
            ))}
            {user && (
              <>
                <Separator className="my-1" />
                <button
                  onClick={() => { setMobileOpen(false); logout(); }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 pl-6 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
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
