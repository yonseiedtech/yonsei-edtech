/**
 * 아카이브 "최근 본 항목" — localStorage 기반 이어보기 (스프린트1 H3)
 *
 * 상세 페이지 진입 시 recordRecentView() 로 기록하고, 랜딩/내 아카이브 허브에서
 * getRecentViews() 로 최근 목록을 노출한다. 서버 저장 없이 기기 로컬에만 남기므로
 * 로그인 여부와 무관하게 동작하고 개인정보 이슈가 없다. SSR 에서는 항상 빈 배열.
 */

export interface RecentArchiveView {
  /** 콘텐츠 계열 — concept·variable·measurement·research-method·statistical-method·foundation-term·terminology 등 */
  type: string;
  /** 문서 id 또는 slug */
  id: string;
  /** 표시 제목 */
  title: string;
  /** 이동 경로 (절대 경로, /archive/...) */
  href: string;
  /** 기록 시각 (epoch ms) */
  viewedAt: number;
}

const STORAGE_KEY = "yet:archive:recent-views:v1";
const MAX_ITEMS = 12;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** 최근 본 항목 목록 (최신순). SSR·파싱 실패 시 빈 배열. */
export function getRecentViews(): RecentArchiveView[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v): v is RecentArchiveView =>
        !!v &&
        typeof (v as RecentArchiveView).href === "string" &&
        typeof (v as RecentArchiveView).title === "string" &&
        typeof (v as RecentArchiveView).viewedAt === "number",
    );
  } catch {
    return [];
  }
}

/** 상세 진입 기록 — href 기준 중복 제거 후 맨 앞에 추가, 최대 MAX_ITEMS 유지. */
export function recordRecentView(item: Omit<RecentArchiveView, "viewedAt">): void {
  if (!isBrowser()) return;
  try {
    const next: RecentArchiveView[] = [
      { ...item, viewedAt: Date.now() },
      ...getRecentViews().filter((v) => v.href !== item.href),
    ].slice(0, MAX_ITEMS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 저장 실패(쿼터 등)는 무시 — 기능 자체가 best-effort
  }
}

/** 최근 본 항목 전체 삭제 (허브의 "기록 지우기"). */
export function clearRecentViews(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
