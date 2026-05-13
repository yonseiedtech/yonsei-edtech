#!/usr/bin/env node
/**
 * Research Review Agent PoC (Sprint 70)
 *
 * 동작:
 * 1. OpenAlex 에서 최근 90일 신뢰 학술지 EdTech 논문 N건 검색
 * 2. CrossRef 로 DOI 진위 검증
 * 3. Semantic Scholar 로 abstract/TLDR 보강 (선택)
 * 4. Gemini 2.5 Flash 로 한국어 구조화 리뷰 생성
 * 5. docs/poc/research-review-<DOI>.md 로 저장
 *
 * 의도적으로 standalone — Firestore/DB 쓰기 없음. PoC 단계 안전.
 * 실행: node scripts/poc-research-review.mjs --limit 2
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// .env.local 로딩 (간단 파서)
function loadEnv() {
  const envPath = resolve(ROOT, ".env.local");
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = val;
  }
}
loadEnv();

const GEMINI_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
if (!GEMINI_KEY && !OPENAI_KEY) {
  console.error("❌ GOOGLE_GENERATIVE_AI_API_KEY 또는 OPENAI_API_KEY 중 하나 필요.");
  process.exit(1);
}
// CLI 플래그로 강제 선택 가능: --provider openai|gemini
const providerIdx = process.argv.indexOf("--provider");
const FORCED_PROVIDER = providerIdx >= 0 ? process.argv[providerIdx + 1] : null;

// CLI 파싱
const args = process.argv.slice(2);
const limitIdx = args.indexOf("--limit");
const LIMIT = limitIdx >= 0 ? Math.max(1, parseInt(args[limitIdx + 1] ?? "2", 10)) : 2;
const fromDaysIdx = args.indexOf("--days");
const FROM_DAYS = fromDaysIdx >= 0 ? parseInt(args[fromDaysIdx + 1] ?? "90", 10) : 90;

console.log(`[poc] 최근 ${FROM_DAYS}일 / 최대 ${LIMIT}건 리뷰 생성 시작`);

// ─────────────────────────────────────────────────────────────
// 1. OpenAlex 검색
// ─────────────────────────────────────────────────────────────
const TRUSTED_ISSN = [
  "0007-1013", // BJET
  "0360-1315", // Computers & Education
  "1042-1629", // ETR&D
  "1747-938X", // Educational Research Review
  "0747-5632", // Computers in Human Behavior
  "1096-7516", // The Internet and Higher Education
].join("|");
const EDTECH_CONCEPT = "C16443162"; // OpenAlex "Educational technology" (level 2, 230k+ works)

function reconstructAbstract(inverted) {
  if (!inverted) return undefined;
  const positions = [];
  for (const [word, idxs] of Object.entries(inverted)) {
    for (const i of idxs) positions.push([i, word]);
  }
  positions.sort((a, b) => a[0] - b[0]);
  return positions.map(([, w]) => w).join(" ");
}

async function searchOpenAlex() {
  const since = new Date(Date.now() - FROM_DAYS * 86400000).toISOString().slice(0, 10);
  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set("filter", [
    `from_publication_date:${since}`,
    `concepts.id:${EDTECH_CONCEPT}`,
    `primary_location.source.issn:${TRUSTED_ISSN}`,
    "has_abstract:true",
    "has_doi:true",
    "language:en",
  ].join(","));
  url.searchParams.set("per_page", String(LIMIT * 2));
  url.searchParams.set("sort", "publication_date:desc");
  url.searchParams.set("mailto", "yonsei.edtech@gmail.com");
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "yonsei-edtech-bot/1.0" },
  });
  if (!res.ok) throw new Error(`OpenAlex ${res.status}`);
  const j = await res.json();
  return (j.results ?? []).map((w) => ({
    id: w.id,
    doi: w.doi?.replace(/^https?:\/\/(dx\.)?doi\.org\//i, ""),
    title: w.title ?? "(제목 없음)",
    abstract: reconstructAbstract(w.abstract_inverted_index),
    authors: (w.authorships ?? []).map((a) => a.author?.display_name).filter(Boolean),
    year: w.publication_year ?? 0,
    venue: w.primary_location?.source?.display_name,
    url: w.primary_location?.landing_page_url,
  }));
}

// ─────────────────────────────────────────────────────────────
// 2. CrossRef DOI 검증
// ─────────────────────────────────────────────────────────────
async function verifyDoi(doi) {
  if (!doi) return false;
  try {
    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: {
        "User-Agent": "yonsei-edtech-bot/1.0 (mailto:yonsei.edtech@gmail.com)",
        Accept: "application/json",
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// 3. Semantic Scholar TLDR 보강 (선택)
// ─────────────────────────────────────────────────────────────
async function enrichSS(doi) {
  if (!doi) return {};
  try {
    const res = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(doi)}?fields=abstract,tldr`,
      { headers: { "User-Agent": "yonsei-edtech-bot/1.0" } },
    );
    if (!res.ok) return {};
    const j = await res.json();
    return { abstract: j.abstract, tldr: j.tldr?.text };
  } catch {
    return {};
  }
}

// ─────────────────────────────────────────────────────────────
// 4. Gemini 리뷰 생성
// ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = [
  "당신은 한국교육공학회 연구 리뷰 보조 작성자입니다.",
  "역할: 영문 학술 논문 abstract 만 읽고, 한국어 독자(대학원생·신진 연구자)를 위한 300~500자 요약·시사점 리뷰를 작성합니다.",
  "",
  "[엄격한 규칙]",
  "1. abstract 에 명시된 내용만 사용. 본인이 알고 있는 추가 사실 인용 금지.",
  "2. 수치·통계·연구결과는 abstract 에 적힌 그대로만 인용. 없는 결과는 추측 금지.",
  "3. abstract 본문을 그대로 베끼지 말고 한국어로 의역.",
  "4. 본문/표/그림/저자 사적 발언 인용 금지.",
  "5. 다른 논문·이론 인용은 abstract 내 등장한 것만 허용. 새 인용 추가 금지.",
  "6. 출력은 JSON 만, 다른 텍스트 금지.",
  "7. 한국어 학술체 (반말·구어체 금지, '하다·이다' 종결).",
].join("\n");

function buildUserPrompt(paper, abstract) {
  return [
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
    "[작성 지시] — 다음 JSON 객체만 출력하세요. 마크다운 fence 없이.",
    "{",
    '  "koreanTitle": "논문 제목의 한국어 의역 (60자 이내)",',
    '  "keywords": ["키워드1", "키워드2", "..." ],',
    '  "bodyMarkdown": "## 연구 질문\\n...\\n\\n## 방법\\n...\\n\\n## 핵심 결과\\n...\\n\\n## 교육공학적 시사점·한계\\n..."',
    "}",
    "",
    "각 섹션은 2~4문장. 한국어 학술체. abstract 에 없는 내용은 절대 포함하지 마세요.",
  ].filter(Boolean).join("\n");
}

async function callGemini(paper, abstract) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: buildUserPrompt(paper, abstract) }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 1200,
      responseMimeType: "application/json",
    },
  };
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${errText.slice(0, 200)}`);
  }
  const j = await res.json();
  const text = j.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return { text, provider: "gemini-2.5-flash" };
}

async function callOpenAI(paper, abstract) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(paper, abstract) },
      ],
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${errText.slice(0, 200)}`);
  }
  const j = await res.json();
  const text = j.choices?.[0]?.message?.content ?? "";
  return { text, provider: "gpt-4o-mini" };
}

async function generateReview(paper, abstract) {
  // 강제 지정 우선
  if (FORCED_PROVIDER === "openai") return callOpenAI(paper, abstract);
  if (FORCED_PROVIDER === "gemini") return callGemini(paper, abstract);
  // 자동 — Gemini 우선, 429/spending cap 만나면 OpenAI fallback
  if (GEMINI_KEY) {
    try {
      return await callGemini(paper, abstract);
    } catch (e) {
      const msg = e.message ?? "";
      const shouldFallback = msg.includes("429") || msg.includes("spending cap") || msg.includes("quota");
      if (!shouldFallback || !OPENAI_KEY) throw e;
      console.log("[poc]     ↪ Gemini 한도 초과 — OpenAI 로 자동 fallback");
      return await callOpenAI(paper, abstract);
    }
  }
  return callOpenAI(paper, abstract);
}

function parseReview(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    const j = JSON.parse(cleaned);
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

// ─────────────────────────────────────────────────────────────
// 메인 파이프라인
// ─────────────────────────────────────────────────────────────
async function main() {
  console.log("[poc] 1/5 OpenAlex 검색…");
  const candidates = await searchOpenAlex();
  console.log(`[poc]   → ${candidates.length}건 후보`);

  if (candidates.length === 0) {
    console.error("❌ 후보 논문 0건 — 검색 기간을 늘려보세요 (--days 180)");
    process.exit(1);
  }

  const outDir = resolve(ROOT, "docs/poc");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  let success = 0;
  for (const paper of candidates) {
    if (success >= LIMIT) break;
    console.log(`\n[poc] 처리 중: ${paper.title.slice(0, 70)}…`);

    console.log("[poc]   2/5 CrossRef DOI 검증");
    const doiOk = await verifyDoi(paper.doi);
    if (!doiOk) {
      console.log("[poc]     ✗ DOI 검증 실패 — 스킵");
      continue;
    }

    console.log("[poc]   3/5 Semantic Scholar TLDR 보강");
    const ss = await enrichSS(paper.doi);
    if (ss.abstract) paper.abstract = ss.abstract;
    if (ss.tldr) paper.tldr = ss.tldr;

    if (!paper.abstract || paper.abstract.length < 200) {
      console.log("[poc]     ✗ abstract 부족 — 스킵");
      continue;
    }

    console.log("[poc]   4/5 LLM 리뷰 생성");
    let llmResult;
    try {
      llmResult = await generateReview(paper, paper.abstract);
    } catch (e) {
      console.log(`[poc]     ✗ LLM 실패: ${e.message}`);
      continue;
    }
    const review = parseReview(llmResult.text);
    if (!review) {
      console.log("[poc]     ✗ JSON 파싱 실패");
      continue;
    }
    review._provider = llmResult.provider;

    console.log("[poc]   5/5 결과 저장");
    const safeName = (paper.doi ?? paper.id).replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 80);
    const outPath = resolve(outDir, `research-review-${safeName}.md`);
    const fileContent = [
      `# ${review.koreanTitle}`,
      "",
      `> 카테고리: 자료실 / AI 논문 리뷰 (PoC)`,
      `> 생성: ${new Date().toISOString().slice(0, 10)}`,
      `> 원문: [${paper.title}](${paper.url ?? `https://doi.org/${paper.doi}`})`,
      `> 저자: ${paper.authors.slice(0, 4).join(", ")}${paper.authors.length > 4 ? " 외" : ""} (${paper.year})`,
      `> 출처: ${paper.venue} · DOI: ${paper.doi}`,
      `> CrossRef DOI 검증: 통과 ✓`,
      `> 키워드: ${review.keywords.join(" · ")}`,
      `> 모델: ${review._provider}`,
      "",
      "---",
      "",
      review.bodyMarkdown,
      "",
      "---",
      "",
      "본 게시물은 AI 에이전트가 abstract 만 읽고 작성한 리뷰입니다. 운영진의 검토를 거쳐 게시되며, 본문의 해석이 원문과 다를 수 있습니다. 정확한 내용은 반드시 원문 abstract 와 본문을 직접 참고해 주세요.",
      "",
      "잘못된 정보를 발견하시면 [문의 게시판](/contact)으로 알려주세요.",
      "",
    ].join("\n");
    writeFileSync(outPath, fileContent, "utf8");
    console.log(`[poc]     ✓ ${outPath}`);
    success++;
  }

  console.log(`\n[poc] 완료 — ${success}건 생성 (docs/poc/)`);
}

main().catch((e) => {
  console.error("❌ 실패:", e.message);
  process.exit(1);
});
