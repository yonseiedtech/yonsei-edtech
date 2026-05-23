"use client";

// Phase 3.5 — variable 콘솔 목록 (편집 경로 통일).

import { Variable as VariableIcon } from "lucide-react";
import ConsoleSimpleArchiveList from "@/components/archive/ConsoleSimpleArchiveList";

export default function ConsoleVariablesPage() {
  return (
    <ConsoleSimpleArchiveList
      type="variable"
      icon={VariableIcon}
      title="변인 관리"
      description="archive_variables CRUD — 등록 즉시 공개 (published 게이트 없음)"
    />
  );
}
