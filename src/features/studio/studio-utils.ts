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

export function newId(prefix = "el"): string {
  try {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  } catch {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }
}

/** 브랜드 팔레트 — 연세 네이비·골드 중심 (색 스프롤 방지: 스튜디오는 이 세트만 노출) */
export const BRAND_COLORS = [
  "#003378", // 네이비 (브랜드)
  "#0a4da3", // 밝은 네이비
  "#d4af37", // 골드
  "#1b1f27", // 잉크
  "#5b6472", // 그레이
  "#ffffff",
  "#f4f6fa", // 페이퍼
  "#2f7d5c", // 딥 그린 (보조)
] as const;

/** 캔버스에 삽입 가능한 큐레이션 아이콘 (일러스트 대용) */
export const STUDIO_ICONS: Record<string, LucideIcon> = {
  GraduationCap, BookOpen, Users, Calendar, MapPin, Star, Award, Lightbulb,
  Target, Sparkles, PenLine, FlaskConical, BarChart3, Presentation, Megaphone,
  Heart, Check, ArrowRight, Quote, PartyPopper, Trophy, Coffee, Mic, Globe,
};

/** 삽입 가능한 브랜드 이미지 자산 (public/) */
export const BRAND_ASSETS: { label: string; src: string }[] = [
  { label: "학회 엠블럼", src: "/icons/icon-512.png" },
  { label: "텍스트 로고", src: "/logo-text.png" },
  { label: "연세 캠퍼스", src: "/yonsei-campus.jpg" },
];

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
