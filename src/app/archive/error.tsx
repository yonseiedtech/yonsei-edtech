"use client";

import SectionError from "@/components/ui/section-error";

export default function ArchiveError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <SectionError {...props} sectionLabel="아카이브" />;
}
