"use client";

/**
 * 연구방법 설계 모형 다이어그램 (사이클 56)
 *
 * 연구방법 가이드 상세에서 설계 구조를 시각화한다. 두 레이아웃:
 *  · "ox"   — 교육연구방법론 표준 O-X 표기 (R/NR 그룹 × 시점 그리드). 실험·준실험.
 *  · "flow" — 절차 스텝 박스 + 화살표, cyclic 이면 순환 화살표. 델파이·DBR·액션리서치·설문조사.
 * 가이드 이름(고정)으로 매칭하며 스펙 없는 방법은 렌더하지 않는다.
 */

interface OxSpec {
  type: "ox";
  caption: string;
  legend: string;
  rows: { group: string; cells: string[] }[]; // cells: 시점 순 표기 (O₁, X, O₂ …)
}

interface FlowSpec {
  type: "flow";
  caption: string;
  steps: { label: string; sub?: string }[];
  cyclic?: boolean;
  cycleLabel?: string;
}

type DesignSpec = OxSpec | FlowSpec;

const SPECS: Record<string, DesignSpec> = {
  "실험연구": {
    type: "ox",
    caption: "참여자를 무선배정(R)한 두 집단에 사전검사(O)–처치(X)–사후검사(O)를 실시해, 처치의 인과 효과를 가장 엄격하게 검증한다.",
    legend: "R = 무선배정 · O = 관찰/검사 · X = 처치(프로그램) · — = 처치 없음",
    rows: [
      { group: "실험집단", cells: ["R", "O₁", "X", "O₂"] },
      { group: "통제집단", cells: ["R", "O₃", "—", "O₄"] },
    ],
  },
  "준실험연구": {
    type: "ox",
    caption: "기존 학급처럼 무선배정이 불가능한 집단(NR)에 사전–사후 검사를 실시한다. 집단 간 사전 동등성이 보장되지 않으므로 사전점수를 공변인으로 통제(ANCOVA)하는 경우가 많다.",
    legend: "NR = 비무선배정(기존 집단) · O = 관찰/검사 · X = 처치 · — = 처치 없음",
    rows: [
      { group: "실험집단", cells: ["NR", "O₁", "X", "O₂"] },
      { group: "비교집단", cells: ["NR", "O₃", "—", "O₄"] },
    ],
  },
  "델파이 기법": {
    type: "flow",
    caption: "전문가 패널에게 설문 라운드를 반복하며 통계 피드백을 제공해 익명 상태에서 합의에 수렴해 간다.",
    steps: [
      { label: "전문가 패널 구성", sub: "10~30인 내외" },
      { label: "1라운드", sub: "개방형 의견 수집" },
      { label: "2라운드", sub: "평정 + 통계 피드백" },
      { label: "3라운드", sub: "재평정·수렴 확인" },
      { label: "합의 도출", sub: "CVR·IQR 판정" },
    ],
  },
  "설계기반연구(DBR)": {
    type: "flow",
    caption: "실제 현장에서 설계–실행–분석을 여러 차례 반복하며 개입과 설계 원리를 함께 정련한다 — 반복(iteration)이 설계의 본질이다.",
    steps: [
      { label: "문제 분석", sub: "현장 협력 진단" },
      { label: "해결안 설계", sub: "이론 기반 개입" },
      { label: "현장 실행", sub: "자료 수집" },
      { label: "분석·성찰", sub: "설계 원리 수정" },
    ],
    cyclic: true,
    cycleLabel: "반복 주기 (2~3회+)",
  },
  "액션리서치": {
    type: "flow",
    caption: "실천가(교사)가 자신의 현장 문제를 계획–실행–관찰–성찰의 나선형 순환으로 직접 개선해 간다.",
    steps: [
      { label: "계획", sub: "문제 정의·전략" },
      { label: "실행", sub: "수업 적용" },
      { label: "관찰", sub: "자료 수집" },
      { label: "성찰", sub: "다음 주기 수정" },
    ],
    cyclic: true,
    cycleLabel: "나선형 반복",
  },
  "설문조사연구": {
    type: "flow",
    caption: "모집단을 대표하는 표본에게 구조화된 설문을 실시하고, 그 결과를 모집단으로 일반화한다 — 표집의 대표성이 타당성의 핵심이다.",
    steps: [
      { label: "모집단 정의", sub: "일반화 대상" },
      { label: "표집", sub: "확률/비확률" },
      { label: "설문 실시", sub: "신뢰도 확보" },
      { label: "분석·일반화", sub: "기술·추리통계" },
    ],
  },
};

export function hasDesignDiagram(name: string): boolean {
  return !!SPECS[name];
}

const BOX_FILL = "rgba(29,78,216,0.07)";
const BOX_STROKE = "#1d4ed8";
const TXT = "#334155";

