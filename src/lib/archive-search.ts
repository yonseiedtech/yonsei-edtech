/**
 * 아카이브 공통 검색 유틸 — 타입별 랜딩 페이지(연구방법·통계방법·기초용어·글쓰기)의
 * 클라이언트 사이드 부분 일치 검색을 위한 헬퍼.
 *
 * 정책:
 * - 대소문자 무시 (toLowerCase)
 * - 부분 일치 (includes)
 * - 지정된 필드들에 대해 OR 조건
 * - 문자열/문자열 배열 모두 지원 (배열은 join 후 매칭)
 * - 빈/공백 query 는 항상 true (= 필터 비활성화)
 */

/**
 * 객체의 지정된 필드들에 query(대소문자 무시·부분 일치)가 있는지 검사한다.
 *
 * @param item 검사 대상 객체
 * @param query 검색어 (공백·빈 문자열이면 항상 true)
 * @param fields 검사할 필드 키 배열. 값이 string 또는 string[] 인 필드만 매칭에 참여한다.
 *
 * 구현 메모: `T extends Record<string, unknown>` 제약은 명시적 interface(WritingTip 등)와
 * 호환되지 않아 빌드 실패를 일으킨다. 따라서 제약 없이 `keyof T` 만 사용하고, 내부에서는
 * 안전하게 unknown 으로 캐스팅해 런타임 타입 가드를 수행한다.
 */
export function matchesArchiveSearch<T>(
  item: T,
  query: string,
  fields: (keyof T)[],
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  for (const f of fields) {
    const v = item[f] as unknown;
    if (typeof v === "string") {
      if (v.toLowerCase().includes(q)) return true;
    } else if (Array.isArray(v)) {
      for (const x of v) {
        if (typeof x === "string" && x.toLowerCase().includes(q)) return true;
      }
    }
  }
  return false;
}
