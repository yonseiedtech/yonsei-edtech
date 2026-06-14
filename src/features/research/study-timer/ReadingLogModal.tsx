"use client";

/**
 * ReadingLogModal — 논문 읽음 기록 모달 (사이클 120)
 * 타이머 종료 직후 또는 즉시 기록(외부 논문) 공용. paper_reading_logs 에 적재.
 * 빠른(별점+한 줄) / 정독(핵심 주장·방법·시사점) 2단 입력.
 */

import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useCreateReadingLog } from "../usePaperReadingLogs";
import ReadingMascot from "./ReadingMascot";
import {
  PAPER_READING_SOURCE_LABELS,
  type PaperReadingSource,
} from "@/types/paper-reading";
import { todayYmdLocal } from "@/lib/dday";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  source: PaperReadingSource;
  refId?: string;
  defaultTitle?: string;
  defaultAuthors?: string;
  /** 타이머 종료 시 경과 분. 즉시 기록은 비움 */
  durationMin?: number;
}

export default function ReadingLogModal({
  open,
  onClose,
  source,
  refId,
  defaultTitle,
  defaultAuthors,
  durationMin,
}: Props) {
  const [title, setTitle] = useState(defaultTitle ?? "");
  const [authors, setAuthors] = useState(defaultAuthors ?? "");
  const [rating, setRating] = useState(0);
  const [oneLine, setOneLine] = useState("");
  const [deep, setDeep] = useState(false);
  const [keyClaim, setKeyClaim] = useState("");
  const [method, setMethod] = useState("");
  const [implication, setImplication] = useState("");
  const { mutateAsync, isPending } = useCreateReadingLog();

  async function handleSave() {
    if (!title.trim()) {
      toast.error("논문 제목을 입력해주세요");
      return;
    }
    try {
      await mutateAsync({
        source,
        refId,
        title: title.trim(),
        authors: authors.trim() || undefined,
        status: "done",
        readAt: todayYmdLocal(),
        durationMin,
        rating: rating || undefined,
        oneLine: oneLine.trim() || undefined,
        keyClaim: deep ? keyClaim.trim() || undefined : undefined,
        method: deep ? method.trim() || undefined : undefined,
        implication: deep ? implication.trim() || undefined : undefined,
      });
      toast.success(durationMin ? `${durationMin}분 읽기 기록 완료 📖` : "읽기 기록 완료 📖");
      onClose();
    } catch {
      toast.error("저장에 실패했습니다");
    }
  }

  const taClass =
    "w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-teal-700">
              <ReadingMascot celebrate size={26} />
            </span>
            논문 읽기 기록
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="rounded-full bg-muted px-2 py-0.5">
              {PAPER_READING_SOURCE_LABELS[source]}
            </span>
            {durationMin != null && (
              <span className="font-semibold text-teal-700">⏱ {durationMin}분 집중</span>
            )}
          </div>

          <Input
            placeholder="논문 제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            placeholder="저자 (선택)"
            value={authors}
            onChange={(e) => setAuthors(e.target.value)}
          />

          {/* 별점 */}
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n === rating ? 0 : n)}
                aria-label={`${n}점`}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    "h-6 w-6",
                    n <= rating
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/40",
                  )}
                />
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-1 text-xs text-muted-foreground">{rating}점</span>
            )}
          </div>

          <textarea
            placeholder="한 줄 소감 (선택)"
            value={oneLine}
            onChange={(e) => setOneLine(e.target.value)}
            rows={2}
            className={taClass}
          />

          {/* 정독 기록 토글 */}
          <button
            type="button"
            onClick={() => setDeep((v) => !v)}
            className="text-xs font-medium text-teal-700 hover:underline"
          >
            {deep ? "− 정독 기록 접기" : "+ 정독 기록 — 핵심 주장 · 방법 · 시사점"}
          </button>
          {deep && (
            <div className="space-y-2 rounded-lg border bg-muted/30 p-2">
              <textarea
                placeholder="핵심 주장 — 이 논문이 말하는 한 가지"
                value={keyClaim}
                onChange={(e) => setKeyClaim(e.target.value)}
                rows={2}
                className={taClass}
              />
              <textarea
                placeholder="연구 방법 — 어떻게 밝혔나"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                rows={2}
                className={taClass}
              />
              <textarea
                placeholder="내 연구 시사점 — 내 연구에 어떻게 쓸까"
                value={implication}
                onChange={(e) => setImplication(e.target.value)}
                rows={2}
                className={taClass}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "저장 중…" : "기록 저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
