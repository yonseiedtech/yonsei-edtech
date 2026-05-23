"use client";

/**
 * ProfileOnboardingBadges — 시작하기 체크리스트 마일스톤 배지 노출 (P1).
 *
 * NewMemberChecklistWidget 가 부여한 user.onboardingBadges 를 chip 형태로 표시.
 * 빈 배열 / undefined 면 null.
 *
 * 사용처:
 *  - ProfileDetailView (다른 사람·본인 프로필)
 *  - MyPageView (본인 오버뷰)
 */

import {
  ONBOARDING_BADGE_META,
  ONBOARDING_BADGE_ORDER,
  type OnboardingBadgeId,
} from "@/types/onboarding-badge";
import { cn } from "@/lib/utils";

interface Props {
  badges?: OnboardingBadgeId[];
  className?: string;
}

export default function ProfileOnboardingBadges({ badges, className }: Props) {
  if (!badges || badges.length === 0) return null;
  // 순서 고정: first-step → halfway → complete
  const ownedSet = new Set(badges);
  const ordered = ONBOARDING_BADGE_ORDER.filter((id) => ownedSet.has(id));
  if (ordered.length === 0) return null;

  return (
    <div
      className={cn("flex flex-wrap items-center gap-1.5", className)}
      aria-label="시작하기 체크리스트 마일스톤 배지"
    >
      {ordered.map((id) => {
        const meta = ONBOARDING_BADGE_META[id];
        return (
          <span
            key={id}
            title={meta.description}
            className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200"
          >
            <span aria-hidden="true">{meta.icon}</span>
            <span>{meta.label}</span>
          </span>
        );
      })}
    </div>
  );
}
