/**
 * generation.ts 단위 테스트 (Sprint 67-AR — 테스트 커버리지 보강)
 *
 * 기수 계산은 회원 프로필, 네트워크 맵, 통계 대시보드 등 20+ 모듈에서 참조.
 * 경계값(최초 기수, 0 반환, 음수 방어)을 검증.
 */

import { describe, expect, it } from "vitest";
import { calcGeneration } from "@/lib/generation";

describe("calcGeneration", () => {
  it("1998년 전기(half=1) → 1기", () => {
    expect(calcGeneration(1998, 1)).toBe(1);
  });

  it("1998년 후기(half=2) → 2기", () => {
    expect(calcGeneration(1998, 2)).toBe(2);
  });

  it("1999년 전기 → 3기", () => {
    expect(calcGeneration(1999, 1)).toBe(3);
  });

  it("1999년 후기 → 4기", () => {
    expect(calcGeneration(1999, 2)).toBe(4);
  });

  it("2024년 전기 → 53기", () => {
    // (2024-1998)*2 + 1 = 52+1 = 53
    expect(calcGeneration(2024, 1)).toBe(53);
  });

  it("2024년 후기 → 54기", () => {
    expect(calcGeneration(2024, 2)).toBe(54);
  });

  it("2026년 전기 → 57기", () => {
    // (2026-1998)*2 + 1 = 56+1 = 57
    expect(calcGeneration(2026, 1)).toBe(57);
  });

  it("year=undefined → 0 반환", () => {
    expect(calcGeneration(undefined, 1)).toBe(0);
  });

  it("half=undefined → 0 반환", () => {
    expect(calcGeneration(2024, undefined)).toBe(0);
  });

  it("year=null → 0 반환", () => {
    expect(calcGeneration(null, 1)).toBe(0);
  });

  it("half=null → 0 반환", () => {
    expect(calcGeneration(2024, null)).toBe(0);
  });

  it("year=0 → 0 반환 (falsy 방어)", () => {
    expect(calcGeneration(0, 1)).toBe(0);
  });

  it("1997년 이전(g < 0) → 0 반환 (음수 방어)", () => {
    // (1997-1998)*2 + 1 = -1 → 0
    expect(calcGeneration(1997, 1)).toBe(0);
  });

  it("1997년 후기 → 0 반환", () => {
    // (1997-1998)*2 + 2 = 0 → 0 (g > 0 조건 미충족)
    expect(calcGeneration(1997, 2)).toBe(0);
  });
});
