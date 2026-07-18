// 디자인 스튜디오 공용 유틸 — 요소 팩토리·아이콘 큐레이션·브랜드 팔레트

import {
  GraduationCap, BookOpen, Users, Calendar, MapPin, Star, Award, Lightbulb,
  Target, Sparkles, PenLine, FlaskConical, BarChart3, Presentation, Megaphone,
  Heart, Check, ArrowRight, Quote, PartyPopper, Trophy, Coffee, Mic, Globe,
  type LucideIcon,
} from "lucide-react";
import type {
  DesignElement, TextElement, ImageElement, ShapeElement, IconElement, DesignPage,
} from "./studio-types";
import type { CanvasSize } from "./studio-types";
import { BRAND_SWATCHES, BRAND_ASSET_LIST } from "./brand-kit";

export function newId(prefix = "el"): string {
  try {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  } catch {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }
}

/** 브랜드 팔레트 — 브랜드 킷 단일 소스에서 파생 (색 스프롤 방지) */
export const BRAND_COLORS = BRAND_SWATCHES;

/** 캔버스에 삽입 가능한 큐레이션 아이콘 (일러스트 대용) */
export const STUDIO_ICONS: Record<string, LucideIcon> = {
  GraduationCap, BookOpen, Users, Calendar, MapPin, Star, Award, Lightbulb,
  Target, Sparkles, PenLine, FlaskConical, BarChart3, Presentation, Megaphone,
  Heart, Check, ArrowRight, Quote, PartyPopper, Trophy, Coffee, Mic, Globe,
};

/** 삽입 가능한 브랜드 이미지 자산 (public/) — 브랜드 킷 파생 */
export const BRAND_ASSETS: { label: string; src: string }[] = BRAND_ASSET_LIST;

export function makeText(partial: Partial<TextElement> = {}): TextElement {
  return {
    id: newId(),
    type: "text",
    x: 80, y: 80, w: 600, h: 120,
    text: "텍스트를 입력하세요",
    fontSize: 48,
    fontWeight: 700,
    fontFamily: "sans",
    color: "#1b1f27",
    align: "left",
    lineHeight: 1.35,
    ...partial,
  };
}

export function makeImage(src: string, partial: Partial<ImageElement> = {}): ImageElement {
  return {
    id: newId(),
    type: "image",
    x: 100, y: 100, w: 400, h: 300,
    src,
    fit: "cover",
    radius: 0,
    ...partial,
  };
}

export function makeShape(shape: ShapeElement["shape"], partial: Partial<ShapeElement> = {}): ShapeElement {
  return {
    id: newId(),
    type: "shape",
    x: 120, y: 120,
    w: shape === "line" ? 400 : 240,
    h: shape === "line" ? 6 : 240,
    shape,
    fill: "#003378",
    radius: shape === "rect" ? 16 : undefined,
    ...partial,
  };
}

export function makeIcon(icon: string, partial: Partial<IconElement> = {}): IconElement {
  return {
    id: newId(),
    type: "icon",
    x: 140, y: 140, w: 120, h: 120,
    icon,
    color: "#003378",
    strokeWidth: 1.8,
    ...partial,
  };
}

export function makePage(background = "#ffffff", elements: DesignElement[] = []): DesignPage {
  return { id: newId("pg"), background, elements };
}

// ── 매직 리사이즈 (2026-07-18, 벤치마크 M2) ──
// 한 요소를 스케일 s + 오프셋으로 재배치. 좌표·크기·폰트·선 굵기를 비례 조정한다.
function scaleElement(el: DesignElement, s: number, offX: number, offY: number): DesignElement {
  const base = {
    x: Math.round(el.x * s + offX),
    y: Math.round(el.y * s + offY),
    w: Math.round(el.w * s),
    h: Math.round(el.h * s),
  };
  if (el.type === "text") {
    return {
      ...el, ...base,
      fontSize: Math.max(8, Math.round(el.fontSize * s)),
      letterSpacing: el.letterSpacing != null ? el.letterSpacing * s : undefined,
    };
  }
  if (el.type === "shape") {
    return {
      ...el, ...base,
      radius: el.radius != null ? Math.round(el.radius * s) : undefined,
      strokeWidth: el.strokeWidth != null ? Math.max(1, Math.round(el.strokeWidth * s)) : undefined,
    };
  }
  if (el.type === "image") {
    return { ...el, ...base, radius: el.radius != null ? Math.round(el.radius * s) : undefined };
  }
  // icon — 굵기는 크기 대비 상대값이라 그대로 유지
  return { ...el, ...base };
}

/**
 * 페이지 배열을 새 캔버스 크기로 리사이즈(복제용). 단순 비례 스케일 + 중앙 정렬로
 * "시작점"을 만든다 — 완벽한 재배치가 아니라 편집 출발점 제공이 목표.
 * 새 id 를 부여해 원본과 독립된 복제본을 만든다.
 */
export function resizePages(pages: DesignPage[], from: CanvasSize, to: CanvasSize): DesignPage[] {
  const s = Math.min(to.width / from.width, to.height / from.height);
  const offX = (to.width - from.width * s) / 2;
  const offY = (to.height - from.height * s) / 2;
  return pages.map((p) => ({
    id: newId("pg"),
    background: p.background,
    backgroundImage: p.backgroundImage,
    elements: p.elements.map((el) => ({ ...scaleElement(el, s, offX, offY), id: newId() })),
  }));
}
