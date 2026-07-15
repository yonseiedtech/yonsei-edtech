"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSeminarNotes } from "./useSeminarNotes";

interface AttendeeNotesPanelProps {
  seminarId: string;
  currentSlide: number;
  /** 발표자가 작성한 이 슬라이드의 강의노트 (읽기 전용 표시용) */
  lectureNote?: string;
  /** 슬라이드 칩 클릭 시 해당 슬라이드로 이동 (선택적 — 페이지 통합 시 연결) */
  onJumpToSlide?: (slide: number) => void;
}

/**
 * 참가자 개인 노트 패널.
 * - 발표자 노트를 읽기 전용으로 위에 표시 (제공된 경우).
 * - 아래에 참가자 자신의 비공개 노트 textarea (800ms debounce 자동 저장).
 * - 다른 슬라이드 노트 칩 목록 + 전체 노트 클립보드 복사 버튼.
 */
export default function AttendeeNotesPanel({
  seminarId,
  currentSlide,
  lectureNote,
  onJumpToSlide,
}: AttendeeNotesPanelProps) {
  const { notes, saveNote } = useSeminarNotes(seminarId);

  const [localBody, setLocalBody] = useState("");
  const [copied, setCopied] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 최신 notes 를 ref 로 참조 (슬라이드 변경 effect 에서 안전하게 읽기 위함)
  const notesRef = useRef(notes);
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  // 슬라이드 전환 시 해당 슬라이드의 노트로 textarea 동기화
  useEffect(() => {
    const body = notesRef.current.find((n) => n.slide === currentSlide)?.body ?? "";
    setLocalBody(body);
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
  }, [currentSlide]); // eslint-disable-line react-hooks/exhaustive-deps

  // 초기 로드 시 (notes 가 처음 채워질 때) 현재 슬라이드 노트 동기화
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    if (notes.length > 0) {
      initializedRef.current = true;
      const body = notes.find((n) => n.slide === currentSlide)?.body ?? "";
      setLocalBody(body);
    }
  }, [notes, currentSlide]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setLocalBody(v);

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      saveNote(currentSlide, v);
    }, 800);
  }

  async function copyAllNotes() {
    const sorted = [...notes]
      .filter((n) => n.body.trim())
      .sort((a, b) => a.slide - b.slide);

    if (sorted.length === 0) {
      toast.info("복사할 노트가 없습니다.");
      return;
    }

    const text = sorted
      .map((n) => `[슬라이드 ${n.slide + 1}]\n${n.body.trim()}`)
      .join("\n\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("모든 노트가 복사되었습니다.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("클립보드 복사에 실패했습니다.");
    }
  }

  const otherNotes = notes
    .filter((n) => n.slide !== currentSlide && n.body.trim())
    .sort((a, b) => a.slide - b.slide);

  return (
    <div className="rounded-2xl border bg-card p-4">
      {/* 발표자 노트 (읽기 전용 callout) */}
      {lectureNote && (
        <div className="mb-3 rounded-xl border border-indigo-200 bg-indigo-50/60 px-3 py-2.5 dark:border-indigo-900 dark:bg-indigo-950/30">
          <p className="mb-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
            발표자 노트
          </p>
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-indigo-900 dark:text-indigo-100">
            {lectureNote}
          </p>
        </div>
      )}

      {/* 개인 노트 입력 */}
      <div className="mb-3">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <label
            htmlFor="attendee-note-textarea"
            className="text-xs font-semibold text-foreground"
          >
            슬라이드 {currentSlide + 1} 내 노트
          </label>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            내 노트는 나만 볼 수 있어요
          </span>
        </div>
        <textarea
          id="attendee-note-textarea"
          value={localBody}
          onChange={handleChange}
          rows={4}
          placeholder="이 슬라이드에 대한 노트를 입력하세요. 자동 저장됩니다."
          className={cn(
            "w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5",
            "text-sm text-foreground placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500/40",
            "dark:bg-muted/10",
          )}
        />
      </div>

      {/* 다른 슬라이드 노트 칩 */}
      {otherNotes.length > 0 && (
        <div className="mb-3">
          <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
            다른 슬라이드 노트
          </p>
          <div className="flex flex-wrap gap-1.5">
            {otherNotes.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => onJumpToSlide?.(n.slide)}
                className={cn(
                  "inline-flex items-center rounded-lg border border-indigo-200 bg-indigo-50/60 px-2.5 py-1",
                  "text-[11px] font-medium text-indigo-700 transition-colors",
                  "dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-300",
                  onJumpToSlide
                    ? "cursor-pointer hover:border-indigo-400 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/50"
                    : "cursor-default",
                )}
                aria-label={`슬라이드 ${n.slide + 1}로 이동`}
              >
                슬라이드 {n.slide + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 전체 노트 복사 */}
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 text-xs"
        onClick={() => void copyAllNotes()}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        내 노트 전체 복사
      </Button>
    </div>
  );
}
