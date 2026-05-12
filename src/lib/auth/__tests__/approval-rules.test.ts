/**
 * approval-rules.ts 단위 테스트 (Sprint 67-AR — 보안 회귀 방지)
 *
 * 자동 승인 판정 오류 시 — 미인가자 접근 허용 또는 정상 가입자 차단.
 * 양쪽 다 학회 운영에 직접적 비용·평판 손실 발생.
 */

import { describe, expect, it } from "vitest";
import { evaluateSignup, partitionPending } from "@/lib/auth/approval-rules";
import type { User } from "@/types";

function mkUser(partial: Partial<User>): User {
  return {
    id: "u_test",
    name: "테스트",
    email: "test@yonsei.ac.kr",
    role: "member" as const,
    approved: false,
    studentId: "202412345",
    ...partial,
  } as User;
}

describe("evaluateSignup", () => {
  it("yonsei.ac.kr + 이름 2자 + 학번 = qualifying", () => {
    const user = mkUser({});
    const result = evaluateSignup(user, [user]);
    expect(result.qualifying).toBe(true);
    expect(result.reasons).toEqual([]);
    expect(result.risk).toBe("low");
  });

  it("외부 도메인만 미일치 → 단일 사유 medium risk", () => {
    const user = mkUser({ email: "test@gmail.com" });
    const result = evaluateSignup(user, [user]);
    expect(result.qualifying).toBe(false);
    expect(result.risk).toBe("medium");
    expect(result.reasons.some((r) => r.includes("도메인"))).toBe(true);
  });

  it("이름 1자 = 너무 짧음", () => {
    const user = mkUser({ name: "김" });
    const result = evaluateSignup(user, [user]);
    expect(result.qualifying).toBe(false);
    expect(result.reasons.some((r) => r.includes("이름이 너무 짧"))).toBe(true);
  });

  it("이름 비어있음 = 사유 누적", () => {
    const user = mkUser({ name: "  " });
    const result = evaluateSignup(user, [user]);
    expect(result.qualifying).toBe(false);
    expect(result.reasons.some((r) => r.includes("이름"))).toBe(true);
  });

  it("학번 없음 = 사유 누적", () => {
    const user = mkUser({ studentId: undefined });
    const result = evaluateSignup(user, [user]);
    expect(result.qualifying).toBe(false);
    expect(result.reasons.some((r) => r.includes("학번"))).toBe(true);
  });

  it("이메일 없음 = 사유 누적", () => {
    const user = mkUser({ email: "" });
    const result = evaluateSignup(user, [user]);
    expect(result.qualifying).toBe(false);
    expect(result.reasons.some((r) => r.includes("이메일"))).toBe(true);
  });

  it("학번 중복 (이미 approved=true 사용자가 동일 학번) = 차단", () => {
    const existing = mkUser({
      id: "u_existing",
      studentId: "202412345",
      name: "이미가입자",
      approved: true,
    });
    const newUser = mkUser({
      id: "u_new",
      studentId: "202412345",
      name: "신규",
      approved: false,
    });
    const result = evaluateSignup(newUser, [existing, newUser]);
    expect(result.qualifying).toBe(false);
    expect(result.reasons.some((r) => r.includes("학번 중복"))).toBe(true);
  });

  it("학번 중복이지만 기존 사용자가 approved=false면 통과", () => {
    // 미승인 신청자가 같은 학번이면 차단 안 함 (대기열 정리 케이스)
    const existing = mkUser({
      id: "u_existing",
      studentId: "202412345",
      name: "대기중",
      approved: false,
    });
    const newUser = mkUser({
      id: "u_new",
      studentId: "202412345",
      name: "신규",
      approved: false,
    });
    const result = evaluateSignup(newUser, [existing, newUser]);
    expect(result.qualifying).toBe(true);
  });

  it("여러 사유 중첩 → high risk", () => {
    const user = mkUser({
      name: "김",
      email: "test@gmail.com",
      studentId: undefined,
    });
    const result = evaluateSignup(user, [user]);
    expect(result.qualifying).toBe(false);
    expect(result.reasons.length).toBeGreaterThanOrEqual(2);
    expect(result.risk).toBe("high");
  });
});

describe("partitionPending", () => {
  it("qualifying / risky 사용자 분리", () => {
    const u1 = mkUser({ id: "u1", email: "a@yonsei.ac.kr", studentId: "202401" });
    const u2 = mkUser({ id: "u2", email: "b@gmail.com", studentId: "202402" });
    const u3 = mkUser({ id: "u3", name: "김", studentId: "202403" });

    const { qualifying, risky } = partitionPending([u1, u2, u3], [u1, u2, u3]);
    expect(qualifying.map((u) => u.id)).toEqual(["u1"]);
    expect(risky.map((u) => u.id).sort()).toEqual(["u2", "u3"]);
  });

  it("빈 입력 = 빈 결과", () => {
    expect(partitionPending([], [])).toEqual({ qualifying: [], risky: [] });
  });
});
