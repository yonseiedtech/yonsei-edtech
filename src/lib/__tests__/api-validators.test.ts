import { describe, it, expect } from "vitest";
import {
  impersonateSchema,
  approvalEmailSchema,
  inquiryReplyEmailSchema,
  passwordResetSchema,
} from "../api-validators";

describe("impersonateSchema", () => {
  it("targetUserId 필수", () => {
    expect(impersonateSchema.safeParse({}).success).toBe(false);
  });

  it("빈 문자열 거부", () => {
    expect(impersonateSchema.safeParse({ targetUserId: "" }).success).toBe(false);
  });

  it("유효한 uid 통과", () => {
    const r = impersonateSchema.safeParse({ targetUserId: "abc123uid" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.targetUserId).toBe("abc123uid");
  });
});

describe("approvalEmailSchema", () => {
  it("email + approved 필수, name 옵셔널", () => {
    const r = approvalEmailSchema.safeParse({
      email: "test@yonsei.ac.kr",
      approved: true,
    });
    expect(r.success).toBe(true);
  });

  it("name 포함도 통과", () => {
    const r = approvalEmailSchema.safeParse({
      email: "test@yonsei.ac.kr",
      name: "홍길동",
      approved: false,
    });
    expect(r.success).toBe(true);
  });

  it("이메일 형식 잘못된 입력 거부", () => {
    const r = approvalEmailSchema.safeParse({
      email: "not-an-email",
      approved: true,
    });
    expect(r.success).toBe(false);
  });

  it("approved 누락 거부", () => {
    const r = approvalEmailSchema.safeParse({ email: "a@b.com" });
    expect(r.success).toBe(false);
  });
});

describe("inquiryReplyEmailSchema", () => {
  it("email + reply 필수", () => {
    const r = inquiryReplyEmailSchema.safeParse({
      email: "user@example.com",
      reply: "답변 내용",
    });
    expect(r.success).toBe(true);
  });

  it("빈 reply 거부", () => {
    const r = inquiryReplyEmailSchema.safeParse({
      email: "user@example.com",
      reply: "",
    });
    expect(r.success).toBe(false);
  });

  it("name/message 옵셔널", () => {
    const r = inquiryReplyEmailSchema.safeParse({
      email: "user@example.com",
      name: "홍길동",
      message: "원본 문의",
      reply: "답변",
    });
    expect(r.success).toBe(true);
  });
});

describe("passwordResetSchema", () => {
  it("유효 이메일 통과", () => {
    const r = passwordResetSchema.safeParse({ email: "user@yonsei.ac.kr" });
    expect(r.success).toBe(true);
  });

  it("이메일 누락 거부", () => {
    expect(passwordResetSchema.safeParse({}).success).toBe(false);
  });

  it("이메일 형식 거부", () => {
    expect(passwordResetSchema.safeParse({ email: "abc" }).success).toBe(false);
  });
});
