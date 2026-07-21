"use client";

/**
 * 세미나 라이브 발표자·운영자 콘솔 — /seminars/[id]/live/host
 * 장표 업로드·슬라이드 제어·강의노트·설문 push·Q&A 모더레이션·참여 코드/QR.
 * 접근: 로그인 + 운영진(staff 이상). rules 도 presenterId/staff 만 write 허용.
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft, ArrowRight, Radio, Play, Pause, Square, Monitor, ExternalLink, Presentation,
} from "lucide-react";
import { toast } from "sonner";
import { useLiveSession } from "@/features/seminar-live/useLiveSession";
import { ensureSeminarQaBoard } from "@/features/seminar-live/ensure-qa-board";
import SlideViewer from "@/features/seminar-live/SlideViewer";
import SlideUploader from "@/features/seminar-live/SlideUploader";
import LectureNotesEditor from "@/features/seminar-live/LectureNotesEditor";
import LivePollControl from "@/features/seminar-live/LivePollControl";
import WallBoard from "@/features/comm-board/WallBoard";
import { slideDecksApi, seminarsApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import { isStaffOrAbove } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SeminarSlideDeck } from "@/types/seminar-live";
import type { Seminar } from "@/types/seminar";

export default function SeminarLiveHostPage() {
  const params = useParams();
  const seminarId = String(params.id);
  const { user } = useAuthStore();
  const { session, loading, startLive, setStatus, gotoSlide, setDeck, setActivePoll } = useLiveSession(seminarId);

  const [seminar, setSeminar] = useState<Seminar | null>(null);
  const [decks, setDecks] = useState<SeminarSlideDeck[]>([]);
  const [currentDeck, setCurrentDeck] = useState<SeminarSlideDeck | null>(null);
  const [busy, setBusy] = useState(false);

  const isStaff = !!user && isStaffOrAbove(user);

  const joinUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/seminars/${seminarId}/live`;
  }, [seminarId]);

  useEffect(() => {
    seminarsApi.get(seminarId).then(setSeminar).catch(() => setSeminar(null));
  }, [seminarId]);

  useEffect(() => {
    slideDecksApi.listBySeminar(seminarId).then((r) => setDecks(r.data)).catch(() => setDecks([]));
  }, [seminarId]);

  // 현재 덱 동기화: session.deckId 우선, 없으면 최신 덱
  useEffect(() => {
    const wanted = session?.deckId ?? decks[0]?.id;
    if (!wanted) { setCurrentDeck(null); return; }
    const found = decks.find((d) => d.id === wanted);
    if (found) { setCurrentDeck(found); return; }
    let alive = true;
    slideDecksApi.get(wanted).then((d) => { if (alive) setCurrentDeck(d); }).catch(() => {});
    return () => { alive = false; };
  }, [session?.deckId, decks]);

  const current = session?.currentSlide ?? 0;
  const total = currentDeck?.pageCount ?? 0;
  const status = session?.status ?? "idle";
  const isLive = status === "live" || status === "paused";

  async function handleStart() {
    if (!user) return;
    setBusy(true);
    try {
      const qaBoardId = await ensureSeminarQaBoard(seminarId, user.id, user.name, `${seminar?.title ?? "세미나"} 실시간 Q&A`);
      await startLive({
        presenterId: user.id,
        presenterName: user.name,
        deckId: currentDeck?.id,
        totalSlides: currentDeck?.pageCount ?? 0,
        qaBoardId,
        allowGuest: true,
      });
      toast.success("라이브 세션을 시작했습니다.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "시작에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeckUploaded(deck: SeminarSlideDeck) {
    setDecks((prev) => [deck, ...prev]);
    setCurrentDeck(deck);
    if (isLive) {
      try { await setDeck(deck.id, deck.pageCount); } catch { /* noop */ }
    }
    toast.success("장표가 업로드되었습니다.");
  }

  async function selectDeck(deck: SeminarSlideDeck) {
    setCurrentDeck(deck);
    if (isLive) {
      try { await setDeck(deck.id, deck.pageCount); } catch { toast.error("장표 전환 실패"); }
    }
  }

  if (!user) {
    return <Gate>로그인 후 이용할 수 있습니다.</Gate>;
  }
  if (!isStaff) {
    return <Gate>라이브 콘솔은 운영진만 이용할 수 있습니다.</Gate>;
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/seminars/${seminarId}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft size={13} /> 세미나로
          </Link>
          <h1 className="mt-1 flex items-center gap-2 text-lg font-bold">
            <Presentation size={18} className="text-cat-1" />
            라이브 콘솔
          </h1>
          <p className="truncate text-xs text-muted-foreground">{seminar?.title ?? seminarId}</p>
        </div>
        <div className="flex items-center gap-2">
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-2.5 py-1 text-[11px] font-bold text-white">
              <Radio size={12} /> LIVE{status === "paused" && " (일시정지)"}
            </span>
          ) : (
            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">대기</span>
          )}
        </div>
      </div>

      {/* 세션 제어 */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-3">
        {!isLive ? (
          <Button size="sm" onClick={handleStart} disabled={busy}>
            <Play size={14} className="mr-1" /> 라이브 시작
          </Button>
        ) : (
          <>
            {status === "live" ? (
              <Button size="sm" variant="outline" onClick={() => setStatus("paused")}>
                <Pause size={14} className="mr-1" /> 일시정지
              </Button>
            ) : (
              <Button size="sm" onClick={() => setStatus("live")}>
                <Play size={14} className="mr-1" /> 재개
              </Button>
            )}
            <Button size="sm" variant="outline" className="text-destructive" onClick={() => { if (confirm("라이브를 종료할까요?")) setStatus("ended"); }}>
              <Square size={14} className="mr-1" /> 종료
            </Button>
          </>
        )}
        <div className="mx-1 h-5 w-px bg-border" />
        <Link href={`/seminars/${seminarId}/present`} target="_blank" className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium hover:bg-accent">
          <Monitor size={13} /> 발표 스크린 <ExternalLink size={11} />
        </Link>
        <Link href={`/seminars/${seminarId}/live`} target="_blank" className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium hover:bg-accent">
          참가자 화면 <ExternalLink size={11} />
        </Link>
        {session?.joinCode && (
          <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <QRCodeSVG value={joinUrl} size={40} />
            참여코드 <b className="font-mono text-base tracking-widest text-foreground">{session.joinCode}</b>
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* 좌: 슬라이드 + 노트 */}
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border bg-card p-3">
            <SlideViewer pageImageUrls={currentDeck?.pageImageUrls ?? []} currentSlide={current} />
            {total > 0 && (
              <div className="mt-2 flex items-center justify-center gap-2">
                <Button size="sm" variant="outline" onClick={() => gotoSlide(current - 1)} disabled={!isLive || current <= 0}>
                  <ArrowLeft size={14} />
                </Button>
                <span className="text-xs tabular-nums text-muted-foreground">{current + 1} / {total}</span>
                <Button size="sm" variant="outline" onClick={() => gotoSlide(current + 1)} disabled={!isLive || current >= total - 1}>
                  <ArrowRight size={14} />
                </Button>
              </div>
            )}
            {/* 썸네일 스트립 */}
            {currentDeck && currentDeck.pageImageUrls.length > 1 && (
              <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
                {currentDeck.pageImageUrls.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => isLive && gotoSlide(i)}
                    className={cn(
                      "relative h-12 w-20 shrink-0 overflow-hidden rounded border-2 transition",
                      i === current ? "border-cat-1" : "border-transparent opacity-70 hover:opacity-100",
                    )}
                    title={`슬라이드 ${i + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`슬라이드 ${i + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 장표 업로드 / 덱 선택 */}
          <div className="rounded-2xl border bg-card p-3">
            <h3 className="mb-2 text-sm font-semibold">장표 (PDF)</h3>
            <SlideUploader seminarId={seminarId} onUploaded={handleDeckUploaded} />
            {decks.length > 0 && (
              <ul className="mt-3 space-y-1">
                {decks.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => selectDeck(d)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition hover:bg-accent",
                        d.id === currentDeck?.id ? "border-cat-1 bg-cat-1/5" : "border-border",
                      )}
                    >
                      <span className="truncate font-medium">{d.title}</span>
                      <span className="shrink-0 text-muted-foreground">{d.pageCount}p</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {currentDeck && (
            <LectureNotesEditor
              deck={currentDeck}
              currentSlide={current}
              onDeckUpdated={(d) => { setCurrentDeck(d); setDecks((prev) => prev.map((x) => (x.id === d.id ? d : x))); }}
            />
          )}
        </div>

        {/* 우: 설문 + Q&A */}
        <div className="space-y-4">
          <LivePollControl
            seminarId={seminarId}
            activePollId={session?.activePollId}
            onPushPoll={(pollId) => setActivePoll(pollId)}
          />
          {session?.qaBoardId && (
            <div className="rounded-2xl border bg-card p-2">
              <h3 className="px-1 pb-1 pt-1 text-sm font-semibold">실시간 Q&A</h3>
              <div className="max-h-[520px] overflow-y-auto">
                <WallBoard boardId={session.qaBoardId} variant="wall" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Gate({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-md p-10 text-center">
      <div className="rounded-2xl border bg-card p-8 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}
