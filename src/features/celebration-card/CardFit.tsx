"use client";

import { useEffect, useRef, useState } from "react";
import { CardArt, CARD_W, CARD_H } from "./CardArt";
import type { CelebrationCardData } from "./types";

interface CardFitProps {
  data: CelebrationCardData;
  /** Attach to the inner card root for export capture */
  refCb?: (el: HTMLDivElement | null) => void;
  className?: string;
}

/**
 * Scales the 540×1026 CardArt to fill its container width.
 * Uses ResizeObserver — the same pattern as card-news/CardArtFit.tsx.
 */
export function CardFit({ data, refCb, className }: CardFitProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    const update = () => {
      const w = node.getBoundingClientRect().width;
      if (w > 0) setScale(w / CARD_W);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      className={`relative w-full overflow-hidden ${className ?? ""}`}
      style={{ aspectRatio: `${CARD_W} / ${CARD_H}` }}
    >
      {scale > 0 && (
        <div
          style={{
            width: CARD_W,
            height: CARD_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "absolute",
            left: 0,
            top: 0,
          }}
        >
          <CardArt data={data} refCb={refCb} />
        </div>
      )}
    </div>
  );
}
