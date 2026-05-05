import { describe, it, expect } from "vitest";
import {
  buildFreshConsents,
  needsReConsent,
  REQUIRED_CONSENT_KEYS,
  CURRENT_TERMS,
} from "../legal";

describe("buildFreshConsents", () => {
  it("필수 약관 모두 동의 시 ConsentRecord 생성", () => {
    const c = buildFreshConsents({ terms: true, privacy: true, collection: true });
    expect(c.terms?.agreed).toBe(true);
    expect(c.privacy?.agreed).toBe(true);
    expect(c.collection?.agreed).toBe(true);
    expect(c.marketing?.agreed).toBe(false);
  });

  it("marketing 옵셔널 — 미지정 시 false", () => {
    const c = buildFreshConsents({ terms: true, privacy: true, collection: true });
    expect(c.marketing?.agreed).toBe(false);
  });

  it("marketing true 지정 가능", () => {
    const c = buildFreshConsents({
      terms: true, privacy: true, collection: true, marketing: true,
    });
    expect(c.marketing?.agreed).toBe(true);
  });

  it("각 ConsentRecord 는 version + at 보유", () => {
    const c = buildFreshConsents({ terms: true, privacy: true, collection: true });
    expect(c.terms?.version).toBe(CURRENT_TERMS.terms);
    expect(c.terms?.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("미동의 케이스 — agreed false", () => {
    const c = buildFreshConsents({ terms: false, privacy: false, collection: false });
    expect(c.terms?.agreed).toBe(false);
    expect(c.privacy?.agreed).toBe(false);
    expect(c.collection?.agreed).toBe(false);
  });
});

describe("needsReConsent", () => {
  it("undefined 입력 시 true", () => {
    expect(needsReConsent(undefined)).toBe(true);
  });

  it("null 입력 시 true", () => {
    expect(needsReConsent(null)).toBe(true);
  });

  it("빈 객체 시 true (필수 약관 없음)", () => {
    expect(needsReConsent({})).toBe(true);
  });

  it("필수 약관 모두 최신 버전 동의 시 false", () => {
    const c = buildFreshConsents({
      terms: true, privacy: true, collection: true,
    });
    expect(needsReConsent(c)).toBe(false);
  });

  it("필수 중 하나라도 미동의 시 true", () => {
    const c = buildFreshConsents({
      terms: true, privacy: false, collection: true,
    });
    expect(needsReConsent(c)).toBe(true);
  });
});

describe("REQUIRED_CONSENT_KEYS", () => {
  it("정확히 3개 (terms/privacy/collection)", () => {
    expect(REQUIRED_CONSENT_KEYS).toEqual(["terms", "privacy", "collection"]);
  });

  it("marketing 미포함 (선택 약관)", () => {
    expect(REQUIRED_CONSENT_KEYS).not.toContain("marketing");
  });
});
