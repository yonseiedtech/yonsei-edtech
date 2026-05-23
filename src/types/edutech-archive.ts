// ── 교육공학 아카이브 (Concept → Variable → MeasurementTool) ──
// 컬렉션명 표준: archive_measurements (측정도구). URL은 /archive/measurement, 라벨은 "측정도구".
// 상시 공개 정책 (published 없음): archive_concepts, archive_variables, archive_measurements.
// 자세한 매트릭스·정책은 docs/archive-collection-naming.md 참고.
export type ArchiveItemType = "concept" | "variable" | "measurement";

export const ARCHIVE_ITEM_TYPE_LABELS: Record<ArchiveItemType, string> = {
  concept: "개념",
  variable: "변인",
  measurement: "측정도구",
};

export const ARCHIVE_ITEM_TYPE_COLORS: Record<ArchiveItemType, string> = {
  concept: "bg-violet-50 text-violet-800 border border-violet-200",
  variable: "bg-blue-50 text-blue-800 border border-blue-200",
  measurement: "bg-emerald-50 text-emerald-800 border border-emerald-200",
};

export type VariableType = "cognitive" | "affective" | "behavioral" | "demographic" | "environmental" | "other";

export const VARIABLE_TYPE_LABELS: Record<VariableType, string> = {
  cognitive: "인지적",
  affective: "정의적",
  behavioral: "행동적",
  demographic: "인구통계학적",
  environmental: "환경적",
  other: "기타",
};

export interface ArchiveConcept {
  id: string;
  name: string;
  description?: string;
  /** 영문/약어 */
  altNames?: string[];
  tags?: string[];
  /** 연결된 변인 ID */
  variableIds?: string[];
  references?: string[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArchiveVariable {
  id: string;
  name: string;
  description?: string;
  type?: VariableType;
  altNames?: string[];
  tags?: string[];
  /** 역참조: 이 변인을 가리키는 개념 ID들 (denorm) */
  conceptIds?: string[];
  /** 이 변인을 측정할 수 있는 측정도구 ID들 */
  measurementIds?: string[];
  references?: string[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArchiveMeasurementTool {
  id: string;
  name: string;
  description?: string;
  /** 원어 명칭 (예: General Self-Efficacy Scale) */
  originalName?: string;
  /** 저자/출처 */
  author?: string;
  /** 문항 수 */
  itemCount?: number;
  /** 문항 예시(샘플) */
  sampleItems?: string[];
  /** Likert 척도 정보 */
  scaleType?: string;
  /** 신뢰도 (Cronbach α 등) */
  reliability?: string;
  /** 타당도 메모 */
  validity?: string;
  tags?: string[];
  /** 역참조: 이 측정도구가 측정하는 변인 ID들 (denorm) */
  variableIds?: string[];
  references?: string[];
  /** 외부 자료 URL (PDF·논문 링크) */
  resourceUrl?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 즐겨찾기 가능한 아카이브 타입 — 7개 동적 컬렉션 모두 지원.
 * 기존 3종(concept/variable/measurement)에 4종 추가 (research-method/statistical-method/foundation-term/writing-tip).
 * 정적 페이지(/archive/apa-style)는 즐겨찾기 대상에서 제외.
 *
 * 하위호환: ArchiveItemType (3종) 은 ArchiveFavoriteItemType 의 부분집합이라 기존 즐겨찾기 문서는 그대로 작동.
 */
export type ArchiveFavoriteItemType =
  | ArchiveItemType
  | "research-method"
  | "statistical-method"
  | "foundation-term"
  | "writing-tip";

export interface ArchiveFavorite {
  id: string;        // {userId}_{itemType}_{itemId}
  userId: string;
  itemType: ArchiveFavoriteItemType;
  itemId: string;
  /** denorm: 즐겨찾기 목록 표시용 */
  itemName?: string;
  note?: string;
  createdAt: string;
}
