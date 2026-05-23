"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { statisticalMethodsApi } from "@/lib/bkend";
import type { StatisticalMethod } from "@/types";
import StatisticalMethodForm from "@/components/archive/StatisticalMethodForm";

export default function ConsoleStatisticalMethodsEditPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const allowed = isAtLeast(user, "staff");

  const [method, setMethod] = useState<StatisticalMethod | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id || !allowed) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const m = await statisticalMethodsApi.get(params.id);
        if (cancelled) return;
        setMethod(m);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "불러오기 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params?.id, allowed]);

  if (!allowed || !user) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">접근 권한이 없습니다 (staff 이상).</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !method) {
    return (
      <div className="py-12 text-center">
        <p className="text-destructive" role="alert">
          ⚠ {error ?? "항목을 찾을 수 없습니다."}
        </p>
      </div>
    );
  }

  return <StatisticalMethodForm initial={method} userId={user.id} />;
}
