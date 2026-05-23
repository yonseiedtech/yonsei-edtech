"use client";

// Phase 3.5 — concept 콘솔 목록 (편집 경로 통일).

import { Lightbulb } from "lucide-react";
import ConsoleSimpleArchiveList from "@/components/archive/ConsoleSimpleArchiveList";

export default function ConsoleConceptsPage() {
  return (
    <ConsoleSimpleArchiveList
      type="concept"
      icon={Lightbulb}
      title="개념 관리"
      description="archive_concepts CRUD — 등록 즉시 공개 (published 게이트 없음)"
    />
  );
}
