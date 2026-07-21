/**
 * 학습이론 가계도(Theory Map) — 데이터 모듈.
 *
 * 3대 사조(행동주의계·인지주의계·구성주의계)와 그 아래 세부 계열/이론 노드를
 * 정적으로 정의한다. 각 노드는 대표 학자와 함께, 아카이브 개념(archive_concepts)과
 * 이름·별칭으로 매칭하기 위한 후보(conceptNameCandidates)를 가진다.
 *
 * 매칭이 되면 해당 노드는 아카이브 개념 상세로 링크되고, 아직 아카이브에 없는
 * 이론은 비활성(회색)으로 표시된다. 개념이 나중에 추가되면 이름 기반 매칭으로
 * 자동 활성화되므로 이 모듈을 다시 손댈 필요가 없다.
 *
 * ⚠️ 저작권 경계: 분류 체계는 『교수학습공학』(이명근, 2025)의 11계열과
 * AECT 『교육공학 용어해설』 표제어 체계를 참고해 **자체 재구성**한 메타데이터다.
 * 원저작물의 본문·그림은 전재하지 않는다.
 */

export type TheoryFamily = "behaviorism" | "cognitivism" | "constructivism";

export interface TheoryFamilyMeta {
  key: TheoryFamily;
  /** 컬럼 제목 (예: "행동주의계") */
  label: string;
  /** 짧은 이름 (배지·설명용) */
  shortLabel: string;
  /** 한 줄 요약 */
  tagline: string;
  /** 대략적 융성기 */
  era: string;
  /** 표시 순서 */
  order: number;
}

export const THEORY_FAMILIES: TheoryFamilyMeta[] = [
  {
    key: "behaviorism",
    label: "행동주의계",
    shortLabel: "행동주의",
    tagline: "관찰 가능한 자극-반응-결과로 학습을 설명",
    era: "1900s~1950s",
    order: 1,
  },
  {
    key: "cognitivism",
    label: "인지주의계",
    shortLabel: "인지주의",
    tagline: "머릿속 정보처리·표상·인지구조에 주목",
    era: "1920s~1980s",
    order: 2,
  },
  {
    key: "constructivism",
    label: "구성주의계",
    shortLabel: "구성주의",
    tagline: "학습자가 맥락 속에서 지식을 능동 구성",
    era: "1930s~현재",
    order: 3,
  },
];

const THEORY_FAMILY_META: Record<TheoryFamily, TheoryFamilyMeta> =
  THEORY_FAMILIES.reduce(
    (acc, f) => {
      acc[f.key] = f;
      return acc;
    },
    {} as Record<TheoryFamily, TheoryFamilyMeta>,
  );

/** 노드 간 간선(파생·영향·대조·가교) — to 는 대상 노드의 name */
export interface TheoryNodeLink {
  to: string;
  /** 관계 라벨 (예: 대조·영향·확장·발전·가교) */
  relation: string;
}

export interface TheoryNode {
  /** 이론명 (표시 및 간선 참조 키) */
  name: string;
  /** 대표 학자 */
  scholars: string[];
  family: TheoryFamily;
  era?: string;
  /**
   * 아카이브 개념 매칭용 이름·별칭 후보.
   * 공백·대소문자 무시로 archive_concepts 의 name/aectTerm/altNames 와 대조한다.
   */
  conceptNameCandidates: string[];
  /** 계열 안내·가교 설명 등 부가 메모 */
  note?: string;
  /** 다른 노드와의 관계(간선) */
  links?: TheoryNodeLink[];
  /** 계열 총론 노드 여부 (강조 표시용) */
  isOverview?: boolean;
}

/**
 * 학습이론 노드.
 * 계열/이론 분류는 자체 재구성이며, conceptNameCandidates 는 현행 아카이브 시드의
 * 개념명·별칭과 앞으로 추가될 조건화 계열 이름을 함께 담아 자동 활성화되도록 했다.
 */
