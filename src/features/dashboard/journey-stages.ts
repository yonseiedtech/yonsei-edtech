/**
 * journey-stages — 회원 여정 4단계의 단일 정의 소스 (v18-M3).
 *
 * v17 `JourneyStepperWidget`(개인 스텝퍼)과 v18 `JourneyCohortFunnelSection`(운영진 코호트
 * 퍼널)이 "가입/프로필 완성 → 진단 완료 → 가이드 학습 시작 → 활동 참여" 4단계를 **같은 판정
 * 기준**으로 쓰도록 라벨과 순수 판정 헬퍼를 한 곳에 모은다. 개인·집계 표면이 단계 정의를
 * 어긋나게 두면 "개인 여정"과 "코호트 이탈 지점"이 서로 다른 기준을 재는 오류가 생긴다.
 *
 * 프로필 완성 판정은 기존 `isProfileComplete`(newcomer-sequence)를 그대로 재노출한다.
 */

import type { GuideProgress } from "@/types";
import { isProfileComplete } from "@/lib/newcomer-sequence";

export type JourneyStageKey = "profile" | "diagnosis" | "guide" | "activity";

export interface JourneyStageMeta {
  key: JourneyStageKey;
  /** 코호트 퍼널·개인 스텝퍼 공용 단계 라벨 */
  label: string;
}

/** 여정 4단계 정의 (순서 = 퍼널 흐름) */
export const JOURNEY_STAGE_META: readonly JourneyStageMeta[] = [
  { key: "profile", label: "가입·프로필 완성" },
  { key: "diagnosis", label: "진단 완료" },
  { key: "guide", label: "가이드 학습 시작" },
  { key: "activity", label: "활동 참여" },
] as const;

/**
 * 가이드 학습 시작 판정 — completedItems 1건+ (개인 스텝퍼·집계 공용).
 * JourneyStepperWidget 의 `Object.keys(d.completedItems ?? {}).length > 0` 과 동일.
 */
export function hasGuideStarted(doc: Pick<GuideProgress, "completedItems">): boolean {
  return Object.keys(doc.completedItems ?? {}).length > 0;
}

export { isProfileComplete };
