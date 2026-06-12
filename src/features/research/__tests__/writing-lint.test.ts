import { describe, it, expect } from "vitest";
import { lintThesis, extractResearchQuestions, questionCoverage, type LintSections } from "../writing-lint";
import type { WritingSection } from "@/types";

let seq = 0;
function sec(heading: string, ...texts: string[]): WritingSection {
  return {
    id: `s${++seq}`,
    heading,
    paragraphs: texts.map((text) => ({ id: `p${++seq}`, text })),
  };
}

function rules(issues: ReturnType<typeof lintThesis>): string[] {
  return issues.map((i) => i.rule);
}

describe("writing-lint — 정확성·객관성", () => {
  it("모호 정도부사 검출 (매우·크게)", () => {
    const issues = lintThesis({
      results: [sec("연구문제별 결과", "실험집단의 점수가 매우 크게 향상되었다.")],
    });
    expect(rules(issues).filter((r) => r === "vague-adverb").length).toBeGreaterThanOrEqual(2);
  });

  it("1인칭 검출 — '나는'은 잡고 '하나는'은 안 잡음", () => {
    const positive = lintThesis({
      intro: [sec("연구의 필요성", "나는 이 문제가 중요하다고 생각한다.")],
    });
    expect(rules(positive)).toContain("first-person");

    const negative = lintThesis({
      intro: [sec("연구의 필요성", "둘 중 하나는 통제집단으로 배정하였다.")],
    });
    expect(rules(negative)).not.toContain("first-person");
  });

  it("'연구자는'·'우리나라'는 1인칭으로 잡지 않음", () => {
    const issues = lintThesis({
      intro: [sec("연구의 필요성", "연구자는 우리나라 교육 현장의 변화에 주목하였다.")],
    });
    expect(rules(issues)).not.toContain("first-person");
  });
});

describe("writing-lint — 주술 호응·시제·인과 수위", () => {
  it("'목적은 ~' 문장이 '데 있다'로 안 받으면 지적 (서론)", () => {
    const bad = lintThesis({
      intro: [sec("연구 목적 및 연구 문제", "본 연구의 목적은 프로그램의 효과를 검증한다.")],
    });
    expect(rules(bad)).toContain("subject-predicate");

    const good = lintThesis({
      intro: [sec("연구 목적 및 연구 문제", "본 연구의 목적은 프로그램의 효과를 검증하는 데 있다.")],
    });
    expect(rules(good)).not.toContain("subject-predicate");
  });

  it("방법 장 행위 동사 현재형 종결 지적", () => {
    const issues = lintThesis({
      method: [sec("자료 분석", "수집된 자료는 SPSS를 이용하여 분석한다.")],
    });
    expect(rules(issues)).toContain("tense");
  });

  it("결과 장 인과 표현 수위 지적", () => {
    const issues = lintThesis({
      results: [sec("연구문제별 결과", "프로그램은 학업적 자기효능감에 유의한 영향을 미쳤다.")],
    });
    expect(rules(issues)).toContain("causal-in-results");
  });
});

describe("writing-lint — 효과크기·가독성·일관성", () => {
  it("p값만 있고 효과크기 없으면 장 단위 info", () => {
    const missing = lintThesis({
      results: [sec("연구문제별 결과", "두 집단 간 차이는 유의하였다(t = 2.31, p < .05).")],
    });
    expect(rules(missing)).toContain("effect-size-missing");

    const present = lintThesis({
      results: [sec("연구문제별 결과", "차이는 유의하였다(t = 2.31, p < .05, Cohen's d = 0.62).")],
    });
    expect(rules(present)).not.toContain("effect-size-missing");
  });

  it("150자 초과 문장 — 가독성 info", () => {
    const long = "이 연구는 ".padEnd(160, "매개변인과 조절변인의 관계를 살펴보는 것으로 ") + "마무리된다.";
    const issues = lintThesis({ background: [sec("선행연구 고찰", long)] });
    expect(rules(issues)).toContain("long-sentence");
  });

  it("띄어쓰기 변형 혼용 검출 — 각 2회 이상일 때", () => {
    const issues = lintThesis({
      intro: [
        sec(
          "연구의 필요성",
          "자기조절 학습이 중요하다. 자기조절 학습은 군 환경에서 더 중요하다.",
          "자기조절학습 프로그램을 설계하였다. 본 자기조절학습 프로그램은 4주간 운영되었다.",
        ),
      ],
    });
    expect(rules(issues)).toContain("spacing-variant");
  });

  it("깨끗한 본문 — 지적 없음", () => {
    const issues = lintThesis({
      intro: [
        sec(
          "연구 목적 및 연구 문제",
          "본 연구의 목적은 자기조절학습 프로그램이 학업적 자기효능감에 미치는 효과를 검증하는 데 있다.",
        ),
      ],
    });
    expect(issues).toHaveLength(0);
  });
});

describe("extractResearchQuestions", () => {
  it("서론 의문문 추출", () => {
    const qs = extractResearchQuestions({
      intro: [
        sec(
          "연구 목적 및 연구 문제",
          "연구 문제는 다음과 같다. 첫째, 프로그램 참여 여부에 따라 학업적 자기효능감에 차이가 있는가? 둘째, 그 효과는 계급에 따라 다른가?",
        ),
      ],
    } satisfies LintSections);
    expect(qs).toHaveLength(2);
    expect(qs[0]).toContain("차이가 있는가?");
  });
});

describe("questionCoverage — 연구 문제 ↔ 결과 장 대조", () => {
  it("핵심 토큰이 결과 장에 있으면 covered, 없으면 미발견", () => {
    const out = questionCoverage({
      intro: [
        sec(
          "연구 목적 및 연구 문제",
          "첫째, 자기조절학습 프로그램 참여에 따라 학업적 자기효능감에 차이가 있는가? 둘째, 학습몰입 수준은 계급에 따라 다른가?",
        ),
      ],
      results: [
        sec(
          "연구문제별 결과",
          "자기조절학습 프로그램에 참여한 집단의 학업적 자기효능감 점수가 유의하게 높았다.",
        ),
      ],
    });
    expect(out).toHaveLength(2);
    expect(out[0].covered).toBe(true);
    expect(out[1].covered).toBe(false);
  });

  it("의문문이 없으면 빈 배열", () => {
    expect(questionCoverage({ intro: [sec("연구의 필요성", "필요성 서술.")] })).toHaveLength(0);
  });
});
