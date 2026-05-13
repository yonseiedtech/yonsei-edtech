import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkRateLimit, getClientId } from "../rate-limit";

// 각 테스트에 unique identifier 사용 — module-level store 공유 격리
let testIdCounter = 0;
function uniqueId(prefix = "test"): string {
  return `${prefix}-${Date.now()}-${testIdCounter++}`;
}

describe("checkRateLimit", () => {
  it("첫 요청 — 통과 (null 반환)", () => {
    const result = checkRateLimit(uniqueId(), { limit: 5, windowSec: 60 });
    expect(result).toBeNull();
  });

  it("한도 내 — 모두 통과", () => {
    const id = uniqueId();
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit(id, { limit: 5, windowSec: 60 })).toBeNull();
    }
  });

  it("한도 초과 — 429 Response 반환", () => {
    const id = uniqueId();
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit(id, { limit: 3, windowSec: 60 })).toBeNull();
    }
    const blocked = checkRateLimit(id, { limit: 3, windowSec: 60 });
    expect(blocked).toBeInstanceOf(Response);
    expect(blocked?.status).toBe(429);
  });

  it("429 Response — Retry-After 헤더 포함", () => {
    const id = uniqueId();
    for (let i = 0; i < 3; i++) {
      checkRateLimit(id, { limit: 3, windowSec: 60 });
    }
    const blocked = checkRateLimit(id, { limit: 3, windowSec: 60 });
    expect(blocked?.headers.get("Retry-After")).toBeTruthy();
    const retryAfter = Number(blocked?.headers.get("Retry-After"));
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(60);
  });

  it("기본 limit (20)", () => {
    const id = uniqueId();
    for (let i = 0; i < 20; i++) {
      expect(checkRateLimit(id)).toBeNull();
    }
    const blocked = checkRateLimit(id);
    expect(blocked?.status).toBe(429);
  });

  it("다른 identifier — 독립 카운트", () => {
    const idA = uniqueId("idA");
    const idB = uniqueId("idB");
    for (let i = 0; i < 3; i++) {
      checkRateLimit(idA, { limit: 3, windowSec: 60 });
    }
    expect(checkRateLimit(idA, { limit: 3, windowSec: 60 })?.status).toBe(429);
    // B는 독립적
    expect(checkRateLimit(idB, { limit: 3, windowSec: 60 })).toBeNull();
  });

  describe("윈도우 만료 후 리셋 (fake timers)", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("windowSec 경과 후 카운트 리셋", () => {
      const id = uniqueId();
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
      for (let i = 0; i < 3; i++) {
        checkRateLimit(id, { limit: 3, windowSec: 10 });
      }
      expect(checkRateLimit(id, { limit: 3, windowSec: 10 })?.status).toBe(429);
      // 10초 경과 → 리셋
      vi.setSystemTime(new Date("2026-01-01T00:00:11Z"));
      expect(checkRateLimit(id, { limit: 3, windowSec: 10 })).toBeNull();
    });
  });
});

describe("getClientId", () => {
  function makeRequest(headers: Record<string, string> = {}): Request {
    return new Request("https://example.com/", { headers });
  }

  it("userId 제공 — user: prefix", () => {
    expect(getClientId(makeRequest(), "abc123")).toBe("user:abc123");
  });

  it("userId 없고 x-forwarded-for 있음 — ip: prefix", () => {
    const req = makeRequest({ "x-forwarded-for": "192.168.1.1" });
    expect(getClientId(req)).toBe("ip:192.168.1.1");
  });

  it("x-forwarded-for 다중 IP — 첫 번째 사용", () => {
    const req = makeRequest({ "x-forwarded-for": "1.1.1.1, 2.2.2.2, 3.3.3.3" });
    expect(getClientId(req)).toBe("ip:1.1.1.1");
  });

  it("헤더 없음 — ip:unknown", () => {
    expect(getClientId(makeRequest())).toBe("ip:unknown");
  });

  it("userId 우선 — x-forwarded-for 가 있어도 userId 사용", () => {
    const req = makeRequest({ "x-forwarded-for": "1.1.1.1" });
    expect(getClientId(req, "userXYZ")).toBe("user:userXYZ");
  });

  it("userId null — IP fallback", () => {
    const req = makeRequest({ "x-forwarded-for": "1.1.1.1" });
    expect(getClientId(req, null)).toBe("ip:1.1.1.1");
  });

  it("x-forwarded-for 공백 trim", () => {
    const req = makeRequest({ "x-forwarded-for": "  192.168.0.1  " });
    expect(getClientId(req)).toBe("ip:192.168.0.1");
  });
});
