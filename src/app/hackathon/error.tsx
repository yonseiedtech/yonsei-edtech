"use client";

import SectionError from "@/components/ui/section-error";

export default function HackathonError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <SectionError {...props} sectionLabel="해커톤" />;
}
