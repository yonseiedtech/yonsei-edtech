import { describe, it, expect } from "vitest";
import { normalizeDoi, mapCrossrefWork } from "../crossref";

describe("normalizeDoi", () => {
  it("순수 DOI 를 그대로 반환", () => {
    expect(normalizeDoi("10.1207/s15516709cog1202_4")).toBe("10.1207/s15516709cog1202_4");
  });

  it("doi.org URL 에서 DOI 본체 추출", () => {
    expect(normalizeDoi("https://doi.org/10.1037/0033-295X.84.2.191")).toBe(
      "10.1037/0033-295X.84.2.191",
    );
  });

  it("뒤따르는 구두점 제거", () => {
    expect(normalizeDoi("10.2307/249008.")).toBe("10.2307/249008");
  });

  it("DOI 가 아니면 null", () => {
    expect(normalizeDoi("not-a-doi")).toBeNull();
    expect(normalizeDoi("")).toBeNull();
  });
});

describe("mapCrossrefWork", () => {
  it("전형적 학술지 응답을 폼 필드로 변환", () => {
    const meta = mapCrossrefWork({
      title: ["Computational thinking"],
      author: [{ given: "Jeannette M.", family: "Wing" }],
      issued: { "date-parts": [[2006, 3]] },
      "container-title": ["Communications of the ACM"],
      volume: "49",
      issue: "3",
      page: "33-35",
      DOI: "10.1145/1118178.1118215",
    });
    expect(meta.title).toBe("Computational thinking");
    expect(meta.authors).toBe("Wing, J. M.");
    expect(meta.year).toBe(2006);
    expect(meta.venue).toBe("Communications of the ACM");
    expect(meta.volume).toBe("49");
    expect(meta.issue).toBe("3");
    expect(meta.pages).toBe("33-35");
    expect(meta.doi).toBe("10.1145/1118178.1118215");
  });

  it("복수 저자는 & 로 연결", () => {
    const meta = mapCrossrefWork({
      author: [
        { given: "Punya", family: "Mishra" },
        { given: "Matthew J.", family: "Koehler" },
      ],
    });
    expect(meta.authors).toBe("Mishra, P., & Koehler, M. J.");
  });

  it("누락 필드는 키 자체를 생략 (빈 문자열 오염 방지)", () => {
    const meta = mapCrossrefWork({ title: ["Only title"] });
    expect(meta.title).toBe("Only title");
    expect(meta.authors).toBeUndefined();
    expect(meta.year).toBeUndefined();
    expect(meta.venue).toBeUndefined();
  });

  it("비정상 연도(date-parts 누락)는 생략", () => {
    const meta = mapCrossrefWork({ issued: { "date-parts": [[]] } });
    expect(meta.year).toBeUndefined();
  });
});
