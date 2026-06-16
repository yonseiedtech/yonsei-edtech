/**
 * portfolio-aggregate.ts — 연구·활동 포트폴리오 자동 집계 (백로그 v3 G3)
 *
 * 회원 본인의 흩어진 활동/성취 데이터(연구 진행도·수료증·진단 준비도·학습 잔디)를
 * 하나의 "연구·활동 포트폴리오 요약"으로 합산하는 순수 함수 + 타입.
 *
 * 설계 원칙:
 *  - 채점·진행률 로직은 기존 순수 함수(thesis-progress·diagnostic)에 위임 — 여기선 합산·요약만.
 *  - 모든 입력은 read-only 도메인 데이터(서버 Admin SDK 또는 클라이언트 react-query 조회 결과).
 *  - 새 컬렉션을 만들지 않고 기존 데이터를 재해석한다.
 *  - 학습 잔디(LearningStreak)는 클라이언트 위젯의 11개 컬렉션 합산을 그대로 복제하지 않고,
 *    userId 단일 필터로 안전하게 조회 가능한 핵심 소스만으로 "활동일 / 누적 점수 / 활동 종류"
 *    요약을 산출한다(grid·주차 streak 등 표시 전용 계산은 제외).
 */

import {
  computeReadiness,
  type AreaScore,
  type DiagnosticArea,
  type DiagnosticResult,
} from "@/types";
import {
  chapterBalance,
  computeReportCompletion,
  computeThesisProgress,
  BALANCE_MIN_CHARS,
  type ReportCompletion,
} from "@/features/research/thesis-progress";
import type { ResearchProposal, WritingPaper } from "@/types";

// ── 연구 진행도 요약 ──

export interface ResearchProgressSummary {
  /** 본문(5장) 글자 총합 */
  totalChars: number;
  /** 보고서 완성도 요약 (작성률·균형·lint) */
  completion: ReportCompletion;
  /** 연구계획서 작성 여부 */
  hasProposal: boolean;
  /** 계획서 제목(국문, 있으면) */
  proposalTitle?: string;
}

/**
 * 연구 진행도 요약 — writing_papers(본문) + research_proposals(계획서) 재해석.
 * lint·균형은 본문이 충분할 때만 의미를 가지므로 thesis-progress 순수 함수에 위임.
 * (writing-lint 는 클라이언트 위젯에서만 호출 — 서버 집계에선 lint 통과율을 측정하지 않고 null 로 둔다.)
 */
export function summarizeResearchProgress(
  paper: WritingPaper | null,
  proposal: ResearchProposal | null,
): ResearchProgressSummary {
  const hasProposal = !!(
    proposal &&
    (proposal.titleKo || proposal.purpose || proposal.content)
  );
  const progress = computeThesisProgress({
    paper: paper ?? null,
    hasProposal,
  });
  const balance =
    progress.totalChars >= BALANCE_MIN_CHARS
      ? chapterBalance(
          progress.chapters.map((c) => ({ key: c.key, chars: c.chars })),
          progress.totalChars,
        )
      : [];
  // 서버 집계는 lint 를 측정하지 않는다(분모 0 → lintPassPercent null).
  const completion = computeReportCompletion({
    progress,
    balance,
    cleanChapters: 0,
    writtenChapters: 0,
  });
  return {
    totalChars: progress.totalChars,
    completion,
    hasProposal,
    proposalTitle: proposal?.titleKo || undefined,
  };
}

// ── 진단 준비도 요약 ──

export interface DiagnosisReadinessSummary {
  /** 응시 회차 수 */
  attempts: number;
  /** 가장 최근 회차 일시(ISO) */
  latestAt?: string;
  /** 논문 작성 준비도 0~100 (최신 회차 저장값 우선) */
  paperReadiness: number;
  /** 연구 분석 준비도 0~100 */
  analysisReadiness: number;
  /** 영역별 정답 누계(여러 회차 합산이 아닌 최신 회차 표시값) */
  areaScores: Partial<Record<DiagnosticArea, AreaScore>>;
}

/**
 * 진단 준비도 요약 — diagnostic_results 다회차 중 최신 회차 기준 표시값을 사용.
 * 저장된 paperReadiness/analysisReadiness 가 있으면 그대로 신뢰하고(저장 시점 환산),
 * 누락 시 areaScores 로부터 computeReadiness 로 폴백한다(하위호환).
 */
export function summarizeDiagnosisReadiness(
  results: DiagnosticResult[],
): DiagnosisReadinessSummary | null {
  if (!results.length) return null;
  const sorted = [...results].sort((a, b) =>
    (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
  );
  const latest = sorted[0];
  const areaScores = latest.areaScores ?? {};
  const fallback = computeReadiness(areaScores);
  return {
    attempts: results.length,
    latestAt: latest.createdAt,
    paperReadiness:
      typeof latest.paperReadiness === "number"
        ? latest.paperReadiness
        : fallback.paperReadiness,
    analysisReadiness:
      typeof latest.analysisReadiness === "number"
        ? latest.analysisReadiness
        : fallback.analysisReadiness,
    areaScores,
  };
}

// ── 학습 잔디(스트릭) 요약 ──

/**
 * LearningStreak 위젯과 동일한 점수 가중치 (src/features/mypage/LearningStreak.tsx SCORES).
 * 서버 집계 요약에서는 일별 1회 가산 소스 중심으로 안전하게 합산한다.
 */
export const STREAK_POINTS = {
  paperWriting: 6,
  diagnosticComplete: 5,
  paperReading: 4,
  flashcardStudy: 2,
  reflection: 3,
} as const;

export interface StreakDaySource {
  /** YYYY-MM-DD (로컬/KST) */
  ymd: string;
  /** 활동 종류 라벨 */
  label: string;
  /** 가산 점수 */
  points: number;
}

export interface StreakSummary {
  /** 활동이 1건 이상 있었던 고유 일수 */
  activeDays: number;
  /** 누적 점수 */
  totalPoints: number;
  /** 활동 종류 수 (몇 가지 활동을 했는지) */
  activityKinds: number;
  /** 가장 최근 활동일(YYYY-MM-DD) */
  lastActiveYmd?: string;
}

/**
 * 일별 활동 소스 목록 → 잔디 요약.
 * 같은 날 같은 라벨은 1회만 가산(day-bucketed)되도록 호출 측에서 정규화해 전달한다.
 */
export function summarizeStreak(sources: StreakDaySource[]): StreakSummary {
  const days = new Set<string>();
  const kinds = new Set<string>();
  let totalPoints = 0;
  let lastActiveYmd: string | undefined;
  for (const s of sources) {
    if (!s.ymd) continue;
    days.add(s.ymd);
    kinds.add(s.label);
    totalPoints += s.points;
    if (!lastActiveYmd || s.ymd > lastActiveYmd) lastActiveYmd = s.ymd;
  }
  return {
    activeDays: days.size,
    totalPoints,
    activityKinds: kinds.size,
    lastActiveYmd,
  };
}

// ── 수료증 요약 ──

export interface CertificateSummary {
  /** 총 발급 건수 */
  count: number;
  /** 유형별 건수 */
  byType: Record<string, number>;
}
