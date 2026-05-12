/**
 * APA 7 포매터 단위 테스트 (Sprint 67-AR — Human-in-the-loop 검증 회귀 방지)
 *
 * 잘못된 APA 표기는 학회 신뢰도에 직결되므로 핵심 케이스를 테스트로 못 박는다.
 */

import { describe, expect, it } from "vitest";
import { citationLinkUrl, formatAPA7Reference, formatInText } from "@/features/ai-forum/apa";
import type { APACitation } from "@/types/ai-forum";

const baseJournal: APACitation = {
  id: "test-1",
  authors: ["Smith, J. K.", "Park, M. H."],
  year: 2024,
  title: "Generative AI in higher education classrooms",
  type: "journal",
  journal: "Journal of Educational Technology",
  volume: 41,
  issue: 2,
  pages: "123-145",
  doi: "10.1234/jet.2024.4102.001",
  language: "en",
};

describe("formatAPA7Reference - journal", () => {
  it("저자 2명 + journal + volume(issue) + pages + DOI 정상", () => {
    const out = formatAPA7Reference(baseJournal);
    expect(out).toContain("Smith, J. K., & Park, M. H.");
    expect(out).toContain("(2024).");
    expect(out).toContain("Generative AI in higher education classrooms.");
    expect(out).toContain("Journal of Educational Technology, 41(2), 123-145.");
    expect(out).toContain("https://doi.org/10.1234/jet.2024.4102.001");
  });

  it("DOI 가 이미 URL 형식이면 그대로 사용", () => {
    const out = formatAPA7Reference({
      ...baseJournal,
      doi: "https://doi.org/10.1234/already-url",
    });
    expect(out).toContain("https://doi.org/10.1234/already-url");
    // 중복 변환 안 됨
    expect(out).not.toContain("https://doi.org/https://doi.org");
  });

  it("issue 없을 때 volume만 표기", () => {
    const out = formatAPA7Reference({ ...baseJournal, issue: undefined });
    expect(out).toContain("Journal of Educational Technology, 41, 123-145.");
    expect(out).not.toContain("41(");
  });
});

describe("formatAPA7Reference - 한국어 저자", () => {
  it("한국어 저자 2명 + 책", () => {
    const out = formatAPA7Reference({
      id: "kim-2023",
      authors: ["김철수", "이영희"],
      year: 2023,
      title: "교육공학의 이해",
      type: "book",
      publisher: "교육과학사",
      language: "ko",
    });
    expect(out).toContain("김철수, & 이영희.");
    expect(out).toContain("(2023).");
    expect(out).toContain("교육공학의 이해.");
    expect(out).toContain("교육과학사.");
  });
});

describe("formatAPA7Reference - 저자 수 처리", () => {
  it("저자 1명", () => {
    const out = formatAPA7Reference({
      id: "single",
      authors: ["Doe, J."],
      year: 2020,
      title: "Solo work",
      type: "book",
      publisher: "Press",
      language: "en",
    });
    expect(out).toContain("Doe, J. (2020).");
  });

  it("저자 21명 이상 — 첫 19명 + ... + 마지막", () => {
    const authors = Array.from({ length: 25 }, (_, i) => `A${i + 1}`);
    const out = formatAPA7Reference({
      id: "many",
      authors,
      year: 2024,
      title: "Many authors paper",
      type: "journal",
      journal: "J",
      language: "en",
    });
    expect(out).toContain("A1");
    expect(out).toContain("A19");
    expect(out).toContain("..."); // 생략 부호
    expect(out).toContain("A25"); // 마지막 저자
    // A20-24 는 생략되어 등장하지 않아야 함
    expect(out).not.toMatch(/, A20[,.]/);
  });
});

describe("formatInText", () => {
  it("저자 1명: (Last, year)", () => {
    expect(formatInText({ ...baseJournal, authors: ["Yan, L."] })).toBe("(Yan, 2024)");
  });

  it("저자 2명: (A & B, year)", () => {
    expect(formatInText(baseJournal)).toBe("(Smith & Park, 2024)");
  });

  it("저자 3명 이상: (First et al., year)", () => {
    expect(
      formatInText({
        ...baseJournal,
        authors: ["Yan, L.", "Sha, L.", "Zhao, L.", "Li, Y."],
      }),
    ).toBe("(Yan et al., 2024)");
  });

  it("한국어 저자 3명: (첫저자 외, year)", () => {
    expect(
      formatInText({
        ...baseJournal,
        authors: ["김철수", "이영희", "박민수"],
        language: "ko",
      }),
    ).toBe("(김철수 외, 2024)");
  });
});

describe("citationLinkUrl", () => {
  it("DOI 가 있으면 https://doi.org/ 변환", () => {
    expect(citationLinkUrl({ ...baseJournal, doi: "10.1234/x", url: undefined })).toBe(
      "https://doi.org/10.1234/x",
    );
  });

  it("DOI 가 URL 형식이면 그대로", () => {
    expect(
      citationLinkUrl({ ...baseJournal, doi: "https://example.com/paper", url: undefined }),
    ).toBe("https://example.com/paper");
  });

  it("DOI 없고 URL 있으면 URL", () => {
    expect(citationLinkUrl({ ...baseJournal, doi: undefined, url: "https://eric.gov/x" })).toBe(
      "https://eric.gov/x",
    );
  });

  it("DOI 도 URL 도 없으면 null", () => {
    expect(citationLinkUrl({ ...baseJournal, doi: undefined, url: undefined })).toBeNull();
  });
});
