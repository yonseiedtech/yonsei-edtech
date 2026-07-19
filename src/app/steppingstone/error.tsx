"use client";

import SectionError from "@/components/ui/section-error";

export default function SteppingstoneError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <SectionError {...props} sectionLabel="온보딩 길잡이" />;
}
