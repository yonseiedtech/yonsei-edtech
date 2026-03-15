/**
 * bkend.ai BaaS Client
 * REST API: https://api.bkend.ai/v1
 */

const BKEND_URL = process.env.NEXT_PUBLIC_BKEND_URL || "https://api-client.bkend.ai/v1";
const API_KEY = process.env.NEXT_PUBLIC_BKEND_API_KEY || "";

// ── Token helpers ──

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("bkend_access_token");
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("bkend_refresh_token");
}

export function saveTokens(access: string, refresh: string) {
  localStorage.setItem("bkend_access_token", access);
  localStorage.setItem("bkend_refresh_token", refresh);
}

export function clearTokens() {
  localStorage.removeItem("bkend_access_token");
  localStorage.removeItem("bkend_refresh_token");
}

// ── Core request ──

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  skipAuth?: boolean;
};

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${BKEND_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    saveTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token, skipAuth = false } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
  };

  const authToken = token ?? (skipAuth ? null : getAccessToken());
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  let res = await fetch(`${BKEND_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // 401 → refresh token → retry once
  if (res.status === 401 && !skipAuth && !token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(`${BKEND_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "요청 실패" }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json();
}

// ── API Response types ──

export interface ListResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface BkendAuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

// ── Auth API ──

export const authApi = {
  signup: (data: { email: string; password: string; name: string }) =>
    request<AuthTokens>("/auth/email/signup", {
      method: "POST",
      body: { method: "password", ...data },
      skipAuth: true,
    }),

  login: (data: { email: string; password: string }) =>
    request<AuthTokens>("/auth/email/signin", {
      method: "POST",
      body: { method: "password", ...data },
      skipAuth: true,
    }),

  me: (token?: string) =>
    request<BkendAuthUser>("/auth/me", { token }),

  refresh: (refreshToken: string) =>
    request<AuthTokens>("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
      skipAuth: true,
    }),

  logout: () =>
    request<void>("/auth/signout", { method: "POST" }),
};

// ── Data API (generic CRUD) ──

type QueryParams = Record<string, string | number | undefined>;

function buildQuery(params?: QueryParams): string {
  if (!params) return "";
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
}

export const dataApi = {
  list: <T>(table: string, params?: QueryParams) =>
    request<ListResponse<T>>(`/data/${table}${buildQuery(params)}`),

  get: <T>(table: string, id: string) =>
    request<T>(`/data/${table}/${id}`),

  create: <T>(table: string, data: Record<string, unknown>) =>
    request<T>(`/data/${table}`, { method: "POST", body: data }),

  update: <T>(table: string, id: string, data: Record<string, unknown>) =>
    request<T>(`/data/${table}/${id}`, { method: "PUT", body: data }),

  patch: <T>(table: string, id: string, data: Record<string, unknown>) =>
    request<T>(`/data/${table}/${id}`, { method: "PATCH", body: data }),

  delete: (table: string, id: string) =>
    request<void>(`/data/${table}/${id}`, { method: "DELETE" }),
};

// ── Typed API shortcuts (convenience) ──

export const postsApi = {
  list: (params?: { category?: string; page?: number; limit?: number; sort?: string }) =>
    dataApi.list<Record<string, unknown>>("posts", {
      "filter[category]": params?.category,
      page: params?.page,
      limit: params?.limit,
      sort: params?.sort ?? "createdAt:desc",
    }),
  get: (id: string) => dataApi.get<Record<string, unknown>>("posts", id),
  create: (data: Record<string, unknown>) => dataApi.create("posts", data),
  update: (id: string, data: Record<string, unknown>) => dataApi.update("posts", id, data),
  delete: (id: string) => dataApi.delete("posts", id),
};

export const commentsApi = {
  list: (postId: string) =>
    dataApi.list<Record<string, unknown>>("comments", {
      "filter[postId]": postId,
      sort: "createdAt:asc",
    }),
  create: (data: Record<string, unknown>) => dataApi.create("comments", data),
  delete: (id: string) => dataApi.delete("comments", id),
};

export const profilesApi = {
  list: (params?: QueryParams) => dataApi.list<Record<string, unknown>>("users", params),
  get: (id: string) => dataApi.get<Record<string, unknown>>("users", id),
  getByEmail: (email: string) =>
    dataApi.list<Record<string, unknown>>("users", { "filter[email]": email }),
  update: (id: string, data: Record<string, unknown>) => dataApi.update("users", id, data),
  approve: (id: string) => dataApi.patch("users", id, { approved: true }),
};

export const seminarsApi = {
  list: (params?: { status?: string; page?: number; limit?: number }) =>
    dataApi.list<Record<string, unknown>>("seminars", {
      "filter[status]": params?.status,
      page: params?.page,
      limit: params?.limit,
      sort: "date:desc",
    }),
  get: (id: string) => dataApi.get<Record<string, unknown>>("seminars", id),
  create: (data: Record<string, unknown>) => dataApi.create("seminars", data),
  update: (id: string, data: Record<string, unknown>) => dataApi.update("seminars", id, data),
  delete: (id: string) => dataApi.delete("seminars", id),
};

export const sessionsApi = {
  list: (seminarId: string) =>
    dataApi.list<Record<string, unknown>>("seminar_sessions", {
      "filter[seminarId]": seminarId,
      sort: "order:asc",
    }),
  create: (data: Record<string, unknown>) => dataApi.create("seminar_sessions", data),
  update: (id: string, data: Record<string, unknown>) => dataApi.update("seminar_sessions", id, data),
  delete: (id: string) => dataApi.delete("seminar_sessions", id),
};

export const attendeesApi = {
  list: (seminarId: string) =>
    dataApi.list<Record<string, unknown>>("seminar_attendees", {
      "filter[seminarId]": seminarId,
    }),
  check: (seminarId: string, userId: string) =>
    dataApi.list<Record<string, unknown>>("seminar_attendees", {
      "filter[seminarId]": seminarId,
      "filter[userId]": userId,
    }),
  add: (seminarId: string, userId: string) =>
    dataApi.create("seminar_attendees", { seminarId, userId }),
  remove: (id: string) => dataApi.delete("seminar_attendees", id),
};

export const siteSettingsApi = {
  getByKey: (key: string) =>
    request<ListResponse<Record<string, unknown>>>(`/data/site_settings?filter[key]=${key}`, { skipAuth: true }),
  create: (data: Record<string, unknown>) =>
    dataApi.create("site_settings", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update("site_settings", id, data),
};

export const inquiriesApi = {
  list: (params?: QueryParams) =>
    dataApi.list<Record<string, unknown>>("inquiries", { sort: "createdAt:desc", ...params }),
  create: (data: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/data/inquiries`, {
      method: "POST",
      body: data,
      skipAuth: true, // 비회원도 문의 가능
    }),
  update: (id: string, data: Record<string, unknown>) => dataApi.update("inquiries", id, data),
};
