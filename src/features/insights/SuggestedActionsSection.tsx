"use client";

/**
 * SuggestedActionsSection — 운영 인사이트 액션화 엔진 (v7 H1, 2026-07-20)
 *
 * 이미 적재 중인 상주 데이터 3소스를 규칙 기반으로 읽어 "지금 할 일"을 제안한다.
 * 관찰용 차트(FunnelSection·SearchMissSection·WeeklyOperationsSummary)를
 * 자동 액션 큐로 전환해 측정→개선 루프를 완성한다. 신규 컬렉션·발송 로직은 만들지 않고
 * 각 제안을 기존 표면(넛지 발송 패널·콘솔 아카이브)으로 딥링크한다.
 *
 * 3소스 → 규칙:
 *   1. 퍼널(user_activity_logs, funnelType=onboarding|diagnostic)
 *        → 진입 표본 충분한 퍼널에서 전환율이 임계 미만인 최대 이탈 지점 → "재개 넛지" 제안
 *   2. 검색 실패(search_misses, count 상위)
 *        → 임계 이상 반복된 질의 → "아카이브 시드 후보 등록" 제안
 *   3. 비활성 코호트(useMemberMetrics 세그먼트 = at_risk/dormant)
 *        → 임계 이상 규모 → "재참여 넛지" 제안
 *
 * read 권한: staff 이상(각 소스 firestore.rules/bkend 권한 그대로). 오류 시 조용히 숨김.
 */

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query as buildQuery,
  where,
} from "firebase/firestore";
import {
  Lightbulb,
  TrendingDown,
  Search,
  UserMinus,
  ArrowRight,
  Send,
  Library,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useMemberMetrics } from "./useMemberMetrics";
import { cn } from "@/lib/utils";
import EmptyState from "@/components/ui/empty-state";

// ── 규칙·임계값 (운영 튜닝용 상수) ──────────────────────────────────────────
/** 퍼널 전환율 경보 임계 — 이전 단계 대비 전환이 이 값 미만이면 이탈 지점으로 승격 */
const FUNNEL_MIN_CONVERSION = 0.5; // 50%
/** 퍼널 진입 최소 표본 — 진입자가 이 미만이면 노이즈로 보고 제안하지 않음 */
const FUNNEL_MIN_ENTRY = 5;
/** 퍼널 이벤트 조회 범위 (일) */
const FUNNEL_WINDOW_DAYS = 30;
/** 검색 실패 시드 후보 최소 반복 횟수 */
const SEARCH_MISS_MIN_COUNT = 3;
/** 검색 실패 액션화 상위 질의 수 */
const SEARCH_MISS_TOP_N = 5;
/** 비활성 코호트 넛지 최소 인원 */
const INACTIVE_MIN_COHORT = 3;

/** 딥링크 — 넛지: 같은 탭 하단의 기존 넛지 발송 패널로 스크롤 (M3 InsightsActionPanel) */
const NUDGE_ANCHOR = "#insights-nudge-panel";
/** 딥링크 — 시드: 콘솔 아카이브(새 항목). name 프리필은 아카이브가 지원하면 자동 반영(현재는 무시) */
const ARCHIVE_SEED_BASE = "/console/archive";

// ── 퍼널 정의 (FunnelSection과 동일 이벤트 스킴) ─────────────────────────────

interface FunnelStep {
  event: string;
  label: string;
}

const ONBOARDING_STEPS: FunnelStep[] = [
  { event: "ui:onboarding/enter", label: "진입" },
  { event: "ui:onboarding/progress", label: "첫 항목 완료" },
  { event: "ui:onboarding/complete", label: "전체 완료" },
];

const DIAGNOSTIC_STEPS: FunnelStep[] = [
  { event: "ui:diagnostic/start", label: "진단 진입" },
  { event: "ui:diagnostic/q1", label: "문항 시작" },
  { event: "ui:diagnostic/complete", label: "제출 완료" },
  { event: "ui:diagnostic/report", label: "리포트 열람" },
];

// ── 데이터 패치 ────────────────────────────────────────────────────────────

interface FunnelRow {
  path: string;
  userId: string;
  createdAt: string;
}

async function fetchFunnelRows(
  funnelType: "onboarding" | "diagnostic",
): Promise<FunnelRow[]> {
  // A2: orderBy 없는 limit(500) 은 문서키 순 앞 500건(과거/임의 표본)만 반환 → 이벤트
  //     누적이 500 초과 시 최근 이탈을 놓치거나 과거 표본 기준으로 오제안한다.
  //     서버측 창(cutoff) 하한 + createdAt 내림차순으로 최신부터 잘라온다.
  //     (복합 인덱스: user_activity_logs funnelType ASC, createdAt DESC)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - FUNNEL_WINDOW_DAYS);
  const cutoffISO = cutoff.toISOString();

  const q = buildQuery(
    collection(db, "user_activity_logs"),
    where("funnelType", "==", funnelType),
    where("createdAt", ">=", cutoffISO),
    orderBy("createdAt", "desc"),
    limit(2000),
  );
  const snap = await getDocs(q);

  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        path: (data.path as string) ?? "",
        userId: (data.userId as string) ?? "",
        createdAt: (data.createdAt as string) ?? "",
      };
    })
    .filter((r) => r.createdAt >= cutoffISO && r.userId && r.path);
}

