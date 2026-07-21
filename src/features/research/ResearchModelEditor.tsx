"use client";

/**
 * 연구 모형(research model) 다이어그램 에디터 (2026-06, 신규)
 *
 * 석사과정 학생이 자기 연구의 변인 간 관계(독립→종속, 매개, 조절 등)를
 * 시각적으로 그리는 reactflow v11 기반 컨트롤드 컴포넌트.
 *
 * 패턴 출처: src/features/network/{NetworkGraph,MemberNode}.tsx
 *  - reactflow v11 import 방식 / 커스텀 노드 + Handle / ReactFlowProvider 래핑
 *  - Tailwind 시맨틱 토큰 + dark: 변형, cn() 헬퍼
 *
 * 컨트롤드 계약: value(ResearchModelData) ↔ onChange(next).
 *  - 내부 useNodesState/useEdgesState 로 인터랙션 처리 후 onChange 로 직렬화 전달.
 *  - 외부 value 변경 시 useEffect 로 동기화하되, 직전에 내가 emit 한 값이면 무시(무한루프 가드).
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  Handle,
  Position,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  type OnSelectionChangeParams,
} from "reactflow";
import "reactflow/dist/style.css";
import { toPng } from "html-to-image";
import { Copy, Download, HelpCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  generateQuestions,
  QUESTION_PATTERN_LABELS,
  type GeneratedQuestion,
} from "@/lib/research-question-generator";
import {
  EMPTY_RESEARCH_MODEL,
  RELATION_LABELS,
  VARIABLE_KINDS,
  VARIABLE_KIND_LABELS,
  VARIABLE_KIND_SHORT,
  VARIABLE_NODE_TYPE,
  VARIABLE_PALETTE,
  edgeToFlow,
  fromFlow,
  readRelation,
  toFlow,
  type RelationKind,
  type ResearchModelData,
  type VariableKind,
  type VariableNodeData,
} from "@/types/research-model";

// ── 커스텀 변인 노드 ───────────────────────────────────────

function VariableNode({ data, selected }: NodeProps<VariableNodeData>) {
  const palette = VARIABLE_PALETTE[data.kind];
  const showHandles = !data.readOnly;
  return (
    <div
      className={cn(
        "min-w-[120px] max-w-[200px] rounded-lg border px-3 py-2 shadow-sm transition-shadow",
        palette.bg,
        palette.border,
        selected && "ring-2 ring-primary ring-offset-1 ring-offset-background shadow-md",
      )}
    >
      <span
        className={cn(
          "inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold",
          palette.badge,
        )}
      >
        {VARIABLE_KIND_SHORT[data.kind]}
      </span>
      <p
        className={cn(
          "mt-1 break-keep text-sm font-medium leading-tight",
          palette.text,
        )}
      >
        {data.label || "(이름 없음)"}
      </p>

      {/* 좌우 연결 핸들 — readOnly 시 숨김 */}
      <Handle
        type="target"
        position={Position.Left}
        className={cn("!h-2 !w-2 !bg-foreground/40", !showHandles && "!opacity-0")}
        isConnectable={showHandles}
      />
      <Handle
        type="source"
        position={Position.Right}
        className={cn("!h-2 !w-2 !bg-foreground/40", !showHandles && "!opacity-0")}
        isConnectable={showHandles}
      />
    </div>
  );
}

const nodeTypes = { [VARIABLE_NODE_TYPE]: VariableNode };

// ── props ──────────────────────────────────────────────────

interface ResearchModelEditorProps {
  value: ResearchModelData;
  onChange: (next: ResearchModelData) => void;
  readOnly?: boolean;
  /**
   * 생성된 연구문제를 외부(보고서/계획서)로 전달할 때 호출.
   * 주어지면 미리보기 패널에 "보고서/계획서에 반영" 버튼이 나타난다. (없으면 복사만 제공)
   */
  onApplyQuestions?: (questions: string[]) => void;
}

let idCounter = 0;
function genId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}

