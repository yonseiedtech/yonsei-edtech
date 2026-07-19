import { doc, setDoc, increment, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

/**
 * 검색 실패(zero-result) 질의 경량 적재 — M6 (2026-07-19)
 *
 * search_misses/{docId} 에 upsert(count 증가, lastAt 갱신).
 * - 익명 적재: userId 저장 없음.
 * - 세션 중 동일 정규화 질의 1회만 적재 (메모리 Set).
 * - 쓰기 실패는 조용히 무시 (검색 UX 영향 없음).
 */

/** 세션 내 이미 기록한 질의 집합 (탭 새로고침 시 초기화 — 의도적) */
const sessionMisses = new Set<string>();

function normalizeQuery(raw: string): string {
  // rules 필드 검증(≤100자)과 쌍 — 과대 payload 방지
  return raw.trim().toLowerCase().slice(0, 100);
}

/** Firestore 문서 ID로 사용할 슬러그 (특수문자 → '_', 최대 50자) */
function slugify(q: string): string {
  return q.replace(/[^\w가-힣]/g, "_").slice(0, 50) || "_";
}

/**
 * 무결과 질의를 search_misses 컬렉션에 upsert.
 * @param raw 사용자 원본 입력 — 내부에서 정규화(소문자 trim).
 */
export async function trackSearchMiss(raw: string): Promise<void> {
  if (typeof window === "undefined") return;
  const q = normalizeQuery(raw);
  if (q.length < 2) return;
  if (sessionMisses.has(q)) return;
  sessionMisses.add(q);

  const docId = slugify(q);
  try {
    await setDoc(
      doc(db, "search_misses", docId),
      {
        query: q,
        count: increment(1),
        lastAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch {
    // 검색 UX에 영향 없이 조용히 무시
  }
}
