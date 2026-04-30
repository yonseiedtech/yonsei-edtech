import { NextRequest } from "next/server";
import { generateObject } from "ai";
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
  if (base64.length > 8 * 1024 * 1024) {
    return Response.json(
      { error: "이미지가 너무 큽니다. (최대 6MB)" },
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

  try {
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
      "- 포스터의 경우 번호가 있으면 title 앞에 '[N]' 유지.",
      "- 동일 시간대 여러 트랙이면 각 세션을 별도 entry로.",
      hint ? `\n추가 힌트:\n${hint}` : "",
    ].join("\n");

    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
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

    return Response.json(object);
  } catch (err) {
    console.error("[conference-extract] AI error:", err);
    const msg = err instanceof Error ? err.message : "AI 추출 실패";
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
    return Response.json(
      { error: "AI 추출에 실패했습니다. 이미지를 더 선명하게 또는 다른 페이지로 다시 시도해주세요." },
      { status: 500 },
    );
  }
}
