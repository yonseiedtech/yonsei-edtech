"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Agent, AgentTask } from "./agent-types";

const STORAGE_KEY = "agent-server-config";

export function getServerConfig() {
  if (typeof window === "undefined") return { url: "", token: "" };
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { url: "http://localhost:8400", token: "" };
  return JSON.parse(raw) as { url: string; token: string };
}

export function saveServerConfig(url: string, token: string) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ url, token }));
}

function hasValidConfig() {
  const { url, token } = getServerConfig();
  return !!url && !!token;
}

async function serverFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const { url, token } = getServerConfig();
  if (!url || !token) throw new Error("서버 설정이 필요합니다.");
  const res = await fetch(`${url}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `서버 에러: ${res.status}`);
  }
  return res.json();
}

// ── Health (토큰 설정된 경우만 폴링) ──

export function useServerHealth() {
  return useQuery({
    queryKey: ["agent-server", "health"],
    queryFn: () => serverFetch<{ status: string; agents: number; running_tasks: number }>("/health"),
    refetchInterval: hasValidConfig() ? 5000 : false,
    enabled: hasValidConfig(),
    retry: false,
  });
}

// ── Connection test (수동 트리거) ──

export function useTestConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ url, token }: { url: string; token: string }) => {
      const res = await fetch(`${url}/health`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(res.status === 401 ? "토큰이 올바르지 않습니다." : `연결 실패 (${res.status})`);
      return res.json() as Promise<{ status: string; agents: number }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-server"] });
    },
  });
}

// ── Agents ──

export function useAgents() {
  return useQuery({
    queryKey: ["agent-server", "agents"],
    queryFn: () => serverFetch<Agent[]>("/agents"),
    enabled: hasValidConfig(),
    retry: false,
  });
}

export function useCreateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Agent>) => serverFetch<Agent>("/agents", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-server", "agents"] }),
  });
}

export function useUpdateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Agent> & { id: string }) =>
      serverFetch<Agent>(`/agents/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-server", "agents"] }),
  });
}

export function useDeleteAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => serverFetch<{ success: boolean }>(`/agents/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-server", "agents"] }),
  });
}

// ── Tasks ──

export function useTasks(agentId?: string) {
  const params = new URLSearchParams();
  if (agentId) params.set("agent_id", agentId);
  params.set("limit", "20");
  return useQuery({
    queryKey: ["agent-server", "tasks", agentId],
    queryFn: () => serverFetch<AgentTask[]>(`/tasks?${params}`),
    enabled: hasValidConfig(),
    refetchInterval: 3000,
    retry: false,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      agent_id: string;
      title: string;
      description: string;
      type: string;
      input_data?: Record<string, unknown>;
    }) => serverFetch<AgentTask>("/tasks", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-server", "tasks"] });
      qc.invalidateQueries({ queryKey: ["agent-server", "agents"] });
    },
  });
}
