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
  setDoc,
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
  Lab, LabReaction, LabComment, ResearchPaper, ResearchReport, ResearchProposal, WritingPaper, WritingPaperHistory,
  InterviewResponseReaction, InterviewResponseComment,
  ProfileLike, ProfileView, StudySession,
  ActivityParticipation, Award, ExternalActivity, ContentCreation,
  AlumniThesis, ThesisReference, ThesisClaim,
  CourseOffering, CourseEnrollment, ClassSession, CourseSessionNote, CourseTodo, SemesterTerm, ComprehensiveExamRecord, CourseReview,
  GuideTrack, GuideItem, GuideProgress,
  HostRetrospective, HostActivityType,
  SitePopup,
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
      // 원본 타입 보존: number/boolean 은 그대로, 문자열만 "true"/"false" 변환 처리.
      // (필드 타입 미스매치로 Firestore where("year", "==", "2026") 가 number 2026 doc 을 못 찾던 버그 fix)
      let val: string | number | boolean;
      if (typeof value === "number" || typeof value === "boolean") {
        val = value;
      } else {
        const strVal = String(value);
        val = strVal === "true" ? true : strVal === "false" ? false : strVal;
      }
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
  delete: (id: string) => dataApi.delete("users", id),
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
  listByUser: (userId: string) =>
    dataApi.list<SeminarAttendee>("seminar_attendees", { "filter[userId]": userId }),
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
  list: (seminarId?: string, type?: "completion" | "appreciation" | "appointment") =>
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
  listByAuthor: (authorId: string) =>
    dataApi.list<SeminarReview>("seminar_reviews", { "filter[authorId]": authorId }),
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

