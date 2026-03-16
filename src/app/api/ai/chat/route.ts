import { NextRequest } from "next/server";
import { streamText, type UIMessage, convertToModelMessages, stepCountIs } from "ai";
import { models } from "@/lib/ai";
import { verifyAuth } from "@/lib/api-auth";
import { getToolsForRole } from "@/lib/ai-tools";
import { getOrchestraSystemPrompt } from "@/lib/ai-prompts";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const user = await verifyAuth(req);
  const role = user?.role ?? "guest";

  const { messages } = (await req.json()) as { messages: UIMessage[] };

  const tools = getToolsForRole(role);
  const system = getOrchestraSystemPrompt(role, user?.name);
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: models.fast,
    system,
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(3),
  });

  return result.toUIMessageStreamResponse();
}
