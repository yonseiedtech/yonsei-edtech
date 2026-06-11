"use client";

import AuthGuard from "@/features/auth/AuthGuard";
import SeminarForm from "@/features/seminar/SeminarForm";
import PageContainer from "@/components/ui/page-container";

export default function SeminarCreatePage() {
  return (
    <AuthGuard allowedRoles={["staff", "president", "admin"]}>
      <PageContainer width="narrow">
        <SeminarForm />
      </PageContainer>
    </AuthGuard>
  );
}
