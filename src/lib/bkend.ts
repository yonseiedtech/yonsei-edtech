/**
 * bkend.ai BaaS Client
 * TODO: Replace with actual bkend.ai SDK when project is created
 */

const BKEND_URL = process.env.NEXT_PUBLIC_BKEND_URL || "https://api.bkend.ai/v1";

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BKEND_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "요청 실패" }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}

// Auth API
export const authApi = {
  signup: (data: { email: string; password: string; name: string }) =>
    request("/auth/signup", { method: "POST", body: data }),

  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: unknown }>("/auth/login", { method: "POST", body: data }),

  logout: (token: string) =>
    request("/auth/logout", { method: "POST", token }),

  me: (token: string) =>
    request<unknown>("/auth/me", { token }),
};

// Posts API
export const postsApi = {
  list: (params?: { category?: string }, token?: string) => {
    const query = params?.category ? `?category=${params.category}` : "";
    return request<unknown[]>(`/api/posts${query}`, { token });
  },

  get: (id: string, token?: string) =>
    request<unknown>(`/api/posts/${id}`, { token }),

  create: (data: { title: string; content: string; category: string }, token?: string) =>
    request<unknown>("/api/posts", { method: "POST", body: data, token }),

  update: (id: string, data: Partial<{ title: string; content: string; category: string }>, token?: string) =>
    request<unknown>(`/api/posts/${id}`, { method: "PUT", body: data, token }),

  delete: (id: string, token?: string) =>
    request<void>(`/api/posts/${id}`, { method: "DELETE", token }),
};

// Comments API
export const commentsApi = {
  list: (postId: string, token?: string) =>
    request<unknown[]>(`/api/comments?postId=${postId}`, { token }),

  create: (data: { postId: string; content: string }, token?: string) =>
    request<unknown>("/api/comments", { method: "POST", body: data, token }),

  delete: (id: string, token?: string) =>
    request<void>(`/api/comments/${id}`, { method: "DELETE", token }),
};

// Profiles API
export const profilesApi = {
  list: () =>
    request<unknown[]>("/api/profiles"),

  get: (userId: string, token?: string) =>
    request<unknown>(`/api/profiles/${userId}`, { token }),

  update: (userId: string, data: Record<string, unknown>, token?: string) =>
    request<unknown>(`/api/profiles/${userId}`, { method: "PUT", body: data, token }),

  approve: (userId: string, token?: string) =>
    request<unknown>(`/api/profiles/${userId}`, { method: "PATCH", body: { approved: true }, token }),
};

// Inquiries API
export const inquiriesApi = {
  create: (data: { name: string; email: string; message: string }) =>
    request<unknown>("/api/inquiries", { method: "POST", body: data }),

  list: (token?: string) =>
    request<unknown[]>("/api/inquiries", { token }),
};
