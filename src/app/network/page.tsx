"use client";

/**
 * 전공 네트워킹 Map 페이지 (major-network-map MVP)
 *
 * /network — AuthGuard, 100명 이하 회원 가정 단일 스레드 빌드.
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Network as NetworkIcon, BarChart3, Network as NetworkTabIcon, AlertTriangle, BookOpen } from "lucide-react";
import { profilesApi } from "@/lib/bkend";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import PageHeader from "@/components/ui/page-header";
import { Separator } from "@/components/ui/separator";
import SkeletonWidget from "@/components/ui/skeleton-widget";
import { buildNetwork } from "@/features/network/build-network";
import NetworkGraph from "@/features/network/NetworkGraph";
import NetworkControls from "@/features/network/NetworkControls";
import MemberMiniDialog from "@/features/network/MemberMiniDialog";
import NetworkAnalyticsReport from "@/features/network/NetworkAnalyticsReport";
import EmptyState from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import {
  type NetworkFilterState,
  type NetworkNode,
  type User,
} from "@/types";

function NetworkPageContent() {
  const { user } = useAuthStore();
  const currentUserId = user?.id ?? "";
  // Sprint 67-AI: 운영진 분석 리포트 탭
  const isStaff = user?.role === "staff" || user?.role === "admin" || user?.role === "sysadmin";
  const [activeTab, setActiveTab] = useState<"map" | "analytics">("map");

  const { data: usersRes, isLoading, isError, error } = useQuery({
    queryKey: ["network-members"],
    queryFn: () => profilesApi.list({ limit: 1000 }),
    staleTime: 5 * 60_000,
    enabled: !!user,
  });

  const users = (usersRes?.data ?? []) as User[];

  const graph = useMemo(() => {
    if (!currentUserId) {
      return { nodes: [], edges: [], excludedOptOutCount: 0 };
    }
    return buildNetwork(users, currentUserId);
  }, [users, currentUserId]);

  const [filter, setFilter] = useState<NetworkFilterState>({
    enabledKinds: new Set(["cohort", "identity", "school_level"]),
    firstDegreeOnly: false,
    searchText: "",
  });

  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);

  const stats = useMemo(() => {
    const visibleNodes = filter.firstDegreeOnly
      ? graph.nodes.filter((n) => n.isMe || n.isFirstDegree)
      : graph.nodes;
    const visibleEdges = graph.edges.filter((e) => {
      if (filter.enabledKinds.size === 0) return false;
      if (!e.kinds.some((k) => filter.enabledKinds.has(k))) return false;
      if (filter.firstDegreeOnly) {
        return e.source === currentUserId || e.target === currentUserId;
      }
      return true;
    });
    return {
      nodeCount: graph.nodes.length,
      visibleNodeCount: visibleNodes.length,
      edgeCount: graph.edges.length,
      visibleEdgeCount: visibleEdges.length,
      excludedOptOutCount: graph.excludedOptOutCount,
    };
  }, [graph, filter, currentUserId]);

  if (!user) return null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 py-8 sm:py-14">
      <section className="mx-auto max-w-7xl px-4">
        {/* ── 페이지 헤더 ── */}
        <PageHeader
          icon={NetworkIcon}
          title="전공 네트워킹 Map"
          description="동기·신분 유형 기반으로 회원 간 연결망을 시각화합니다. 노드 클릭 시 회원 정보 미니 카드가 표시됩니다."
        />

        <Separator className="mt-6" />

        {/* ── Connectivism 이론 배너 ── */}
        <div
          role="note"
          aria-label="Connectivism 이론 맥락 안내"
          className="mt-5 flex items-start gap-3 rounded-2xl border border-blue-200/70 bg-blue-50/60 p-4 dark:border-blue-800/50 dark:bg-blue-950/20"
        >
          <div
            aria-hidden
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
          >
            <BookOpen size={15} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              학습 공동체 연결망 — Connectivism 이론 기반
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-blue-800/80 dark:text-blue-200/70">
              본 네트워킹 맵은 학회 학습 공동체의 연결망을 시각화합니다.{" "}
              <strong className="font-semibold">Connectivism 이론(Siemens, 2005)</strong>에 따르면
              학습은 사람·자원·도구·도메인 등 다양한 정보 노드 간의 연결에서 일어납니다.
              연결망을 형성·유지·확장하는 능력 자체가 학습이며, 각 회원이 맺는 관계는
              지식 흐름의 경로가 됩니다.
            </p>
            <p className="mt-1 text-[11px] text-blue-700/60 dark:text-blue-300/50">
              Siemens, G. (2005). Connectivism: A learning theory for the digital age.{" "}
              <em>International Journal of Instructional Technology and Distance Learning, 2</em>(1), 3–10.
            </p>
          </div>
        </div>

        {/* ── 본문 ── */}
        {isLoading ? (
          <div className="mt-6">
            <SkeletonWidget rows={6} />
          </div>
        ) : isError ? (
          <div className="mt-6">
            <EmptyState
              icon={AlertTriangle}
              title="회원 데이터를 불러오지 못했어요"
              description={
                error instanceof Error
                  ? error.message
                  : "잠시 후 다시 시도해주세요."
              }
              actionLabel="다시 시도"
              onAction={() => window.location.reload()}
            />
          </div>
        ) : (
          <>
            {/* Sprint 67-AI: 운영진 탭 (지도 / 분석 리포트) */}
            {isStaff && (
              <nav
                aria-label="네트워킹 맵 탭"
                className="mt-5 flex gap-1 border-b"
              >
                {(
                  [
                    { key: "map", label: "네트워킹 지도", icon: NetworkTabIcon },
                    { key: "analytics", label: "분석 리포트", icon: BarChart3 },
                  ] as const
                ).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === key}
                    onClick={() => setActiveTab(key)}
                    className={cn(
                      "flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      activeTab === key
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon size={14} aria-hidden />
                    {label}
                  </button>
                ))}
              </nav>
            )}

            {(!isStaff || activeTab === "map") && (
              <div className="mt-5 grid gap-4 lg:grid-cols-[260px_1fr]">
                {/* ── 좌측 컨트롤 패널 ── */}
                <aside
                  aria-label="네트워크 필터 및 범례"
                  className="rounded-2xl border bg-card p-4 shadow-sm"
                >
                  <NetworkControls
                    filter={filter}
                    onChange={setFilter}
                    stats={stats}
                  />

                  {/* 노드 범례 */}
                  <div className="mt-4 rounded-xl bg-muted/30 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
                    <p className="mb-1.5 font-semibold text-foreground/70">노드 색상</p>
                    <div className="space-y-1">
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className="inline-block h-2.5 w-2.5 rounded-full bg-blue-400"
                        />
                        본인
                      </span>
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400"
                        />
                        1촌 연결
                      </span>
                    </div>
                    <p className="mt-2 text-[10px] text-muted-foreground/70">
                      선 굵기: 동기 굵음 / 신분 보통 / 둘 다 가장 굵음
                    </p>
                  </div>
                </aside>

                {/* ── 그래프 컨테이너 ── */}
                <div
                  aria-label="전공 네트워킹 그래프"
                  className="h-[640px] rounded-2xl border bg-card shadow-sm"
                >
                  <NetworkGraph
                    graph={graph}
                    filter={filter}
                    currentUserId={currentUserId}
                    onNodeClick={setSelectedNode}
                  />
                </div>
              </div>
            )}

            {isStaff && activeTab === "analytics" && (
              <div className="mt-5">
                <NetworkAnalyticsReport graph={graph} />
              </div>
            )}
          </>
        )}

        <MemberMiniDialog
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          edges={graph?.edges}
          currentUserId={currentUserId}
        />
      </section>
    </div>
  );
}

export default function NetworkPage() {
  return (
    <AuthGuard>
      <NetworkPageContent />
    </AuthGuard>
  );
}
