// ────────────────────────────────────────────────────────────
// types/research-model.ts — 연구 모형(research model) 다이어그램
//
// 석사과정 학생이 자기 연구의 변인 간 관계(독립→종속, 매개, 조절 등)를
// 시각적으로 그리기 위한 자기완결적 데이터 모델.
//
// 설계 원칙:
//  - Firestore 직렬화 가능: 함수·undefined·class instance 없이 plain object/배열만 사용.
//    (optional 필드는 "있거나 없거나"로 두되, 직렬화 시 undefined 키는 toData 에서 제거)
//  - reactflow Node/Edge 와의 변환은 toFlow/fromFlow 로 분리해 컴포넌트는 도메인 타입만 다룬다.
//
// ⚠ 이 파일은 자기완결적이며 기존 도메인 타입(@/types)과 의존/충돌이 없다.
//   (index.ts barrel 에는 등록하지 않는다 — 페이지 연결은 메인 스레드 담당.)
// ────────────────────────────────────────────────────────────

import {
  MarkerType,
  type Edge as RFEdge,
  type Node as RFNode,
} from "reactflow";

// ── 변인 종류 ──────────────────────────────────────────────

/** 변인 노드 5종 — 기존 PaperVariables 카테고리와 동일 키 체계 */
export type VariableKind =
  | "independent" // 독립변인
  | "dependent" // 종속변인
  | "mediator" // 매개변인
  | "moderator" // 조절변인
  | "control"; // 통제변인

/** 변인 종류 → 한글 라벨 */
export const VARIABLE_KIND_LABELS: Record<VariableKind, string> = {
  independent: "독립변인",
  dependent: "종속변인",
  mediator: "매개변인",
  moderator: "조절변인",
  control: "통제변인",
};

/** 변인 종류 → 짧은 배지 라벨 */
export const VARIABLE_KIND_SHORT: Record<VariableKind, string> = {
  independent: "독립",
  dependent: "종속",
  mediator: "매개",
  moderator: "조절",
  control: "통제",
};

/**
 * 변인 종류별 Tailwind 색상 클래스 (라이트 + 다크).
 *  - independent = sky / dependent = violet / mediator = amber
 *  - moderator = emerald / control = slate
 * 커스텀 노드(카드)·툴바 배지·미니맵에서 공유한다.
 */
export interface VariablePalette {
  /** 노드 카드 배경 */
  bg: string;
  /** 노드 카드 테두리 */
  border: string;
  /** 라벨/제목 텍스트 */
  text: string;
  /** 타입 배지 배경+텍스트 */
  badge: string;
  /** 미니맵·핸들 등에 쓰는 raw hex(직렬화 불필요, 시각 전용) */
  hex: string;
}

export const VARIABLE_PALETTE: Record<VariableKind, VariablePalette> = {
  independent: {
    bg: "bg-sky-50 dark:bg-sky-950/40",
    border: "border-sky-300 dark:border-sky-700",
    text: "text-sky-900 dark:text-sky-100",
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-200",
    hex: "#0ea5e9",
  },
  dependent: {
    bg: "bg-violet-50 dark:bg-violet-950/40",
    border: "border-violet-300 dark:border-violet-700",
    text: "text-violet-900 dark:text-violet-100",
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-200",
    hex: "#8b5cf6",
  },
  mediator: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-300 dark:border-amber-700",
    text: "text-amber-900 dark:text-amber-100",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200",
    hex: "#f59e0b",
  },
  moderator: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-300 dark:border-emerald-700",
    text: "text-emerald-900 dark:text-emerald-100",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200",
    hex: "#10b981",
  },
  control: {
    bg: "bg-slate-50 dark:bg-slate-900/60",
    border: "border-slate-300 dark:border-slate-600",
    text: "text-slate-800 dark:text-slate-100",
    badge: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
    hex: "#64748b",
  },
};

/** 변인 종류 목록 (툴바 드롭다운·순회용) */
export const VARIABLE_KINDS: VariableKind[] = [
  "independent",
  "dependent",
  "mediator",
  "moderator",
  "control",
];

// ── 엣지(관계) ─────────────────────────────────────────────

/** 관계 유형 — 인과(실선) / 상관(점선) */
export type RelationKind = "causal" | "correlational";

export const RELATION_LABELS: Record<RelationKind, string> = {
  causal: "인과 (실선)",
  correlational: "상관 (점선)",
};

// ── 직렬화 가능한 도메인 데이터 ─────────────────────────────

/** 직렬화된 노드 — Firestore 저장 단위 */
export interface ResearchModelNode {
  id: string;
  type: VariableKind;
  label: string;
  x: number;
  y: number;
}

