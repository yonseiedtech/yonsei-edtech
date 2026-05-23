// ────────────────────────────────────────────────────────────
// onboarding-badge.ts — 시작하기 체크리스트 마일스톤 배지 (P1)
//
// NewMemberChecklistWidget 가 완료 항목 수 변화 감지 후 부여.
// users.onboardingBadges?: OnboardingBadgeId[] 에 누적 저장 (멱등 — 이미 보유 시 X).
// ────────────────────────────────────────────────────────────

export type OnboardingBadgeId =
  | "first-step"     // 1개 완료
  | "halfway"        // 항목의 60% 이상 완료
  | "complete";      // 전체 완료

export interface OnboardingBadgeMeta {
  id: OnboardingBadgeId;
  label: string;
  /** 이모지 1자 */
  icon: string;
  description: string;
  /** 마일스톤 배지 부여 시 학습 잔디 가산점 */
  points: number;
}

export const ONBOARDING_BADGE_META: Record<OnboardingBadgeId, OnboardingBadgeMeta> = {
  "first-step": {
    id: "first-step",
    label: "첫걸음",
    icon: "🌱",
    description: "첫 체크리스트 항목 완료",
    points: 5,
  },
  "halfway": {
    id: "halfway",
    label: "절반 통과",
    icon: "🚀",
    description: "체크리스트의 60% 이상 완료",
    points: 10,
  },
  "complete": {
    id: "complete",
    label: "시작하기 마스터",
    icon: "🎓",
    description: "시작하기 체크리스트 전체 완료",
    points: 20,
  },
};

/** UI/순서 고정용 — first-step → halfway → complete */
export const ONBOARDING_BADGE_ORDER: OnboardingBadgeId[] = [
  "first-step",
  "halfway",
  "complete",
];