function OxGrid({ spec }: { spec: OxSpec }) {
  const cols = spec.rows[0].cells.length;
  const cellW = 86;
  const groupW = 100;
  const cellH = 44;
  const gap = 8;
  const width = groupW + gap + cols * (cellW + gap) + 4;
  const height = spec.rows.length * (cellH + gap) + 30;
  const timeLabels = ["배정", "사전", "처치", "사후"];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[560px]" role="img" aria-label="연구 설계 표기">
      {spec.rows[0].cells.map((_, c) => (
        <text key={c} x={groupW + gap + c * (cellW + gap) + cellW / 2} y={14} textAnchor="middle" fontSize="10.5" fill="#6b7280">
          {timeLabels[c] ?? ""}
        </text>
      ))}
      {spec.rows.map((row, r) => {
        const y = 22 + r * (cellH + gap);
        return (
          <g key={r}>
            <text x={groupW - 6} y={y + cellH / 2 + 4} textAnchor="end" fontSize="12.5" fontWeight="600" fill={TXT}>
              {row.group}
            </text>
            {row.cells.map((cell, c) => {
              const x = groupW + gap + c * (cellW + gap);
              const isX = cell === "X";
              const isR = c === 0;
              return (
                <g key={c}>
                  <rect
                    x={x}
                    y={y}
                    width={cellW}
                    height={cellH}
                    rx="8"
                    fill={isX ? "rgba(4,120,87,0.10)" : isR ? "rgba(107,114,128,0.07)" : BOX_FILL}
                    stroke={isX ? "#047857" : isR ? "#6b7280" : BOX_STROKE}
                    strokeWidth="1.3"
                    strokeDasharray={isR ? "4 3" : undefined}
                  />
                  <text x={x + cellW / 2} y={y + cellH / 2 + 5} textAnchor="middle" fontSize="15" fontWeight="700" fill={isX ? "#047857" : isR ? "#6b7280" : BOX_STROKE}>
                    {cell}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

function FlowSteps({ spec }: { spec: FlowSpec }) {
  const n = spec.steps.length;
  const boxW = n >= 5 ? 100 : 118;
  const boxH = 50;
  const gap = 34;
  const width = n * boxW + (n - 1) * gap + 8;
  const baseY = 14;
  const height = baseY + boxH + (spec.cyclic ? 46 : 14);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="연구 절차 흐름">
      <defs>
        <marker id="rdd-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
        </marker>
      </defs>
      {spec.steps.map((s, i) => {
        const x = 4 + i * (boxW + gap);
        return (
          <g key={i}>
            <rect x={x} y={baseY} width={boxW} height={boxH} rx="10" fill={BOX_FILL} stroke={BOX_STROKE} strokeWidth="1.3" />
            <text x={x + boxW / 2} y={baseY + (s.sub ? 21 : 30)} textAnchor="middle" fontSize="12" fontWeight="600" fill={BOX_STROKE}>
              {s.label}
            </text>
            {s.sub && (
              <text x={x + boxW / 2} y={baseY + 37} textAnchor="middle" fontSize="9.5" fill="#6b7280">
                {s.sub}
              </text>
            )}
            {i < n - 1 && (
              <line x1={x + boxW + 3} y1={baseY + boxH / 2} x2={x + boxW + gap - 4} y2={baseY + boxH / 2} stroke="#64748b" strokeWidth="1.6" markerEnd="url(#rdd-arrow)" />
            )}
          </g>
        );
      })}
      {spec.cyclic && (
        <g>
          <path
            d={`M ${4 + (n - 1) * (boxW + gap) + boxW / 2} ${baseY + boxH + 4} C ${width * 0.75} ${baseY + boxH + 38}, ${width * 0.25} ${baseY + boxH + 38}, ${4 + boxW / 2} ${baseY + boxH + 4}`}
            fill="none"
            stroke="#64748b"
            strokeWidth="1.5"
            strokeDasharray="5 4"
            markerEnd="url(#rdd-arrow)"
          />
          {spec.cycleLabel && (
            <text x={width / 2} y={baseY + boxH + 34} textAnchor="middle" fontSize="10.5" fill="#6b7280">
              {spec.cycleLabel}
            </text>
          )}
        </g>
      )}
    </svg>
  );
}

export default function ResearchDesignDiagram({ methodName }: { methodName: string }) {
  const spec = SPECS[methodName];
  if (!spec) return null;

  return (
    <div>
      {spec.type === "ox" ? <OxGrid spec={spec} /> : <FlowSteps spec={spec} />}
      <p className="mt-2 text-xs text-muted-foreground">{spec.caption}</p>
      {spec.type === "ox" && (
        <p className="mt-1.5 text-[10px] text-muted-foreground">{spec.legend}</p>
      )}
    </div>
  );
}