export const THEORY_NODES: TheoryNode[] = [
  // ─────────────── 행동주의계 ───────────────
  {
    name: "고전적 조건화",
    scholars: ["Ivan Pavlov"],
    family: "behaviorism",
    era: "1900s",
    conceptNameCandidates: [
      "고전적 조건화",
      "고전 조건화",
      "Classical Conditioning",
      "Respondent Conditioning",
    ],
    note: "중성 자극이 무조건 자극과 짝지어져 반응을 유발 — 반응적(선행 자극) 학습",
    links: [{ to: "작동적 조건화", relation: "대조" }],
  },
  {
    name: "효과의 법칙 · 시행착오 학습",
    scholars: ["Edward Thorndike"],
    family: "behaviorism",
    era: "1900s~1910s",
    conceptNameCandidates: [
      "효과의 법칙",
      "시행착오 학습",
      "시행착오",
      "결합 조건화",
      "결합주의",
      "Law of Effect",
      "Trial and Error Learning",
      "Connectionism",
    ],
    note: "만족스러운 결과가 뒤따르면 자극-반응 결합이 강해진다 — 작동적 조건화의 선구",
    links: [{ to: "작동적 조건화", relation: "발전" }],
  },
  {
    name: "인접 조건화",
    scholars: ["Edwin Guthrie"],
    family: "behaviorism",
    era: "1930s",
    conceptNameCandidates: [
      "인접 조건화",
      "인접성 이론",
      "근접 조건화",
      "Contiguity",
      "Contiguity Theory",
    ],
    note: "자극과 반응이 시간적으로 인접하기만 하면 한 번에 결합된다는 관점",
  },
  {
    name: "작동적 조건화",
    scholars: ["B. F. Skinner"],
    family: "behaviorism",
    era: "1930s~1950s",
    conceptNameCandidates: [
      "작동적 조건화",
      "조작적 조건화",
      "작동 조건화",
      "Operant Conditioning",
    ],
    note: "행동은 뒤따르는 결과(강화·처벌)에 따라 조성된다 — 프로그램 수업의 기초",
    links: [{ to: "행동주의", relation: "총론" }],
  },
  {
    name: "행동주의",
    scholars: ["Watson", "Pavlov", "Thorndike", "Skinner"],
    family: "behaviorism",
    era: "1910s~1950s",
    conceptNameCandidates: ["행동주의", "Behaviorism"],
    note: "관찰 가능한 행동 변화로 학습을 설명하는 사조 총칭",
    isOverview: true,
  },

  // ─────────────── 인지주의계 ───────────────
  {
    name: "형태주의 · 통찰학습",
    scholars: ["Wolfgang Köhler", "Kurt Koffka", "Kurt Lewin"],
    family: "cognitivism",
    era: "1910s~1930s",
    conceptNameCandidates: [
      "형태주의",
      "게슈탈트",
      "게슈탈트 심리학",
      "통찰학습",
      "통찰 학습",
      "Gestalt",
      "Gestalt Psychology",
      "Insight Learning",
    ],
    note: "전체는 부분의 합 이상 — 통찰(insight)에 의한 문제 재구조화. 인지주의의 선구",
    links: [{ to: "인지주의 학습이론", relation: "선구" }],
  },
  {
    name: "잠재학습 · 인지도",
    scholars: ["Edward Tolman"],
    family: "cognitivism",
    era: "1930s~1940s",
    conceptNameCandidates: [
      "잠재학습",
      "잠재 학습",
      "인지도",
      "신호학습",
      "목적적 행동주의",
      "Latent Learning",
      "Cognitive Map",
      "Sign Learning",
    ],
    note: "강화 없이도 학습은 일어나 인지도(cognitive map)로 저장된다 — 행동주의에서 인지로",
    links: [{ to: "인지주의 학습이론", relation: "영향" }],
  },
  {
    name: "정보처리이론",
    scholars: ["George Miller", "Donald Broadbent"],
    family: "cognitivism",
    era: "1950s~1970s",
    conceptNameCandidates: [
      "정보처리이론",
      "정보처리",
      "Information Processing Theory",
      "IPT",
    ],
    note: "감각기억-작업기억-장기기억의 정보 흐름으로 학습을 설명",
    links: [{ to: "인지부하", relation: "발전" }],
  },
  {
    name: "스키마이론",
    scholars: ["Frederic Bartlett", "Jean Piaget"],
    family: "cognitivism",
    era: "1930s~1980s",
    conceptNameCandidates: ["스키마이론", "스키마", "도식이론", "Schema Theory"],
    note: "경험을 압축한 지식 구조(스키마)로 이해·기억·재구성을 설명",
    links: [{ to: "인지부하", relation: "연결" }],
  },
  {
    name: "이중부호화이론",
    scholars: ["Allan Paivio"],
    family: "cognitivism",
    era: "1970s~1980s",
    conceptNameCandidates: [
      "이중부호화이론",
      "이중부호화",
      "Dual Coding Theory",
      "DCT",
    ],
    note: "언어·시각 두 부호 체계가 함께 처리될 때 학습이 촉진",
  },
  {
    name: "인지부하",
    scholars: ["John Sweller"],
    family: "cognitivism",
    era: "1980s~현재",
    conceptNameCandidates: [
      "인지부하",
      "인지부하이론",
      "인지 부하",
      "Cognitive Load",
      "Cognitive Load Theory",
    ],
    note: "작업기억 용량의 한계를 고려한 멀티미디어 학습 설계의 근거",
  },
  {
    name: "인지주의 학습이론",
    scholars: ["Ausubel", "Bruner", "Gagné"],
    family: "cognitivism",
    era: "1950s~1980s",
    conceptNameCandidates: [
      "인지주의 학습이론",
      "인지주의",
      "Cognitive Learning Theory",
    ],
    note: "인지 구조·처리 과정·표상의 발달에 초점을 둔 이론 계열 총칭",
    isOverview: true,
  },
  {
    name: "관찰학습 · 사회인지",
    scholars: ["Albert Bandura"],
    family: "cognitivism",
    era: "1960s~1980s",
    conceptNameCandidates: [
      "관찰학습",
      "관찰 학습",
      "사회인지이론",
      "사회학습이론",
      "사회 인지 이론",
      "Observational Learning",
      "Social Cognitive Theory",
      "Social Learning Theory",
    ],
    note: "행동주의(강화)와 인지주의(기대·자기효능감)를 잇는 가교. 자기효능감의 모이론",
    links: [{ to: "행동주의", relation: "가교(행동↔인지)" }],
  },

  // ─────────────── 구성주의계 ───────────────
  {
    name: "개인적 구성주의",
    scholars: ["Jean Piaget"],
    family: "constructivism",
    era: "1930s~1970s",
    conceptNameCandidates: [
      "개인적 구성주의",
      "인지적 구성주의",
      "Cognitive Constructivism",
      "Personal Constructivism",
      "Piaget",
    ],
    note: "동화·조절을 통한 개인의 인지 발달 — 발달이 학습에 선행",
    links: [{ to: "스키마이론", relation: "영향" }],
  },
  {
    name: "사회문화적 구성주의",
    scholars: ["Lev Vygotsky"],
    family: "constructivism",
    era: "1930s / 재조명 1980s",
    conceptNameCandidates: [
      "사회문화적 구성주의",
      "사회적 구성주의",
      "사회문화이론",
      "Sociocultural Theory",
      "Social Constructivism",
      "Vygotsky",
    ],
    note: "근접발달영역(ZPD)·비계 — 학습이 발달을 이끈다",
    links: [{ to: "상황인지", relation: "영향" }],
  },
  {
    name: "상황인지",
    scholars: ["Brown", "Collins", "Duguid"],
    family: "constructivism",
    era: "1980s~1990s",
    conceptNameCandidates: [
      "상황인지",
      "상황학습",
      "상황 인지",
      "Situated Cognition",
      "Situated Learning",
    ],
    note: "지식은 사회문화적 맥락 안에 존재 — 실제 맥락 기반 설계의 기초",
    links: [{ to: "실천공동체", relation: "확장" }],
  },
  {
    name: "구성주의",
    scholars: ["Piaget", "Vygotsky", "von Glasersfeld"],
    family: "constructivism",
    era: "1980s~현재",
    conceptNameCandidates: ["구성주의", "Constructivism"],
    note: "지식은 전달받는 것이 아니라 학습자가 스스로 구성한다는 인식론",
    isOverview: true,
  },
  {
    name: "문화역사적 활동이론",
    scholars: ["Leont'ev", "Engeström"],
    family: "constructivism",
    era: "1970s~현재",
    conceptNameCandidates: [
      "문화역사적 활동이론",
      "활동이론",
      "활동 이론",
      "Activity Theory",
      "CHAT",
      "Cultural-Historical Activity Theory",
    ],
    note: "도구·공동체·규칙이 매개하는 활동 체계로 학습을 분석 (Vygotsky 계보)",
  },
  {
    name: "실천공동체",
    scholars: ["Jean Lave", "Etienne Wenger"],
    family: "constructivism",
    era: "1990s~현재",
    conceptNameCandidates: [
      "실천공동체",
      "실행공동체",
      "실천 공동체",
      "Community of Practice",
      "CoP",
      "Communities of Practice",
    ],
    note: "정당한 주변적 참여를 통해 공동체 실천에 편입되며 학습",
  },
];

/** 공백·대소문자 무시 정규화 (AectTerminologyBrowser 와 동일 규칙) */
export function normalizeTheoryName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** 특정 계열의 노드만 표시 순서대로 반환 */
export function theoryNodesByFamily(family: TheoryFamily): TheoryNode[] {
  return THEORY_NODES.filter((n) => n.family === family);
}

/** 자료 출처 고지 (저작권 경계) */
export const THEORY_MAP_SOURCE = {
  book: "『교수학습공학: 이론적 기초와 동향』",
  author: "이명근",
  publisher: "학지사",
  year: 2025,
  aect: "AECT 『교육공학 용어해설』",
} as const;
