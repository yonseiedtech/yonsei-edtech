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

// ── Health ──

export function useServerHealth() {
  return useQuery({
    queryKey: ["agent-server", "health"],
    queryFn: () => serverFetch<{ status: string; agents: number; running_tasks: number }>("/health"),
    refetchInterval: 5000,
    retry: false,
  });
}

// ── Agents ──

export function useAgents() {
  return useQuery({
    queryKey: ["agent-server", "agents"],
    queryFn: () => serverFetch<Agent[]>("/agents"),
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
