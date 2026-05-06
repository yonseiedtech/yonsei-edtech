"use client";

/**
 * 전공 네트워킹 그래프 (major-network-map MVP)
 *
 * react-flow 11 + Custom MemberNode + 자동 force layout (간이판 — 원형 + 클러스터 위치)
 * 100명 이하 규모 가정. N>200 시 dagre/d3-force 레이아웃 도입 권장.
 */

import { useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Edge as RFEdge,
  type Node as RFNode,
} from "reactflow";
import "reactflow/dist/style.css";
import MemberNode, { type MemberNodeData } from "./MemberNode";
import type {
  NetworkEdge,
  NetworkFilterState,
  NetworkGraph as NetworkGraphType,
  NetworkNode,
} from "@/types";

const nodeTypes = { member: MemberNode };

interface NetworkGraphProps {
  graph: NetworkGraphType;
  filter: NetworkFilterState;
  currentUserId: string;
  onNodeClick: (node: NetworkNode) => void;
}

interface PositionedNode extends NetworkNode {
  position: { x: number; y: number };
}

/**
 * 간이 레이아웃 — 본인을 중심에, 1촌을 안쪽 원에, 그 외를 바깥 원에 배치.
 * 같은 cohort 끼리는 각도상 인접하도록 그룹화.
 */
function layoutNodes(graph: NetworkGraphType): PositionedNode[] {
  const center = { x: 0, y: 0 };
  const innerRadius = 220;
  const outerRadius = 420;

  const me = graph.nodes.find((n) => n.isMe);
  const firstDegree = graph.nodes.filter((n) => n.isFirstDegree && !n.isMe);
  const others = graph.nodes.filter((n) => !n.isMe && !n.isFirstDegree);

  // cohort 별로 그룹화 (같은 동기는 가까이)
  function groupByCohort(list: NetworkNode[]): NetworkNode[] {
    const buckets = new Map<string, NetworkNode[]>();
    for (const n of list) {
      const key = n.cohortKey ?? "_none";
      const arr = buckets.get(key) ?? [];
      arr.push(n);
      buckets.set(key, arr);
    }
    // bucket 끼리 cohortKey 순서로 정렬 (시각 일관성)
    return Array.from(buckets.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .flatMap(([, arr]) => arr);
  }

  const fdSorted = groupByCohort(firstDegree);
  const otherSorted = groupByCohort(others);

  const positioned: PositionedNode[] = [];

  if (me) {
    positioned.push({ ...me, position: center });
  }

  fdSorted.forEach((n, i) => {
    const angle = (i / Math.max(fdSorted.length, 1)) * Math.PI * 2;
    positioned.push({
      ...n,
      position: {
        x: Math.cos(angle) * innerRadius,
        y: Math.sin(angle) * innerRadius,
      },
    });
  });

  otherSorted.forEach((n, i) => {
    const angle = (i / Math.max(otherSorted.length, 1)) * Math.PI * 2;
    // 바깥 원의 시작 각도를 살짝 비틀어 1촌과 겹치지 않게
    positioned.push({
      ...n,
      position: {
        x: Math.cos(angle + Math.PI / 8) * outerRadius,
        y: Math.sin(angle + Math.PI / 8) * outerRadius,
      },
    });
  });

  return positioned;
}

function shouldShowEdge(
  edge: NetworkEdge,
  filter: NetworkFilterState,
): boolean {
  if (filter.enabledKinds.size === 0) return false;
  return edge.kinds.some((k) => filter.enabledKinds.has(k));
}

export default function NetworkGraph({
  graph,
  filter,
  currentUserId,
  onNodeClick,
}: NetworkGraphProps) {
  const positionedNodes = useMemo(() => layoutNodes(graph), [graph]);

  const searchLower = filter.searchText.trim().toLowerCase();
  const matchesSearch = (n: NetworkNode) => {
    if (!searchLower) return false;
    if (n.name.toLowerCase().includes(searchLower)) return true;
    if (`${n.generation}기`.includes(searchLower)) return true;
    if (n.generation.toString() === searchLower) return true;
    return false;
  };

  // 1촌 only 필터 시 — 본인 + 1촌 + 본인-1촌 엣지만 표시
  const visibleNodeIds = useMemo(() => {
    const set = new Set<string>();
    for (const n of graph.nodes) {
      if (filter.firstDegreeOnly && !n.isMe && !n.isFirstDegree) continue;
      set.add(n.id);
    }
    return set;
  }, [graph.nodes, filter.firstDegreeOnly]);

  const rfNodes: RFNode<MemberNodeData>[] = positionedNodes
    .filter((n) => visibleNodeIds.has(n.id))
    .map((n) => {
      const data: MemberNodeData = {
        ...n,
        dimmed: searchLower ? !matchesSearch(n) && !n.isMe : false,
        highlighted: searchLower ? matchesSearch(n) : false,
      };
      return {
        id: n.id,
        type: "member",
        position: n.position,
        data,
        draggable: true,
        connectable: false,
      };
    });

  const rfEdges: RFEdge[] = graph.edges
    .filter((e) => shouldShowEdge(e, filter))
    .filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target))
    .filter((e) => {
      // 1촌 only: 본인이 한 끝점일 것
      if (!filter.firstDegreeOnly) return true;
      return e.source === currentUserId || e.target === currentUserId;
    })
    .map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      style: {
        strokeWidth: e.weight,
        stroke: e.kinds.includes("cohort")
          ? "var(--color-primary, hsl(217 91% 60%))"
          : "var(--color-muted-foreground, hsl(220 9% 46%))",
        opacity: 0.6,
      },
    }));

  // ESC: 모달 빠지면 onNodeClick null 처리는 부모에서
  const [, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={nodeTypes}
      onNodeClick={(_, node) => {
        const original = graph.nodes.find((g) => g.id === node.id);
        if (original) onNodeClick(original);
      }}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.2}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      panOnScroll
      selectionOnDrag={false}
    >
      <Background gap={24} size={1} />
      <Controls showInteractive={false} />
      <MiniMap
        nodeColor={(n) => {
          const data = n.data as MemberNodeData | undefined;
          if (!data) return "#94a3b8";
          if (data.isMe) return "#3b82f6";
          if (data.isFirstDegree) return "#10b981";
          return "#cbd5e1";
        }}
        pannable
        zoomable
      />
    </ReactFlow>
  );
}
