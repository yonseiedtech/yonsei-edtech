/**
 * 아카이브 통합 검색 인덱스 — 공유 타입·헬퍼 (v5-M8, 2026-07-18)
 *
 * 목적: 랜딩 통합 검색이 방문마다 7개 컬렉션을 클라이언트로 전량 로드하던 비용을 없앤다.
 * 서버(`GET /api/archive/search-index`)가 admin SDK로 경량 인덱스를 만들어 CDN 15분 캐시로
 * 서빙하고, 클라이언트는 그 인덱스만 1회 받아 매칭한다.
 *
 * 스키마 정책: 이름·별칭·태그·AECT 역어 등 "검색 매칭에 필요한 최소 필드"만 담는다.
 * description·summary 같은 대형 본문은 인덱스에 넣지 않는다(응답 크기 억제 — 수십 KB 목표).
 */

/** 인덱스가 포괄하는 7개 아카이브 타입. 상세/리스트 라우트는 모두 `/archive/{type}` 규약. */
export const ARCHIVE_SEARCH_INDEX_TYPES = [
  "concept",
  "variable",
  "measurement",
  "research-methods",
  "statistical-methods",
  "foundation-terms",
  "writing-tips",
] as const;

export type ArchiveSearchIndexType = (typeof ARCHIVE_SEARCH_INDEX_TYPES)[number];

/** 경량 인덱스 1건. name 외에는 모두 optional(있을 때만 포함해 크기 최소화). */
export interface ArchiveSearchIndexItem {
  type: ArchiveSearchIndexType;
  id: string;
  /** 표시·주 매칭 이름 (foundation-terms=term, writing-tips=title, 그 외=name). */
  name: string;
  /** 영문/약어/원어명/저자 등 대체 검색어. */
  altNames?: string[];
  tags?: string[];
  /** AECT 공식 역어 (『교육공학 용어해설』). name 과 다를 때 검색·병기에 활용. */
  aectTerm?: string;
}

export interface ArchiveSearchIndexResponse {
  items: ArchiveSearchIndexItem[];
  count: number;
  /** 생성 시각(ISO). 디버깅·신선도 확인용. */
  generatedAt: string;
}

/**
 * 인덱스 검색 매칭 대상 필드 — 대형 본문(description/summary)은 제외하고
 * 이름·별칭·태그·AECT 역어만 매칭한다(경량 인덱스와 동일 범위).
 */
export const ARCHIVE_INDEX_MATCH_FIELDS: (keyof ArchiveSearchIndexItem)[] = [
  "name",
  "altNames",
  "tags",
  "aectTerm",
];

/** 상세 페이지 경로 — 7개 타입 모두 `/archive/{type}/{id}` 규약을 따른다. */
export function archiveSearchDetailHref(
  item: Pick<ArchiveSearchIndexItem, "type" | "id">,
): string {
  return `/archive/${item.type}/${item.id}`;
}
