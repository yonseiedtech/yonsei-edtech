/**
 * 회원 단계 판정 (순수 함수) — 스프린트3 H5/H6 공유 로직.
 *
 * 대시보드 QuickLinks 개인화·신입 브리지 노출에 쓰이는 단일 판정 기준.
 * 추가 네트워크 없이 프로필 필드 + (이미 대시보드에 상주 캐시된) 진단 이력
 * 개수만으로 판정한다. 퍼소나(getUserPersona)를 재사용해 졸업생 판정을
 * 중복하지 않는다.
 */

import type { User } from "@/types";
import { getUserPersona } from "@/features/dashboard/widget-visibility";

/** 신입 판정 창(가입 후 N일) — 이 기간 내면 진단 여부와 무관하게 신입. */
export const NEWCOMER_WINDOW_MS = 60 * 24 * 60 * 60 * 1000;

export type MemberStage = "newcomer" | "researcher" | "alumni";

/** Firestore Timestamp/ISO/epoch 등 다양한 createdAt 형태 → epoch ms. */
export function parseCreatedAtMs(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number") {
    const t = new Date(value).getTime();
    return Number.isFinite(t) ? t : null;
  }
  if (
    typeof value === "object" &&
    "seconds" in (value as Record<string, unknown>)
  ) {
    const s = (value as { seconds?: number }).seconds;
    if (typeof s === "number") return s * 1000;
  }
  return null;
}

/**
 * 회원 단계 판정.
 *  - alumni     : 졸업생(운영진 권한이 없을 때)
 *  - newcomer   : 가입 60일 이내 OR 진단 미응시(diagnosticCount === 0)
 *  - researcher : 그 외(재학·논문준비)
 *
 * diagnosticCount === undefined 는 "로딩 중"으로 보아 진단 기준을 적용하지 않고
 * 가입일 기준만으로 판정한다(첫 렌더 깜빡임 방지).
 */
export function getMemberStage(
  user: User | null | undefined,
  diagnosticCount: number | undefined,
  now: number = Date.now(),
): MemberStage {
  if (!user) return "newcomer";
  if (getUserPersona(user) === "alumni") return "alumni";
  const createdMs = parseCreatedAtMs((user as { createdAt?: unknown }).createdAt);
  const withinNewWindow =
    createdMs != null && now - createdMs <= NEWCOMER_WINDOW_MS;
  const noDiagnosis = diagnosticCount === 0;
  if (withinNewWindow || noDiagnosis) return "newcomer";
  return "researcher";
}
