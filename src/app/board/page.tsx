"use client";

import Link from "next/link";
import { MessageSquare, PenSquare, LogIn, ArrowRight, Megaphone, BookOpen, Users, Archive, Shield, Zap, Mic2, FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import PageHeader from "@/components/ui/page-header";
import EmptyState from "@/components/ui/empty-state";
import { useAuthStore } from "@/features/auth/auth-store";
import { isStaffOrAbove } from "@/lib/permissions";
import type { LucideIcon } from "lucide-react";

// ── 카테고리 정의 ──────────────────────────────────────────────────────────
interface CategoryCard {
  key: string;
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string; // Tailwind bg+text (아이콘 배경), strip: text → bg 치환
  badge?: string;
  staffOnly?: boolean;
}

const CATEGORIES: CategoryCard[] = [
  {
    key: "free",
    href: "/board/free",
    title: "자유게시판",
    description: "학회 생활, 일상, 관심사를 자유롭게 공유하세요.",
    icon: MessageSquare,
    color: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  {
    key: "paper_review",
    href: "/board/paper-review",
    title: "교육공학 논문 리뷰",
    description: "교육공학·에듀테크 관련 논문을 읽고 서로의 관점을 나눕니다.",
    icon: FileSearch,
    color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    badge: "학술",
  },
  {
    key: "interview",
    href: "/board/interview",
    title: "인터뷰 게시판",
    description: "연구자·교육자 인터뷰, 진로 경험, 현장 이야기를 공유합니다.",
    icon: Mic2,
    color: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  {
    key: "seminar",
    href: "/board/seminar",
    title: "세미나 자료",
    description: "세미나 발표 자료·정리 노트·후기를 아카이브합니다.",
    icon: BookOpen,
    color: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  },
  {
    key: "promotion",
    href: "/board/promotion",
    title: "홍보·보도자료",
    description: "외부 공모전, 학술행사, 채용 정보를 공유합니다.",
    icon: Megaphone,
    color: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  },
  {
    key: "resources",
    href: "/board/resources",
    title: "자료실",
    description: "양식, 규정, 참고자료 등 학회 공식 파일을 내려받으세요.",
    icon: Archive,
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  {
    key: "update",
    href: "/board/update",
    title: "업데이트 게시판",
    description: "홈페이지 기능 개선·변경 내역을 안내합니다.",
    icon: Zap,
    color: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  },
  {
    key: "staff",
    href: "/board/staff",
    title: "운영진 게시판",
    description: "운영진 전용 안건·회의록·결정사항 공유 공간입니다.",
    icon: Shield,
    color: "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
    badge: "운영진",
    staffOnly: true,
  },
];

// ── 색상 strip 도우미 ──────────────────────────────────────────────────────
function stripColorClass(color: string): string {
  // "text-blue-700" → "bg-blue-700", "dark:text-blue-300" → "dark:bg-blue-300"
  const parts = color.split(" ");
  const textPart = parts.find((c) => c.startsWith("text-") && !c.startsWith("text-slate"));
  if (!textPart) return "bg-primary";
  return textPart.replace("text-", "bg-");
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────────
export default function BoardHubPage() {
  const { user } = useAuthStore();
  const canSeeStaff = isStaffOrAbove(user);

  const visibleCategories = CATEGORIES.filter(
    (c) => !c.staffOnly || canSeeStaff,
  );

  const writeAction = user ? (
    <Link href="/board/write">
      <Button size="sm" className="shrink-0">
        <PenSquare size={15} className="mr-1.5" />
        글쓰기
      </Button>
    </Link>
  ) : (
    <Link href="/login">
      <Button variant="outline" size="sm" className="shrink-0">
        <LogIn size={15} className="mr-1.5" />
        로그인 후 글 작성
      </Button>
    </Link>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 py-8 sm:py-14">
      <div className="mx-auto max-w-6xl px-4">
        {/* ── 페이지 헤더 ── */}
        <PageHeader
          icon={MessageSquare}
          title="게시판"
          description="자유게시판·논문 리뷰·인터뷰·자료실 등 학회 커뮤니티 공간입니다. 원하는 게시판으로 바로 이동하세요."
          actions={writeAction}
        />

        <Separator className="mt-6" />

        {/* ── 카테고리 그리드 ── */}
        {visibleCategories.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              icon={Users}
              title="표시할 게시판이 없습니다"
              description="로그인하면 더 많은 게시판을 이용할 수 있습니다."
              actionLabel="로그인하기"
              actionHref="/login"
            />
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleCategories.map((cat) => {
              const Icon = cat.icon;
              const strip = stripColorClass(cat.color);

              return (
                <Link
                  key={cat.key}
                  href={cat.href}
                  className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-2xl"
                  aria-label={`${cat.title} 게시판으로 이동`}
                >
                  <article
                    className={
                      "relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card p-6 shadow-sm " +
                      "transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-primary/30 group-hover:shadow-md"
                    }
                  >
                    {/* 카테고리 좌측 색상 strip */}
                    <div
                      aria-hidden
                      className={
                        "absolute inset-y-0 left-0 w-1 rounded-l-2xl transition-all duration-300 group-hover:w-1.5 " +
                        strip
                      }
                    />

                    {/* 아이콘 + 제목 + 배지 */}
                    <div className="flex items-start gap-3">
                      <div
                        className={
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm " +
                          "transition-transform duration-300 group-hover:scale-105 " +
                          cat.color
                        }
                      >
                        <Icon size={22} aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h2 className="text-base font-bold tracking-tight leading-snug">
                            {cat.title}
                          </h2>
                          {cat.badge && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {cat.badge}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 설명 */}
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {cat.description}
                    </p>

                    {/* 바로가기 CTA */}
                    <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-primary transition-all duration-200 group-hover:gap-2">
                      <span>바로가기</span>
                      <ArrowRight size={15} aria-hidden />
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}

        {/* ── 푸터 안내 ── */}
        <p className="mt-10 text-center text-xs text-muted-foreground">
          게시 규정 위반이나 오류를 발견하셨나요?{" "}
          <Link
            href="/contact"
            className="underline underline-offset-2 transition-colors hover:text-primary"
          >
            문의 게시판
          </Link>
          으로 알려주세요.
        </p>
      </div>
    </div>
  );
}
