import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";

// Gemini — 빠르고 저렴하며 한국어 품질 우수
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

// OpenAI — 보도자료/SNS/이메일/카카오톡 콘텐츠 생성용
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * 용도별 모델 매핑.
 *
 * ⚠️ Sprint 70: Gemini API 가 monthly spending cap 초과 상태 → fast 를 OpenAI gpt-4o-mini
 * 로 임시 전환. Gemini cap 조정(https://ai.studio/spend) 후 `google("gemini-2.5-flash")`
 * 로 되돌릴 수 있음. gpt-4o-mini 도 빠르고 저렴하여 fast 용도에 적합.
 */
export const models = {
  /** 빠른 응답 — 문의답변, 교정, 에이전트/워크플로우 등 (Gemini cap 초과로 OpenAI 전환) */
  fast: openai("gpt-4o-mini"),
  /** 고품질 — 보도자료, SNS, 이메일 등 콘텐츠 생성 */
  quality: openai("gpt-4o-mini"),
} as const;

// Gemini cap 복구 시 사용할 원본 fast 모델 (참고용 — 위 fast 를 이것으로 교체)
export const _geminiFastModel = google("gemini-2.5-flash");
