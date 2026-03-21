/**
 * Firebase Auth + Firestore Client
 * bkend.ts export 인터페이스 유지 — 사용처 변경 최소화
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
  Timestamp,
  arrayUnion,
  arrayRemove,
  type QueryConstraint,
} from "firebase/firestore";
import { auth, db } from "./firebase";

// ── Token helpers (Firebase가 자동 관리 — 호환용 no-op) ──

export function saveTokens(_access: string, _refresh: string) {
  // Firebase SDK handles token management internally
}

export function clearTokens() {
  // Firebase SDK handles token management internally
}

// ── Firestore helpers ──

function parseFilters(params?: QueryParams): QueryConstraint[] {
  const constraints: QueryConstraint[] = [];
  if (!params) return constraints;
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    const match = key.match(/^filter\[(\w+)\]$/);
    if (match) {
      const field = match[1];
      const strVal = String(value);
      const val = strVal === "true" ? true : strVal === "false" ? false : strVal;
      constraints.push(where(field, "==", val));
    }
  }
  return constraints;
}

function parseSort(sortStr?: string): QueryConstraint[] {
  if (!sortStr) return [];
  return sortStr.split(",").map((s) => {
    const [field, dir] = s.split(":");
    return orderBy(field, (dir as "asc" | "desc") || "asc");
  });
}

/** Firestore Timestamp → ISO string */
function serializeDoc(docSnap: { id: string; data: () => Record<string, unknown> | undefined }): Record<string, unknown> {
  const data = docSnap.data() ?? {};
  const result: Record<string, unknown> = { id: docSnap.id };
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Timestamp) {
      result[key] = value.toDate().toISOString();
    } else {
      result[key] = value;
    }
  }
  return result;
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
}

// ── Auth API ──

export const authApi = {
  signup: async (data: { email: string; password: string; name: string }): Promise<AuthTokens> => {
    const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
    await updateProfile(cred.user, { displayName: data.name });

    // Firestore users 컬렉션에 프로필 생성
    const { setDoc } = await import("firebase/firestore");
    await setDoc(doc(db, "users", cred.user.uid), {
      email: data.email,
      name: data.name,
      username: data.email.split("@")[0],
      role: "member",
      generation: 0,
      field: "",
      approved: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const token = await cred.user.getIdToken();
    return { accessToken: token, refreshToken: token, tokenType: "Bearer", expiresIn: 3600 };
  },

  login: async (data: { email: string; password: string }): Promise<AuthTokens> => {
    const cred = await signInWithEmailAndPassword(auth, data.email, data.password);
    const token = await cred.user.getIdToken();
    return { accessToken: token, refreshToken: token, tokenType: "Bearer", expiresIn: 3600 };
  },

  me: async (_token?: string): Promise<BkendAuthUser> => {
    const user = auth.currentUser;
    if (!user) throw new Error("인증되지 않았습니다.");
    return { id: user.uid, email: user.email || "", name: user.displayName || "" };
  },

  refresh: async (_refreshToken: string): Promise<AuthTokens> => {
    const user = auth.currentUser;
    if (!user) throw new Error("인증되지 않았습니다.");
    const token = await user.getIdToken(true);
    return { accessToken: token, refreshToken: token, tokenType: "Bearer", expiresIn: 3600 };
  },

  logout: async (): Promise<void> => {
    await signOut(auth);
  },
};

// ── Data API (generic CRUD) ──

type QueryParams = Record<string, string | number | undefined>;

export const dataApi = {
  list: async <T>(table: string, params?: QueryParams): Promise<ListResponse<T>> => {
    const constraints: QueryConstraint[] = [];

    // 필터 파싱
    constraints.push(...parseFilters(params));

    // 정렬 파싱
    if (params?.sort) {
      constraints.push(...parseSort(String(params.sort)));
    }

    // limit 파싱
    const limitVal = params?.limit ? Number(params.limit) : 0;
    if (limitVal > 0) {
      constraints.push(firestoreLimit(limitVal));
    }

    const q = query(collection(db, table), ...constraints);
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((d) => serializeDoc(d) as T);

    return { data, total: data.length, page: 1, limit: limitVal || data.length };
  },

  get: async <T>(table: string, id: string): Promise<T> => {
    // "me" → 현재 로그인 사용자 uid
    const docId = id === "me" ? auth.currentUser?.uid ?? id : id;
    const docSnap = await getDoc(doc(db, table, docId));
    if (!docSnap.exists()) throw new Error("문서를 찾을 수 없습니다.");
    return serializeDoc(docSnap) as T;
  },

  create: async <T>(table: string, data: Record<string, unknown>): Promise<T> => {
    // Firestore does not accept undefined values — strip them
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) cleaned[k] = v;
    }
    const docRef = await addDoc(collection(db, table), {
      ...cleaned,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const docSnap = await getDoc(docRef);
    return serializeDoc(docSnap!) as T;
  },

  update: async <T>(table: string, id: string, data: Record<string, unknown>): Promise<T> => {
    const docId = id === "me" ? auth.currentUser?.uid ?? id : id;
    const docRef = doc(db, table, docId);
    // Firestore does not accept undefined values — strip them
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) cleaned[k] = v;
    }
    await updateDoc(docRef, { ...cleaned, updatedAt: serverTimestamp() });
    const docSnap = await getDoc(docRef);
    return serializeDoc(docSnap) as T;
  },

  patch: async <T>(table: string, id: string, data: Record<string, unknown>): Promise<T> => {
    const docRef = doc(db, table, id);
    await updateDoc(docRef, data);
    const docSnap = await getDoc(docRef);
    return serializeDoc(docSnap) as T;
  },

  delete: async (table: string, id: string): Promise<void> => {
    await deleteDoc(doc(db, table, id));
  },
};

