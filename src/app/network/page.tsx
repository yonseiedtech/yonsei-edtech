"use client";

/**
 * 전공 네트워킹 Map 페이지 (major-network-map MVP)
 *
 * /network — AuthGuard, 100명 이하 회원 가정 단일 스레드 빌드.
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Network as NetworkIcon } from "lucide-react";
import { profilesApi } from "@/lib/bkend";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import PageHeader from "@/components/ui/page-header";
import SkeletonWidget from "@/components/ui/skeleton-widget";
import { buildNetwork } from "@/features/network/build-network";
import NetworkGraph from "@/features/network/NetworkGraph";
import NetworkControls from "@/features/network/NetworkControls";
import MemberMiniDialog from "@/features/network/MemberMiniDialog";
import {
  type NetworkFilterState,
  type NetworkNode,
  type User,
} from "@/types";
import { AlertTriangle } from "lucide-react";

function NetworkPageContent() {
  const { user } = useAuthStore();
  const currentUserId = user?.id ?? "";

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
    <div className="py-12">
      <section className="mx-auto max-w-7xl px-4">
        <PageHeader
          icon={<NetworkIcon size={24} />}
          title="전공 네트워킹 Map"
          description="동기·신분 유형 기반으로 회원 간 연결망을 시각화합니다. 노드 클릭 시 회원 정보 미니 카드가 표시됩니다."
        />

        {isLoading ? (
          <div className="mt-6">
            <SkeletonWidget rows={6} />
          </div>
        ) : isError ? (
          <div
            role="alert"
            className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/60 p-5 text-sm dark:border-rose-800 dark:bg-rose-950/30"
          >
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-rose-700 dark:text-rose-300" />
            <div>
              <p className="font-bold text-rose-900 dark:text-rose-100">회원 데이터를 불러오지 못했어요</p>
              <p className="mt-1 text-rose-800/90 dark:text-rose-200/90">
                {error instanceof Error ? error.message : "잠시 후 다시 시도해주세요."}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-[260px_1fr]">
            {/* 좌측 컨트롤 패널 */}
            <aside className="rounded-2xl border bg-card p-4 shadow-sm">
              <NetworkControls filter={filter} onChange={setFilter} stats={stats} />
              <div className="mt-4 rounded-md bg-muted/30 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                <p>
                  <span className="inline-block h-2 w-2 rounded-full bg-blue-400 align-middle" /> 본인 ·
                  <span className="ml-1 inline-block h-2 w-2 rounded-full bg-emerald-400 align-middle" /> 1촌
                </p>
                <p className="mt-1">선 굵기: 동기 굵음 / 신분 보통 / 둘 다 가장 굵음</p>
              </div>
            </aside>

            {/* 그래프 */}
            <div className="h-[640px] rounded-2xl border bg-card shadow-sm">
              <NetworkGraph
                graph={graph}
                filter={filter}
                currentUserId={currentUserId}
                onNodeClick={setSelectedNode}
              />
            </div>
          </div>
        )}

        <MemberMiniDialog node={selectedNode} onClose={() => setSelectedNode(null)} />
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
