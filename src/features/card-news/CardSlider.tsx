"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardArt } from "./art";
import { exportCardToPng } from "./download";
import type { CardSpec } from "./types";

interface CardSliderProps {
  cards: CardSpec[];
  seriesId: string;
}

export default function CardSlider({ cards, seriesId }: CardSliderProps) {
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{ startX: number; lastX: number; active: boolean }>({
    startX: 0,
    lastX: 0,
    active: false,
  });
  const [dragOffset, setDragOffset] = useState(0);

  const total = cards.length;
  const clampIndex = useCallback(
    (n: number) => Math.max(0, Math.min(total - 1, n)),
    [total],
  );

  const goPrev = useCallback(() => setIndex((i) => clampIndex(i - 1)), [clampIndex]);
  const goNext = useCallback(() => setIndex((i) => clampIndex(i + 1)), [clampIndex]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext]);

  function onPointerDown(e: React.PointerEvent) {
    dragState.current = { startX: e.clientX, lastX: e.clientX, active: true };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragState.current.active) return;
    dragState.current.lastX = e.clientX;
    setDragOffset(e.clientX - dragState.current.startX);
  }
  function onPointerUp() {
    if (!dragState.current.active) return;
    const delta = dragState.current.lastX - dragState.current.startX;
    const threshold = 60;
    if (delta > threshold) goPrev();
    else if (delta < -threshold) goNext();
    dragState.current.active = false;
    setDragOffset(0);
  }

  async function downloadCurrent() {
    const card = cards[index];
    if (!card) return;
    const el = refs.current[card.id];
    if (!el) return;
    setBusy(card.id);
    try {
      await exportCardToPng(el, `${seriesId}-${card.id}.png`);
    } finally {
      setBusy(null);
    }
  }

  async function downloadAll() {
    setBulkBusy(true);
    try {
      for (const card of cards) {
        const el = refs.current[card.id];
        if (!el) continue;
        await exportCardToPng(el, `${seriesId}-${card.id}.png`);
        await new Promise((r) => setTimeout(r, 250));
      }
    } finally {
      setBulkBusy(false);
    }
  }

  const dotsView = useMemo(() => {
    if (total <= 12) {
      return (
        <div className="flex items-center justify-center gap-1.5">
          {cards.map((c, i) => (
            <button
              key={c.id}
              type="button"
              aria-label={`${i + 1}번 슬라이드로 이동`}
              onClick={() => setIndex(i)}
              className={
                "h-2 rounded-full transition-all " +
                (i === index ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60")
              }
            />
          ))}
        </div>
      );
    }
    return (
      <div className="text-sm font-medium text-muted-foreground">
        {index + 1} / {total}
      </div>
    );
  }, [cards, index, total]);

  return (
    <div className="space-y-4">
      <div
        ref={containerRef}
        className="relative mx-auto w-full max-w-[640px]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ touchAction: "pan-y" }}
      >
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-muted shadow-xl">
          <div
            className="flex h-full"
            style={{
              width: `${total * 100}%`,
              transform: `translateX(calc(${(-index * 100) / total}% + ${dragOffset}px))`,
              transition: dragOffset === 0 ? "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)" : "none",
            }}
          >
            {cards.map((card) => (
              <div
                key={card.id}
                className="relative h-full shrink-0"
                style={{ width: `${100 / total}%` }}
              >
                <div
                  className="absolute left-0 top-0"
                  style={{
                    width: 1080,
                    height: 1080,
                    transform: "scale(var(--cn-scale))",
                    transformOrigin: "top left",
                  }}
                >
                  <CardArt
                    spec={card}
                    refCb={(el) => {
                      refs.current[card.id] = el;
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          aria-label="이전 슬라이드"
          onClick={goPrev}
          disabled={index === 0}
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/90 p-2 shadow-lg backdrop-blur transition hover:bg-background disabled:opacity-30 sm:-left-12"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="다음 슬라이드"
          onClick={goNext}
          disabled={index === total - 1}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/90 p-2 shadow-lg backdrop-blur transition hover:bg-background disabled:opacity-30 sm:-right-12"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="mx-auto flex max-w-[640px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {dotsView}
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" onClick={downloadCurrent} disabled={!!busy || bulkBusy}>
            {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Download className="mr-1 h-3 w-3" />}
            현재 슬라이드 PNG
          </Button>
          <Button size="sm" onClick={downloadAll} disabled={bulkBusy || !!busy}>
            {bulkBusy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Download className="mr-1 h-3 w-3" />}
            전체 ({total}장)
          </Button>
        </div>
      </div>

      <style jsx>{`
        :global(:root) {
          --cn-scale: 0.5926;
        }
        @media (max-width: 640px) {
          :global(:root) {
            --cn-scale: 0.3148;
          }
        }
      `}</style>
    </div>
  );
}
