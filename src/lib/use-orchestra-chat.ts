"use client";

import { useEffect } from "react";
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

function buildWelcome(text: string) {
  return {
    id: "welcome",
    role: "assistant" as const,
    parts: [{ type: "text" as const, text }],
  };
}

export function useOrchestraChat() {
  const chat = useChat({
    transport,
    id: "orchestra-chat",
  });
  const { setMessages, messages } = chat;

  useEffect(() => {
    if (messages.length > 0) return;
    let cancelled = false;

    fetch("/api/chatbot")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setMessages([buildWelcome(data.greeting || DEFAULT_GREETING)]);
      })
      .catch(() => {
        if (cancelled) return;
        setMessages([buildWelcome(DEFAULT_GREETING)]);
      });

    return () => {
      cancelled = true;
    };
  }, [setMessages, messages.length]);

  return chat;
}