interface SearchMissRow {
  query: string;
  count: number;
}

async function fetchSearchMisses(): Promise<SearchMissRow[]> {
  const q = buildQuery(
    collection(db, "search_misses"),
    orderBy("count", "desc"),
    limit(SEARCH_MISS_TOP_N),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      query: (data.query as string) ?? d.id,
      count: (data.count as number) ?? 0,
    };
  });
}

interface ActionSourceData {
  onboarding: FunnelRow[];
  diagnostic: FunnelRow[];
  searchMisses: SearchMissRow[];
}

async function fetchActionSources(): Promise<ActionSourceData> {
  const [onboarding, diagnostic, searchMisses] = await Promise.all([
    fetchFunnelRows("onboarding"),
    fetchFunnelRows("diagnostic"),
    fetchSearchMisses(),
  ]);
  return { onboarding, diagnostic, searchMisses };
}

// ── 집계 규칙 ──────────────────────────────────────────────────────────────

/** 단계별 고유 userId 수 */
function computeStepCounts(rows: FunnelRow[], steps: FunnelStep[]): number[] {
  return steps.map(({ event }) => {
    const ids = new Set<string>();
    for (const r of rows) {
      if (r.path === event && r.userId) ids.add(r.userId);
    }
    return ids.size;
  });
}

interface FunnelDrop {
  fromLabel: string;
  toLabel: string;
  dropped: number;
  conversion: number; // 0~1
}

/**
 * 진입 표본이 충분한 퍼널에서, 전환율이 임계 미만인 전환 중 이탈 인원이 최대인 지점을 찾는다.
 * 없으면 null.
 */
function findWorstDrop(counts: number[], steps: FunnelStep[]): FunnelDrop | null {
  const entry = counts[0] ?? 0;
  if (entry < FUNNEL_MIN_ENTRY) return null;

  let worst: FunnelDrop | null = null;
  for (let i = 1; i < counts.length; i++) {
    const prev = counts[i - 1] ?? 0;
    const cur = counts[i] ?? 0;
    if (prev === 0) continue;
    const conversion = cur / prev;
    if (conversion >= FUNNEL_MIN_CONVERSION) continue;
    const dropped = prev - cur;
    if (!worst || dropped > worst.dropped) {
      worst = {
        fromLabel: steps[i - 1].label,
        toLabel: steps[i].label,
        dropped,
        conversion,
      };
    }
  }
  return worst;
}

// ── 제안 모델 ──────────────────────────────────────────────────────────────

type ActionKind = "funnel" | "search" | "inactive";

interface SuggestedAction {
  id: string;
  kind: ActionKind;
  icon: React.ElementType;
  tone: "danger" | "warning" | "info";
  title: string;
  detail: string;
  actionLabel: string;
  /** 내부 라우트면 Link, 앵커(#...)면 같은 탭 스크롤 */
  href: string;
}

const TONE_ICON_WRAP: Record<SuggestedAction["tone"], string> = {
  danger: "bg-destructive/10 text-destructive",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
};

function buildFunnelActions(data: ActionSourceData | undefined): SuggestedAction[] {
  if (!data) return [];
  const out: SuggestedAction[] = [];

  const funnels: {
    key: string;
    name: string;
    rows: FunnelRow[];
    steps: FunnelStep[];
  }[] = [
    { key: "onboarding", name: "온보딩", rows: data.onboarding, steps: ONBOARDING_STEPS },
    { key: "diagnostic", name: "진단평가", rows: data.diagnostic, steps: DIAGNOSTIC_STEPS },
  ];

  for (const f of funnels) {
    const counts = computeStepCounts(f.rows, f.steps);
    const drop = findWorstDrop(counts, f.steps);
    if (!drop) continue;
    out.push({
      id: `funnel-${f.key}`,
      kind: "funnel",
      icon: TrendingDown,
      tone: "danger",
      title: `${f.name} 퍼널 '${drop.toLabel}' 단계 이탈 ${drop.dropped}명`,
      detail: `'${drop.fromLabel}' → '${drop.toLabel}' 전환율이 ${Math.round(drop.conversion * 100)}%로 임계(${Math.round(FUNNEL_MIN_CONVERSION * 100)}%) 미만입니다. 단계 안내를 개선하거나 미완료 회원에게 재개 넛지를 발송하세요.`,
      actionLabel: "재개 넛지 발송",
      href: NUDGE_ANCHOR,
    });
  }
  return out;
}

