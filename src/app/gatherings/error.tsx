"use client";

import SectionError from "@/components/ui/section-error";

export default function GatheringsError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <SectionError {...props} sectionLabel="모임" />;
}
