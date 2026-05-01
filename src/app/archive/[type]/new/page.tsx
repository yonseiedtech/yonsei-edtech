"use client";

import { notFound, useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import ArchiveItemForm from "@/components/archive/ArchiveItemForm";
import type { ArchiveItemType } from "@/types";

export default function ArchiveNewPage() {
  const params = useParams<{ type: string }>();
  const router = useRouter();
  const type = params?.type as ArchiveItemType;
  const { user } = useAuthStore();
  const canManage = isAtLeast(user, "staff");

  if (type !== "concept" && type !== "variable" && type !== "measurement") {
    notFound();
  }

  useEffect(() => {
    if (!user) return; // 인증 상태 로드 대기
    if (!canManage) {
      router.replace(`/archive/${type}`);
    }
  }, [user, canManage, router, type]);

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
        새 항목 추가는 운영진(staff 이상)만 가능합니다.
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl py-8">
      <ArchiveItemForm
        type={type}
        initial={null}
        initialThesisIds={[]}
        userId={user.id}
        canDelete={false}
      />
    </div>
  );
}
