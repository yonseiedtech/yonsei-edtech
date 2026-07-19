"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Library,
  Star,
  Lightbulb,
  Variable as VariableIcon,
  Ruler,
  ArrowRight,
  Network,
  Anchor,
  BookText,
  FlaskConical,
  BarChart3,
  PenLine,
  FileText,
  ClipboardCheck,
  ListChecks,
  Quote,
  Wand2,
  Compass,
  BookMarked,
  GitFork,
  Rocket,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/page-header";
import InlineNotification from "@/components/ui/inline-notification";
import EduTechOverview from "@/components/archive/EduTechOverview";
import ArchiveGlobalSearch from "@/features/archive/ArchiveGlobalSearch";
import ArchiveStartHere from "@/features/archive/ArchiveStartHere";
import ArchiveConceptRecommend from "@/features/archive/ArchiveConceptRecommend";
import ArchiveSubNav, { type ArchiveNavSection } from "@/features/archive/ArchiveSubNav";
import ArchiveSectionHeader from "@/features/archive/ArchiveSectionHeader";
import ArchiveRecentStrip from "@/features/archive/ArchiveRecentStrip";
import ArchiveDictionaryCompare from "@/features/archive/ArchiveDictionaryCompare";
import PageContainer from "@/components/ui/page-container";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  archiveConceptsApi,
  archiveVariablesApi,
  archiveMeasurementsApi,
  archiveFavoritesApi,
  researchMethodsApi,
  statisticalMethodsApi,
  foundationTermsApi,
  favoriteHref,
} from "@/lib/bkend";
import { AECT_TERMS } from "@/lib/aect-terminology";
import {
  ARCHIVE_ITEM_TYPE_COLORS,
  ARCHIVE_ITEM_TYPE_LABELS,
  type ArchiveFavorite,
  type ArchiveFavoriteItemType,
  type ArchiveItemType,
} from "@/types";
import { cn } from "@/lib/utils";

interface TypeGuide {
  type: ArchiveItemType;
  title: string;
  oneLiner: string;
  description: string;
  examples: string[];
  icon: typeof Lightbulb;
  accent: string;
  borderClass: string;
  iconBg: string;
  iconText: string;
}

/**
 * 즐겨찾기 칩에 표시할 라벨 — 7개 동적 아카이브 타입 모두 지원.
 * 기존 3종(concept/variable/measurement) 은 ARCHIVE_ITEM_TYPE_LABELS 를 그대로 재사용.
 */
const FAVORITE_TYPE_LABELS: Record<ArchiveFavoriteItemType, string> = {
  ...ARCHIVE_ITEM_TYPE_LABELS,
  "research-method": "연구방법",
  "statistical-method": "통계방법",
  "foundation-term": "기초 용어",
  "writing-tip": "글쓰기",
};

/** 즐겨찾기 칩 색상 — 기존 3종 + 신규 4종 (각 컬렉션 상세 페이지 헤더 색과 톤 일치) */
const FAVORITE_TYPE_COLORS: Record<ArchiveFavoriteItemType, string> = {
  ...ARCHIVE_ITEM_TYPE_COLORS,
  "research-method": "bg-info/5 text-info border border-info/20",
  "statistical-method": "bg-info/5 text-info border border-info/20",
  "foundation-term": "bg-muted text-muted-foreground border border-muted-foreground/20",
  "writing-tip": "bg-destructive/5 text-destructive border border-destructive/20",
};

/** 스티키 서브내비 섹션 인덱스 (H1) — 각 id 는 ArchiveSectionHeader 앵커와 1:1 */
const NAV_SECTIONS: ArchiveNavSection[] = [
  { id: "start", label: "시작하기", icon: Rocket },
  { id: "dictionary", label: "사전·용어", icon: BookText },
  { id: "library", label: "라이브러리", icon: Library },
  { id: "guides", label: "연구·글쓰기 가이드", icon: FlaskConical },
  { id: "tools", label: "도구·그래프", icon: Network },
];

