// ── 교육공학 아카이브 (Concept → Variable → MeasurementTool) ──
// 컬렉션명 표준: archive_measurements (측정도구). URL은 /archive/measurement, 라벨은 "측정도구".
// 상시 공개 정책 (published 없음): archive_concepts, archive_variables, archive_measurements.
// 자세한 매트릭스·정책은 docs/archive-collection-naming.md 참고.
import { CAT_CHIP } from "@/lib/design-tokens";

export type ArchiveItemType = "concept" | "variable" | "measurement";

export const ARCHIVE_ITEM_TYPE_LABELS: Record<ArchiveItemType, string> = {
  concept: "개념",
  variable: "변인",
  measurement: "측정도구",
};

export const ARCHIVE_ITEM_TYPE_COLORS: Record<ArchiveItemType, string> = {
  concept: CAT_CHIP.violet,
  variable: CAT_CHIP.blue,
  measurement: CAT_CHIP.emerald,
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

/**
 * 검수 상태 (v5-H2). 하위호환: 필드 부재 시 published ? "approved" : "draft" 로 간주.
 *  - draft: 미검수(등록 직후 또는 보류 해제·재검토 대기)
 *  - approved: 승인·공개 (published=true 와 동반)
 *  - held: 보류 — 사유(reviewNote) 기록, DB 영속. published=false 유지, 큐 보류 탭에서 재검토.
 */
export type ArchiveReviewStatus = "draft" | "approved" | "held";

/**
 * Phase 3.5 — 운영 메타 필드 (8개 archive_* 컬렉션 공통).
 * 모든 필드 optional. 기존 항목 마이그레이션 불필요.
 *  - updatedBy/updatedByUid: 마지막 수정자 (form 저장 시 자동 주입)
 *  - reviewedBy/reviewedByUid/reviewedAt: 승인·보류 등 검수 처리 순간 자동 기록
 *  - reviewStatus/reviewNote: v5-H2 영속 검수 상태 모델. 부재 시 published 로부터 유추(하위호환).
 */
export interface ArchiveOperationalMeta {
  updatedBy?: string;
  updatedByUid?: string;
  reviewedBy?: string;
  reviewedByUid?: string;
  reviewedAt?: string;
  /** v5-H2 — 영속 검수 상태. 없으면 published ? "approved" : "draft" 로 유추. */
  reviewStatus?: ArchiveReviewStatus;
  /** v5-H2 — 보류(held) 사유. 선택 입력. */
  reviewNote?: string;
  /**
   * v11-H4 콘텐츠 신선도: 운영진 수동 검토 완료 시각.
   * 부재 시 updatedAt 기준으로 노후도(stale) 산정. 검토 확인 시 재노후 타이머 초기화.
   */
  lastReviewedAt?: string;
}

export interface ArchiveConcept extends ArchiveOperationalMeta {
  id: string;
  name: string;
  description?: string;
  /**
   * 순화어 — 노션 용어사전집(교육공학 수업 영역) 기준의 우리말 다듬은 용어.
   * 기존 용어명(name)은 그대로 두고 병기해 표시한다. 운영진이 폼에서 수정 가능.
   */
  purifiedName?: string;
  /**
   * AECT 공식 역어 — 『교육공학 용어해설』(Richey 편, 학지사 2020) 표제어 기준.
   * name과 다를 때만 병기 표시.
   */
  aectTerm?: string;
  /** 영문/약어 */
  altNames?: string[];
  tags?: string[];
  /** 연결된 변인 ID */
  variableIds?: string[];
  references?: string[];
  /** 이론 개념의 대표 학자 (예: ["John Sweller"]) — URL 사전 검증 시드 (사이클 47) */
  keyScholars?: string[];
  /** 원전(seminal work) — url 은 OA 직링크 또는 doi.org, 단행본은 null */
  seminalWorks?: { citation: string; url: string | null; openAccess: boolean }[];
  /**
   * Phase 5 — 시드 멱등성 키. `concept:{slug}` 형식.
   * 이 값이 있으면 시드 함수는 이름 대신 seedKey 로 upsert (이름 수정해도 동일 항목 인식).
   * 사용자 직접 생성 항목은 undefined.
   */
  seedKey?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArchiveVariable extends ArchiveOperationalMeta {
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
  /** Phase 5 — 시드 멱등성 키. `variable:{slug}` 형식. */
  seedKey?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArchiveMeasurementTool extends ArchiveOperationalMeta {
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
  /** Phase 5 — 시드 멱등성 키. `measurement:{slug}` 형식. */
  seedKey?: string;
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
