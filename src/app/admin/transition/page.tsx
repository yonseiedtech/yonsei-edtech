"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function TransitionRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/staff-admin");
  }, [router]);
  return (
    <div className="flex justify-center py-12">
      <p className="text-sm text-muted-foreground">운영진 관리 페이지로 이동 중...</p>
    </div>
  );
}
