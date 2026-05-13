/**
 * citation-verify.ts 단위 테스트 (Sprint 67-AR — 테스트 커버리지 보강)
 *
 * scoreCitationMismatch는 AI 포럼 할루시네이션 감지의 핵심 채점 로직.
 * 오류 시 실제 존재하지 않는 논문이 verified=true로 마킹될 수 있음.
 */

import { describe, expect, it } from "vitest";
import { scoreCitationMismatch } from "@/lib/citation-verify";
import type { CrossRefMetadata } from "@/lib/citation-verify";

function mkMeta(partial: Partial<CrossRefMetadata> = {}): CrossRefMetadata {
  return {
    exists: true,
    title: "Test Paper Title",
    firstAuthorFamily: "Hong",
    year: 2024,
    publisher: "Yonsei Press",
    ...partial,
  };
}

function mkClaimed(partial: Partial<{ authors: string[]; year: number; title: string }> = {}) {
  return {
    authors: ["Hong, G."],
    year: 2024,
    title: "Test Paper Title",
    ...partial,
  };
}

// ── scoreCitationMismatch ─────────────────────────────────────────────────────

describe("scoreCitationMismatch", () => {
  it("존재하지 않는 DOI → 3 (최고 의심도)", () => {
    const meta: CrossRefMetadata = { exists: false };
    expect(scoreCitationMismatch(mkClaimed(), meta)).toBe(3);
  });

  it("완전 일치 → 0", () => {
    expect(scoreCitationMismatch(mkClaimed(), mkMeta())).toBe(0);
  });

  it("제목 불일치 → 2 추가", () => {
    const claimed = mkClaimed({ title: "Completely Different Title Here" });
    const score = scoreCitationMismatch(claimed, mkMeta());
    expect(score).toBeGreaterThanOrEqual(2);
  });

  it("첫 저자 family name 불일치 → 1 추가", () => {
    const claimed = mkClaimed({ authors: ["Kim, C."] });
    const score = scoreCitationMismatch(claimed, mkMeta());
    expect(score).toBeGreaterThanOrEqual(1);
  });

  it("연도 차이 1 이하 → 패널티 없음", () => {
    const claimed = mkClaimed({ year: 2023 }); // meta.year=2024, diff=1 → 허용
    expect(scoreCitationMismatch(claimed, mkMeta())).toBe(0);
  });

  it("연도 차이 2 이상 → 1 추가", () => {
    const claimed = mkClaimed({ year: 2021 }); // diff=3 > 1 → penalty
    const score = scoreCitationMismatch(claimed, mkMeta());
    expect(score).toBeGreaterThanOrEqual(1);
  });

  it("제목+저자 동시 불일치 → 최대 3으로 클램프", () => {
    const claimed = mkClaimed({
      title: "Completely Wrong Title For This Paper",
      authors: ["Wrong, A."],
      year: 2010,
    });
    const score = scoreCitationMismatch(claimed, mkMeta());
    expect(score).toBe(3);
  });

  it("meta.firstAuthorFamily 없으면 저자 채점 생략", () => {
    const meta = mkMeta({ firstAuthorFamily: undefined });
    const claimed = mkClaimed({ authors: ["Any, Author"] });
    // 제목/연도 일치, 저자는 undefined이므로 채점 생략 → 0
    expect(scoreCitationMismatch(claimed, meta)).toBe(0);
  });

  it("claimed.authors 빈 배열이면 저자 채점 생략", () => {
    const claimed = mkClaimed({ authors: [] });
    expect(scoreCitationMismatch(claimed, mkMeta())).toBe(0);
  });

  it("제목 첫 30자만 비교 — 뒷부분 차이는 무시", () => {
    // meta title = "Test Paper Title" (16자)
    // claimed title 앞 30자가 동일하면 일치로 간주
    const claimed = mkClaimed({ title: "Test Paper Title and Some Extra" });
    // 앞 30자: "Test Paper Title and Some Extr" vs "Test Paper Title" → 다름
    // 실제로는 slice(0, 30)이므로 16자 vs 30자 비교 → 불일치
    // 이 케이스는 제목이 더 길 경우 불일치를 확인
    const score = scoreCitationMismatch(claimed, mkMeta());
    // 제목 앞 30자가 다르므로 score >= 2
    expect(score).toBeGreaterThanOrEqual(2);
  });
});
