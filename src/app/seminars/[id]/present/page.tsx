"use client";

/**
 * 세미나 라이브 프로젝터 화면 — /seminars/[id]/present
 * 대형 현재 슬라이드 + 입장 QR/코드 + 실시간 Q&A 티커(WallBoard present) + 설문 진행 배너.
 * 발표 스크린 전용(표시 위주, 고대비). 참가자는 QR 로 자기 기기에서 /live 접속.
 */

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Radio } from "lucide-react";
import { useLiveSession } from "@/features/seminar-live/useLiveSession";
import { useLivePollResults } from "@/features/seminar-live/useLivePollResults";
import { slideDecksApi } from "@/lib/bkend";
import SlideViewer from "@/features/seminar-live/SlideViewer";
import WallBoard from "@/features/comm-board/WallBoard";
import type { SeminarSlideDeck } from "@/types/seminar-live";

export default function SeminarPresentPage() {
  const params = useParams();
  const seminarId = String(params.id);
  const { session, loading } = useLiveSession(seminarId);
  const [deck, setDeck] = useState<SeminarSlideDeck | null>(null);
  const { count: pollCount } = useLivePollResults(session?.activePollId);

  const joinUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/seminars/${seminarId}/live`;
  }, [seminarId]);

  useEffect(() => {
    if (!session?.deckId) { setDeck(null); return; }
    let alive = true;
    slideDecksApi.get(session.deckId).then((d) => { if (alive) setDeck(d); }).catch(() => { if (alive) setDeck(null); });
    return () => { alive = false; };
  }, [session?.deckId]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-muted text-muted-foreground">불러오는 중…</div>;
  }

  const active = session && (session.status === "live" || session.status === "paused");

  return (
    <div className="flex h-screen flex-col bg-muted text-white">
      {/* 상단 바 */}
      <div className="flex items-center justify-between gap-3 border-b border-muted px-6 py-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-3 py-1 text-sm font-bold">
          <Radio size={15} /> LIVE
        </span>
        {active && session?.activePollId && (
          <span className="rounded-full bg-cat-1 px-3 py-1 text-sm font-semibold">
            설문 진행 중 · {pollCount}명 응답
          </span>
        )}
        <span className="text-sm text-neutral-400">
          참여코드 <b className="ml-1 font-mono text-lg tracking-widest text-white">{session?.joinCode ?? "----"}</b>
        </span>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* 슬라이드 */}
        <div className="flex flex-1 items-center justify-center p-6">
          {active ? (
            <SlideViewer
              pageImageUrls={deck?.pageImageUrls ?? []}
              currentSlide={session?.currentSlide ?? 0}
              className="max-h-full"
            />
          ) : (
            <div className="text-center text-neutral-400">
              <p className="text-2xl font-semibold">라이브 대기 중</p>
              <p className="mt-2 text-sm">발표자가 세션을 시작하면 슬라이드가 표시됩니다.</p>
            </div>
          )}
        </div>

        {/* 사이드바: QR + Q&A 티커 */}
        <aside className="flex w-80 shrink-0 flex-col border-l border-muted">
          <div className="flex flex-col items-center gap-2 border-b border-muted p-5">
            {joinUrl && (
              <div className="rounded-xl bg-white p-2">
                <QRCodeSVG value={joinUrl} size={128} />
              </div>
            )}
            <p className="text-center text-xs text-muted-foreground">
              휴대폰으로 QR을 스캔하거나<br />참여코드로 접속해 질문·설문에 참여하세요.
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden bg-muted">
            {session?.qaBoardId ? (
              <div className="h-full overflow-y-auto p-2">
                <WallBoard boardId={session.qaBoardId} variant="present" />
              </div>
            ) : (
              <div className="p-5 text-center text-xs text-muted-foreground">Q&A 대기 중</div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
