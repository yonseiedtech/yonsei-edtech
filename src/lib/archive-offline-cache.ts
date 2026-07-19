/**
 * 아카이브 상세 오프라인 캐시 — M5(모바일/PWA) 오프라인 읽기 (2026-07-20)
 *
 * 최근 열람한 아카이브 상세(archive/[type]/[id])의 "본문 스냅샷"을 기기 로컬에 저장한다.
 * 오프라인 감지(navigator.onLine === false 또는 fetch 실패) 시, 저장된 스냅샷으로
 * "최근 읽은 항목" 오프라인 뷰를 제공한다.
 *
 * 설계 원칙:
 *  - Service Worker(public/sw.js)는 정적 자산만 캐시한다(과거 `_rsc` 사고로 하드닝됨).
 *    RSC/HTML 을 SW 에 캐시하지 않으므로, 오프라인 "읽기"는 이 클라이언트 localStorage 캐시로 해결한다.
 *  - 서버 저장 없이 기기 로컬에만 남기므로 로그인 여부와 무관하게 동작하고 개인정보 이슈가 없다.
 *  - SSR 에서는 항상 빈 값을 반환한다.
 *  - best-effort: 저장/파싱 실패(쿼터 초과 등)는 조용히 무시한다.
 */

export interface OfflineArchiveItem {
  /** 콘텐츠 계열 — concept·variable·measurement */
  type: string;
  /** 문서 id */
  id: string;
  /** 표시 제목 */
  title: string;
  /** 이동 경로 (절대 경로, /archive/...) */
  href: string;
  /** 본문(정의·설명) 스냅샷 — 오프라인 읽기용 */
  body: string;
  /** 부가 메타 라인 (원어명·저자·순화어 등, 표시용 문자열) */
  meta?: string[];
  /** 캐시 시각 (epoch ms) */
  cachedAt: number;
}

const STORAGE_KEY = "yet:archive:offline-cache:v1";
const MAX_ITEMS = 10;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** 캐시된 오프라인 항목 목록 (최신순). SSR·파싱 실패 시 빈 배열. */
export function getOfflineArchiveItems(): OfflineArchiveItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v): v is OfflineArchiveItem =>
        !!v &&
        typeof (v as OfflineArchiveItem).href === "string" &&
        typeof (v as OfflineArchiveItem).title === "string" &&
        typeof (v as OfflineArchiveItem).body === "string" &&
        typeof (v as OfflineArchiveItem).cachedAt === "number",
    );
  } catch {
    return [];
  }
}

/** 특정 상세 항목의 캐시 스냅샷 조회 — 없으면 null. */
export function getOfflineArchiveItem(type: string, id: string): OfflineArchiveItem | null {
  return getOfflineArchiveItems().find((v) => v.type === type && v.id === id) ?? null;
}

/** 상세 진입 시 본문 스냅샷 저장 — href 기준 중복 제거 후 맨 앞에 추가, 최대 MAX_ITEMS 유지. */
export function cacheArchiveDetail(item: Omit<OfflineArchiveItem, "cachedAt">): void {
  if (!isBrowser()) return;
  try {
    const next: OfflineArchiveItem[] = [
      { ...item, cachedAt: Date.now() },
      ...getOfflineArchiveItems().filter((v) => v.href !== item.href),
    ].slice(0, MAX_ITEMS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 저장 실패(쿼터 등)는 무시 — best-effort
  }
}
