"use client";

import SectionError from "@/components/ui/section-error";

export default function SeminarsError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <SectionError {...props} sectionLabel="세미나" />;
}
