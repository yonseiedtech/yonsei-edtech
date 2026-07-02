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

/** 문서 타입별 캔버스 크기 (px) */
export const DESIGN_CANVAS_SIZES: Record<DesignDocType, { width: number; height: number }> = {
  cardnews: { width: 1080, height: 1080 },
  poster: { width: 1080, height: 1350 }, // 인스타 세로형 4:5
  ppt: { width: 1280, height: 720 },     // 16:9
};

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
