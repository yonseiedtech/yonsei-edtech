import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";

export const maxDuration = 30;

const DEFAULT_GREETING = "안녕하세요! 연교공 챗봇입니다. 현재 연교공 챗봇은 준비중입니다! 공식 오픈 시 다시 한번 안내해드릴게요 😊";
const DEFAULT_REPLY = "현재 연교공 챗봇은 준비중입니다! 공식 오픈 시 다시 한번 안내해드릴게요 😊";

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req, "member");
  if (authResult instanceof Response) return authResult;
  const user = authResult;

  const rateLimited = checkRateLimit(getClientId(req, user.id), { limit: 30, windowSec: 60 });
  if (rateLimited) return rateLimited;

  let messages: { role: string; parts?: { type: string; text?: string }[]; content?: string }[];
  try {
    const body = await req.json();
    messages = body.messages;
  } catch {
    return Response.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "메시지가 필요합니다." }, { status: 400 });
  }

  // 마지막 사용자 메시지 추출
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const userText = lastUserMsg?.parts?.map((p) => p.text || "").join("") || lastUserMsg?.content || "";

  if (!userText.trim()) {
    return Response.json({ error: "메시지 내용이 비어있습니다." }, { status: 400 });
  }

  const db = getAdminDb();

  // Q&A 매칭
  let reply = DEFAULT_REPLY;
  try {
    const qaSnap = await db.collection("chat_qa").where("enabled", "==", true).get();
    for (const doc of qaSnap.docs) {
      const qa = doc.data();
      const keywords = (qa.keywords as string[]) ?? [];
      const matched = keywords.some((k) => userText.toLowerCase().includes(k.toLowerCase()));
      if (matched) {
        reply = qa.answer as string;
        break;
      }
    }
  } catch (e) {
    console.error("[chat] Q&A 조회 실패:", e);
  }

  // 대화 기록 저장
  try {
    await db.collection("chat_logs").add({
      userId: user.id,
      userName: user.name || "익명",
      userMessage: userText.slice(0, 2000),
      botResponse: reply.slice(0, 2000),
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[chat] 대화 기록 저장 실패:", e);
  }

  // 스트리밍 형태로 응답 (AI SDK 호환 형식)
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // AI SDK UIMessage stream format
      controller.enqueue(encoder.encode(`0:${JSON.stringify(reply)}\n`));
      controller.enqueue(encoder.encode(`d:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
