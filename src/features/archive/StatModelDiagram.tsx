"use client";

/**
 * 통계방법 연구모형 다이어그램 (사이클 55, 사용자 요청)
 *
 * 통계 가이드 상세에서 "이 분석이 변인 간 어떤 관계를 보고자 하는지"를
 * 순서도형 SVG 모형으로 보여준다. 가이드 이름(고정 13종)으로 스펙을 매칭하며,
 * 스펙이 없는 방법(개념형 — CLT·CVI 등)은 렌더하지 않는다.
 * 색 약속: 독립/예측=파랑 · 종속/결과=초록 · 공변인(통제)=회색 점선 · 잠재요인=보라 · 관측문항=주황.
 */

interface DNode {
  id: string;
  label: string;
  sub?: string;
  kind: "independent" | "dependent" | "covariate" | "latent" | "item" | "category";
  col: 0 | 1 | 2;
  row: number;
}

interface DEdge {
  from: string;
  to: string;
  style: "arrow" | "dashed" | "corr" | "cross";
  label?: string;
}

interface DiagramSpec {
  caption: string;
  nodes: DNode[];
  edges: DEdge[];
}

const KIND_STYLE: Record<DNode["kind"], { stroke: string; fill: string; text: string; dash?: string }> = {
  independent: { stroke: "#1d4ed8", fill: "rgba(29,78,216,0.08)", text: "#1d4ed8" },
  dependent: { stroke: "#047857", fill: "rgba(4,120,87,0.08)", text: "#047857" },
  covariate: { stroke: "#6b7280", fill: "rgba(107,114,128,0.08)", text: "#6b7280", dash: "5 3" },
  latent: { stroke: "#7c3aed", fill: "rgba(124,58,237,0.08)", text: "#7c3aed" },
  item: { stroke: "#b45309", fill: "rgba(180,83,9,0.08)", text: "#b45309" },
  category: { stroke: "#0369a1", fill: "rgba(3,105,161,0.08)", text: "#0369a1" },
};

