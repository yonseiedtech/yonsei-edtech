"use client";

/**
 * 통계방법 연구모형 다이어그램 (사이클 55 · 애니메이션 57)
 *
 * 통계 가이드 상세에서 "이 분석이 변인 간 어떤 관계를 보고자 하는지"를
 * 순서도형 SVG 모형으로 보여준다. 가이드 이름(고정 13종)으로 스펙을 매칭하며,
 * 스펙이 없는 방법(개념형 — CLT·CVI 등)은 렌더하지 않는다.
 * 색 약속: 독립/예측=파랑 · 종속/결과=초록 · 공변인(통제)=회색 점선 · 잠재요인=보라 · 관측문항=주황.
 *
 * 애니메이션(사용자 요청): 변인 노드가 순서대로 등장한 뒤 관계 화살표가 "그려지고"
 * 라벨이 떠오른다 — 모형의 인과 방향을 시간 순서로 읽게 한다.
 * 순수 CSS(stroke-dashoffset + opacity) 구현, prefers-reduced-motion 이면 정지 상태.
 */

import { useState } from "react";
import { RotateCcw, ExternalLink } from "lucide-react";

interface DNode {
  id: string;
  label: string;
  sub?: string;
  /** 집단형 변인의 수준 — 있으면 노드 안에 미니 박스로 집단 수를 시각화 (사용자 피드백) */
  levels?: string[];
  kind: "independent" | "dependent" | "covariate" | "latent" | "item" | "category";
  col: 0 | 1 | 2;
  row: number;
}

interface DEdge {
  from: string;
  to: string;
  style: "arrow" | "dashed" | "corr";
  label?: string;
}

