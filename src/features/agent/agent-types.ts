export interface Agent {
  id: string;
  name: string;
  role: string;
  avatar: string;
  system_prompt: string;
  tools: string[];
  model: "fast" | "quality";
  status: "idle" | "running" | "error";
  is_preset: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentTask {
  id: string;
  agent_id: string;
  title: string;
  description: string;
  type: "content" | "analysis" | "automation" | "document";
  status: "pending" | "running" | "completed" | "failed";
  input_data: Record<string, unknown>;
  output?: string;
  error?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface ServerConnection {
  url: string;
  token: string;
}

export interface SSEEvent {
  type: "status" | "tool_call" | "tool_result" | "delta" | "complete" | "error";
  data: Record<string, unknown>;
}
