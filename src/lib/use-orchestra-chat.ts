"use client";

import { useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { auth } from "./firebase";
import { useStudyTimerStore } from "@/features/research/study-timer/study-timer-store";

const transport = new DefaultChatTransport({
  api: "/api/ai/chat",
  headers: async (): Promise<Record<string, string>> => {
    const token = await auth.currentUser?.getIdToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
  body: () => {
    // 활성 타이머 세션을 컨텍스트로 동봉
    const { active, elapsed, isPaused } = useStudyTimerStore.getState();
    if (!active) return {};
    return {
      studyContext: {
        type: active.type,
        targetTitle: active.targetTitle,
        elapsedSeconds: elapsed,
        isPaused,
      },
    };
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

function buildStudyContextWelcome(targetTitle: string, type: "reading" | "writing", elapsedSec: number) {
  const minutes = Math.floor(elapsedSec / 60);
  const verb = type === "reading" ? "읽고" : "작성하고";
  const icon = type === "reading" ? "📖" : "✏️";
  const text = `${icon} 지금 「${targetTitle}」 ${verb} 계시네요 (${minutes}분 경과). 어떤 도움이 필요하세요?

· 핵심 내용 요약 / 어려운 부분 풀이
· 관련 선행 연구 추천
· 글쓰기 막힌 부분 풀어내기`;
  return buildWelcome(text);
}

export function useOrchestraChat() {
  const chat = useChat({
    transport,
    id: "orchestra-chat",
  });
  const { setMessages, messages } = chat;
  const active = useStudyTimerStore((s) => s.active);
  const elapsed = useStudyTimerStore((s) => s.elapsed);

  useEffect(() => {
    if (messages.length > 0) return;
    let cancelled = false;

    // 활성 타이머 세션이 있으면 컨텍스트 환영 메시지 즉시 표시
    if (active) {
      setMessages([buildStudyContextWelcome(active.targetTitle, active.type, elapsed)]);
      return;
    }

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
  }, [setMessages, messages.length, active, elapsed]);

  return chat;
}
