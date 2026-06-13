/**
 * 아카이브 카드 텍스트 헬퍼 (사이클 67·68)
 *
 * 두괄식 노출 — 긴 설명/요약은 카드에 첫 문장(핵심)만 보이고, 전체는 상세 페이지에서.
 * 문장 경계: "숫자가 아닌 글자 뒤의 마침표 + 공백" — 소수점(.05·2.31)과 약어·괄호 인용
 * (Stevens, 1946)은 끊지 않는다.
 */
export function leadSentence(text: string): { lead: string; truncated: boolean } {
  const trimmed = (text ?? "").trim();
  const m = trimmed.match(/^[\s\S]*?[^\d]\.(?=\s)/);
  if (m && m[0].trim().length < trimmed.length) {
    return { lead: m[0].trim(), truncated: true };
  }
  return { lead: trimmed, truncated: false };
}
