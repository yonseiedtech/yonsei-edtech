"use client";

import SectionError from "@/components/ui/section-error";

export default function ConsoleError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <SectionError {...props} sectionLabel="운영 콘솔" />;
}
