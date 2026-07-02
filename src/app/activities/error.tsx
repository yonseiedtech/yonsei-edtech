"use client";

import SectionError from "@/components/ui/section-error";

export default function ActivitiesError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <SectionError {...props} sectionLabel="학술활동" />;
}
