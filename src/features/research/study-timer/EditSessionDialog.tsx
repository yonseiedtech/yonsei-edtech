"use client";

import { useEffect, useState } from "react";
import { useUpdateSession } from "./useStudySessions";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { StudySession, StudySessionType } from "@/types";
import { toast } from "sonner";
import { todayYmdLocal } from "@/lib/dday";

interface Props {
  open: boolean;
  session: StudySession | null;
  onClose: () => void;
}

export default function EditSessionDialog({ open, session, onClose }: Props) {
  const { mutateAsync: updateSession, isPending } = useUpdateSession();
  const [type, setType] = useState<StudySessionType>("reading");
  const [targetTitle, setTargetTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [memo, setMemo] = useState("");

  useEffect(() => {
    if (!session) return;
    setType(session.type ?? "reading");
    setTargetTitle(session.targetTitle ?? "");
    setDate(session.startTime?.slice(0, 10) ?? "");
    setStartTime(session.startTime?.slice(11, 16) ?? "09:00");
    setEndTime(session.endTime?.slice(11, 16) ?? "10:00");
    setMemo(session.memo ?? "");
  }, [session]);

  const startMs = date ? new Date(`${date}T${startTime}:00`).getTime() : 0;
  const endMs = date ? new Date(`${date}T${endTime}:00`).getTime() : 0;
  const diffMin = endMs > startMs ? Math.round((endMs - startMs) / 60000) : 0;
  const diffH = Math.floor(diffMin / 60);
  const diffM = diffMin % 60;
  const diffLabel = diffH > 0 ? `${diffH}시간 ${diffM}분` : `${diffM}분`;

  async function handleSubmit() {
    if (!session) return;
    if (diffMin <= 0) {
      toast.error("종료 시각이 시작보다 빠릅니다");
      return;
    }
    try {
      await updateSession({
        sessionId: session.id,
        type,
        targetTitle: targetTitle.trim(),
        date,
        startTime,
        endTime,
        memo: memo.trim(),
      });
      toast.success(`세션이 수정되었습니다 (${diffLabel})`);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "수정에 실패했습니다");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>연구 세션 수정</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <p className="mb-1.5 text-sm font-medium">유형</p>
            <div className="flex gap-3">
              {(["reading", "writing"] as const).map((t) => (
                <label key={t} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="radio"
                    name="editSessionType"
                    checked={type === t}
                    onChange={() => setType(t)}
                    className="accent-primary"
                  />
                  {t === "reading" ? "읽기" : "작성"}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium">대상 제목</p>
            <Input
              value={targetTitle}
              onChange={(e) => setTargetTitle(e.target.value)}
              placeholder="연구한 자료/논문 제목"
            />
          </div>

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
            {isPending ? "저장 중..." : "수정"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
