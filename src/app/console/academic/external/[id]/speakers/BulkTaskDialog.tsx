"use client";

/**
 * 발표 유형별 공통 임무 일괄 배분 다이얼로그 — Phase 1.
 * BulkDutyDialog 미러. 선택한 발표유형의 모든 발표자에게 동일한 prepTask 를
 * 한 번에 추가한다.
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  SPEAKER_SUBMISSION_TYPE_LABELS,
  type SpeakerSubmissionType,
} from "@/types";
import { SUBMISSION_TYPE_ORDER } from "./speaker-utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 유형별 발표자 수 */
  typeCounts: Record<SpeakerSubmissionType, number>;
  saving: boolean;
  onSubmit: (type: SpeakerSubmissionType, taskText: string) => void;
}

export default function BulkTaskDialog({
  open,
  onOpenChange,
  typeCounts,
  saving,
  onSubmit,
}: Props) {
  const firstWithMembers =
    SUBMISSION_TYPE_ORDER.find((k) => (typeCounts[k] ?? 0) > 0) ?? "paper";
  const [type, setType] = useState<SpeakerSubmissionType>(firstWithMembers);
  const [taskText, setTaskText] = useState("");

  const targetCount = typeCounts[type] ?? 0;

  function handleSubmit() {
    if (!taskText.trim()) return;
    onSubmit(type, taskText.trim());
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-1/2 bottom-auto my-0 max-h-[calc(100vh-2rem)] -translate-y-1/2 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>유형별 임무 일괄 배분</DialogTitle>
          <DialogDescription>
            선택한 발표 유형의 모든 발표자에게 동일한 준비 항목을 한 번에 추가합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">
              대상 유형
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {SUBMISSION_TYPE_ORDER.map((k) => {
                const count = typeCounts[k] ?? 0;
                return (
                  <button
                    key={k}
                    type="button"
                    disabled={count === 0}
                    onClick={() => setType(k)}
                    className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      type === k
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-input bg-card text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {SPEAKER_SUBMISSION_TYPE_LABELS[k]} ({count}명)
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">
              항목 내용
            </label>
            <input
              type="text"
              value={taskText}
              onChange={(e) => setTaskText(e.target.value)}
              placeholder="예: 발표 30분 전 본부석 집결"
              className="w-full rounded-md border px-2.5 py-1.5 text-xs"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {SPEAKER_SUBMISSION_TYPE_LABELS[type]} 발표자 {targetCount}명에게 추가됩니다.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={saving || !taskText.trim() || targetCount === 0}
            onClick={handleSubmit}
          >
            {saving ? "배분 중…" : `${targetCount}명에게 추가`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
