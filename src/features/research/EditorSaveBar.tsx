"use client";

/**
 * 하단 고정 저장 바 — 연구 에디터 공용 (UX-1, 2026-07-04)
 *
 * 논문 에디터에 먼저 도입된 패턴(긴 폼 스크롤 중에도 저장 접근·dirty 상태 표시)을
 * 보고서·계획서 에디터에도 동일하게 제공하기 위한 공용 컴포넌트.
 */

import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EditorSaveBar({
  dirty,
  saving,
  savedAt,
  onSave,
  extra,
}: {
  dirty: boolean;
  saving: boolean;
  savedAt: string | null;
  onSave: () => void;
  /** 저장 버튼 왼쪽에 붙는 보조 액션 (예: 임시 저장) */
  extra?: React.ReactNode;
}) {
  return (
    <div className="sticky bottom-0 z-30 -mx-1 flex items-center justify-between gap-2 rounded-t-xl border border-b-0 bg-background/95 px-3 py-2 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur">
      <span className="truncate text-xs text-muted-foreground" aria-live="polite">
        {saving
          ? "저장 중…"
          : dirty
            ? "저장되지 않은 변경이 있습니다"
            : savedAt
              ? `마지막 저장 ${new Date(savedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`
              : ""}
      </span>
      <div className="flex shrink-0 items-center gap-2">
        {extra}
        <Button size="sm" onClick={onSave} disabled={saving || (!dirty && !!savedAt)}>
          <Save size={12} className="mr-1" />
          {saving ? "저장 중…" : dirty ? "저장" : "저장됨"}
        </Button>
      </div>
    </div>
  );
}
