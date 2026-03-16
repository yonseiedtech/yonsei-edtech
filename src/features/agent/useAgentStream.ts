"use client";

import { useState, useEffect, useCallback } from "react";
import { getServerConfig } from "./useAgentServer";
import type { SSEEvent } from "./agent-types";

export function useAgentStream(taskId: string | null) {
  const [statusMessage, setStatusMessage] = useState("");
  const [currentTool, setCurrentTool] = useState("");
  const [outputChunks, setOutputChunks] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStatusMessage("");
    setCurrentTool("");
    setOutputChunks("");
    setIsStreaming(false);
    setError(null);
  }, []);

  useEffect(() => {
    if (!taskId) {
      reset();
      return;
    }

    const { url, token } = getServerConfig();
    if (!url || !token) return;

    reset();
    setIsStreaming(true);

    const eventSource = new EventSource(`${url}/tasks/${taskId}/stream?token=${token}`);

    // SSE는 Authorization 헤더를 지원하지 않으므로
    // 대안: fetch + ReadableStream으로 처리
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`${url}/tasks/${taskId}/stream`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error("스트림 연결 실패");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          let eventType = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith("data: ") && eventType) {
              try {
                const data = JSON.parse(line.slice(6));
                handleEvent(eventType, data);
              } catch { /* skip parse errors */ }
              eventType = "";
            }
          }
        }
      } catch (e) {
        if (!controller.signal.aborted) {
          setError(e instanceof Error ? e.message : "스트림 에러");
        }
      } finally {
        setIsStreaming(false);
      }
    })();

    function handleEvent(type: string, data: Record<string, unknown>) {
      switch (type) {
        case "status":
          setStatusMessage(data.message as string || "");
          break;
        case "tool_call":
          setCurrentTool(data.tool as string || "");
          break;
        case "tool_result":
          setCurrentTool("");
          break;
        case "delta":
          setOutputChunks((prev) => prev + (data.text as string || ""));
          break;
        case "complete":
          setOutputChunks(data.output as string || "");
          setIsStreaming(false);
          break;
        case "error":
          setError(data.error as string || "알 수 없는 에러");
          setIsStreaming(false);
          break;
      }
    }

    // EventSource는 사용하지 않음 (Authorization 헤더 미지원)
    eventSource.close();

    return () => {
      controller.abort();
      eventSource.close();
    };
  }, [taskId, reset]);

  return { statusMessage, currentTool, outputChunks, isStreaming, error };
}
