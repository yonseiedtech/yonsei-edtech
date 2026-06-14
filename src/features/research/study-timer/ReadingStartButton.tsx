"use client";

/**
 * ReadingStartButton — 논문 읽기 시작 버튼 (사이클 120 89d)
 * 졸업생논문 상세·리뷰게시판 글 등에서 읽기 타이머를 시작하는 진입점.
 * 기존 reading 세션(useStudyTimerStore/useCreateSession)을 재사용하고,
 * readingSource/readingRefId 를 실어 종료 시 읽음 기록 모달이 출처를 알게 한다.
 */

import { BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useStudyTimerStore } from "./study-timer-store";
import { useCreateSession } from "./useStudySessions";
import type { PaperReadingSource } from "@/types/paper-reading";

interface Props {
  source: PaperReadingSource;
  refId?: string;
  title: string;
  size?: "sm" | "default";
  variant?: "default" | "outline";
  className?: string;
}

export default function ReadingStartButton({
  source,
  refId,
  title,
  size = "sm",
  variant = "default",
  className,
}: Props) {
  const { active, start: startTimer } = useStudyTimerStore();
  const { mutateAsync: createSession, isPending } = useCreateSession();
  const isReadingThis =
    active?.type === "reading" && active.readingRefId === refId && !!refId;

  async function handleStart() {
    if (active) {
      toast.error(
        active.readingRefId === refId && refId
          ? "이미 이 논문을 읽는 중입니다"
          : "이미 진행 중인 세션이 있습니다",
      );
      return;
    }
    try {
      const session = await createSession({
        type: "reading",
        targetTitle: title || "(제목 없음)",
      });
      startTimer({
        id: session.id,
        type: "reading",
        targetTitle: title || "(제목 없음)",
        startTime: Date.now(),
        readingSource: source,
        readingRefId: refId,
      });
      toast.success("읽기 타이머 시작 📖 — 우측 하단 부엉이가 함께해요");
    } catch {
      toast.error("타이머 시작에 실패했습니다");
    }
  }

  return (
    <Button
      size={size}
      variant={variant}
      onClick={handleStart}
      disabled={isPending || isReadingThis}
      className={className ?? "shrink-0"}
    >
      <BookOpen size={14} className="mr-1.5" />
      {isReadingThis ? "읽는 중…" : "읽기 시작"}
    </Button>
  );
}
