/**
 * 회원 로얄티/활동성 지표 계산 (Sprint 37).
 *
 * 향후 확장: postsByUser / commentsByUser / readsByUser 등 활동 데이터 추가 가능.
 * 시그니처가 옵셔널 맵을 받도록 설계되어 추가 항목은 자연스럽게 score 가중에 반영됨.
 */

import type { User } from "@/types";

export interface MemberMetricsInput {
  member: User;
  /** 세미나 출석 횟수 (checkedIn=true, isGuest=false) */
  attendanceCount: number;
  /** 활동 참여 횟수 (activity_participations) */
  activityCount: number;
  /** 진행중 운영진 직책 수 (grad_life_positions ongoing) */
  gradLifeOngoingCount: number;
  /** 향후 확장 — 게시물 작성 수 */
  postCount?: number;
  /** 향후 확장 — 댓글 작성 수 */
  commentCount?: number;
  /** 기준 일자 (ms) — 미지정 시 현재 시각 */
  nowMs?: number;
}

export interface MemberMetricsRow {
  userId: string;
  name: string;
  role: User["role"];
  generation: number;
  position?: string;
  lastLoginAt?: string;
  /** 마지막 접속 후 경과일 (없으면 999) */
  daysSinceLogin: number;
  attendanceCount: number;
  activityCount: number;
  gradLifeOngoingCount: number;
  postCount: number;
  commentCount: number;
  /** 0~100 정규화 점수 */
  loyaltyScore: number;
  /** 점수 산출 내역 (Top 10 표시용) */
  scoreBreakdown: {
    login: number;
    attendance: number;
    activity: number;
    staff: number;
    content: number;
  };
  /** 분류 라벨 — 시각화용 */
  segment: "champion" | "active" | "at_risk" | "dormant" | "new";
  /** 운영진 저활동 경보 */
  staffLowActivity: boolean;
}

const ACTIVE_DAYS = 30;
const AT_RISK_DAYS = 60;
const DORMANT_DAYS = 90;

function daysSince(iso?: string, nowMs = Date.now()): number {
  if (!iso) return 999;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 999;
  return Math.max(0, Math.floor((nowMs - t) / 86_400_000));
}

function isStaffRole(role?: User["role"]): boolean {
  return role === "staff" || role === "president" || role === "admin" || role === "sysadmin";
}

/**
 * 점수 산식 (0~100):
 * - 접속 점수 (max 35): daysSinceLogin 기반 — 7일내 35, 30일 25, 60일 12, 90일+ 0
 * - 출석 점수 (max 25): attendanceCount * 4, 25 cap
 * - 활동 점수 (max 25): activityCount * 5, 25 cap
 * - 운영진 가중 (max 10): role staff+ 면 5, 진행중 운영진 직책 1개 이상이면 +5
 * - 콘텐츠 점수 (max 5): post*1 + comment*0.5, 5 cap (향후 활성화)
 */
export function computeMemberMetrics(input: MemberMetricsInput): MemberMetricsRow {
  const {
    member, attendanceCount, activityCount, gradLifeOngoingCount,
    postCount = 0, commentCount = 0, nowMs = Date.now(),
  } = input;

  const days = daysSince(member.lastLoginAt, nowMs);

  let loginScore = 0;
  if (days <= 7) loginScore = 35;
  else if (days <= 30) loginScore = 25;
  else if (days <= 60) loginScore = 12;
  else if (days <= 90) loginScore = 5;
  else loginScore = 0;

  const attendanceScore = Math.min(25, attendanceCount * 4);
  const activityScore = Math.min(25, activityCount * 5);
  const staffBase = isStaffRole(member.role) ? 5 : 0;
  const ongoingBonus = gradLifeOngoingCount > 0 ? 5 : 0;
  const staffScore = staffBase + ongoingBonus;
  const contentScore = Math.min(5, postCount * 1 + commentCount * 0.5);

  const loyaltyScore = Math.round(loginScore + attendanceScore + activityScore + staffScore + contentScore);

  // segment 분류
  const createdDays = daysSince(member.createdAt, nowMs);
  let segment: MemberMetricsRow["segment"];
  if (createdDays <= 30 && days <= 14) segment = "new";
  else if (loyaltyScore >= 70) segment = "champion";
  else if (days <= ACTIVE_DAYS) segment = "active";
  else if (days <= AT_RISK_DAYS) segment = "at_risk";
  else segment = "dormant";

  // 운영진인데 저활동: staff+ 인데 90일 이상 미접속이거나, 60일+ 미접속 + 활동/출석 0
  const staffLowActivity =
    isStaffRole(member.role) &&
    (days >= DORMANT_DAYS ||
      (days >= AT_RISK_DAYS && attendanceCount === 0 && activityCount === 0));

  return {
    userId: member.id,
    name: member.name,
    role: member.role,
    generation: member.generation,
    position: member.position,
    lastLoginAt: member.lastLoginAt,
    daysSinceLogin: days,
    attendanceCount,
    activityCount,
    gradLifeOngoingCount,
    postCount,
    commentCount,
    loyaltyScore,
    scoreBreakdown: {
      login: loginScore,
      attendance: attendanceScore,
      activity: activityScore,
      staff: staffScore,
      content: contentScore,
    },
    segment,
    staffLowActivity,
  };
}

export function segmentLabel(s: MemberMetricsRow["segment"]): string {
  switch (s) {
    case "champion": return "챔피언";
    case "active": return "활성";
    case "at_risk": return "주의";
    case "dormant": return "휴면";
    case "new": return "신규";
  }
}

export function segmentColor(s: MemberMetricsRow["segment"]): string {
  switch (s) {
    case "champion": return "bg-violet-100 text-violet-800 border-violet-200";
    case "active": return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "at_risk": return "bg-amber-100 text-amber-800 border-amber-200";
    case "dormant": return "bg-rose-100 text-rose-800 border-rose-200";
    case "new": return "bg-sky-100 text-sky-800 border-sky-200";
  }
}
