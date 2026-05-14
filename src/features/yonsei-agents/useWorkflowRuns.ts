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
import type { WorkflowRun } from "./workflow-types";

/**
 * Firestore agent_workflow_runs 컬렉션을 실시간 구독 (Sprint 70).
 * 본인이 시작한 워크플로우 run 만 로드.
 */
export function useWorkflowRuns(maxItems = 50) {
  const { user } = useAuthStore();
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRuns([]);
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, "agent_workflow_runs"),
      where("userId", "==", user.id),
      orderBy("createdAt", "desc"),
      limit(maxItems),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: WorkflowRun[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<WorkflowRun, "id">),
        }));
        setRuns(list);
        setIsLoading(false);
      },
      (err) => {
        console.error("[useWorkflowRuns]", err);
        setIsLoading(false);
      },
    );

    return () => unsub();
  }, [user, maxItems]);

  return { runs, isLoading };
}
