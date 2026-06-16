/**
 * 공동 연구자 추천 매칭 로직 (collaborator-recommendation)
 *
 * 회원 간 관심 키워드·연구 주제·연구분야·전공·신분/학교급 overlap 을 종합해
 * "함께 연구할 만한 회원" 추천 점수를 산정한다.
 *
 * 설계 원칙:
 * - 본인 제외, 승인(approved && !rejected) 회원만 후보.
 * - 프라이버시: 관심 분야 비공개(sectionVisibility.researchInterests === "private")
 *   회원은 키워드/주제 기반 매칭 근거에서 제외 (cohort/신분 등 비민감 신호만 사용).
 * - 추천 근거(reasons)를 함께 반환해 UI 에서 "왜 추천됐는지" 표시 (사용자 요청 핵심).
 * - 신규 컬렉션·네트워크 호출 없이 이미 로드된 User[] 만으로 순수 계산.
 *
 * 시간 복잡도: O(N) (본인 1명 대 전체). N≤1000 단일 스레드 충분.
 */

import type { SectionVisibility, User } from "@/types";

/** 추천 근거 1건 — UI 칩/문장으로 표시 */
export interface MatchReason {
  kind:
    | "interest_keyword" // 공통 관심 키워드
    | "research_topic" // 공통 연구 주제 키워드
    | "research_field" // 같은 연구분야 (User.field)
    | "occupation" // 같은 신분 유형
    | "school_level" // 같은 학교급
    | "cohort"; // 동기 (입학 시점)
  /** 한국어 라벨 (칩 헤더) */
  label: string;
  /** 구체 근거 항목 (공통 키워드 등) — 비어 있을 수 있음 */
  items: string[];
  /** 이 근거가 점수에 기여한 가중치 */
  score: number;
}

/** 추천 결과 1건 */
export interface CollaboratorMatch {
  user: User;
  /** 총 매칭 점수 (내림차순 정렬 기준) */
  score: number;
  /** 추천 근거 목록 (점수 기여 큰 순) */
  reasons: MatchReason[];
}

// ── 가중치 (튜닝 가능) ──
const W = {
  /** 공통 관심 키워드 1건당 */
  interestKeyword: 3,
  /** 공통 연구 주제 키워드 1건당 */
  researchTopic: 2.5,
  /** 같은 연구분야(field) */
  researchField: 2,
  /** 같은 신분 유형(occupation) */
  occupation: 1,
  /** 같은 학교급 */
  schoolLevel: 1.5,
  /** 동기 (입학 시점) */
  cohort: 1.5,
} as const;

/** 문자열 정규화 — 공백/대소문자 차이 흡수 */
function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** 두 문자열 배열의 교집합 (원본 표기 유지, 본인 기준 표기 우선) */
function intersect(mine: string[], theirs: string[]): string[] {
  const theirSet = new Set(theirs.map(norm));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of mine) {
    const key = norm(raw);
    if (!key || seen.has(key)) continue;
    if (theirSet.has(key)) {
      seen.add(key);
      out.push(raw.trim());
    }
  }
  return out;
}

/**
 * 연구 주제(researchTopics) 는 1~3문장 자유서술이므로 그대로 비교하면 거의 겹치지 않는다.
 * 의미 있는 토큰(2글자 이상 한글/영문 단어)으로 분해해 교집합을 구한다.
 */
function topicTokens(topics: string[] | undefined): string[] {
  if (!topics?.length) return [];
  const tokens = new Set<string>();
  for (const t of topics) {
    for (const m of t.matchAll(/[가-힣]{2,}|[A-Za-z]{3,}/g)) {
      tokens.add(norm(m[0]));
    }
  }
  return [...tokens];
}

/** 관심 분야 섹션이 비공개인지 — 비공개면 키워드/주제 기반 근거 제외 */
function interestsHidden(user: User): boolean {
  const level: SectionVisibility | undefined =
    user.sectionVisibility?.researchInterests;
  return level === "private";
}

/**
 * 본인(me)에 대한 전체 회원 추천 매칭.
 *
 * @param me        현재 로그인 회원
 * @param candidates 전체 회원 목록 (본인 포함 가능 — 내부에서 제외)
 * @param limit     반환할 최대 추천 수 (기본 6)
 */
