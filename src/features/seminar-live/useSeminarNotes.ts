"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/features/auth/auth-store";
import { seminarNotesApi } from "@/lib/bkend";
import type { SeminarNoteEntry } from "@/types/seminar-live";

// ── 로컬스토리지 헬퍼 (게스트 전용) ──────────────────────────────────────────

function localKey(seminarId: string): string {
  return `seminar-notes:${seminarId}`;
}

function makeGuestNote(seminarId: string, slide: number, body: string): SeminarNoteEntry {
  const now = new Date().toISOString();
  return {
    id: `local-${slide}`,
    seminarId,
    ownerId: "guest",
    slide,
    body,
    createdAt: now,
    updatedAt: now,
  };
}

function readLocalNotes(seminarId: string): SeminarNoteEntry[] {
  try {
    const raw = localStorage.getItem(localKey(seminarId));
    if (!raw) return [];
    const obj = JSON.parse(raw) as Record<string, unknown>;
    return Object.entries(obj).flatMap(([k, v]) => {
      const slide = Number(k);
      if (!Number.isFinite(slide) || typeof v !== "string") return [];
      return [makeGuestNote(seminarId, slide, v)];
    });
  } catch {
    return [];
  }
}

function writeLocalNotes(seminarId: string, notes: SeminarNoteEntry[]): void {
  try {
    const obj: Record<string, string> = {};
    for (const n of notes) {
      if (n.body.trim()) obj[String(n.slide)] = n.body;
    }
    localStorage.setItem(localKey(seminarId), JSON.stringify(obj));
  } catch {
    /* localStorage 접근 불가 시 무시 */
  }
}

// ── 훅 공개 인터페이스 ─────────────────────────────────────────────────────

export interface SeminarNotesHook {
  notes: SeminarNoteEntry[];
  loading: boolean;
  saveNote: (slide: number, body: string) => void;
  deleteNote: (id: string) => void;
}

/**
 * 세미나 참가자 개인 노트 훅.
 *
 * - 로그인 사용자: bkend API 에서 로드, 슬라이드당 1노트 upsert (800ms debounce).
 * - 게스트: localStorage 에만 보관 (서버 저장 없음, 개인정보 보호).
 */
export function useSeminarNotes(seminarId: string): SeminarNotesHook {
  const { user } = useAuthStore();
  const userId = user?.id ?? null;

  const [notes, setNotes] = useState<SeminarNoteEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // 최신 notes 를 타이머 콜백에서 안전하게 읽기 위한 ref
  const notesRef = useRef<SeminarNoteEntry[]>([]);
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  // 슬라이드별 debounce 타이머
  const saveTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  // ── 초기 로드 ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!seminarId) return;
    setNotes([]);

    if (userId) {
      setLoading(true);
      seminarNotesApi
        .listMine(seminarId, userId)
        .then(({ data }) => setNotes(data))
        .catch(() => setNotes([]))
        .finally(() => setLoading(false));
    } else {
      setNotes(readLocalNotes(seminarId));
    }
  }, [seminarId, userId]);

  // ── saveNote (upsert, 슬라이드당 1노트) ──────────────────────────────
  const saveNote = useCallback(
    (slide: number, body: string) => {
      // 낙관적 업데이트
      setNotes((prev) => {
        const exists = prev.find((n) => n.slide === slide);
        const now = new Date().toISOString();
        const next = exists
          ? prev.map((n) => (n.slide === slide ? { ...n, body, updatedAt: now } : n))
          : [...prev, makeGuestNote(seminarId, slide, body)];
        // 게스트: localStorage 동기 저장
        if (!userId) writeLocalNotes(seminarId, next);
        return next;
      });

      if (!userId) return; // 게스트는 여기서 완료

      // 로그인: 800ms debounce 서버 저장
      const prev = saveTimers.current.get(slide);
      if (prev) clearTimeout(prev);

      const timer = setTimeout(() => {
        saveTimers.current.delete(slide);
        const note = notesRef.current.find((n) => n.slide === slide);
        if (!note) return;

        if (note.id.startsWith("local-")) {
          // 신규 생성
          seminarNotesApi
            .create({
              seminarId,
              ownerId: userId,
              slide,
              body: note.body,
            })
            .then((created) =>
              setNotes((p) => p.map((n) => (n.slide === slide ? created : n))),
            )
            .catch(() => {/* 저장 실패는 다음 debounce 에서 재시도 */});
        } else {
          // 기존 업데이트
          seminarNotesApi
            .update(note.id, { body: note.body, updatedAt: new Date().toISOString() })
            .catch(() => {/* 저장 실패는 다음 debounce 에서 재시도 */});
        }
      }, 800);

      saveTimers.current.set(slide, timer);
    },
    [seminarId, userId],
  );

  // ── deleteNote ────────────────────────────────────────────────────────
  const deleteNote = useCallback(
    (id: string) => {
      setNotes((prev) => {
        const next = prev.filter((n) => n.id !== id);
        if (!userId) writeLocalNotes(seminarId, next);
        return next;
      });
      if (userId && !id.startsWith("local-")) {
        seminarNotesApi.delete(id).catch(() => {/* silent */});
      }
    },
    [seminarId, userId],
  );

  return { notes, loading, saveNote, deleteNote };
}
