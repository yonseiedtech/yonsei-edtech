/**
 * 아카이브 데이터 형태 방어 정규화 (2026-07-19, React #31 근본수정)
 *
 * 배경: `archive_measurements.sampleItems` 가 시드/타입상은 string[] 이지만,
 * LIVE 일부 문서(UWES-S·CoI·MAI·AGQ 등 6종)는 과거 경로에서 {text, id} 맵 배열로
 * 적재돼 있다. 상세 페이지가 항목을 그대로 렌더하면 React #31(객체 자식) 크래시,
 * 편집 폼이 join 하면 "[object Object]" 로 오염 저장될 수 있다.
 * 소비 경계에서 문자열로 정규화해 어떤 형태든 안전하게 다룬다.
 */

/** sampleItems 등 문자열 배열이어야 하는 필드를 관대하게 문자열 배열로 정규화. */
export function normalizeStringItems(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((s) => {
      if (typeof s === "string") return s;
      if (s && typeof s === "object" && "text" in s) {
        const t = (s as { text?: unknown }).text;
        return typeof t === "string" ? t : "";
      }
      return "";
    })
    .filter((s) => s.trim().length > 0);
}
