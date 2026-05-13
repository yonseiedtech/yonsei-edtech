/**
 * 논문 리뷰 프롬프트 빌더 (Sprint 70 — Research Review Agent PoC)
 *
 * Gemini 2.5 Flash 에게 abstract 만 입력해 구조화된 한국어 리뷰 생성.
 *
 * Hallucination 안전장치:
 * - "abstract 에 명시되지 않은 결과 추측 금지" 강제
 * - "본문 인용 금지, 표·그림 인용 금지" 강제
 * - 출력은 항상 "교육공학적 시사점 + 한계" 포함
 * - 인용은 abstract 출처만, 외부 자료 추가 금지
 */

import type { ResearchPaper } from "./research-paper-source";

export interface ReviewDraft {
  /** 한국어 제목 (논문 제목의 자연 번역) */
  koreanTitle: string;
  /** 운영진 검토용 마크다운 본문 */
  bodyMarkdown: string;
  /** 모델이 추정한 핵심 키워드 (개념 태그) */
  keywords: string[];
}

const SYSTEM_PROMPT = [
  "당신은 한국교육공학회 연구 리뷰 보조 작성자입니다.",
  "역할: 영문 학술 논문 abstract 만 읽고, 한국어 독자(대학원생·신진 연구자)를 위한 ",
  "      300~500자 요약·시사점 리뷰를 작성합니다.",
  "",
  "[엄격한 규칙]",
  "1. abstract 에 **명시된 내용만** 사용. 본인이 알고 있는 추가 사실 인용 금지.",
  "2. 수치·통계·연구결과는 abstract 에 적힌 그대로만 인용. 없는 결과는 추측 금지.",
  "3. abstract 본문을 그대로 베끼지 말고 한국어로 의역.",
  "4. 본문/표/그림/저자 사적 발언 인용 금지.",
  "5. 다른 논문·이론 인용은 abstract 내 등장한 것만 허용. 새 인용 추가 금지.",
  "6. 출력 형식 엄수 — JSON.",
  "7. 한국어 학술체 (반말·구어체 금지, '하다·이다' 종결).",
  "",
  "[출력 직전 5-차원 자체 검수 — 반드시 수행]",
  "JSON 을 출력하기 직전, 본인이 작성한 bodyMarkdown 을 다음 5 차원으로 자체 검수하고 위반 시 즉시 수정한 후 출력하세요.",
  "1. 충실도(Faithfulness): bodyMarkdown 의 모든 사실 진술이 abstract/TLDR 에 명시적 근거가 있는가? 추론·확장이 있다면 abstract 표현으로 되돌리기.",
  "2. 인용 진실성(Citation Integrity): abstract 안에 등장하지 않은 저자·연도·논문·이론 명을 새로 도입하지 않았는가? 도입했다면 삭제.",
  "3. 환각 점검(Hallucination Check): abstract 에 없는 구체 수치(N=, %, p<.05 등), 표본, 효과크기를 만들지 않았는가? 발견 즉시 삭제.",
  "4. 어조 일관성(Tone Consistency): 전 문장이 학술체 '하다·이다' 종결인가? 반말·구어체·감정 표현이 있다면 학술체로 교정.",
  "5. 구조 완결성(Structure): 4개 H2 섹션(연구 질문/방법/핵심 결과/교육공학적 시사점·한계) 이 모두 존재하고 각 2~4문장인가? 누락 시 보강, 초과 시 압축.",
  "",
  "검수 통과한 후에만 JSON 출력. 자체 검수 메모는 출력하지 말 것 — 최종 JSON 만.",
].join("\n");

const USER_TEMPLATE = (paper: ResearchPaper, abstract: string) => [
  "[입력 논문 메타데이터]",
  `제목: ${paper.title}`,
  `저자: ${paper.authors.slice(0, 6).join(", ")}${paper.authors.length > 6 ? " 외" : ""}`,
  `학술지: ${paper.venue ?? "(미상)"}`,
  `연도: ${paper.year}`,
  `DOI: ${paper.doi ?? "(미상)"}`,
  paper.tldr ? `TLDR(공식 요약): ${paper.tldr}` : "",
  "",
  "[Abstract]",
  abstract,
  "",
  "[작성 지시]",
  "위 abstract 와 TLDR(있을 때) 만을 근거로 다음 JSON 을 작성하세요.",
  "",
  "{",
  '  "koreanTitle": "논문 제목의 한국어 의역 (60자 이내)",',
  '  "keywords": ["키워드1", "키워드2", ... 5개 이내 — abstract 안에 등장한 개념만],',
  '  "bodyMarkdown": "다음 4개 H2 섹션 마크다운 — ## 연구 질문 / ## 방법 / ## 핵심 결과 / ## 교육공학적 시사점·한계"',
  "}",
  "",
  "각 섹션은 2~4문장. 한국어 학술체. abstract 에 없는 내용은 절대 포함하지 마세요.",
  "마크다운 안에는 본인이 다른 논문을 인용하지 마세요.",
].filter(Boolean).join("\n");

export function buildResearchReviewMessages(
  paper: ResearchPaper,
  abstract: string,
): { system: string; prompt: string } {
  return {
    system: SYSTEM_PROMPT,
    prompt: USER_TEMPLATE(paper, abstract),
  };
}

/**
 * Gemini 응답 텍스트에서 JSON 블록 안전 파싱.
 * 모델이 ```json ... ``` 으로 감싸도 동작.
 */
export function parseReviewJson(rawText: string): ReviewDraft | null {
  const cleaned = rawText.trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  try {
    const j = JSON.parse(cleaned) as Partial<ReviewDraft>;
    if (!j.koreanTitle || !j.bodyMarkdown) return null;
    return {
      koreanTitle: j.koreanTitle,
      bodyMarkdown: j.bodyMarkdown,
      keywords: Array.isArray(j.keywords) ? j.keywords.slice(0, 5) : [],
    };
  } catch {
    return null;
  }
}

/** AI 작성 명시 푸터 + 원문 링크 + 출처 검증 상태 */
export function appendReviewFooter(
  body: string,
  paper: ResearchPaper,
  verified: boolean,
): string {
  const meta = [
    `> 원문: [${paper.title}](${paper.url ?? `https://doi.org/${paper.doi ?? ""}`})`,
    `> 저자: ${paper.authors.slice(0, 4).join(", ")}${paper.authors.length > 4 ? " 외" : ""} (${paper.year})`,
    `> 출처: ${paper.venue ?? "(미상)"} · DOI: ${paper.doi ?? "(없음)"}`,
    `> CrossRef DOI 검증: ${verified ? "통과 ✓" : "보류 ⚠"}`,
  ].join("\n");
  const footer = [
    "---",
    "",
    "본 게시물은 AI 에이전트가 abstract 만 읽고 작성한 리뷰입니다. 운영진의 검토를 거쳐 게시되며, 본문의 해석이 원문과 다를 수 있습니다. 정확한 내용은 반드시 원문 abstract 와 본문을 직접 참고해 주세요.",
    "",
    "잘못된 정보를 발견하시면 [문의 게시판](/contact)으로 알려주세요.",
  ].join("\n");
  return [meta, "", body, "", footer].join("\n");
}
