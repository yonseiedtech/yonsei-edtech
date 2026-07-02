/**
 * @멘션 유틸 (Phase 3) — 게시글·댓글 본문에서 `@회원이름` 을 추출해 알림 대상으로 변환.
 *
 * 한국어 이름은 단어 경계가 없어 정규식만으로는 이름 끝을 알 수 없다.
 * 전략: `@` 뒤 토큰(한글/영문/숫자 2~10자)을 후보로 뽑고, 실제 회원 이름 목록과
 * "가장 긴 접두 일치"로 매칭한다. (예: 회원 "김대경" — "@김대경님" 도 매칭)
 */

export interface MentionTarget {
  id: string;
  name: string;
}

const TOKEN_RE = /@([가-힣a-zA-Z0-9]{2,10})/g;

/**
 * 본문에서 멘션된 회원 추출 (중복 제거).
 * @param text 본문
 * @param members 회원 목록 (id, name)
 * @param excludeIds 제외할 사용자 (본인·이미 별도 알림 대상 등)
 */
export function extractMentions(
  text: string,
  members: MentionTarget[],
  excludeIds: string[] = [],
): MentionTarget[] {
  if (!text.includes("@") || members.length === 0) return [];
  const exclude = new Set(excludeIds);
  // 이름 → 회원 (동명이인은 목록 순 첫 번째만 — 안전한 단순화)
  const byName = new Map<string, MentionTarget>();
  for (const m of members) {
    if (m.name && !byName.has(m.name)) byName.set(m.name, m);
  }

  const found = new Map<string, MentionTarget>();
  for (const match of text.matchAll(TOKEN_RE)) {
    const token = match[1];
    // 가장 긴 접두 일치: 토큰 앞부분이 회원 이름과 정확히 일치하는 가장 긴 이름
    for (let len = Math.min(token.length, 10); len >= 2; len--) {
      const candidate = token.slice(0, len);
      const member = byName.get(candidate);
      if (member && !exclude.has(member.id)) {
        found.set(member.id, member);
        break;
      }
    }
  }
  return [...found.values()];
}

/** 자동완성용 — 커서 직전의 미완성 멘션 토큰 (`@가나` → "가나", 없으면 null) */
export function pendingMentionQuery(textBeforeCaret: string): string | null {
  const m = /@([가-힣a-zA-Z0-9]{0,10})$/.exec(textBeforeCaret);
  return m ? m[1] : null;
}
