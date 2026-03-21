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

/** 용도별 모델 매핑 */
export const models = {
  /** 빠른 응답 — 문의답변, 교정 등 */
  fast: google("gemini-2.5-flash"),
  /** 고품질 — 보도자료, SNS, 이메일 등 콘텐츠 생성 */
  quality: openai("gpt-4o-mini"),
} as const;
