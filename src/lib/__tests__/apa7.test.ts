/**
 * apa7.ts 단위 테스트 (Sprint 67-AR — 테스트 커버리지 보강)
 *
 * APA7 인용 형식 오류 시 AI 포럼 참고문헌 출력이 왜곡됨.
 * formatApa7 / formatApa7List 핵심 케이스 커버.
 */

import { describe, expect, it } from "vitest";
import { formatApa7, formatApa7List } from "@/lib/apa7";
import type { ResearchPaper } from "@/types";

function mkPaper(partial: Partial<ResearchPaper> = {}): ResearchPaper {
  return {
    id: "p_1",
    title: "테스트 논문 제목",
    authors: "홍길동",
    year: 2024,
    paperType: "academic",
    venue: "교육공학연구",
    volume: "40",
    issue: "1",
    pages: "1-30",
    ...partial,
  } as unknown as ResearchPaper;
}

// ── formatApa7 — academic ─────────────────────────────────────────────────────

describe("formatApa7 — academic", () => {
  it("완전한 학술논문 형식", () => {
    const p = mkPaper();
    const result = formatApa7(p);
    expect(result).toContain("홍길동");
    expect(result).toContain("(2024)");
    expect(result).toContain("테스트 논문 제목");
    expect(result).toContain("교육공학연구");
    expect(result).toContain("40");
    expect(result).toContain("(1)");
    expect(result).toContain("1-30");
  });

  it("연도 없음 → (n.d.)", () => {
    const p = mkPaper({ year: undefined });
    expect(formatApa7(p)).toContain("(n.d.)");
  });

  it("저자 없음 → 저자 부분 생략", () => {
    const p = mkPaper({ authors: "" });
    const result = formatApa7(p);
    expect(result).toMatch(/^\(2024\)/);
  });

  it("venue 없음 → 저널 섹션 생략", () => {
    const p = mkPaper({ venue: "", volume: "", issue: "", pages: "" });
    const result = formatApa7(p);
    expect(result).not.toContain("교육공학연구");
  });

  it("volume만 있고 issue 없음 → 괄호 없음", () => {
    const p = mkPaper({ issue: "" });
    const result = formatApa7(p);
    expect(result).not.toMatch(/\(\)/);
  });

  it("DOI 포함 — 절대 URL", () => {
    const p = mkPaper({ doi: "10.1234/test" });
    const result = formatApa7(p);
    expect(result).toContain("https://doi.org/10.1234/test");
  });

  it("DOI가 이미 https:// 형식이면 그대로", () => {
    const p = mkPaper({ doi: "https://doi.org/10.1234/test" });
    const result = formatApa7(p);
    expect(result).toContain("https://doi.org/10.1234/test");
    // 중복 prefix 없음
    expect(result).not.toContain("https://doi.org/https://");
  });

  it("DOI 없고 url 있으면 url 사용", () => {
    const p = mkPaper({ doi: undefined, url: "https://example.com/paper" });
    const result = formatApa7(p);
    expect(result).toContain("https://example.com/paper");
  });

  it("DOI도 url도 없으면 링크 없음", () => {
    const p = mkPaper({ doi: undefined, url: undefined });
    const result = formatApa7(p);
    expect(result).not.toContain("http");
  });
});

// ── formatApa7 — thesis ───────────────────────────────────────────────────────

describe("formatApa7 — thesis", () => {
  it("박사학위논문 형식", () => {
    const p = mkPaper({
      paperType: "thesis",
      thesisLevel: "doctoral",
      venue: "연세대학교",
    });
    const result = formatApa7(p);
    expect(result).toContain("[박사학위논문]");
    expect(result).toContain("연세대학교");
  });

  it("석사학위논문 형식", () => {
    const p = mkPaper({
      paperType: "thesis",
      thesisLevel: "master",
      venue: "연세대학교",
    });
    const result = formatApa7(p);
    expect(result).toContain("[석사학위논문]");
  });

  it("thesisLevel 미지정 → [학위논문]", () => {
    const p = mkPaper({
      paperType: "thesis",
      thesisLevel: undefined,
      venue: "연세대학교",
    });
    const result = formatApa7(p);
    expect(result).toContain("[학위논문]");
  });

  it("venue 없는 학위논문 → 소속기관 생략", () => {
    const p = mkPaper({
      paperType: "thesis",
      thesisLevel: "master",
      venue: "",
    });
    const result = formatApa7(p);
    expect(result).toContain("[석사학위논문]");
  });
});

// ── formatApa7List ────────────────────────────────────────────────────────────

describe("formatApa7List", () => {
  it("저자 가나다순 정렬", () => {
    const papers = [
      mkPaper({ id: "p_2", authors: "홍길동", year: 2020 }),
      mkPaper({ id: "p_1", authors: "김철수", year: 2022 }),
    ];
    const result = formatApa7List(papers);
    const lines = result.split("\n");
    expect(lines[0]).toContain("김철수");
    expect(lines[1]).toContain("홍길동");
  });

  it("같은 저자 → 연도 오름차순 정렬", () => {
    const papers = [
      mkPaper({ id: "p_2", authors: "홍길동", year: 2024 }),
      mkPaper({ id: "p_1", authors: "홍길동", year: 2020 }),
    ];
    const result = formatApa7List(papers);
    const lines = result.split("\n");
    expect(lines[0]).toContain("(2020)");
    expect(lines[1]).toContain("(2024)");
  });

  it("번호 prefix 붙음 '1. ' 형식", () => {
    const papers = [mkPaper()];
    const result = formatApa7List(papers);
    expect(result).toMatch(/^1\. /);
  });

  it("빈 배열 → 빈 문자열", () => {
    expect(formatApa7List([])).toBe("");
  });
});
