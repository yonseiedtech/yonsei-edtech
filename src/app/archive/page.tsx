"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import PageHeader from "@/components/ui/page-header";
import InlineNotification from "@/components/ui/inline-notification";
import EduTechOverview from "@/components/archive/EduTechOverview";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  archiveConceptsApi,
  archiveVariablesApi,
  archiveMeasurementsApi,
  archiveFavoritesApi,
} from "@/lib/bkend";
import {
  ARCHIVE_ITEM_TYPE_COLORS,
  ARCHIVE_ITEM_TYPE_LABELS,
  type ArchiveFavorite,
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
    borderClass: "border-l-violet-400",
    iconBg: "bg-violet-100 dark:bg-violet-950/60",
    iconText: "text-violet-700 dark:text-violet-300",
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
    borderClass: "border-l-blue-400",
    iconBg: "bg-blue-100 dark:bg-blue-950/60",
    iconText: "text-blue-700 dark:text-blue-300",
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
    borderClass: "border-l-emerald-400",
    iconBg: "bg-emerald-100 dark:bg-emerald-950/60",
    iconText: "text-emerald-700 dark:text-emerald-300",
  },
];

export default function ArchiveLandingPage() {
  const { user } = useAuthStore();
  const [counts, setCounts] = useState<Record<ArchiveItemType, number>>({
    concept: 0,
    variable: 0,
    measurement: 0,
  });
  const [favorites, setFavorites] = useState<ArchiveFavorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [c, v, m] = await Promise.all([
          archiveConceptsApi.list(),
          archiveVariablesApi.list(),
          archiveMeasurementsApi.list(),
        ]);
        if (cancelled) return;
        setCounts({
          concept: c.data.length,
          variable: v.data.length,
          measurement: m.data.length,
        });
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

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 py-8 sm:py-14">
      <div className="mx-auto max-w-5xl px-4">

        {/* ── 페이지 헤더 ── */}
        <PageHeader
          icon={Library}
          title="교육공학 아카이브"
          description="개념 · 변인 · 측정도구를 연결고리로 탐색하는 연구 자원 라이브러리"
        />

        <Separator className="mt-6" />

        {/* ── Anchored Instruction 이론 맥락 배너 ── */}
        <div className="mt-6">
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
        </div>

        {/* ── 교육공학 정의·탐구분야 개관 ── */}
        <EduTechOverview />

        {/* ── 흐름 안내 ── */}
        <Card className="mt-6 rounded-2xl border bg-card shadow-sm">
          <CardContent className="py-5">
            <div className="flex items-center gap-2 text-sm font-medium mb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Network className="h-4 w-4" />
              </span>
              연결 흐름
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline" className="bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800">
                개념
              </Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
              <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                변인
              </Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
              <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                측정도구
              </Badge>
              <span className="ml-2 text-xs text-muted-foreground">
                어떤 위치에서 시작하든 양방향으로 연결된 다른 항목을 따라갈 수 있습니다.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ── 3개 가이드 카드 ── */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
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
                    <h2 className="mt-3 text-lg font-semibold tracking-tight">{g.title}</h2>
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

        {/* ── 사용 가이드 ── */}
        <Card className="mt-6 rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Anchor className="h-4 w-4" aria-hidden />
              </span>
              사용 가이드
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                <Star className="inline h-3 w-3 text-amber-500 fill-current" aria-hidden />{" "}
                관심 저장으로 모아두면 다음 방문 때 상단에서 바로 열어볼 수 있습니다.
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* ── 즐겨찾기 모음 ── */}
        {user && favorites.length > 0 && (
          <Card className="mt-6 rounded-2xl border-amber-200 bg-amber-50/40 shadow-sm dark:border-amber-800 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Star className="h-4 w-4 fill-amber-400 text-amber-500" aria-hidden />
                내 관심 저장 ({favorites.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {favorites.map((f) => (
                  <Link key={f.id} href={`/archive/${f.itemType}/${f.itemId}`}>
                    <Badge
                      variant="outline"
                      className={cn(
                        "cursor-pointer transition-shadow hover:shadow-sm",
                        ARCHIVE_ITEM_TYPE_COLORS[f.itemType],
                      )}
                    >
                      [{ARCHIVE_ITEM_TYPE_LABELS[f.itemType]}] {f.itemName ?? f.itemId}
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
