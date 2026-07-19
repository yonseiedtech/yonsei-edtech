"use client";

import SectionError from "@/components/ui/section-error";

export default function DashboardError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <SectionError {...props} sectionLabel="대시보드" />;
}
