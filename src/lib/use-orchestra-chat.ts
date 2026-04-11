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

const DEFAULT_GREETING = "안녕하세요! 연세교육공학회 챗봇입니다. 궁금한 점이 있으시면 편하게 질문해 주세요! 😊";

export function useOrchestraChat() {
  const [greeting, setGreeting] = useState(DEFAULT_GREETING);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/chatbot")
      .then((res) => res.json())
      .then((data) => { if (data.greeting) setGreeting(data.greeting); })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const chat = useChat({
    transport,
    id: ready ? `chat-${greeting.slice(0, 20)}` : "chat-init",
    messages: [
      {
        id: "welcome",
        role: "assistant" as const,
        parts: [{ type: "text" as const, text: greeting }],
      },
    ],
  });

  return chat;
}