const ACTIVITIES_LIMIT = 1000;
export const activitiesApi = {
  // NOTE: where + orderBy 조합은 Firestore 복합 인덱스가 필요하므로,
  // type 필터만 쓰고 정렬은 클라이언트에서 수행한다. (board/posts 동일 패턴)
  list: async (type?: string) => {
    const res = await dataApi.list<Activity>("activities", {
      ...(type ? { "filter[type]": type } : {}),
      limit: ACTIVITIES_LIMIT,
    });
    if (res.data.length >= ACTIVITIES_LIMIT) {
      console.warn(`[activitiesApi] limit ${ACTIVITIES_LIMIT} reached — cursor-based pagination needed.`);
    }
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

const LABS_LIMIT = 500;
export const labsApi = {
  list: async () => {
    const res = await dataApi.list<Lab>("labs", { limit: LABS_LIMIT });
    if (res.data.length >= LABS_LIMIT) {
      console.warn(`[labsApi] limit ${LABS_LIMIT} reached — cursor-based pagination needed.`);
    }
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

export const interviewResponseReactionsApi = {
  list: (responseId: string) =>
    dataApi.list<InterviewResponseReaction>("interview_response_reactions", {
      "filter[responseId]": responseId,
      limit: 1000,
    }),
  create: (data: Record<string, unknown>) =>
    dataApi.create<InterviewResponseReaction>("interview_response_reactions", data),
  delete: (id: string) => dataApi.delete("interview_response_reactions", id),
};

export const interviewResponseCommentsApi = {
  list: (responseId: string) =>
    dataApi.list<InterviewResponseComment>("interview_response_comments", {
      "filter[responseId]": responseId,
      sort: "createdAt:asc",
    }),
  create: (data: Record<string, unknown>) =>
    dataApi.create<InterviewResponseComment>("interview_response_comments", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<InterviewResponseComment>("interview_response_comments", id, data),
  delete: (id: string) => dataApi.delete("interview_response_comments", id),
};

export const researchPapersApi = {
  list: async (userId: string) => {
    const res = await dataApi.list<ResearchPaper>("research_papers", {
      "filter[userId]": userId,
      limit: 500,
    });
    const sorted = [...res.data].sort((a, b) =>
      (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
    );
    return { ...res, data: sorted };
  },
  get: (id: string) => dataApi.get<ResearchPaper>("research_papers", id),
  create: (data: Record<string, unknown>) =>
    dataApi.create<ResearchPaper>("research_papers", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<ResearchPaper>("research_papers", id, data),
  delete: (id: string) => dataApi.delete("research_papers", id),
};

export const writingPapersApi = {
  listByUser: (userId: string) =>
    dataApi.list<WritingPaper>("writing_papers", {
      "filter[userId]": userId,
      limit: 50,
    }),
  get: (id: string) => dataApi.get<WritingPaper>("writing_papers", id),
  create: (data: Record<string, unknown>) =>
    dataApi.create<WritingPaper>("writing_papers", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<WritingPaper>("writing_papers", id, data),
  delete: (id: string) => dataApi.delete("writing_papers", id),
};

export const writingPaperHistoryApi = {
  /**
   * 복합 인덱스 회피: filter[userId]만 사용하고 정렬은 클라이언트에서.
   * 1년치 최대 ~1000건 가정.
   */
  listByUser: (userId: string) =>
    dataApi.list<WritingPaperHistory>("writing_paper_history", {
      "filter[userId]": userId,
      limit: 1000,
    }),
  create: (data: Record<string, unknown>) =>
    dataApi.create<WritingPaperHistory>("writing_paper_history", data),
};

export const studySessionsApi = {
  listByUser: (userId: string) =>
    dataApi.list<StudySession>("study_sessions", {
      "filter[userId]": userId,
      limit: 1000,
    }),
  get: (id: string) => dataApi.get<StudySession>("study_sessions", id),
  create: (data: Record<string, unknown>) =>
    dataApi.create<StudySession>("study_sessions", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<StudySession>("study_sessions", id, data),
  delete: (id: string) => dataApi.delete("study_sessions", id),
};

export const researchReportsApi = {
  listByUser: (userId: string) =>
    dataApi.list<ResearchReport>("research_reports", {
      "filter[userId]": userId,
      limit: 50,
    }),
  get: (id: string) => dataApi.get<ResearchReport>("research_reports", id),
  create: (data: Record<string, unknown>) =>
    dataApi.create<ResearchReport>("research_reports", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<ResearchReport>("research_reports", id, data),
  delete: (id: string) => dataApi.delete("research_reports", id),
};

export const researchProposalsApi = {
  listByUser: (userId: string) =>
    dataApi.list<ResearchProposal>("research_proposals", {
      "filter[userId]": userId,
      limit: 50,
    }),
  get: (id: string) => dataApi.get<ResearchProposal>("research_proposals", id),
  create: (data: Record<string, unknown>) =>
    dataApi.create<ResearchProposal>("research_proposals", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<ResearchProposal>("research_proposals", id, data),
  delete: (id: string) => dataApi.delete("research_proposals", id),
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

// ── Profile Likes (PR5) ──
// 결정적 doc id `${profileId}_${likerId}` 로 1인 1회 보장.
// 클라이언트는 setDoc/deleteDoc만 사용 — addDoc 사용 금지.
export const profileLikesApi = {
  /** 특정 프로필을 좋아요한 모든 기록 (카운트/리스트 용) */
  listByProfile: (profileId: string) =>
    dataApi.list<ProfileLike>("profile_likes", {
      "filter[profileId]": profileId,
      limit: 1000,
    }),
  /** viewer가 해당 프로필에 좋아요 누른 단일 doc 조회 */
  getMine: async (profileId: string, likerId: string): Promise<ProfileLike | null> => {
    const docId = `${profileId}_${likerId}`;
    const snap = await getDoc(doc(db, "profile_likes", docId));
    if (!snap.exists()) return null;
    return serializeDoc(snap) as unknown as ProfileLike;
  },
  toggle: async (profileId: string, likerId: string, likerName?: string): Promise<{ liked: boolean }> => {
    const docId = `${profileId}_${likerId}`;
    const ref = doc(db, "profile_likes", docId);
    const existing = await getDoc(ref);
    if (existing.exists()) {
      await deleteDoc(ref);
      return { liked: false };
    }
    const data = stripUndefinedDeep({
      profileId,
      likerId,
      likerName,
      createdAt: serverTimestamp(),
    });
    await setDoc(ref, data);
    return { liked: true };
  },
};

// ── Profile Views (PR5, 통계용) ──
export const profileViewsApi = {
  listByProfile: (profileId: string) =>
    dataApi.list<ProfileView>("profile_views", {
      "filter[profileId]": profileId,
      limit: 1000,
    }),
  log: (data: { profileId: string; viewerId?: string; channel: "qr" | "link" | "members" | "direct" }) =>
    dataApi.create<ProfileView>("profile_views", data),
};

// ── Track 2: 학술 포트폴리오 ──

export const activityParticipationsApi = {
  listByUser: (userId: string) =>
    dataApi.list<ActivityParticipation>("activity_participations", {
      "filter[userId]": userId,
      limit: 500,
    }),
  listByActivity: (activityId: string) =>
    dataApi.list<ActivityParticipation>("activity_participations", {
      "filter[activityId]": activityId,
      limit: 500,
    }),
  get: (id: string) => dataApi.get<ActivityParticipation>("activity_participations", id),
  create: (data: Record<string, unknown>) =>
    dataApi.create<ActivityParticipation>("activity_participations", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<ActivityParticipation>("activity_participations", id, data),
  delete: (id: string) => dataApi.delete("activity_participations", id),
};

export const awardsApi = {
  listByUser: (userId: string) =>
    dataApi.list<Award>("awards", { "filter[userId]": userId, limit: 200 }),
  /** 운영진 검증 큐 */
  listPending: () =>
    dataApi.list<Award>("awards", {
      "filter[verified]": "false",
      limit: 200,
    }),
  get: (id: string) => dataApi.get<Award>("awards", id),
  create: (data: Record<string, unknown>) => dataApi.create<Award>("awards", data),
  update: (id: string, data: Record<string, unknown>) => dataApi.update<Award>("awards", id, data),
  delete: (id: string) => dataApi.delete("awards", id),
};

export const externalActivitiesApi = {
  listByUser: (userId: string) =>
    dataApi.list<ExternalActivity>("external_activities", {
      "filter[userId]": userId,
      limit: 200,
    }),
  /** 운영진 검증 큐 */
  listPending: () =>
    dataApi.list<ExternalActivity>("external_activities", {
      "filter[verified]": "false",
      limit: 200,
    }),
  get: (id: string) => dataApi.get<ExternalActivity>("external_activities", id),
  create: (data: Record<string, unknown>) =>
    dataApi.create<ExternalActivity>("external_activities", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<ExternalActivity>("external_activities", id, data),
  delete: (id: string) => dataApi.delete("external_activities", id),
};

export const contentCreationsApi = {
  listByUser: (userId: string) =>
    dataApi.list<ContentCreation>("content_creations", {
      "filter[userId]": userId,
      limit: 500,
    }),
  get: (id: string) => dataApi.get<ContentCreation>("content_creations", id),
  create: (data: Record<string, unknown>) =>
    dataApi.create<ContentCreation>("content_creations", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<ContentCreation>("content_creations", id, data),
  delete: (id: string) => dataApi.delete("content_creations", id),
};

// ── Track 4: 졸업생 학위논문 DB ──

export const alumniThesesApi = {
  list: (params?: Record<string, string | number>) =>
    dataApi.list<AlumniThesis>("alumni_theses", { limit: 500, ...params }),
  listByAuthor: (authorUserId: string) =>
    dataApi.list<AlumniThesis>("alumni_theses", {
      "filter[authorUserId]": authorUserId,
      limit: 50,
    }),
  listUnmapped: () =>
    dataApi.list<AlumniThesis>("alumni_theses", {
      "filter[authorMappingStatus]": "unmapped",
      limit: 500,
    }),
  get: (id: string) => dataApi.get<AlumniThesis>("alumni_theses", id),
  create: (data: Record<string, unknown>) =>
    dataApi.create<AlumniThesis>("alumni_theses", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<AlumniThesis>("alumni_theses", id, data),
  delete: (id: string) => dataApi.delete("alumni_theses", id),
};

export const thesisReferencesApi = {
  listByThesis: (thesisId: string) =>
    dataApi.list<ThesisReference>("thesis_references", {
      "filter[thesisId]": thesisId,
      limit: 500,
    }),
  create: (data: Record<string, unknown>) =>
    dataApi.create<ThesisReference>("thesis_references", data),
  delete: (id: string) => dataApi.delete("thesis_references", id),
};

export const thesisClaimsApi = {
  listPending: () =>
    dataApi.list<ThesisClaim>("thesis_claims", {
      "filter[status]": "pending",
      limit: 200,
    }),
  listByUser: (userId: string) =>
    dataApi.list<ThesisClaim>("thesis_claims", {
      "filter[userId]": userId,
      limit: 50,
    }),
  create: (data: Record<string, unknown>) =>
    dataApi.create<ThesisClaim>("thesis_claims", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<ThesisClaim>("thesis_claims", id, data),
};

// ── Track 5: 수강과목 마스터 (Phase 1) ──

export const courseOfferingsApi = {
  list: (params?: QueryParams) =>
    dataApi.list<CourseOffering>("course_offerings", { limit: 1000, ...params }),
  listBySemester: (year: number, term: SemesterTerm) =>
    dataApi.list<CourseOffering>("course_offerings", {
      "filter[year]": year,
      "filter[term]": term,
      limit: 500,
    }),
  get: (id: string) => dataApi.get<CourseOffering>("course_offerings", id),
  create: (data: Record<string, unknown>) =>
    dataApi.create<CourseOffering>("course_offerings", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<CourseOffering>("course_offerings", id, data),
  delete: (id: string) => dataApi.delete("course_offerings", id),
};

// 수강생 명단 (course_offerings 의 자식 — 운영진 관리)
export const courseEnrollmentsApi = {
  listByCourse: (courseOfferingId: string) =>
    dataApi.list<CourseEnrollment>("course_enrollments", {
      "filter[courseOfferingId]": courseOfferingId,
      sort: "studentName:asc",
      limit: 500,
    }),
  listBySemester: (year: number, term: SemesterTerm) =>
    dataApi.list<CourseEnrollment>("course_enrollments", {
      "filter[year]": year,
      "filter[term]": term,
      limit: 2000,
    }),
  /** 회원 ID로 본인 수강 이력 조회 — 프로필 학기별 표시용 */
  listByUser: (userId: string) =>
    dataApi.list<CourseEnrollment>("course_enrollments", {
      "filter[userId]": userId,
      sort: "year:desc",
      limit: 500,
    }),
  create: (data: Record<string, unknown>) =>
    dataApi.create<CourseEnrollment>("course_enrollments", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<CourseEnrollment>("course_enrollments", id, data),
  delete: (id: string) => dataApi.delete("course_enrollments", id),
};

// 종합시험 응시 기록 (회원 self-input + 운영진 조회)
export const comprehensiveExamsApi = {
  list: (params?: QueryParams) =>
    dataApi.list<ComprehensiveExamRecord>("comprehensive_exam_records", {
      sort: "plannedYear:desc",
      limit: 1000,
      ...params,
    }),
  listByUser: (userId: string) =>
    dataApi.list<ComprehensiveExamRecord>("comprehensive_exam_records", {
      "filter[userId]": userId,
      sort: "plannedYear:desc",
      limit: 50,
    }),
  listBySemester: (year: number, term: SemesterTerm) =>
    dataApi.list<ComprehensiveExamRecord>("comprehensive_exam_records", {
      "filter[plannedYear]": year,
      "filter[plannedTerm]": term,
      limit: 500,
    }),
  create: (data: Record<string, unknown>) =>
    dataApi.create<ComprehensiveExamRecord>("comprehensive_exam_records", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<ComprehensiveExamRecord>("comprehensive_exam_records", id, data),
  delete: (id: string) => dataApi.delete("comprehensive_exam_records", id),
};

// 강의 후기 (회원 self-input)
export const courseReviewsApi = {
  list: (params?: QueryParams) =>
    dataApi.list<CourseReview>("course_reviews", {
      sort: "createdAt:desc",
      limit: 1000,
      ...params,
    }),
  listByCourse: (courseOfferingId: string) =>
    dataApi.list<CourseReview>("course_reviews", {
      "filter[courseOfferingId]": courseOfferingId,
      sort: "createdAt:desc",
      limit: 200,
    }),
  listByCourses: (courseOfferingIds: string[]) => {
    if (courseOfferingIds.length === 0) {
      return Promise.resolve({ data: [] as CourseReview[], total: 0 });
    }
    return dataApi.list<CourseReview>("course_reviews", {
      "filter[courseOfferingId][in]": courseOfferingIds.join(","),
      sort: "createdAt:desc",
      limit: 1000,
    });
  },
  listByAuthor: (authorId: string) =>
    dataApi.list<CourseReview>("course_reviews", {
      "filter[authorId]": authorId,
      sort: "createdAt:desc",
      limit: 100,
    }),
  create: (data: Record<string, unknown>) =>
    dataApi.create<CourseReview>("course_reviews", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<CourseReview>("course_reviews", id, data),
  delete: (id: string) => dataApi.delete("course_reviews", id),
};

// 수업 진행 스케쥴 (날짜별 운영방식 기록)
export const classSessionsApi = {
  listByCourse: (courseOfferingId: string) =>
    dataApi.list<ClassSession>("class_sessions", {
      "filter[courseOfferingId]": courseOfferingId,
      sort: "date:asc",
      limit: 500,
    }),
  listByDate: (date: string) =>
    dataApi.list<ClassSession>("class_sessions", {
      "filter[date]": date,
      limit: 200,
    }),
  listByCourses: (courseIds: string[]) => {
    if (courseIds.length === 0) {
      return Promise.resolve({ data: [] as ClassSession[], total: 0 });
    }
    return dataApi.list<ClassSession>("class_sessions", {
      "filter[courseOfferingId][in]": courseIds.join(","),
      sort: "date:asc",
      limit: 1000,
    });
  },
  create: (data: Record<string, unknown>) =>
    dataApi.create<ClassSession>("class_sessions", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<ClassSession>("class_sessions", id, data),
  delete: (id: string) => dataApi.delete("class_sessions", id),
};

// 수업 개인 메모 (수강생이 수업일별로 남기는 메모)
export const courseSessionNotesApi = {
  listByCourseAndUser: (courseOfferingId: string, userId: string) =>
    dataApi.list<CourseSessionNote>("course_session_notes", {
      "filter[courseOfferingId]": courseOfferingId,
      "filter[userId]": userId,
      sort: "date:asc",
      limit: 500,
    }),
  listByUser: (userId: string) =>
    dataApi.list<CourseSessionNote>("course_session_notes", {
      "filter[userId]": userId,
      sort: "date:desc",
      limit: 500,
    }),
  create: (data: Record<string, unknown>) =>
    dataApi.create<CourseSessionNote>("course_session_notes", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<CourseSessionNote>("course_session_notes", id, data),
  delete: (id: string) => dataApi.delete("course_session_notes", id),
};

// 수업 TO-DO (수강생 개인)
export const courseTodosApi = {
  listByCourseAndUser: (courseOfferingId: string, userId: string) =>
    dataApi.list<CourseTodo>("course_todos", {
      "filter[courseOfferingId]": courseOfferingId,
      "filter[userId]": userId,
      sort: "createdAt:desc",
      limit: 500,
    }),
  listByUser: (userId: string) =>
    dataApi.list<CourseTodo>("course_todos", {
      "filter[userId]": userId,
      sort: "createdAt:desc",
      limit: 500,
    }),
  create: (data: Record<string, unknown>) =>
    dataApi.create<CourseTodo>("course_todos", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<CourseTodo>("course_todos", id, data),
  delete: (id: string) => dataApi.delete("course_todos", id),
};

// ── Track 6: 인지디딤판 (Phase 1) ──

export const guideTracksApi = {
  list: () =>
    dataApi.list<GuideTrack>("guide_tracks", { sort: "order:asc", limit: 50 }),
  listPublished: () =>
    dataApi.list<GuideTrack>("guide_tracks", {
      "filter[published]": "true",
      sort: "order:asc",
      limit: 50,
    }),
  get: (id: string) => dataApi.get<GuideTrack>("guide_tracks", id),
  create: (data: Record<string, unknown>) =>
    dataApi.create<GuideTrack>("guide_tracks", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<GuideTrack>("guide_tracks", id, data),
  delete: (id: string) => dataApi.delete("guide_tracks", id),
};

export const guideItemsApi = {
  listByTrack: (trackId: string) =>
    dataApi.list<GuideItem>("guide_items", {
      "filter[trackId]": trackId,
      limit: 500,
    }),
  /** 트랙 내 published 항목만 (회원 뷰) — published 인덱스 필요 시 클라이언트 필터로 폴백 */
  listPublishedByTrack: async (trackId: string) => {
    const res = await dataApi.list<GuideItem>("guide_items", {
      "filter[trackId]": trackId,
      limit: 500,
    });
    return { ...res, data: res.data.filter((i) => i.published) };
  },
  get: (id: string) => dataApi.get<GuideItem>("guide_items", id),
  create: (data: Record<string, unknown>) =>
    dataApi.create<GuideItem>("guide_items", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<GuideItem>("guide_items", id, data),
  delete: (id: string) => dataApi.delete("guide_items", id),
};

export const guideProgressApi = {
  /** 사용자별 트랙 진행 상태 1건 (없으면 null) */
  getByUserAndTrack: async (userId: string, trackId: string): Promise<GuideProgress | null> => {
    const res = await dataApi.list<GuideProgress>("guide_progress", {
      "filter[userId]": userId,
      "filter[trackId]": trackId,
      limit: 1,
    });
    return res.data[0] ?? null;
  },
  create: (data: Record<string, unknown>) =>
    dataApi.create<GuideProgress>("guide_progress", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<GuideProgress>("guide_progress", id, data),
  delete: (id: string) => dataApi.delete("guide_progress", id),
};

// ── Track 7 F6: Host Retrospectives ──
export const hostRetrospectivesApi = {
  listByActivity: (activityType: HostActivityType, activityId: string) =>
    dataApi.list<HostRetrospective>("host_retrospectives", {
      "filter[activityType]": activityType,
      "filter[activityId]": activityId,
      sort: "createdAt:desc",
    }),
  listByHost: (hostUserId: string) =>
    dataApi.list<HostRetrospective>("host_retrospectives", {
      "filter[hostUserId]": hostUserId,
      sort: "createdAt:desc",
    }),
  listForOverview: (limit = 30) =>
    dataApi.list<HostRetrospective>("host_retrospectives", {
      "filter[status]": "published",
      sort: "createdAt:desc",
      limit,
    }),
  getMine: async (
    activityType: HostActivityType,
    activityId: string,
    hostUserId: string,
  ): Promise<HostRetrospective | null> => {
    const res = await dataApi.list<HostRetrospective>("host_retrospectives", {
      "filter[activityType]": activityType,
      "filter[activityId]": activityId,
      "filter[hostUserId]": hostUserId,
      limit: 1,
    });
    return res.data[0] ?? null;
  },
  create: (data: Record<string, unknown>) =>
    dataApi.create<HostRetrospective>("host_retrospectives", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<HostRetrospective>("host_retrospectives", id, data),
  delete: (id: string) => dataApi.delete("host_retrospectives", id),
};

// ── Site Popups (사이트 팝업 공지) ──
export const popupsApi = {
  list: () =>
    dataApi.list<SitePopup>("site_popups", { sort: "priority:desc" }),
  listActive: () =>
    dataApi.list<SitePopup>("site_popups", {
      "filter[active]": "true",
      sort: "priority:desc",
    }),
  get: (id: string) => dataApi.get<SitePopup>("site_popups", id),
  create: (data: Record<string, unknown>) =>
    dataApi.create<SitePopup>("site_popups", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<SitePopup>("site_popups", id, data),
  delete: (id: string) => dataApi.delete("site_popups", id),
};
