"use client";

import AuthGuard from "@/features/auth/AuthGuard";
import SeminarForm from "@/features/seminar/SeminarForm";

export default function SeminarCreatePage() {
  return (
    <AuthGuard allowedRoles={["staff", "president", "admin"]}>
      <div className="py-16">
        <div className="mx-auto max-w-2xl px-4">
          <SeminarForm />
        </div>
      </div>
    </AuthGuard>
  );
}
