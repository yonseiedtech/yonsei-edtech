// ────────────────────────────────────────────────────────────
// lib/research-question-generator.ts — 연구 모형 → 연구문제 자동 생성 (M4, 2026-06)
//
// 연구 모형(ResearchModelData: 변인 노드 + 관계 엣지)의 구조 패턴을 읽어
// 교육공학 맥락에 자연스러운 연구문제 문장 후보를 만든다.
//
// 생성 규칙(패턴 → 문장 템플릿):
//   - 직접효과 (IV → DV)            : "{독립}은(는) {종속}에 영향을 미치는가?"
//   - 매개      (IV → M → DV)       : "{매개}은(는) {독립}과(와) {종속}의 관계를 매개하는가?"
//   - 조절      (Mod 변인 존재)      : "{조절}에 따라 {독립}이(가) {종속}에 미치는 영향이 달라지는가?"
//   - 집단차이  (IV가 집단/범주형)    : "{독립}에 따라 {종속}에 차이가 있는가?"  (보조 후보)
//   - 기술통계  (관계 엣지가 없을 때)  : "{종속}의 수준(실태)은 어떠한가?"        (폴백)
//
// research-variable-sync.ts 와 동일하게 모형의 자기완결성을 깨지 않기 위해
// 변환 로직은 lib 에 둔다. 순수 함수(부수효과 없음)로 테스트 가능.
// ────────────────────────────────────────────────────────────

import {
  type ResearchModelData,
  type ResearchModelNode,
  type VariableKind,
} from "@/types/research-model";

/** 생성된 연구문제 1건의 출처 패턴 — UI 배지·정렬용 */
export type QuestionPattern =
  | "direct" // 직접효과 (독립 → 종속)
  | "mediation" // 매개
  | "moderation" // 조절
  | "group_difference" // 집단차이
  | "descriptive"; // 기술통계 (폴백)

export const QUESTION_PATTERN_LABELS: Record<QuestionPattern, string> = {
  direct: "직접효과",
  mediation: "매개효과",
  moderation: "조절효과",
  group_difference: "집단차이",
  descriptive: "기술/실태",
};

/** 생성된 연구문제 1건 */
export interface GeneratedQuestion {
  /** 안정적 식별자 (변인 라벨 기반 — 같은 모형이면 동일 id) */
  id: string;
  /** 완성된 연구문제 문장 */
  text: string;
  pattern: QuestionPattern;
}

// ── 한국어 조사 처리 ────────────────────────────────────────

/** 마지막 글자에 받침이 있는지 (한글 음절 기준). 한글이 아니면 false(받침 없음 취급). */
function hasFinalConsonant(word: string): boolean {
  const ch = word.trim().slice(-1);
  if (!ch) return false;
  const code = ch.charCodeAt(0);
  // 한글 음절 영역(가~힣)
  if (code < 0xac00 || code > 0xd7a3) return false;
  // (code - 0xAC00) % 28 === 0 이면 받침 없음
  return (code - 0xac00) % 28 !== 0;
}

/** 받침에 따라 은/는 */
function topic(word: string): string {
  return `${word}${hasFinalConsonant(word) ? "은" : "는"}`;
}
/** 받침에 따라 이/가 */
function subject(word: string): string {
  return `${word}${hasFinalConsonant(word) ? "이" : "가"}`;
}
/** 받침에 따라 과/와 */
function and(word: string): string {
  return `${word}${hasFinalConsonant(word) ? "과" : "와"}`;
}

// ── 라벨 정리 ──────────────────────────────────────────────

function clean(label: string): string {
  return (label ?? "").trim();
}

/** 변인 라벨로 안정적 slug 생성 (id 용 — 한글 보존, 공백/특수문자만 치환) */
function slug(...parts: string[]): string {
  return parts
    .map((p) => clean(p).replace(/\s+/g, "_"))
    .join("__")
    .replace(/[^\p{L}\p{N}_]/gu, "");
}

// ── 핵심: 모형 → 연구문제 목록 ──────────────────────────────

/**
 * 연구 모형의 변인·관계 구조를 분석해 연구문제 후보 목록을 만든다.
 * 우선순위: 매개 > 조절 > 직접효과 > 집단차이 > 기술통계(폴백).
 * 동일한 연구문제(동일 text)는 중복 제거한다.
 */
