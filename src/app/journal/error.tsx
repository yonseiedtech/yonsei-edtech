"use client";

import SectionError from "@/components/ui/section-error";

export default function JournalError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <SectionError {...props} sectionLabel="연구지" />;
}
