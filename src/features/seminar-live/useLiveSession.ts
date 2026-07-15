"use client";

/**
 * useLiveSession — 세미나 라이브 콘솔의 실시간 제어 문서 훅.
 *
 * 읽기: seminar_live_sessions/{seminarId} 를 onSnapshot 으로 구독 → 참가자·발표자·프로젝터
 *       화면이 currentSlide/activePollId/status 를 실시간 동기화한다.
 * 쓰기: 발표자·운영진만(rules 강제). seminarLiveApi(dataApi upsert/update) 경유.
 */

import { useCallback, useEffect, useState } from "react";
import { doc, onSnapshot, type DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { seminarLiveApi } from "@/lib/bkend";
import type { SeminarLiveSession, LiveStatus } from "@/types/seminar-live";
import { generateJoinCode } from "@/types/seminar-live";

/** Firestore Timestamp → ISO 문자열 정규화 (serverTimestamp 로 들어온 updatedAt 등) */
function toIso(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "seconds" in (v as Record<string, unknown>)) {
    const s = (v as { seconds: number }).seconds;
    return new Date(s * 1000).toISOString();
  }
  return undefined;
}

function normalize(id: string, raw: DocumentData): SeminarLiveSession {
  return {
    id,
    seminarId: (raw.seminarId as string) ?? id,
    status: (raw.status as LiveStatus) ?? "idle",
    presenterId: (raw.presenterId as string) ?? "",
    presenterName: (raw.presenterName as string) ?? "",
    deckId: raw.deckId as string | undefined,
    currentSlide: typeof raw.currentSlide === "number" ? raw.currentSlide : 0,
    totalSlides: typeof raw.totalSlides === "number" ? raw.totalSlides : 0,
    activePollId: raw.activePollId as string | undefined,
    qaBoardId: raw.qaBoardId as string | undefined,
    allowGuest: raw.allowGuest !== false,
    joinCode: (raw.joinCode as string) ?? "",
    participantCount: raw.participantCount as number | undefined,
    startedAt: toIso(raw.startedAt),
    endedAt: toIso(raw.endedAt),
    updatedAt: toIso(raw.updatedAt) ?? "",
  };
}

export interface StartLiveOptions {
  presenterId: string;
  presenterName: string;
  deckId?: string;
  totalSlides?: number;
  qaBoardId?: string;
  allowGuest?: boolean;
}

export function useLiveSession(seminarId: string) {
  const [session, setSession] = useState<SeminarLiveSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!seminarId) return;
    const ref = doc(db, "seminar_live_sessions", seminarId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setSession(snap.exists() ? normalize(snap.id, snap.data()) : null);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, [seminarId]);

  /** 라이브 세션 시작(또는 재개) — 없으면 생성, joinCode 유지 */
  const startLive = useCallback(
    async (opts: StartLiveOptions) => {
      await seminarLiveApi.upsert(seminarId, {
        seminarId,
        status: "live" as LiveStatus,
        presenterId: opts.presenterId,
        presenterName: opts.presenterName,
        deckId: opts.deckId ?? null,
        currentSlide: 0,
        totalSlides: opts.totalSlides ?? 0,
        activePollId: null,
        qaBoardId: opts.qaBoardId ?? null,
        allowGuest: opts.allowGuest !== false,
        joinCode: session?.joinCode || generateJoinCode(seminarId),
        startedAt: new Date().toISOString(),
      });
    },
    [seminarId, session?.joinCode],
  );

  const setStatus = useCallback(
    async (status: LiveStatus) => {
      await seminarLiveApi.update(seminarId, {
        status,
        ...(status === "ended" ? { endedAt: new Date().toISOString() } : {}),
      });
    },
    [seminarId],
  );

  /** 슬라이드 이동 — currentSlide write (참가자 onSnapshot 반영) */
  const gotoSlide = useCallback(
    async (index: number) => {
      const max = Math.max(0, (session?.totalSlides ?? 1) - 1);
      const next = Math.min(Math.max(0, index), max);
      await seminarLiveApi.update(seminarId, { currentSlide: next });
    },
    [seminarId, session?.totalSlides],
  );

  /** 발표 중인 장표 덱 교체 */
  const setDeck = useCallback(
    async (deckId: string, totalSlides: number) => {
      await seminarLiveApi.update(seminarId, { deckId, totalSlides, currentSlide: 0 });
    },
    [seminarId],
  );

  /** 라이브 설문 띄우기/내리기 (null = 내리기) */
  const setActivePoll = useCallback(
    async (pollId: string | null) => {
      // null = 활성 설문 내리기 (Firestore 는 null 로 필드 클리어)
      await seminarLiveApi.update(seminarId, { activePollId: pollId } as unknown as Partial<SeminarLiveSession>);
    },
    [seminarId],
  );

  const setQaBoard = useCallback(
    async (qaBoardId: string) => {
      await seminarLiveApi.update(seminarId, { qaBoardId });
    },
    [seminarId],
  );

  return {
    session,
    loading,
    startLive,
    setStatus,
    gotoSlide,
    setDeck,
    setActivePoll,
    setQaBoard,
  };
}
