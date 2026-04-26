/**
 * 회원 로얄티/활동성 지표 계산 (Sprint 40 — v2 산출식).
 *
 * v1(Sprint 37) 대비 변경:
 * - 접속(login) 점수 제거 — lastLoginAt이 부정확/누락되는 경우 다수 + 활동 기반 평가가 더 공정
 * - 5개 카테고리(참여/콘텐츠/연구/운영진/후기) 각 max 명시, 합 100
 * - 게시물·댓글·인터뷰응답·연구타이머·논문작성·계획서·세미나후기·강의후기 모두 활용
 *
 * 시그니처는 옵셔널 카운트를 받도록 설계되어 미수집 데이터는 0으로 자연 무시됨.
 */

import type { User } from "@/types";

export interface MemberMetricsInput {
  member: User;

  // ── 1) 참여 (max 30) ──
  /** 세미나 출석 횟수 (checkedIn=true, isGuest=false) */
  attendanceCount: number;
  /** 활동 참여 횟수 (activity_participations) */
  activityCount: number;

  // ── 2) 콘텐츠 (max 25) ──
  /** 게시물 작성 수 (deletedAt 없는 활성 글) */
  postCount?: number;
  /** 댓글 작성 수 */
  commentCount?: number;
  /** 인터뷰 응답 제출 수 (status=submitted) */
  interviewResponseCount?: number;

  // ── 3) 연구활동 (max 25) ──
  /** 연구 타이머 누적 분 (study_sessions.durationMinutes 합) */
  studyMinutes?: number;
  /** 논문 작성 누적 글자수 (writing_papers.chapters 합) */
  writingChars?: number;
  /** 연구 계획서 보유 여부 (research_proposals 1건 이상) */
  hasResearchProposal?: boolean;

  // ── 4) 운영진 (max 10) ──
  /** 진행중 운영진 직책 수 (grad_life_positions ongoing) */
  gradLifeOngoingCount: number;

  // ── 5) 후기 (max 10) ──
  /** 세미나 후기 수 */
  seminarReviewCount?: number;
  /** 강의 후기 수 (course_reviews) */
  courseReviewCount?: number;

  /** 기준 일자 (ms) — 미지정 시 현재 시각. segment 분류용. */
  nowMs?: number;
}

export interface MemberMetricsRow {
  userId: string;
  name: string;
  role: User["role"];
  generation: number;
  position?: string;
  lastLoginAt?: string;
  /** 마지막 접속 후 경과일 (없으면 999) — 점수에는 영향 없음, 보조 정보 */
  daysSinceLogin: number;

  // ── 원시 카운트 (테이블 표시용) ──
  attendanceCount: number;
  activityCount: number;
  postCount: number;
  commentCount: number;
  interviewResponseCount: number;
  studyHours: number;            // 분→시간 환산
  writingChars: number;
  hasResearchProposal: boolean;
  gradLifeOngoingCount: number;
  seminarReviewCount: number;
  courseReviewCount: number;

  /** 0~100 정규화 점수 */
  loyaltyScore: number;
  /** 점수 산출 내역 (Top 10 표시용) */
  scoreBreakdown: {
    engagement: number;   // max 30
    content: number;      // max 25
    research: number;     // max 25
    staff: number;        // max 10
    review: number;       // max 10
  };
  /** 분류 라벨 — 시각화용 */
  segment: "champion" | "active" | "at_risk" | "dormant" | "new";
  /** 운영진 저활동 경보 */
  staffLowActivity: boolean;
}

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
 * 점수 산식 (총 100):
 *
 * 1) 참여 (max 30)
 *    - 세미나 출석: count × 3, cap 15
 *    - 학술활동 참여: count × 5, cap 15
 *
 * 2) 콘텐츠 (max 25)
 *    - 게시물 작성: count × 3, cap 12
 *    - 댓글 작성: count × 1, cap 8
 *    - 인터뷰 응답 제출: count × 1.5, cap 5
 *
 * 3) 연구활동 (max 25)
 *    - 연구 타이머 시간: hours / 5 = 1점, cap 10 (50시간 = 만점)
 *    - 논문 작성 글자수: chars / 500 = 1점, cap 10 (5,000자 = 만점)
 *    - 연구 계획서 보유: 5점
 *
 * 4) 운영진 (max 10)
 *    - staff+ role: 5점
 *    - 진행중 직책 1개 이상: +5점
 *
 * 5) 후기 (max 10)
 *    - 세미나 후기: count × 2, cap 6
 *    - 강의 후기: count × 2, cap 4
 */
export function computeMemberMetrics(input: MemberMetricsInput): MemberMetricsRow {
  const {
    member,
    attendanceCount,
    activityCount,
    postCount = 0,
    commentCount = 0,
    interviewResponseCount = 0,
    studyMinutes = 0,
    writingChars = 0,
    hasResearchProposal = false,
    gradLifeOngoingCount,
    seminarReviewCount = 0,
    courseReviewCount = 0,
    nowMs = Date.now(),
  } = input;

  // 1) 참여 (max 30)
  const attendanceScore = Math.min(15, attendanceCount * 3);
  const activityScore = Math.min(15, activityCount * 5);
  const engagementScore = attendanceScore + activityScore;

  // 2) 콘텐츠 (max 25)
  const postScore = Math.min(12, postCount * 3);
  const commentScore = Math.min(8, commentCount);
  const interviewScore = Math.min(5, interviewResponseCount * 1.5);
  const contentScore = postScore + commentScore + interviewScore;

  // 3) 연구활동 (max 25)
  const studyHours = studyMinutes / 60;
  const studyScore = Math.min(10, studyHours / 5);
  const writingScore = Math.min(10, writingChars / 500);
  const proposalScore = hasResearchProposal ? 5 : 0;
  const researchScore = studyScore + writingScore + proposalScore;

  // 4) 운영진 (max 10)
  const staffBase = isStaffRole(member.role) ? 5 : 0;
  const ongoingBonus = gradLifeOngoingCount > 0 ? 5 : 0;
  const staffScore = staffBase + ongoingBonus;

  // 5) 후기 (max 10)
  const seminarRevScore = Math.min(6, seminarReviewCount * 2);
  const courseRevScore = Math.min(4, courseReviewCount * 2);
  const reviewScore = seminarRevScore + courseRevScore;

  const loyaltyScore = Math.round(
    engagementScore + contentScore + researchScore + staffScore + reviewScore,
  );

  // segment 분류 — 점수 기반 (접속 의존 제거)
  const days = daysSince(member.lastLoginAt, nowMs);
  const createdDays = daysSince(member.createdAt, nowMs);
  let segment: MemberMetricsRow["segment"];
  if (createdDays <= 30) segment = "new";
  else if (loyaltyScore >= 70) segment = "champion";
  else if (loyaltyScore >= 40) segment = "active";
  else if (loyaltyScore >= 15) segment = "at_risk";
  else segment = "dormant";

  // 운영진 저활동: staff+ 인데 점수 30 미만 (참여·콘텐츠·연구 모두 저조)
  const staffLowActivity = isStaffRole(member.role) && loyaltyScore < 30;

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
    postCount,
    commentCount,
    interviewResponseCount,
    studyHours: Math.round(studyHours * 10) / 10,
    writingChars,
    hasResearchProposal,
    gradLifeOngoingCount,
    seminarReviewCount,
    courseReviewCount,
    loyaltyScore,
    scoreBreakdown: {
      engagement: Math.round(engagementScore * 10) / 10,
      content: Math.round(contentScore * 10) / 10,
      research: Math.round(researchScore * 10) / 10,
      staff: staffScore,
      review: reviewScore,
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
