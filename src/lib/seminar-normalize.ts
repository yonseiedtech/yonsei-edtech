/**
 * 세미나 읽기 경계 정규화 (2026-07-27, v18-H3)
 *
 * 배경: useSeminars/useSeminar 가 Firestore 응답을 `as unknown as Seminar[]` 로
 * 무가공 반환한다. Seminar 타입은 attendeeIds: string[] 를 required 로 선언하지만
 * 레거시 문서엔 해당 필드가 없다. 소비 경계에서 정규화해 어떤 문서라도 안전하게 다룬다.
 *
 * 대상 필드 (타입상 required array — Seminar 인터페이스 기준):
 *   - attendeeIds: string[]   ← 유일한 required array 필드
 * 나머지 배열 필드(speakers, sessions, timeline, registrationFields, hostUserIds 등)는
 * 모두 optional(?), 정규화 불필요.
 */

import type { Seminar } from "@/types";

/**
 * 레거시 문서에서 Seminar 의 required array 필드 기본값을 보장한다.
 * 이미 정상인 필드는 그대로 통과(회귀 없음). 순수함수·부작용 없음.
 */
export function normalizeSeminar(raw: Seminar): Seminar {
  return {
    ...raw,
    attendeeIds: raw.attendeeIds ?? [],
  };
}
