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
            text: "안녕하세요! 연교공 챗봇입니다. 현재 연교공 챗봇은 준비중입니다! 공식 오픈 시 다시 한번 안내해드릴게요 😊",
          },
        ],
      },
    ],
  });
}