const SPECS: Record<string, DiagramSpec> = {
  "t-test (독립/대응표본)": {
    caption: "두 집단(또는 사전·사후)의 종속변인 평균에 차이가 있는지를 본다.",
    nodes: [
      { id: "g", label: "집단", sub: "독립변인 · 2수준 (A vs B)", kind: "independent", col: 0, row: 0 },
      { id: "y", label: "종속변인", sub: "연속형 (점수 등)", kind: "dependent", col: 2, row: 0 },
    ],
    edges: [{ from: "g", to: "y", style: "arrow", label: "평균 차이?" }],
  },
  "ANOVA (일원분산분석)": {
    caption: "세 집단 이상에서 종속변인 평균이 집단에 따라 다른지를 본다.",
    nodes: [
      { id: "g", label: "집단", sub: "독립변인 · 3+수준 (A/B/C)", kind: "independent", col: 0, row: 0 },
      { id: "y", label: "종속변인", sub: "연속형", kind: "dependent", col: 2, row: 0 },
    ],
    edges: [{ from: "g", to: "y", style: "arrow", label: "집단 간 평균 차이?" }],
  },
  "ANCOVA (공분산분석)": {
    caption: "공변인(예: 사전점수)의 영향을 통계적으로 제거한 뒤, 집단이 종속변인에 미치는 순수한 효과를 본다.",
    nodes: [
      { id: "g", label: "집단 (처치)", sub: "독립변인", kind: "independent", col: 0, row: 0 },
      { id: "y", label: "종속변인", sub: "사후점수", kind: "dependent", col: 2, row: 0 },
      { id: "c", label: "공변인", sub: "사전점수 등 — 통제", kind: "covariate", col: 0, row: 1 },
    ],
    edges: [
      { from: "g", to: "y", style: "arrow", label: "처치 효과?" },
      { from: "c", to: "y", style: "dashed", label: "영향 제거" },
    ],
  },
  "MANOVA (다변량분산분석)": {
    caption: "하나의 집단 구분이 여러 종속변인에 동시에 미치는 효과를 한 번에 본다.",
    nodes: [
      { id: "g", label: "집단", sub: "독립변인", kind: "independent", col: 0, row: 0 },
      { id: "y1", label: "종속변인 1", sub: "예: 읽기 점수", kind: "dependent", col: 2, row: 0 },
      { id: "y2", label: "종속변인 2", sub: "예: 쓰기 점수", kind: "dependent", col: 2, row: 1 },
    ],
    edges: [
      { from: "g", to: "y1", style: "arrow" },
      { from: "g", to: "y2", style: "arrow" },
    ],
  },
  "MANCOVA (다변량공분산분석)": {
    caption: "공변인을 통제한 상태에서, 집단이 여러 종속변인에 동시에 미치는 효과를 본다.",
    nodes: [
      { id: "g", label: "집단 (처치)", sub: "독립변인", kind: "independent", col: 0, row: 0 },
      { id: "y1", label: "종속변인 1", kind: "dependent", col: 2, row: 0 },
      { id: "y2", label: "종속변인 2", kind: "dependent", col: 2, row: 1 },
      { id: "c", label: "공변인", sub: "사전점수 등 — 통제", kind: "covariate", col: 0, row: 1 },
    ],
    edges: [
      { from: "g", to: "y1", style: "arrow" },
      { from: "g", to: "y2", style: "arrow" },
      { from: "c", to: "y1", style: "dashed" },
      { from: "c", to: "y2", style: "dashed" },
    ],
  },
  "다중회귀분석": {
    caption: "여러 예측변인이 각각 종속변인을 얼마나 설명하는지(상대적 영향력)를 본다.",
    nodes: [
      { id: "x1", label: "예측변인 1", kind: "independent", col: 0, row: 0 },
      { id: "x2", label: "예측변인 2", kind: "independent", col: 0, row: 1 },
      { id: "x3", label: "예측변인 3", kind: "independent", col: 0, row: 2 },
      { id: "y", label: "종속변인", sub: "연속형", kind: "dependent", col: 2, row: 1 },
    ],
    edges: [
      { from: "x1", to: "y", style: "arrow", label: "β₁" },
      { from: "x2", to: "y", style: "arrow", label: "β₂" },
      { from: "x3", to: "y", style: "arrow", label: "β₃" },
    ],
  },
  "로지스틱회귀분석": {
    caption: "여러 예측변인이 범주형 결과(예: 합격/불합격)의 발생 확률을 얼마나 바꾸는지를 본다.",
    nodes: [
      { id: "x1", label: "예측변인 1", kind: "independent", col: 0, row: 0 },
      { id: "x2", label: "예측변인 2", kind: "independent", col: 0, row: 1 },
      { id: "y", label: "범주형 결과", sub: "예: 이수/미이수 (0/1)", kind: "category", col: 2, row: 0 },
    ],
    edges: [
      { from: "x1", to: "y", style: "arrow", label: "오즈비" },
      { from: "x2", to: "y", style: "arrow" },
    ],
  },
  "상관분석": {
    caption: "두 변인이 함께 움직이는 정도(방향·강도)를 본다 — 인과 방향은 말해주지 않는다.",
    nodes: [
      { id: "x", label: "변인 X", kind: "independent", col: 0, row: 0 },
      { id: "y", label: "변인 Y", kind: "dependent", col: 2, row: 0 },
    ],
    edges: [{ from: "x", to: "y", style: "corr", label: "r (상관계수)" }],
  },
  "카이제곱 검정 (χ²)": {
    caption: "두 범주형 변인의 분포가 서로 독립인지(연관이 있는지)를 교차표로 본다.",
    nodes: [
      { id: "x", label: "범주형 변인 A", sub: "예: 성별", kind: "category", col: 0, row: 0 },
      { id: "y", label: "범주형 변인 B", sub: "예: 선호 유형", kind: "category", col: 2, row: 0 },
    ],
    edges: [{ from: "x", to: "y", style: "corr", label: "연관성?" }],
  },
  "구조방정식모형(SEM)": {
    caption: "변인 사이의 직접 효과와 매개를 거치는 간접 효과를 하나의 경로 모형으로 동시에 본다.",
    nodes: [
      { id: "x", label: "독립변인", kind: "independent", col: 0, row: 1 },
      { id: "m", label: "매개변인", kind: "latent", col: 1, row: 0 },
      { id: "y", label: "종속변인", kind: "dependent", col: 2, row: 1 },
    ],
    edges: [
      { from: "x", to: "m", style: "arrow", label: "a" },
      { from: "m", to: "y", style: "arrow", label: "b" },
      { from: "x", to: "y", style: "arrow", label: "c′ (직접)" },
    ],
  },
  "탐색적 요인분석(EFA)": {
    caption: "여러 문항의 응답 패턴에서 숨어 있는 공통 요인이 몇 개인지, 무엇인지 탐색한다.",
    nodes: [
      { id: "i1", label: "문항 1", kind: "item", col: 0, row: 0 },
      { id: "i2", label: "문항 2", kind: "item", col: 0, row: 1 },
      { id: "i3", label: "문항 3", kind: "item", col: 0, row: 2 },
      { id: "f", label: "요인 ?", sub: "탐색 대상 (잠재)", kind: "latent", col: 2, row: 1 },
    ],
    edges: [
      { from: "i1", to: "f", style: "dashed" },
      { from: "i2", to: "f", style: "dashed" },
      { from: "i3", to: "f", style: "dashed" },
    ],
  },
  "확인적 요인분석(CFA)": {
    caption: "이론이 가정한 요인 구조가 실제 응답 자료와 들어맞는지(적합도)를 확인한다.",
    nodes: [
      { id: "f", label: "잠재 요인", sub: "이론적 구인", kind: "latent", col: 0, row: 1 },
      { id: "i1", label: "문항 1", kind: "item", col: 2, row: 0 },
      { id: "i2", label: "문항 2", kind: "item", col: 2, row: 1 },
      { id: "i3", label: "문항 3", kind: "item", col: 2, row: 2 },
    ],
    edges: [
      { from: "f", to: "i1", style: "arrow", label: "적재량" },
      { from: "f", to: "i2", style: "arrow" },
      { from: "f", to: "i3", style: "arrow" },
    ],
  },
};

