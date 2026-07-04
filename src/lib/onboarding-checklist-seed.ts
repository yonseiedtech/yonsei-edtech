/**
 * 시작하기 체크리스트 — 기본 시드 데이터
 *
 * 기존 NewMemberChecklistWidget 의 5항목을 Firestore onboarding_checklist 컬렉션으로
 * 마이그레이션할 때 사용. 콘솔 페이지의 "기본 시드 추가" 버튼이 호출.
 *
 * 멱등성: 동일 label 항목이 이미 있으면 skip (이름 중복 가드).
 * 항목 순서는 SEED_ITEMS 배열의 index 그대로 order 로 할당.
 */

import type {
  ChecklistCompletionType,
  ChecklistIcon,
  ChecklistPriority,
  OnboardingChecklistItem,
} from "@/types";
import { onboardingChecklistApi } from "@/lib/bkend";

export interface SeedChecklistItem {
  label: string;
  href: string;
  icon: ChecklistIcon;
  completionType: ChecklistCompletionType;
  enabled: boolean;
  priority?: ChecklistPriority;
}

/** 기존 widget 하드코딩 5항목과 1:1 매칭. */
export const SEED_ITEMS: SeedChecklistItem[] = [
  {
    label: "자기소개 작성",
    href: "/mypage/edit",
    icon: "PenSquare",
    completionType: "profile.bio",
    enabled: true,
  },
  {
    label: "관심 분야 선택",
    href: "/mypage/edit",
    icon: "Heart",
    completionType: "profile.researchInterests",
    enabled: true,
  },
  {
    label: "학술활동 둘러보기",
    href: "/activities",
    icon: "Users",
    completionType: "visited.activities",
    enabled: true,
  },
  {
    label: "세미나 1회 출석",
    href: "/seminars",
    icon: "CalendarCheck",
    completionType: "attended.seminar",
    enabled: true,
  },
  {
    label: "아카이브 즐겨찾기 1편",
    href: "/archive",
    icon: "Star",
    completionType: "favorited.archive",
    enabled: true,
  },
  // RT-3(2026-07-04): 첫 여정을 연구 도구로 연결 — 시드가 구세대 5항목에 멈춰 있던 문제
  {
    label: "내 논문 여정 단계 설정",
    href: "/mypage/research",
    icon: "GraduationCap",
    completionType: "set.thesisJourneyStage",
    enabled: true,
  },
  {
    label: "문헌 매트릭스에 논문 1편 정리",
    href: "/mypage/research?tab=reading",
    icon: "BookOpen",
    completionType: "used.literatureMatrix",
    enabled: true,
  },
  {
    label: "연구 모형 그려보기",
    href: "/research-model",
    icon: "Sparkles",
    completionType: "used.researchModel",
    enabled: true,
  },
];

export interface ChecklistSeedResult {
  created: number;
  skipped: number;
  total: number;
}

/**
 * 시드 적용. 동일 label 항목이 이미 있으면 skip.
 * order 는 SEED_ITEMS index 기준 + 기존 최대 order 다음으로 이어붙임.
 */
export async function importOnboardingChecklistSeed(
  createdBy: string,
): Promise<ChecklistSeedResult> {
  const existing = await onboardingChecklistApi.list();
  const existingLabels = new Set(existing.data.map((it) => it.label));
  const maxOrder = existing.data.reduce(
    (m, it) => (typeof it.order === "number" && it.order > m ? it.order : m),
    -1,
  );

  let created = 0;
  let skipped = 0;
  let nextOrder = maxOrder + 1;

  for (const seed of SEED_ITEMS) {
    if (existingLabels.has(seed.label)) {
      skipped++;
      continue;
    }
    const payload: Partial<OnboardingChecklistItem> = {
      order: nextOrder,
      label: seed.label,
      href: seed.href,
      icon: seed.icon,
      completionType: seed.completionType,
      enabled: seed.enabled,
      priority: seed.priority ?? "medium",
      createdBy,
    };
    await onboardingChecklistApi.create(payload as Record<string, unknown>);
    created++;
    nextOrder++;
  }

  return { created, skipped, total: SEED_ITEMS.length };
}
