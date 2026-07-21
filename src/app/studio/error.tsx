"use client";

import SectionError from "@/components/ui/section-error";

export default function StudioError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <SectionError {...props} sectionLabel="스튜디오" />;
}
