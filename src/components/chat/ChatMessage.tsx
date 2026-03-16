"use client";

import type { UIMessage } from "ai";
import { Loader2 } from "lucide-react";

const TOOL_LABELS: Record<string, string> = {
  list_seminars: "세미나 조회 중",
  get_seminar: "세미나 상세 조회 중",
  search_posts: "게시글 검색 중",
  get_society_info: "학회 정보 조회 중",
  list_members: "회원 조회 중",
  get_inquiry_stats: "문의 현황 조회 중",
  list_inquiries: "문의 목록 조회 중",
  generate_content: "콘텐츠 생성 중",
  generate_inquiry_reply: "답변 생성 중",
  save_inquiry_reply: "답변 저장 중",
};

function getToolLabel(partType: string): string | null {
  if (!partType.startsWith("tool-")) return null;
  const toolName = partType.slice(5);
  return TOOL_LABELS[toolName] ?? "처리 중";
}

export default function ChatMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        {message.parts.map((part, i) => {
          if (part.type === "text" && part.text) {
            return (
              <p key={i} className="whitespace-pre-wrap">
                {part.text}
              </p>
            );
          }
          const label = getToolLabel(part.type);
          if (label && "state" in part && part.state !== "output-available") {
            return (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-full bg-background/60 px-2.5 py-1 text-xs text-muted-foreground"
              >
                <Loader2 className="h-3 w-3 animate-spin" />
                {label}...
              </span>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}
