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
  increment,
  type QueryConstraint,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import type {
  User, Post, Comment, Seminar, SeminarSession, SeminarAttendee,
  SeminarRegistration, Certificate, PromotionContent, SeminarMaterial,
  SeminarReview, Inquiry, Activity, AppNotification, WaitlistEntry,
  Poll, PollResponse, PhotoAlbum, Photo, AdminTodo, AuditLog,
  ActivityProgress, ActivityMaterial, EmailLog,
  Lab, LabReaction, LabComment,
} from "@/types";

// ── Token helpers (Firebase가 자동 관리 — 호환용 no-op) ──

/** @deprecated Firebase SDK가 토큰을 자동 관리합니다 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function saveTokens(_access?: string, _refresh?: string) {}

/** @deprecated Firebase SDK가 토큰을 자동 관리합니다 */
export function clearTokens() {}

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

/** Recursively strip `undefined` values — Firestore rejects undefined at any nesting level. */
function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => stripUndefinedDeep(v)) as unknown as T;
  }
  if (value && typeof value === "object" && !(value instanceof Date) && !(value instanceof Timestamp)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = stripUndefinedDeep(v);
    }
    return out as T;
  }
  return value;
}

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
    // Firestore does not accept undefined values — strip them (deep)
    const cleaned = stripUndefinedDeep(data);
    const docRef = await addDoc(collection(db, table), {
      ...cleaned,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) throw new Error("문서 생성 후 조회 실패");
    return serializeDoc(docSnap) as T;
  },

  update: async <T>(table: string, id: string, data: Record<string, unknown>): Promise<T> => {
    const docId = id === "me" ? auth.currentUser?.uid ?? id : id;
    const docRef = doc(db, table, docId);
    // Firestore does not accept undefined values — strip them (deep)
    const cleaned = stripUndefinedDeep(data);
    await updateDoc(docRef, { ...cleaned, updatedAt: serverTimestamp() });
    const docSnap = await getDoc(docRef);
    return serializeDoc(docSnap) as T;
  },

  patch: async <T>(table: string, id: string, data: Record<string, unknown>): Promise<T> => {
    const docRef = doc(db, table, id);
    // Remove undefined values (deep) to prevent Firestore errors
    const cleaned = stripUndefinedDeep(data);
    await updateDoc(docRef, cleaned);
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
    dataApi.list<Post>("posts", {
      "filter[category]": params?.category,
      page: params?.page,
      limit: params?.limit,
      sort: params?.sort ?? "createdAt:desc",
    }),
  get: (id: string) => dataApi.get<Post>("posts", id),
  create: (data: Record<string, unknown>) => dataApi.create<Post>("posts", data),
  update: (id: string, data: Record<string, unknown>) => dataApi.update<Post>("posts", id, data),
  delete: (id: string) => dataApi.delete("posts", id),
  incrementView: async (id: string) => {
    const docRef = doc(db, "posts", id);
    await updateDoc(docRef, { viewCount: increment(1) });
  },
};

export const commentsApi = {
  list: (postId: string) =>
    dataApi.list<Comment>("comments", { "filter[postId]": postId, sort: "createdAt:asc" }),
  create: (data: Record<string, unknown>) => dataApi.create<Comment>("comments", data),
  update: (id: string, data: Record<string, unknown>) => dataApi.update<Comment>("comments", id, data),
  delete: (id: string) => dataApi.delete("comments", id),
};

export const profilesApi = {
  list: (params?: QueryParams) => dataApi.list<User>("users", params),
  get: (id: string) => dataApi.get<User>("users", id),
  getByEmail: (email: string) => dataApi.list<User>("users", { "filter[email]": email }),
  getByStudentId: (studentId: string) => dataApi.list<User>("users", { "filter[studentId]": studentId }),
  update: (id: string, data: Record<string, unknown>) => dataApi.update<User>("users", id, data),
  approve: (id: string) => dataApi.patch("users", id, { approved: true }),
};

export const seminarsApi = {
  list: (params?: { status?: string; page?: number; limit?: number }) =>
    dataApi.list<Seminar>("seminars", {
      "filter[status]": params?.status,
      page: params?.page,
      limit: params?.limit,
      sort: "date:desc",
    }),
  get: (id: string) => dataApi.get<Seminar>("seminars", id),
  create: (data: Record<string, unknown>) => dataApi.create<Seminar>("seminars", data),
  update: (id: string, data: Record<string, unknown>) => dataApi.update<Seminar>("seminars", id, data),
  delete: (id: string) => dataApi.delete("seminars", id),
};

