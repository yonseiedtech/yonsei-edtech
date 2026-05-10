/**
 * 학술대회 참석자 후기 (Sprint 67-Z)
 *
 * 회원이 학술대회 종료 후 작성하는 종합 후기.
 * 활동 상세 개요 하단 + 본인 프로필 학술활동 리스트에 노출.
 */

export interface ConferenceAttendeeReview {
  /** {userId}_{activityId} 권장 */
  id: string;
  userId: string;
  userName?: string;
  /** 본인 명함 정보(노출 시 useful) — 비정규화 */
  userAffiliation?: string;
  userPosition?: string;
  activityId: string;
  /** 비정규화: 활동 제목 */
  activityTitle?: string;
  activityDate?: string;

  /** 1. 단순 느낀점 (전체 인상) */
  generalImpression: string;

  /** 2. 가장 인상 깊었던 논문 세션 sessionId (본인 plans 중에서) */
  mostImpressivePaperSessionId?: string;
  mostImpressivePaperTitle?: string;
  mostImpressivePaperReason?: string;

  /** 3. 가장 인상 깊었던 포스터 sessionId (본인 plans 중에서) */
  mostImpressivePosterSessionId?: string;
  mostImpressivePosterTitle?: string;
  mostImpressivePosterReason?: string;

  /** 4. 추천 대상 (예: '교수설계 연구자', '예비교사' 등) */
  recommendTo?: string;

  /** 5. 향후 재참석 의사 */
  willAttendAgain?: "yes" | "maybe" | "no";

  /** 6. 아쉬운 점 (운영진만 열람) */
  regrets?: string;

  /** 7. 학술대회에서 배운 점 중 내 연구(논문)에 참고할 만한 내용 */
  researchTakeaway?: string;

  /** 8. 마지막으로 하고 싶은 말 */
  finalWords?: string;

  /** 1-5 별점 (전체 만족도, 선택) */
  overallRating?: number;

  submittedAt: string;
  updatedAt?: string;
}

export const WILL_ATTEND_AGAIN_LABELS: Record<NonNullable<ConferenceAttendeeReview["willAttendAgain"]>, string> = {
  yes: "꼭 다시 참석",
  maybe: "기회되면",
  no: "당분간 안 갈 듯",
};
