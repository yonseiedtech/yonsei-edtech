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
  Poll, PollResponse, PhotoAlbum, Photo, AdminTodo, AuditLog, UserActivityLog,
  ActivityProgress, ActivityMaterial, EmailLog, ProgressMeeting,
  Lab, LabReaction, LabComment, ResearchPaper, ResearchReport, ResearchProposal, WritingPaper, WritingPaperHistory,
  InterviewResponseReaction, InterviewResponseComment,
  ProfileLike, ProfileView, StudySession,
  ActivityParticipation, Award, ExternalActivity, ContentCreation,
  AlumniThesis, ThesisReference, ThesisClaim,
  CourseOffering, CourseEnrollment, ClassSession, ClassSessionMode, CourseSessionNote, CourseTodo, SemesterTerm, ComprehensiveExamRecord, CourseReview,
  GuideTrack, GuideItem, GuideProgress,
  HostRetrospective, HostActivityType,
  SitePopup,
  DefensePracticeSet, DefenseQuestionTemplate,
  GradLifePosition,
  ConferenceProgram, UserSessionPlan,
  ArchiveConcept, ArchiveVariable, ArchiveMeasurementTool, ArchiveFavorite, ArchiveItemType,
  ReceivedBusinessCard,
  ConferenceWorkbookTask,
  ConferenceWorkbookSubmission,
  ConferenceWorkbookReview,
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

  upsert: async <T>(table: string, id: string, data: Record<string, unknown>): Promise<T> => {
    const ref = doc(db, table, id);
    const cleaned = stripUndefinedDeep(data);
    await setDoc(
      ref,
      { ...cleaned, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
      { merge: true },
    );
    const snap = await getDoc(ref);
    return serializeDoc(snap) as T;
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

// ── 대외학술대회 시간표 (v3) ──
export const conferenceProgramsApi = {
  /**
   * 활동에 연결된 프로그램 (보통 1개)
   * 복합 인덱스 회피: filter[activityId]만 사용. (activityId, createdAt DESC) 인덱스가 없어
   * sort 옵션을 함께 보내면 silent empty 반환 → 학술대회 프로그램이 안 보이는 버그 유발.
   */
  listByActivity: (activityId: string) =>
    dataApi.list<ConferenceProgram>("conference_programs", {
      "filter[activityId]": activityId,
      limit: 10,
    }),
  get: (id: string) => dataApi.get<ConferenceProgram>("conference_programs", id),
  create: (data: Record<string, unknown>) =>
    dataApi.create<ConferenceProgram>("conference_programs", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<ConferenceProgram>("conference_programs", id, data),
  delete: (id: string) => dataApi.delete("conference_programs", id),
};

// ── 회원의 학술대회 세션 선택·후기 (v3) ──
export const userSessionPlansApi = {
  /** 한 회원의 한 프로그램 내 모든 선택 */
  listByUserAndProgram: (userId: string, programId: string) =>
    dataApi.list<UserSessionPlan>("user_session_plans", {
      "filter[userId]": userId,
      "filter[programId]": programId,
      limit: 500,
    }),
  /** 한 회원의 모든 학술대회 일정 (마이페이지 모아보기) — 복합 인덱스 회피, client-side 정렬 */
  listByUser: (userId: string) =>
    dataApi.list<UserSessionPlan>("user_session_plans", {
      "filter[userId]": userId,
      limit: 500,
    }),
  /** 운영자: 한 프로그램의 모든 선택 (인기 세션 통계용) */
  listByProgram: (programId: string) =>
    dataApi.list<UserSessionPlan>("user_session_plans", {
      "filter[programId]": programId,
      limit: 2000,
    }),
  get: (id: string) => dataApi.get<UserSessionPlan>("user_session_plans", id),
  /** ID 명시 upsert (idempotent: {userId}_{programId}_{sessionId}) */
  upsert: async (id: string, data: Record<string, unknown>): Promise<UserSessionPlan> => {
    const ref = doc(db, "user_session_plans", id);
    const cleaned = stripUndefinedDeep(data);
    await setDoc(
      ref,
      { ...cleaned, updatedAt: serverTimestamp() },
      { merge: true },
    );
    const snap = await getDoc(ref);
    return serializeDoc(snap) as unknown as UserSessionPlan;
  },
  delete: (id: string) => dataApi.delete("user_session_plans", id),
};

// ── 받은 명함 (Received Business Cards) ──
export const receivedCardsApi = {
  listByOwner: (ownerId: string) =>
    // 복합 인덱스 회피: filter[ownerId] 만 사용. client side 정렬.
    dataApi.list<ReceivedBusinessCard>("received_business_cards", {
      "filter[ownerId]": ownerId,
      limit: 500,
    }),
  get: (id: string) => dataApi.get<ReceivedBusinessCard>("received_business_cards", id),
  create: (data: Omit<ReceivedBusinessCard, "id" | "createdAt">) =>
    dataApi.create<ReceivedBusinessCard>("received_business_cards", data as unknown as Record<string, unknown>),
  update: (id: string, data: Partial<ReceivedBusinessCard>) =>
    dataApi.update<ReceivedBusinessCard>("received_business_cards", id, data as unknown as Record<string, unknown>),
  delete: (id: string) => dataApi.delete("received_business_cards", id),
};

// ── 학술대회 워크북 (Sprint 67-F) ──
export const workbookTasksApi = {
  listByActivity: (activityId: string) =>
    // 복합 인덱스 회피: filter[activityId] 만. client side 정렬.
    dataApi.list<ConferenceWorkbookTask>("conference_workbook_tasks", {
      "filter[activityId]": activityId,
      limit: 500,
    }),
  get: (id: string) =>
    dataApi.get<ConferenceWorkbookTask>("conference_workbook_tasks", id),
  create: (data: Omit<ConferenceWorkbookTask, "id" | "createdAt">) =>
    dataApi.create<ConferenceWorkbookTask>(
      "conference_workbook_tasks",
      data as unknown as Record<string, unknown>,
    ),
  update: (id: string, data: Partial<ConferenceWorkbookTask>) =>
    dataApi.update<ConferenceWorkbookTask>(
      "conference_workbook_tasks",
      id,
      data as unknown as Record<string, unknown>,
    ),
  delete: (id: string) =>
    dataApi.delete("conference_workbook_tasks", id),
};

export const workbookSubmissionsApi = {
  listByUser: (userId: string, activityId: string) =>
    dataApi.list<ConferenceWorkbookSubmission>(
      "conference_workbook_submissions",
      {
        "filter[userId]": userId,
        "filter[activityId]": activityId,
        limit: 500,
      },
    ),
  listByTask: (taskId: string) =>
    dataApi.list<ConferenceWorkbookSubmission>(
      "conference_workbook_submissions",
      {
        "filter[taskId]": taskId,
        limit: 1000,
      },
    ),
  listByActivity: (activityId: string) =>
    dataApi.list<ConferenceWorkbookSubmission>(
      "conference_workbook_submissions",
      {
        "filter[activityId]": activityId,
        limit: 5000,
      },
    ),
  get: (id: string) =>
    dataApi.get<ConferenceWorkbookSubmission>(
      "conference_workbook_submissions",
      id,
    ),
  upsert: async (
    id: string,
    data: Record<string, unknown>,
  ): Promise<ConferenceWorkbookSubmission> => {
    const ref = doc(db, "conference_workbook_submissions", id);
    const cleaned = stripUndefinedDeep(data);
    await setDoc(
      ref,
      { ...cleaned, updatedAt: serverTimestamp() },
      { merge: true },
    );
    const snap = await getDoc(ref);
    return serializeDoc(snap) as unknown as ConferenceWorkbookSubmission;
  },
  delete: (id: string) =>
    dataApi.delete("conference_workbook_submissions", id),
};

export const workbookReviewsApi = {
  get: (id: string) =>
    dataApi.get<ConferenceWorkbookReview>("conference_workbook_reviews", id),
  listByActivity: (activityId: string) =>
    // 복합 인덱스 회피
    dataApi.list<ConferenceWorkbookReview>(
      "conference_workbook_reviews",
      {
        "filter[activityId]": activityId,
        limit: 1000,
      },
    ),
  upsert: async (
    id: string,
    data: Record<string, unknown>,
  ): Promise<ConferenceWorkbookReview> => {
    const ref = doc(db, "conference_workbook_reviews", id);
    const cleaned = stripUndefinedDeep(data);
    await setDoc(
      ref,
      { ...cleaned, updatedAt: serverTimestamp() },
      { merge: true },
    );
    const snap = await getDoc(ref);
    return serializeDoc(snap) as unknown as ConferenceWorkbookReview;
  },
  delete: (id: string) =>
    dataApi.delete("conference_workbook_reviews", id),
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

/** Sprint 63: 사용자 페이지 접속 이력 (관리자 read only). 클라이언트 write 만 허용 (자기 본인 userId). */
export const userActivityLogsApi = {
  list: (params?: QueryParams) =>
    dataApi.list<UserActivityLog>("user_activity_logs", { sort: "createdAt:desc", limit: 200, ...params }),
  listByUser: (userId: string, limit: number = 200) =>
    dataApi.list<UserActivityLog>("user_activity_logs", {
      "filter[userId]": userId,
      sort: "createdAt:desc",
      limit,
    }),
  create: (data: Record<string, unknown>) =>
    dataApi.create<UserActivityLog>("user_activity_logs", data),
  delete: (id: string) => dataApi.delete("user_activity_logs", id),
};

export const todosApi = {
  list: () => dataApi.list<AdminTodo>("admin_todos", { sort: "createdAt:desc" }),
  /** 학술활동 연동 todo 조회 — relatedActivityId로 필터.
   * 복합 인덱스 회피: 정렬은 클라이언트에서 처리 (참고: course_todos 동일 패턴) */
  listByActivity: (activityId: string) =>
    dataApi.list<AdminTodo>("admin_todos", {
      "filter[relatedActivityId]": activityId,
      limit: 200,
    }),
  /** 세미나 연동 todo 조회 — relatedSeminarId로 필터.
   * 복합 인덱스 회피: 정렬은 클라이언트에서 처리. */
  listBySeminar: (seminarId: string) =>
    dataApi.list<AdminTodo>("admin_todos", {
      "filter[relatedSeminarId]": seminarId,
      limit: 200,
    }),
  create: (data: Record<string, unknown>) => dataApi.create<AdminTodo>("admin_todos", data),
  update: (id: string, data: Record<string, unknown>) => dataApi.update<AdminTodo>("admin_todos", id, data),
  delete: (id: string) => dataApi.delete("admin_todos", id),
};

export const activityProgressApi = {
  /**
   * 복합 인덱스 회피: filter[activityId]만 사용, 정렬은 클라이언트에서.
   * (activityId, week ASC) 인덱스가 없어 sort 옵션을 함께 보내면 silent empty 반환됨
   * → 대시보드 타임라인의 스터디/프로젝트/대외 활동 일정이 안 뜨는 버그 유발.
   */
  list: (activityId: string) =>
    dataApi.list<ActivityProgress>("activity_progress", { "filter[activityId]": activityId }),
  create: (data: Record<string, unknown>) => dataApi.create<ActivityProgress>("activity_progress", data),
  update: (id: string, data: Record<string, unknown>) => dataApi.update<ActivityProgress>("activity_progress", id, data),
  delete: (id: string) => dataApi.delete("activity_progress", id),
};

// ── 진행 미팅 타이머 (실시간 회의 진행) ──
export const progressMeetingsApi = {
  /** activityProgressId 1개에 대한 미팅 단건 조회 (없으면 null) */
  getByProgress: async (activityProgressId: string): Promise<ProgressMeeting | null> => {
    const res = await dataApi.list<ProgressMeeting>("progress_meetings", {
      "filter[activityProgressId]": activityProgressId,
    });
    return res.data[0] ?? null;
  },
  get: (id: string) => dataApi.get<ProgressMeeting>("progress_meetings", id),
  create: (data: Record<string, unknown>) => dataApi.create<ProgressMeeting>("progress_meetings", data),
  update: (id: string, data: Record<string, unknown>) => dataApi.update<ProgressMeeting>("progress_meetings", id, data),
  delete: (id: string) => dataApi.delete("progress_meetings", id),
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
  listAll: (limit: number = 5000) =>
    dataApi.list<ResearchPaper>("research_papers", { limit }),
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
  /** 운영진 콘솔용 — 모든 회원의 작성중 논문을 한 번에 로드 */
  listAll: (limit: number = 1000) =>
    dataApi.list<WritingPaper>("writing_papers", { limit }),
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
  listAll: (limit: number = 10000) =>
    dataApi.list<StudySession>("study_sessions", { limit }),
  get: (id: string) => dataApi.get<StudySession>("study_sessions", id),
  create: (data: Record<string, unknown>) =>
    dataApi.create<StudySession>("study_sessions", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<StudySession>("study_sessions", id, data),
  delete: (id: string) => dataApi.delete("study_sessions", id),
};

export const defensePracticesApi = {
  listByUser: (userId: string) =>
    dataApi.list<DefensePracticeSet>("defense_practice_sets", {
      "filter[userId]": userId,
      limit: 200,
    }),
  get: (id: string) =>
    dataApi.get<DefensePracticeSet>("defense_practice_sets", id),
  create: (data: Record<string, unknown>) =>
    dataApi.create<DefensePracticeSet>("defense_practice_sets", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<DefensePracticeSet>("defense_practice_sets", id, data),
  delete: (id: string) => dataApi.delete("defense_practice_sets", id),
};

export const defenseQuestionTemplatesApi = {
  listActive: async () => {
    const res = await dataApi.list<DefenseQuestionTemplate>(
      "defense_question_templates",
      { sort: "createdAt:desc", limit: 200 },
    );
    return { ...res, data: res.data.filter((t) => t.active === true) };
  },
  listAll: () =>
    dataApi.list<DefenseQuestionTemplate>("defense_question_templates", {
      sort: "createdAt:desc",
      limit: 200,
    }),
  get: (id: string) =>
    dataApi.get<DefenseQuestionTemplate>("defense_question_templates", id),
  create: (data: Record<string, unknown>) =>
    dataApi.create<DefenseQuestionTemplate>("defense_question_templates", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<DefenseQuestionTemplate>("defense_question_templates", id, data),
  delete: (id: string) => dataApi.delete("defense_question_templates", id),
};

export const researchReportsApi = {
  listByUser: (userId: string) =>
    dataApi.list<ResearchReport>("research_reports", {
      "filter[userId]": userId,
      limit: 50,
    }),
  listAll: (limit = 200) =>
    dataApi.list<ResearchReport>("research_reports", {
      sort: "updatedAt:desc",
      limit,
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
  /** 운영진 콘솔용 — 모든 회원의 연구 계획서를 한 번에 로드 */
  listAll: (limit = 500) =>
    dataApi.list<ResearchProposal>("research_proposals", {
      sort: "updatedAt:desc",
      limit,
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
  /**
   * 과목별 수강생 목록.
   * sort 파라미터를 빼서 Firestore 복합 인덱스(courseOfferingId + studentName) 요구를 회피한다.
   * 호출부에서 studentName 기준 정렬.
   */
  listByCourse: (courseOfferingId: string) =>
    dataApi.list<CourseEnrollment>("course_enrollments", {
      "filter[courseOfferingId]": courseOfferingId,
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
  /**
   * 복합 인덱스 회피: filter[courseOfferingId]만 사용, 정렬은 클라이언트에서.
   * (courseOfferingId, date ASC) 인덱스가 없어 sort 옵션을 함께 보내면 silent empty 반환됨
   * → 수업형태 변경 후 refetch가 빈 결과로 optimistic update를 덮어쓰는 버그 유발.
   */
  listByCourse: (courseOfferingId: string) =>
    dataApi.list<ClassSession>("class_sessions", {
      "filter[courseOfferingId]": courseOfferingId,
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
    // 복합 인덱스 회피: filter[in]+sort 조합도 silent empty 위험. 정렬은 호출자에서.
    return dataApi.list<ClassSession>("class_sessions", {
      "filter[courseOfferingId][in]": courseIds.join(","),
      limit: 1000,
    });
  },
  create: (data: Record<string, unknown>) =>
    dataApi.create<ClassSession>("class_sessions", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<ClassSession>("class_sessions", id, data),
  delete: (id: string) => dataApi.delete("class_sessions", id),
  saveAttendance: (
    id: string,
    payload: {
      attendedUserIds: string[];
      attendedStudentIds: string[];
      absenceNotes: Record<string, string>;
      attendanceUpdatedBy: string;
    },
  ) =>
    dataApi.update<ClassSession>("class_sessions", id, {
      ...payload,
      attendanceUpdatedAt: new Date().toISOString(),
    }),
  bulkUpsertAttendance: async (
    courseOfferingId: string,
    date: string,
    payload: {
      attendedUserIds: string[];
      attendedStudentIds: string[];
      absenceNotes: Record<string, string>;
      attendanceUpdatedBy: string;
    },
    fallback: { mode: ClassSessionMode; createdBy: string },
  ) => {
    const existing = await dataApi.list<ClassSession>("class_sessions", {
      "filter[courseOfferingId]": courseOfferingId,
      "filter[date]": date,
      limit: 1,
    });
    const attendanceUpdatedAt = new Date().toISOString();
    const target = existing.data[0];
    if (target) {
      return dataApi.update<ClassSession>("class_sessions", target.id, {
        ...payload,
        attendanceUpdatedAt,
      });
    }
    const now = new Date().toISOString();
    return dataApi.create<ClassSession>("class_sessions", {
      courseOfferingId,
      date,
      mode: fallback.mode,
      createdBy: fallback.createdBy,
      createdAt: now,
      updatedAt: now,
      ...payload,
      attendanceUpdatedAt,
    });
  },
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
  /**
   * 복합 인덱스 회피: filter[userId]만 사용, 정렬은 클라이언트에서.
   * (userId, createdAt DESC) 인덱스가 없어 sort 옵션을 함께 보내면 silent empty 반환됨
   * → 대시보드/팝업의 "수업 할 일"이 비어 보이는 버그 유발.
   */
  listByUser: (userId: string) =>
    dataApi.list<CourseTodo>("course_todos", {
      "filter[userId]": userId,
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
  /**
   * 회원 뷰 — published === true 트랙만.
   * bkend의 boolean filter가 string "true"와 매칭되지 않아 콘솔 토글이 반영되지 않던 버그가 있어
   * guideItemsApi.listPublishedByTrack과 동일한 클라이언트-사이드 필터 패턴으로 통일.
   */
  listPublished: async () => {
    const res = await dataApi.list<GuideTrack>("guide_tracks", {
      sort: "order:asc",
      limit: 50,
    });
    return { ...res, data: res.data.filter((t) => t.published === true) };
  },
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

// ── Card News Series (인스타그램 스타일 시리즈) ──
import type { CardNewsSeries } from "@/features/card-news/types";

export const cardNewsApi = {
  list: () =>
    dataApi.list<CardNewsSeries>("card_news_series", {
      sort: "publishedAt:desc",
      limit: 200,
    }),
  get: (id: string) => dataApi.get<CardNewsSeries>("card_news_series", id),
  /** 사용자 지정 ID로 upsert (정적 fallback과 동일한 ID를 유지하기 위해 setDoc 사용) */
  upsert: async (id: string, data: Record<string, unknown>): Promise<CardNewsSeries> => {
    const ref = doc(db, "card_news_series", id);
    const cleaned = stripUndefinedDeep(data);
    await setDoc(
      ref,
      { ...cleaned, updatedAt: serverTimestamp() },
      { merge: true },
    );
    const snap = await getDoc(ref);
    return serializeDoc(snap) as unknown as CardNewsSeries;
  },
  delete: (id: string) => dataApi.delete("card_news_series", id),
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

// ── Grad Life Positions (대학원 생활 활동 이력 — 전공대표·조교·학회 운영진) ──
export const gradLifePositionsApi = {
  /** 전체 목록 (운영콘솔용) */
  list: (params?: QueryParams) =>
    dataApi.list<GradLifePosition>("grad_life_positions", {
      sort: "startYear:desc",
      limit: 2000,
      ...params,
    }),
  /** 회원별 활동 이력 (프로필 표시용)
   * NOTE: where(userId)+orderBy(startYear) 복합 인덱스 회피 — 클라이언트 정렬에 의존(ProfileGradLife) */
  listByUser: (userId: string) =>
    dataApi.list<GradLifePosition>("grad_life_positions", {
      "filter[userId]": userId,
      limit: 200,
    }),
  get: (id: string) => dataApi.get<GradLifePosition>("grad_life_positions", id),
  create: (data: Record<string, unknown>) =>
    dataApi.create<GradLifePosition>("grad_life_positions", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<GradLifePosition>("grad_life_positions", id, data),
  delete: (id: string) => dataApi.delete("grad_life_positions", id),
};

// ── 교육공학 아카이브 ──
export const archiveConceptsApi = {
  list: () => dataApi.list<ArchiveConcept>("archive_concepts", { limit: 500 }),
  get: (id: string) => dataApi.get<ArchiveConcept>("archive_concepts", id),
  create: (data: Record<string, unknown>) =>
    dataApi.create<ArchiveConcept>("archive_concepts", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<ArchiveConcept>("archive_concepts", id, data),
  delete: (id: string) => dataApi.delete("archive_concepts", id),
};

export const archiveVariablesApi = {
  list: () => dataApi.list<ArchiveVariable>("archive_variables", { limit: 500 }),
  get: (id: string) => dataApi.get<ArchiveVariable>("archive_variables", id),
  create: (data: Record<string, unknown>) =>
    dataApi.create<ArchiveVariable>("archive_variables", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<ArchiveVariable>("archive_variables", id, data),
  delete: (id: string) => dataApi.delete("archive_variables", id),
};

export const archiveMeasurementsApi = {
  list: () => dataApi.list<ArchiveMeasurementTool>("archive_measurements", { limit: 500 }),
  get: (id: string) => dataApi.get<ArchiveMeasurementTool>("archive_measurements", id),
  create: (data: Record<string, unknown>) =>
    dataApi.create<ArchiveMeasurementTool>("archive_measurements", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<ArchiveMeasurementTool>("archive_measurements", id, data),
  delete: (id: string) => dataApi.delete("archive_measurements", id),
};

export const archiveFavoritesApi = {
  listByUser: (userId: string) =>
    dataApi.list<ArchiveFavorite>("archive_favorites", {
      "filter[userId]": userId,
      limit: 500,
    }),
  upsert: (id: string, data: Record<string, unknown>) =>
    dataApi.upsert<ArchiveFavorite>("archive_favorites", id, data),
  delete: (id: string) => dataApi.delete("archive_favorites", id),
  /** 즐겨찾기 단축 ID — 사용자×아이템 단일성 보장 */
  makeId: (userId: string, itemType: ArchiveItemType, itemId: string) =>
    `${userId}_${itemType}_${itemId}`,
};
