"use client";

/**
 * WritingStartButton — 글쓰기 타이머 시작 버튼 (사이클 123)
 * 논문 작성·연구보고서·연구계획서 등 글쓰기 세션(type:"writing")을 시작한다.
 * 떠다니는 부엉이(FloatingReadingTimer)가 작성 시간을 재고, 그만두면 기록한다.
 */

import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useStudyTimerStore } from "./study-timer-store";
import { useCreateSession } from "./useStudySessions";

interface Props {
  /** 말풍선·세션에 표시될 제목 (예: "연구계획서 — OOO") */
  targetTitle: string;
  /** 논문 작성이면 writingPaperId, 보고서/계획서는 생략(제목으로 식별) */
  writingPaperId?: string;
  size?: "sm" | "default";
  variant?: "default" | "outline";
  className?: string;
}

export default function WritingStartButton({
  targetTitle,
  writingPaperId,
  size = "sm",
  variant = "outline",
  className,
}: Props) {
  const { active, start: startTimer } = useStudyTimerStore();
  const { mutateAsync: createSession, isPending } = useCreateSession();

  const isWritingThis =
    active?.type === "writing" &&
    (writingPaperId
      ? active.writingPaperId === writingPaperId
      : active.targetTitle === targetTitle);

  async function handleStart() {
    if (active) {
      toast.error(
        active.type === "writing"
          ? "이미 글쓰기 세션이 진행 중입니다"
          : "이미 진행 중인 세션이 있습니다",
      );
      return;
    }
    try {
      const session = await createSession({
        type: "writing",
        writingPaperId,
        targetTitle: targetTitle || "(제목 없음)",
      });
      startTimer({
        id: session.id,
        type: "writing",
        writingPaperId,
        targetTitle: targetTitle || "(제목 없음)",
        startTime: Date.now(),
      });
      toast.success("글쓰기 타이머를 시작했습니다.");
    } catch {
      toast.error("타이머 시작에 실패했습니다");
    }
  }

  return (
    <Button
      size={size}
      variant={variant}
      onClick={handleStart}
      disabled={isPending || isWritingThis}
      className={className}
    >
      <Pencil size={14} className="mr-1.5" />
      {isWritingThis ? "작성 중…" : "글쓰기 타이머"}
    </Button>
  );
}
