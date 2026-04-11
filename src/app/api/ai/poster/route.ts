import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { GoogleGenAI } from "@google/genai";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";

export const maxDuration = 60;

const SIZES: Record<string, { width: number; height: number; label: string }> = {
  instagram: { width: 1080, height: 1350, label: "인스타그램 세로" },
  square: { width: 1080, height: 1080, label: "정사각형" },
  a4: { width: 2480, height: 3508, label: "A4" },
};

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req, "staff");
  if (authResult instanceof Response) return authResult;
  const user = authResult;

  const rateLimited = checkRateLimit(getClientId(req, user.id), {
    limit: 10,
    windowSec: 60,
  });
  if (rateLimited) return rateLimited;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let seminar: any, size: string;
  try {
    const body = await req.json();
    seminar = body.seminar;
    size = body.size ?? "instagram";
  } catch {
    return Response.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  if (!seminar?.title) {
    return Response.json({ error: "세미나 정보가 필요합니다." }, { status: 400 });
  }

  // 입력 길이 제한 (M1)
  seminar.title = String(seminar.title || "").slice(0, 500);
  seminar.description = String(seminar.description || "").slice(0, 2000);
  seminar.speaker = String(seminar.speaker || "").slice(0, 200);
  seminar.speakerBio = String(seminar.speakerBio || "").slice(0, 1000);

  const sizeInfo = SIZES[size] || SIZES.instagram;

  const dateStr = seminar.date
    ? new Date(seminar.date).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : seminar.date;

  const speakerInfo = [
    seminar.speaker,
    seminar.speakerPosition ? `(${seminar.speakerPosition})` : "",
    seminar.speakerAffiliation || "",
  ]
    .filter(Boolean)
    .join(" ");

  const prompt = `Create an academic seminar poster with these specifications:

SIZE: ${sizeInfo.width}x${sizeInfo.height} pixels (${sizeInfo.label})

DESIGN REQUIREMENTS:
- Clean, modern academic design
- Primary color: Yonsei University blue (#003876) with white and light gray accents
- Professional typography hierarchy
- Minimalist layout with generous whitespace

CONTENT TO INCLUDE (in Korean):
- Title: 연세교육공학회 세미나
- Topic: ${seminar.title}
- Date: ${dateStr} ${seminar.time || ""}
- Location: ${seminar.location || ""}
- Speaker: ${speakerInfo}
- Bottom text: 연세교육공학회 | yonsei.edtech@gmail.com

STYLE:
- Geometric or abstract academic background elements
- No photographic elements, use vector/graphic style
- Clear text hierarchy: organization name → seminar topic → details
- The text must be clearly readable
- Include a subtle decorative element related to education technology`;

  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "API 키가 설정되지 않았습니다." }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-preview-image-generation",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseModalities: ["IMAGE", "TEXT"],
      },
    });

    // Extract image from response
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      return Response.json({ error: "이미지 생성 실패: 응답이 비어있습니다." }, { status: 500 });
    }

    for (const part of parts) {
      if (part.inlineData) {
        const { data, mimeType } = part.inlineData;
        return Response.json({
          imageUrl: `data:${mimeType};base64,${data}`,
          mimeType,
        });
      }
    }

    return Response.json({ error: "이미지가 생성되지 않았습니다. 다시 시도해주세요." }, { status: 500 });
  } catch (err) {
    console.error("[poster] AI error:", err);
    const msg = err instanceof Error ? err.message : "AI 포스터 생성 실패";
    if (msg.includes("quota") || msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
      return Response.json({ error: "AI API 할당량이 초과되었습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
    }
    return Response.json({ error: "AI 포스터 생성에 실패했습니다. 다시 시도해주세요." }, { status: 500 });
  }
}
