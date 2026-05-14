/**
 * 로얄티 스냅샷 타입 (Sprint 71) — 순수 타입, 서버 cron·클라이언트 훅 공용.
 */

import type { MemberMetricsRow } from "./computeMemberMetrics";

export type MemberSegment = MemberMetricsRow["segment"];

/** 시각화·집계 시 고정 세그먼트 순서 */
export const SNAPSHOT_SEGMENTS: MemberSegment[] = [
  "champion",
  "active",
  "new",
  "at_risk",
  "dormant",
];

/**
 * 로얄티 스냅샷 — `loyalty_snapshots` 컬렉션, 문서 ID = 캡처 날짜(YYYY-MM-DD, KST).
 *
 * cron 이 주 1회 적재하고, 회원 보고서가 로얄티 추이 그래프와 세그먼트 이동 추적에 사용.
 * 스냅샷이 누적될수록 추이 분석의 가치가 커진다.
 */
export interface LoyaltySnapshot {
  /** 캡처 날짜 YYYY-MM-DD (KST) — 문서 ID 와 동일 */
  period: string;
  /** 캡처 시각 ISO */
  capturedAt: string;
  /** 승인 회원 총 수 */
  totalMembers: number;
  /** 전체 평균 로얄티 점수 (0-100, 반올림) */
  avgLoyalty: number;
  /** 세그먼트별 인원 수 */
  segmentCounts: Record<MemberSegment, number>;
  /** userId → segment — 직전 스냅샷과 비교해 세그먼트 이동 추적용 */
  memberSegments: Record<string, MemberSegment>;
}
