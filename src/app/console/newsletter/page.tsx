"use client";

import { Suspense } from "react";
import AdminNewsletterTab from "@/features/admin/AdminNewsletterTab";

export default function ConsoleNewsletterPage() {
  return (
    <Suspense fallback={null}>
      <AdminNewsletterTab />
    </Suspense>
  );
}
