"use client";

import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import ResearchMethodForm from "@/components/archive/ResearchMethodForm";

export default function ConsoleResearchMethodsNewPage() {
  const { user } = useAuthStore();
  const allowed = isAtLeast(user, "staff");

  if (!allowed || !user) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">접근 권한이 없습니다 (staff 이상).</p>
      </div>
    );
  }

  return <ResearchMethodForm initial={null} userId={user.id} />;
}
