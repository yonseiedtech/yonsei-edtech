import { describe, it, expect } from "vitest";
import {
  TE_QUESTIONS,
  teNextQuestion,
  teActiveQuestions,
  teRecommend,
  teAnswersSummary,
  teFieldFromOccupation,
  teMatchTheses,
  teMatchConcepts,
  type TEAnswers,
} from "../topic-explorer/topic-explorer-logic";
import type { AlumniThesis } from "@/types";

describe("topic-explorer 인터뷰 흐름", () => {
  it("첫 질문은 현장(field)", () => {
    expect(teNextQuestion({})?.id).toBe("field");
  });

  it("현장이 없으면 현장 세부·개입·규모 질문을 건너뛴다", () => {
    const a: TEAnswers = { field: "none", interest: "ai_edtech", interestDetail: "gen_ai" };
    const ids = teActiveQuestions(a).map((q) => q.id);
    expect(ids).not.toContain("fieldDetail");
    expect(ids).not.toContain("intervention");
    expect(ids).not.toContain("scale");
    expect(teNextQuestion(a)?.id).toBe("problem");
  });

  it("현장·관심 선택 후 세부 질문이 이어진다 (2026-07-05 구체화)", () => {
    expect(teNextQuestion({ field: "school_k12" })?.id).toBe("fieldDetail");
    expect(teNextQuestion({ field: "public" })?.title).toContain("구체적으로");
    expect(
      teNextQuestion({ field: "school_k12", fieldDetail: "elementary", interest: "motivation" })?.id,
    ).toBe("interestDetail");
  });

  it("현상 이해형(understand)은 규모 질문을 건너뛴다", () => {
    const a: TEAnswers = {
      field: "school_k12", fieldDetail: "middle",
      interest: "motivation", interestDetail: "mo_selfreg",
      intervention: "survey_only", problem: "understand",
    };
    expect(teNextQuestion(a)).toBeNull();
  });

  it("모든 답 이전에는 결과가 없다", () => {
    expect(teRecommend({ field: "school_k12" })).toBeNull();
  });

  it("뒤 질문 답은 앞 질문 변경 시 무효화되는 순서로 정의되어 있다 (field 가 맨 앞)", () => {
    expect(TE_QUESTIONS[0].id).toBe("field");
  });
});

