/**
 * 교육공학 아카이브 관계 그래프 — API 응답 → {nodes, links} 변환 헬퍼.
 *
 * - 노드 6종: concept / variable / measurement / research-method / statistical-method / foundation-term
 * - 엣지 4종:
 *   1) variable.conceptIds → concept                                (variable→concept)
 *   2) measurement.variableIds → variable                           (measurement→variable)
 *   3) research-method.statisticalMethodIds ↔ statistical-method    (양방향)
 *   4) foundation-term.confusedWith → 다른 foundation-term          (양방향)
 *
 * 양방향 엣지는 중복 제거를 위해 정렬한 두 id 의 조합을 key 로 사용.
 */
import type {
  ArchiveConcept,
  ArchiveVariable,
  ArchiveMeasurementTool,
} from "@/types/edutech-archive";
import type { ResearchMethod } from "@/types/research-method";
import type { StatisticalMethod } from "@/types/statistical-method";
import type { FoundationTerm } from "@/types/foundation-term";

export type GraphNodeType =
  | "concept"
  | "variable"
  | "measurement"
  | "research-method"
  | "statistical-method"
  | "foundation-term";

export const GRAPH_NODE_TYPE_LABELS: Record<GraphNodeType, string> = {
  concept: "개념",
  variable: "변인",
  measurement: "측정도구",
  "research-method": "연구방법",
  "statistical-method": "통계방법",
  "foundation-term": "기초 용어",
};

/** 노드 종류별 색상 (Tailwind 표준 팔레트와 톤 일치) */
// QA-v3 M: 전역 규약(ARCHIVE_ITEM_TYPE_COLORS — concept=violet, variable=blue, measurement=emerald)과 정합
export const GRAPH_NODE_TYPE_COLORS: Record<GraphNodeType, string> = {
  concept: "#8b5cf6", // violet-500
  variable: "#3b82f6", // blue-500
  measurement: "#10b981", // emerald-500
  "research-method": "#f43f5e", // rose-500
  "statistical-method": "#f97316", // orange-500
  "foundation-term": "#06b6d4", // cyan-500
};

/** 노드 종류별 라우트 prefix — 클릭 시 상세 페이지 이동 경로 */
export const GRAPH_NODE_TYPE_HREF_PREFIX: Record<GraphNodeType, string> = {
  concept: "/archive/concept",
  variable: "/archive/variable",
  measurement: "/archive/measurement",
  "research-method": "/archive/research-methods",
  "statistical-method": "/archive/statistical-methods",
  "foundation-term": "/archive/foundation-terms",
};

export type GraphLinkKind =
  | "variable-concept"
  | "measurement-variable"
  | "research-statistical"
  | "foundation-confused";

export interface GraphNode {
  id: string; // "{type}:{rawId}" — 컬렉션이 다른 동일 id 충돌 방지
  rawId: string; // 원본 컬렉션 내 id (라우팅용)
  label: string;
  type: GraphNodeType;
  color: string;
}

export interface GraphLink {
  id: string;
  source: string; // GraphNode.id
  target: string; // GraphNode.id
  kind: GraphLinkKind;
}

export interface GraphSourceData {
  concepts: ArchiveConcept[];
  variables: ArchiveVariable[];
  measurements: ArchiveMeasurementTool[];
  researchMethods: ResearchMethod[];
  statisticalMethods: StatisticalMethod[];
  foundationTerms: FoundationTerm[];
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

/** "{type}:{rawId}" 합성 id — 컬렉션 간 id 충돌 방지 */
export function makeNodeId(type: GraphNodeType, rawId: string): string {
  return `${type}:${rawId}`;
}

/**
 * API 응답을 force-directed graph 입력으로 변환.
 * - 양방향 엣지(연구방법↔통계방법, 기초 용어↔기초 용어)는 정렬한 id 쌍 key 로 중복 제거.
 * - source/target 으로 참조된 노드가 존재할 때만 엣지 생성.
 */
export function buildGraphData(source: GraphSourceData): GraphData {
  const nodes: GraphNode[] = [];
  const nodeIdSet = new Set<string>();

  function addNode(type: GraphNodeType, rawId: string, label: string): void {
    const id = makeNodeId(type, rawId);
    if (nodeIdSet.has(id)) return;
    nodeIdSet.add(id);
    nodes.push({
      id,
      rawId,
      label,
      type,
      color: GRAPH_NODE_TYPE_COLORS[type],
    });
  }

  source.concepts.forEach((c) => addNode("concept", c.id, c.name));
  source.variables.forEach((v) => addNode("variable", v.id, v.name));
  source.measurements.forEach((m) => addNode("measurement", m.id, m.name));
  source.researchMethods.forEach((r) => addNode("research-method", r.id, r.name));
  source.statisticalMethods.forEach((s) => addNode("statistical-method", s.id, s.name));
  source.foundationTerms.forEach((f) => addNode("foundation-term", f.id, f.term));

  const links: GraphLink[] = [];
  const linkKeySet = new Set<string>();

  function addLink(
    sourceId: string,
    targetId: string,
    kind: GraphLinkKind,
    bidirectional: boolean,
  ): void {
    if (!nodeIdSet.has(sourceId) || !nodeIdSet.has(targetId)) return;
    if (sourceId === targetId) return;
    const key = bidirectional
      ? `${kind}:${[sourceId, targetId].sort().join("|")}`
      : `${kind}:${sourceId}->${targetId}`;
    if (linkKeySet.has(key)) return;
    linkKeySet.add(key);
    links.push({
      id: key,
      source: sourceId,
      target: targetId,
      kind,
    });
  }

  // (1) variable → concept
  source.variables.forEach((v) => {
    const variableNodeId = makeNodeId("variable", v.id);
    (v.conceptIds ?? []).forEach((cid) => {
      addLink(variableNodeId, makeNodeId("concept", cid), "variable-concept", false);
    });
  });

  // (2) measurement → variable
  source.measurements.forEach((m) => {
    const measurementNodeId = makeNodeId("measurement", m.id);
    (m.variableIds ?? []).forEach((vid) => {
      addLink(measurementNodeId, makeNodeId("variable", vid), "measurement-variable", false);
    });
  });

  // (3) research-method ↔ statistical-method (양방향)
  source.researchMethods.forEach((r) => {
    const researchNodeId = makeNodeId("research-method", r.id);
    (r.statisticalMethodIds ?? []).forEach((sid) => {
      addLink(researchNodeId, makeNodeId("statistical-method", sid), "research-statistical", true);
    });
  });
  // 통계방법 쪽에서도 relatedResearchMethodIds 로 같은 엣지 보강 (양방향 key 로 dedup)
  source.statisticalMethods.forEach((s) => {
    const statisticalNodeId = makeNodeId("statistical-method", s.id);
    (s.relatedResearchMethodIds ?? []).forEach((rid) => {
      addLink(statisticalNodeId, makeNodeId("research-method", rid), "research-statistical", true);
    });
  });

  // (4) foundation-term ↔ foundation-term (confusedWith 양방향)
  source.foundationTerms.forEach((f) => {
    const foundationNodeId = makeNodeId("foundation-term", f.id);
    (f.confusedWith ?? []).forEach((c) => {
      if (!c.confusedTermId) return; // 외부 자유텍스트는 노드가 없으므로 skip
      addLink(
        foundationNodeId,
        makeNodeId("foundation-term", c.confusedTermId),
        "foundation-confused",
        true,
      );
    });
  });

  return { nodes, links };
}
