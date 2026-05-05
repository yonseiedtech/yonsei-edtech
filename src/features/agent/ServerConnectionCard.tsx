"use client";

import { useState, useEffect } from "react";
import { Plug, Loader2, CheckCircle, XCircle, Terminal, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useServerHealth, useTestConnection, getServerConfig, saveServerConfig } from "./useAgentServer";
import { toast } from "sonner";

export default function ServerConnectionCard() {
  const [url, setUrl] = useState("http://localhost:8400");
  const [token, setToken] = useState("");
  const [showSetup, setShowSetup] = useState(false);
  const [copied, setCopied] = useState(false);
  const { data: health } = useServerHealth();
  const { mutate: testConnection, isPending: isTesting, data: testResult, error: testError, reset } = useTestConnection();

  const connected = !!health?.status;

  useEffect(() => {
    const config = getServerConfig();
    if (config.url) setUrl(config.url);
    if (config.token) setToken(config.token);
    if (!config.token) setShowSetup(true);
  }, []);

  function handleConnect() {
    if (!url.trim() || !token.trim()) {
      toast.error("URL과 토큰을 모두 입력해주세요.");
      return;
    }
    reset();
    saveServerConfig(url.trim(), token.trim());
    testConnection(
      { url: url.trim(), token: token.trim() },
      {
        onSuccess: (data) => {
          toast.success(`연결 성공! 에이전트 ${data.agents}개 확인`);
          setShowSetup(false);
        },
        onError: (e) => {
          toast.error(e.message);
        },
      },
    );
  }

  const [copiedPath, setCopiedPath] = useState(false);

  function handleCopyPath() {
    navigator.clipboard.writeText("C:\\work\\yonsei-edtech");
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  }

  function handleCopyCommand() {
    navigator.clipboard.writeText("cd agent-server; python main.py");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // 프로젝트 경로 복사 UI (항상 표시)
  const projectPathUI = (
    <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2">
      <Terminal size={14} className="shrink-0 text-blue-600" />
      <span className="text-xs text-blue-700">프로젝트 경로</span>
      <code className="flex-1 rounded bg-card/80 px-2 py-1 font-mono text-xs text-blue-900">
        C:\work\yonsei-edtech
      </code>
      <button onClick={handleCopyPath} className="rounded p-1 hover:bg-blue-100" title="경로 복사">
        {copiedPath ? <Check size={14} className="text-green-600" /> : <Copy size={14} className="text-blue-500" />}
      </button>
    </div>
  );

  // 이미 연결된 상태
  if (connected && !showSetup) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-green-200 bg-green-50/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-green-600" />
              <span className="font-medium text-green-800">에이전트 서버 연결됨</span>
              <span className="text-sm text-green-600">
                · 에이전트 {health.agents}개
                {health.running_tasks > 0 && ` · 실행 중 ${health.running_tasks}건`}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowSetup(true)} className="text-xs text-muted-foreground">
              설정 변경
            </Button>
          </div>
        </div>
        {projectPathUI}
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plug size={18} />
          <span className="font-semibold">에이전트 서버 연결</span>
        </div>
        {connected && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <span className="h-2 w-2 rounded-full bg-green-500" /> 연결됨
          </span>
        )}
      </div>

      {/* 온보딩 가이드 */}
      <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/50 p-4">
        <h4 className="flex items-center gap-1.5 text-sm font-medium text-blue-800">
          <Terminal size={14} />
          서버 실행 방법
        </h4>
        <ol className="mt-2 space-y-1.5 text-sm text-blue-700">
          <li>
            1. 프로젝트 폴더에서 터미널을 열어주세요
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 rounded bg-card/80 px-2.5 py-1.5 font-mono text-xs text-blue-900">
                C:\work\yonsei-edtech
              </code>
              <button onClick={handleCopyPath} className="rounded p-1 hover:bg-blue-100" title="경로 복사">
                {copiedPath ? <Check size={14} className="text-green-600" /> : <Copy size={14} className="text-blue-500" />}
              </button>
            </div>
          </li>
          <li>
            2. 아래 명령어를 실행하세요
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 rounded bg-card/80 px-2.5 py-1.5 font-mono text-xs text-blue-900">
                cd agent-server; python main.py
              </code>
              <button onClick={handleCopyCommand} className="rounded p-1 hover:bg-blue-100" title="복사">
                {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} className="text-blue-500" />}
              </button>
            </div>
          </li>
          <li>3. 콘솔에 표시되는 <strong>토큰</strong>을 아래에 붙여넣으세요</li>
        </ol>
      </div>

      {/* 연결 입력 */}
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">서버 URL</label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://localhost:8400" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">인증 토큰</label>
          <Input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="콘솔에 표시된 토큰 붙여넣기"
            onKeyDown={(e) => e.key === "Enter" && handleConnect()}
          />
        </div>
        <div className="flex items-end">
          <Button onClick={handleConnect} disabled={isTesting} size="sm">
            {isTesting ? <Loader2 size={14} className="mr-1 animate-spin" /> : null}
            {isTesting ? "연결 중..." : "연결"}
          </Button>
        </div>
      </div>

      {/* 연결 결과 */}
      {testError && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          <XCircle size={14} />
          {testError.message}
          {testError.message.includes("Failed to fetch") && " — 서버가 실행 중인지 확인해주세요."}
        </div>
      )}
    </div>
  );
}
