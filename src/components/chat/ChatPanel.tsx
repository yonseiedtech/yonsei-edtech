"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { useOrchestraChat } from "@/lib/use-orchestra-chat";
import ChatMessage from "./ChatMessage";

export default function ChatPanel({ onClose }: { onClose: () => void }) {
  const { messages, sendMessage, status } = useOrchestraChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    sendMessage({ text });
  };

  return (
    <div className="flex h-[min(600px,calc(100dvh-6rem))] w-full flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl sm:w-96">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">
            AI
          </div>
          <span className="font-semibold">연교공 챗봇</span>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1 hover:bg-muted"
          aria-label="닫기"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isLoading && (messages[messages.length - 1]?.role as string) === "user" && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-muted px-4 py-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t px-4 py-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder="메시지를 입력하세요..."
          rows={1}
          className="max-h-24 flex-1 resize-none rounded-xl border bg-muted/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
          aria-label="전송"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
