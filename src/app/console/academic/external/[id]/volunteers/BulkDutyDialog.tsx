"use client";

/**
 * 역할별 공통 임무 일괄 배분 다이얼로그.
 * 특정 역할의 모든 봉사자에게 동일한 임무를 한 번에 추가한다.
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
  VOLUNTEER_ROLE_LABELS,
  type VolunteerRoleKey,
} from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 역할별 봉사자 수 */
  roleCounts: Record<VolunteerRoleKey, number>;
  saving: boolean;
  onSubmit: (role: VolunteerRoleKey, dutyText: string) => void;
}

const ROLE_KEYS: VolunteerRoleKey[] = [
  "track_runner",
  "registration",
  "guide",
  "media",
  "poster_manager",
  "other",
];

export default function BulkDutyDialog({
  open,
  onOpenChange,
  roleCounts,
  saving,
  onSubmit,
}: Props) {
  const firstWithMembers =
    ROLE_KEYS.find((k) => (roleCounts[k] ?? 0) > 0) ?? "registration";
  const [role, setRole] = useState<VolunteerRoleKey>(firstWithMembers);
  const [dutyText, setDutyText] = useState("");

  const targetCount = roleCounts[role] ?? 0;

  function handleSubmit() {
    if (!dutyText.trim()) return;
    onSubmit(role, dutyText.trim());
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-1/2 bottom-auto my-0 max-h-[calc(100vh-2rem)] -translate-y-1/2 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>역할별 공통 임무 일괄 배분</DialogTitle>
          <DialogDescription>
            선택한 역할의 모든 봉사자에게 동일한 임무를 한 번에 추가합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">대상 역할</label>
            <div className="grid grid-cols-2 gap-1.5">
              {ROLE_KEYS.map((k) => {
                const count = roleCounts[k] ?? 0;
                return (
                  <button
                    key={k}
                    type="button"
                    disabled={count === 0}
                    onClick={() => setRole(k)}
                    className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      role === k
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-input bg-card text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {VOLUNTEER_ROLE_LABELS[k]} ({count}명)
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">임무 내용</label>
            <input
              type="text"
              value={dutyText}
              onChange={(e) => setDutyText(e.target.value)}
              placeholder="예: 행사 시작 30분 전 데스크 집결"
              className="w-full rounded-md border px-2.5 py-1.5 text-xs"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {VOLUNTEER_ROLE_LABELS[role]} 역할 {targetCount}명에게 추가됩니다.
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
            disabled={saving || !dutyText.trim() || targetCount === 0}
            onClick={handleSubmit}
          >
            {saving ? "배분 중…" : `${targetCount}명에게 추가`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
