"use client";

import { useEffect, useRef, useState } from "react";
import { CardArt } from "./art";
import type { CardSpec } from "./types";

interface CardArtFitProps {
  spec: CardSpec;
  refCb?: (el: HTMLDivElement | null) => void;
  className?: string;
}

export function CardArtFit({ spec, refCb, className }: CardArtFitProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    const update = () => {
      const w = node.getBoundingClientRect().width;
      if (w > 0) setScale(w / 1080);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      className={`relative aspect-square w-full overflow-hidden ${className ?? ""}`}
    >
      {scale > 0 && (
        <div
          style={{
            width: 1080,
            height: 1080,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "absolute",
            left: 0,
            top: 0,
          }}
        >
          <CardArt spec={spec} refCb={refCb} />
        </div>
      )}
    </div>
  );
}
