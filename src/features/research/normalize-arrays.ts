/**
 * 레거시 비배열 필드 하드닝 (2026-07-30) — 연구 편집기 하이드레이션 경계 공용 헬퍼
 *
 * 단일 Firestore 문서(research_report·research_proposal·research_design·writing_paper 등)의
 * 배열 필드가 일부 레거시 레코드에서 비배열(문자열·객체)로 저장돼 있을 때,
 * `.map/.filter/.some/.forEach/.reduce/.join/.length`·spread(`...x`) 호출에서
 * "X is not a function" / "not iterable" 크래시가 나는 것을 막는다.
 *
 * `?? []` 와 옵셔널 체이닝(`x?.method`)은 null/undefined 만 막고 truthy 비배열은
 * 통과시키므로, 편집기가 문서를 폼 상태로 로드하는 경계(fromReport/fromProposal/
 * fromPaper/fromDesign)에서 Array.isArray 로 정규화해 이후 전 소비처를 안전화한다.
 * (읽기/소비 경계 방어 — Firestore write 로 데이터 원본을 바꾸지 않는다.)
 */

import type { PaperVariables } from "@/types";

/** 값이 배열이면 그대로, 아니면 빈 배열 — 레거시 비배열 필드 방어 */
export function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

const VARIABLE_KEYS = [
  "independent",
  "dependent",
  "mediator",
  "moderator",
  "control",
] as const;

/**
 * PaperVariables 의 각 변인 배열을 정규화 (레거시 비배열 서브필드 방어).
 * 원래 존재하던 키만 유지·정규화하고 새 키를 추가하지 않아 동작(동기화 판정)을 보존한다.
 */
export function normalizeVariables(v: PaperVariables | undefined | null): PaperVariables {
  if (!v || typeof v !== "object") return {};
  const src = v as Record<string, unknown>;
  const out: PaperVariables = {};
  for (const k of VARIABLE_KEYS) {
    if (src[k] === undefined) continue;
    out[k] = asArray<string>(src[k]);
  }
  return out;
}