export function recommendCollaborators(
  me: User,
  candidates: User[],
  limit = 6,
): CollaboratorMatch[] {
  const myKeywords = dedupeNonEmpty([
    ...(me.interestKeywords ?? []),
    ...(me.researchInterests ?? []),
  ]);
  const myTopicTokens = topicTokens(me.researchTopics);
  const myField = me.field ? norm(me.field) : "";

  const results: CollaboratorMatch[] = [];

  for (const other of candidates) {
    if (other.id === me.id) continue;
    if (!other.approved || other.rejected) continue;

    const reasons: MatchReason[] = [];
    let score = 0;

    const otherInterestsHidden = interestsHidden(other);

    // ── 1. 공통 관심 키워드 (interestKeywords + researchInterests) ──
    if (!otherInterestsHidden) {
      const otherKeywords = dedupeNonEmpty([
        ...(other.interestKeywords ?? []),
        ...(other.researchInterests ?? []),
      ]);
      const commonKeywords = intersect(myKeywords, otherKeywords);
      if (commonKeywords.length > 0) {
        const s = commonKeywords.length * W.interestKeyword;
        score += s;
        reasons.push({
          kind: "interest_keyword",
          label: "공통 관심 키워드",
          items: commonKeywords,
          score: s,
        });
      }

      // ── 2. 공통 연구 주제 키워드 (토큰 교집합) ──
      const otherTopicTokens = topicTokens(other.researchTopics);
      const commonTopics = intersect(myTopicTokens, otherTopicTokens);
      if (commonTopics.length > 0) {
        const s = commonTopics.length * W.researchTopic;
        score += s;
        reasons.push({
          kind: "research_topic",
          label: "비슷한 연구 주제",
          items: commonTopics,
          score: s,
        });
      }
    }

    // ── 3. 같은 연구분야 (User.field) ──
    if (myField && other.field && norm(other.field) === myField) {
      score += W.researchField;
      reasons.push({
        kind: "research_field",
        label: "같은 연구분야",
        items: [other.field.trim()],
        score: W.researchField,
      });
    }

    // ── 4. 같은 학교급 ──
    if (me.schoolLevel && other.schoolLevel && me.schoolLevel === other.schoolLevel) {
      score += W.schoolLevel;
      reasons.push({
        kind: "school_level",
        label: "같은 학교급",
        items: [SCHOOL_LEVEL_KO[other.schoolLevel] ?? other.schoolLevel],
        score: W.schoolLevel,
      });
    }

    // ── 5. 같은 신분 유형 (occupation) ──
    if (me.occupation && other.occupation && me.occupation === other.occupation) {
      score += W.occupation;
      reasons.push({
        kind: "occupation",
        label: "같은 신분 유형",
        items: [OCCUPATION_KO[other.occupation] ?? other.occupation],
        score: W.occupation,
      });
    }

    // ── 6. 동기 (입학 시점) ──
    if (
      me.enrollmentYear &&
      me.enrollmentHalf &&
      other.enrollmentYear === me.enrollmentYear &&
      other.enrollmentHalf === me.enrollmentHalf
    ) {
      score += W.cohort;
      const half = me.enrollmentHalf === 2 ? "후기" : "전기";
      reasons.push({
        kind: "cohort",
        label: "입학 동기",
        items: [`${me.enrollmentYear}년 ${half}`],
        score: W.cohort,
      });
    }

    // 근거가 하나도 없으면 추천하지 않음 (무근거 추천 방지)
    if (score <= 0 || reasons.length === 0) continue;

    reasons.sort((a, b) => b.score - a.score);
    results.push({ user: other, score, reasons });
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // 동점 시 근거 종류가 많은 회원 우선, 그다음 이름순
    if (b.reasons.length !== a.reasons.length) {
      return b.reasons.length - a.reasons.length;
    }
    return (a.user.name ?? "").localeCompare(b.user.name ?? "");
  });

  return results.slice(0, limit);
}

/** 빈 문자열 제거 + 중복 제거 (원본 표기 유지) */
function dedupeNonEmpty(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of arr) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = norm(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

// ── 라벨 (User type 의 *_LABELS 와 중복 import 회피용 경량 맵) ──
const OCCUPATION_KO: Record<string, string> = {
  corporate: "기업 재직",
  teacher: "학교 교사",
  researcher: "연구소/기관",
  public: "공무원/공공기관",
  freelancer: "프리랜서",
  other: "기타",
};

const SCHOOL_LEVEL_KO: Record<string, string> = {
  kindergarten: "유아교육",
  elementary: "초등학교",
  middle: "중학교",
  high: "고등학교",
};
