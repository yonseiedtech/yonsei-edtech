"use client";

/**
 * 교육공학 아카이브 관계 그래프 페이지 (/archive/graph)
 *
 * - 풀스크린 SVG 기반 d3-force directed graph
 * - 노드 6종 (concept / variable / measurement / research-method / statistical-method / foundation-term)
 * - 엣지 4종 (variable→concept, measurement→variable, research↔statistical, foundation↔foundation)
 * - 인터랙션: 드래그 / hover 강조 / 클릭 시 상세 페이지 이동 / 노드명 검색 / 노드 종류 필터
 *   + 줌·팬(휠/핀치), 라벨 토글, 노드 간격 슬라이더, 빈 영역 클릭 시 강조 초기화
 *
 * 성능: 노드 200개 미만 가정. 50 tick 후 simulation stop (cleanup 에서도 stop).
 * 라벨은 100개 이상 시 자동 off 권장.
 * 접근성: 검색 input/필터 체크박스 label 연결. 모바일 컨트롤 접기 패턴.
 *
 * set-state-in-effect 회피: d3 simulation 은 ref/SVG 내부에서만 갱신. React state 는
 * 검색·필터·hover/selection·라벨·간격 UI 용도로만 사용.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Network,
  Search,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { forceCenter, forceLink, forceManyBody, forceSimulation } from "d3-force";
import { select } from "d3-selection";
import { drag } from "d3-drag";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import PageHeader from "@/components/ui/page-header";
import PageContainer from "@/components/ui/page-container";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/features/auth/auth-store";
import { isStaffOrAbove } from "@/lib/permissions";
import {
  archiveConceptsApi,
  archiveVariablesApi,
  archiveMeasurementsApi,
  researchMethodsApi,
  statisticalMethodsApi,
  foundationTermsApi,
} from "@/lib/bkend";
import {
  buildGraphData,
  GRAPH_NODE_TYPE_COLORS,
  GRAPH_NODE_TYPE_HREF_PREFIX,
  GRAPH_NODE_TYPE_LABELS,
  type GraphData,
  type GraphLink,
  type GraphNode,
  type GraphNodeType,
} from "@/lib/archive-graph-data";

const NODE_TYPES: GraphNodeType[] = [
  "concept",
  "variable",
  "measurement",
  "research-method",
  "statistical-method",
  "foundation-term",
];

const SVG_WIDTH = 1200;
const SVG_HEIGHT = 720;
const NODE_RADIUS = 10;
const HIGHLIGHT_RADIUS = 14;

/** 노드 간격 슬라이더 기본값 (0~200). 80 = linkDistance 80, manyBody strength -300. */
const DEFAULT_SPACING = 80;
/** 라벨 자동 off 임계값 — 노드가 이보다 많으면 라벨 기본 off */
const AUTO_HIDE_LABEL_THRESHOLD = 100;

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
}

interface SimLink {
  id: string;
  source: SimNode;
  target: SimNode;
  kind: GraphLink["kind"];
}

