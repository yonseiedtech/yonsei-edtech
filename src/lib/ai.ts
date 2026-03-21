import { createGoogleGenerativeAI } from "@ai-sdk/google";

// Gemini — 빠르고 저렴하며 한국어 품질 우수
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

/** 용도별 모델 매핑 (현재 Gemini 단일 프로바이더) */
export const models = {
  /** 빠른 응답 — 문의답변, 교정 등 */
  fast: google("gemini-2.5-flash"),
  /** 고품질 — 보도자료, 학회보 등 */
  quality: google("gemini-2.5-flash"),
} as const;