export const sessionsApi = {
  list: (seminarId: string) =>
    dataApi.list<SeminarSession>("seminar_sessions", { "filter[seminarId]": seminarId }),
  create: (data: Record<string, unknown>) => dataApi.create<SeminarSession>("seminar_sessions", data),
  update: (id: string, data: Record<string, unknown>) => dataApi.update<SeminarSession>("seminar_sessions", id, data),
  delete: (id: string) => dataApi.delete("seminar_sessions", id),
};

export const attendeesApi = {
  list: (seminarId: string) =>
    dataApi.list<SeminarAttendee>("seminar_attendees", { "filter[seminarId]": seminarId }),
  check: (seminarId: string, userId: string) =>
    dataApi.list<SeminarAttendee>("seminar_attendees", { "filter[seminarId]": seminarId, "filter[userId]": userId }),
  checkByStudentId: (seminarId: string, studentId: string) =>
    dataApi.list<SeminarAttendee>("seminar_attendees", { "filter[seminarId]": seminarId, "filter[studentId]": studentId }),
  findGuestsByStudentId: (studentId: string) =>
    dataApi.list<SeminarAttendee>("seminar_attendees", { "filter[studentId]": studentId, "filter[isGuest]": "true" }),
  findGuestsByEmail: (email: string) =>
    dataApi.list<SeminarAttendee>("seminar_attendees", { "filter[email]": email, "filter[isGuest]": "true" }),
  add: (seminarId: string, userId: string) =>
    dataApi.create<SeminarAttendee>("seminar_attendees", { seminarId, userId }),
  addWithDetails: (seminarId: string, data: Record<string, unknown>) =>
    dataApi.create<SeminarAttendee>("seminar_attendees", { seminarId, ...data }),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<SeminarAttendee>("seminar_attendees", id, data),
  remove: (id: string) => dataApi.delete("seminar_attendees", id),
};

export const siteSettingsApi = {
  getByKey: (key: string) =>
    dataApi.list<Record<string, unknown>>("site_settings", { "filter[key]": key }),
  create: (data: Record<string, unknown>) => dataApi.create("site_settings", data),
  update: (id: string, data: Record<string, unknown>) => dataApi.update("site_settings", id, data),
};

export const registrationsApi = {
  list: (seminarId: string) =>
    dataApi.list<SeminarRegistration>("seminar_registrations", { "filter[seminarId]": seminarId }),
  create: (data: Record<string, unknown>) => dataApi.create<SeminarRegistration>("seminar_registrations", data),
  update: (id: string, data: Record<string, unknown>) => dataApi.update<SeminarRegistration>("seminar_registrations", id, data),
  delete: (id: string) => dataApi.delete("seminar_registrations", id),
};

export const certificatesApi = {
  list: (seminarId?: string, type?: "completion" | "appreciation") =>
    dataApi.list<Certificate>("certificates", {
      ...(seminarId ? { "filter[seminarId]": seminarId } : {}),
      ...(type ? { "filter[type]": type } : {}),
      sort: "issuedAt:desc",
    }),
  create: (data: Record<string, unknown>) => dataApi.create<Certificate>("certificates", data),
  update: (id: string, data: Record<string, unknown>) => dataApi.update<Certificate>("certificates", id, data),
  delete: (id: string) => dataApi.delete("certificates", id),
};

export const promotionContentsApi = {
  list: (seminarId?: string) =>
    dataApi.list<PromotionContent>("promotion_contents", {
      ...(seminarId ? { "filter[seminarId]": seminarId } : {}),
      sort: "createdAt:desc",
    }),
  create: (data: Record<string, unknown>) => dataApi.create<PromotionContent>("promotion_contents", data),
  update: (id: string, data: Record<string, unknown>) => dataApi.update<PromotionContent>("promotion_contents", id, data),
  delete: (id: string) => dataApi.delete("promotion_contents", id),
};

