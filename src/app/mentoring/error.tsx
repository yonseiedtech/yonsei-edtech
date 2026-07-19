"use client";

import SectionError from "@/components/ui/section-error";

export default function MentoringError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <SectionError {...props} sectionLabel="멘토링" />;
}