// ── Typed API shortcuts ──

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
    dataApi.list<Record<string, unknown>>("site_settings", { "filter[key]": key }),
  create: (data: Record<string, unknown>) =>
    dataApi.create("site_settings", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update("site_settings", id, data),
};

export const registrationsApi = {
  list: (seminarId: string) =>
    dataApi.list<Record<string, unknown>>("seminar_registrations", {
      "filter[seminarId]": seminarId,
      sort: "createdAt:desc",
    }),
  create: (data: Record<string, unknown>) =>
    dataApi.create("seminar_registrations", data),
  delete: (id: string) => dataApi.delete("seminar_registrations", id),
};

export const certificatesApi = {
  list: (seminarId?: string) =>
    dataApi.list<Record<string, unknown>>("certificates", {
      ...(seminarId ? { "filter[seminarId]": seminarId } : {}),
      sort: "issuedAt:desc",
    }),
  create: (data: Record<string, unknown>) =>
    dataApi.create("certificates", data),
  delete: (id: string) => dataApi.delete("certificates", id),
};

export const promotionContentsApi = {
  list: (seminarId?: string) =>
    dataApi.list<Record<string, unknown>>("promotion_contents", {
      ...(seminarId ? { "filter[seminarId]": seminarId } : {}),
      sort: "createdAt:desc",
    }),
  create: (data: Record<string, unknown>) =>
    dataApi.create("promotion_contents", data),
  delete: (id: string) => dataApi.delete("promotion_contents", id),
};

export const materialsApi = {
  list: (seminarId: string) =>
    dataApi.list<Record<string, unknown>>("seminar_materials", {
      "filter[seminarId]": seminarId,
      sort: "createdAt:desc",
    }),
  create: (data: Record<string, unknown>) =>
    dataApi.create("seminar_materials", data),
  delete: (id: string) => dataApi.delete("seminar_materials", id),
};

export const reviewsApi = {
  list: (seminarId: string, type?: string) =>
    dataApi.list<Record<string, unknown>>("seminar_reviews", {
      "filter[seminarId]": seminarId,
      ...(type ? { "filter[type]": type } : {}),
      sort: "createdAt:desc",
    }),
  create: (data: Record<string, unknown>) =>
    dataApi.create("seminar_reviews", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update("seminar_reviews", id, data),
  delete: (id: string) => dataApi.delete("seminar_reviews", id),
};

/** seminars 문서의 attendeeIds 배열을 동기화 */
export async function syncAttendeeIds(seminarId: string, userId: string, action: "add" | "remove") {
  const seminarRef = doc(db, "seminars", seminarId);
  if (action === "add") {
    await updateDoc(seminarRef, { attendeeIds: arrayUnion(userId), updatedAt: serverTimestamp() });
  } else {
    await updateDoc(seminarRef, { attendeeIds: arrayRemove(userId), updatedAt: serverTimestamp() });
  }
}

export const inquiriesApi = {
  list: (params?: QueryParams) =>
    dataApi.list<Record<string, unknown>>("inquiries", { sort: "createdAt:desc", ...params }),
  create: (data: Record<string, unknown>) =>
    dataApi.create<Record<string, unknown>>("inquiries", data),
  update: (id: string, data: Record<string, unknown>) => dataApi.update("inquiries", id, data),
};
