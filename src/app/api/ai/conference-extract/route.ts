import { NextRequest } from "next/server";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { requireAuth } from "@/lib/api-auth";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";

export const maxDuration = 60;

const CATEGORY_VALUES = [
  "keynote",
  "symposium",
  "panel",
  "paper",
  "poster",
  "media",
  "workshop",
  "networking",
  "ceremony",
  "break",
  "other",
] as const;

const SessionSchema = z.object({
  startTime: z.string().describe("HH:MM 24h"),
  endTime: z.string().describe("HH:MM 24h"),
  track: z.string().optional().describe("트랙·룸 (예: 포스터 세션B, 본관 201호)"),
  category: z.enum(CATEGORY_VALUES),
  title: z.string(),
  speakers: z.array(z.string()).optional(),
  affiliation: z.string().optional(),
  location: z.string().optional(),
  abstract: z.string().optional(),
});

const DaySchema = z.object({
  date: z.string().describe("YYYY-MM-DD"),
  dayLabel: z.string().optional().describe("예: 1일차"),
  sessions: z.array(SessionSchema),
});

const ResultSchema = z.object({
  title: z.string().optional(),
  notes: z.string().optional(),
  days: z.array(DaySchema),
});

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req, "staff");
  if (authResult instanceof Response) return authResult;
  const user = authResult;

  const rateLimited = checkRateLimit(getClientId(req, user.id), {
    limit: 10,
    windowSec: 60,
  });
  if (rateLimited) return rateLimited;

  let imageData: string;
  let mimeType: string;
  let hint: string | undefined;
  try {
    const body = await req.json();
    imageData = String(body.imageData ?? "");
    mimeType = String(body.mimeType ?? "image/png");
    hint = body.hint ? String(body.hint).slice(0, 1000) : undefined;
  } catch {
    return Response.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  if (!imageData) {
    return Response.json(
      { error: "이미지 데이터가 필요합니다." },
      { status: 400 },
    );
  }

  // base64 데이터 URL prefix 제거
  const base64 = imageData.replace(/^data:[^;]+;base64,/, "");
  if (base64.length > 12 * 1024 * 1024) {
    return Response.json(
      { error: "이미지가 너무 큽니다. (최대 9MB) — 분할해서 업로드하거나 해상도를 낮춰주세요." },
      { status: 413 },
    );
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "AI API 키가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  const isPdf = mimeType === "application/pdf";
  const buffer = Buffer.from(base64, "base64");

  const google = createGoogleGenerativeAI({ apiKey });

  const promptText = [
    "이미지/PDF는 학술대회·세미나 프로그램(시간표) 자료입니다.",
    "JSON 스키마에 맞춰 일자(days)·세션(sessions)을 추출하세요.",
    "",
    "추출 규칙:",
    "- date는 YYYY-MM-DD (연도가 누락되면 현재 또는 자료에 명시된 연도 사용).",
    "- startTime/endTime은 24시간제 HH:MM. 단일 시각만 보이면 endTime을 startTime과 같게.",
    "- category는 다음 중 하나: keynote(기조), symposium(심포지엄), panel(패널), paper(논문발표), poster(포스터), media(미디어전·전시·작품), workshop(워크숍), networking(네트워킹), ceremony(개·폐회식), break(휴식·식사), other.",
    "- track은 트랙명·세션명·룸명을 명시 (예: '포스터 세션B', '본관 201호', 'Track A').",
    "- speakers는 발표자명 배열 (소속은 affiliation에 별도). 콤마/슬래시로 구분된 사람들 분리.",
    "- 포스터의 경우 번호가 있으면 title 앞에 '[N]' 유지하고, 각 포스터를 개별 sessions entry 로 분리하세요. (24개 포스터면 24개 entry)",
    "- 동일 시간대 여러 트랙이면 각 세션을 별도 entry로.",
    "- 한국어가 흐릿하더라도 최선을 다해 추측하세요. 모르는 글자는 '?' 로 표시.",
    hint ? `\n추가 힌트:\n${hint}` : "",
  ].join("\n");

  // Sprint 67: 모델 fallback — flash 실패 시 pro 로 재시도 (포스터 24개 같은 대용량 이미지)
  const models = ["gemini-2.5-flash", "gemini-2.5-pro"] as const;
  let lastError: unknown = null;

  for (const modelName of models) {
    try {
      const { object } = await generateObject({
        model: google(modelName),
        schema: ResultSchema,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: promptText },
              isPdf
                ? { type: "file", data: buffer, mediaType: "application/pdf" }
                : { type: "image", image: buffer },
            ],
          },
        ],
      });
      console.log(
        `[conference-extract] success with ${modelName}: ${object.days?.length ?? 0} days, ${
          object.days?.reduce((n, d) => n + (d.sessions?.length ?? 0), 0) ?? 0
        } sessions`,
      );
      return Response.json(object);
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[conference-extract] ${modelName} failed:`, msg);
      // 할당량 초과는 즉시 종료 (다른 모델도 같은 키 사용)
      if (
        msg.includes("quota") ||
        msg.includes("429") ||
        msg.includes("RESOURCE_EXHAUSTED")
      ) {
        return Response.json(
          { error: "AI API 할당량 초과. 잠시 후 다시 시도해주세요." },
          { status: 429 },
        );
      }
      // schema 실패·timeout 은 다음 모델로 재시도
    }
  }

  // Sprint 67-B: 모든 schema 모드 실패 시 freeform JSON 텍스트 fallback
  // (gemini schema 모드는 24+ entry 시 timeout/parse 실패 빈발 — text mode 가 안정적)
  console.log("[conference-extract] schema mode failed, trying freeform JSON text mode (gemini-2.5-pro)");
  try {
    const freeformPrompt = [
      promptText,
      "",
      "출력 형식: 순수 JSON 만. 마크다운 코드블록(```) 사용 금지. 추가 설명 금지.",
      "구조:",
      `{"title":"학술대회명","notes":"비고","days":[{"date":"YYYY-MM-DD","dayLabel":"1일차","sessions":[{"startTime":"HH:MM","endTime":"HH:MM","track":"트랙","category":"poster","title":"...","speakers":["..."],"affiliation":"...","location":"...","abstract":"..."}]}]}`,
      "category 허용값: keynote|symposium|panel|paper|poster|media|workshop|networking|ceremony|break|other",
    ].join("\n");
    const { text } = await generateText({
      model: google("gemini-2.5-pro"),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: freeformPrompt },
            isPdf
              ? { type: "file", data: buffer, mediaType: "application/pdf" }
              : { type: "image", image: buffer },
          ],
        },
      ],
    });
    // 코드블록 제거 시도
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();
    // 첫 { ~ 마지막 } 만 추출 (전후 잡담 컷)
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    const jsonStr =
      firstBrace >= 0 && lastBrace > firstBrace
        ? cleaned.slice(firstBrace, lastBrace + 1)
        : cleaned;
    const parsed = JSON.parse(jsonStr);
    const validated = ResultSchema.parse(parsed);
    console.log(
      `[conference-extract] freeform fallback success: ${validated.days?.length ?? 0} days, ${
        validated.days?.reduce((n, d) => n + (d.sessions?.length ?? 0), 0) ?? 0
      } sessions`,
    );
    return Response.json(validated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[conference-extract] freeform fallback also failed:", msg);
    lastError = err;
  }

  // 모든 모델/모드 실패
  const msg = lastError instanceof Error ? lastError.message : String(lastError);
  return Response.json(
    {
      error:
        "AI 추출 실패 — 모든 모델·모드 시도 실패. 다음 중 하나를 시도해보세요:\n" +
        "  1) 이미지를 분할 (포스터 12개씩 잘라서 2번 추출)\n" +
        "  2) 이미지 해상도를 낮춰서 (예: 1920px 너비) 재업로드\n" +
        "  3) 'AI 추출' 대신 '수동 추가' 버튼으로 직접 입력\n" +
        "  4) 동일 이미지로 1~2분 후 재시도 (일시적 모델 부하)",
      detail: msg.slice(0, 300),
    },
    { status: 500 },
  );
}
