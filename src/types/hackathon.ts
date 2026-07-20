// ─────────────────────────────────────────────────────────────
// hackathon.ts — 에듀테크 해커톤 산출물 제출·심사·수상 (v7-M1)
//
// 기존 해커톤 허브(참가 신청·아이디어 보드)는 comm_boards 를 재사용하지만,
// 팀 산출물 제출 + 심사위원별 루브릭 점수 + 수상 등급은 심사(judging) 도메인이
// 필요하여 전용 컬렉션 2종을 둔다. (workbook submissions/reviews 패턴 재사용)
//
//  - hackathon_submissions : 팀별 산출물 1건 (제출 회원 = ownerId)
//  - hackathon_judgings    : 심사위원 1명이 산출물 1건에 남긴 점수 1건
//    · doc id = `${submissionId}_${judgeId}` (deterministic) → 심사위원별 입력 분리·멱등
// ─────────────────────────────────────────────────────────────

/** 심사 루브릭 기준 키 (4기준 × 5점) — 운영진 확정 전 기본값. */
export type HackathonRubricKey =
  | "problem"
  | "edtech"
  | "completeness"
  | "presentation";

/** 루브릭 기준 정의 — 심사 화면 라벨·설명 표시용. */
export const HACKATHON_RUBRIC: readonly {
  key: HackathonRubricKey;
  label: string;
  hint: string;
}[] = [
  {
    key: "problem",
    label: "문제 정의",
    hint: "교육 현장의 문제를 구체적이고 설득력 있게 정의했는가",
  },
  {
    key: "edtech",
    label: "교육공학적 근거",
    hint: "학습·교수 이론이나 근거에 기반해 해법을 설계했는가",
  },
  {
    key: "completeness",
    label: "구현 완성도",
    hint: "프로토타입·데모가 아이디어를 실제로 보여주는가",
  },
  {
    key: "presentation",
    label: "발표",
    hint: "문제-해법-가치를 명료하게 전달했는가",
  },
];

/** 기준별 최고점. */
export const HACKATHON_RUBRIC_MAX = 5;

/** 수상 등급 — 운영진(staff+)이 심사 후 지정. */
export type HackathonAwardGrade = "grand" | "excellence" | "encouragement";

export const HACKATHON_AWARD_LABELS: Record<HackathonAwardGrade, string> = {
  grand: "대상",
  excellence: "최우수상",
  encouragement: "장려상",
};

/** 표시 순서(상위 → 하위). */
export const HACKATHON_AWARD_ORDER: readonly HackathonAwardGrade[] = [
  "grand",
  "excellence",
  "encouragement",
];

/** 팀별 산출물 제출 1건. */
export interface HackathonSubmission {
  id: string;
  /** 해커톤 회차 식별자 (HACKATHON_CONTEXT_ID) */
  contextId: string;
  /** 팀 이름 */
  teamName: string;
  /** 산출물 제목 */
  title: string;
  /** 산출물 설명 */
  description: string;
  /** 발표자료 링크 (선택) */
  presentationUrl?: string;
  /** 데모 링크 (선택) */
  demoUrl?: string;
  /** 저장소 링크 (선택) */
  repoUrl?: string;
  /** 팀원 이름 목록 */
  members: string[];
  /** 제출 회원 (수정·삭제 권한 기준) */
  ownerId: string;
  ownerName: string;
  /**
   * 팀원 사용자 ID 목록 (v13-H2 — profiles 검색 선택 후 저장, 선택 사항).
   * 저장되면 포트폴리오 자동적재 시 대표 외 팀원도 커버됨.
   */
  memberIds?: string[];
  /** 운영진이 지정한 수상 등급 (미수상 시 부재) */
  award?: HackathonAwardGrade;
  /** 수상작 공개 여부 — 행사 후 운영진이 공개 처리 */
  published?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** 심사위원 1명의 산출물 1건에 대한 루브릭 점수. */
export interface HackathonJudging {
  /** `${submissionId}_${judgeId}` */
  id: string;
  /** 해커톤 회차 식별자 (HACKATHON_CONTEXT_ID) — 회차별 집계 조회용 */
  contextId: string;
  submissionId: string;
  judgeId: string;
  /** 심사위원 이름 (표시용 denorm) */
  judgeName: string;
  /** 기준별 점수 (0 ~ HACKATHON_RUBRIC_MAX) */
  scores: Record<HackathonRubricKey, number>;
  /** 심사 코멘트 (선택) */
  comment?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 아이디어 보드 합류 희망 표시 (M6-v9).
 * doc id = `${questionId}_${userId}` (결정적 — 멱등 upsert)
 */
export interface HackathonTeamJoin {
  /** `${questionId}_${userId}` */
  id: string;
  /** comm_question 의 id (아이디어 카드) */
  questionId: string;
  userId: string;
  userName: string;
  /** HACKATHON_CONTEXT_ID — 회차별 일괄 조회용 */
  contextId: string;
  createdAt?: string;
}

/** 한 산출물의 심사 결과 집계. */
export interface HackathonScoreSummary {
  /** 심사위원 수 */
  judgeCount: number;
  /** 전체 평균 (기준 평균들의 합 = 20점 만점 환산) */
  total: number;
  /** 기준별 평균 */
  byKey: Record<HackathonRubricKey, number>;
}

/**
 * 심사 결과 집계 — 심사위원별 점수 배열에서 기준별 평균과 총점을 계산한다.
 * total = 기준별 평균의 합 (4기준 × 5점 = 20점 만점).
 */
export function summarizeHackathonScores(
  judgings: HackathonJudging[],
): HackathonScoreSummary {
  const keys = HACKATHON_RUBRIC.map((r) => r.key);
  const byKey = {} as Record<HackathonRubricKey, number>;
  const n = judgings.length;
  for (const key of keys) {
    if (n === 0) {
      byKey[key] = 0;
      continue;
    }
    const sum = judgings.reduce((acc, j) => acc + (j.scores?.[key] ?? 0), 0);
    byKey[key] = Math.round((sum / n) * 10) / 10;
  }
  const total = Math.round(keys.reduce((acc, k) => acc + byKey[k], 0) * 10) / 10;
  return { judgeCount: n, total, byKey };
}
