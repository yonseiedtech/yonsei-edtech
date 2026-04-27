"use client";

import { useState } from "react";
import { useCreateManualSession } from "./useStudySessions";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { StudySessionType } from "@/types";
import { toast } from "sonner";
import { todayYmdLocal } from "@/lib/dday";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultType?: StudySessionType;
  paperId?: string;
  writingPaperId?: string;
  targetTitle?: string;
}

export default function ManualSessionDialog({
  open, onClose, defaultType = "reading", paperId, writingPaperId, targetTitle = "",
}: Props) {
  const { mutateAsync: createManual, isPending } = useCreateManualSession();
  const [type, setType] = useState<StudySessionType>(defaultType);
  const [date, setDate] = useState(() => todayYmdLocal());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [memo, setMemo] = useState("");

  const startMs = new Date(`${date}T${startTime}:00`).getTime();
  const endMs = new Date(`${date}T${endTime}:00`).getTime();
  const diffMin = endMs > startMs ? Math.round((endMs - startMs) / 60000) : 0;
  const diffH = Math.floor(diffMin / 60);
  const diffM = diffMin % 60;
  const diffLabel = diffH > 0 ? `${diffH}시간 ${diffM}분` : `${diffM}분`;

  async function handleSubmit() {
    if (diffMin <= 0) {
      toast.error("종료 시각이 시작보다 빠릅니다");
      return;
    }
    try {
      await createManual({
        type,
        paperId: type === "reading" ? paperId : undefined,
        writingPaperId: type === "writing" ? writingPaperId : undefined,
        targetTitle,
        date,
        startTime,
        endTime,
        memo: memo.trim() || undefined,
      });
      toast.success(`수기 세션이 저장되었습니다 (${diffLabel})`);
      onClose();
      setMemo("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장에 실패했습니다");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>연구 시간 수기 입력</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <p className="mb-1.5 text-sm font-medium">유형</p>
            <div className="flex gap-3">
              {(["reading", "writing"] as const).map((t) => (
                <label key={t} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="radio"
                    name="sessionType"
                    checked={type === t}
                    onChange={() => setType(t)}
                    className="accent-primary"
                  />
                  {t === "reading" ? "읽기" : "작성"}
                </label>
              ))}
            </div>
          </div>

          {targetTitle && (
            <p className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              {targetTitle}
            </p>
          )}

          <div>
            <p className="mb-1.5 text-sm font-medium">날짜</p>
            <Input
              type="date"
              value={date}
              max={todayYmdLocal()}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1.5 text-sm font-medium">시작</p>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium">종료</p>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          {diffMin > 0 && (
            <p className="text-center text-sm font-medium text-primary">→ {diffLabel}</p>
          )}

          <div>
            <p className="mb-1.5 text-sm font-medium">메모 (선택)</p>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
              className="w-full rounded-md border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="간단한 메모"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>취소</Button>
          <Button onClick={handleSubmit} disabled={isPending || diffMin <= 0}>
            {isPending ? "저장 중..." : "저장하기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
