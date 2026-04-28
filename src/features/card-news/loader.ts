import { cardNewsApi } from "@/lib/bkend";
import { CARD_NEWS_SERIES, findSeries as findStaticSeries } from "./series";
import type { CardNewsSeries } from "./types";

/**
 * Firestore에 발행된 시리즈를 우선 사용하고,
 * 빈 컬렉션 / 미존재 / 에러 시 정적 fallback (`series.ts`) 으로 회귀.
 *
 * 정적 fallback의 핵심 가치: 초기 배포 시 마이그레이션 전에도
 * 런칭 카드뉴스가 보이고, Firestore 장애 시에도 페이지가 동작한다.
 */
export async function loadAllSeries(): Promise<CardNewsSeries[]> {
  try {
    const res = await cardNewsApi.list();
    const remote = (res?.data ?? []) as CardNewsSeries[];
    const ids = new Set(remote.map((s) => s.id));
    const fallback = CARD_NEWS_SERIES.filter((s) => !ids.has(s.id));
    const merged = [...remote, ...fallback];
    return merged.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  } catch {
    return [...CARD_NEWS_SERIES].sort((a, b) =>
      b.publishedAt.localeCompare(a.publishedAt),
    );
  }
}

export async function loadSeries(id: string): Promise<CardNewsSeries | null> {
  try {
    const remote = await cardNewsApi.get(id);
    if (remote && Array.isArray((remote as CardNewsSeries).cards)) {
      return remote as CardNewsSeries;
    }
  } catch {
    // fallthrough
  }
  return findStaticSeries(id) ?? null;
}
