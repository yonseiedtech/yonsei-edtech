"use client";

import SectionError from "@/components/ui/section-error";

export default function MypageError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <SectionError {...props} sectionLabel="마이페이지" />;
}
