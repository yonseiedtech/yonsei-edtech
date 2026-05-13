/**
 * cert-counter.ts — formatCertNo 단위 테스트 (Sprint 67-AR)
 *
 * 수료증 번호 형식 오류 시 인쇄물/DB에 잘못된 번호가 기록됨.
 * nextCertSeq는 Firestore 의존성으로 테스트 제외.
 */

import { describe, expect, it } from "vitest";
import { formatCertNo } from "@/lib/cert-counter";

describe("formatCertNo", () => {
  it("연도 2자리 + 시퀀스 3자리 패딩", () => {
    expect(formatCertNo("26", 1)).toBe("26-001");
    expect(formatCertNo("26", 12)).toBe("26-012");
    expect(formatCertNo("26", 123)).toBe("26-123");
  });

  it("시퀀스 1000 이상 → 패딩 없이 그대로", () => {
    expect(formatCertNo("26", 1000)).toBe("26-1000");
  });

  it("연도가 다를 때 해당 연도 사용", () => {
    expect(formatCertNo("25", 5)).toBe("25-005");
    expect(formatCertNo("27", 99)).toBe("27-099");
  });

  it("시퀀스 0 → '26-000' 형식", () => {
    expect(formatCertNo("26", 0)).toBe("26-000");
  });
});
