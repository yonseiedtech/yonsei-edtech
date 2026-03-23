import { NextRequest } from "next/server";
import { streamText, type UIMessage, convertToModelMessages, stepCountIs } from "ai";
import { models } from "@/lib/ai";
import { requireAuth } from "@/lib/api-auth";
import { getToolsForRole } from "@/lib/ai-tools";
import { getOrchestraSystemPrompt } from "@/lib/ai-prompts";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";

export const maxDuration = 30;

const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 5000;

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req, "member");
  if (authResult instanceof Response) return authResult;
  const user = authResult;

  const rateLimited = checkRateLimit(getClientId(req, user.id), {
    limit: 30,
    windowSec: 60,
  });
  if (rateLimited) return rateLimited;

  let messages: UIMessage[];
  try {
    const body = await req.json();
    messages = body.messages;
  } catch {
    return Response.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "메시지가 필요합니다." }, { status: 400 });
  }
  if (messages.length > MAX_MESSAGES) {
    return Response.json({ error: `메시지는 최대 ${MAX_MESSAGES}개까지 허용됩니다.` }, { status: 400 });
  }

  const role = user.role ?? "member";
  const tools = getToolsForRole(role);
  const system = getOrchestraSystemPrompt(role, user.name);

  try {
    const modelMessages = await convertToModelMessages(messages);
    const result = streamText({
      model: models.fast,
      system,
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(3),
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error("[chat] AI error:", err);
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("quota") || msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
      return Response.json({ error: "AI API 할당량이 초과되었습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
    }
    return Response.json({ error: "AI 응답 생성에 실패했습니다." }, { status: 500 });
  }
}
