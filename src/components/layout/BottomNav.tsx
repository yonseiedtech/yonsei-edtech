"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  GraduationCap,
  Microscope,
  BookOpen,
  MessagesSquare,
  User,
  MoreHorizontal,
  LayoutDashboard,
  Calendar,
  Presentation,
  Library,
  Trophy,
  Newspaper,
  Users,
  HelpCircle,
  Images,
  ClipboardCheck,
  X,
} from "lucide-react";
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
    // Sprint 67-AQ: 외부 피드백 — 디딤판을 첫 탭으로 강조 (대시보드 진입 시에도 활성)
    href: "/steppingstone",
    label: "디딤판",
    icon: GraduationCap,
    matchPrefixes: ["/steppingstone", "/dashboard", "/"],
  },
  {
    href: "/research",
    label: "연구활동",
    icon: Microscope,
    matchPrefixes: ["/research"],
  },
  {
    href: "/activities",
    label: "학술활동",
    icon: BookOpen,
    matchPrefixes: ["/activities", "/seminars", "/calendar", "/courses"],
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

/** Sprint UX-5: 하단 네비 "더보기" 시트 — 헤더 펼침 없이는 도달 못 하던 2차 기능 모음 */
const MORE_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/diagnosis", label: "진단평가", icon: ClipboardCheck },
  { href: "/calendar", label: "캘린더", icon: Calendar },
  { href: "/seminars", label: "세미나", icon: Presentation },
  { href: "/archive", label: "아카이브", icon: Library },
  { href: "/leaderboard", label: "리더보드", icon: Trophy },
  { href: "/newsletter", label: "뉴스레터", icon: Newspaper },
  { href: "/card-news", label: "카드뉴스", icon: Images },
  { href: "/members", label: "회원", icon: Users },
  { href: "/help", label: "도움말", icon: HelpCircle },
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
  // 현재 경로가 1차 탭에 없고 "더보기" 시트 항목(진단·아카이브·리더보드 등)에 해당하면
  // 더보기 버튼을 활성으로 표시 — 깊은 표면에서도 위치를 잃지 않게.
  const primaryActive = ITEMS.some((item) => isActive(pathname, item));
  const moreActive = !primaryActive && MORE_ITEMS.some((item) => isActive(pathname, item));
  const [moreOpen, setMoreOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  // 라우트 이동 시 시트 자동 닫기
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  // a11y: 더보기 시트 포커스 트랩 + Escape 닫기 (시각·기능 무변경)
  useEffect(() => {
    if (!moreOpen) return;

    const getFocusable = (): HTMLElement[] => {
      const root = sheetRef.current;
      if (!root) return [];
      return Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);
    };

    // 시트가 열리면 첫 포커스 가능한 요소로 이동
    const focusable = getFocusable();
    focusable[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setMoreOpen(false);
        moreButtonRef.current?.focus();
        return;
      }
      if (e.key !== "Tab") return;
      const items = getFocusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (activeEl === first || !sheetRef.current?.contains(activeEl)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (activeEl === last || !sheetRef.current?.contains(activeEl)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  // 비로그인 상태에서는 숨김 (랜딩에 방해)
  if (!user) return null;

  // 콘솔/관리자 페이지에서는 숨김 (자체 사이드바가 있음)
  if (pathname.startsWith("/console") || pathname.startsWith("/admin") || pathname.startsWith("/staff-admin")) {
    return null;
  }

  return (
    <>
      {/* Sprint UX-5: 더보기 바텀시트 */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true" aria-label="더보기 메뉴">
          <button
            type="button"
            aria-label="메뉴 닫기"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
          />
          <div
            ref={sheetRef}
            className="absolute bottom-0 left-0 right-0 rounded-t-2xl border-t bg-card p-4 shadow-2xl animate-in slide-in-from-bottom-4 duration-200"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">더보기</p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="닫기"
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X size={16} />
              </button>
            </div>
            <ul className="grid grid-cols-3 gap-2">
              {MORE_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-[11px] font-medium transition-colors",
                        active
                          ? "border-primary/40 bg-primary/5 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon size={20} />
                      <span className="leading-none">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      <nav
        aria-label="주요 메뉴"
        className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur shadow-[0_-2px_8px_rgba(0,0,0,0.04)] supports-[backdrop-filter]:bg-card/80 sm:hidden"
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
                    "relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-medium transition-all duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {/* 활성 상태 상단 인디케이터 — Carbon DataTable 스타일 시각 강화 */}
                  {active && (
                    <span
                      aria-hidden
                      className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary animate-in fade-in slide-in-from-top-1 duration-300"
                    />
                  )}
                  <Icon
                    size={20}
                    className={cn(
                      "transition-transform duration-200",
                      active && "scale-110",
                    )}
                  />
                  <span className={cn("leading-none transition-all", active && "font-semibold")}>
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              ref={moreButtonRef}
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              aria-haspopup="dialog"
              aria-current={moreActive ? "page" : undefined}
              className={cn(
                "relative flex min-h-[56px] w-full flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-medium transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50",
                moreOpen || moreActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {/* 활성 상태 상단 인디케이터 — 1차 탭과 동일한 시각 규약 */}
              {moreActive && (
                <span
                  aria-hidden
                  className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary animate-in fade-in slide-in-from-top-1 duration-300"
                />
              )}
              <MoreHorizontal size={20} className={cn("transition-transform duration-200", moreActive && "scale-110")} />
              <span className={cn("leading-none transition-all", moreActive && "font-semibold")}>더보기</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