export default function ArchiveGraphPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const canManage = isStaffOrAbove(user);

  const [graph, setGraph] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [enabledTypes, setEnabledTypes] = useState<Set<GraphNodeType>>(
    () => new Set(NODE_TYPES),
  );
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 라벨 토글 — 사용자가 명시적으로 조작했는지 추적해 자동 off 와 충돌 방지
  const [showLabels, setShowLabels] = useState(true);
  const [labelsManual, setLabelsManual] = useState(false);

  // 노드 간격 슬라이더 (0~200, 기본 80)
  const [spacing, setSpacing] = useState(DEFAULT_SPACING);

  // 모바일 컨트롤 접기/펼치기
  const [controlsOpen, setControlsOpen] = useState(true);

  // ── 1. 데이터 fetch ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [c, v, m, r, s, f] = await Promise.all([
          archiveConceptsApi.list(),
          archiveVariablesApi.list(),
          archiveMeasurementsApi.list(),
          canManage ? researchMethodsApi.list() : researchMethodsApi.listPublished(),
          canManage ? statisticalMethodsApi.list() : statisticalMethodsApi.listPublished(),
          canManage ? foundationTermsApi.list() : foundationTermsApi.listPublished(),
        ]);
        if (cancelled) return;
        const data = buildGraphData({
          concepts: c.data,
          variables: v.data,
          measurements: m.data,
          researchMethods: r.data,
          statisticalMethods: s.data,
          foundationTerms: f.data,
        });
        setGraph(data);
      } catch (err) {
        console.error("[archive-graph] load failed", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canManage]);

  // ── 2. 인접 노드 인덱스 (hover 강조용) ──
  const adjacency = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const node of graph.nodes) {
      map.set(node.id, new Set());
    }
    for (const link of graph.links) {
      map.get(link.source)?.add(link.target);
      map.get(link.target)?.add(link.source);
    }
    return map;
  }, [graph]);

  // ── 3. 검색 매칭 노드 ──
  const matchedIds = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return new Set<string>();
    const set = new Set<string>();
    for (const node of graph.nodes) {
      if (node.label.toLowerCase().includes(q)) set.add(node.id);
    }
    return set;
  }, [query, graph.nodes]);

  // ── 4. 필터링된 노드/엣지 ──
  const visibleNodeIds = useMemo(() => {
    const set = new Set<string>();
    for (const node of graph.nodes) {
      if (enabledTypes.has(node.type)) set.add(node.id);
    }
    return set;
  }, [graph.nodes, enabledTypes]);

  // 필터링 적용 후 통계
  const visibleStats = useMemo(() => {
    const typeSet = new Set<GraphNodeType>();
    let nodeCount = 0;
    for (const node of graph.nodes) {
      if (visibleNodeIds.has(node.id)) {
        nodeCount += 1;
        typeSet.add(node.type);
      }
    }
    let edgeCount = 0;
    for (const link of graph.links) {
      if (visibleNodeIds.has(link.source) && visibleNodeIds.has(link.target)) {
        edgeCount += 1;
      }
    }
    return { nodeCount, edgeCount, typeCount: typeSet.size };
  }, [graph, visibleNodeIds]);

  // ── 노드 다수일 때 라벨 기본 off (사용자 수동 조작 후엔 유지) ──
  useEffect(() => {
    if (loading) return;
    if (labelsManual) return;
    setShowLabels(graph.nodes.length < AUTO_HIDE_LABEL_THRESHOLD);
  }, [graph.nodes.length, loading, labelsManual]);

  // ── L15: ?focus={nodeId} 수신 — 상세 페이지에서 넘어온 노드를 초기 포커스.
  //   focus 는 "{type}:{rawId}" 합성 id 또는 rawId. 로드 완료 후 1회만 적용한다.
  //   검색어를 노드명으로 세팅해 노란 테두리 강조 + 선택 상태로 인접 노드 focus.
  const focusAppliedRef = useRef(false);
  useEffect(() => {
    if (loading || graph.nodes.length === 0 || focusAppliedRef.current) return;
    if (typeof window === "undefined") return;
    const focus = new URLSearchParams(window.location.search).get("focus");
    if (!focus) return;
    const node = graph.nodes.find((n) => n.id === focus || n.rawId === focus);
    if (node) {
      setSelectedId(node.id);
      setQuery(node.label);
    }
    focusAppliedRef.current = true;
  }, [loading, graph.nodes]);

  // ── 5. SVG refs ──
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rootGroupRef = useRef<SVGGElement | null>(null); // 줌·팬용 transform 컨테이너
  const nodesGroupRef = useRef<SVGGElement | null>(null);
  const linksGroupRef = useRef<SVGGElement | null>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // ── 6. d3 simulation 초기화 ──
  // spacing 변경 시 simulation 재구성 (force 재설정 후 alpha restart)
  useEffect(() => {
    if (loading) return;
    if (graph.nodes.length === 0) return;
    const svg = svgRef.current;
    const nodesGroup = nodesGroupRef.current;
    const linksGroup = linksGroupRef.current;
    if (!svg || !nodesGroup || !linksGroup) return;

    // 노드 깊은 복사 (simulation 이 mutate 함)
    const simNodes: SimNode[] = graph.nodes.map((n, i) => ({
      ...n,
      x: SVG_WIDTH / 2 + Math.cos((i / graph.nodes.length) * Math.PI * 2) * 200,
      y: SVG_HEIGHT / 2 + Math.sin((i / graph.nodes.length) * Math.PI * 2) * 200,
      vx: 0,
      vy: 0,
      fx: null,
      fy: null,
    }));
    const nodeById = new Map<string, SimNode>();
    simNodes.forEach((n) => nodeById.set(n.id, n));

    const simLinks: SimLink[] = graph.links
      .map((l) => {
        const s = nodeById.get(l.source);
        const t = nodeById.get(l.target);
        if (!s || !t) return null;
        return { id: l.id, source: s, target: t, kind: l.kind } satisfies SimLink;
      })
      .filter((l): l is SimLink => l !== null);

    // 슬라이더 → linkDistance(40~200) 와 manyBody strength(-150 ~ -500) 비례 조정
    const linkDistance = Math.max(40, spacing);
    const chargeStrength = -150 - spacing * 1.75;

    const simulation = forceSimulation<SimNode>(simNodes)
      .force(
        "link",
        forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance(linkDistance)
          .strength(0.4),
      )
      .force("charge", forceManyBody<SimNode>().strength(chargeStrength))
      .force("center", forceCenter(SVG_WIDTH / 2, SVG_HEIGHT / 2))
      .stop();

    // 50 tick 으로 안정화 후 즉시 정지
    for (let i = 0; i < 50; i++) simulation.tick();

    // ── 렌더링 (d3-selection enter/update/exit) ──
    const linkSel = select(linksGroup)
      .selectAll<SVGLineElement, SimLink>("line.archive-graph-link")
      .data(simLinks, (d) => d.id);
    linkSel.exit().remove();
    const linkEnter = linkSel
      .enter()
      .append("line")
      .attr("class", "archive-graph-link")
      .attr("stroke", "#94a3b8") // slate-400
      .attr("stroke-opacity", 0.5)
      .attr("stroke-width", 1.4);
    const allLinks = linkEnter.merge(linkSel);
    allLinks
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    const nodeSel = select(nodesGroup)
      .selectAll<SVGGElement, SimNode>("g.archive-graph-node")
      .data(simNodes, (d) => d.id);
    nodeSel.exit().remove();
    const nodeEnter = nodeSel
      .enter()
      .append("g")
      .attr("class", "archive-graph-node")
      .attr("tabindex", 0)
      .attr("role", "button")
      .style("cursor", "pointer");
    nodeEnter
      .append("circle")
      .attr("r", NODE_RADIUS)
      .attr("fill", (d) => d.color)
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1.5);
    nodeEnter
      .append("text")
      .attr("class", "archive-graph-label")
      .attr("dy", -NODE_RADIUS - 4)
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
      .attr("fill", "currentColor")
      .attr("pointer-events", "none")
      .text((d) => d.label);
    const allNodes = nodeEnter.merge(nodeSel);
    allNodes.attr("transform", (d) => `translate(${d.x}, ${d.y})`);

    // ── 드래그 핸들러 ──
    const dragBehavior = drag<SVGGElement, SimNode>()
      .on("start", (event, d) => {
        // 드래그 이벤트가 줌 팬 으로 전파되지 않도록 차단
        event.sourceEvent?.stopPropagation();
        d.fx = d.x;
        d.fy = d.y;
        // 드래그 시작 시 잠깐 활성화
        simulation.alphaTarget(0.3).restart();
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        simulation.alphaTarget(0);
        // 좌표를 유지하려면 fx/fy 를 풀지 않음 (사용자가 배치한 위치 유지)
        d.fx = event.x;
        d.fy = event.y;
      });
    allNodes.call(dragBehavior);

    // simulation tick 시 좌표 갱신
    simulation.on("tick", () => {
      allLinks
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);
      allNodes.attr("transform", (d) => `translate(${d.x}, ${d.y})`);
    });

    return () => {
      simulation.stop();
      simulation.on("tick", null);
    };
  }, [graph, loading, spacing]);

  // ── 7. 줌·팬(d3-zoom) 부착 ──
  useEffect(() => {
    if (loading) return;
    if (graph.nodes.length === 0) return;
    const svg = svgRef.current;
    const rootGroup = rootGroupRef.current;
    if (!svg || !rootGroup) return;

    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .filter((event: Event) => {
        // 노드 위에서 시작한 드래그는 d3-drag 가 처리하므로 줌은 건너뜀.
        // mousedown 의 경우 target 이 노드 g 안의 circle 또는 text 면 차단.
        if (event.type === "mousedown" || event.type === "touchstart") {
          const target = event.target as Element | null;
          if (target?.closest("g.archive-graph-node")) return false;
        }
        // 기본 동작: 좌클릭/터치/휠 허용
        const mouseEvent = event as MouseEvent;
        return !mouseEvent.button || mouseEvent.button === 0;
      })
      .on("zoom", (event) => {
        const t = event.transform as { x: number; y: number; k: number };
        rootGroup.setAttribute(
          "transform",
          `translate(${t.x}, ${t.y}) scale(${t.k})`,
        );
      });
    zoomBehaviorRef.current = zoomBehavior;
    select(svg).call(zoomBehavior);
    // 더블클릭 줌 비활성화 — 노드 더블클릭 시 의도치 않은 확대 방지
    select(svg).on("dblclick.zoom", null);

    return () => {
      zoomBehaviorRef.current = null;
      select(svg).on(".zoom", null);
    };
  }, [graph, loading]);

  // ── 8. hover/검색/필터/선택/라벨 강조 ──
  useEffect(() => {
    const nodesGroup = nodesGroupRef.current;
    const linksGroup = linksGroupRef.current;
    if (!nodesGroup || !linksGroup) return;

    const focusedId = hoveredId ?? selectedId;
    const focusedAdjacent = focusedId ? adjacency.get(focusedId) : null;

    select(nodesGroup)
      .selectAll<SVGGElement, SimNode>("g.archive-graph-node")
      .each(function (d) {
        const visible = visibleNodeIds.has(d.id);
        const isFocused = d.id === focusedId;
        const isAdjacent = focusedAdjacent?.has(d.id) ?? false;
        const isMatched = matchedIds.has(d.id);
        const dimmed =
          (focusedId !== null && !isFocused && !isAdjacent) ||
          (matchedIds.size > 0 && !isMatched);
        const g = select<SVGGElement, SimNode>(this);
        g.style("display", visible ? "" : "none")
          .style("opacity", dimmed ? 0.2 : 1);
        g.select<SVGCircleElement>("circle")
          .attr("r", isFocused || isMatched ? HIGHLIGHT_RADIUS : NODE_RADIUS)
          .attr("stroke", isMatched ? "#facc15" : "#ffffff") // yellow-400 ring
          .attr("stroke-width", isMatched ? 3 : 1.5);
        // 라벨: showLabels=false 인 경우 hover/select/match 만 노출
        const labelVisible = showLabels || isFocused || isMatched;
        g.select<SVGTextElement>("text.archive-graph-label").style(
          "display",
          labelVisible ? "" : "none",
        );
      });

    select(linksGroup)
      .selectAll<SVGLineElement, SimLink>("line.archive-graph-link")
      .each(function (l) {
        const sourceVisible = visibleNodeIds.has(l.source.id);
        const targetVisible = visibleNodeIds.has(l.target.id);
        const visible = sourceVisible && targetVisible;
        let opacity = 0.5;
        if (focusedId !== null) {
          const touchesFocus =
            l.source.id === focusedId || l.target.id === focusedId;
          opacity = touchesFocus ? 0.9 : 0.08;
        }
        select(this)
          .style("display", visible ? "" : "none")
          .attr("stroke-opacity", opacity)
          .attr(
            "stroke-width",
            focusedId !== null && (l.source.id === focusedId || l.target.id === focusedId)
              ? 2.2
              : 1.4,
          );
      });
  }, [hoveredId, selectedId, matchedIds, visibleNodeIds, adjacency, showLabels]);

  // ── 9. d3 가 렌더한 노드 그룹에 React state 연동 listener 부착.
  // d3-selection 의 listener 안에서 React setState 를 호출하여 hover/click 상태를 동기화한다.
  useEffect(() => {
    const nodesGroup = nodesGroupRef.current;
    if (!nodesGroup) return;
    const sel = select(nodesGroup).selectAll<SVGGElement, SimNode>("g.archive-graph-node");
    sel
      .on("mouseenter", (_event, d) => {
        setHoveredId(d.id);
      })
      .on("mouseleave", () => {
        setHoveredId(null);
      })
      .on("click", (event, d) => {
        // 빈 영역 클릭(SVG mousedown) 과 구분하기 위해 stopPropagation
        (event as Event).stopPropagation();
        setSelectedId(d.id);
        const prefix = GRAPH_NODE_TYPE_HREF_PREFIX[d.type];
        router.push(`${prefix}/${d.rawId}`);
      })
      .attr("aria-label", (d) => `${GRAPH_NODE_TYPE_LABELS[d.type]} — ${d.label}`);
    return () => {
      sel.on("mouseenter", null).on("mouseleave", null).on("click", null);
    };
  }, [graph, router]);

  // ── 10. UI: 필터 토글 ──
  function toggleType(type: GraphNodeType): void {
    setEnabledTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  // ── 11. 줌 컨트롤 핸들러 ──
  function handleZoomIn(): void {
    const svg = svgRef.current;
    const beh = zoomBehaviorRef.current;
    if (!svg || !beh) return;
    select(svg).transition().duration(180).call(beh.scaleBy, 1.25);
  }
  function handleZoomOut(): void {
    const svg = svgRef.current;
    const beh = zoomBehaviorRef.current;
    if (!svg || !beh) return;
    select(svg).transition().duration(180).call(beh.scaleBy, 0.8);
  }
  function handleZoomReset(): void {
    const svg = svgRef.current;
    const beh = zoomBehaviorRef.current;
    if (!svg || !beh) return;
    select(svg).transition().duration(220).call(beh.transform, zoomIdentity);
  }

  // ── 12. 빈 SVG 영역 클릭 → 강조 초기화 ──
  function handleSvgBackgroundClick(): void {
    setHoveredId(null);
    setSelectedId(null);
  }

  const isEmpty = !loading && graph.nodes.length === 0;

  return (
    <PageContainer width="wide">
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <Link href="/archive">
          <Button variant="ghost" size="sm" className="mb-3">
            <ArrowLeft className="mr-1 h-4 w-4" />
            아카이브
          </Button>
        </Link>

        <PageHeader
          icon={Network}
          title="교육공학 아카이브 관계 그래프"
          description="개념·변인·측정도구·연구방법·통계방법·기초 용어의 연결고리를 한눈에 탐색합니다."
        />

        <Separator className="mt-6" />

        {/* ── 컨트롤: 검색 + 필터 + 라벨/간격 (모바일 collapsible) ── */}
        <Card className="mt-6 rounded-2xl shadow-sm">
          <CardContent className="space-y-4 py-5">
            {/* 모바일 헤더 토글 */}
            <div className="flex items-center justify-between md:hidden">
              <span className="text-sm font-semibold">탐색 컨트롤</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setControlsOpen((v) => !v)}
                aria-expanded={controlsOpen}
                aria-controls="archive-graph-controls"
              >
                {controlsOpen ? (
                  <>
                    접기 <ChevronUp className="ml-1 h-4 w-4" />
                  </>
                ) : (
                  <>
                    펼치기 <ChevronDown className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>

            <div
              id="archive-graph-controls"
              className={`${controlsOpen ? "block" : "hidden"} space-y-4 md:block`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="노드 이름으로 검색"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-9"
                    aria-label="노드 이름 검색"
                  />
                </div>
                {matchedIds.size > 0 && (
                  <Badge variant="outline" className="bg-warning/5 text-warning border-warning/20">
                    {matchedIds.size}개 일치
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {NODE_TYPES.map((type) => {
                  const id = `graph-filter-${type}`;
                  const enabled = enabledTypes.has(type);
                  return (
                    <label
                      key={type}
                      htmlFor={id}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <Checkbox
                        id={id}
                        checked={enabled}
                        onCheckedChange={() => toggleType(type)}
                      />
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: GRAPH_NODE_TYPE_COLORS[type] }}
                        aria-hidden
                      />
                      {GRAPH_NODE_TYPE_LABELS[type]}
                    </label>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
                <label
                  htmlFor="graph-show-labels"
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <Checkbox
                    id="graph-show-labels"
                    checked={showLabels}
                    onCheckedChange={(checked) => {
                      setLabelsManual(true);
                      setShowLabels(checked === true);
                    }}
                  />
                  라벨 보기
                  {!showLabels && graph.nodes.length >= AUTO_HIDE_LABEL_THRESHOLD && (
                    <span className="text-xs text-muted-foreground">
                      (노드 많음 — 자동 숨김)
                    </span>
                  )}
                </label>

                <div className="flex flex-1 items-center gap-3">
                  <label htmlFor="graph-spacing" className="whitespace-nowrap text-sm">
                    노드 간격
                  </label>
                  <input
                    id="graph-spacing"
                    type="range"
                    min={0}
                    max={200}
                    step={10}
                    value={spacing}
                    onChange={(e) => setSpacing(Number(e.target.value))}
                    className="flex-1 accent-info"
                    aria-valuemin={0}
                    aria-valuemax={200}
                    aria-valuenow={spacing}
                  />
                  <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                    {spacing}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── 메인 그래프 ── */}
        {loading ? (
          <Skeleton className="mt-6 h-[600px] w-full rounded-2xl" />
        ) : isEmpty ? (
          <Card className="mt-6 rounded-2xl border-dashed">
            <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
              <Network className="h-10 w-10 text-muted-foreground" aria-hidden />
              <h2 className="text-base font-semibold">표시할 항목이 없습니다</h2>
              <p className="max-w-md text-sm text-muted-foreground">
                공개된 개념·변인·측정도구·연구방법·통계방법·기초 용어가 아직 없습니다.
                운영진이 검수를 마치면 자동으로 그래프에 반영됩니다.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="mt-6 overflow-hidden rounded-2xl shadow-sm">
            <CardContent className="p-0">
              <div className="relative w-full overflow-hidden bg-muted/40">
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                  preserveAspectRatio="xMidYMid meet"
                  className="block h-[70vh] w-full touch-none"
                  role="img"
                  aria-label="아카이브 관계 그래프"
                  onClick={handleSvgBackgroundClick}
                >
                  {/* 줌·팬 transform 컨테이너 */}
                  <g ref={rootGroupRef}>
                    <g ref={linksGroupRef} />
                    <g ref={nodesGroupRef} />
                  </g>
                </svg>

                {/* 통계 박스 (우상단) */}
                <div className="pointer-events-none absolute right-3 top-3 rounded-md border bg-background/85 px-2.5 py-1.5 text-xs shadow-sm backdrop-blur">
                  <span className="font-medium">노드 {visibleStats.nodeCount}개</span>
                  <span className="mx-1 text-muted-foreground">·</span>
                  <span>엣지 {visibleStats.edgeCount}개</span>
                  <span className="mx-1 text-muted-foreground">·</span>
                  <span>종류 {visibleStats.typeCount}개</span>
                </div>

                {/* 줌 컨트롤 (우하단) */}
                <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-background/85 backdrop-blur"
                    onClick={handleZoomIn}
                    aria-label="확대"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-background/85 backdrop-blur"
                    onClick={handleZoomOut}
                    aria-label="축소"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-background/85 backdrop-blur"
                    onClick={handleZoomReset}
                    aria-label="100% 보기"
                    title="100% 보기"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* ── 범례 ── */}
              <div className="flex flex-wrap items-center gap-3 border-t bg-card px-5 py-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">범례</span>
                {NODE_TYPES.map((type) => (
                  <span key={type} className="inline-flex items-center gap-1.5">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: GRAPH_NODE_TYPE_COLORS[type] }}
                      aria-hidden
                    />
                    {GRAPH_NODE_TYPE_LABELS[type]}
                  </span>
                ))}
                <span className="ms-auto">
                  전체 노드 {graph.nodes.length}개 · 엣지 {graph.links.length}개
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── 사용 안내 ── */}
        <Card className="mt-6 rounded-2xl shadow-sm">
          <CardContent className="py-5">
            <h2 className="mb-2 text-sm font-semibold">탐색 방법</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>마우스 휠(또는 모바일 핀치)로 확대·축소, 빈 영역을 드래그하면 화면을 이동할 수 있습니다.</li>
              <li>노드를 드래그해서 위치를 조정할 수 있습니다.</li>
              <li>노드에 마우스를 올리면 직접 연결된 항목만 강조됩니다.</li>
              <li>노드를 클릭하면 해당 항목의 상세 페이지로 이동합니다. 빈 영역을 클릭하면 강조가 해제됩니다.</li>
              <li>검색어를 입력하면 이름이 일치하는 노드를 노란색 테두리로 표시합니다.</li>
              <li>위 체크박스로 6종 노드를 표시/숨김 토글하거나 라벨 표시 여부, 노드 간격을 조정할 수 있습니다.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
