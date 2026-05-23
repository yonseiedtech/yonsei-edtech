"use client";

import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import StatisticalMethodForm from "@/components/archive/StatisticalMethodForm";

export default function ConsoleStatisticalMethodsNewPage() {
  const { user } = useAuthStore();
  const allowed = isAtLeast(user, "staff");

  if (!allowed || !user) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">접근 권한이 없습니다 (staff 이상).</p>
      </div>
    );
  }

  return <StatisticalMethodForm initial={null} userId={user.id} />;
}
