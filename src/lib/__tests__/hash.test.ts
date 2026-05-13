import { describe, it, expect } from "vitest";
import { sha256Hex } from "../hash";

describe("sha256Hex", () => {
  it("빈 문자열 — SHA-256 표준 결과 반환", async () => {
    // SHA-256("") = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    const h = await sha256Hex("");
    expect(h).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("ASCII 문자열 'abc' — SHA-256 표준 결과", async () => {
    // SHA-256("abc") = ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
    const h = await sha256Hex("abc");
    expect(h).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("출력은 64자 hex 문자열", async () => {
    const h = await sha256Hex("test");
    expect(h).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(h)).toBe(true);
  });

  it("동일 입력 — 동일 결과 (결정성)", async () => {
    const a = await sha256Hex("hello world");
    const b = await sha256Hex("hello world");
    expect(a).toBe(b);
  });

  it("다른 입력 — 다른 결과", async () => {
    const a = await sha256Hex("foo");
    const b = await sha256Hex("bar");
    expect(a).not.toBe(b);
  });

  it("한국어 입력 (UTF-8 인코딩) — 64자 hex", async () => {
    const h = await sha256Hex("연세교육공학회");
    expect(h).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(h)).toBe(true);
  });

  it("1글자 차이 — 완전히 다른 hash (avalanche)", async () => {
    const a = await sha256Hex("password");
    const b = await sha256Hex("Password");
    expect(a).not.toBe(b);
    // 절반 이상 글자가 달라야 함 (avalanche effect)
    let diff = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
    expect(diff).toBeGreaterThan(30);
  });
});
