"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { slideDecksApi } from "@/lib/bkend";
import type { SeminarSlideDeck } from "@/types/seminar-live";

interface LectureNotesEditorProps {
  deck: SeminarSlideDeck;
  currentSlide: number;
  onDeckUpdated: (deck: SeminarSlideDeck) => void;
}

type SaveStatus = "idle" | "saving" | "saved";

/**
 * 발표자 강의노트 편집기.
 * deck.lectureNotes[currentSlide] 에 바인딩되며, 변경 시 800ms debounce 후 API 저장.
 * 슬라이드 또는 덱이 바뀌면 textarea 를 동기화한다.
 */
export default function LectureNotesEditor({
  deck,
  currentSlide,
  onDeckUpdated,
}: LectureNotesEditorProps) {
  const [value, setValue] = useState<string>(deck.lectureNotes[currentSlide] ?? "");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 덱 ID 또는 슬라이드 변경 시 textarea 동기화
  // (같은 덱에서 onDeckUpdated 로 lectureNotes 가 바뀔 때는 동기화하지 않아 편집 중 내용 보호)
  useEffect(() => {
    const v = deck.lectureNotes[currentSlide] ?? "";
    setValue(v);
    setStatus("idle");
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
  }, [deck.id, currentSlide]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setValue(v);
    setStatus("saving");

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      const updated: Record<number, string> = { ...deck.lectureNotes, [currentSlide]: v };
      slideDecksApi
        .update(deck.id, { lectureNotes: updated })
        .then((d) => {
          setStatus("saved");
          onDeckUpdated(d);
          // 2초 후 표시 초기화
          setTimeout(() => setStatus("idle"), 2000);
        })
        .catch(() => setStatus("idle"));
    }, 800);
  }

  return (
    <div className="rounded-2xl border bg-card p-4">
      {/* 헤더 */}
      <div className="mb-2 flex items-center justify-between">
        <label
          htmlFor="lecture-notes-textarea"
          className="text-xs font-semibold text-foreground"
        >
          슬라이드 {currentSlide + 1} 강의노트 (발표자)
        </label>
        <span
          className={cn(
            "text-[11px] transition-opacity duration-200",
            status === "saving"
              ? "text-muted-foreground opacity-100"
              : status === "saved"
                ? "text-indigo-600 opacity-100 dark:text-indigo-400"
                : "opacity-0",
          )}
        >
          {status === "saving" ? "저장 중…" : "저장됨"}
        </span>
      </div>

      {/* 노트 입력 */}
      <textarea
        id="lecture-notes-textarea"
        value={value}
        onChange={handleChange}
        rows={6}
        placeholder={`슬라이드 ${currentSlide + 1}에 대한 강의노트를 입력하세요. (마크다운 텍스트)`}
        className={cn(
          "w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5",
          "text-sm text-foreground placeholder:text-muted-foreground",
          "focus:outline-none focus:ring-2 focus:ring-indigo-500/40",
          "dark:bg-muted/10",
        )}
      />
    </div>
  );
}
