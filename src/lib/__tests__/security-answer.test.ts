import { describe, it, expect } from "vitest";
import { createHash } from "crypto";
import {
  generateSecurityAnswerHash,
  verifySecurityAnswer,
  PBKDF2_ITERATIONS,
} from "../security-answer";
import { pbkdf2AnswerHash } from "../hash";

const ANSWER = "어머니 성함";

describe("generateSecurityAnswerHash / verifySecurityAnswer (PBKDF2)", () => {
  it("생성 → 검증 ok, 포맷 pbkdf2$iter$salt$hash", { timeout: 30_000 }, () => {
    const stored = generateSecurityAnswerHash(ANSWER);
    const parts = stored.split("$");
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe("pbkdf2");
    expect(Number(parts[1])).toBe(PBKDF2_ITERATIONS);
    expect(/^[0-9a-f]{32}$/.test(parts[2])).toBe(true); // salt 16바이트
    expect(/^[0-9a-f]{64}$/.test(parts[3])).toBe(true); // dk 32바이트
    expect(verifySecurityAnswer(ANSWER, stored).ok).toBe(true);
  });

  it("오답 — false", { timeout: 30_000 }, () => {
    const stored = generateSecurityAnswerHash(ANSWER);
    expect(verifySecurityAnswer("다른 답", stored).ok).toBe(false);
  });

  // WSL 등 저성능 환경에서 PBKDF2 2회가 5초 기본 한도를 넘는 플레이크 → 여유 한도
  it("동일 답이라도 salt 가 달라 저장값이 매번 다름", { timeout: 30_000 }, () => {
    const a = generateSecurityAnswerHash(ANSWER);
    const b = generateSecurityAnswerHash(ANSWER);
    expect(a).not.toBe(b);
    expect(verifySecurityAnswer(ANSWER, a).ok).toBe(true);
    expect(verifySecurityAnswer(ANSWER, b).ok).toBe(true);
  });

  it("PBKDF2 매치 시 upgradedHash 없음 (이미 신규 포맷)", { timeout: 30_000 }, () => {
    const stored = generateSecurityAnswerHash(ANSWER);
    expect(verifySecurityAnswer(ANSWER, stored).upgradedHash).toBeUndefined();
  });
});

describe("verifySecurityAnswer — 레거시 무염 SHA-256 마이그레이션", () => {
  const legacy = createHash("sha256").update(ANSWER).digest("hex");

  it("레거시 매치 → ok + upgradedHash(PBKDF2 포맷) 반환", { timeout: 30_000 }, () => {
    const r = verifySecurityAnswer(ANSWER, legacy);
    expect(r.ok).toBe(true);
    expect(r.upgradedHash).toBeDefined();
    expect(r.upgradedHash!.startsWith("pbkdf2$")).toBe(true);
    // 업그레이드된 해시로 재검증 가능해야 마이그레이션이 안전
    expect(verifySecurityAnswer(ANSWER, r.upgradedHash!).ok).toBe(true);
  });

  it("레거시 오답 — false, upgradedHash 없음", { timeout: 30_000 }, () => {
    const r = verifySecurityAnswer("틀린 답", legacy);
    expect(r.ok).toBe(false);
    expect(r.upgradedHash).toBeUndefined();
  });
});

describe("verifySecurityAnswer — 변조/비정상 저장값 거부", () => {
  it.each([
    ["빈 문자열", ""],
    ["짧은 hex", "abcd"],
    ["pbkdf2 파트 부족", "pbkdf2$310000$deadbeef"],
    ["iterations 과소", `pbkdf2$100$${"ab".repeat(16)}$${"cd".repeat(32)}`],
    ["iterations 과대", `pbkdf2$99000000$${"ab".repeat(16)}$${"cd".repeat(32)}`],
    ["iterations 비숫자", `pbkdf2$abc$${"ab".repeat(16)}$${"cd".repeat(32)}`],
    ["salt 비hex", `pbkdf2$310000$zz$${"cd".repeat(32)}`],
    ["salt 과소(8바이트 미만)", `pbkdf2$310000$abcd$${"cd".repeat(32)}`],
    ["해시 과소(16바이트 미만)", `pbkdf2$310000$${"ab".repeat(16)}$abcd`],
  ])("%s → false", (_label, stored) => {
    expect(verifySecurityAnswer(ANSWER, stored).ok).toBe(false);
  });
});

describe("클라이언트(Web Crypto) ↔ 서버(Node crypto) 호환", () => {
  it("pbkdf2AnswerHash 생성값을 verifySecurityAnswer 가 검증", { timeout: 30_000 }, async () => {
    const stored = await pbkdf2AnswerHash(ANSWER);
    expect(stored.startsWith("pbkdf2$310000$")).toBe(true);
    expect(verifySecurityAnswer(ANSWER, stored).ok).toBe(true);
    expect(verifySecurityAnswer("오답", stored).ok).toBe(false);
  });
});
