"use client";

import { useState, useEffect } from "react";
import { Plug, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useServerHealth, getServerConfig, saveServerConfig } from "./useAgentServer";

export default function ServerConnectionCard() {
  const [url, setUrl] = useState("http://localhost:8400");
  const [token, setToken] = useState("");
  const { data, isError, isLoading } = useServerHealth();

  useEffect(() => {
    const config = getServerConfig();
    if (config.url) setUrl(config.url);
    if (config.token) setToken(config.token);
  }, []);

  const connected = !!data?.status;

  function handleSave() {
    saveServerConfig(url, token);
    window.location.reload();
  }

  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plug size={18} />
          <span className="font-semibold">로컬 에이전트 서버</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isLoading ? (
            <Loader2 size={14} className="animate-spin text-muted-foreground" />
          ) : connected ? (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              연결됨 · 에이전트 {data.agents}개
            </span>
          ) : (
            <span className="flex items-center gap-1 text-sm text-red-500">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              연결 안 됨
            </span>
          )}
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">서버 URL</label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://localhost:8400" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">인증 토큰</label>
          <Input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="서버 시작 시 표시되는 토큰" />
        </div>
        <div className="flex items-end">
          <Button onClick={handleSave} size="sm">연결</Button>
        </div>
      </div>
      {!connected && !isLoading && (
        <p className="mt-3 text-xs text-muted-foreground">
          서버 실행: <code className="rounded bg-muted px-1">cd agent-server && python main.py</code>
        </p>
      )}
    </div>
  );
}
