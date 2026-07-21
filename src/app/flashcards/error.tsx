"use client";

import SectionError from "@/components/ui/section-error";

export default function FlashcardsError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <SectionError {...props} sectionLabel="암기카드" />;
}
