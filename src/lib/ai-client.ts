"use client";

import { auth } from "@/lib/firebase";

/**
 * AI API 호출 헬퍼 — Firebase ID Token을 자동으로 첨부하고 스트리밍 텍스트를 읽어 콜백으로 전달.
 */
export async function streamAI(
  endpoint: string,
  body: Record<string, unknown>,
  onChunk: (text: string) => void,
  onDone?: () => void,
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("로그인이 필요합니다.");

  const token = await currentUser.getIdToken(true); // force refresh
  console.log("[streamAI] uid:", currentUser.uid, "email:", currentUser.email);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  console.log("[streamAI] response status:", res.status, "ok:", res.ok);

  if (!res.ok) {
    const errText = await res.text();
    console.error("[streamAI] error response:", res.status, errText);
    let msg = `API 오류 (${res.status})`;
    try { msg = JSON.parse(errText).error || msg; } catch { /* */ }
    throw new Error(msg);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    console.error("[streamAI] no reader available");
    throw new Error("스트리밍을 지원하지 않습니다.");
  }

  const decoder = new TextDecoder();
  let totalChunks = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    if (text) {
      totalChunks++;
      if (totalChunks <= 3) console.log("[streamAI] chunk:", totalChunks, text.substring(0, 100));
      onChunk(text);
    }
  }

  console.log("[streamAI] done, total chunks:", totalChunks);
  if (totalChunks === 0) {
    throw new Error("AI 응답이 비어있습니다. API 할당량 초과일 수 있습니다. 잠시 후 다시 시도해주세요.");
  }
  onDone?.();
}
