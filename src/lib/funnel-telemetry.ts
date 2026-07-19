/**
 * 퍼널 텔레메트리 — 온보딩·진단평가 단계 이벤트 적재 (M2, 2026-07-19)
 *
 * editor-telemetry.ts 와 동일한 패턴:
 *  - user_activity_logs 에 가상 경로(ui:onboarding/* · ui:diagnostic/*)로 적재
 *  - 세션당 이벤트별 1회만 기록 (중복 방지)
 *  - fire-and-forget: 실패해도 UX에 영향 없음
 *  - 로그인 사용자만 기록 (userId 없으면 no-op)
 *
 * write: 본인 userId 기록 → 기존 user_activity_logs rules 적용 (변경 없음)
 * read:  admin/staff 전용 → 기존 rules 적용 (변경 없음)
 *
 * 컬렉션 필드 추가: funnelType ("onboarding" | "diagnostic") — 집계 쿼리용
 */

import { addDoc, collection } from "firebase/firestore";
import { db } from "./firebase";

/** 세션 내 중복 방지 Set (funnelType:event 키) */
const _logged = new Set<string>();

type FunnelType = "onboarding" | "diagnostic";

export type OnboardingEvent = "enter" | "progress" | "complete";
export type DiagnosticEvent = "start" | "q1" | "complete" | "report";

const ONBOARDING_LABELS: Record<OnboardingEvent, string> = {
  enter: "온보딩 진입",
  progress: "첫 항목 완료",
  complete: "전체 완료",
};

const DIAGNOSTIC_LABELS: Record<DiagnosticEvent, string> = {
  start: "진단 진입",
  q1: "문항 시작",
  complete: "제출 완료",
  report: "리포트 열람",
};

function _log(
  userId: string,
  funnelType: FunnelType,
  event: string,
  pathLabel: string,
): void {
  const key = `${funnelType}:${event}`;
  if (_logged.has(key)) return;
  _logged.add(key);
  void addDoc(collection(db, "user_activity_logs"), {
    userId,
    path: `ui:${funnelType}/${event}`,
    pathGroup: "ui",
    pathLabel,
    funnelType,
    createdAt: new Date().toISOString(),
  }).catch(() => {
    /* 텔레메트리 실패는 무시 */
  });
}

/** 온보딩 퍼널 이벤트 기록 */
export function logOnboardingEvent(
  userId: string | null | undefined,
  event: OnboardingEvent,
): void {
  if (!userId) return;
  _log(userId, "onboarding", event, `온보딩 · ${ONBOARDING_LABELS[event]}`);
}

/** 진단평가 퍼널 이벤트 기록 */
export function logDiagnosticEvent(
  userId: string | null | undefined,
  event: DiagnosticEvent,
): void {
  if (!userId) return;
  _log(userId, "diagnostic", event, `진단 · ${DIAGNOSTIC_LABELS[event]}`);
}
