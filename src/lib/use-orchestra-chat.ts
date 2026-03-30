"use client";

import { useState, useEffect } from "react";
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

const DEFAULT_GREETING = "안녕하세요! 연교공 챗봇입니다. 현재 연교공 챗봇은 준비중입니다! 공식 오픈 시 다시 한번 안내해드릴게요 😊";

export function useOrchestraChat() {
  const [greeting, setGreeting] = useState(DEFAULT_GREETING);

  useEffect(() => {
    fetch("/api/chatbot")
      .then((res) => res.json())
      .then((data) => { if (data.greeting) setGreeting(data.greeting); })
      .catch(() => {});
  }, []);

  return useChat({
    transport,
    messages: [
      {
        id: "welcome",
        role: "assistant",
        parts: [{ type: "text", text: greeting }],
      },
    ],
  });
}
