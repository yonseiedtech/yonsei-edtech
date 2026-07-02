"use client";

/**
 * PageCanvas — 디자인 페이지 렌더러 (편집기·미리보기·내보내기 공용).
 * 문서 원본 해상도(px) 기준 절대좌표로 그리고, CSS transform scale 로 축소 표시.
 * 내보내기는 scale=1 로 숨김 렌더 후 html-to-image 캡처.
 */

import type { CSSProperties } from "react";
import { STUDIO_ICONS } from "./studio-utils";
import type { DesignElement, DesignPage } from "./studio-types";

function elementStyle(el: DesignElement): CSSProperties {
  return {
    position: "absolute",
    left: el.x,
    top: el.y,
    width: el.w,
    height: el.h,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    opacity: el.opacity ?? 1,
  };
}

export function ElementView({ el }: { el: DesignElement }) {
  if (el.type === "text") {
    return (
      <div
        style={{
          ...elementStyle(el),
          fontSize: el.fontSize,
          fontWeight: el.fontWeight,
          fontFamily: el.fontFamily === "display" ? "var(--font-display)" : "var(--font-sans)",
          color: el.color,
          textAlign: el.align,
          lineHeight: el.lineHeight ?? 1.35,
          letterSpacing: el.letterSpacing != null ? `${el.letterSpacing}px` : undefined,
          whiteSpace: "pre-wrap",
          wordBreak: "keep-all",
          overflowWrap: "break-word",
        }}
      >
        {el.text}
      </div>
    );
  }
  if (el.type === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={el.src}
        alt=""
        crossOrigin="anonymous"
        style={{
          ...elementStyle(el),
          objectFit: el.fit,
          borderRadius: el.radius ?? 0,
        }}
      />
    );
  }
  if (el.type === "shape") {
    if (el.shape === "line") {
      return <div style={{ ...elementStyle(el), background: el.fill, borderRadius: el.h / 2 }} />;
    }
    return (
      <div
        style={{
          ...elementStyle(el),
          background: el.fill,
          borderRadius: el.shape === "circle" ? "50%" : el.radius ?? 0,
          border: el.strokeWidth ? `${el.strokeWidth}px solid ${el.strokeColor ?? "#1b1f27"}` : undefined,
        }}
      />
    );
  }
  // icon
  const Icon = STUDIO_ICONS[el.icon];
  if (!Icon) return null;
  return (
    <div style={{ ...elementStyle(el), display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon
        width="100%"
        height="100%"
        color={el.color}
        strokeWidth={el.strokeWidth ?? 1.8}
      />
    </div>
  );
}

export default function PageCanvas({
  page,
  width,
  height,
  scale = 1,
  className,
  canvasId,
  children,
}: {
  page: DesignPage;
  width: number;
  height: number;
  scale?: number;
  className?: string;
  /** 내보내기 캡처 대상 식별용 DOM id */
  canvasId?: string;
  /** 편집 오버레이 (선택 테두리·핸들) — 편집기에서만 전달 */
  children?: React.ReactNode;
}) {
  return (
    <div
      className={className}
      style={{ width: width * scale, height: height * scale, position: "relative", overflow: "hidden" }}
    >
      <div
        id={canvasId}
        style={{
          width,
          height,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "absolute",
          top: 0,
          left: 0,
          background: page.background,
        }}
      >
        {page.backgroundImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={page.backgroundImage}
            alt=""
            crossOrigin="anonymous"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
        {[...page.elements].map((el) => (
          <ElementView key={el.id} el={el} />
        ))}
        {children}
      </div>
    </div>
  );
}