/** 직렬화된 엣지 — Firestore 저장 단위 */
export interface ResearchModelEdge {
  id: string;
  source: string;
  target: string;
  /** 관계 라벨 (예: "H1", "+", "−", "정(+)", "부(−)"). 비어있으면 생략 */
  label?: string;
  relation: RelationKind;
}

/**
 * 연구 모형 전체 — 부모 컴포넌트가 보관/저장하는 컨트롤드 값.
 * 모든 필드가 plain JSON 으로 Firestore 직렬화 가능.
 */
export interface ResearchModelData {
  nodes: ResearchModelNode[];
  edges: ResearchModelEdge[];
}

/** 빈 모형 (초기값) */
export const EMPTY_RESEARCH_MODEL: ResearchModelData = {
  nodes: [],
  edges: [],
};

// ── reactflow 노드 data 타입 ───────────────────────────────

/** 커스텀 노드가 받는 data 페이로드 */
export interface VariableNodeData {
  label: string;
  kind: VariableKind;
  /** 편집 비활성(readOnly) 여부 — 핸들 표시 제어용 */
  readOnly?: boolean;
}

/** reactflow 노드 타입 키 (nodeTypes 매핑용) */
export const VARIABLE_NODE_TYPE = "variable" as const;

// ── 변환 함수: 도메인 ↔ reactflow ─────────────────────────

/**
 * ResearchModelData → reactflow Node[]/Edge[].
 * 모든 노드는 커스텀 타입(`variable`)으로, 엣지는 방향 화살표(ArrowClosed)로 변환.
 * 상관(correlational)은 점선(strokeDasharray)으로 표시.
 */
export function toFlow(
  data: ResearchModelData,
  options?: { readOnly?: boolean },
): { nodes: RFNode<VariableNodeData>[]; edges: RFEdge[] } {
  const readOnly = options?.readOnly ?? false;

  const nodes: RFNode<VariableNodeData>[] = data.nodes.map((n) => ({
    id: n.id,
    type: VARIABLE_NODE_TYPE,
    position: { x: n.x, y: n.y },
    data: { label: n.label, kind: n.type, readOnly },
    draggable: !readOnly,
    connectable: !readOnly,
    deletable: !readOnly,
  }));

  const edges: RFEdge[] = data.edges.map((e) => edgeToFlow(e, readOnly));

  return { nodes, edges };
}

/** 단일 도메인 엣지 → reactflow 엣지 (onConnect 후 재구성에도 재사용) */
export function edgeToFlow(e: ResearchModelEdge, readOnly = false): RFEdge {
  const dashed = e.relation === "correlational";
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label || undefined,
    type: "default",
    markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
    deletable: !readOnly,
    updatable: !readOnly,
    labelStyle: { fontSize: 12, fontWeight: 600 },
    labelBgStyle: { fillOpacity: 0.9 },
    labelBgPadding: [4, 2],
    labelBgBorderRadius: 4,
    style: {
      strokeWidth: 1.75,
      strokeDasharray: dashed ? "6 4" : undefined,
    },
    data: { relation: e.relation },
  };
}

/**
 * reactflow Node[]/Edge[] → ResearchModelData.
 * 위치(x,y)·라벨·종류·관계만 추출해 Firestore 직렬화 가능한 plain object 로 환원.
 * undefined label 키는 제거(직렬화 안전).
 */
export function fromFlow(
  nodes: RFNode<VariableNodeData>[],
  edges: RFEdge[],
): ResearchModelData {
  const outNodes: ResearchModelNode[] = nodes.map((n) => ({
    id: n.id,
    type: n.data.kind,
    label: n.data.label,
    x: Math.round(n.position.x),
    y: Math.round(n.position.y),
  }));

  const outEdges: ResearchModelEdge[] = edges.map((e) => {
    const relation = readRelation(e);
    const labelText = typeof e.label === "string" ? e.label.trim() : "";
    const out: ResearchModelEdge = {
      id: e.id,
      source: e.source,
      target: e.target,
      relation,
    };
    if (labelText) out.label = labelText;
    return out;
  });

  return { nodes: outNodes, edges: outEdges };
}

/** 엣지의 relation 을 안전하게 읽는다 (data.relation 우선, 점선 스타일 폴백) */
export function readRelation(e: RFEdge): RelationKind {
  const fromData = (e.data as { relation?: RelationKind } | undefined)?.relation;
  if (fromData === "causal" || fromData === "correlational") return fromData;
  // 폴백: 점선이면 상관, 아니면 인과
  const dash = (e.style as { strokeDasharray?: string } | undefined)?.strokeDasharray;
  return dash ? "correlational" : "causal";
}