export const materialsApi = {
  list: (seminarId: string) =>
    dataApi.list<SeminarMaterial>("seminar_materials", { "filter[seminarId]": seminarId, sort: "createdAt:desc" }),
  create: (data: Record<string, unknown>) => dataApi.create<SeminarMaterial>("seminar_materials", data),
  update: (id: string, data: Record<string, unknown>) => dataApi.update<SeminarMaterial>("seminar_materials", id, data),
  delete: (id: string) => dataApi.delete("seminar_materials", id),
};

export const reviewsApi = {
  list: (seminarId: string, type?: string) =>
    dataApi.list<SeminarReview>("seminar_reviews", {
      "filter[seminarId]": seminarId,
      ...(type ? { "filter[type]": type } : {}),
    }),
  create: (data: Record<string, unknown>) => dataApi.create<SeminarReview>("seminar_reviews", data),
  update: (id: string, data: Record<string, unknown>) => dataApi.update<SeminarReview>("seminar_reviews", id, data),
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
  delete: (id: string) => dataApi.delete("inquiries", id),
};

export const activitiesApi = {
  // NOTE: where + orderBy 조합은 Firestore 복합 인덱스가 필요하므로,
  // type 필터만 쓰고 정렬은 클라이언트에서 수행한다. (board/posts 동일 패턴)
  list: async (type?: string) => {
    const res = await dataApi.list<Activity>("activities", {
      ...(type ? { "filter[type]": type } : {}),
    });
    const sorted = [...res.data].sort((a, b) => {
      const ad = (a as { date?: string }).date ?? "";
      const bd = (b as { date?: string }).date ?? "";
      return bd.localeCompare(ad);
    });
    return { ...res, data: sorted };
  },
  get: (id: string) => dataApi.get<Activity>("activities", id),
  create: (data: Record<string, unknown>) => dataApi.create<Activity>("activities", data),
  update: (id: string, data: Record<string, unknown>) => dataApi.update<Activity>("activities", id, data),
  delete: (id: string) => dataApi.delete("activities", id),
};

export const pollsApi = {
  list: (status?: string) =>
    dataApi.list<Poll>("polls", {
      ...(status ? { "filter[status]": status } : {}),
      sort: "createdAt:desc",
    }),
  get: (id: string) => dataApi.get<Poll>("polls", id),
  create: (data: Record<string, unknown>) => dataApi.create<Poll>("polls", data),
  update: (id: string, data: Record<string, unknown>) => dataApi.update<Poll>("polls", id, data),
  delete: (id: string) => dataApi.delete("polls", id),
};

export const pollResponsesApi = {
  list: (pollId: string) =>
    dataApi.list<PollResponse>("poll_responses", { "filter[pollId]": pollId, limit: 2000 }),
  create: (data: Record<string, unknown>) => dataApi.create<PollResponse>("poll_responses", data),
};

export const albumsApi = {
  list: () => dataApi.list<PhotoAlbum>("photo_albums", { sort: "createdAt:desc" }),
  get: (id: string) => dataApi.get<PhotoAlbum>("photo_albums", id),
  listBySeminarId: (seminarId: string) =>
    dataApi.list<PhotoAlbum>("photo_albums", { "filter[seminarId]": seminarId, sort: "createdAt:desc" }),
  create: (data: Record<string, unknown>) => dataApi.create<PhotoAlbum>("photo_albums", data),
  update: (id: string, data: Record<string, unknown>) => dataApi.update<PhotoAlbum>("photo_albums", id, data),
  delete: (id: string) => dataApi.delete("photo_albums", id),
};

export const photosApi = {
  list: (albumId: string) =>
    dataApi.list<Photo>("photos", { "filter[albumId]": albumId, sort: "createdAt:desc", limit: 500 }),
  create: (data: Record<string, unknown>) => dataApi.create<Photo>("photos", data),
  delete: (id: string) => dataApi.delete("photos", id),
};

