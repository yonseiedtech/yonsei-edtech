// ── 디자인 스튜디오 (2026-07-02) — 카드뉴스·포스터·발표 슬라이드 자유 편집 ──
//
// 기존 카드뉴스(CardSpec)는 고정 템플릿(필드 채우기) 모델. 스튜디오는 Canva 식
// "요소(element) 배열 + 좌표" 자유 캔버스 모델로, 회원 누구나 본인 문서를 만들고
// 세미나·스터디·대외활동과 연계(프리필·포스터 게시)할 수 있다.
//
// 좌표계: 문서 원본 해상도(px) 기준 절대좌표. 렌더는 CSS transform scale 로 축소.
// Firestore `design_documents` — 본인 rw, published=true 는 회원 read.

export type DesignDocType = "cardnews" | "poster" | "ppt";

export const DESIGN_DOC_TYPE_LABELS: Record<DesignDocType, string> = {
  cardnews: "카드뉴스",
  poster: "포스터",
  ppt: "발표 슬라이드",
};

export interface CanvasSize {
  width: number;
  height: number;
}

/** 문서 타입별 캔버스 크기 (px) */
export const DESIGN_CANVAS_SIZES: Record<DesignDocType, CanvasSize> = {
  cardnews: { width: 1080, height: 1080 },
  poster: { width: 1080, height: 1350 }, // 인스타 세로형 4:5
  ppt: { width: 1280, height: 720 },     // 16:9
};

/**
 * 매직 리사이즈 프리셋 (2026-07-18, 벤치마크 M2 — Canva 매직 리사이즈 원리).
 * 현재 디자인을 다른 포맷으로 복제할 때의 목표 캔버스 크기. 단순 스케일+중앙 정렬로
 * "시작점"을 제공한다 (완벽 재배치는 목표 아님).
 */
export const DESIGN_RESIZE_PRESETS: { key: string; label: string; size: CanvasSize }[] = [
  { key: "square", label: "정방 카드뉴스", size: { width: 1080, height: 1080 } },
  { key: "og", label: "OG 이미지 (링크 미리보기)", size: { width: 1200, height: 630 } },
  { key: "story", label: "세로 스토리", size: { width: 1080, height: 1920 } },
];

/**
 * 문서의 실제 캔버스 크기. 매직 리사이즈로 만든 문서는 canvasSize 오버라이드를 갖고,
 * 없으면 docType 기본 크기를 쓴다(기존 문서 하위호환).
 */
export function resolveCanvasSize(
  doc: { docType: DesignDocType; canvasSize?: CanvasSize } | null | undefined,
): CanvasSize {
  if (doc?.canvasSize) return doc.canvasSize;
  return doc ? DESIGN_CANVAS_SIZES[doc.docType] : { width: 1080, height: 1080 };
}

export type DesignElementType = "text" | "image" | "shape" | "icon";

interface DesignElementBase {
  id: string;
  type: DesignElementType;
  /** 캔버스 절대좌표 (px, 문서 원본 해상도 기준) */
  x: number;
  y: number;
  w: number;
  h: number;
  /** 회전 (deg, 기본 0) */
  rotation?: number;
  /** 불투명도 0~1 (기본 1) */
  opacity?: number;
  /** 잠금 — 드래그/선택 방지 (배경 장식용) */
  locked?: boolean;
}

export interface TextElement extends DesignElementBase {
  type: "text";
  text: string;
  fontSize: number;
  fontWeight: 400 | 600 | 700 | 900;
  /** sans=Pretendard, display=Hahmlet(세리프 디스플레이) */
  fontFamily: "sans" | "display";
  color: string;
  align: "left" | "center" | "right";
  lineHeight?: number;
  letterSpacing?: number;
}

export interface ImageElement extends DesignElementBase {
  type: "image";
  /** Storage URL 또는 data URL */
  src: string;
  fit: "cover" | "contain";
  /** 모서리 반경 (px) */
  radius?: number;
}

export interface ShapeElement extends DesignElementBase {
  type: "shape";
  shape: "rect" | "circle" | "line";
  fill: string;
  /** line 은 fill 을 선 색으로 사용, h 를 두께로 사용 */
  radius?: number;
  strokeColor?: string;
  strokeWidth?: number;
}

export interface IconElement extends DesignElementBase {
  type: "icon";
  /** lucide 아이콘 이름 (STUDIO_ICONS 큐레이션 내) */
  icon: string;
  color: string;
  strokeWidth?: number;
}

export type DesignElement = TextElement | ImageElement | ShapeElement | IconElement;

export interface DesignPage {
  id: string;
  /** 배경색 (기본 흰색) */
  background: string;
  /** 배경 이미지 (선택, background 위에 cover) */
  backgroundImage?: string;
  elements: DesignElement[];
}

/** 연계 대상 — 프리필·포스터 게시의 근원 */
export interface DesignLink {
  kind: "seminar" | "study" | "project" | "external" | "conference";
  refId: string;
  /** denorm 표시용 */
  title: string;
}

export interface DesignDocument {
  id: string;
  userId: string;
  /** denorm 작성자명 */
  authorName?: string;
  docType: DesignDocType;
  /** 매직 리사이즈로 만든 문서의 커스텀 캔버스 크기 (없으면 docType 기본값) */
  canvasSize?: CanvasSize;
  title: string;
  pages: DesignPage[];
  linked?: DesignLink;
  /** true 면 회원에게 읽기 공개 (스튜디오 갤러리·공유) */
  published?: boolean;
  /** 마지막 자동 저장 (ISO) */
  lastSavedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const DESIGN_LINK_KIND_LABELS: Record<DesignLink["kind"], string> = {
  seminar: "세미나",
  study: "스터디",
  project: "프로젝트",
  external: "대외활동",
  conference: "학술대회",
};