interface DiagramSpec {
  caption: string;
  /** 최소 표본 참고 — 통상적 권고(중간 효과크기·α=.05·power=.80 기준 등). 참고용 명시 필수 */
  sampleGuide: string;
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

/**
 * 사이클 101: 노드(변인) 클릭 시 보여줄 개념 사전 (사용자 요청 — 개념을 모를 때
 * 클릭하면 간단 설명 + 아카이브 기초 용어 페이지를 새 탭으로 열어 학습할 수 있게).
 */
const CONCEPT_GLOSSARY: Partial<
  Record<DNode["kind"], { term: string; desc: string; q: string }>
> = {
  independent: {
    term: "독립변인",
    desc: "연구자가 조작하거나 구분하는 '원인' 변인입니다. 종속변인에 영향을 줄 것으로 가정합니다. (예: 교수법, 집단 구분)",
    q: "독립변인",
  },
  dependent: {
    term: "종속변인",
    desc: "독립변인의 영향을 받아 변화를 측정하는 '결과' 변인입니다. (예: 성취도·만족도 점수)",
    q: "종속변인",
  },
  covariate: {
    term: "공변인(통제변인)",
    desc: "종속변인에 영향을 주지만 연구 관심이 아니어서 통계적으로 통제하는 변인입니다. (예: 사전점수)",
    q: "공변인",
  },
  latent: {
    term: "잠재변인(요인)",
    desc: "직접 관측되지 않고 여러 관측문항으로 추정하는 구성개념입니다. (예: 자기효능감)",
    q: "잠재변인",
  },
  item: {
    term: "관측문항(측정변수)",
    desc: "잠재변인을 측정하기 위한 개별 설문 문항·지표입니다.",
    q: "측정도구",
  },
  category: {
    term: "범주형 변인",
    desc: "값이 범주(집단)로 나뉘는 변인입니다. 명목·서열 척도가 해당합니다.",
    q: "범주형",
  },
};

const SPECS: Record<string, DiagramSpec> = {
  "t-test (독립/대응표본)": {
    caption: "두 집단(독립표본) 또는 한 집단의 사전·사후(대응표본)에서 종속변인 평균 차이를 본다.",
    sampleGuide: "독립표본은 집단당 64명(중간 효과 d=.5 기준), 대응표본은 약 34쌍이 통상 권고됩니다. 집단당 30 미만이면 정규성 확인이 더 중요해집니다.",
    nodes: [
      { id: "g", label: "집단 (2개)", sub: "독립변인", levels: ["집단 A", "집단 B"], kind: "independent", col: 0, row: 0 },
      { id: "y", label: "종속변인", sub: "연속형 (점수 등)", kind: "dependent", col: 2, row: 0 },
    ],
    edges: [{ from: "g", to: "y", style: "arrow", label: "평균 차이?" }],
  },
  "ANOVA (일원분산분석)": {
    caption: "세 집단 이상에서 종속변인 평균이 집단에 따라 다른지를 본다. (한 집단 사전·사후나 두 집단이면 t-test, 셋 이상이면 ANOVA)",
    sampleGuide: "중간 효과(f=.25) 기준 3집단 전체 약 159명(집단당 53명 내외)이 통상 권고됩니다. 집단 수가 늘면 전체 표본도 함께 늘어납니다.",
    nodes: [
      { id: "g", label: "집단 (3개+)", sub: "독립변인", levels: ["A", "B", "C"], kind: "independent", col: 0, row: 0 },
      { id: "y", label: "종속변인", sub: "연속형", kind: "dependent", col: 2, row: 0 },
    ],
    edges: [{ from: "g", to: "y", style: "arrow", label: "집단 간 평균 차이?" }],
  },
  "ANCOVA (공분산분석)": {
    caption: "공변인(예: 사전점수)의 영향을 통계적으로 제거한 뒤, 집단이 종속변인에 미치는 순수한 효과를 본다.",
    sampleGuide: "공변인 1개·2집단·중간 효과 기준 전체 약 128명(집단당 64명 내외)이 통상 권고됩니다. 공변인 덕분에 같은 검정력을 더 적은 표본으로 얻을 수도 있습니다.",
    nodes: [
      { id: "g", label: "집단 (2개)", sub: "독립변인 · 처치", levels: ["실험", "통제"], kind: "independent", col: 0, row: 0 },
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
    sampleGuide: "셀(집단)당 최소 20명 이상, 그리고 종속변인 수보다 셀당 사례 수가 많아야 합니다. 종속변인이 늘수록 필요 표본도 커집니다.",
    nodes: [
      { id: "g", label: "집단 (2개+)", sub: "독립변인", levels: ["실험", "통제"], kind: "independent", col: 0, row: 0 },
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
    sampleGuide: "MANOVA 기준(셀당 20+)에 공변인 수를 고려해 여유를 더 둡니다. 셀당 사례 수가 종속변인+공변인 수보다 충분히 많아야 합니다.",
    nodes: [
      { id: "g", label: "집단 (2개+)", sub: "독립변인 · 처치", levels: ["실험", "통제"], kind: "independent", col: 0, row: 0 },
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
    sampleGuide: "예측변인당 10~15명 또는 N ≥ 50 + 8k(k=예측변인 수, Green 1991) 규칙이 널리 쓰입니다. 예측변인 3개면 약 74명 이상이 출발점입니다.",
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
    sampleGuide: "사건당 변수 10(EPV 10) 규칙 — 예측변인 1개당 관심 사건(예: 미이수)이 10건 이상이어야 합니다. 사건이 드물수록 표본이 커져야 합니다.",
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
    sampleGuide: "중간 크기 상관(r=.3)을 검출하려면 약 84명이 통상 권고됩니다. 상관이 약할 것으로 예상되면 표본을 크게 잡아야 합니다.",
    nodes: [
      { id: "x", label: "변인 X", kind: "independent", col: 0, row: 0 },
      { id: "y", label: "변인 Y", kind: "dependent", col: 2, row: 0 },
    ],
    edges: [{ from: "x", to: "y", style: "corr", label: "r (상관계수)" }],
  },
  "카이제곱 검정 (χ²)": {
    caption: "두 범주형 변인의 분포가 서로 독립인지(연관이 있는지)를 교차표로 본다.",
    sampleGuide: "모든 셀의 기대빈도가 5 이상(최소 80% 셀)이어야 합니다. 범주 조합이 많을수록 전체 표본이 커져야 합니다.",
    nodes: [
      { id: "x", label: "범주형 변인 A", sub: "예: 성별", kind: "category", col: 0, row: 0 },
      { id: "y", label: "범주형 변인 B", sub: "예: 선호 유형", kind: "category", col: 2, row: 0 },
    ],
    edges: [{ from: "x", to: "y", style: "corr", label: "연관성?" }],
  },
  "구조방정식모형(SEM)": {
    caption: "변인 사이의 직접 효과와 매개를 거치는 간접 효과를 하나의 경로 모형으로 동시에 본다.",
    sampleGuide: "추정 모수 1개당 5~10명, 통상 전체 200명 이상이 권고됩니다. 입증할 경로(모수)가 많은 복잡한 모형일수록 더 큰 표본이 필요합니다.",
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
    sampleGuide: "문항당 5~10명, 전체 최소 100~200명이 통상 권고됩니다. 문항 수가 많은 도구일수록 표본도 비례해서 커져야 합니다.",
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
    sampleGuide: "SEM 계열 권고와 같이 통상 200명 내외 이상, 추정 모수당 5~10명이 기준입니다. 요인·문항이 많으면 더 필요합니다.",
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
const NODE_H_LEVELED = 64; // levels 미니 박스를 품는 집단 노드
const ROW_H = 72;
const PAD_TOP = 10;

// 애니메이션 타임라인 (초) — 노드 스태거 → 화살표 그리기 → 라벨
const NODE_STAGGER = 0.14;
const EDGE_BASE = 0.55;
const EDGE_STAGGER = 0.3;
const EDGE_DRAW = 0.45;

function nodeRect(n: DNode) {
  const h = n.levels?.length ? NODE_H_LEVELED : NODE_H;
  return { x: COL_X[n.col], y: PAD_TOP + n.row * ROW_H, w: NODE_W, h };
}

export function hasStatDiagram(name: string): boolean {
  return !!SPECS[name];
}

export default function StatModelDiagram({ methodName }: { methodName: string }) {
  // 재생 키 — 변경 시 SVG 가 리마운트되어 애니메이션이 처음부터 다시 실행된다
  const [playKey, setPlayKey] = useState(0);
  const [openKind, setOpenKind] = useState<DNode["kind"] | null>(null);
  const spec = SPECS[methodName];
  if (!spec) return null;

  const maxRow = Math.max(...spec.nodes.map((n) => n.row));
  const lastRowH = Math.max(
    ...spec.nodes.filter((n) => n.row === maxRow).map((n) => (n.levels?.length ? NODE_H_LEVELED : NODE_H)),
  );
  const height = PAD_TOP + maxRow * ROW_H + lastRowH + 8;
  const byId = new Map(spec.nodes.map((n) => [n.id, n]));

  return (
    <div>
      <style>{`
        @keyframes smd-node-in {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes smd-draw {
          from { stroke-dashoffset: 1; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes smd-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .smd-node {
          opacity: 0;
          animation: smd-node-in 0.45s ease-out forwards;
          transform-box: fill-box;
        }
        .smd-edge {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: smd-draw ${EDGE_DRAW}s ease-in-out forwards;
        }
        .smd-head, .smd-elabel {
          opacity: 0;
          animation: smd-fade 0.3s ease-out forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .smd-node, .smd-head, .smd-elabel { animation: none; opacity: 1; transform: none; }
          .smd-edge { animation: none; stroke-dashoffset: 0; }
        }
      `}</style>

      <div className="flex items-start justify-between gap-2">
        <svg
          key={playKey}
          viewBox={`0 0 580 ${height}`}
          className="w-full"
          role="img"
          aria-label={`${methodName} 연구모형: ${spec.caption}`}
        >
          {spec.edges.map((e, i) => {
            const a = nodeRect(byId.get(e.from)!);
            const b = nodeRect(byId.get(e.to)!);
            const x1 = a.x + a.w;
            const y1 = a.y + a.h / 2;
            const x2 = b.x;
            const y2 = b.y + b.h / 2;
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            const delay = EDGE_BASE + i * EDGE_STAGGER;
            const headDelay = delay + EDGE_DRAW - 0.08;
            return (
              <g key={i}>
                <path
                  className="smd-edge"
                  style={{ animationDelay: `${delay}s` }}
                  pathLength={1}
                  d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="1.6"
                />
                {/* 베지어 양끝 접선이 항상 수평이므로 화살표머리는 고정 방향 삼각형으로 충분 */}
                <polygon
                  className="smd-head"
                  style={{ animationDelay: `${headDelay}s` }}
                  points={`${x2},${y2} ${x2 - 8},${y2 - 4.5} ${x2 - 8},${y2 + 4.5}`}
                  fill="#64748b"
                />
                {e.style === "corr" && (
                  <polygon
                    className="smd-head"
                    style={{ animationDelay: `${headDelay}s` }}
                    points={`${x1},${y1} ${x1 + 8},${y1 - 4.5} ${x1 + 8},${y1 + 4.5}`}
                    fill="#64748b"
                  />
                )}
                {e.style === "dashed" && (
                  // 점선 효과는 그리기 애니메이션과 충돌하므로, 위에 흰 점선 오버레이로 표현
                  <path
                    className="smd-head"
                    style={{ animationDelay: `${delay + 0.1}s` }}
                    d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                    fill="none"
                    stroke="var(--card, #fff)"
                    strokeWidth="1.6"
                    strokeDasharray="3 5"
                  />
                )}
                {e.label && (
                  <text
                    className="smd-elabel"
                    style={{ animationDelay: `${headDelay + 0.05}s` }}
                    x={mx}
                    y={my - 6}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#64748b"
                  >
                    {e.label}
                  </text>
                )}
              </g>
            );
          })}

          {spec.nodes.map((n, i) => {
            const r = nodeRect(n);
            const st = KIND_STYLE[n.kind];
            return (
              <g
                key={n.id}
                className="smd-node"
                style={{
                  animationDelay: `${i * NODE_STAGGER}s`,
                  cursor: CONCEPT_GLOSSARY[n.kind] ? "pointer" : "default",
                }}
                onClick={() => CONCEPT_GLOSSARY[n.kind] && setOpenKind(n.kind)}
                role={CONCEPT_GLOSSARY[n.kind] ? "button" : undefined}
                aria-label={CONCEPT_GLOSSARY[n.kind] ? `${CONCEPT_GLOSSARY[n.kind]!.term} 설명 보기` : undefined}
              >
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
                  y={r.y + (n.levels?.length ? 16 : n.sub ? 19 : 27)}
                  textAnchor="middle"
                  fontSize={n.levels?.length ? "12" : "13"}
                  fontWeight="600"
                  fill={st.text}
                >
                  {n.label}
                </text>
                {!n.levels?.length && n.sub && (
                  <text x={r.x + r.w / 2} y={r.y + 35} textAnchor="middle" fontSize="10" fill="#6b7280">
                    {n.sub}
                  </text>
                )}
                {/* 집단 수 시각화 — 수준별 미니 박스 (사용자 피드백: 1·2·3집단 구분) */}
                {n.levels?.length ? (
                  <>
                    {n.levels.map((lv, li) => {
                      const count = n.levels!.length;
                      const innerW = (r.w - 14 - (count - 1) * 5) / count;
                      const lx = r.x + 7 + li * (innerW + 5);
                      return (
                        <g key={li}>
                          <rect
                            x={lx}
                            y={r.y + 23}
                            width={innerW}
                            height={20}
                            rx="5"
                            fill="rgba(255,255,255,0.55)"
                            stroke={st.stroke}
                            strokeWidth="0.9"
                          />
                          <text
                            x={lx + innerW / 2}
                            y={r.y + 36.5}
                            textAnchor="middle"
                            fontSize="9.5"
                            fontWeight="600"
                            fill={st.text}
                          >
                            {lv}
                          </text>
                        </g>
                      );
                    })}
                    {n.sub && (
                      <text x={r.x + r.w / 2} y={r.y + 56} textAnchor="middle" fontSize="9.5" fill="#6b7280">
                        {n.sub}
                      </text>
                    )}
                  </>
                ) : null}
              </g>
            );
          })}
        </svg>
        <button
          type="button"
          onClick={() => setPlayKey((k) => k + 1)}
          className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="애니메이션 다시 재생"
        >
          <RotateCcw size={11} />
          다시 재생
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{spec.caption}</p>
      {/* 최소 표본 참고 (사용자 요청) — 입증 경로·설계에 따른 통상 권고 + 지도교수 안내 고지 */}
      <div className="mt-2.5 rounded-lg border border-warning/20 bg-warning/5 px-3 py-2">
        <p className="text-[11px] leading-relaxed text-warning">
          <span className="font-semibold">최소 표본 참고:</span> {spec.sampleGuide}
        </p>
        <p className="mt-1 text-[10px] text-warning/80">
          ※ 중간 효과크기·α=.05·검정력 .80 등 통상 가정에 따른 참고값입니다. 실제 필요 표본은 효과크기·설계·탈락률에
          따라 달라지므로, 최종 표본 설계는 반드시 지도교수님의 지도를 받으세요.
        </p>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        <span><span className="mr-1 inline-block h-2 w-2 rounded-sm border" style={{ borderColor: "#1d4ed8", backgroundColor: "rgba(29,78,216,0.15)" }} />독립·예측</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-sm border" style={{ borderColor: "#047857", backgroundColor: "rgba(4,120,87,0.15)" }} />종속·결과</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-sm border border-dashed" style={{ borderColor: "#6b7280" }} />공변인(통제)</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-sm border" style={{ borderColor: "#7c3aed", backgroundColor: "rgba(124,58,237,0.15)" }} />잠재 요인</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-sm border" style={{ borderColor: "#b45309", backgroundColor: "rgba(180,83,9,0.15)" }} />관측 문항</span>
      </div>
      <p className="mt-1.5 text-[10px] text-muted-foreground/80">
        💡 변인 노드를 클릭하면 개념 설명과 아카이브 용어 페이지를 볼 수 있어요.
      </p>

      {/* 사이클 101: 변인 개념 설명 다이얼로그 — 클릭한 노드의 개념 + 아카이브 새 탭 링크 */}
      {openKind && CONCEPT_GLOSSARY[openKind] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpenKind(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-2xl border bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold">{CONCEPT_GLOSSARY[openKind]!.term}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {CONCEPT_GLOSSARY[openKind]!.desc}
            </p>
            <div className="mt-4 flex items-center justify-between gap-2">
              <a
                href={`/archive/foundation-terms?q=${encodeURIComponent(CONCEPT_GLOSSARY[openKind]!.q)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
              >
                아카이브에서 자세히 <ExternalLink size={12} />
              </a>
              <button
                type="button"
                onClick={() => setOpenKind(null)}
                className="rounded-md border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
