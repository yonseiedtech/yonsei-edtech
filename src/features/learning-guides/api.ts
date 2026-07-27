/**
 * 러닝 가이드 클라이언트 API 모듈
 * - 읽기: dataApi (Firestore 클라이언트 SDK, bkend.ts import — 수정 없음)
 * - 쓰기: Admin 라우트 경유 (authenticated fetch /api/learning-guides/*)
 *
 * ★ bkend.ts 는 읽기 전용 import 만 — 절대 수정하지 않는다.
 */

import { dataApi } from "@/lib/bkend";
import { auth } from "@/lib/firebase";
import { normalizeGuide } from "./normalize";
import type {
  LearningGuide,
  GuideChapter,
  GuidePage,
  LearningGuideProgress,
} from "@/types/learning-guide";

// ── 헬퍼 ──────────────────────────────────────────────────────────────────────

async function getToken(): Promise<string> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("로그인이 필요합니다.");
  return token;
}

/**
 * 로그인 상태면 인증 헤더를 실어 주는 선택적 헬퍼.
 * 공개 목록·단건 조회는 비로그인도 허용하되, 로그인 시 토큰을 보내
 * 서버가 회원/운영진 공개범위(visibility)를 정확히 판별하도록 한다.
 */
async function optionalAuthHeaders(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken().catch(() => null);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function adminFetch<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `요청 실패 (${res.status})`);
  }
  return res.json() as Promise<T>;
}

// ── 가이드 ────────────────────────────────────────────────────────────────────

export const guidesApi = {
  /** 공개 목록 — visibility/status 는 서버에서 필터 */
  list: async (params?: { category?: string; tag?: string }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set("category", params.category);
    if (params?.tag) qs.set("tag", params.tag);
    const res = await fetch(`/api/learning-guides?${qs.toString()}`, {
      headers: await optionalAuthHeaders(),
    });
    const json = (await res.json()) as { data?: LearningGuide[] };
    return { data: (json.data ?? []).map(normalizeGuide) };
  },

  /** 콘솔 — 전체 (인증 필요) */
  listAll: async () => {
    const json = await adminFetch<{ data?: LearningGuide[] }>("/api/learning-guides?all=true");
    return { data: (json.data ?? []).map(normalizeGuide) };
  },

  getBySlug: async (slug: string) => {
    const res = await fetch(`/api/learning-guides?slug=${encodeURIComponent(slug)}`, {
      headers: await optionalAuthHeaders(),
    });
    const json = (await res.json()) as { data: LearningGuide | null };
    return { data: json.data ? normalizeGuide(json.data) : null };
  },

  // Admin 라우트 경유로 통일(목록/뷰어와 동일 소스). 과거 dataApi.get(클라이언트 SDK)은
  // Admin SDK 로 생성된 가이드를 못 찾아 편집 페이지가 "가이드를 찾을 수 없습니다" 로 붕괴했다.
  getById: async (id: string) => {
    const json = await adminFetch<{ data: LearningGuide }>(
      `/api/learning-guides/${encodeURIComponent(id)}`,
    );
    return normalizeGuide(json.data);
  },

  create: (data: Partial<LearningGuide>) =>
    adminFetch<{ data: LearningGuide }>("/api/learning-guides", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<LearningGuide>) =>
    adminFetch<{ success: true }>(`/api/learning-guides/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    adminFetch<{ success: true }>(`/api/learning-guides/${id}`, {
      method: "DELETE",
    }),

  /** 저자 자격 확인 */
  authorize: () =>
    adminFetch<{ eligible: boolean; reason: string }>(
      "/api/learning-guides/authorize",
    ),
};

// ── 챕터 ──────────────────────────────────────────────────────────────────────

export const guideChaptersApi = {
  // Admin 라우트 경유(클라이언트 dataApi 는 Admin SDK 로 생성된 챕터를 못 찾음).
  list: async (guideId: string) => {
    const res = await fetch(
      `/api/guide-chapters?guideId=${encodeURIComponent(guideId)}`,
      { headers: await optionalAuthHeaders() },
    );
    const json = (await res.json()) as { data?: GuideChapter[] };
    return { data: json.data ?? [] };
  },

  create: (data: Omit<GuideChapter, "id">) =>
    adminFetch<{ data: GuideChapter }>("/api/guide-chapters", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<GuideChapter>) =>
    adminFetch<{ success: true }>(`/api/guide-chapters/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    adminFetch<{ success: true }>(`/api/guide-chapters/${id}`, {
      method: "DELETE",
    }),
};

// ── 페이지 ────────────────────────────────────────────────────────────────────

export const guidePagesApi = {
  // Admin 라우트 경유(클라이언트 dataApi 는 Admin SDK 로 생성된 페이지를 못 찾음).
  listByGuide: async (guideId: string) => {
    const res = await fetch(
      `/api/guide-pages?guideId=${encodeURIComponent(guideId)}`,
      { headers: await optionalAuthHeaders() },
    );
    const json = (await res.json()) as { data?: GuidePage[] };
    return { data: json.data ?? [] };
  },

  listByChapter: async (chapterId: string) => {
    const res = await fetch(
      `/api/guide-pages?chapterId=${encodeURIComponent(chapterId)}`,
      { headers: await optionalAuthHeaders() },
    );
    const json = (await res.json()) as { data?: GuidePage[] };
    return { data: json.data ?? [] };
  },

  get: (id: string) => dataApi.get<GuidePage>("guide_pages", id),

  create: (data: Omit<GuidePage, "id">) =>
    adminFetch<{ data: GuidePage }>("/api/guide-pages", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<GuidePage>) =>
    adminFetch<{ success: true }>(`/api/guide-pages/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    adminFetch<{ success: true }>(`/api/guide-pages/${id}`, {
      method: "DELETE",
    }),
};

// ── 진행 ──────────────────────────────────────────────────────────────────────

export const guideProgressApi = {
  /** 내 진행 조회 */
  get: async (guideId: string): Promise<LearningGuideProgress | null> => {
    const token = await getToken().catch(() => null);
    if (!token) return null;
    const res = await fetch(
      `/api/guide-progress?guideId=${encodeURIComponent(guideId)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { data: LearningGuideProgress | null };
    return json.data;
  },

  /** 페이지 읽음 처리 */
  markRead: (guideId: string, pageId: string) =>
    adminFetch<{ success: true }>("/api/guide-progress", {
      method: "POST",
      body: JSON.stringify({ guideId, pageId }),
    }),

  /** 마지막 읽은 위치 갱신 */
  updateLastPage: (guideId: string, lastPageId: string) =>
    adminFetch<{ success: true }>("/api/guide-progress", {
      method: "POST",
      body: JSON.stringify({ guideId, lastPageId }),
    }),

  /** 내 전체 진행 목록 — 마이페이지 "이어읽기" 위젯용 */
  listMine: async (): Promise<
    { guideId: string; readPageIds: string[]; lastPageId: string | null; updatedAt: string }[]
  > => {
    const token = await getToken().catch(() => null);
    if (!token) return [];
    const res = await fetch("/api/guide-progress?mine=true", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      data?: { guideId: string; readPageIds: string[]; lastPageId: string | null; updatedAt: string }[];
    };
    return json.data ?? [];
  },
};
