"use client";

import { useEffect, useState } from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import ArchiveItemForm from "@/components/archive/ArchiveItemForm";
import {
  archiveConceptsApi,
  archiveVariablesApi,
  archiveMeasurementsApi,
  alumniThesesApi,
} from "@/lib/bkend";
import type {
  ArchiveItemType,
  ArchiveConcept,
  ArchiveVariable,
  ArchiveMeasurementTool,
  AlumniThesis,
} from "@/types";
import { toast } from "sonner";

type AnyItem = ArchiveConcept | ArchiveVariable | ArchiveMeasurementTool;

export default function ArchiveEditPage() {
  const params = useParams<{ type: string; id: string }>();
  const router = useRouter();
  const type = params?.type as ArchiveItemType;
  const id = params?.id as string;
  const { user } = useAuthStore();
  const canManage = isAtLeast(user, "staff");
  const canDelete = isAtLeast(user, "admin");

  const [item, setItem] = useState<AnyItem | null>(null);
  const [thesisIds, setThesisIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  if (type !== "concept" && type !== "variable" && type !== "measurement") {
    notFound();
  }

  useEffect(() => {
    if (user && !canManage) {
      router.replace(`/archive/${type}/${id}`);
    }
  }, [user, canManage, router, type, id]);

  useEffect(() => {
    if (!id || !type || !canManage) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const fetchItem =
          type === "concept"
            ? archiveConceptsApi.get(id)
            : type === "variable"
              ? archiveVariablesApi.get(id)
              : archiveMeasurementsApi.get(id);
        const [loaded, thesesRes] = await Promise.all([
          fetchItem,
          alumniThesesApi.list(),
        ]);
        if (cancelled) return;
        setItem(loaded as AnyItem);

        const fieldKey: keyof AlumniThesis =
          type === "concept"
            ? "conceptIds"
            : type === "variable"
              ? "variableIds"
              : "measurementIds";
        const linked = thesesRes.data
          .filter((t) => ((t[fieldKey] as string[] | undefined) ?? []).includes(id))
          .map((t) => t.id);
        setThesisIds(linked);
      } catch (err) {
        console.error("[archive-edit] load failed", err);
        toast.error("항목을 불러오지 못했습니다");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, type, canManage]);

  if (!user) {
    return (
      <div className="container mx-auto max-w-3xl py-12 text-center text-sm text-muted-foreground">
        로그인 정보를 확인 중입니다…
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="container mx-auto max-w-3xl py-12 text-center text-sm text-muted-foreground">
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
        type={type}
        initial={item}
        initialThesisIds={thesisIds}
        userId={user.id}
        canDelete={canDelete}
      />
    </div>
  );
}
