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
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("로그인이 필요합니다.");

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "요청 실패" }));
    throw new Error(err.error || `API 오류 (${res.status})`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("스트리밍을 지원하지 않습니다.");

  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    if (text) onChunk(text);
  }

  onDone?.();
}
