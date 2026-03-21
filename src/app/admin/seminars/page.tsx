"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminSeminarsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/seminar-admin");
  }, [router]);
  return null;
}
