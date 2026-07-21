"use client";

/**
 * 세미나 라이브 참가자 뷰 — /seminars/[id]/live
 * 발표자와 동기화된 슬라이드 + 내 노트 / Q&A / 설문 탭.
 */

import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarClock, Radio, StickyNote, MessageCircleQuestion, BarChart3, Eye } from "lucide-react";
import { useLiveSession } from "@/features/seminar-live/useLiveSession";
import { slideDecksApi } from "@/lib/bkend";
import SlideViewer from "@/features/seminar-live/SlideViewer";
import AttendeeNotesPanel from "@/features/seminar-live/AttendeeNotesPanel";
import LivePollRespond from "@/features/seminar-live/LivePollRespond";
import WallBoard from "@/features/comm-board/WallBoard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SeminarSlideDeck } from "@/types/seminar-live";

type Tab = "notes" | "qa" | "poll";

export default function SeminarLivePage() {
  const params = useParams();
  const seminarId = String(params.id);
  const { session, loading } = useLiveSession(seminarId);

  const [deck, setDeck] = useState<SeminarSlideDeck | null>(null);
  const [follow, setFollow] = useState(true);
  const [localSlide, setLocalSlide] = useState(0);
  const [tab, setTab] = useState<Tab>("notes");

  useEffect(() => {
    if (!session?.deckId) { setDeck(null); return; }
    let alive = true;
    slideDecksApi.get(session.deckId).then((d) => { if (alive) setDeck(d); }).catch(() => { if (alive) setDeck(null); });
    return () => { alive = false; };
  }, [session?.deckId]);

  useEffect(() => {
    if (follow && session) setLocalSlide(session.currentSlide);
  }, [follow, session?.currentSlide, session]);

  const live = session?.status === "live" || session?.status === "paused";
  const shownSlide = follow ? (session?.currentSlide ?? 0) : localSlide;
  const total = deck?.pageCount ?? session?.totalSlides ?? 0;
  const lectureNote = deck?.lectureNotes?.[shownSlide];

  if (loading) {
    return <div className="mx-auto max-w-3xl p-6 text-sm text-muted-foreground">라이브 세션을 불러오는 중…</div>;
  }

  if (!session || session.status === "idle") {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <BackLink seminarId={seminarId} />
        <div className="mt-6 rounded-2xl border bg-card p-8 text-center">
          <CalendarClock className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-medium">라이브가 아직 시작되지 않았습니다.</p>
          <p className="mt-1 text-xs text-muted-foreground">발표자가 세션을 시작하면 이 화면에서 실시간으로 참여할 수 있어요.</p>
        </div>
      </div>
    );
  }

  if (session.status === "ended") {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <BackLink seminarId={seminarId} />
        <div className="mt-6 rounded-2xl border bg-card p-8 text-center">
          <p className="text-sm font-medium">라이브 세션이 종료되었습니다.</p>
          <p className="mt-1 text-xs text-muted-foreground">세미나 페이지에서 자료와 Q&A 기록을 확인하세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <BackLink seminarId={seminarId} />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-2.5 py-1 text-[11px] font-bold text-white">
          <Radio size={12} /> LIVE
          {session.status === "paused" && <span className="ml-1 opacity-80">(일시정지)</span>}
        </span>
      </div>

      {/* 동기화 슬라이드 */}
      <div className="rounded-2xl border bg-card p-3">
        <SlideViewer pageImageUrls={deck?.pageImageUrls ?? []} currentSlide={shownSlide} />
        <div className="mt-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setFollow((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition",
              follow
                ? "border-cat-1 bg-cat-1 text-white"
                : "border-border bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            <Eye size={12} /> {follow ? "발표자 따라가는 중" : "자유 열람"}
          </button>
          {!follow && total > 0 && (
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setLocalSlide((s) => Math.max(0, s - 1))} disabled={shownSlide <= 0}>
                <ArrowLeft size={13} />
              </Button>
              <span className="text-[11px] tabular-nums text-muted-foreground">{shownSlide + 1} / {total}</span>
              <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setLocalSlide((s) => Math.min(total - 1, s + 1))} disabled={shownSlide >= total - 1}>
                <ArrowRight size={13} />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 탭 */}
      <div className="mt-4 flex gap-1 rounded-xl bg-muted/40 p-1">
        <TabButton active={tab === "notes"} onClick={() => setTab("notes")} icon={<StickyNote size={13} />}>내 노트</TabButton>
        <TabButton active={tab === "qa"} onClick={() => setTab("qa")} icon={<MessageCircleQuestion size={13} />}>Q&A</TabButton>
        <TabButton active={tab === "poll"} onClick={() => setTab("poll")} icon={<BarChart3 size={13} />}>
          설문{session.activePollId && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-destructive" />}
        </TabButton>
      </div>

      <div className="mt-3">
        {tab === "notes" && (
          <AttendeeNotesPanel seminarId={seminarId} currentSlide={shownSlide} lectureNote={lectureNote} />
        )}
        {tab === "qa" && (
          session.qaBoardId
            ? <WallBoard boardId={session.qaBoardId} variant="wall" />
            : <EmptyPanel icon={<MessageCircleQuestion />} text="Q&A 보드가 아직 연결되지 않았습니다." />
        )}
        {tab === "poll" && (
          session.activePollId
            ? <LivePollRespond pollId={session.activePollId} />
            : <EmptyPanel icon={<BarChart3 />} text="진행 중인 설문이 없습니다. 발표자가 설문을 띄우면 여기에 표시됩니다." />
        )}
      </div>
    </div>
  );
}

function BackLink({ seminarId }: { seminarId: string }) {
  return (
    <Link href={`/seminars/${seminarId}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
      <ArrowLeft size={13} /> 세미나로
    </Link>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition",
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}{children}
    </button>
  );
}

function EmptyPanel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed bg-muted/20 p-8 text-center text-xs text-muted-foreground">
      <span className="mx-auto mb-2 block w-fit opacity-60">{icon}</span>
      {text}
    </div>
  );
}
