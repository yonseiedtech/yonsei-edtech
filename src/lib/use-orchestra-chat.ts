"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { auth } from "./firebase";

const transport = new DefaultChatTransport({
  api: "/api/ai/chat",
  headers: async (): Promise<Record<string, string>> => {
    const token = await auth.currentUser?.getIdToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
});

export function useOrchestraChat() {
  return useChat({
    transport,
    messages: [
      {
        id: "welcome",
        role: "assistant",
        parts: [
          {
            type: "text",
            text: "안녕하세요! 연세교육공학회 AI 학회장입니다. 세미나 일정, 학회 활동, 게시글 등 궁금한 점을 편하게 물어보세요.",
          },
        ],
      },
    ],
  });
}
