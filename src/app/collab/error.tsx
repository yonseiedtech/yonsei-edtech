"use client";

import SectionError from "@/components/ui/section-error";

export default function CollabError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <SectionError {...props} sectionLabel="협업 연구" />;
}
