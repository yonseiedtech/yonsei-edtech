"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewsletterEditPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/console/newsletter");
  }, [router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="text-sm text-muted-foreground">리다이렉트 중...</p>
    </div>
  );
}
