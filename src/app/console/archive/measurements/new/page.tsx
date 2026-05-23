"use client";

// Phase 3.5 — measurement 신규 등록 (콘솔 경로).

import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import ArchiveItemForm from "@/components/archive/ArchiveItemForm";

export default function ConsoleMeasurementsNewPage() {
  const { user } = useAuthStore();
  const allowed = isAtLeast(user, "staff");

  if (!allowed || !user) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">접근 권한이 없습니다 (staff 이상).</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl py-8">
      <ArchiveItemForm
        type="measurement"
        initial={null}
        initialThesisIds={[]}
        userId={user.id}
        canDelete={false}
      />
    </div>
  );
}
