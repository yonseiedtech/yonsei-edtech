"use client";

import SectionError from "@/components/ui/section-error";

export default function MembersError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <SectionError {...props} sectionLabel="회원 디렉토리" />;
}
