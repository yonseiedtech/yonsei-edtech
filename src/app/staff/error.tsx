"use client";

import SectionError from "@/components/ui/section-error";

export default function StaffError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <SectionError {...props} sectionLabel="운영진 페이지" />;
}
