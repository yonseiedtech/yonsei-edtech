"use client";

import { cn } from "@/lib/utils";

interface SlideViewerProps {
  pageImageUrls: string[];
  currentSlide: number;
  className?: string;
}

/**
 * 장표 슬라이드 뷰어 — 순수 표시 컴포넌트 (데이터 패칭 없음).
 * 16:9 비율 컨테이너에 현재 페이지 PNG 를 object-contain 으로 렌더링한다.
 * 다음 페이지를 미리 로딩하여 넘김 시 지연을 최소화한다.
 */
export default function SlideViewer({
  pageImageUrls,
  currentSlide,
  className,
}: SlideViewerProps) {
  const total = pageImageUrls.length;
  const src = pageImageUrls[currentSlide];
  const nextSrc = pageImageUrls[currentSlide + 1];

  if (total === 0 || !src) {
    return (
      <div
        className={cn(
          "flex aspect-video w-full items-center justify-center rounded-2xl border bg-card text-sm text-muted-foreground",
          className,
        )}
      >
        장표가 아직 업로드되지 않았습니다.
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {/* 16:9 슬라이드 컨테이너 — 검정 배경으로 레터박싱 */}
      <div className="relative w-full overflow-hidden rounded-2xl border bg-black">
        <div className="aspect-video w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={currentSlide}
            src={src}
            alt={`슬라이드 ${currentSlide + 1}`}
            className="h-full w-full object-contain"
          />
        </div>
      </div>

      {/* 다음 슬라이드 미리 로딩 */}
      {nextSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={nextSrc} alt="" aria-hidden className="hidden" />
      )}

      <p className="text-center text-xs text-muted-foreground">
        슬라이드 {currentSlide + 1} / {total}
      </p>
    </div>
  );
}