const TYPE_GUIDES: TypeGuide[] = [
  {
    type: "concept",
    title: "개념",
    oneLiner: "이론·구성개념을 모아둔 출발점",
    description:
      "자기효능감, 학습몰입처럼 교육공학 연구에서 자주 다루는 추상적 개념을 정의·별칭·관련 변인과 함께 정리합니다.",
    examples: ["자기효능감", "학습몰입", "메타인지", "사회적 실재감"],
    icon: Lightbulb,
    accent: "violet",
    borderClass: "border-l-cat-5",
    iconBg: "bg-cat-5/10",
    iconText: "text-cat-5",
  },
  {
    type: "variable",
    title: "변인",
    oneLiner: "개념을 측정 가능한 단위로 좁힌 것",
    description:
      "개념을 양적 연구에서 다룰 수 있도록 정의한 변인입니다. 인지적·정의적·행동적 등 유형별로 분류하고, 측정 가능한 도구와 연결됩니다.",
    examples: ["과제 자기효능감", "학습 몰입도", "자기조절학습 전략 사용"],
    icon: VariableIcon,
    accent: "blue",
    borderClass: "border-l-info",
    iconBg: "bg-info/10",
    iconText: "text-info",
  },
  {
    type: "measurement",
    title: "측정도구",
    oneLiner: "변인을 실제로 측정하는 검증된 척도",
    description:
      "신뢰도·타당도가 검증된 설문/척도. 문항 수, Likert 척도, 저자, 참고문헌, Cronbach α 등을 한눈에 확인하고 외부 자료로 바로 이동할 수 있습니다.",
    examples: ["GSE-K (Schwarzer, 1995)", "MSLQ", "Flow State Scale"],
    icon: Ruler,
    accent: "emerald",
    borderClass: "border-l-success",
    iconBg: "bg-success/10",
    iconText: "text-success",
  },
];

/** 최근 추가 항목 — 이미 로드한 concept/variable/measurement 에서 createdAt 기준 산출 */
interface RecentAddedItem {
  type: ArchiveItemType;
  id: string;
  name: string;
  href: string;
  createdAt: string;
}

const RECENT_ADDED_BADGE: Record<ArchiveItemType, string> = {
  concept: "bg-cat-5/5 text-cat-5 border-cat-5/20",
  variable: "bg-info/5 text-info border-info/20",
  measurement: "bg-success/5 text-success border-success/20",
};

