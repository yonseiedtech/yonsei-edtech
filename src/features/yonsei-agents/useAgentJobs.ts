"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/features/auth/auth-store";
import type { AgentJob } from "./types";

/**
 * Firestore agent_jobs 컬렉션을 실시간 구독.
 * 본인 작업만 로드 (Firestore rules로도 강제됨).
 */
export function useAgentJobs(maxItems = 100) {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<AgentJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setJobs([]);
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, "agent_jobs"),
      where("userId", "==", user.id),
      orderBy("createdAt", "desc"),
      limit(maxItems),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: AgentJob[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<AgentJob, "id">),
        }));
        setJobs(list);
        setIsLoading(false);
      },
      (err) => {
        console.error("[useAgentJobs]", err);
        setIsLoading(false);
      },
    );

    return () => unsub();
  }, [user, maxItems]);

  return { jobs, isLoading };
}

/**
 * 에이전트 실행 — Firebase ID 토큰을 자동 첨부.
 */
export async function runYonseiAgent(args: {
  agentId: string;
  prompt: string;
  idToken: string;
}): Promise<{ jobId: string; output?: string; error?: string }> {
  const res = await fetch("/api/ai/yonsei-agent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.idToken}`,
    },
    body: JSON.stringify({
      agentId: args.agentId,
      prompt: args.prompt,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { jobId: data.jobId ?? "", error: data.error || "실행 실패" };
  }
  return { jobId: data.jobId, output: data.output };
}