const COL_X = [16, 224, 412]; // 노드 좌상단 x (col 0/1/2)
const NODE_W = 152;
const NODE_H = 46;
const ROW_H = 64;
const PAD_TOP = 10;

function nodeRect(n: DNode) {
  return { x: COL_X[n.col], y: PAD_TOP + n.row * ROW_H, w: NODE_W, h: NODE_H };
}

export function hasStatDiagram(name: string): boolean {
  return !!SPECS[name];
}

export default function StatModelDiagram({ methodName }: { methodName: string }) {
  const spec = SPECS[methodName];
  if (!spec) return null;

  const maxRow = Math.max(...spec.nodes.map((n) => n.row));
  const height = PAD_TOP + (maxRow + 1) * ROW_H + 6;
  const byId = new Map(spec.nodes.map((n) => [n.id, n]));

  return (
    <div>
      <svg
        viewBox={`0 0 580 ${height}`}
        className="w-full"
        role="img"
        aria-label={`${methodName} 연구모형: ${spec.caption}`}
      >
        <defs>
          <marker id="smd-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
          </marker>
        </defs>

        {spec.edges.map((e, i) => {
          const a = nodeRect(byId.get(e.from)!);
          const b = nodeRect(byId.get(e.to)!);
          const x1 = a.x + a.w;
          const y1 = a.y + a.h / 2;
          const x2 = b.x;
          const y2 = b.y + b.h / 2;
          const mx = (x1 + x2) / 2;
          const my = (y1 + y2) / 2;
          const isCorr = e.style === "corr";
          return (
            <g key={i}>
              <path
                d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke="#64748b"
                strokeWidth="1.6"
                strokeDasharray={e.style === "dashed" ? "5 4" : undefined}
                markerEnd={e.style === "cross" ? undefined : "url(#smd-arrow)"}
                markerStart={isCorr ? "url(#smd-arrow)" : undefined}
              />
              {e.label && (
                <text x={mx} y={my - 6} textAnchor="middle" fontSize="11" fill="#64748b">
                  {e.label}
                </text>
              )}
            </g>
          );
        })}

        {spec.nodes.map((n) => {
          const r = nodeRect(n);
          const st = KIND_STYLE[n.kind];
          return (
            <g key={n.id}>
              <rect
                x={r.x}
                y={r.y}
                width={r.w}
                height={r.h}
                rx="10"
                fill={st.fill}
                stroke={st.stroke}
                strokeWidth="1.4"
                strokeDasharray={st.dash}
              />
              <text
                x={r.x + r.w / 2}
                y={r.y + (n.sub ? 19 : 27)}
                textAnchor="middle"
                fontSize="13"
                fontWeight="600"
                fill={st.text}
              >
                {n.label}
              </text>
              {n.sub && (
                <text x={r.x + r.w / 2} y={r.y + 35} textAnchor="middle" fontSize="10" fill="#6b7280">
                  {n.sub}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="mt-2 text-xs text-muted-foreground">{spec.caption}</p>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        <span><span className="mr-1 inline-block h-2 w-2 rounded-sm border" style={{ borderColor: "#1d4ed8", backgroundColor: "rgba(29,78,216,0.15)" }} />독립·예측</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-sm border" style={{ borderColor: "#047857", backgroundColor: "rgba(4,120,87,0.15)" }} />종속·결과</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-sm border border-dashed" style={{ borderColor: "#6b7280" }} />공변인(통제)</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-sm border" style={{ borderColor: "#7c3aed", backgroundColor: "rgba(124,58,237,0.15)" }} />잠재 요인</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-sm border" style={{ borderColor: "#b45309", backgroundColor: "rgba(180,83,9,0.15)" }} />관측 문항</span>
      </div>
    </div>
  );
}