function buildSearchActions(data: ActionSourceData | undefined): SuggestedAction[] {
  if (!data) return [];
  return data.searchMisses
    .filter((r) => r.count >= SEARCH_MISS_MIN_COUNT)
    .slice(0, SEARCH_MISS_TOP_N)
    .map((r) => ({
      id: `search-${r.query}`,
      kind: "search" as const,
      icon: Search,
      tone: "warning" as const,
      title: `'${r.query}' ${r.count}회 검색됐지만 결과 없음`,
      detail: "반복적으로 찾지만 아카이브에 없는 콘텐츠 갭입니다. 아카이브 시드 후보로 등록해 콘텐츠 공백을 메우세요.",
      actionLabel: "아카이브 시드 등록",
      href: `${ARCHIVE_SEED_BASE}?name=${encodeURIComponent(r.query)}`,
    }));
}

function buildInactiveAction(atRiskCount: number): SuggestedAction[] {
  if (atRiskCount < INACTIVE_MIN_COHORT) return [];
  return [
    {
      id: "inactive-cohort",
      kind: "inactive",
      icon: UserMinus,
      tone: "info",
      title: `비활성·이탈 위험 코호트 ${atRiskCount}명`,
      detail: `로열티 지표상 주의·휴면 세그먼트 회원이 ${atRiskCount}명입니다. 재참여 넛지(인앱·푸시)로 복귀를 유도하세요.`,
      actionLabel: "재참여 넛지 발송",
      href: NUDGE_ANCHOR,
    },
  ];
}

// ── UI ─────────────────────────────────────────────────────────────────────

function ActionCard({ action }: { action: SuggestedAction }) {
  const Icon = action.icon;
  const iconWrap = TONE_ICON_WRAP[action.tone];
  const isAnchor = action.href.startsWith("#");

  const ActionButton = isAnchor ? (
    <a
      href={action.href}
      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
    >
      <Send size={12} />
      {action.actionLabel}
    </a>
  ) : (
    <Link
      href={action.href}
      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
    >
      <Library size={12} />
      {action.actionLabel}
      <ArrowRight size={12} />
    </Link>
  );

  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            iconWrap,
          )}
        >
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{action.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {action.detail}
          </p>
        </div>
      </div>
      <div className="sm:ml-auto">{ActionButton}</div>
    </div>
  );
}

export default function SuggestedActionsSection() {
  const {
    data,
    isLoading: sourcesLoading,
    isError,
  } = useQuery({
    queryKey: ["suggested-actions-sources"],
    staleTime: 5 * 60_000,
    queryFn: fetchActionSources,
  });

  const { rows, isLoading: metricsLoading } = useMemberMetrics(true);

  const atRiskCount = useMemo(
    () => rows.filter((r) => r.segment === "at_risk" || r.segment === "dormant").length,
    [rows],
  );

  const actions = useMemo<SuggestedAction[]>(() => {
    return [
      ...buildFunnelActions(data),
      ...buildInactiveAction(atRiskCount),
      ...buildSearchActions(data),
    ];
  }, [data, atRiskCount]);

  const loading = sourcesLoading || metricsLoading;

  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-bold">
        <Lightbulb size={15} className="text-primary" />
        제안된 운영 액션
        <span className="text-[11px] font-normal text-muted-foreground">
          — 퍼널 이탈 · 검색 실패 · 비활성 코호트 자동 진단
        </span>
      </h2>
      <p className="mb-4 text-[11px] leading-relaxed text-muted-foreground">
        상주 지표를 규칙 기반으로 읽어 &ldquo;지금 할 일&rdquo;을 제안합니다. 각 카드의 버튼은 아래 넛지
        발송 패널 또는 콘솔 아카이브로 바로 연결됩니다.
      </p>

      {loading ? (
        <div className="space-y-3">
          <div className="h-20 animate-pulse rounded-2xl border bg-muted/40" />
          <div className="h-20 animate-pulse rounded-2xl border bg-muted/40" />
        </div>
      ) : isError && actions.length === 0 ? (
        <EmptyState
          compact
          title="데이터 축적 중 — 아직 제안할 액션이 없습니다."
        />
      ) : actions.length === 0 ? (
        <EmptyState
          compact
          title="현재 임계값을 넘는 이탈·검색 실패·비활성 신호가 없습니다."
          description="데이터가 더 쌓이면 제안이 나타납니다."
        />
      ) : (
        <div className="space-y-3">
          {actions.map((action) => (
            <ActionCard key={action.id} action={action} />
          ))}
        </div>
      )}
    </section>
  );
}