export const waitlistApi = {
  list: (seminarId: string) =>
    dataApi.list<WaitlistEntry>("seminar_waitlist", {
      "filter[seminarId]": seminarId,
      sort: "position:asc",
    }),
  check: (seminarId: string, userId: string) =>
    dataApi.list<WaitlistEntry>("seminar_waitlist", {
      "filter[seminarId]": seminarId,
      "filter[userId]": userId,
    }),
  create: (data: Record<string, unknown>) =>
    dataApi.create<WaitlistEntry>("seminar_waitlist", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<WaitlistEntry>("seminar_waitlist", id, data),
  delete: (id: string) => dataApi.delete("seminar_waitlist", id),
};

export const auditLogsApi = {
  list: (params?: QueryParams) =>
    dataApi.list<AuditLog>("audit_logs", { sort: "createdAt:desc", ...params }),
  create: (data: Record<string, unknown>) =>
    dataApi.create<AuditLog>("audit_logs", data),
};

export const todosApi = {
  list: () => dataApi.list<AdminTodo>("admin_todos", { sort: "createdAt:desc" }),
  create: (data: Record<string, unknown>) => dataApi.create<AdminTodo>("admin_todos", data),
  update: (id: string, data: Record<string, unknown>) => dataApi.update<AdminTodo>("admin_todos", id, data),
  delete: (id: string) => dataApi.delete("admin_todos", id),
};

export const activityProgressApi = {
  list: (activityId: string) =>
    dataApi.list<ActivityProgress>("activity_progress", { "filter[activityId]": activityId, sort: "week:asc" }),
  create: (data: Record<string, unknown>) => dataApi.create<ActivityProgress>("activity_progress", data),
  update: (id: string, data: Record<string, unknown>) => dataApi.update<ActivityProgress>("activity_progress", id, data),
  delete: (id: string) => dataApi.delete("activity_progress", id),
};

export const activityMaterialsApi = {
  list: (activityId: string) =>
    dataApi.list<ActivityMaterial>("activity_materials", { "filter[activityId]": activityId, sort: "createdAt:desc" }),
  create: (data: Record<string, unknown>) => dataApi.create<ActivityMaterial>("activity_materials", data),
  delete: (id: string) => dataApi.delete("activity_materials", id),
};

export const emailLogsApi = {
  list: (targetId?: string) =>
    dataApi.list<EmailLog>("email_logs", {
      ...(targetId ? { "filter[targetId]": targetId } : {}),
      sort: "sentAt:desc",
    }),
  create: (data: Record<string, unknown>) => dataApi.create<EmailLog>("email_logs", data),
};

export const labsApi = {
  list: async () => {
    const res = await dataApi.list<Lab>("labs", {});
    const sorted = [...res.data].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    return { ...res, data: sorted };
  },
  get: (id: string) => dataApi.get<Lab>("labs", id),
  create: (data: Record<string, unknown>) => dataApi.create<Lab>("labs", data),
  update: (id: string, data: Record<string, unknown>) => dataApi.update<Lab>("labs", id, data),
  delete: (id: string) => dataApi.delete("labs", id),
};

export const labReactionsApi = {
  list: (labId: string) =>
    dataApi.list<LabReaction>("lab_reactions", { "filter[labId]": labId, limit: 2000 }),
  create: (data: Record<string, unknown>) => dataApi.create<LabReaction>("lab_reactions", data),
  delete: (id: string) => dataApi.delete("lab_reactions", id),
};

export const labCommentsApi = {
  list: (labId: string) =>
    dataApi.list<LabComment>("lab_comments", { "filter[labId]": labId, sort: "createdAt:asc" }),
  create: (data: Record<string, unknown>) => dataApi.create<LabComment>("lab_comments", data),
  update: (id: string, data: Record<string, unknown>) => dataApi.update<LabComment>("lab_comments", id, data),
  delete: (id: string) => dataApi.delete("lab_comments", id),
};

export const notificationsApi = {
  list: (userId: string) =>
    dataApi.list<AppNotification>("notifications", {
      "filter[userId]": userId,
      sort: "createdAt:desc",
      limit: 50,
    }),
  create: (data: Record<string, unknown>) =>
    dataApi.create<AppNotification>("notifications", data),
  markRead: (id: string) =>
    dataApi.update<AppNotification>("notifications", id, { read: true }),
  markAllRead: async (userId: string) => {
    const res = await dataApi.list<AppNotification>("notifications", {
      "filter[userId]": userId,
      "filter[read]": "false",
    });
    await Promise.all(
      res.data.map((n) => dataApi.update("notifications", n.id, { read: true }))
    );
  },
  delete: (id: string) => dataApi.delete("notifications", id),
};
