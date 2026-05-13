import { describe, it, expect } from "vitest";
import {
  EDU_TECH_KEYWORD_CATEGORIES,
  EDU_TECH_KEYWORDS,
  KEYWORD_TO_CATEGORY,
} from "../edu-keywords";

describe("EDU_TECH_KEYWORD_CATEGORIES", () => {
  it("최소 1개 카테고리 보유", () => {
    expect(EDU_TECH_KEYWORD_CATEGORIES.length).toBeGreaterThan(0);
  });

  it("모든 카테고리가 label·keywords 필드 보유", () => {
    for (const cat of EDU_TECH_KEYWORD_CATEGORIES) {
      expect(cat.label).toBeTruthy();
      expect(typeof cat.label).toBe("string");
      expect(Array.isArray(cat.keywords)).toBe(true);
    }
  });

  it("각 카테고리는 최소 1개 키워드 보유", () => {
    for (const cat of EDU_TECH_KEYWORD_CATEGORIES) {
      expect(cat.keywords.length).toBeGreaterThan(0);
    }
  });

  it("카테고리 라벨은 중복되지 않음", () => {
    const labels = EDU_TECH_KEYWORD_CATEGORIES.map((c) => c.label);
    const unique = new Set(labels);
    expect(unique.size).toBe(labels.length);
  });

  it("모든 키워드는 공백·비어있는 문자열이 아님", () => {
    for (const cat of EDU_TECH_KEYWORD_CATEGORIES) {
      for (const k of cat.keywords) {
        expect(typeof k).toBe("string");
        expect(k.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe("EDU_TECH_KEYWORDS (평탄화)", () => {
  it("모든 카테고리 키워드의 합과 일치", () => {
    const flat = EDU_TECH_KEYWORD_CATEGORIES.flatMap((c) => c.keywords);
    expect(EDU_TECH_KEYWORDS).toEqual(flat);
  });

  it("전체 키워드 중복 없음 (카테고리 간 unique)", () => {
    const unique = new Set(EDU_TECH_KEYWORDS);
    expect(unique.size).toBe(EDU_TECH_KEYWORDS.length);
  });

  it("주요 학회 핵심 키워드 포함", () => {
    expect(EDU_TECH_KEYWORDS).toContain("학습분석");
    expect(EDU_TECH_KEYWORDS).toContain("교수설계");
    expect(EDU_TECH_KEYWORDS).toContain("ADDIE");
    expect(EDU_TECH_KEYWORDS).toContain("MOOC");
  });
});

describe("KEYWORD_TO_CATEGORY (역매핑)", () => {
  it("모든 키워드 → 카테고리 매핑 존재", () => {
    for (const k of EDU_TECH_KEYWORDS) {
      expect(KEYWORD_TO_CATEGORY[k]).toBeTruthy();
    }
  });

  it("매핑된 라벨은 EDU_TECH_KEYWORD_CATEGORIES 의 label 중 하나", () => {
    const validLabels = new Set(EDU_TECH_KEYWORD_CATEGORIES.map((c) => c.label));
    for (const k of EDU_TECH_KEYWORDS) {
      expect(validLabels.has(KEYWORD_TO_CATEGORY[k])).toBe(true);
    }
  });

  it("존재하지 않는 키워드는 undefined", () => {
    expect(KEYWORD_TO_CATEGORY["존재하지않는키워드_xyz"]).toBeUndefined();
  });

  it("역매핑 entry 수 = 전체 키워드 수 (1:1)", () => {
    expect(Object.keys(KEYWORD_TO_CATEGORY).length).toBe(EDU_TECH_KEYWORDS.length);
  });
});
