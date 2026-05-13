import { describe, it, expect } from "vitest";
import { getOrchestraSystemPrompt } from "../ai-prompts";

describe("getOrchestraSystemPrompt", () => {
  it("기본 학회 정보 포함 (모든 role)", () => {
    const p = getOrchestraSystemPrompt("guest");
    expect(p).toContain("연세교육공학회");
    expect(p).toContain("교육공학");
    expect(p).toContain("https://yonsei-edtech.vercel.app");
  });

  it("기본 응답 규칙 포함", () => {
    const p = getOrchestraSystemPrompt("member");
    expect(p).toContain("한국어로 답변");
    expect(p).toContain("존댓말");
    expect(p).toContain("도구를 호출");
    expect(p).toContain("추측하지 마세요");
  });

  it("사용자 이름 제공 — greeting 포함", () => {
    const p = getOrchestraSystemPrompt("member", "홍길동");
    expect(p).toContain("홍길동");
    expect(p).toContain("홍길동님");
  });

  it("사용자 이름 미제공 — '비로그인 방문자'", () => {
    const p = getOrchestraSystemPrompt("guest");
    expect(p).toContain("비로그인 방문자");
  });

  it("role 표시", () => {
    const p = getOrchestraSystemPrompt("admin", "운영자");
    expect(p).toContain("admin");
  });

  describe("운영진 추가 기능 (STAFF_EXTRA)", () => {
    const STAFF_ROLES = ["sysadmin", "admin", "staff", "president"];
    const NON_STAFF_ROLES = ["member", "guest", "alumni", "applicant", ""];

    it.each(STAFF_ROLES)("'%s' role — 운영진 기능 포함", (role) => {
      const p = getOrchestraSystemPrompt(role);
      expect(p).toContain("운영진 추가 기능");
      expect(p).toContain("회원 관리");
      expect(p).toContain("문의 처리");
    });

    it.each(NON_STAFF_ROLES)("'%s' role — 운영진 기능 미포함", (role) => {
      const p = getOrchestraSystemPrompt(role);
      expect(p).not.toContain("운영진 추가 기능");
      expect(p).not.toContain("회원 관리");
    });
  });

  it("문자열로 반환되며 비어있지 않음", () => {
    const p = getOrchestraSystemPrompt("member");
    expect(typeof p).toBe("string");
    expect(p.length).toBeGreaterThan(100);
  });
});
