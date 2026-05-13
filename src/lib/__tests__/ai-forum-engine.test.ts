import { describe, it, expect } from "vitest";
import { buildSystemPrompt, MAX_FORUM_COST_USD, MAX_OUTPUT_TOKENS, PRIOR_MESSAGES_CONTEXT } from "../ai-forum-engine";
import { AI_PERSONAS, type AIPersonaKey } from "@/types/ai-forum";

/**
 * ForumDoc 은 ai-forum-engine 내부 interface — 테스트에서는 minimal shape 로 cast.
 * buildSystemPrompt 는 title + seedPrompt 만 참조.
 */
const mockTopic = {
  id: "f1",
  title: "AI 시대 평가 패러다임 전환",
  seedPrompt: "생성형 AI 의 보급으로 객관식·서술형 평가의 신뢰성이 흔들린다. 새 평가 패러다임은?",
  participants: ["edtech_theorist", "learning_scientist"] as AIPersonaKey[],
  currentRound: 1,
  maxRounds: 3,
  status: "in_progress",
  approved: true,
} as Parameters<typeof buildSystemPrompt>[1];

describe("buildSystemPrompt — 기본 구조", () => {
  it("페르소나 이름·역할 포함", () => {
    const prompt = buildSystemPrompt("edtech_theorist", mockTopic);
    const persona = AI_PERSONAS.edtech_theorist;
    expect(prompt).toContain(persona.name);
    expect(prompt).toContain(persona.description);
  });

  it("토론 주제 + seedPrompt 포함", () => {
    const prompt = buildSystemPrompt("edtech_theorist", mockTopic);
    expect(prompt).toContain(mockTopic.title);
    expect(prompt).toContain(mockTopic.seedPrompt);
  });

  it("발언 분량(200~400자) 규칙 포함", () => {
    const prompt = buildSystemPrompt("edtech_theorist", mockTopic);
    expect(prompt).toContain("200~400자");
  });

  it("한국어 답변 규칙 포함", () => {
    const prompt = buildSystemPrompt("edtech_theorist", mockTopic);
    expect(prompt).toContain("한국어");
  });
});

describe("buildSystemPrompt — Sprint 70 안전장치 (가짜 인용 방지)", () => {
  it("well-established 개념 화이트리스트 명시", () => {
    const prompt = buildSystemPrompt("learning_scientist", mockTopic);
    expect(prompt).toContain("well-established");
    expect(prompt).toMatch(/Bloom|Kolb|ARCS/);
  });

  it("구체 저자·연도·논문 제목 생성 금지 명시", () => {
    const prompt = buildSystemPrompt("learning_scientist", mockTopic);
    expect(prompt).toContain("절대 금지");
    expect(prompt).toMatch(/저자|연도|논문/);
  });

  it("불확실 시 대체 표현 패턴 안내", () => {
    const prompt = buildSystemPrompt("policy_analyst", mockTopic);
    expect(prompt).toContain("일반적으로");
  });
});

describe("buildSystemPrompt — Sprint 70 자체 검수 (3 차원)", () => {
  it("검수 섹션 헤더 포함", () => {
    const prompt = buildSystemPrompt("critical_reviewer", mockTopic);
    expect(prompt).toContain("3 차원");
    expect(prompt).toContain("자체 검수");
  });

  it("3 차원 모두 명시 (인용 진실성·페르소나 일관성·어조)", () => {
    const prompt = buildSystemPrompt("edtech_theorist", mockTopic);
    expect(prompt).toContain("인용 진실성");
    expect(prompt).toContain("페르소나 일관성");
    expect(prompt).toContain("어조");
  });

  it("검수 메모 미출력 명시 (최종 발언만 출력)", () => {
    const prompt = buildSystemPrompt("edtech_theorist", mockTopic);
    expect(prompt).toMatch(/미출력|메모.*출력|출력하지/);
  });
});

describe("buildSystemPrompt — 페르소나 6종 모두 동작", () => {
  const PERSONAS: AIPersonaKey[] = [
    "edtech_theorist",
    "learning_scientist",
    "teacher_practitioner",
    "student_voice",
    "policy_analyst",
    "critical_reviewer",
  ];

  it.each(PERSONAS)("'%s' — 정상 생성 + 페르소나 이름 포함", (key) => {
    const prompt = buildSystemPrompt(key, mockTopic);
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(200);
    expect(prompt).toContain(AI_PERSONAS[key].name);
  });
});

describe("ai-forum-engine 상수", () => {
  it("MAX_FORUM_COST_USD 양수", () => {
    expect(MAX_FORUM_COST_USD).toBeGreaterThan(0);
  });

  it("MAX_OUTPUT_TOKENS 양수 (모델 응답 한도)", () => {
    expect(MAX_OUTPUT_TOKENS).toBeGreaterThan(0);
    expect(MAX_OUTPUT_TOKENS).toBeLessThanOrEqual(2000); // 합리적 상한
  });

  it("PRIOR_MESSAGES_CONTEXT 양수 (이전 발언 컨텍스트 개수)", () => {
    expect(PRIOR_MESSAGES_CONTEXT).toBeGreaterThan(0);
    expect(PRIOR_MESSAGES_CONTEXT).toBeLessThanOrEqual(20);
  });
});
