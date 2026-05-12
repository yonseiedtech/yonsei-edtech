"use client";

import Link from "next/link";
import {
  Target,
  Eye,
  Sparkles,
  ArrowRight,
  Info,
  MessageSquareQuote,
  LayoutGrid,
  Clock,
  Users,
} from "lucide-react";
import PageHeader from "@/components/ui/page-header";
import InlineNotification from "@/components/ui/inline-notification";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAbout } from "@/features/site-settings/useSiteContent";
import { cn } from "@/lib/utils";

// ── 미션·비전·가치 카드 메타 ─────────────────────────────────────────────────
const VALUE_META = [
  {
    key: "mission" as const,
    label: "미션",
    icon: Target,
    accentBg: "bg-blue-50 dark:bg-blue-950/40",
    accentIcon: "text-blue-600 dark:text-blue-300",
    accentBorder: "border-blue-200 dark:border-blue-800",
  },
  {
    key: "vision" as const,
    label: "비전",
    icon: Eye,
    accentBg: "bg-emerald-50 dark:bg-emerald-950/40",
    accentIcon: "text-emerald-600 dark:text-emerald-300",
    accentBorder: "border-emerald-200 dark:border-emerald-800",
  },
  {
    key: "values" as const,
    label: "핵심 가치",
    icon: Sparkles,
    accentBg: "bg-amber-50 dark:bg-amber-950/40",
    accentIcon: "text-amber-600 dark:text-amber-300",
    accentBorder: "border-amber-200 dark:border-amber-800",
  },
];

// ── 서브 페이지 내비게이션 카드 메타 ─────────────────────────────────────────
const NAV_CARDS = [
  {
    href: "/about/greeting",
    icon: MessageSquareQuote,
    label: "인사말",
    description: "주임교수님과 학회장의 메시지를 확인하세요.",
  },
  {
    href: "/about/fields",
    icon: LayoutGrid,
    label: "활동 분야",
    description: "에듀테크·교수설계·학습과학 등 탐구 영역을 소개합니다.",
  },
  {
    href: "/about/history",
    icon: Clock,
    label: "연혁",
    description: "학회 창립부터 지금까지 걸어온 길을 돌아봅니다.",
  },
  {
    href: "/about/leadership",
    icon: Users,
    label: "주요 구성원",
    description: "주임교수님과 운영진을 소개합니다.",
  },
];

// ── 미션·비전·가치 카드 스켈레톤 ─────────────────────────────────────────────
function ValueCardSkeleton() {
  return (
    <div
      className="grid gap-4 sm:grid-cols-3"
      aria-busy="true"
      aria-label="학회 소개 불러오는 중"
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl border bg-card p-6 shadow-sm">
          <Skeleton className="mb-4 h-10 w-10 rounded-xl" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-1.5 h-4 w-5/6" />
          <Skeleton className="mt-1.5 h-4 w-4/6" />
        </div>
      ))}
    </div>
  );
}

// ── 메인 ──────────────────────────────────────────────────────────────────────
export default function AboutPage() {
  const { value: about, isLoading } = useAbout();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 py-8 sm:py-14">
      <div className="mx-auto max-w-5xl px-4">

        {/* ── 페이지 헤더 ── */}
        <PageHeader
          icon={Info}
          title="학회 소개"
          description="연세교육공학회는 연세대학교에서 교육공학을 탐구하는 학술 커뮤니티입니다."
        />

        <Separator className="mt-6" />

        {/* ── 학회 정체성 안내 배너 ── */}
        <div className="mt-6">
          <InlineNotification
            kind="info"
            title="교육공학 이론과 실천을 연결합니다"
            description="연세교육공학회는 교육공학 전공 학생들이 모여 세미나·프로젝트·스터디를 통해 함께 성장하는 학술 공동체입니다. 본 페이지에서 학회의 미션·비전·핵심 가치와 주요 활동을 확인하세요."
          />
        </div>

        {/* ── 미션·비전·가치 카드 ── */}
        <section aria-labelledby="about-values-heading" className="mt-8">
          <h2
            id="about-values-heading"
            className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground"
          >
            미션 · 비전 · 가치
          </h2>

          {isLoading ? (
            <ValueCardSkeleton />
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              {VALUE_META.map(({ key, label, icon: Icon, accentBg, accentIcon, accentBorder }) => (
                <article
                  key={key}
                  className={cn(
                    "rounded-2xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md",
                    accentBorder,
                  )}
                >
                  <div
                    className={cn(
                      "mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl",
                      accentBg,
                      accentIcon,
                    )}
                    aria-hidden
                  >
                    <Icon size={20} />
                  </div>
                  <h3 className="text-base font-bold tracking-tight">{label}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {about[key]}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* ── 서브 페이지 내비게이션 ── */}
        <section aria-labelledby="about-nav-heading" className="mt-10">
          <h2
            id="about-nav-heading"
            className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground"
          >
            더 알아보기
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            {NAV_CARDS.map(({ href, icon: Icon, label, description }) => (
              <Link
                key={href}
                href={href}
                className="group rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
                aria-label={`${label} 페이지로 이동`}
              >
                <article className="flex h-full items-start gap-4 rounded-2xl border bg-card p-5 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
                  <div
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                    aria-hidden
                  >
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold leading-snug transition-colors group-hover:text-primary">
                      {label}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {description}
                    </p>
                  </div>
                  <ArrowRight
                    size={16}
                    className="mt-1 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                    aria-hidden
                  />
                </article>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
