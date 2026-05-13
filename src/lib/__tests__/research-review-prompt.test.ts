import { describe, it, expect } from "vitest";
import {
  parseReviewJson,
  buildResearchReviewMessages,
  appendReviewFooter,
} from "../research-review-prompt";
import type { ResearchPaper } from "../research-paper-source";

const MOCK_PAPER: ResearchPaper = {
  id: "W123",
  doi: "10.1111/bjet.70066",
  title: "Beyond MOOCs: A study",
  abstract: "Sample abstract...",
  authors: ["Doe, J.", "Smith, A."],
  year: 2026,
  venue: "British Journal of Educational Technology",
  source: "openalex",
  url: "https://doi.org/10.1111/bjet.70066",
};

describe("parseReviewJson", () => {
  it("정상 JSON 파싱", () => {
    const raw = JSON.stringify({
      koreanTitle: "MOOC 학습 참여 연구",
      keywords: ["MOOC", "참여"],
      bodyMarkdown: "## 연구 질문\n...",
    });
    const parsed = parseReviewJson(raw);
    expect(parsed).not.toBeNull();
    expect(parsed!.koreanTitle).toBe("MOOC 학습 참여 연구");
    expect(parsed!.keywords).toEqual(["MOOC", "참여"]);
  });

  it("```json fence 둘러싸인 응답도 파싱", () => {
    const raw = "```json\n" + JSON.stringify({
      koreanTitle: "테스트",
      bodyMarkdown: "본문",
    }) + "\n```";
    const parsed = parseReviewJson(raw);
    expect(parsed?.koreanTitle).toBe("테스트");
  });

  it("``` (json 키워드 없는) fence 도 파싱", () => {
    const raw = "```\n" + JSON.stringify({
      koreanTitle: "테스트",
      bodyMarkdown: "본문",
    }) + "\n```";
    const parsed = parseReviewJson(raw);
    expect(parsed?.koreanTitle).toBe("테스트");
  });

  it("앞뒤 공백 trim 후 파싱", () => {
    const raw = "  \n  " + JSON.stringify({
      koreanTitle: "공백 테스트",
      bodyMarkdown: "본문",
    }) + "\n\n  ";
    const parsed = parseReviewJson(raw);
    expect(parsed?.koreanTitle).toBe("공백 테스트");
  });

  it("필수 필드 누락 시 null 반환", () => {
    const raw = JSON.stringify({ keywords: ["a"] }); // koreanTitle, bodyMarkdown 둘 다 없음
    expect(parseReviewJson(raw)).toBeNull();
  });

  it("koreanTitle만 있고 bodyMarkdown 없으면 null", () => {
    const raw = JSON.stringify({ koreanTitle: "제목만" });
    expect(parseReviewJson(raw)).toBeNull();
  });

  it("잘못된 JSON 문법은 null", () => {
    expect(parseReviewJson("{not valid json}")).toBeNull();
    expect(parseReviewJson("plain text response")).toBeNull();
    expect(parseReviewJson("")).toBeNull();
  });

  it("keywords가 배열이 아니면 빈 배열로 fallback", () => {
    const raw = JSON.stringify({
      koreanTitle: "테스트",
      bodyMarkdown: "본문",
      keywords: "not-an-array",
    });
    const parsed = parseReviewJson(raw);
    expect(parsed?.keywords).toEqual([]);
  });

  it("keywords가 5개 초과면 5개로 자름", () => {
    const raw = JSON.stringify({
      koreanTitle: "테스트",
      bodyMarkdown: "본문",
      keywords: ["a", "b", "c", "d", "e", "f", "g"],
    });
    const parsed = parseReviewJson(raw);
    expect(parsed?.keywords).toHaveLength(5);
    expect(parsed?.keywords).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("keywords 누락 시 빈 배열", () => {
    const raw = JSON.stringify({
      koreanTitle: "테스트",
      bodyMarkdown: "본문",
    });
    const parsed = parseReviewJson(raw);
    expect(parsed?.keywords).toEqual([]);
  });
});

describe("buildResearchReviewMessages", () => {
  it("system + prompt 두 필드 반환", () => {
    const m = buildResearchReviewMessages(MOCK_PAPER, "test abstract content");
    expect(m.system).toContain("한국교육공학회 연구 리뷰");
    expect(m.system).toContain("명시된 내용만");
    expect(m.prompt).toContain("test abstract content");
    expect(m.prompt).toContain(MOCK_PAPER.title);
  });

  it("프롬프트에 DOI·저자·학술지 모두 포함", () => {
    const m = buildResearchReviewMessages(MOCK_PAPER, "abs");
    expect(m.prompt).toContain(MOCK_PAPER.doi!);
    expect(m.prompt).toContain("Doe, J.");
    expect(m.prompt).toContain(MOCK_PAPER.venue!);
  });

  it("TLDR 있으면 프롬프트에 포함", () => {
    const paperWithTldr: ResearchPaper = { ...MOCK_PAPER, tldr: "TLDR 요약" };
    const m = buildResearchReviewMessages(paperWithTldr, "abs");
    expect(m.prompt).toContain("TLDR 요약");
  });

  it("TLDR 없으면 프롬프트에서 TLDR 줄 생략", () => {
    const m = buildResearchReviewMessages(MOCK_PAPER, "abs");
    expect(m.prompt).not.toContain("TLDR(공식 요약)");
  });

  it("저자 7명 이상이면 6명 + '외'", () => {
    const manyAuthors: ResearchPaper = {
      ...MOCK_PAPER,
      authors: ["A, B.", "C, D.", "E, F.", "G, H.", "I, J.", "K, L.", "M, N."],
    };
    const m = buildResearchReviewMessages(manyAuthors, "abs");
    expect(m.prompt).toContain("외");
    expect(m.prompt).not.toContain("M, N."); // 7번째는 제외
  });

  it("출력 형식 JSON 강제 지시 포함", () => {
    const m = buildResearchReviewMessages(MOCK_PAPER, "abs");
    expect(m.prompt).toContain("JSON");
    expect(m.prompt).toContain("koreanTitle");
    expect(m.prompt).toContain("bodyMarkdown");
  });
});

describe("appendReviewFooter", () => {
  it("DOI 검증 통과 시 푸터에 ✓ 표시", () => {
    const out = appendReviewFooter("본문", MOCK_PAPER, true);
    expect(out).toContain("통과 ✓");
    expect(out).not.toContain("보류 ⚠");
  });

  it("DOI 검증 실패 시 푸터에 ⚠ 표시", () => {
    const out = appendReviewFooter("본문", MOCK_PAPER, false);
    expect(out).toContain("보류 ⚠");
  });

  it("원문 링크 포함 (url 또는 DOI fallback)", () => {
    const out = appendReviewFooter("본문", MOCK_PAPER, true);
    expect(out).toContain(MOCK_PAPER.url!);
  });

  it("url 없으면 doi.org fallback", () => {
    const paperNoUrl: ResearchPaper = { ...MOCK_PAPER, url: undefined };
    const out = appendReviewFooter("본문", paperNoUrl, true);
    expect(out).toContain("https://doi.org/" + MOCK_PAPER.doi);
  });

  it("AI 작성 명시 푸터 포함", () => {
    const out = appendReviewFooter("본문", MOCK_PAPER, true);
    expect(out).toContain("AI 에이전트");
    expect(out).toContain("운영진의 검토");
  });

  it("본문이 푸터 위에 위치", () => {
    const out = appendReviewFooter("BODY_CONTENT", MOCK_PAPER, true);
    const bodyIdx = out.indexOf("BODY_CONTENT");
    const footerIdx = out.indexOf("AI 에이전트");
    expect(bodyIdx).toBeGreaterThan(0);
    expect(footerIdx).toBeGreaterThan(bodyIdx);
  });
});
