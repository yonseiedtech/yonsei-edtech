"use client";

// Phase 3.5 — measurement 콘솔 목록 (편집 경로 통일).

import { Ruler } from "lucide-react";
import ConsoleSimpleArchiveList from "@/components/archive/ConsoleSimpleArchiveList";

export default function ConsoleMeasurementsPage() {
  return (
    <ConsoleSimpleArchiveList
      type="measurement"
      icon={Ruler}
      title="측정도구 관리"
      description="archive_measurements CRUD — 등록 즉시 공개 (published 게이트 없음)"
    />
  );
}