export function generateQuestions(model: ResearchModelData): GeneratedQuestion[] {
  const nodeById = new Map<string, ResearchModelNode>();
  for (const n of model.nodes) nodeById.set(n.id, n);

  const labelOf = (id: string): string => clean(nodeById.get(id)?.label ?? "");
  const kindOf = (id: string): VariableKind | undefined => nodeById.get(id)?.type;

  const out: GeneratedQuestion[] = [];
  const seenText = new Set<string>();

  function push(q: GeneratedQuestion) {
    const t = q.text.trim();
    if (!t || seenText.has(t)) return;
    seenText.add(t);
    out.push({ ...q, text: t });
  }

  const nodesByKind = (kind: VariableKind): ResearchModelNode[] =>
    model.nodes.filter((n) => n.type === kind && clean(n.label));

  const independents = nodesByKind("independent");
  const dependents = nodesByKind("dependent");
  const mediators = nodesByKind("mediator");
  const moderators = nodesByKind("moderator");

  // 유효 엣지: 양 끝 노드가 라벨을 가진 경우만
  const edges = model.edges.filter(
    (e) => labelOf(e.source) && labelOf(e.target),
  );

  // ── 1) 매개: IV → M → DV (두 엣지가 매개변인을 경유) ──
  for (const med of mediators) {
    const incoming = edges.filter((e) => e.target === med.id);
    const outgoing = edges.filter((e) => e.source === med.id);
    for (const inc of incoming) {
      const ivKind = kindOf(inc.source);
      if (ivKind !== "independent") continue;
      for (const outg of outgoing) {
        const dvKind = kindOf(outg.target);
        if (dvKind !== "dependent") continue;
        const iv = labelOf(inc.source);
        const dv = labelOf(outg.target);
        const m = clean(med.label);
        push({
          id: slug("med", iv, m, dv),
          pattern: "mediation",
          text: `${topic(m)} ${and(iv)} ${dv}의 관계를 매개하는가?`,
        });
      }
    }
  }

  // ── 2) 직접효과: IV → DV (엣지 기반) ──
  for (const e of edges) {
    if (kindOf(e.source) !== "independent") continue;
    if (kindOf(e.target) !== "dependent") continue;
    const iv = labelOf(e.source);
    const dv = labelOf(e.target);
    push({
      id: slug("dir", iv, dv),
      pattern: "direct",
      text: `${topic(iv)} ${dv}에 영향을 미치는가?`,
    });
  }

  // ── 3) 조절: 조절변인 × (IV → DV) ──
  if (moderators.length > 0) {
    // 직접효과 쌍(엣지 우선, 없으면 IV×DV 조합)
    const pairs = directPairs(edges, kindOf, labelOf, independents, dependents);
    for (const mod of moderators) {
      const w = clean(mod.label);
      for (const { iv, dv } of pairs) {
        push({
          id: slug("mod", w, iv, dv),
          pattern: "moderation",
          text: `${w}에 따라 ${subject(iv)} ${dv}에 미치는 영향이 달라지는가?`,
        });
      }
    }
  }

  // ── 4) 직접효과 폴백: 엣지가 없지만 IV·DV 가 모두 있을 때 조합 생성 ──
  if (out.every((q) => q.pattern !== "direct") && independents.length > 0 && dependents.length > 0) {
    for (const iv of independents) {
      for (const dv of dependents) {
        push({
          id: slug("dir", iv.label, dv.label),
          pattern: "direct",
          text: `${topic(clean(iv.label))} ${clean(dv.label)}에 영향을 미치는가?`,
        });
      }
    }
  }

  // ── 5) 집단차이 보조 후보: IV·DV 가 있을 때 (양적 집단 비교 관점) ──
  if (independents.length > 0 && dependents.length > 0) {
    for (const iv of independents) {
      for (const dv of dependents) {
        push({
          id: slug("grp", iv.label, dv.label),
          pattern: "group_difference",
          text: `${clean(iv.label)}에 따라 ${clean(dv.label)}에 차이가 있는가?`,
        });
      }
    }
  }

  // ── 6) 기술통계 폴백: 관계가 전혀 없고 종속/독립만 있을 때 ──
  if (out.length === 0) {
    const targets = dependents.length > 0 ? dependents : independents;
    for (const t of targets) {
      push({
        id: slug("desc", t.label),
        pattern: "descriptive",
        text: `${clean(t.label)}의 수준(실태)은 어떠한가?`,
      });
    }
  }

  return out;
}

/** 직접효과 변인 쌍 추출 — 엣지(IV→DV)가 있으면 그것을, 없으면 IV×DV 조합 */
function directPairs(
  edges: ResearchModelData["edges"],
  kindOf: (id: string) => VariableKind | undefined,
  labelOf: (id: string) => string,
  independents: ResearchModelNode[],
  dependents: ResearchModelNode[],
): { iv: string; dv: string }[] {
  const fromEdges: { iv: string; dv: string }[] = [];
  const seen = new Set<string>();
  for (const e of edges) {
    if (kindOf(e.source) !== "independent" || kindOf(e.target) !== "dependent") continue;
    const iv = labelOf(e.source);
    const dv = labelOf(e.target);
    const key = `${iv}__${dv}`;
    if (seen.has(key)) continue;
    seen.add(key);
    fromEdges.push({ iv, dv });
  }
  if (fromEdges.length > 0) return fromEdges;
  // 폴백: 조합
  const combos: { iv: string; dv: string }[] = [];
  for (const iv of independents) {
    for (const dv of dependents) {
      combos.push({ iv: clean(iv.label), dv: clean(dv.label) });
    }
  }
  return combos;
}

/** 두 연구문제 목록이 (text 집합 기준) 동일한지 — import 버튼 비활성·중복 저장 방지용 */
export function sameQuestions(a: string[] | undefined, b: string[] | undefined): boolean {
  const ca = (a ?? []).map((s) => s.trim()).filter(Boolean);
  const cb = (b ?? []).map((s) => s.trim()).filter(Boolean);
  if (ca.length !== cb.length) return false;
  for (let i = 0; i < ca.length; i += 1) {
    if (ca[i] !== cb[i]) return false;
  }
  return true;
}