export default function ArchiveLandingPage() {
  // 리텐션(2026-07-04): 온보딩 체크리스트 "둘러보기" 완료 신호 — 이 키를 읽는 위젯만 있고
  // 쓰는 곳이 없어 영구 미완료였던 죽은 항목을 살린다 (NewMemberChecklistWidget 참조)
  useEffect(() => {
    try {
      window.localStorage.setItem("yedu_onboarding_visited_archive", "1");
    } catch {
      /* 시크릿 모드 등 저장 불가는 무시 */
    }
  }, []);

  const { user } = useAuthStore();
  const [counts, setCounts] = useState<Record<ArchiveItemType, number>>({
    concept: 0,
    variable: 0,
    measurement: 0,
  });
  // H5: 히어로 규모 지표 — 가이드 계열 count (AECT 는 정적 import 로 무료 집계)
  const [guideCounts, setGuideCounts] = useState({ research: 0, statistical: 0, foundation: 0 });
  const [recentAdded, setRecentAdded] = useState<RecentAddedItem[]>([]);
  const [favorites, setFavorites] = useState<ArchiveFavorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [c, v, m, rm, sm, ft] = await Promise.all([
          archiveConceptsApi.list(),
          archiveVariablesApi.list(),
          archiveMeasurementsApi.list(),
          researchMethodsApi.listPublished(),
          statisticalMethodsApi.listPublished(),
          foundationTermsApi.listPublished(),
        ]);
        if (cancelled) return;
        setCounts({
          concept: c.data.length,
          variable: v.data.length,
          measurement: m.data.length,
        });
        setGuideCounts({
          research: rm.data.length,
          statistical: sm.data.length,
          foundation: ft.data.length,
        });
        // 최근 추가된 항목 — 로드된 라이브러리 3종에서 createdAt 최신순 6개
        const pooled: RecentAddedItem[] = [
          ...c.data.map((x) => ({ type: "concept" as const, id: x.id, name: x.name, href: `/archive/concept/${x.id}`, createdAt: x.createdAt })),
          ...v.data.map((x) => ({ type: "variable" as const, id: x.id, name: x.name, href: `/archive/variable/${x.id}`, createdAt: x.createdAt })),
          ...m.data.map((x) => ({ type: "measurement" as const, id: x.id, name: x.name, href: `/archive/measurement/${x.id}`, createdAt: x.createdAt })),
        ].filter((x) => typeof x.createdAt === "string" && x.createdAt.length > 0);
        pooled.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setRecentAdded(pooled.slice(0, 6));
      } catch (err) {
        console.error("[archive-landing] count load failed", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setFavorites([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await archiveFavoritesApi.listByUser(user.id);
        if (cancelled) return;
        setFavorites(res.data);
      } catch (err) {
        console.error("[archive-landing] favorites load failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // H5: 전체 자원 수 = 라이브러리 3종 + 가이드 3종 + AECT 표준 용어(정적)
  const totalResources = useMemo(
    () =>
      counts.concept +
      counts.variable +
      counts.measurement +
      guideCounts.research +
      guideCounts.statistical +
      guideCounts.foundation +
      AECT_TERMS.length,
    [counts, guideCounts],
  );

  return (
    <PageContainer width="default">
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">

        {/* ── 페이지 헤더 ── */}
        <PageHeader
          icon={Library}
          title="교육공학 아카이브"
          description="개념 · 변인 · 측정도구를 연결고리로 탐색하는 연구 자원 라이브러리"
        />

        {/* ── H5: 규모 지표 헤드라인 + 최근 추가된 항목 ── */}
        <section
          aria-label="아카이브 규모 및 최근 추가"
          className="mt-5 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/5 to-transparent p-5"
        >
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-sm text-muted-foreground">모두 합쳐</span>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <span className="text-3xl font-bold tabular-nums tracking-tight text-primary">
                {totalResources.toLocaleString()}
              </span>
            )}
            <span className="text-sm text-muted-foreground">개의 연구 자원을 한곳에서 탐색합니다</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            개념 {counts.concept} · 변인 {counts.variable} · 측정도구 {counts.measurement} · 연구방법 {guideCounts.research} · 통계방법 {guideCounts.statistical} · 기초 용어 {guideCounts.foundation} · AECT 표준 용어 {AECT_TERMS.length}
          </p>

          {recentAdded.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-warning" aria-hidden />
                최근 추가된 항목
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {recentAdded.map((it) => (
                  <li key={it.href}>
                    <Link href={it.href}>
                      <Badge
                        variant="outline"
                        className={cn("cursor-pointer transition-shadow hover:shadow-sm", RECENT_ADDED_BADGE[it.type])}
                      >
                        <span className="mr-1 opacity-70">[{ARCHIVE_ITEM_TYPE_LABELS[it.type]}]</span>
                        {it.name}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* ── 아카이브 통합 검색 (사이클 118 · M7 고도화) ── */}
        <div className="mt-4">
          <ArchiveGlobalSearch />
        </div>

        {/* ── H1: 스티키 섹션 인덱스 (전역 헤더 h-16 바로 아래에 고정) ── */}
        <ArchiveSubNav sections={NAV_SECTIONS} />

        {/* ── 이어보기 — 최근 본 항목 (기록 있을 때만) ── */}
        <ArchiveRecentStrip />

        {/* ═══════════════════════════════════════════════════════ */}
        {/* 🚀 시작하기 */}
        {/* ═══════════════════════════════════════════════════════ */}
        <section aria-labelledby="start" className="mt-8">
          <ArchiveSectionHeader
            id="start"
            icon={Rocket}
            label="시작하기"
            description="처음이라면 진단·추천 마법사부터 — 내게 맞는 출발점을 찾아 드립니다"
          />

          {/* 진단평가 CTA */}
          <Link
            href="/diagnosis"
            className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
            aria-label="교육공학 진단평가 시작"
          >
            <article className="overflow-hidden rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 via-success/5 to-cyan-50 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md dark:border-teal-800 dark:from-teal-950/40 dark:to-cyan-950/40">
              <div className="flex items-center gap-4 p-5">
                <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/70 text-teal-700 shadow-sm dark:bg-muted/60 dark:text-teal-300">
                  <ClipboardCheck className="h-6 w-6" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold tracking-tight">먼저, 내 수준을 진단해 볼까요?</h3>
                    <Badge variant="outline" className="text-[10px] font-medium border-teal-300 bg-white/60 text-teal-700 dark:bg-slate-900/50 dark:text-teal-300">
                      추천 시작점
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    통계방법·연구방법·핵심개념을 객관식으로 진단해 논문 작성 준비도·연구 분석 준비도를 점수로 확인하고, 약점 개념을 아카이브로 바로 연결합니다.
                  </p>
                </div>
                <div className="hidden shrink-0 items-center gap-1 text-sm font-medium text-primary group-hover:underline sm:flex">
                  진단 시작
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </div>
              </div>
            </article>
          </Link>

          {/* 통계방법 추천 마법사 진입 CTA */}
          <Link
            href="/archive/method-finder"
            className="group mt-3 flex items-center gap-4 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 to-transparent p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Wand2 className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-semibold tracking-tight">
                어떤 통계를 써야 할지 모르겠다면? — 추천 마법사
              </span>
              <span className="mt-0.5 block text-sm text-muted-foreground">
                몇 가지 질문에 답하면 연구 상황에 맞는 통계방법과 선배 논문을 추천해 드립니다.
              </span>
            </span>
            <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>

          {/* 연구방법 추천 마법사 진입 CTA */}
          <Link
            href="/archive/research-finder"
            className="group mt-3 flex items-center gap-4 rounded-2xl border border-warning/30 bg-gradient-to-r from-warning/10 to-transparent p-5 transition-all hover:-translate-y-0.5 hover:border-warning/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning/40"
          >
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning">
              <Compass className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-semibold tracking-tight">
                내 연구에 맞는 연구방법을 찾고 싶다면? — 연구방법 마법사
              </span>
              <span className="mt-0.5 block text-sm text-muted-foreground">
                연구 목적에 답하면 질적·양적·혼합 연구방법과 함께 쓸 방법·분석 통계를 추천해 드립니다.
              </span>
            </span>
            <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>

          {/* 신입용 추천 경로 */}
          <ArchiveStartHere />

          {/* 관심 주제·진단 약점 기반 개념 추천 */}
          <ArchiveConceptRecommend />

          {/* 즐겨찾기 모음 (로그인+즐겨찾기 있을 때만) */}
          {user && favorites.length > 0 && (
            <Card className="mt-6 rounded-2xl border-warning/20 bg-warning/5 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Star className="h-4 w-4 fill-warning text-warning" aria-hidden />
                  내 관심 저장 ({favorites.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {favorites.map((f) => (
                    <Link key={f.id} href={favoriteHref(f)}>
                      <Badge
                        variant="outline"
                        className={cn(
                          "cursor-pointer transition-shadow hover:shadow-sm",
                          FAVORITE_TYPE_COLORS[f.itemType],
                        )}
                      >
                        [{FAVORITE_TYPE_LABELS[f.itemType]}] {f.itemName ?? f.itemId}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* 📘 사전 · 용어 */}
        {/* ═══════════════════════════════════════════════════════ */}
        <section aria-labelledby="dictionary" className="mt-10">
          <ArchiveSectionHeader
            id="dictionary"
            icon={BookText}
            label="사전 · 용어"
            description="정의를 찾는 세 갈래 — 목적에 맞는 사전을 골라 보세요"
          />

          {/* M8: 사전 3종 역할 안내 */}
          <ArchiveDictionaryCompare />

          {/* 기초 용어 가이드 */}
          <Link
            href="/archive/foundation-terms"
            className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
            aria-label="교육공학 기초 용어 가이드 보기"
          >
            <article className="rounded-2xl border-l-4 border-l-muted-foreground bg-card shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center gap-4 p-5">
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <BookText className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold tracking-tight">교육공학 기초 용어 가이드</h3>
                  <p className="text-sm text-muted-foreground">
                    변인·연구설계·교수설계·체제이론·측정·학습이론 기초 용어와 &ldquo;비슷하지만 다른&rdquo; 용어 페어를 정리합니다.
                  </p>
                </div>
                <div className="hidden shrink-0 items-center gap-1 text-sm font-medium text-primary group-hover:underline sm:flex">
                  보기
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </div>
              </div>
            </article>
          </Link>

          {/* AECT 용어 표준 사전 */}
          <Link
            href="/archive/terminology"
            className="group mt-4 block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
            aria-label="AECT 용어 표준 사전 보기"
          >
            <article className="rounded-2xl border-l-4 border-l-info bg-card shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center gap-4 p-5">
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info/10 text-info">
                  <BookMarked className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold tracking-tight">AECT 용어 표준 사전 — 개념 설명 인덱스</h3>
                  <p className="text-sm text-muted-foreground">
                    『교육공학 용어해설』(학지사, 2020) 공식 표제어·역어 {AECT_TERMS.length}개를 6개 영역별로 검색·브라우징하고, 아카이브 개념과 연결된 항목에는 개념 설명을 함께 제공합니다.
                  </p>
                </div>
                <div className="hidden shrink-0 items-center gap-1 text-sm font-medium text-primary group-hover:underline sm:flex">
                  보기
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </div>
              </div>
            </article>
          </Link>

          {/* 학습이론 가계도 */}
          <Link
            href="/archive/theory-map"
            className="group mt-4 block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
            aria-label="학습이론 가계도 보기"
          >
            <article className="rounded-2xl border-l-4 border-l-cat-5 bg-card shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center gap-4 p-5">
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cat-5/10 text-cat-5">
                  <GitFork className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold tracking-tight">학습이론 가계도</h3>
                  <p className="text-sm text-muted-foreground">
                    행동주의계·인지주의계·구성주의계 3대 사조와 세부 계열·대표 학자를 지도로 정리하고, 각 이론을 아카이브 개념 상세로 연결합니다.
                  </p>
                </div>
                <div className="hidden shrink-0 items-center gap-1 text-sm font-medium text-primary group-hover:underline sm:flex">
                  보기
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </div>
              </div>
            </article>
          </Link>

          {/* 교육공학 정의·탐구분야 개관 */}
          <div className="mt-4">
            <EduTechOverview />
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* 📚 라이브러리 */}
        {/* ═══════════════════════════════════════════════════════ */}
        <section aria-labelledby="library" className="mt-10">
          <ArchiveSectionHeader
            id="library"
            icon={Library}
            label="라이브러리"
            description="개념 · 변인 · 측정도구 — 어디서 시작하든 양방향으로 연결됩니다"
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {TYPE_GUIDES.map((g) => {
              const Icon = g.icon;
              return (
                <Link
                  key={g.type}
                  href={`/archive/${g.type}`}
                  className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 rounded-2xl"
                  aria-label={`${g.title} 목록 보기`}
                >
                  <article
                    className={cn(
                      "h-full rounded-2xl border-l-4 bg-card shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md",
                      g.borderClass,
                    )}
                  >
                    <div className="p-5 pb-2">
                      <div className="flex items-start justify-between">
                        <div
                          className={cn(
                            "inline-flex h-10 w-10 items-center justify-center rounded-lg",
                            g.iconBg,
                            g.iconText,
                          )}
                        >
                          <Icon className="h-5 w-5" aria-hidden />
                        </div>
                        {loading ? (
                          <Skeleton className="h-7 w-12" />
                        ) : (
                          <span className="text-2xl font-bold tabular-nums text-muted-foreground/80">
                            {counts[g.type]}
                          </span>
                        )}
                      </div>
                      <h3 className="mt-3 text-lg font-semibold tracking-tight">{g.title}</h3>
                      <p className="text-xs text-muted-foreground">{g.oneLiner}</p>
                    </div>
                    <div className="px-5 pb-5 pt-0">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {g.description}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {g.examples.map((ex) => (
                          <Badge key={ex} variant="outline" className="text-[10px] font-normal">
                            {ex}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary group-hover:underline">
                        둘러보기
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                      </div>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>

          {/* 연결 흐름 — 접이식으로 축소 (중복 인지부하 제거) */}
          <details className="group mt-4 rounded-2xl border bg-card shadow-sm">
            <summary className="flex cursor-pointer list-none items-center gap-2 p-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-2xl">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Network className="h-4 w-4" aria-hidden />
              </span>
              개념 → 변인 → 측정도구, 어떻게 연결되나요?
              <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden />
            </summary>
            <div className="px-4 pb-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline" className="bg-cat-5/5 text-cat-5 border-cat-5/20">
                  개념
                </Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                <Badge variant="outline" className="bg-info/5 text-info border-info/20">
                  변인
                </Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                <Badge variant="outline" className="bg-success/5 text-success border-success/20">
                  측정도구
                </Badge>
                <span className="ml-2 text-xs text-muted-foreground">
                  어떤 위치에서 시작하든 양방향으로 연결된 다른 항목을 따라갈 수 있습니다.
                </span>
              </div>
            </div>
          </details>
        </section>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* 🧪 연구 · 글쓰기 가이드 */}
        {/* ═══════════════════════════════════════════════════════ */}
        <section aria-labelledby="guides" className="mt-10">
          <ArchiveSectionHeader
            id="guides"
            icon={FlaskConical}
            label="연구 · 글쓰기 가이드"
            description="선행연구·서론 · 연구방법 · 통계방법 · 논문 · 인용 · APA — 연구 여정 순서"
          />

          {/* 선행연구 정리·서론 작성 가이드 — 여정상 방법 선택보다 문헌 고찰이 먼저 (2026-07-19 순서 정렬) */}
          <Link
            href="/archive/literature-review-guide"
            className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
            aria-label="선행연구 정리·서론 작성 가이드 보기"
          >
            <article className="rounded-2xl border-l-4 border-l-teal-400 bg-card shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center gap-4 p-5">
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                  <ListChecks className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold tracking-tight">선행연구 정리·서론 작성 가이드</h3>
                  <p className="text-sm text-muted-foreground">
                    선행연구 3대 질문·정리표·한계→연구모형 도출, 서론 4단계 흐름과 묶어쓰기 3패턴까지 논리 구성 과정을 정리합니다.
                  </p>
                </div>
                <div className="hidden shrink-0 items-center gap-1 text-sm font-medium text-primary group-hover:underline sm:flex">
                  보기
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </div>
              </div>
            </article>
          </Link>

          {/* 연구방법 가이드 */}
          <Link
            href="/archive/research-methods"
            className="group mt-4 block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
            aria-label="교육공학 연구방법 가이드 보기"
          >
            <article className="rounded-2xl border-l-4 border-l-info bg-card shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center gap-4 p-5">
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info/10 text-info">
                  <FlaskConical className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold tracking-tight">교육공학 연구방법 가이드</h3>
                  <p className="text-sm text-muted-foreground">
                    양적·질적·혼합 연구방법론 — 절차·기본 가정·강점·약점과 함께 같은 방법을 사용한 졸업생 학위논문을 연결합니다.
                  </p>
                </div>
                <div className="hidden shrink-0 items-center gap-1 text-sm font-medium text-primary group-hover:underline sm:flex">
                  보기
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </div>
              </div>
            </article>
          </Link>

          {/* 통계방법 가이드 */}
          <Link
            href="/archive/statistical-methods"
            className="group mt-4 block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
            aria-label="교육공학 통계방법 가이드 보기"
          >
            <article className="rounded-2xl border-l-4 border-l-info bg-card shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center gap-4 p-5">
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info/10 text-info">
                  <BarChart3 className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold tracking-tight">교육공학 통계방법 가이드</h3>
                  <p className="text-sm text-muted-foreground">
                    ANOVA · 회귀 · 요인분석 · SEM 등 통계기법을 가정·절차·SPSS/AMOS/R 구문·대안 비교표와 함께 정리합니다.
                  </p>
                </div>
                <div className="hidden shrink-0 items-center gap-1 text-sm font-medium text-primary group-hover:underline sm:flex">
                  보기
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </div>
              </div>
            </article>
          </Link>

          {/* 논문 쓰기 가이드 */}
          <Link
            href="/archive/paper-guide"
            className="group mt-4 block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
            aria-label="논문 쓰기 가이드 보기"
          >
            <article className="rounded-2xl border-l-4 border-l-info bg-card shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center gap-4 p-5">
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info/10 text-info">
                  <FileText className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold tracking-tight">논문 쓰기 가이드</h3>
                  <p className="text-sm text-muted-foreground">
                    서론·이론적 배경·연구방법·연구결과·결론의 장별 구성과 작성 요령, 교육공학 실험 연구 유의사항
                  </p>
                </div>
                <div className="hidden shrink-0 items-center gap-1 text-sm font-medium text-primary group-hover:underline sm:flex">
                  보기
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </div>
              </div>
            </article>
          </Link>

          {/* 학술 글쓰기 가이드 */}
          <Link
            href="/archive/writing-tips"
            className="group mt-4 block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
            aria-label="학술 글쓰기 가이드 보기"
          >
            <article className="rounded-2xl border-l-4 border-l-destructive bg-card shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center gap-4 p-5">
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <PenLine className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold tracking-tight">학술 글쓰기 가이드</h3>
                  <p className="text-sm text-muted-foreground">
                    번역투·주술호응·시제·맞춤법·학술 관례 — ❌ 잘못된 예와 ✅ 권장 예를 짝지어 정리합니다.
                  </p>
                </div>
                <div className="hidden shrink-0 items-center gap-1 text-sm font-medium text-primary group-hover:underline sm:flex">
                  보기
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </div>
              </div>
            </article>
          </Link>

          {/* 논문 인용 가이드 */}
          <Link
            href="/archive/citation-guide"
            className="group mt-4 block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
            aria-label="논문 인용 가이드 보기"
          >
            <article className="rounded-2xl border-l-4 border-l-cyan-400 bg-card shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center gap-4 p-5">
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300">
                  <Quote className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold tracking-tight">논문 인용 가이드</h3>
                  <p className="text-sm text-muted-foreground">
                    직접·간접 인용 구분, 표절 회피, 내 말로 쓰는 법 4단계, 저자 수별 본문 인용 표기와 재인용·윤리 — 인용하는 행위 자체를 다룹니다.
                  </p>
                </div>
                <div className="hidden shrink-0 items-center gap-1 text-sm font-medium text-primary group-hover:underline sm:flex">
                  보기
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </div>
              </div>
            </article>
          </Link>

          {/* APA 7판 참고문헌 가이드 */}
          <Link
            href="/archive/apa-style"
            className="group mt-4 block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
            aria-label="APA 7판 참고문헌 작성 가이드 보기"
          >
            <article className="rounded-2xl border-l-4 border-l-warning bg-card shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center gap-4 p-5">
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
                  <BookText className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold tracking-tight">APA 7판 참고문헌 작성 가이드</h3>
                  <p className="text-sm text-muted-foreground">
                    학위논문·학술지 투고를 위한 인용·참고문헌 형식 요약 — 자료 유형별 형식과 교육공학 예시
                  </p>
                </div>
                <div className="hidden shrink-0 items-center gap-1 text-sm font-medium text-primary group-hover:underline sm:flex">
                  보기
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </div>
              </div>
            </article>
          </Link>
        </section>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* 🕸️ 도구 · 그래프 */}
        {/* ═══════════════════════════════════════════════════════ */}
        <section aria-labelledby="tools" className="mt-10">
          <ArchiveSectionHeader
            id="tools"
            icon={Network}
            label="도구 · 그래프"
            description="6종 자원을 한눈에 잇는 관계 그래프와 사용 안내"
          />

          {/* Anchored Instruction 이론 맥락 배너 */}
          <InlineNotification
            kind="info"
            title="본 아카이브는 학습 anchor 라이브러리입니다"
            description={
              <span>
                CTGV(1990)의 <strong>Anchored Instruction</strong> 이론에 따르면, 학습은 실제
                문제·사례(anchor)에 닻을 내릴 때 의미 있는 전이가 일어납니다. 본 아카이브는
                교육공학 연구의 <strong>개념·변인·측정도구</strong>를 핵심 anchor로 제공하여,
                학습자가 능동적으로 의미를 구성(Constructivism, Piaget)할 수 있도록 연결고리를
                만들어 드립니다.{" "}
                <span className="text-muted-foreground">
                  — Cognition and Technology Group at Vanderbilt, 1990
                </span>
              </span>
            }
          />

          {/* 관계 그래프 진입점 */}
          <Link
            href="/archive/graph"
            className="group mt-4 block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
            aria-label="아카이브 관계 그래프 보기"
          >
            <article className="overflow-hidden rounded-2xl border bg-gradient-to-br from-info/5 via-info/5 to-success/5 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center gap-4 p-5">
                <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/70 text-info shadow-sm dark:bg-muted/60">
                  <Network className="h-6 w-6" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold tracking-tight">
                      🕸️ 교육공학 아카이브 관계 그래프
                    </h3>
                    <Badge variant="outline" className="text-[10px] font-medium border-info/30 bg-white/60 text-info dark:bg-muted/50">
                      NEW
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    개념·변인·측정도구·연구방법·통계방법·기초 용어의 연결고리를 한눈에 탐색합니다. 노드를 드래그·hover·클릭으로 직접 따라가 보세요.
                  </p>
                </div>
                <div className="hidden shrink-0 items-center gap-1 text-sm font-medium text-primary group-hover:underline sm:flex">
                  보기
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </div>
              </div>
            </article>
          </Link>

          {/* 사용 가이드 — 접이식으로 축소 (중복 인지부하 제거) */}
          <details className="group mt-4 rounded-2xl border bg-card shadow-sm">
            <summary className="flex cursor-pointer list-none items-center gap-2 p-4 text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-2xl">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Anchor className="h-4 w-4" aria-hidden />
              </span>
              아카이브 사용 가이드
              <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden />
            </summary>
            <div className="px-4 pb-4">
              <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground leading-relaxed">
                <li>
                  <span className="text-foreground font-medium">개념</span>에서 시작 — 관심 있는
                  이론(예: 자기효능감)을 골라 어떤 변인으로 측정될 수 있는지 확인합니다.
                </li>
                <li>
                  <span className="text-foreground font-medium">변인</span>에서 시작 — 본인 연구가
                  어떤 개념과 닿아 있고 어떤 측정도구로 잴 수 있는지 양방향으로 추적합니다.
                </li>
                <li>
                  <span className="text-foreground font-medium">측정도구</span>에서 시작 — 신뢰도·문항
                  수·저자가 검증된 척도를 먼저 확인하고, 그 도구가 측정하는 변인·개념을 역으로
                  파악합니다.
                </li>
                <li>
                  관심 항목은{" "}
                  <Star className="inline h-3 w-3 text-warning fill-current" aria-hidden />{" "}
                  관심 저장으로 모아두면 다음 방문 때 상단에서 바로 열어볼 수 있습니다.
                </li>
              </ol>
            </div>
          </details>
        </section>

      </div>
    </PageContainer>
  );
}
