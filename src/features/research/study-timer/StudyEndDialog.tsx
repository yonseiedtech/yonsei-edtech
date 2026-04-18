"use client";

import { useState } from "react";
import { useStudyTimerStore } from "./study-timer-store";
import { useEndSession } from "./useStudySessions";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star, BookOpen, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function fmt(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}시간 ${m}분 ${s}초`;
  if (m > 0) return `${m}분 ${s}초`;
  return `${s}초`;
}

export default function StudyEndDialog() {
  const { active, elapsed, showEndDialog, confirmStop, cancelStop, clear } =
    useStudyTimerStore();
  const { mutateAsync: endSession, isPending } = useEndSession();
  const [focusScore, setFocusScore] = useState(0);
  const [memo, setMemo] = useState("");

  if (!active || !showEndDialog) return null;

  const isReading = active.type === "reading";

  async function handleSave() {
    if (!active) return;
    try {
      await endSession({
        sessionId: active.id,
        focusScore: focusScore > 0 ? focusScore : undefined,
        memo: memo.trim() || undefined,
      });
      toast.success(`${isReading ? "읽기" : "작성"} 세션이 저장되었습니다 (${fmt(elapsed)})`);
      clear();
      confirmStop();
      setFocusScore(0);
      setMemo("");
    } catch {
      toast.error("세션 저장에 실패했습니다");
    }
  }

  function handleQuickSave() {
    if (!active) return;
    endSession({ sessionId: active.id }).then(() => {
      clear();
      confirmStop();
      setFocusScore(0);
      setMemo("");
    }).catch(() => {
      toast.error("세션 저장에 실패했습니다");
    });
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) cancelStop(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isReading ? <BookOpen size={18} /> : <Pencil size={18} />}
            {isReading ? "읽기" : "작성"} 세션 완료
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-sm font-medium text-muted-foreground">{active.targetTitle}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{fmt(elapsed)}</p>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium">집중도는 어땠나요?</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setFocusScore(n)}
                  className="rounded p-0.5 transition-transform hover:scale-110"
                >
                  <Star
                    size={24}
                    className={cn(
                      "transition-colors",
                      n <= focusScore ? "fill-secondary text-secondary" : "text-muted-foreground/30",
                    )}
                  />
                </button>
              ))}
              {focusScore > 0 && (
                <span className="ml-1 self-center text-xs text-muted-foreground">{focusScore}/5</span>
              )}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium">메모 (선택)</p>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
              className="w-full rounded-md border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="오늘 읽은/작성한 내용을 간단히 메모하세요"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" size="sm" onClick={handleQuickSave} disabled={isPending}>
            빠른 저장
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "저장 중..." : "저장하기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
