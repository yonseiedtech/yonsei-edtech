/**
 * post-permissions.ts 단위 테스트 (Sprint 67-AR — 테스트 커버리지 보강)
 *
 * 게시판 카테고리별 읽기/쓰기 권한은 공지·자료실·운영진 게시판 접근 제어의 핵심.
 * 역할 오류 시 권한 미달 회원이 글을 작성하거나, 자료실이 외부에 노출될 수 있음.
 */

import { describe, expect, it } from "vitest";
import {
  canWritePost,
  canReadPost,
  requiresAttachment,
  validateAttachment,
} from "@/lib/post-permissions";

// ── canWritePost ──────────────────────────────────────────────────────────────

describe("canWritePost", () => {
  it("공지(notice): 운영진·admin·sysadmin만 쓰기 가능", () => {
    expect(canWritePost("notice", "staff")).toBe(true);
    expect(canWritePost("notice", "president")).toBe(true);
    expect(canWritePost("notice", "admin")).toBe(true);
    expect(canWritePost("notice", "sysadmin")).toBe(true);
    expect(canWritePost("notice", "member")).toBe(false);
    expect(canWritePost("notice", "alumni")).toBe(false);
    expect(canWritePost("notice", "guest")).toBe(false);
  });

  it("자유(free): member·alumni·advisor도 쓰기 가능", () => {
    expect(canWritePost("free", "member")).toBe(true);
    expect(canWritePost("free", "alumni")).toBe(true);
    expect(canWritePost("free", "advisor")).toBe(true);
    expect(canWritePost("free", "staff")).toBe(true);
    expect(canWritePost("free", "guest")).toBe(false);
  });

  it("논문 리뷰(paper_review): member 쓰기 가능", () => {
    expect(canWritePost("paper_review", "member")).toBe(true);
    expect(canWritePost("paper_review", "alumni")).toBe(true);
  });

  it("운영진 게시판(staff): 운영진만 쓰기 가능", () => {
    expect(canWritePost("staff", "staff")).toBe(true);
    expect(canWritePost("staff", "president")).toBe(true);
    expect(canWritePost("staff", "member")).toBe(false);
    expect(canWritePost("staff", "alumni")).toBe(false);
  });

  it("자료실(resources): 운영진만 쓰기 가능 (읽기는 회원)", () => {
    expect(canWritePost("resources", "staff")).toBe(true);
    expect(canWritePost("resources", "member")).toBe(false);
  });

  it("role=null → false", () => {
    expect(canWritePost("notice", null)).toBe(false);
    expect(canWritePost("free", null)).toBe(false);
  });

  it("role=undefined → false", () => {
    expect(canWritePost("notice", undefined)).toBe(false);
  });

  it("role=guest → false (모든 카테고리)", () => {
    expect(canWritePost("notice", "guest")).toBe(false);
    expect(canWritePost("free", "guest")).toBe(false);
    expect(canWritePost("paper_review", "guest")).toBe(false);
  });
});

// ── canReadPost ───────────────────────────────────────────────────────────────

describe("canReadPost", () => {
  it("공개(public) 카테고리 → 비로그인도 읽기 가능", () => {
    expect(canReadPost("notice", null)).toBe(true);
    expect(canReadPost("notice", "guest")).toBe(true);
    expect(canReadPost("free", null)).toBe(true);
    expect(canReadPost("seminar", "guest")).toBe(true);
    expect(canReadPost("promotion", null)).toBe(true);
    expect(canReadPost("press", null)).toBe(true);
    expect(canReadPost("interview", null)).toBe(true);
    expect(canReadPost("update", null)).toBe(true);
    expect(canReadPost("paper_review", null)).toBe(true);
  });

  it("자료실(resources): 비로그인 차단", () => {
    expect(canReadPost("resources", null)).toBe(false);
    expect(canReadPost("resources", "guest")).toBe(false);
  });

  it("자료실(resources): 회원·운영진·졸업생·advisor는 읽기 가능", () => {
    expect(canReadPost("resources", "member")).toBe(true);
    expect(canReadPost("resources", "alumni")).toBe(true);
    expect(canReadPost("resources", "advisor")).toBe(true);
    expect(canReadPost("resources", "staff")).toBe(true);
  });

  it("운영진 게시판(staff): 운영진·admin만 읽기 가능", () => {
    expect(canReadPost("staff", "staff")).toBe(true);
    expect(canReadPost("staff", "president")).toBe(true);
    expect(canReadPost("staff", "admin")).toBe(true);
    expect(canReadPost("staff", "sysadmin")).toBe(true);
    expect(canReadPost("staff", "member")).toBe(false);
    expect(canReadPost("staff", null)).toBe(false);
    expect(canReadPost("staff", "guest")).toBe(false);
  });
});

// ── requiresAttachment ────────────────────────────────────────────────────────

describe("requiresAttachment", () => {
  it("자료실(resources) → true", () => {
    expect(requiresAttachment("resources")).toBe(true);
  });

  it("다른 카테고리 → false", () => {
    expect(requiresAttachment("notice")).toBe(false);
    expect(requiresAttachment("free")).toBe(false);
    expect(requiresAttachment("seminar")).toBe(false);
    expect(requiresAttachment("staff")).toBe(false);
  });
});

// ── validateAttachment ────────────────────────────────────────────────────────

describe("validateAttachment", () => {
  it("허용된 확장자 + 크기 OK → ok=true", () => {
    expect(validateAttachment({ size: 1024, name: "slide.pptx" })).toEqual({ ok: true });
    expect(validateAttachment({ size: 500_000, name: "report.pdf" })).toEqual({ ok: true });
    expect(validateAttachment({ size: 1_000_000, name: "data.xlsx" })).toEqual({ ok: true });
    expect(validateAttachment({ size: 100, name: "doc.hwp" })).toEqual({ ok: true });
    expect(validateAttachment({ size: 100, name: "doc.hwpx" })).toEqual({ ok: true });
    expect(validateAttachment({ size: 100, name: "archive.zip" })).toEqual({ ok: true });
    expect(validateAttachment({ size: 100, name: "image.png" })).toEqual({ ok: true });
    expect(validateAttachment({ size: 100, name: "photo.jpg" })).toEqual({ ok: true });
  });

  it("파일 크기 초과(>20MB) → ok=false + reason 포함", () => {
    const result = validateAttachment({ size: 21 * 1024 * 1024, name: "big.pdf" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("20MB");
  });

  it("허용되지 않은 확장자(.exe) → ok=false", () => {
    const result = validateAttachment({ size: 100, name: "virus.exe" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain(".exe");
  });

  it("허용되지 않은 확장자(.mp4) → ok=false", () => {
    const result = validateAttachment({ size: 100, name: "video.mp4" });
    expect(result.ok).toBe(false);
  });

  it("확장자 없는 파일 → ok=false", () => {
    const result = validateAttachment({ size: 100, name: "noext" });
    expect(result.ok).toBe(false);
  });

  it("대소문자 확장자(.PDF, .PPTX) → 소문자 정규화 후 허용", () => {
    expect(validateAttachment({ size: 100, name: "REPORT.PDF" })).toEqual({ ok: true });
    expect(validateAttachment({ size: 100, name: "SLIDE.PPTX" })).toEqual({ ok: true });
  });

  it("정확히 20MB → ok=true (경계값)", () => {
    const result = validateAttachment({ size: 20 * 1024 * 1024, name: "limit.pdf" });
    expect(result.ok).toBe(true);
  });
});