describe("topic-explorer 추천", () => {
  it("효과 검증 + 개입 가능 → 양적(준실험) 프레임 우선", () => {
    const r = teRecommend({ field: "school_k12", fieldDetail: "elementary", interest: "ai_edtech", interestDetail: "gen_ai", intervention: "can_intervene", problem: "effect", scale: "large" });
    expect(r).not.toBeNull();
    expect(r!.frames[0].approach).toBe("양적");
    expect(r!.frames[0].methodSeedKeys).toContain("research-method:quasi-experimental");
    expect(r!.caution).toBeUndefined();
  });

  it("효과 검증 + 소수 인원 → 주의 문구", () => {
    const r = teRecommend({ field: "school_k12", fieldDetail: "high", interest: "ai_edtech", interestDetail: "platform", intervention: "can_intervene", problem: "effect", scale: "small" });
    expect(r!.caution).toBeTruthy();
  });

  it("효과 검증 + 개입 불가(설문만) → 관계형 조사연구 + 인과 주의", () => {
    const r = teRecommend({ field: "corporate", fieldDetail: "corp_hrd", interest: "hrd", interestDetail: "hr_transfer", intervention: "survey_only", problem: "effect", scale: "large" });
    expect(r!.frames[0].methodSeedKeys).toContain("research-method:survey");
    expect(r!.caution).toMatch(/관계/);
  });

  it("현상 이해형 → 질적 프레임", () => {
    const r = teRecommend({ field: "university", fieldDetail: "univ_grad", interest: "interaction", interestDetail: "in_presence", intervention: "survey_only", problem: "understand" });
    expect(r!.frames[0].approach).toBe("질적");
    expect(r!.frames.some((f) => f.approach === "혼합")).toBe(true);
  });

  it("개발형 + 개입 불가 → 델파이·척도 개발 경로", () => {
    const r = teRecommend({ field: "public", fieldDetail: "military", interest: "evaluation", interestDetail: "ev_scale", intervention: "survey_only", problem: "build", scale: "unsure" });
    expect(r!.frames[0].approach).toBe("개발·설계");
    expect(r!.frames[0].methodSeedKeys).toEqual(
      expect.arrayContaining(["research-method:delphi", "research-method:scale-development"]),
    );
  });

  it("현장 없음 + 실태 파악 → 동향 분석(메타분석 경로)", () => {
    const r = teRecommend({ field: "none", interest: "ai_edtech", interestDetail: "broad_ai", problem: "status" });
    expect(r!.frames[0].methodSeedKeys).toContain("research-method:meta-analysis");
  });

  it("세부 답이 주제 문장·매칭 키워드에 반영된다", () => {
    const r = teRecommend({
      field: "public", fieldDetail: "military",
      interest: "ai_edtech", interestDetail: "gen_ai",
      intervention: "can_intervene", problem: "effect", scale: "large",
    })!;
    expect(r.frames[0].sentence).toContain("군 장병");
    expect(r.frames[0].sentence).toContain("생성형 AI");
    expect(r.subjectTerms).toContain("군인");
    expect(r.interestTerms).toContain("챗봇");
  });

  it("특수학교 선택 시 대상·매칭 라벨이 특수교육 기준으로 바뀐다", () => {
    const r = teRecommend({
      field: "school_k12", fieldDetail: "special",
      interest: "ai_edtech", interestDetail: "gen_ai",
      intervention: "can_intervene", problem: "effect", scale: "small",
    })!;
    expect(r.frames[0].sentence).toContain("특수교육 대상 학생");
    expect(r.subjectTerms).toContain("장애 학습자");
  });

  it("특수교육공학 세부 선택이 소재·키워드에 반영된다", () => {
    const r = teRecommend({
      field: "school_k12", fieldDetail: "special",
      interest: "ai_edtech", interestDetail: "assistive",
      intervention: "can_intervene", problem: "effect", scale: "small",
    })!;
    expect(r.frames[0].sentence).toContain("보조공학");
    expect(r.interestTerms).toContain("UDL");
    expect(r.interestTerms).toContain("특수교육");
  });

  it("broad 세부 선택은 상위 분야 기본값을 유지한다", () => {
    const r = teRecommend({
      field: "school_k12", fieldDetail: "middle",
      interest: "ai_edtech", interestDetail: "broad_ai",
      intervention: "survey_only", problem: "status", scale: "large",
    })!;
    expect(r.frames[0].sentence).toContain("중학생");
    expect(r.frames[0].sentence).toContain("AI·에듀테크");
  });

  it("teAnswersSummary 가 선택 라벨을 이어붙인다", () => {
    const sum = teAnswersSummary({
      field: "school_k12", fieldDetail: "elementary",
      interest: "motivation", interestDetail: "mo_selfreg",
      intervention: "can_intervene", problem: "effect", scale: "large",
    });
    expect(sum).toContain("초등학교");
    expect(sum).toContain("자기조절");
  });

  it("직업유형 → 현장 프리셀렉트 매핑", () => {
    expect(teFieldFromOccupation("teacher")).toBe("school_k12");
    expect(teFieldFromOccupation("public")).toBe("public");
    expect(teFieldFromOccupation("other")).toBeNull();
    expect(teFieldFromOccupation(undefined)).toBeNull();
  });
});

function thesis(partial: Partial<AlumniThesis>): AlumniThesis {
  return {
    id: "t1",
    graduationType: "thesis",
    awardedYearMonth: "2020-08",
    authorName: "홍길동",
    authorMappingStatus: "unmapped",
    title: "",
    keywords: [],
    source: "manual",
    hasReferenceList: false,
    hasEmbedding: false,
    createdAt: "",
    updatedAt: "",
    ...partial,
  } as AlumniThesis;
}

describe("topic-explorer 선배 논문·개념 매칭", () => {
  const result = teRecommend({ field: "school_k12", fieldDetail: "elementary", interest: "motivation", interestDetail: "mo_efficacy", intervention: "can_intervene", problem: "effect", scale: "large" })!;

  it("관심 키워드·연구대상이 겹치는 논문이 상위로 온다", () => {
    const theses = [
      thesis({ id: "a", title: "무관한 논문", keywords: ["평생교육"] }),
      thesis({
        id: "b",
        title: "자기효능감 향상 프로그램이 초등학생에 미치는 영향",
        keywords: ["자기효능감", "학습동기"],
        analysis: { subjects: ["초등학생"] },
      }),
    ];
    const m = teMatchTheses(theses, result);
    expect(m[0]?.thesis.id).toBe("b");
    expect(m.find((x) => x.thesis.id === "a")).toBeUndefined();
    expect(m[0].reasons.length).toBeGreaterThan(0);
  });

  it("개념은 이름·태그 매칭으로 걸러진다", () => {
    const concepts = [
      { id: "c1", name: "학습동기", tags: [] },
      { id: "c2", name: "인지부하", tags: [] },
      { id: "c3", name: "ARCS 모형", tags: ["동기"] },
    ];
    const m = teMatchConcepts(concepts, result);
    expect(m.map((c) => c.id)).toContain("c1");
    expect(m.map((c) => c.id)).toContain("c3");
    expect(m.map((c) => c.id)).not.toContain("c2");
  });
});