/** 두 모형이 의미상 동일한지 가벼운 비교 (무한루프 가드용) */
function sameModel(a: ResearchModelData, b: ResearchModelData): boolean {
  if (a === b) return true;
  if (a.nodes.length !== b.nodes.length || a.edges.length !== b.edges.length) {
    return false;
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

// ── 내부 에디터 (Provider 내부에서만 동작) ────────────────

function ResearchModelEditorInner({
  value,
  onChange,
  readOnly = false,
  onApplyQuestions,
}: ResearchModelEditorProps) {
  const initial = useMemo(() => toFlow(value, { readOnly }), []); // eslint-disable-line react-hooks/exhaustive-deps -- mount-once: initial flow layout computed only on mount, value/readOnly changes handled separately
  const [nodes, setNodes, onNodesChange] = useNodesState<VariableNodeData>(
    initial.nodes,
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [addKind, setAddKind] = useState<VariableKind>("independent");

  const flowWrapperRef = useRef<HTMLDivElement>(null);

  /**
   * 직전에 내가 emit 한 직렬화 값. 부모가 그대로 되돌려줘도 재동기화하지 않기 위한 가드.
   * (부모가 value 를 새로 만들어 내려보내면 동일성 비교로 무한루프 방지)
   */
  const lastEmittedRef = useRef<ResearchModelData>(value);

  // ── 부모로 직렬화 전달 ──
  const emit = useCallback(
    (nextNodes: Node<VariableNodeData>[], nextEdges: Edge[]) => {
      const data = fromFlow(nextNodes, nextEdges);
      lastEmittedRef.current = data;
      onChange(data);
    },
    [onChange],
  );

  // ── 외부 value → 내부 상태 동기화 (무한루프 가드) ──
  useEffect(() => {
    if (sameModel(value, lastEmittedRef.current)) return; // 내가 emit 한 것 → 무시
    const next = toFlow(value, { readOnly });
    lastEmittedRef.current = value;
    setNodes(next.nodes);
    setEdges(next.edges);
  }, [value, readOnly, setNodes, setEdges]);

  // ── 인터랙션 핸들러 (변경 적용 후 emit) ──
  const handleNodesChange = useCallback<typeof onNodesChange>(
    (changes) => {
      onNodesChange(changes);
      setNodes((curr) => {
        // onNodesChange 가 큐잉한 변경을 setNodes 콜백 시점의 최신 상태로 emit
        emit(curr, edges);
        return curr;
      });
    },
    [onNodesChange, setNodes, edges, emit],
  );

  const handleEdgesChange = useCallback<typeof onEdgesChange>(
    (changes) => {
      onEdgesChange(changes);
      setEdges((curr) => {
        emit(nodes, curr);
        return curr;
      });
    },
    [onEdgesChange, setEdges, nodes, emit],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const newEdge = edgeToFlow(
        {
          id: genId("e"),
          source: connection.source,
          target: connection.target,
          relation: "causal",
        },
        readOnly,
      );
      setEdges((curr) => {
        const next = addEdge(newEdge, curr);
        emit(nodes, next);
        return next;
      });
    },
    [setEdges, nodes, emit, readOnly],
  );

  const onSelectionChange = useCallback(
    ({ nodes: selNodes, edges: selEdges }: OnSelectionChangeParams) => {
      setSelectedNodeId(selNodes[0]?.id ?? null);
      setSelectedEdgeId(selEdges[0]?.id ?? null);
    },
    [],
  );

  // ── 툴바: 변인 추가 ──
  const addNode = useCallback(() => {
    const id = genId("n");
    // 화면 중앙 부근에 약간씩 흩뿌려 겹침 방지
    const offset = nodes.length * 28;
    const newNode: Node<VariableNodeData> = {
      id,
      type: VARIABLE_NODE_TYPE,
      position: { x: 80 + (offset % 240), y: 80 + (offset % 180) },
      data: {
        label: VARIABLE_KIND_LABELS[addKind],
        kind: addKind,
        readOnly,
      },
      draggable: !readOnly,
      connectable: !readOnly,
      deletable: !readOnly,
    };
    setNodes((curr) => {
      const next = [...curr, newNode];
      emit(next, edges);
      return next;
    });
    setSelectedNodeId(id);
    setSelectedEdgeId(null);
  }, [addKind, nodes.length, setNodes, edges, emit, readOnly]);

  // ── 선택 노드 라벨/종류 편집 ──
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId) ?? null;

  const patchNode = useCallback(
    (patch: Partial<Pick<VariableNodeData, "label" | "kind">>) => {
      if (!selectedNodeId) return;
      setNodes((curr) => {
        const next = curr.map((n) =>
          n.id === selectedNodeId
            ? { ...n, data: { ...n.data, ...patch } }
            : n,
        );
        emit(next, edges);
        return next;
      });
    },
    [selectedNodeId, setNodes, edges, emit],
  );

  // ── 선택 엣지 라벨/관계 편집 ──
  const patchEdgeLabel = useCallback(
    (label: string) => {
      if (!selectedEdgeId) return;
      setEdges((curr) => {
        const next = curr.map((e) =>
          e.id === selectedEdgeId ? { ...e, label: label || undefined } : e,
        );
        emit(nodes, next);
        return next;
      });
    },
    [selectedEdgeId, setEdges, nodes, emit],
  );

  const patchEdgeRelation = useCallback(
    (relation: RelationKind) => {
      if (!selectedEdgeId) return;
      setEdges((curr) => {
        const next = curr.map((e) => {
          if (e.id !== selectedEdgeId) return e;
          // edgeToFlow 로 스타일/마커 일관 재구성 (라벨 유지)
          const rebuilt = edgeToFlow(
            {
              id: e.id,
              source: e.source,
              target: e.target,
              label: typeof e.label === "string" ? e.label : undefined,
              relation,
            },
            readOnly,
          );
          return rebuilt;
        });
        emit(nodes, next);
        return next;
      });
    },
    [selectedEdgeId, setEdges, nodes, emit, readOnly],
  );

  // ── 삭제 (선택 노드 또는 엣지) ──
  const deleteSelection = useCallback(() => {
    if (selectedNodeId) {
      setNodes((currNodes) => {
        const nextNodes = currNodes.filter((n) => n.id !== selectedNodeId);
        setEdges((currEdges) => {
          const nextEdges = currEdges.filter(
            (e) => e.source !== selectedNodeId && e.target !== selectedNodeId,
          );
          emit(nextNodes, nextEdges);
          return nextEdges;
        });
        return nextNodes;
      });
      setSelectedNodeId(null);
      return;
    }
    if (selectedEdgeId) {
      setEdges((curr) => {
        const next = curr.filter((e) => e.id !== selectedEdgeId);
        emit(nodes, next);
        return next;
      });
      setSelectedEdgeId(null);
    }
  }, [selectedNodeId, selectedEdgeId, setNodes, setEdges, nodes, emit]);

  // Delete/Backspace 키 — 입력 필드 포커스 중이 아닐 때만
  useEffect(() => {
    if (readOnly) return;
    function onKey(ev: KeyboardEvent) {
      if (ev.key !== "Delete" && ev.key !== "Backspace") return;
      const target = ev.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) {
        return;
      }
      if (selectedNodeId || selectedEdgeId) {
        ev.preventDefault();
        deleteSelection();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [readOnly, selectedNodeId, selectedEdgeId, deleteSelection]);

  // ── 연구문제 생성 (현재 캔버스의 변인·관계 기반) ──
  const [questions, setQuestions] = useState<GeneratedQuestion[] | null>(null);
  const generateQuestionsFromCanvas = useCallback(() => {
    const data = fromFlow(nodes, edges);
    const result = generateQuestions(data);
    setQuestions(result);
    if (result.length === 0) {
      toast.info("변인을 추가하면 연구문제를 생성할 수 있습니다.");
    }
  }, [nodes, edges]);

  const copyQuestions = useCallback(async () => {
    if (!questions || questions.length === 0) return;
    const text = questions.map((q, i) => `${i + 1}. ${q.text}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("연구문제를 복사했습니다.");
    } catch {
      toast.error("복사에 실패했습니다.");
    }
  }, [questions]);

  // ── PNG 내보내기 (html-to-image) ──
  const [exporting, setExporting] = useState(false);
  const exportPng = useCallback(async () => {
    const el = flowWrapperRef.current?.querySelector(
      ".react-flow__viewport",
    ) as HTMLElement | null;
    const target = el ?? flowWrapperRef.current;
    if (!target) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(target, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
        cacheBust: true,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `research-model-${Date.now()}.png`;
      a.click();
      toast.success("연구 모형 이미지를 저장했습니다.");
    } catch {
      toast.error("이미지 내보내기에 실패했습니다.");
    } finally {
      setExporting(false);
    }
  }, []);

  const hasSelection = Boolean(selectedNodeId || selectedEdgeId);

  return (
    <div className="flex flex-col gap-3">
      {/* ── 툴바 ── */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2">
          {/* 변인 추가 */}
          <div className="inline-flex items-center overflow-hidden rounded-md border border-input">
            <label className="sr-only" htmlFor="rm-add-kind">
              추가할 변인 종류
            </label>
            <select
              id="rm-add-kind"
              value={addKind}
              onChange={(e) => setAddKind(e.target.value as VariableKind)}
              className="h-8 bg-transparent px-2 text-xs font-medium text-foreground focus:outline-none"
            >
              {VARIABLE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {VARIABLE_KIND_LABELS[k]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addNode}
              className="flex h-8 items-center gap-1 border-l border-input bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              변인 추가
            </button>
          </div>

          {/* 삭제 */}
          <button
            type="button"
            onClick={deleteSelection}
            disabled={!hasSelection}
            className={cn(
              "flex h-8 items-center gap-1 rounded-md border border-input px-2.5 text-xs font-medium",
              hasSelection
                ? "text-destructive hover:bg-destructive/5"
                : "cursor-not-allowed text-muted-foreground opacity-60",
            )}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            선택 삭제
          </button>

          {/* PNG 내보내기 */}
          <button
            type="button"
            onClick={exportPng}
            disabled={exporting}
            className="flex h-8 items-center gap-1 rounded-md border border-input px-2.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-60"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            {exporting ? "내보내는 중…" : "PNG 내보내기"}
          </button>

          {/* 연구문제 생성 */}
          <button
            type="button"
            onClick={generateQuestionsFromCanvas}
            className="flex h-8 items-center gap-1 rounded-md border border-primary/40 bg-primary/5 px-2.5 text-xs font-medium text-primary hover:bg-primary/10"
          >
            <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
            연구문제 생성
          </button>

          <span className="ml-auto hidden text-[11px] text-muted-foreground sm:inline">
            노드를 드래그해 배치하고, 핸들을 끌어 관계를 연결하세요. (Delete 키로 삭제)
          </span>
        </div>
      )}

      {/* ── 본문: 캔버스 + 편집 패널 ── */}
      <div className="flex flex-col gap-3 lg:flex-row">
        {/* 캔버스 */}
        {/* 사이클 100: A4 가로 비율(297:210) 보드 — 논문 삽입용. 과도한 축소 방지(minZoom 상향) */}
        <div
          ref={flowWrapperRef}
          className="aspect-[297/210] max-h-[80vh] w-full max-w-[1100px] flex-1 overflow-hidden rounded-lg border border-border bg-white dark:bg-muted/20"
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={readOnly ? undefined : handleNodesChange}
            onEdgesChange={readOnly ? undefined : handleEdgesChange}
            onConnect={readOnly ? undefined : onConnect}
            onSelectionChange={onSelectionChange}
            nodesDraggable={!readOnly}
            nodesConnectable={!readOnly}
            elementsSelectable
            deleteKeyCode={null}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            minZoom={0.55}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={20} size={1} />
            <Controls showInteractive={false} />
            <MiniMap
              nodeColor={(n) => {
                const kind = (n.data as VariableNodeData | undefined)?.kind;
                return kind ? VARIABLE_PALETTE[kind].hex : "#94a3b8";
              }}
              pannable
              zoomable
            />
          </ReactFlow>
        </div>

        {/* 편집 패널 — readOnly 가 아니고 무언가 선택됐을 때만 */}
        {!readOnly && (selectedNode || selectedEdge) && (
          <aside className="w-full shrink-0 rounded-lg border border-border bg-card p-3 lg:w-64">
            {selectedNode && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">변인 편집</h3>
                <div>
                  <label
                    htmlFor="rm-node-label"
                    className="mb-1 block text-xs font-medium text-muted-foreground"
                  >
                    이름
                  </label>
                  <input
                    id="rm-node-label"
                    type="text"
                    value={selectedNode.data.label}
                    onChange={(e) => patchNode({ label: e.target.value })}
                    placeholder="예: 자기조절학습"
                    className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label
                    htmlFor="rm-node-kind"
                    className="mb-1 block text-xs font-medium text-muted-foreground"
                  >
                    종류
                  </label>
                  <select
                    id="rm-node-kind"
                    value={selectedNode.data.kind}
                    onChange={(e) =>
                      patchNode({ kind: e.target.value as VariableKind })
                    }
                    className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {VARIABLE_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {VARIABLE_KIND_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {selectedEdge && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">관계 편집</h3>
                <div>
                  <label
                    htmlFor="rm-edge-label"
                    className="mb-1 block text-xs font-medium text-muted-foreground"
                  >
                    라벨 (예: H1, +, −, 정(+))
                  </label>
                  <input
                    id="rm-edge-label"
                    type="text"
                    value={
                      typeof selectedEdge.label === "string"
                        ? selectedEdge.label
                        : ""
                    }
                    onChange={(e) => patchEdgeLabel(e.target.value)}
                    placeholder="예: H1"
                    className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">
                    관계 유형
                  </span>
                  <div className="inline-flex overflow-hidden rounded-md border border-input">
                    {(Object.keys(RELATION_LABELS) as RelationKind[]).map(
                      (rel) => {
                        const active = readRelation(selectedEdge) === rel;
                        return (
                          <button
                            key={rel}
                            type="button"
                            onClick={() => patchEdgeRelation(rel)}
                            className={cn(
                              "h-8 px-2.5 text-xs font-medium",
                              active
                                ? "bg-primary text-primary-foreground"
                                : "bg-transparent text-foreground hover:bg-muted",
                            )}
                          >
                            {RELATION_LABELS[rel]}
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* ── 연구문제 미리보기 패널 (생성 버튼 클릭 후 노출) ── */}
      {questions !== null && (
        <div className="rounded-lg border border-primary/30 bg-primary/[0.03] p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-primary" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-foreground">
                생성된 연구문제 {questions.length > 0 && `(${questions.length})`}
              </h3>
            </div>
            {questions.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={copyQuestions}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground hover:bg-muted"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  복사
                </button>
                {onApplyQuestions && (
                  <button
                    type="button"
                    onClick={() => onApplyQuestions(questions.map((q) => q.text))}
                    className="inline-flex h-8 items-center gap-1 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    보고서/계획서에 반영
                  </button>
                )}
              </div>
            )}
          </div>

          {questions.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              연구문제를 만들려면 변인(독립·종속 등)을 추가하고 관계를 연결해 주세요.
            </p>
          ) : (
            <>
              <ol className="mt-2.5 space-y-1.5">
                {questions.map((q, i) => (
                  <li key={q.id} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[11px] font-bold text-primary">
                      {i + 1}
                    </span>
                    <span className="flex-1 leading-relaxed">
                      {q.text}
                      <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {QUESTION_PATTERN_LABELS[q.pattern]}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-2.5 text-[11px] text-muted-foreground">
                모형 구조로 자동 생성한 초안입니다. 그대로 쓰기보다 연구 맥락에 맞게 다듬어 사용하세요.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── 공개 컴포넌트 (Provider 래핑) ─────────────────────────

export default function ResearchModelEditor(props: ResearchModelEditorProps) {
  return (
    <ReactFlowProvider>
      <ResearchModelEditorInner {...props} />
    </ReactFlowProvider>
  );
}

export { EMPTY_RESEARCH_MODEL };
