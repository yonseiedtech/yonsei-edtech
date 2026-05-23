"use client";

// Phase 3.5 — concept 편집 (콘솔 경로).

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import ArchiveItemForm from "@/components/archive/ArchiveItemForm";
import { archiveConceptsApi, alumniThesesApi } from "@/lib/bkend";
import type { ArchiveConcept } from "@/types";
import { toast } from "sonner";

export default function ConsoleConceptsEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const canManage = isAtLeast(user, "staff");
  const canDelete = isAtLeast(user, "admin");

  const [item, setItem] = useState<ArchiveConcept | null>(null);
  const [thesisIds, setThesisIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && !canManage) {
      router.replace("/archive/concept");
    }
  }, [user, canManage, router]);

  useEffect(() => {
    if (!params?.id || !canManage) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [loaded, thesesRes] = await Promise.all([
          archiveConceptsApi.get(params.id),
          alumniThesesApi.list(),
        ]);
        if (cancelled) return;
        setItem(loaded);
        const linked = thesesRes.data
          .filter((t) => (t.conceptIds ?? []).includes(params.id))
          .map((t) => t.id);
        setThesisIds(linked);
      } catch (err) {
        console.error("[console-archive-concept-edit] load failed", err);
        toast.error("항목을 불러오지 못했습니다");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params?.id, canManage]);

  if (!user) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        로그인 정보를 확인 중입니다…
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        수정은 운영진(staff 이상)만 가능합니다.
      </div>
    );
  }

  if (loading || !item) {
    return (
      <div className="container mx-auto max-w-3xl py-8 space-y-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl py-8">
      <ArchiveItemForm
        type="concept"
        initial={item}
        initialThesisIds={thesisIds}
        userId={user.id}
        canDelete={canDelete}
      />
    </div>
  );
}
