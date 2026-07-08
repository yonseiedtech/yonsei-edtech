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
  documentId,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
  Timestamp,
  FieldValue,
  arrayUnion,
  arrayRemove,
  increment,
  type QueryConstraint,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import type {
  User, Post, Comment, Seminar, SeminarSession, SeminarAttendee,
  SeminarRegistration, Certificate, PromotionContent, SeminarMaterial,
  SeminarReview, Inquiry, Activity, AppNotification, WaitlistEntry, DirectMessage,
  Poll, PollResponse, PhotoAlbum, Photo, AdminTodo, AuditLog, UserActivityLog,
  ActivityProgress, ActivityMaterial, EmailLog, ProgressMeeting,
  Lab, LabReaction, LabComment, ResearchPaper, ResearchReport, ResearchProposal, WritingPaper, WritingPaperHistory, WritingPaperVersion, AdvisorFeedbackNote,
  InterviewResponseReaction, InterviewResponseComment,
  ProfileLike, ProfileView, StudySession,
  ApplicantEntry, PublicSpeaker,
  ActivityParticipation, ActivityRole, Award, ExternalActivity, ContentCreation,
  AlumniThesis, ThesisReference, ThesisClaim,
  CourseOffering, CourseEnrollment, ClassSession, ClassSessionMode, CourseSessionNote, CourseTodo, SemesterTerm, ComprehensiveExamRecord, CourseReview,
  GuideTrack, GuideItem, GuideProgress,
  HostRetrospective, HostActivityType,
  SitePopup,
  DefensePracticeSet, DefenseQuestionTemplate,
  GradLifePosition,
  ConferenceProgram, UserSessionPlan,
  ArchiveConcept, ArchiveVariable, ArchiveMeasurementTool, ArchiveFavorite, ArchiveFavoriteItemType,
  ResearchMethod, ResearchMethodKind,
  ReceivedBusinessCard,
  ConferenceWorkbookTask,
  ConferenceWorkbookSubmission,
  ConferenceWorkbookReview,
  ConferenceAttendeeReview,
  ConferenceAttendeeReviewRegrets,
  VolunteerAssignment,
  VolunteerDuty,
  SpeakerAssignment,
  SpeakerPrepTask,
  PostReaction,
  PostReactionType,
  StudySessionReflection,
  StudyAssignment,
  StudyAssignmentSubmission,
  StudySessionNote,
  OnboardingChecklistItem,
  StreakEvent,
  StreakEventType,
  UserFeedback,
  UserNote,
  CollaborativeResearch,
  CollabResearchMember,
  CollabResearchInvite,
  CreateCollabResearchInput,
  UpdateCollabResearchInput,
  CreateCollabInviteInput,
  CollabMemberRole,
  CreditRole,
  ResearchJournalIssue,
  ResearchJournalArticle,
  CreateJournalIssueInput,
  UpdateJournalIssueInput,
  UpdateArticleMetaInput,
  ArticleAuthorSnapshot,
  ArticleVisibility,
  ArticleReviewStatus,
  PublicationType,
  ReviewComment,
  AuthorConsent,
  CollabResearchChapter,
  CollabResearchComment,
  CollabResearchMeeting,
  CollabResearchMilestone,
  CreateChapterInput,
  UpdateChapterInput,
  CreateCommentInput,
  CreateMeetingInput,
  UpdateMeetingInput,
  CreateMilestoneInput,
  UpdateMilestoneInput,
  CommBoard,
  CommQuestion,
  CommAnswer,
  CommLike,
  CommContextType,
  CommLikeTarget,
  NetworkingEvent,
  NetworkingEventToken,
  NetworkingRsvp,
  NetworkingReview,
  NetworkingDue,
  NetworkingAvailability,
  NetworkingEventProgram,
  TopicExploration,
  GraduationRequirement,
  GraduationProgress,
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
    // codex-M9(2026-07-07): filter[field][in]=a,b,c 지원 — 기존엔 무시되어 전체 로드됨
    const inMatch = key.match(/^filter\[(\w+)\]\[in\]$/);
    if (inMatch) {
      const arr = String(value).split(",").map((v) => v.trim()).filter(Boolean);
      if (arr.length === 0) {
        // 빈 in → 결과 없음을 강제 (전체 로드 방지)
        constraints.push(where(inMatch[1], "in", ["__never__"]));
      } else {
        constraints.push(where(inMatch[1], "in", arr.slice(0, 30)));
      }
      continue;
    }
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

// boolean: parseFilters 가 원본 타입 보존으로 1급 처리 (filter[published]=true 등)
type QueryParams = Record<string, string | number | boolean | undefined>;

/** Recursively strip `undefined` values — Firestore rejects undefined at any nesting level.
 *  FieldValue 인스턴스(deleteField/serverTimestamp/arrayUnion/arrayRemove/increment 등)는
 *  Firestore sentinel 이므로 절대 분해하지 않고 그대로 통과시킨다. */
function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => stripUndefinedDeep(v)) as unknown as T;
  }
  if (
    value &&
    typeof value === "object" &&
    !(value instanceof Date) &&
    !(value instanceof Timestamp) &&
    !(value instanceof FieldValue)
  ) {
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

/**
 * firestore.rules postCategoryReadable 의 public 분기와 동기화.
 * 카테고리 무필터 posts list 는 rules 정적 평가에서 거부되므로(2026-06-12 실증),
 * 전체 조회는 반드시 listReadable(공개 enum in 쿼리)을 사용한다.
 */
export const PUBLIC_POST_CATEGORIES = [
  "notice", "seminar", "free", "promotion", "press", "interview", "paper_review", "update",
] as const;

export const postsApi = {
  /** 공개(+권한별 추가) 카테고리 한정 전체 조회 — posts(category, createdAt desc) 복합 인덱스 사용 */
  listReadable: async (opts?: {
    limit?: number;
    includeResources?: boolean;
    includeStaff?: boolean;
  }): Promise<ListResponse<Post>> => {
    const cats: string[] = [...PUBLIC_POST_CATEGORIES];
    if (opts?.includeResources) cats.push("resources");
    if (opts?.includeStaff) cats.push("staff");
    const constraints: QueryConstraint[] = [
      where("category", "in", cats),
      orderBy("createdAt", "desc"),
    ];
    if (opts?.limit) constraints.push(firestoreLimit(opts.limit));
    const q = query(collection(db, "posts"), ...constraints);
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((d) => serializeDoc(d) as unknown as Post);
    return { data, total: data.length, page: 1, limit: opts?.limit ?? data.length };
  },
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

/**
 * P1-1b(2026-07-04): users 클라이언트 list 가 staff 로 축소되어
 * 목록·일괄 조회는 역할 인지 투영 API(/api/members/basic)를 경유한다.
 * (staff 요청 = 전체 필드, 일반 회원 = 연락처·학번 제거 — 호출부 시그니처 무변경)
 */
async function fetchMembersBasic(params: Record<string, string | number | boolean | undefined>): Promise<{ data: User[]; total: number; page: number; limit: number }> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("로그인이 필요합니다.");
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const res = await fetch(`/api/members/basic?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("회원 목록 조회에 실패했습니다.");
  const json = (await res.json()) as { data: User[]; total: number };
  return { ...json, page: 1, limit: json.data.length };
}

export const profilesApi = {
  list: (params?: QueryParams) =>
    fetchMembersBasic({
      approved: params?.["filter[approved]"],
      role: params?.["filter[role]"] as string | undefined,
      limit: params?.limit as number | undefined,
    }),
  get: (id: string) => dataApi.get<User>("users", id),
  /**
   * 여러 사용자 프로필을 일괄 조회 — N+1 회피용.
   * Firestore `where(__name__, "in", [...])` 는 한 번에 최대 30개라 30개 단위로 청킹.
   * 중복 ID 제거 후 처리. 결과 순서는 보장되지 않으므로 호출자가 Map 화 필요.
   */
  listByIds: async (ids: string[]): Promise<User[]> => {
    const unique = Array.from(new Set(ids.filter(Boolean)));
    if (unique.length === 0) return [];
    const chunks: string[][] = [];
    for (let i = 0; i < unique.length; i += 300) chunks.push(unique.slice(i, i + 300));
    const results = await Promise.all(
      chunks.map(async (chunk) => (await fetchMembersBasic({ ids: chunk.join(",") })).data),
    );
    return results.flat();
  },
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
  // QA-v3 H1: qrToken 이 어디서도 발급되지 않아 QR 스캔 체크인이 전면 불능이었음 — 등록 시 발급
  add: (seminarId: string, userId: string) =>
    dataApi.create<SeminarAttendee>("seminar_attendees", { seminarId, userId, qrToken: crypto.randomUUID() }),
  addWithDetails: (seminarId: string, data: Record<string, unknown>) =>
    dataApi.create<SeminarAttendee>("seminar_attendees", { seminarId, qrToken: crypto.randomUUID(), ...data }),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<SeminarAttendee>("seminar_attendees", id, data),
  remove: (id: string) => dataApi.delete("seminar_attendees", id),
};

// ── 모임·네트워킹 (사이클 73) — firestore.rules networking_* 와 양쪽 게이트 ──
export const networkingEventsApi = {
  list: () => dataApi.list<NetworkingEvent>("networking_events", { limit: 200 }),
  listPublished: () =>
    dataApi.list<NetworkingEvent>("networking_events", { "filter[published]": true, limit: 200 }),
  get: (id: string) => dataApi.get<NetworkingEvent>("networking_events", id),
  /**
   * @deprecated (High-1 2026-07-08) 레거시 폴백 전용 — 이벤트 문서의 shareToken 필드로 단건 조회.
   * 신규 경로는 eventTokensApi.get(token) → networking_events.get(eventId) 를 사용한다.
   */
  getByToken: (token: string) =>
    dataApi.list<NetworkingEvent>("networking_events", { "filter[shareToken]": token, limit: 1 }),
  create: (data: Omit<NetworkingEvent, "id">) =>
    dataApi.create<NetworkingEvent>("networking_events", data as unknown as Record<string, unknown>),
  update: (id: string, data: Partial<NetworkingEvent>) =>
    dataApi.update<NetworkingEvent>("networking_events", id, data as unknown as Record<string, unknown>),
  remove: (id: string) => dataApi.delete("networking_events", id),
};

// ── 비공개 모임 공유 토큰 매핑 (High-1 보안 핫픽스 2026-07-08) ──
// networking_events 공개 read 로 인한 shareToken 열거를 차단하기 위해
// 토큰↔eventId 매핑을 별도 컬렉션(문서 id = 토큰)에 분리 저장한다.
// firestore.rules networking_event_tokens 와 양쪽 게이트.
export const eventTokensApi = {
  /** 토큰(문서 id)으로 단건 조회 — 없으면 null. rules 상 get 은 누구나, list(열거)는 staff 만. */
  get: async (token: string): Promise<NetworkingEventToken | null> => {
    try {
      return await dataApi.get<NetworkingEventToken>("networking_event_tokens", token);
    } catch {
      return null;
    }
  },
  /** staff 역조회 — eventId 로 발급된 토큰 매핑 목록 */
  listByEvent: (eventId: string) =>
    dataApi.list<NetworkingEventToken>("networking_event_tokens", { "filter[eventId]": eventId, limit: 10 }),
  /** 토큰 매핑 생성(upsert — 문서 id = 토큰, idempotent) */
  create: (token: string, data: Omit<NetworkingEventToken, "id" | "createdAt" | "updatedAt">) =>
    dataApi.upsert<NetworkingEventToken>("networking_event_tokens", token, data as unknown as Record<string, unknown>),
};

export const networkingRsvpsApi = {
  listByEvent: (eventId: string) =>
    dataApi.list<NetworkingRsvp>("networking_rsvps", { "filter[eventId]": eventId, limit: 500 }),
  listByUser: (userId: string) =>
    dataApi.list<NetworkingRsvp>("networking_rsvps", { "filter[userId]": userId, limit: 200 }),
  check: (eventId: string, userId: string) =>
    dataApi.list<NetworkingRsvp>("networking_rsvps", {
      "filter[eventId]": eventId,
      "filter[userId]": userId,
    }),
  create: (data: Omit<NetworkingRsvp, "id">) =>
    dataApi.create<NetworkingRsvp>("networking_rsvps", data as unknown as Record<string, unknown>),
  update: (id: string, data: Partial<NetworkingRsvp>) =>
    dataApi.update<NetworkingRsvp>("networking_rsvps", id, data as unknown as Record<string, unknown>),
  remove: (id: string) => dataApi.delete("networking_rsvps", id),
};

export const networkingDuesApi = {
  listByEvent: (eventId: string) =>
    dataApi.list<NetworkingDue>("networking_dues", { "filter[eventId]": eventId, limit: 500 }),
  listByUser: (userId: string) =>
    dataApi.list<NetworkingDue>("networking_dues", { "filter[userId]": userId, limit: 200 }),
  create: (data: Omit<NetworkingDue, "id">) =>
    dataApi.create<NetworkingDue>("networking_dues", data as unknown as Record<string, unknown>),
  update: (id: string, data: Partial<NetworkingDue>) =>
    dataApi.update<NetworkingDue>("networking_dues", id, data as unknown as Record<string, unknown>),
  remove: (id: string) => dataApi.delete("networking_dues", id),
};

export const networkingReviewsApi = {
  listByEvent: (eventId: string) =>
    dataApi.list<NetworkingReview>("networking_reviews", { "filter[eventId]": eventId, limit: 300 }),
  listByUser: (userId: string) =>
    dataApi.list<NetworkingReview>("networking_reviews", { "filter[userId]": userId, limit: 200 }),
  /** 1인 1건 보장 — 결정적 doc id (eventId_userId) upsert. 중복 생성으로 평균 왜곡 방지. */
  upsertMine: (data: Omit<NetworkingReview, "id">) =>
    dataApi.upsert<NetworkingReview>(
      "networking_reviews",
      `${data.eventId}_${data.userId}`,
      data as unknown as Record<string, unknown>,
    ),
  create: (data: Omit<NetworkingReview, "id">) =>
    dataApi.create<NetworkingReview>("networking_reviews", data as unknown as Record<string, unknown>),
  update: (id: string, data: Partial<NetworkingReview>) =>
    dataApi.update<NetworkingReview>("networking_reviews", id, data as unknown as Record<string, unknown>),
  remove: (id: string) => dataApi.delete("networking_reviews", id),
};

// ── 일정 조율(poll) 응답 · 세부 프로그램 (사이클 124) ──
export const networkingAvailabilityApi = {
  listByEvent: (eventId: string) =>
    dataApi.list<NetworkingAvailability>("networking_availability", { "filter[eventId]": eventId, limit: 500 }),
  create: (data: Omit<NetworkingAvailability, "id">) =>
    dataApi.create<NetworkingAvailability>("networking_availability", data as unknown as Record<string, unknown>),
  update: (id: string, data: Partial<NetworkingAvailability>) =>
    dataApi.update<NetworkingAvailability>("networking_availability", id, data as unknown as Record<string, unknown>),
  remove: (id: string) => dataApi.delete("networking_availability", id),
};

export const networkingProgramsApi = {
  listByEvent: (eventId: string) =>
    dataApi.list<NetworkingEventProgram>("networking_event_programs", { "filter[eventId]": eventId, limit: 200 }),
  create: (data: Omit<NetworkingEventProgram, "id">) =>
    dataApi.create<NetworkingEventProgram>("networking_event_programs", data as unknown as Record<string, unknown>),
  update: (id: string, data: Partial<NetworkingEventProgram>) =>
    dataApi.update<NetworkingEventProgram>("networking_event_programs", id, data as unknown as Record<string, unknown>),
  remove: (id: string) => dataApi.delete("networking_event_programs", id),
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
  /** 본인 신청 여부 확인용 — rules(본인/이메일/스태프)와 정합하는 필터 쿼리 */
  listMineByUser: (seminarId: string, userId: string) =>
    dataApi.list<SeminarRegistration>("seminar_registrations", {
      "filter[seminarId]": seminarId,
      "filter[userId]": userId,
    }),
  listMineByEmail: (seminarId: string, email: string) =>
    dataApi.list<SeminarRegistration>("seminar_registrations", {
      "filter[seminarId]": seminarId,
      "filter[email]": email,
    }),
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
  /**
   * applicants/participants 를 Firestore 트랜잭션으로 원자적 수정.
   * mutator 는 항상 최신 값을 받으므로 동시 신청·stale 캐시로 인한
   * lost update(신청자 누락)를 방지한다.
   *
   * data-split 리팩토링 후: 내부적으로 `activityApplicantsApi.mutate` 로 위임한다.
   * applicants 는 비공개 컬렉션 `activity_applicants/{id}` 에 저장되고,
   * participants 와 publicSpeakers 만 activities 문서에 반영된다.
   * (시그니처 유지 — 기존 호출처 영향 최소화)
   */
  mutateRoster: async (
    id: string,
    mutator: (current: {
      applicants: ApplicantEntry[];
      participants: string[];
    }) => { applicants?: unknown[]; participants?: string[] },
  ): Promise<void> => {
    await activityApplicantsApi.mutate(id, mutator);
  },
  delete: (id: string) => dataApi.delete("activities", id),
};

/** 발표자(speaker) applicants → activities 문서용 비-PII 공개 투영 계산 */
export function computePublicSpeakers(applicants: ApplicantEntry[]): PublicSpeaker[] {
  return applicants
    .filter((a) => a.participantType === "speaker")
    .map((a) => ({
      name: a.name,
      submissionType: a.speakerSubmissionType,
      paperTitle: a.speakerPaperTitle,
    }));
}

// ── 활동 신청자 (data-split: activity_applicants 비공개 컬렉션) ──
// 신청자 PII 는 activities 문서가 아닌 activity_applicants/{activityId} 에 분리 저장한다.
// staff 권한 클라이언트에서만 호출됨 (firestore.rules 상 staff 만 write 가능).
export const activityApplicantsApi = {
  /**
   * 신청자 목록 조회. activity_applicants/{id} 가 없으면(마이그레이션 전)
   * activities/{id}.applicants 필드로 fallback.
   */
  get: async (activityId: string): Promise<ApplicantEntry[]> => {
    const splitSnap = await getDoc(doc(db, "activity_applicants", activityId));
    if (splitSnap.exists()) {
      return ((splitSnap.data().applicants as ApplicantEntry[]) ?? []);
    }
    // dual-read fallback — 마이그레이션 전 안전성
    const actSnap = await getDoc(doc(db, "activities", activityId));
    if (!actSnap.exists()) return [];
    return ((actSnap.data().applicants as ApplicantEntry[]) ?? []);
  },
  /**
   * applicants/participants 를 Firestore 트랜잭션으로 원자적 수정.
   *  1. activity_applicants/{id} 읽기. 없으면 activities/{id}.applicants 로 seed.
   *  2. activities/{id} 읽기 (participants 용).
   *  3. mutator 호출 → { applicants?, participants? }.
   *  4. tx.set(activity_applicants/{id}, { applicants 최종, updatedAt }).
   *  5. tx.update(activities/{id}, { participants?, publicSpeakers, updatedAt }).
   */
  mutate: async (
    activityId: string,
    mutator: (current: {
      applicants: ApplicantEntry[];
      participants: string[];
    }) => { applicants?: unknown[]; participants?: string[] },
  ): Promise<void> => {
    const splitRef = doc(db, "activity_applicants", activityId);
    const actRef = doc(db, "activities", activityId);
    await runTransaction(db, async (tx) => {
      const splitSnap = await tx.get(splitRef);
      const actSnap = await tx.get(actRef);
      if (!actSnap.exists()) throw new Error("활동을 찾을 수 없습니다.");
      const actData = actSnap.data();
      // seed: split doc 이 없으면 activities.applicants 로 초기화
      const currentApplicants: ApplicantEntry[] = splitSnap.exists()
        ? ((splitSnap.data().applicants as ApplicantEntry[]) ?? [])
        : ((actData.applicants as ApplicantEntry[]) ?? []);
      const currentParticipants = (actData.participants as string[]) ?? [];

      const patch = mutator({
        applicants: currentApplicants,
        participants: currentParticipants,
      });

      const finalApplicants = (patch.applicants as ApplicantEntry[] | undefined) ?? currentApplicants;
      const finalParticipants = patch.participants;

      tx.set(splitRef, stripUndefinedDeep({
        applicants: finalApplicants,
        updatedAt: serverTimestamp(),
      }));

      const actUpdate: Record<string, unknown> = {
        publicSpeakers: computePublicSpeakers(finalApplicants),
        updatedAt: serverTimestamp(),
      };
      if (finalParticipants !== undefined) {
        actUpdate.participants = finalParticipants;
      }
      tx.update(actRef, stripUndefinedDeep(actUpdate));
    });
  },
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

// ── 학술대회 참석자 후기 (Sprint 67-Z) ──
export const attendeeReviewsApi = {
  /** 한 학술대회의 모든 후기 (개요 하단 표시용) — 복합 인덱스 회피 */
  listByActivity: (activityId: string) =>
    dataApi.list<ConferenceAttendeeReview>("conference_attendee_reviews", {
      "filter[activityId]": activityId,
      limit: 1000,
    }),
  /** 한 회원의 모든 학술대회 후기 (프로필 학술활동 리스트용) */
  listByUser: (userId: string) =>
    dataApi.list<ConferenceAttendeeReview>("conference_attendee_reviews", {
      "filter[userId]": userId,
      limit: 500,
    }),
  get: (id: string) =>
    dataApi.get<ConferenceAttendeeReview>("conference_attendee_reviews", id),
  /**
   * ID 명시 upsert (idempotent: {userId}_{activityId})
   * QA-H1: regrets 필드는 별도 collection (conference_attendee_review_regrets) 으로 분리 저장.
   * 일반 reviews 에서는 regrets 제외 → 다른 사용자가 페이로드에서 열람 불가.
   */
  upsert: async (
    id: string,
    data: Record<string, unknown>,
  ): Promise<ConferenceAttendeeReview> => {
    const ref = doc(db, "conference_attendee_reviews", id);
    // regrets 분리 — 일반 doc 에서 제거
    const { regrets, ...mainData } = data as { regrets?: string } & Record<string, unknown>;
    const cleaned = stripUndefinedDeep(mainData);
    const existing = await getDoc(ref);
    const isNew = !existing.exists();
    await setDoc(
      ref,
      {
        ...cleaned,
        ...(isNew ? { createdAt: serverTimestamp() } : {}),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    // regrets 별도 collection 저장 (있을 때만)
    if (typeof regrets === "string" && regrets.trim()) {
      const regRef = doc(db, "conference_attendee_review_regrets", id);
      const regExisting = await getDoc(regRef);
      const regIsNew = !regExisting.exists();
      await setDoc(
        regRef,
        {
          id,
          userId: (mainData as { userId?: string }).userId,
          activityId: (mainData as { activityId?: string }).activityId,
          regrets: regrets.trim(),
          ...(regIsNew ? { createdAt: serverTimestamp() } : {}),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } else {
      // regrets 빈 문자열로 저장 시도 → 기존 regrets 삭제
      try {
        await dataApi.delete("conference_attendee_review_regrets", id);
      } catch {
        /* 없으면 무시 */
      }
    }
    const snap = await getDoc(ref);
    return serializeDoc(snap) as unknown as ConferenceAttendeeReview;
  },
  /** 본인 또는 운영진이 단일 doc 의 regrets 조회 */
  getMyRegrets: (id: string) =>
    dataApi.get<ConferenceAttendeeReviewRegrets>(
      "conference_attendee_review_regrets",
      id,
    ),
  /** 운영진이 한 학술대회의 모든 regrets 조회 */
  listRegretsByActivity: (activityId: string) =>
    dataApi.list<ConferenceAttendeeReviewRegrets>(
      "conference_attendee_review_regrets",
      {
        "filter[activityId]": activityId,
        limit: 1000,
      },
    ),
  delete: (id: string) =>
    dataApi.delete("conference_attendee_reviews", id),
};

// ── 학술대회 자원봉사자 (Sprint 67-AJ) ──
export const volunteerAssignmentsApi = {
  listByActivity: (activityId: string) =>
    // 복합 인덱스 회피: filter[activityId] 만
    dataApi.list<VolunteerAssignment>("volunteer_assignments", {
      "filter[activityId]": activityId,
      limit: 500,
    }),
  listByUser: (userId: string) =>
    dataApi.list<VolunteerAssignment>("volunteer_assignments", {
      "filter[userId]": userId,
      limit: 500,
    }),
  get: (id: string) =>
    dataApi.get<VolunteerAssignment>("volunteer_assignments", id),
  upsert: async (
    id: string,
    data: Record<string, unknown>,
  ): Promise<VolunteerAssignment> => {
    const ref = doc(db, "volunteer_assignments", id);
    const cleaned = stripUndefinedDeep(data);
    const existing = await getDoc(ref);
    const isNew = !existing.exists();
    await setDoc(
      ref,
      {
        ...cleaned,
        ...(isNew ? { createdAt: serverTimestamp() } : {}),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    const snap = await getDoc(ref);
    return serializeDoc(snap) as unknown as VolunteerAssignment;
  },
  /**
   * duties 배열을 Firestore 트랜잭션으로 원자적 수정.
   * mutator 는 항상 최신 duties 를 받으므로, prop 으로 받은 stale duties 를
   * 통째로 덮어쓸 때 발생하는 lost update(동시 편집 시 임무 유실)를 방지한다.
   */
  mutateDuties: async (
    id: string,
    mutator: (current: VolunteerDuty[]) => VolunteerDuty[],
  ): Promise<void> => {
    const ref = doc(db, "volunteer_assignments", id);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error("배정을 찾을 수 없습니다.");
      const current = (snap.data().duties as VolunteerDuty[]) ?? [];
      const next = mutator(current);
      tx.update(
        ref,
        stripUndefinedDeep({
          duties: next,
          updatedAt: serverTimestamp(),
        }),
      );
    });
  },
  delete: (id: string) => dataApi.delete("volunteer_assignments", id),
};

// ── 학술대회 발표자 운영 — Phase 1 ──
// volunteerAssignmentsApi 와 동일 시그니처. prepTasks 변이는 mutateTasks 트랜잭션 사용.
export const speakerAssignmentsApi = {
  listByActivity: (activityId: string) =>
    // 복합 인덱스 회피: filter[activityId] 만
    dataApi.list<SpeakerAssignment>("speaker_assignments", {
      "filter[activityId]": activityId,
      limit: 500,
    }),
  listByUser: (userId: string) =>
    dataApi.list<SpeakerAssignment>("speaker_assignments", {
      "filter[userId]": userId,
      limit: 500,
    }),
  get: (id: string) =>
    dataApi.get<SpeakerAssignment>("speaker_assignments", id),
  upsert: async (
    id: string,
    data: Record<string, unknown>,
  ): Promise<SpeakerAssignment> => {
    const ref = doc(db, "speaker_assignments", id);
    const cleaned = stripUndefinedDeep(data);
    const existing = await getDoc(ref);
    const isNew = !existing.exists();
    await setDoc(
      ref,
      {
        ...cleaned,
        ...(isNew ? { createdAt: serverTimestamp() } : {}),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    const snap = await getDoc(ref);
    return serializeDoc(snap) as unknown as SpeakerAssignment;
  },
  /**
   * prepTasks 배열을 Firestore 트랜잭션으로 원자적 수정.
   * mutator 는 항상 최신 prepTasks 를 받으므로, prop 으로 받은 stale tasks 를
   * 통째로 덮어쓸 때 발생하는 lost update(동시 편집 시 임무 유실)를 방지한다.
   */
  mutateTasks: async (
    id: string,
    mutator: (current: SpeakerPrepTask[]) => SpeakerPrepTask[],
  ): Promise<void> => {
    const ref = doc(db, "speaker_assignments", id);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error("배정을 찾을 수 없습니다.");
      const current = (snap.data().prepTasks as SpeakerPrepTask[]) ?? [];
      const next = mutator(current);
      tx.update(
        ref,
        stripUndefinedDeep({
          prepTasks: next,
          updatedAt: serverTimestamp(),
        }),
      );
    });
  },
  delete: (id: string) => dataApi.delete("speaker_assignments", id),
};

// ── 게시글 공감 reaction (Sprint 67-AO) ──
export const postReactionsApi = {
  /** 한 게시글의 모든 reaction (카운트·본인 표시용) — 복합 인덱스 회피 */
  listByPost: (postId: string) =>
    dataApi.list<PostReaction>("post_reactions", {
      "filter[postId]": postId,
      limit: 2000,
    }),
  /** 본인이 한 게시글에 한 reaction toggle (있으면 삭제, 없으면 추가) — Post.reactionCount 도 increment/decrement */
  toggle: async (
    userId: string,
    postId: string,
    type: PostReactionType,
  ): Promise<boolean> => {
    const id = `${userId}_${postId}_${type}`;
    const ref = doc(db, "post_reactions", id);
    const postRef = doc(db, "posts", postId);
    const existing = await getDoc(ref);
    if (existing.exists()) {
      await deleteDoc(ref);
      // post.reactionCount 자동 감소 — 권한 거부 시 무시 (count 약간 부정확해도 critical 아님)
      try {
        await updateDoc(postRef, { reactionCount: increment(-1) });
      } catch {
        /* 권한 없으면 skip — count 정합성 후속 보강 */
      }
      return false;
    }
    await setDoc(ref, {
      id,
      userId,
      postId,
      type,
      createdAt: serverTimestamp(),
    });
    try {
      await updateDoc(postRef, { reactionCount: increment(1) });
    } catch {
      /* 권한 없으면 skip */
    }
    return true;
  },
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
  /** 목록 페이지(/progress-meetings)용 — 정렬은 클라이언트에서 (인덱스 회피) */
  listRecent: (limit: number = 300) =>
    dataApi.list<ProgressMeeting>("progress_meetings", { limit }),
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

// ── 논문 버전 스냅샷 (명시적 저장·복원) — writing_paper_history(자동 로그)와 구분 ──
export const writingPaperVersionsApi = {
  /** 복합 인덱스 회피: filter[userId]만 사용, paperId 필터·정렬은 클라이언트에서 */
  listByUser: (userId: string) =>
    dataApi.list<WritingPaperVersion>("writing_paper_versions", {
      "filter[userId]": userId,
      limit: 100,
    }),
  create: (data: Record<string, unknown>) =>
    dataApi.create<WritingPaperVersion>("writing_paper_versions", data),
  delete: (id: string) => dataApi.delete("writing_paper_versions", id),
};

// ── 지도 노트 (교수 피드백 기록·반영 추적) — 본인 전용 ──
export const advisorFeedbackApi = {
  /** 복합 인덱스 회피: filter[userId]만 사용, 정렬은 클라이언트에서 */
  listByUser: (userId: string) =>
    dataApi.list<AdvisorFeedbackNote>("advisor_feedback_notes", {
      "filter[userId]": userId,
      limit: 500,
    }),
  create: (data: Record<string, unknown>) =>
    dataApi.create<AdvisorFeedbackNote>("advisor_feedback_notes", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<AdvisorFeedbackNote>("advisor_feedback_notes", id, data),
  delete: (id: string) => dataApi.delete("advisor_feedback_notes", id),
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

// ── 교육공학 아카이브 — 논문 읽기 기록 (사이클 120, 연구 습관) ──
// 본인 rw + staff read. firestore.rules 의 paper_reading_logs 와 양쪽 게이트.
import type { PaperReadingLog } from "@/types/paper-reading";

export const paperReadingLogsApi = {
  listByUser: (userId: string) =>
    dataApi.list<PaperReadingLog>("paper_reading_logs", {
      "filter[userId]": userId,
      limit: 1000,
    }),
  get: (id: string) => dataApi.get<PaperReadingLog>("paper_reading_logs", id),
  create: (data: Record<string, unknown>) =>
    dataApi.create<PaperReadingLog>("paper_reading_logs", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<PaperReadingLog>("paper_reading_logs", id, data),
  delete: (id: string) => dataApi.delete("paper_reading_logs", id),
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
    // HOTFIX(2026-07-04): filter+orderBy 는 복합 인덱스 필요(운영 인덱스 오류) — 클라이언트 정렬로 결정성 확보
    dataApi
      .list<ResearchReport>("research_reports", { "filter[userId]": userId, limit: 50 })
      .then((res) => ({
        ...res,
        data: [...res.data].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")),
      })),
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
    // HOTFIX(2026-07-04): filter+orderBy 복합 인덱스 오류 — 클라이언트 정렬
    dataApi
      .list<ResearchProposal>("research_proposals", { "filter[userId]": userId, limit: 50 })
      .then((res) => ({
        ...res,
        data: [...res.data].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")),
      })),
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

// 회원 간 쪽지 (사이클 113, 사용자 요청)
export const messagesApi = {
  listReceived: (toId: string) =>
    dataApi.list<DirectMessage>("direct_messages", {
      "filter[toId]": toId,
      sort: "createdAt:desc",
      limit: 50,
    }),
  listSent: (fromId: string) =>
    dataApi.list<DirectMessage>("direct_messages", {
      "filter[fromId]": fromId,
      sort: "createdAt:desc",
      limit: 50,
    }),
  create: (data: Record<string, unknown>) =>
    dataApi.create<DirectMessage>("direct_messages", data),
  markRead: (id: string) =>
    dataApi.update<DirectMessage>("direct_messages", id, { read: true }),
  delete: (id: string) => dataApi.delete("direct_messages", id),
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
  /**
   * 자동 적재(2026-07-07): 세미나 체크인·활동 참여 확정 시 참여 레코드를 멱등 생성.
   *  · 결정적 id 로 중복 방지, 이미 있으면(수동 편집·검증 반영분) 건드리지 않음.
   *  · 증명서·포트폴리오·인사이트가 이 컬렉션을 소비 — 입력단 연결이 목적.
   */
  recordAuto: async (params: {
    userId: string;
    seminarId?: string;
    activityId?: string;
    role?: ActivityRole;
    verified?: boolean;
    startedAt?: string;
  }): Promise<void> => {
    const refKey =
      params.seminarId ? `${params.userId}__seminar__${params.seminarId}`
      : params.activityId ? `${params.userId}__activity__${params.activityId}`
      : null;
    if (!refKey) return;
    const ref = doc(db, "activity_participations", refKey);
    const existing = await getDoc(ref);
    if (existing.exists()) return; // 멱등 — 수동 검증/편집 보존
    await setDoc(ref, stripUndefinedDeep({
      id: refKey,
      userId: params.userId,
      seminarId: params.seminarId,
      activityId: params.activityId,
      role: params.role ?? "participant",
      outputs: [],
      verified: params.verified ?? false,
      startedAt: params.startedAt ?? new Date().toISOString(),
      source: "auto",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));
  },
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

// ── 졸업요건 (2026-07-07) — 설정 문서(staff 편집) + 개인 관문 진행(본인) ──
export const graduationRequirementsApi = {
  /** 기본 요건 문서 (없으면 null — UI 가 DEFAULT 로 폴백) */
  getDefault: async (): Promise<GraduationRequirement | null> => {
    try {
      return await dataApi.get<GraduationRequirement>("graduation_requirements", "default");
    } catch {
      return null;
    }
  },
  upsertDefault: (data: Record<string, unknown>) =>
    dataApi.upsert<GraduationRequirement>("graduation_requirements", "default", data),
};

export const graduationProgressApi = {
  /** 본인 관문 체크 문서 (없으면 null) */
  get: async (userId: string): Promise<GraduationProgress | null> => {
    try {
      return await dataApi.get<GraduationProgress>("graduation_progress", userId);
    } catch {
      return null;
    }
  },
  /** 본인 문서 upsert (docId = userId) */
  upsert: (userId: string, data: Record<string, unknown>) =>
    dataApi.upsert<GraduationProgress>("graduation_progress", userId, { userId, ...data }),
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
  /** 트랙 내 published 항목만 (회원 뷰).
   *  codex-M10(2026-07-07): trackId 단독 쿼리는 draft 포함 요청 → 룰(published==true|staff)
   *  정적 평가에서 거부(permission-denied). published==true 서버 필터로 증명형 쿼리. */
  listPublishedByTrack: async (trackId: string) => {
    const res = await dataApi.list<GuideItem>("guide_items", {
      "filter[trackId]": trackId,
      "filter[published]": "true",
      limit: 500,
    });
    return res;
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

// ── Onboarding Checklist (시작하기 체크리스트 — 운영진 콘솔 편집) ──
// 대시보드 NewMemberChecklistWidget 가 listEnabled() 로 fetch.
// 모든 사용자(비로그인 포함) read 허용, write 는 firestore.rules 에서 staff+ 게이트.
export const onboardingChecklistApi = {
  /** 전체 목록 (콘솔용) — order asc */
  list: () =>
    dataApi.list<OnboardingChecklistItem>("onboarding_checklist", {
      sort: "order:asc",
      limit: 200,
    }),
  /** 위젯 노출용 — enabled=true 만, order asc */
  listEnabled: () =>
    dataApi.list<OnboardingChecklistItem>("onboarding_checklist", {
      "filter[enabled]": "true",
      sort: "order:asc",
      limit: 200,
    }),
  get: (id: string) =>
    dataApi.get<OnboardingChecklistItem>("onboarding_checklist", id),
  create: (data: Record<string, unknown>) =>
    dataApi.create<OnboardingChecklistItem>("onboarding_checklist", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<OnboardingChecklistItem>("onboarding_checklist", id, data),
  delete: (id: string) => dataApi.delete("onboarding_checklist", id),
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
  /** 즐겨찾기 단축 ID — 사용자×아이템 단일성 보장 (7개 동적 아카이브 타입 모두 지원) */
  makeId: (userId: string, itemType: ArchiveFavoriteItemType, itemId: string) =>
    `${userId}_${itemType}_${itemId}`,
};

/**
 * 즐겨찾기 항목의 상세 페이지 경로 매핑 헬퍼.
 * itemType 별 라우트 규약을 한곳에 모아 /archive 랜딩의 관심 저장 목록 라우팅을 일관되게 한다.
 *
 * - concept/variable/measurement → /archive/{type}/{id} (기존 [type]/[id] 라우트)
 * - research-method/statistical-method/foundation-term/writing-tip → /archive/{plural-kebab}/{id}
 */
export function favoriteHref(f: ArchiveFavorite): string {
  switch (f.itemType) {
    case "research-method":
      return `/archive/research-methods/${f.itemId}`;
    case "statistical-method":
      return `/archive/statistical-methods/${f.itemId}`;
    case "foundation-term":
      return `/archive/foundation-terms/${f.itemId}`;
    case "writing-tip":
      return `/archive/writing-tips/${f.itemId}`;
    case "concept":
    case "variable":
    case "measurement":
    default:
      return `/archive/${f.itemType}/${f.itemId}`;
  }
}

// ── 교육공학 아카이브 — 연구방법 가이드 (Phase 1) ──
// 공개 페이지는 published=true 만 노출. 운영진(staff+) 은 draft 포함 전체 조회.
// firestore.rules 의 archive_research_methods 와 양쪽에서 검수 게이트 적용.
export const researchMethodsApi = {
  list: () =>
    dataApi.list<ResearchMethod>("archive_research_methods", { limit: 200 }),
  listPublished: () =>
    dataApi.list<ResearchMethod>("archive_research_methods", {
      "filter[published]": "true",
      limit: 200,
    }),
  listByKind: (kind: ResearchMethodKind) =>
    dataApi.list<ResearchMethod>("archive_research_methods", {
      "filter[kind]": kind,
      "filter[published]": "true",
      limit: 200,
    }),
  get: (id: string) =>
    dataApi.get<ResearchMethod>("archive_research_methods", id),
  create: (data: Record<string, unknown>) =>
    dataApi.create<ResearchMethod>("archive_research_methods", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<ResearchMethod>("archive_research_methods", id, data),
  upsert: (id: string, data: Record<string, unknown>) =>
    dataApi.upsert<ResearchMethod>("archive_research_methods", id, data),
  delete: (id: string) => dataApi.delete("archive_research_methods", id),
};

// ── 교육공학 아카이브 — 통계방법 가이드 (Phase 1.5) ──
// 공개 페이지는 published=true 만 노출. 운영진(staff+) 은 draft 포함 전체 조회.
// firestore.rules 의 archive_statistical_methods 와 양쪽에서 검수 게이트 적용.
import type {
  StatisticalMethod,
  StatisticalMethodCategory,
} from "@/types/statistical-method";

export const statisticalMethodsApi = {
  list: () =>
    dataApi.list<StatisticalMethod>("archive_statistical_methods", { limit: 200 }),
  listPublished: () =>
    dataApi.list<StatisticalMethod>("archive_statistical_methods", {
      "filter[published]": "true",
      limit: 200,
    }),
  listByCategory: (category: StatisticalMethodCategory) =>
    dataApi.list<StatisticalMethod>("archive_statistical_methods", {
      "filter[category]": category,
      "filter[published]": "true",
      limit: 200,
    }),
  get: (id: string) =>
    dataApi.get<StatisticalMethod>("archive_statistical_methods", id),
  create: (data: Record<string, unknown>) =>
    dataApi.create<StatisticalMethod>("archive_statistical_methods", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<StatisticalMethod>("archive_statistical_methods", id, data),
  upsert: (id: string, data: Record<string, unknown>) =>
    dataApi.upsert<StatisticalMethod>("archive_statistical_methods", id, data),
  delete: (id: string) => dataApi.delete("archive_statistical_methods", id),
};

// ── 진단평가 (Diagnostic Assessment) — MVP ──
// diagnostic_questions: published 공개 read · staff+ write (firestore.rules 양쪽 게이트).
// diagnostic_results: 본인 read/write.
import type {
  DiagnosticQuestion,
  DiagnosticResult,
  DiagnosticPeerStats,
  DiagnosticArea,
} from "@/types/diagnostic";

export const diagnosticQuestionsApi = {
  /** 운영진(staff+) — draft 포함 전체 */
  list: () =>
    dataApi.list<DiagnosticQuestion>("diagnostic_questions", { limit: 300 }),
  /** 공개 — published 만 (퀴즈 러너에서 사용) */
  listPublished: () =>
    dataApi.list<DiagnosticQuestion>("diagnostic_questions", {
      "filter[published]": "true",
      limit: 300,
    }),
  get: (id: string) =>
    dataApi.get<DiagnosticQuestion>("diagnostic_questions", id),
  create: (data: Record<string, unknown>) =>
    dataApi.create<DiagnosticQuestion>("diagnostic_questions", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<DiagnosticQuestion>("diagnostic_questions", id, data),
  delete: (id: string) => dataApi.delete("diagnostic_questions", id),
};

// ── 주제 탐색 결과 저장 (2026-07-05) — 본인 read/write, firestore.rules topic_explorations ──
export const topicExplorationsApi = {
  /** 본인 탐색 이력 — 정렬은 클라이언트(exploredAt desc, 복합 인덱스 회피) */
  listByUser: async (userId: string): Promise<TopicExploration[]> => {
    const res = await dataApi.list<TopicExploration>("topic_explorations", {
      "filter[userId]": userId,
      limit: 50,
    });
    return [...res.data].sort((a, b) => (b.exploredAt ?? "").localeCompare(a.exploredAt ?? ""));
  },
  create: (data: Omit<TopicExploration, "id" | "createdAt" | "updatedAt">) =>
    dataApi.create<TopicExploration>("topic_explorations", data as unknown as Record<string, unknown>),
  remove: (id: string) => dataApi.delete("topic_explorations", id),
};

export const diagnosticResultsApi = {
  /** 본인 진단 이력 (최신순) */
  listByUser: (userId: string) =>
    dataApi.list<DiagnosticResult>("diagnostic_results", {
      "filter[userId]": userId,
      sort: "createdAt:desc",
      limit: 50,
    }),
  /**
   * 운영진(staff+) 콘솔용 — 모든 회원의 진단 결과를 한 번에 로드.
   * firestore.rules 의 diagnostic_results read 가 staff+ 우회를 허용해야 동작한다.
   * 회원 준비도·약점은 개인정보이므로 UI(/console/insights)는 admin 전용으로 가드한다.
   */
  listAll: (limit = 2000) =>
    dataApi.list<DiagnosticResult>("diagnostic_results", {
      sort: "createdAt:desc",
      limit,
    }),
  get: (id: string) =>
    dataApi.get<DiagnosticResult>("diagnostic_results", id),
  create: (data: Record<string, unknown>) =>
    dataApi.create<DiagnosticResult>("diagnostic_results", data),
  delete: (id: string) => dataApi.delete("diagnostic_results", id),
  /**
   * 익명 동료 분포(피어 비교, M4) — 서버 API 경유.
   * firestore.rules 가 회원의 전체 read 를 막으므로 Admin SDK 집계 라우트를 호출한다.
   * 응답은 익명 집계만(개별 식별 정보 없음). 로그인 필요(Bearer 토큰).
   * areaValuesAsc/*ValuesAsc 는 내 백분위 계산용 무라벨 분포 값.
   */
  fetchPeerStats: async (): Promise<
    DiagnosticPeerStats & {
      areaValuesAsc?: Partial<Record<DiagnosticArea, number[]>>;
      paperValuesAsc?: number[];
      analysisValuesAsc?: number[];
    }
  > => {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error("로그인이 필요합니다.");
    const res = await fetch("/api/diagnosis/peer-stats", {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) {
      throw new Error(`peer-stats ${res.status}`);
    }
    return res.json();
  },
};

// ── 교육공학 아카이브 — 기초 용어 가이드 (Phase 1) ──
// 변인·연구설계·교수설계·체제이론·측정·학습이론 기초 용어. "비슷하지만 다른" 페어 명시.
// 공개 페이지는 published=true 만 노출. 운영진(staff+) 은 draft 포함 전체 조회.
// firestore.rules 의 archive_foundation_terms 와 양쪽에서 검수 게이트 적용.
import type {
  FoundationTerm,
  FoundationTermCategory,
} from "@/types/foundation-term";

export const foundationTermsApi = {
  list: () =>
    dataApi.list<FoundationTerm>("archive_foundation_terms", { limit: 200 }),
  listPublished: () =>
    dataApi.list<FoundationTerm>("archive_foundation_terms", {
      "filter[published]": "true",
      limit: 200,
    }),
  listByCategory: (category: FoundationTermCategory) =>
    dataApi.list<FoundationTerm>("archive_foundation_terms", {
      "filter[category]": category,
      "filter[published]": "true",
      limit: 200,
    }),
  get: (id: string) =>
    dataApi.get<FoundationTerm>("archive_foundation_terms", id),
  create: (data: Record<string, unknown>) =>
    dataApi.create<FoundationTerm>("archive_foundation_terms", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<FoundationTerm>("archive_foundation_terms", id, data),
  upsert: (id: string, data: Record<string, unknown>) =>
    dataApi.upsert<FoundationTerm>("archive_foundation_terms", id, data),
  delete: (id: string) => dataApi.delete("archive_foundation_terms", id),
};

// ── 교육공학 아카이브 — 학술 글쓰기 가이드 (Phase 1) ──
// 번역투·주술호응·시제/태·맞춤법·학술관례. 공개 게이트는 foundation-terms 와 동일 패턴.
// firestore.rules 의 archive_writing_tips 와 양쪽에서 검수 게이트 적용.
import type {
  WritingTip,
  WritingTipCategory,
} from "@/types/writing-tip";

export const writingTipsApi = {
  list: () =>
    dataApi.list<WritingTip>("archive_writing_tips", { limit: 200 }),
  listPublished: () =>
    dataApi.list<WritingTip>("archive_writing_tips", {
      "filter[published]": "true",
      limit: 200,
    }),
  listByCategory: (category: WritingTipCategory) =>
    dataApi.list<WritingTip>("archive_writing_tips", {
      "filter[category]": category,
      "filter[published]": "true",
      limit: 200,
    }),
  get: (id: string) => dataApi.get<WritingTip>("archive_writing_tips", id),
  create: (data: Record<string, unknown>) =>
    dataApi.create<WritingTip>("archive_writing_tips", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<WritingTip>("archive_writing_tips", id, data),
  upsert: (id: string, data: Record<string, unknown>) =>
    dataApi.upsert<WritingTip>("archive_writing_tips", id, data),
  delete: (id: string) => dataApi.delete("archive_writing_tips", id),
};

// ─── 학기별 로드맵 (Sprint 67-AR — 운영진 콘텐츠 관리) ───
// 회원 read-only (published=true 만), 운영진(staff 이상)이 CRUD.
import type { RoadmapStage } from "@/types/steppingstone";

export const roadmapStagesApi = {
  list: () =>
    dataApi.list<RoadmapStage>("roadmap_stages", { limit: 100, sort: "order:asc" }),
  listPublished: () =>
    dataApi.list<RoadmapStage>("roadmap_stages", {
      "filter[published]": "true",
      limit: 100,
      sort: "order:asc",
    }),
  get: (id: string) => dataApi.get<RoadmapStage>("roadmap_stages", id),
  create: (data: Record<string, unknown>) =>
    dataApi.create<RoadmapStage>("roadmap_stages", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<RoadmapStage>("roadmap_stages", id, data),
  delete: (id: string) => dataApi.delete("roadmap_stages", id),
};

// ─── AI 포럼 (Sprint 67-AR — AI 자율 토론 게시판) ───
// 운영진이 토론 주제를 등록·시작·중지하고, Vercel cron이 라운드별 발언을 자동 생성.
// 회원은 read-only 관전. messages 는 서버(Admin SDK)만 append.
import type { AIForumTopic, AIForumMessage } from "@/types/ai-forum";

export const aiForumsApi = {
  list: () =>
    dataApi.list<AIForumTopic>("ai_forums", { limit: 100, sort: "createdAt:desc" }),
  get: (id: string) => dataApi.get<AIForumTopic>("ai_forums", id),
  create: (data: Record<string, unknown>) =>
    dataApi.create<AIForumTopic>("ai_forums", data),
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<AIForumTopic>("ai_forums", id, data),
  delete: (id: string) => dataApi.delete("ai_forums", id),
  /** 토론 개최 — scheduled → in_progress */
  start: (id: string) =>
    dataApi.update<AIForumTopic>("ai_forums", id, {
      status: "in_progress",
      startedAt: new Date().toISOString(),
    }),
  /** 토론 중지 — in_progress → completed (조기 종료 포함) */
  stop: (id: string) =>
    dataApi.update<AIForumTopic>("ai_forums", id, {
      status: "completed",
      completedAt: new Date().toISOString(),
    }),
  /** 보관 처리 */
  archive: (id: string) =>
    dataApi.update<AIForumTopic>("ai_forums", id, { status: "archived" }),
};

export const aiForumMessagesApi = {
  /** 특정 forum의 메시지 목록 — 라운드·createdAt 클라이언트 정렬 */
  listByForum: (forumId: string) =>
    dataApi.list<AIForumMessage>("ai_forum_messages", {
      "filter[forumId]": forumId,
      limit: 500,
    }),
  get: (id: string) => dataApi.get<AIForumMessage>("ai_forum_messages", id),
};

// ─────────────────────────────────────────────────────────────
// 스터디 회고 (Sprint 1 — Study Enhancement)
// ─────────────────────────────────────────────────────────────
/**
 * P1-2(2026-07-04): 회고 목록은 권한 인지 투영 API(/api/activities/reflections)를 경유 —
 * blanket list rules 제거. 본인/운영진/리더(비공개 제외)만 내용을 받고 그 외는 카운트용 REDACT.
 */
async function fetchReflections(params: { activityId?: string; progressId?: string }): Promise<{ data: StudySessionReflection[]; total: number }> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("로그인이 필요합니다.");
  const qs = new URLSearchParams();
  if (params.activityId) qs.set("activityId", params.activityId);
  if (params.progressId) qs.set("progressId", params.progressId);
  const res = await fetch(`/api/activities/reflections?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("회고 조회에 실패했습니다.");
  return (await res.json()) as { data: StudySessionReflection[]; total: number };
}

export const studySessionReflectionsApi = {
  /** 활동 전체 회고 — 배지 카운트(전 회원)·리더 리포트. 서버 투영(내용은 권한별) */
  listByActivity: (activityId: string) => fetchReflections({ activityId }),
  /** 회차 단위 회고 — 리더/운영진 열람용. 서버 투영 */
  listByProgress: (activityProgressId: string) => fetchReflections({ progressId: activityProgressId }),
  /** 본인의 활동 전체 회고 */
  listByUser: (userId: string, activityId: string) =>
    dataApi.list<StudySessionReflection>("study_session_reflections", {
      "filter[userId]": userId,
      "filter[activityId]": activityId,
      limit: 200,
    }),
  /** 회차×본인 단건 (없으면 null) */
  getMine: async (
    activityProgressId: string,
    userId: string,
  ): Promise<StudySessionReflection | null> => {
    const res = await dataApi.list<StudySessionReflection>("study_session_reflections", {
      "filter[activityProgressId]": activityProgressId,
      "filter[userId]": userId,
      limit: 1,
    });
    return res.data[0] ?? null;
  },
  get: (id: string) =>
    dataApi.get<StudySessionReflection>("study_session_reflections", id),
  create: (data: Omit<StudySessionReflection, "id" | "createdAt">) =>
    dataApi.create<StudySessionReflection>(
      "study_session_reflections",
      data as unknown as Record<string, unknown>,
    ),
  update: (id: string, data: Partial<StudySessionReflection>) =>
    dataApi.update<StudySessionReflection>(
      "study_session_reflections",
      id,
      data as unknown as Record<string, unknown>,
    ),
  delete: (id: string) => dataApi.delete("study_session_reflections", id),
};

// ─────────────────────────────────────────────────────────────
// 스터디 과제 (Sprint 2 — Study Enhancement)
// ─────────────────────────────────────────────────────────────
export const studyAssignmentsApi = {
  listByActivity: (activityId: string) =>
    dataApi.list<StudyAssignment>("study_assignments", {
      "filter[activityId]": activityId,
      limit: 500,
    }),
  listByProgress: (activityProgressId: string) =>
    dataApi.list<StudyAssignment>("study_assignments", {
      "filter[activityProgressId]": activityProgressId,
      limit: 100,
    }),
  get: (id: string) => dataApi.get<StudyAssignment>("study_assignments", id),
  create: (data: Omit<StudyAssignment, "id" | "createdAt">) =>
    dataApi.create<StudyAssignment>(
      "study_assignments",
      data as unknown as Record<string, unknown>,
    ),
  update: (id: string, data: Partial<StudyAssignment>) =>
    dataApi.update<StudyAssignment>(
      "study_assignments",
      id,
      data as unknown as Record<string, unknown>,
    ),
  delete: (id: string) => dataApi.delete("study_assignments", id),
};

export const studyAssignmentSubmissionsApi = {
  listByUser: (userId: string, activityId: string) =>
    dataApi.list<StudyAssignmentSubmission>("study_assignment_submissions", {
      "filter[userId]": userId,
      "filter[activityId]": activityId,
      limit: 500,
    }),
  listByAssignment: (assignmentId: string) =>
    dataApi.list<StudyAssignmentSubmission>("study_assignment_submissions", {
      "filter[assignmentId]": assignmentId,
      limit: 1000,
    }),
  listByActivity: (activityId: string) =>
    dataApi.list<StudyAssignmentSubmission>("study_assignment_submissions", {
      "filter[activityId]": activityId,
      limit: 5000,
    }),
  get: (id: string) =>
    dataApi.get<StudyAssignmentSubmission>("study_assignment_submissions", id),
  /** {userId}_{assignmentId} 컨벤션으로 upsert. 본인 제출 / 운영진 피드백 모두 사용. */
  upsert: async (
    id: string,
    data: Record<string, unknown>,
  ): Promise<StudyAssignmentSubmission> => {
    const ref = doc(db, "study_assignment_submissions", id);
    const cleaned = stripUndefinedDeep(data);
    await setDoc(
      ref,
      { ...cleaned, updatedAt: serverTimestamp() },
      { merge: true },
    );
    const snap = await getDoc(ref);
    return serializeDoc(snap) as unknown as StudyAssignmentSubmission;
  },
  delete: (id: string) => dataApi.delete("study_assignment_submissions", id),
};

// ─────────────────────────────────────────────────────────────
// 스터디 회차 토론 노트 (Sprint 4 — Study Enhancement)
// ─────────────────────────────────────────────────────────────
export const studySessionNotesApi = {
  listByProgress: (activityProgressId: string) =>
    dataApi.list<StudySessionNote>("study_session_notes", {
      "filter[activityProgressId]": activityProgressId,
      limit: 500,
    }),
  listByActivity: (activityId: string) =>
    dataApi.list<StudySessionNote>("study_session_notes", {
      "filter[activityId]": activityId,
      limit: 2000,
    }),
  get: (id: string) => dataApi.get<StudySessionNote>("study_session_notes", id),
  create: (data: Record<string, unknown>) =>
    dataApi.create<StudySessionNote>("study_session_notes", data),
  update: (id: string, data: Partial<StudySessionNote>) =>
    dataApi.update<StudySessionNote>(
      "study_session_notes",
      id,
      data as unknown as Record<string, unknown>,
    ),
  delete: (id: string) => dataApi.delete("study_session_notes", id),
};

// ────────────────────────────────────────────────────────────
// streakEventsApi — 학습 잔디 외부 가산점 이벤트 (P1)
//
// doc id = `${userId}__${type}__${refId}` (deterministic) → setDoc(merge:true)
// 으로 같은 (userId,type,refId) 재호출 시 중복 가산 X.
// LearningStreak 합산 로직이 streak_events 컬렉션을 읽어 YMD 별 점수에 가산.
// ────────────────────────────────────────────────────────────
export const streakEventsApi = {
  makeId: (userId: string, type: StreakEventType, refId: string) =>
    `${userId}__${type}__${refId}`,
  listByUser: (userId: string) =>
    dataApi.list<StreakEvent>("streak_events", {
      "filter[userId]": userId,
      limit: 1000,
    }),
  /**
   * 보상 원장 통일(2026-07-04): 도메인 활동의 리더보드 반영용 이중 기록.
   * refSuffix 미지정 시 오늘(로컬 ymd)로 day-bucket — 같은 소스·날짜는 1회만.
   * 실패는 조용히 무시(주 기능 비차단).
   */
  mirror: (userId: string, source: string, points: number, refSuffix?: string) => {
    const d = new Date();
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return streakEventsApi
      .add({ userId, type: "mirror", refId: `${source}_${refSuffix ?? ymd}`, points })
      .catch(() => null);
  },

  /** 멱등 add — 같은 (userId,type,refId) 재호출 시 한 번만 가산. */
  add: async (params: {
    userId: string;
    type: StreakEventType;
    refId: string;
    points: number;
  }): Promise<StreakEvent> => {
    const { userId, type, refId, points } = params;
    const id = `${userId}__${type}__${refId}`;
    const now = new Date();
    const ymd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return dataApi.upsert<StreakEvent>("streak_events", id, {
      userId,
      type,
      refId,
      points,
      ymd,
      occurredAt: now.toISOString(),
    });
  },
};

// ─────────────────────────────────────────────────────────────
// flashcardsApi — 진단 오답·개념 암기카드 (신규 컬렉션 flashcards)
//
// 멱등 저장: deterministic doc id + get-선확인. 같은 (userId, 문항/개념) 재저장 시
// 내용 필드만 갱신하고 복습 메타(dueAt/streak/…)는 보존한다(복습 진척 리셋 방지).
// 정렬은 클라이언트(복합 인덱스 회피) — list 는 userId 단일 필터만.
// firestore.rules 의 flashcards 블록(본인 rw + staff read)과 양쪽 게이트.
// ─────────────────────────────────────────────────────────────
import type { Flashcard, FlashcardSource, WrongCardSeed } from "@/types/flashcard";
import { todayYmdKst as flashcardTodayYmdKst } from "./dday";

export const flashcardsApi = {
  makeId: (userId: string, source: FlashcardSource, refId: string) =>
    `${userId}__${source === "concept" ? "concept" : source === "foundation_term" ? "term" : "dx"}__${refId}`,
  /** 본인 카드 전체 (정렬은 클라이언트). */
  listByUser: (userId: string) =>
    dataApi.list<Flashcard>("flashcards", { "filter[userId]": userId, limit: 1000 }),
  get: (id: string) => dataApi.get<Flashcard>("flashcards", id).catch(() => null),
  /**
   * 진단 오답 → 카드 멱등 저장. 존재 시 내용만 update(복습 메타 보존), 신규 시 초기 메타로 upsert.
   */
  saveFromWrong: async (userId: string, seed: WrongCardSeed): Promise<Flashcard> => {
    const id = `${userId}__dx__${seed.questionId}`;
    const content: Record<string, unknown> = {
      userId,
      source: "diagnostic_wrong",
      front: seed.front,
      back: seed.back,
      frontHint: seed.frontHint ?? null,
      area: seed.area,
      cognitiveLevel: seed.cognitiveLevel ?? null,
      sourceQuestionId: seed.questionId,
      conceptId: seed.conceptId ?? null,
    };
    const existing = await dataApi.get<Flashcard>("flashcards", id).catch(() => null);
    if (existing) {
      // 멱등 — 복습 메타(dueAt/streak/intervalDays/reviewCount/correctCount/lastReviewedAt) 비변경.
      return dataApi.update<Flashcard>("flashcards", id, content);
    }
    const today = flashcardTodayYmdKst();
    return dataApi.upsert<Flashcard>("flashcards", id, {
      ...content,
      dueAt: today,
      streak: 0,
      intervalDays: 1,
      reviewCount: 0,
      correctCount: 0,
      lastReviewedAt: null,
    });
  },
  /**
   * 아카이브 교육공학 개념 → 카드 멱등 저장. 앞면=개념명, 뒷면=정의(description).
   * doc id = `${userId}__concept__${conceptId}`. saveFromWrong 과 동일한 get-선확인 멱등
   * (재저장 시 복습 메타 보존). area 는 "concept"(교육공학 핵심개념) 고정.
   */
  saveFromConcept: async (userId: string, concept: ArchiveConcept): Promise<Flashcard> => {
    const id = `${userId}__concept__${concept.id}`;
    const content: Record<string, unknown> = {
      userId,
      source: "concept",
      front: concept.name,
      back: concept.description ?? "(정의가 등록되지 않은 개념입니다)",
      frontHint: null,
      area: "concept",
      cognitiveLevel: null,
      sourceQuestionId: null,
      conceptId: concept.id,
    };
    const existing = await dataApi.get<Flashcard>("flashcards", id).catch(() => null);
    if (existing) {
      // 멱등 — 복습 메타(dueAt/streak/intervalDays/reviewCount/correctCount/lastReviewedAt) 비변경.
      return dataApi.update<Flashcard>("flashcards", id, content);
    }
    const today = flashcardTodayYmdKst();
    return dataApi.upsert<Flashcard>("flashcards", id, {
      ...content,
      dueAt: today,
      streak: 0,
      intervalDays: 1,
      reviewCount: 0,
      correctCount: 0,
      lastReviewedAt: null,
    });
  },
  /**
   * 기초 용어(archive_foundation_terms) → 카드 멱등 저장 (Phase 4-A).
   * 앞면=용어(영문 병기), 뒷면=한 줄 요약(+쉬운 비유). doc id = `${userId}__term__${termId}`.
   */
  saveFromFoundationTerm: async (
    userId: string,
    term: { id: string; term: string; englishName?: string; summary?: string; accessibleSummary?: string },
  ): Promise<Flashcard> => {
    const id = `${userId}__term__${term.id}`;
    const back = [term.summary, term.accessibleSummary ? `쉽게: ${term.accessibleSummary}` : null]
      .filter(Boolean)
      .join("\n\n");
    const content: Record<string, unknown> = {
      userId,
      source: "foundation_term",
      front: term.englishName ? `${term.term} (${term.englishName})` : term.term,
      back: back || "(요약이 등록되지 않은 용어입니다)",
      frontHint: null,
      area: "concept",
      cognitiveLevel: null,
      sourceQuestionId: null,
      conceptId: null,
      foundationTermId: term.id,
    };
    const existing = await dataApi.get<Flashcard>("flashcards", id).catch(() => null);
    if (existing) {
      // 멱등 — 복습 메타 비변경.
      return dataApi.update<Flashcard>("flashcards", id, content);
    }
    const today = flashcardTodayYmdKst();
    return dataApi.upsert<Flashcard>("flashcards", id, {
      ...content,
      dueAt: today,
      streak: 0,
      intervalDays: 1,
      reviewCount: 0,
      correctCount: 0,
      lastReviewedAt: null,
    });
  },
  update: (id: string, data: Record<string, unknown>) =>
    dataApi.update<Flashcard>("flashcards", id, data),
  delete: (id: string) => dataApi.delete("flashcards", id),
};

// ─────────────────────────────────────────────────────────────
// designDocsApi — 디자인 스튜디오 (카드뉴스·포스터·발표 슬라이드)
// 본인 rw + published 회원 read (firestore.rules design_documents 블록과 게이트)
// ─────────────────────────────────────────────────────────────
import type { DesignDocument } from "@/features/studio/studio-types";

export const designDocsApi = {
  listByUser: (userId: string) =>
    dataApi.list<DesignDocument>("design_documents", { "filter[userId]": userId, limit: 200 }),
  listPublished: () =>
    dataApi.list<DesignDocument>("design_documents", { "filter[published]": true, limit: 200 }),
  get: (id: string) => dataApi.get<DesignDocument>("design_documents", id),
  create: (data: Omit<DesignDocument, "id">) =>
    dataApi.create<DesignDocument>("design_documents", data as unknown as Record<string, unknown>),
  update: (id: string, data: Partial<DesignDocument>) =>
    dataApi.update<DesignDocument>("design_documents", id, data as unknown as Record<string, unknown>),
  remove: (id: string) => dataApi.delete("design_documents", id),
};

// ─────────────────────────────────────────────────────────────
// userFeedbackApi — 사용자 피드백 수집
// write: 인증 사용자 (본인 userId) — 비로그인 anonymous 포함
// list: 운영진(staff+) 전용
// ─────────────────────────────────────────────────────────────
export const userFeedbackApi = {
  create: (data: Omit<UserFeedback, "id">) =>
    dataApi.create<UserFeedback>("user_feedback", data as unknown as Record<string, unknown>),
  list: () =>
    dataApi.list<UserFeedback>("user_feedback", {
      sort: "createdAt:desc",
      limit: 500,
    }),
  update: (id: string, data: Partial<UserFeedback>) =>
    dataApi.update<UserFeedback>(
      "user_feedback",
      id,
      data as unknown as Record<string, unknown>,
    ),
};

// ─────────────────────────────────────────────────────────────
// userNotesApi — 사용자 개인 메모 (본인 전용)
// 정렬: pinned desc → updatedAt desc (복합 index 불필요 — 클라이언트 정렬)
// ─────────────────────────────────────────────────────────────
export const userNotesApi = {
  listByUser: (userId: string) =>
    dataApi.list<UserNote>("user_notes", {
      "filter[userId]": userId,
      limit: 500,
    }),
  get: (id: string) => dataApi.get<UserNote>("user_notes", id),
  create: (data: Omit<UserNote, "id" | "createdAt" | "updatedAt">) =>
    dataApi.create<UserNote>("user_notes", data as unknown as Record<string, unknown>),
  update: (id: string, data: Partial<Omit<UserNote, "id" | "userId" | "createdAt">>) =>
    dataApi.update<UserNote>(
      "user_notes",
      id,
      data as unknown as Record<string, unknown>,
    ),
  delete: (id: string) => dataApi.delete("user_notes", id),
};

// ────────────────────────────────────────────────────────────
// Collaborative Research API (Phase 1 MVP)
//
// 설계: docs/02-design/features/collaborative-research.design.md
// dataApi.list 가 단일 equality 필터만 지원하므로 array-contains·복합 정렬은
// firestore SDK 직접 호출. activitiesApi 의 클라이언트 정렬 패턴 동참.
// ────────────────────────────────────────────────────────────

const COLLAB_RESEARCH_COL = "collaborative_research";
const COLLAB_MEMBERS_COL = "collaborative_research_members";
const COLLAB_INVITES_COL = "collaborative_research_invites";

function collabMemberId(researchId: string, userId: string): string {
  return `${researchId}_${userId}`;
}

export const collabResearchApi = {
  /** 내가 참여 중인 공동 연구 목록 (array-contains 직접 쿼리) */
  listByUser: async (userId: string): Promise<CollaborativeResearch[]> => {
    const q = query(
      collection(db, COLLAB_RESEARCH_COL),
      where("collaboratorIds", "array-contains", userId),
      orderBy("updatedAt", "desc"),
      firestoreLimit(100),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => (serializeDoc(d) as unknown as CollaborativeResearch));
  },

  /** society type 배정 전체 목록 (운영진용) */
  listForSociety: async (): Promise<CollaborativeResearch[]> => {
    const q = query(
      collection(db, COLLAB_RESEARCH_COL),
      where("collaborationType", "==", "society"),
      orderBy("updatedAt", "desc"),
      firestoreLimit(200),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => (serializeDoc(d) as unknown as CollaborativeResearch));
  },

  get: (id: string) => dataApi.get<CollaborativeResearch>(COLLAB_RESEARCH_COL, id),

  /** 신규 팀 생성 + leader 를 members 컬렉션에 자동 등록 */
  create: async (input: CreateCollabResearchInput): Promise<CollaborativeResearch> => {
    const docData: Record<string, unknown> = {
      ...input,
      collaboratorCount: 1,
      collaboratorIds: [input.leaderId],
      workingPaperCount: 0,
    };
    const created = await dataApi.create<CollaborativeResearch>(COLLAB_RESEARCH_COL, docData);

    // leader 본인을 members 컬렉션에 자동 등록 (id = researchId_userId 강제)
    await collabMembersApi.upsertSelf({
      researchId: created.id,
      userId: input.leaderId,
      role: "principal",
      creditRoles: ["conceptualization", "project_administration"],
      invitedBy: input.leaderId,
    });

    return created;
  },

  update: (id: string, patch: UpdateCollabResearchInput) =>
    dataApi.update<CollaborativeResearch>(
      COLLAB_RESEARCH_COL,
      id,
      patch as unknown as Record<string, unknown>,
    ),

  /** denorm 동기화: members 컬렉션의 active userId 들과 collaboratorIds/Count 정합 보정.
   *  leader 만 호출 — Phase 1 한정 client-side reconcile. Phase 4 에서 Cloud Function 이관.
   */
  reconcileCollaborators: async (researchId: string): Promise<void> => {
    const [research, members] = await Promise.all([
      collabResearchApi.get(researchId),
      collabMembersApi.listByResearch(researchId),
    ]);
    if (!research) return;
    const activeIds = members
      .filter((m) => m.status === "active")
      .map((m) => m.userId);
    // leader 가 항상 포함되도록 보장
    const merged = Array.from(new Set([research.leaderId, ...activeIds]));
    const sorted = [...merged].sort();
    const cur = [...research.collaboratorIds].sort();
    if (sorted.length === research.collaboratorCount && JSON.stringify(sorted) === JSON.stringify(cur)) {
      return; // already synced
    }
    await dataApi.patch<CollaborativeResearch>(COLLAB_RESEARCH_COL, researchId, {
      collaboratorIds: merged,
      collaboratorCount: merged.length,
      updatedAt: serverTimestamp(),
    });
  },

  remove: (id: string) => dataApi.delete(COLLAB_RESEARCH_COL, id),
};

export const collabMembersApi = {
  /** 특정 연구의 active 멤버 전체 */
  listByResearch: async (researchId: string): Promise<CollabResearchMember[]> => {
    const q = query(
      collection(db, COLLAB_MEMBERS_COL),
      where("researchId", "==", researchId),
      where("status", "==", "active"),
      firestoreLimit(50),
    );
    const snap = await getDocs(q);
    const data = snap.docs.map((d) => (serializeDoc(d) as unknown as CollabResearchMember));
    // 가입 순서 클라이언트 정렬 (joinedAt asc)
    return data.sort((a, b) => (a.joinedAt ?? "").localeCompare(b.joinedAt ?? ""));
  },

  /** 내가 멤버인 모든 연구의 멤버 row (참여 연구 목록 보조 — Phase 1 에서는 listByUser 가 array-contains 로 직접 가져옴) */
  listByUser: async (userId: string): Promise<CollabResearchMember[]> => {
    const q = query(
      collection(db, COLLAB_MEMBERS_COL),
      where("userId", "==", userId),
      where("status", "==", "active"),
      firestoreLimit(100),
    );
    const snap = await getDocs(q);
    const data = snap.docs.map((d) => (serializeDoc(d) as unknown as CollabResearchMember));
    return data.sort((a, b) => (b.joinedAt ?? "").localeCompare(a.joinedAt ?? ""));
  },

  get: (id: string) => dataApi.get<CollabResearchMember>(COLLAB_MEMBERS_COL, id),

  /** memberId 패턴 강제: {researchId}_{userId}. setDoc upsert 사용. */
  upsertSelf: async (input: {
    researchId: string;
    userId: string;
    role: CollabMemberRole;
    creditRoles: CreditRole[];
    invitedBy: string;
    affiliation?: string;
    orcidId?: string;
  }): Promise<CollabResearchMember> => {
    const id = collabMemberId(input.researchId, input.userId);
    const payload: Record<string, unknown> = {
      researchId: input.researchId,
      userId: input.userId,
      role: input.role,
      creditRoles: input.creditRoles,
      invitedBy: input.invitedBy,
      status: "active",
      joinedAt: new Date().toISOString(),
    };
    if (input.affiliation) payload.affiliation = input.affiliation;
    if (input.orcidId) payload.orcidId = input.orcidId;
    return dataApi.upsert<CollabResearchMember>(COLLAB_MEMBERS_COL, id, payload);
  },

  updateRole: (memberId: string, role: CollabMemberRole) =>
    dataApi.update<CollabResearchMember>(COLLAB_MEMBERS_COL, memberId, { role }),

  updateCreditRoles: (memberId: string, creditRoles: CreditRole[]) =>
    dataApi.update<CollabResearchMember>(COLLAB_MEMBERS_COL, memberId, { creditRoles }),

  updateSelfMeta: (
    memberId: string,
    patch: { affiliation?: string; orcidId?: string },
  ) =>
    dataApi.update<CollabResearchMember>(
      COLLAB_MEMBERS_COL,
      memberId,
      patch as unknown as Record<string, unknown>,
    ),

  /** 자진 탈퇴 */
  leave: (memberId: string) =>
    dataApi.update<CollabResearchMember>(COLLAB_MEMBERS_COL, memberId, {
      status: "left",
      leftAt: new Date().toISOString(),
    }),

  /** leader 강제 제거 (또는 admin) */
  remove: (memberId: string) => dataApi.delete(COLLAB_MEMBERS_COL, memberId),
};

const INVITE_TTL_DAYS = 14;

export const collabInvitesApi = {
  /** 받은 초대함 (pending) */
  listInbox: async (recipientId: string): Promise<CollabResearchInvite[]> => {
    const q = query(
      collection(db, COLLAB_INVITES_COL),
      where("recipientId", "==", recipientId),
      where("status", "==", "pending"),
      firestoreLimit(50),
    );
    const snap = await getDocs(q);
    const data = snap.docs.map((d) => (serializeDoc(d) as unknown as CollabResearchInvite));
    return data.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  },

  /** 특정 연구의 발송 초대 전체 (leader 가 보낸 것) */
  listSent: async (researchId: string): Promise<CollabResearchInvite[]> => {
    const q = query(
      collection(db, COLLAB_INVITES_COL),
      where("researchId", "==", researchId),
      orderBy("createdAt", "desc"),
      firestoreLimit(100),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => (serializeDoc(d) as unknown as CollabResearchInvite));
  },

  get: (id: string) => dataApi.get<CollabResearchInvite>(COLLAB_INVITES_COL, id),

  /** 신규 초대 (status=pending 강제, expiresAt 자동 14일) */
  create: async (
    input: CreateCollabInviteInput & {
      senderId: string;
      senderName: string;
      researchTitle: string;
      recipientEmail?: string;
    },
  ): Promise<CollabResearchInvite> => {
    const expires = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const payload: Record<string, unknown> = {
      researchId: input.researchId,
      researchTitle: input.researchTitle,
      senderId: input.senderId,
      senderName: input.senderName,
      recipientId: input.recipientId,
      proposedRole: input.proposedRole,
      status: "pending",
      expiresAt: expires,
    };
    if (input.message) payload.message = input.message;
    if (input.recipientEmail) payload.recipientEmail = input.recipientEmail;
    return dataApi.create<CollabResearchInvite>(COLLAB_INVITES_COL, payload);
  },

  /** 수락: invite update + members upsert + collaboratorIds denorm + streak event. */
  accept: async (
    inviteId: string,
    recipientId: string,
  ): Promise<void> => {
    const invite = await collabInvitesApi.get(inviteId);
    if (!invite) throw new Error("초대를 찾을 수 없습니다.");
    if (invite.status !== "pending") throw new Error("이미 응답한 초대입니다.");

    // 1) 초대 응답
    await dataApi.update<CollabResearchInvite>(COLLAB_INVITES_COL, inviteId, {
      status: "accepted",
      respondedAt: new Date().toISOString(),
    });

    // 2) members 등록 (invitedBy = sender → rules: invitedBy != self 통과)
    await collabMembersApi.upsertSelf({
      researchId: invite.researchId,
      userId: recipientId,
      role: invite.proposedRole,
      creditRoles: [],
      invitedBy: invite.senderId,
    });

    // 2.5) QA-v3: collaboratorIds denorm 즉시 갱신 — 기존엔 leader 의 reconcile 재방문 전까지
    //      수락자의 /collab 목록(array-contains)에 연구가 보이지 않았다. 룰이 "본인 uid 1개 추가"만 허용.
    try {
      await updateDoc(doc(db, COLLAB_RESEARCH_COL, invite.researchId), {
        collaboratorIds: arrayUnion(recipientId),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn("[collabInvitesApi.accept] collaboratorIds denorm failed (reconcile 이 보정)", err);
    }

    // 3) Streak event (+3) — 멱등 doc id 로 중복 가산 방지. 실패해도 수락은 유지.
    try {
      const now = new Date();
      const ymd = now.toISOString().slice(0, 10);
      const refId = invite.researchId;
      const streakId = `${recipientId}__collab-research-join__${refId}`;
      await dataApi.upsert<StreakEvent>("streak_events", streakId, {
        userId: recipientId,
        type: "collab-research-join",
        refId,
        points: 3,
        ymd,
        occurredAt: now.toISOString(),
      });
    } catch (err) {
      console.warn("[collabInvitesApi.accept] streak event failed (non-fatal)", err);
    }
  },

  reject: (inviteId: string) =>
    dataApi.update<CollabResearchInvite>(COLLAB_INVITES_COL, inviteId, {
      status: "rejected",
      respondedAt: new Date().toISOString(),
    }),

  cancel: (inviteId: string) =>
    dataApi.update<CollabResearchInvite>(COLLAB_INVITES_COL, inviteId, {
      status: "cancelled",
      respondedAt: new Date().toISOString(),
    }),

  remove: (id: string) => dataApi.delete(COLLAB_INVITES_COL, id),
};

// ────────────────────────────────────────────────────────────
// Collaborative Research Phase 2 API
//   chapters / comments / meetings / milestones
// ────────────────────────────────────────────────────────────

const COLLAB_CHAPTERS_COL = "collaborative_research_chapters";
const COLLAB_COMMENTS_COL = "collaborative_research_comments";
const COLLAB_MEETINGS_COL = "collaborative_research_meetings";
const COLLAB_MILESTONES_COL = "collaborative_research_milestones";

export const collabChaptersApi = {
  listByResearch: async (researchId: string): Promise<CollabResearchChapter[]> => {
    const q = query(
      collection(db, COLLAB_CHAPTERS_COL),
      where("researchId", "==", researchId),
      orderBy("order", "asc"),
      firestoreLimit(100),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => serializeDoc(d) as unknown as CollabResearchChapter);
  },

  get: (id: string) => dataApi.get<CollabResearchChapter>(COLLAB_CHAPTERS_COL, id),

  create: async (input: CreateChapterInput): Promise<CollabResearchChapter> => {
    const payload: Record<string, unknown> = {
      ...input,
      version: 1,
      lastEditedBy: "",
      lastEditedAt: new Date().toISOString(),
    };
    return dataApi.create<CollabResearchChapter>(COLLAB_CHAPTERS_COL, payload);
  },

  /** optimistic locking — expectedVersion 불일치 시 throw */
  update: async (
    id: string,
    patch: UpdateChapterInput,
  ): Promise<CollabResearchChapter> => {
    const current = await collabChaptersApi.get(id);
    if (current.version !== patch.expectedVersion) {
      throw new Error(
        `버전 충돌 — 다른 멤버가 먼저 저장했습니다 (현재 v${current.version}, 내 시점 v${patch.expectedVersion}). 새로고침 후 변경사항 병합 후 다시 저장하세요.`,
      );
    }
    const { expectedVersion: _v, ...rest } = patch;
    void _v;
    const next: Record<string, unknown> = {
      ...rest,
      version: current.version + 1,
      lastEditedAt: new Date().toISOString(),
    };
    if (typeof rest.content === "string") {
      next.charCount = rest.content.length;
    }
    return dataApi.update<CollabResearchChapter>(COLLAB_CHAPTERS_COL, id, next);
  },

  remove: (id: string) => dataApi.delete(COLLAB_CHAPTERS_COL, id),
};

export const collabCommentsApi = {
  // QA-v3 C4: comments read 룰은 researchId 기반(isCollabMember) — researchId 등호 필터가
  // 있어야 쿼리 증명이 통과한다. orderBy 는 복합 인덱스 의존이라 제거하고 클라이언트 정렬.
  listByChapter: async (researchId: string, chapterId: string): Promise<CollabResearchComment[]> => {
    const q = query(
      collection(db, COLLAB_COMMENTS_COL),
      where("researchId", "==", researchId),
      where("chapterId", "==", chapterId),
      firestoreLimit(100),
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => serializeDoc(d) as unknown as CollabResearchComment)
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  },

  listMentioningMe: async (userId: string): Promise<CollabResearchComment[]> => {
    const q = query(
      collection(db, COLLAB_COMMENTS_COL),
      where("mentionedUserIds", "array-contains", userId),
      orderBy("createdAt", "desc"),
      firestoreLimit(50),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => serializeDoc(d) as unknown as CollabResearchComment);
  },

  get: (id: string) => dataApi.get<CollabResearchComment>(COLLAB_COMMENTS_COL, id),

  create: (input: CreateCommentInput) =>
    dataApi.create<CollabResearchComment>(COLLAB_COMMENTS_COL, input as unknown as Record<string, unknown>),

  updateBody: (id: string, body: string) =>
    dataApi.update<CollabResearchComment>(COLLAB_COMMENTS_COL, id, { body }),

  toggleResolve: (id: string, resolverId: string | null) =>
    dataApi.update<CollabResearchComment>(COLLAB_COMMENTS_COL, id, {
      resolvedAt: resolverId ? new Date().toISOString() : null,
      resolvedBy: resolverId ?? null,
    } as unknown as Record<string, unknown>),

  remove: (id: string) => dataApi.delete(COLLAB_COMMENTS_COL, id),
};

export const collabMeetingsApi = {
  listByResearch: async (researchId: string): Promise<CollabResearchMeeting[]> => {
    const q = query(
      collection(db, COLLAB_MEETINGS_COL),
      where("researchId", "==", researchId),
      orderBy("scheduledAt", "desc"),
      firestoreLimit(50),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => serializeDoc(d) as unknown as CollabResearchMeeting);
  },

  get: (id: string) => dataApi.get<CollabResearchMeeting>(COLLAB_MEETINGS_COL, id),

  create: (input: CreateMeetingInput) =>
    dataApi.create<CollabResearchMeeting>(COLLAB_MEETINGS_COL, input as unknown as Record<string, unknown>),

  update: (id: string, patch: UpdateMeetingInput) =>
    dataApi.update<CollabResearchMeeting>(COLLAB_MEETINGS_COL, id, patch as unknown as Record<string, unknown>),

  remove: (id: string) => dataApi.delete(COLLAB_MEETINGS_COL, id),
};

export const collabMilestonesApi = {
  listByResearch: async (researchId: string): Promise<CollabResearchMilestone[]> => {
    const q = query(
      collection(db, COLLAB_MILESTONES_COL),
      where("researchId", "==", researchId),
      orderBy("targetDate", "asc"),
      firestoreLimit(100),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => serializeDoc(d) as unknown as CollabResearchMilestone);
  },

  listByAssignee: async (userId: string): Promise<CollabResearchMilestone[]> => {
    const q = query(
      collection(db, COLLAB_MILESTONES_COL),
      where("assigneeIds", "array-contains", userId),
      where("status", "in", ["planned", "in_progress", "overdue"]),
      firestoreLimit(50),
    );
    const snap = await getDocs(q);
    const data = snap.docs.map((d) => serializeDoc(d) as unknown as CollabResearchMilestone);
    return data.sort((a, b) => (a.targetDate ?? "").localeCompare(b.targetDate ?? ""));
  },

  get: (id: string) => dataApi.get<CollabResearchMilestone>(COLLAB_MILESTONES_COL, id),

  create: (input: CreateMilestoneInput) =>
    dataApi.create<CollabResearchMilestone>(COLLAB_MILESTONES_COL, input as unknown as Record<string, unknown>),

  update: (id: string, patch: UpdateMilestoneInput) =>
    dataApi.update<CollabResearchMilestone>(COLLAB_MILESTONES_COL, id, patch as unknown as Record<string, unknown>),

  /** done 상태로 전이 — completedAt 자동 채움 */
  complete: (id: string) =>
    dataApi.update<CollabResearchMilestone>(COLLAB_MILESTONES_COL, id, {
      status: "done",
      completedAt: new Date().toISOString(),
    } as unknown as Record<string, unknown>),

  remove: (id: string) => dataApi.delete(COLLAB_MILESTONES_COL, id),
};

// ────────────────────────────────────────────────────────────
// Research Journal API (Phase 3 — 출판 트랙)
//
// research_journal_issues : 호수 (정식 트랙 한정)
// research_journal_articles : 발간 논문 (워킹 + 정식 통합)
// 설계: docs/02-design/features/collaborative-research.design.md 4장
// ────────────────────────────────────────────────────────────

const JOURNAL_ISSUES_COL = "research_journal_issues";
const JOURNAL_ARTICLES_COL = "research_journal_articles";

export const journalIssuesApi = {
  /** 발간된 호수 (공개 — 비로그인 포함) */
  listPublished: async (): Promise<ResearchJournalIssue[]> => {
    const q = query(
      collection(db, JOURNAL_ISSUES_COL),
      where("status", "==", "published"),
      orderBy("publishedAt", "desc"),
      firestoreLimit(50),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => serializeDoc(d) as unknown as ResearchJournalIssue);
  },

  /** 운영진 콘솔 — 모든 상태 */
  listAll: async (): Promise<ResearchJournalIssue[]> => {
    const q = query(
      collection(db, JOURNAL_ISSUES_COL),
      orderBy("year", "desc"),
      orderBy("volume", "desc"),
      orderBy("number", "desc"),
      firestoreLimit(100),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => serializeDoc(d) as unknown as ResearchJournalIssue);
  },

  get: (id: string) => dataApi.get<ResearchJournalIssue>(JOURNAL_ISSUES_COL, id),

  create: (input: CreateJournalIssueInput) =>
    dataApi.create<ResearchJournalIssue>(JOURNAL_ISSUES_COL, input as unknown as Record<string, unknown>),

  update: (id: string, patch: UpdateJournalIssueInput) =>
    dataApi.update<ResearchJournalIssue>(
      JOURNAL_ISSUES_COL,
      id,
      patch as unknown as Record<string, unknown>,
    ),

  /** 호수 발간 — status='published' + publishedAt 갱신 */
  publish: (id: string) =>
    dataApi.update<ResearchJournalIssue>(JOURNAL_ISSUES_COL, id, {
      status: "published",
      publishedAt: new Date().toISOString(),
    }),

  remove: (id: string) => dataApi.delete(JOURNAL_ISSUES_COL, id),
};

export const journalArticlesApi = {
  /** 공개 발간 논문 목록 — 비로그인 가능 */
  listPublic: async (): Promise<ResearchJournalArticle[]> => {
    // QA-v2: reviewStatus 를 서버 필터로 — draft 원문이 클라이언트로 내려오지 않게 (rules list 증명성).
    // orderBy 제거(복합 인덱스 회피) 후 클라이언트 정렬.
    const q = query(
      collection(db, JOURNAL_ARTICLES_COL),
      where("visibility", "==", "public"),
      where("reviewStatus", "==", "published"),
      firestoreLimit(100),
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => serializeDoc(d) as unknown as ResearchJournalArticle)
      .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  },

  /** 학회원 가시 (society + public) — 인증 필요 */
  listSociety: async (): Promise<ResearchJournalArticle[]> => {
    const [pubSnap, socSnap] = await Promise.all([
      getDocs(query(
        collection(db, JOURNAL_ARTICLES_COL),
        where("visibility", "==", "public"),
        where("reviewStatus", "==", "published"),
        firestoreLimit(100),
      )),
      getDocs(query(
        collection(db, JOURNAL_ARTICLES_COL),
        where("visibility", "==", "society"),
        where("reviewStatus", "==", "published"),
        firestoreLimit(100),
      )),
    ]);
    const all = [
      ...pubSnap.docs.map((d) => serializeDoc(d) as unknown as ResearchJournalArticle),
      ...socSnap.docs.map((d) => serializeDoc(d) as unknown as ResearchJournalArticle),
    ];
    // dedup
    const map = new Map<string, ResearchJournalArticle>();
    all.forEach((a) => map.set(a.id, a));
    return [...map.values()].sort(
      (a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
    );
  },

  /** 특정 연구의 모든 article (팀 작업 공간용) */
  listByResearch: async (researchId: string): Promise<ResearchJournalArticle[]> => {
    const q = query(
      collection(db, JOURNAL_ARTICLES_COL),
      where("researchId", "==", researchId),
      orderBy("updatedAt", "desc"),
      firestoreLimit(50),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => serializeDoc(d) as unknown as ResearchJournalArticle);
  },

  /** 운영진 검수 큐 — under_review + submitted */
  listForReview: async (): Promise<ResearchJournalArticle[]> => {
    const [sub, rev] = await Promise.all([
      getDocs(query(
        collection(db, JOURNAL_ARTICLES_COL),
        where("reviewStatus", "==", "submitted"),
        orderBy("updatedAt", "desc"),
        firestoreLimit(50),
      )),
      getDocs(query(
        collection(db, JOURNAL_ARTICLES_COL),
        where("reviewStatus", "==", "under_review"),
        orderBy("updatedAt", "desc"),
        firestoreLimit(50),
      )),
    ]);
    return [
      ...sub.docs.map((d) => serializeDoc(d) as unknown as ResearchJournalArticle),
      ...rev.docs.map((d) => serializeDoc(d) as unknown as ResearchJournalArticle),
    ];
  },

  /** 특정 호수의 발간 논문.
   *  QA-v3: list 룰이 visibility+reviewStatus 증명을 요구 — issueId 단독 쿼리는 비-staff 전원 거부됨.
   *  public/society 두 증명형 쿼리를 병합하고 pageStart 는 클라이언트 정렬(복합 인덱스 회피). */
  listByIssue: async (issueId: string): Promise<ResearchJournalArticle[]> => {
    const mk = (visibility: string) =>
      query(
        collection(db, JOURNAL_ARTICLES_COL),
        where("issueId", "==", issueId),
        where("reviewStatus", "==", "published"),
        where("visibility", "==", visibility),
        firestoreLimit(50),
      );
    const queries = [mk("public")];
    if (auth.currentUser) queries.push(mk("society"));
    const snaps = await Promise.all(queries.map((q) => getDocs(q)));
    const seen = new Set<string>();
    const out: ResearchJournalArticle[] = [];
    for (const snap of snaps) {
      for (const d of snap.docs) {
        if (seen.has(d.id)) continue;
        seen.add(d.id);
        out.push(serializeDoc(d) as unknown as ResearchJournalArticle);
      }
    }
    return out.sort((a, b) => (a.pageStart ?? 0) - (b.pageStart ?? 0));
  },

  get: (id: string) => dataApi.get<ResearchJournalArticle>(JOURNAL_ARTICLES_COL, id),

  /** 신규 article — researchId + publicationType 만 받고 나머지는 default 채움 */
  create: async (input: {
    researchId: string;
    publicationType: PublicationType;
    titleKo?: string;
  }): Promise<ResearchJournalArticle> => {
    const payload: Record<string, unknown> = {
      researchId: input.researchId,
      publicationType: input.publicationType,
      titleKo: input.titleKo ?? "(제목 미입력)",
      abstractKo: "",
      keywordsKo: [],
      authors: [],
      content: "",
      contentStructure: input.publicationType === "journal" ? "imrad" : "free",
      citations: [],
      reviewStatus: "draft" as ArticleReviewStatus,
      reviewerIds: [],
      visibility: "private" as ArticleVisibility,
      viewCount: 0,
      downloadCount: 0,
    };
    return dataApi.create<ResearchJournalArticle>(JOURNAL_ARTICLES_COL, payload);
  },

  updateMeta: (id: string, patch: UpdateArticleMetaInput) =>
    dataApi.update<ResearchJournalArticle>(
      JOURNAL_ARTICLES_COL,
      id,
      patch as unknown as Record<string, unknown>,
    ),

  updateAuthors: (id: string, authors: ArticleAuthorSnapshot[]) =>
    dataApi.update<ResearchJournalArticle>(JOURNAL_ARTICLES_COL, id, {
      authors,
    } as unknown as Record<string, unknown>),

  // ── 저자 동의 게이트 ──

  /** 동의 요청 발송 — 모든 author 에 대해 pending 상태 생성. */
  requestConsent: (id: string, authors: ArticleAuthorSnapshot[]) => {
    const consents: Record<string, AuthorConsent> = {};
    for (const a of authors) {
      consents[a.userId] = { userId: a.userId, status: "pending" };
    }
    return dataApi.update<ResearchJournalArticle>(JOURNAL_ARTICLES_COL, id, {
      consentRequestedAt: new Date().toISOString(),
      authorConsents: consents,
    });
  },

  /** 단일 저자 응답 — 본인이 자기 동의 기록 */
  recordConsent: async (
    id: string,
    userId: string,
    agreed: boolean,
    rejectionNote?: string,
  ): Promise<void> => {
    const article = await journalArticlesApi.get(id);
    const consents = { ...(article.authorConsents ?? {}) };
    consents[userId] = {
      userId,
      status: agreed ? "agreed" : "rejected",
      agreedAt: agreed ? new Date().toISOString() : undefined,
      rejectionNote: rejectionNote || undefined,
    };
    await dataApi.update<ResearchJournalArticle>(JOURNAL_ARTICLES_COL, id, {
      authorConsents: consents,
    } as unknown as Record<string, unknown>);
  },

  // ── 검수 워크플로우 상태 전이 ──

  /** draft → submitted (저자 100% 동의 필요. 호출자가 사전 검증) */
  submit: (id: string) =>
    dataApi.update<ResearchJournalArticle>(JOURNAL_ARTICLES_COL, id, {
      reviewStatus: "submitted",
    }),

  /** submitted → under_review (운영진이 본인을 reviewer 로 잡고 검수 시작) */
  startReview: async (id: string, reviewerId: string): Promise<void> => {
    const article = await journalArticlesApi.get(id);
    const reviewerIds = Array.from(new Set([...(article.reviewerIds ?? []), reviewerId]));
    await dataApi.update<ResearchJournalArticle>(JOURNAL_ARTICLES_COL, id, {
      reviewStatus: "under_review",
      reviewerIds,
    } as unknown as Record<string, unknown>);
  },

  /** 검수 코멘트 추가 (운영진 또는 collaborator 가 추가) */
  addReviewComment: async (
    id: string,
    comment: Omit<ReviewComment, "id" | "createdAt">,
  ): Promise<void> => {
    const article = await journalArticlesApi.get(id);
    const newComment: ReviewComment = {
      ...comment,
      id:
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    const next = [...(article.reviewComments ?? []), newComment];
    await dataApi.update<ResearchJournalArticle>(JOURNAL_ARTICLES_COL, id, {
      reviewComments: next,
    } as unknown as Record<string, unknown>);
  },

  /** under_review → revision_requested (수정 요청) */
  requestRevision: (id: string) =>
    dataApi.update<ResearchJournalArticle>(JOURNAL_ARTICLES_COL, id, {
      reviewStatus: "revision_requested",
    }),

  /** under_review → accepted (운영진 승인 — 호수 배정 전 단계) */
  accept: (id: string) =>
    dataApi.update<ResearchJournalArticle>(JOURNAL_ARTICLES_COL, id, {
      reviewStatus: "accepted",
    }),

  /** accepted → published (편집장이 호수·페이지·visibility 지정 후 발간)
   *  워킹 페이퍼: leader 가 자율 호출, issueId 없이 published.
   *  발간 시 모든 저자에게 +10 streak (멱등). 실패해도 발간 자체는 유지. */
  publish: async (
    id: string,
    options: {
      visibility: ArticleVisibility;
      issueId?: string;
      pageStart?: number;
      pageEnd?: number;
    },
  ): Promise<ResearchJournalArticle> => {
    const updated = await dataApi.update<ResearchJournalArticle>(JOURNAL_ARTICLES_COL, id, {
      reviewStatus: "published",
      publishedAt: new Date().toISOString(),
      visibility: options.visibility,
      issueId: options.issueId,
      pageStart: options.pageStart,
      pageEnd: options.pageEnd,
    } as unknown as Record<string, unknown>);

    // 저자별 +10 streak (멱등 doc id)
    try {
      const now = new Date();
      const ymd = now.toISOString().slice(0, 10);
      for (const author of updated.authors ?? []) {
        const streakId = `${author.userId}__research-journal-publish__${id}`;
        await dataApi.upsert<StreakEvent>("streak_events", streakId, {
          userId: author.userId,
          type: "research-journal-publish",
          refId: id,
          points: 10,
          ymd,
          occurredAt: now.toISOString(),
        });
      }
    } catch (err) {
      console.warn("[journalArticlesApi.publish] streak event failed (non-fatal)", err);
    }

    return updated;
  },

  /** 발간 후 철회 */
  withdraw: (id: string, reason: string) =>
    dataApi.update<ResearchJournalArticle>(JOURNAL_ARTICLES_COL, id, {
      reviewStatus: "withdrawn",
      withdrawnAt: new Date().toISOString(),
      withdrawnReason: reason,
    } as unknown as Record<string, unknown>),

  /** 열람 카운트 +1 — Firestore increment sentinel */
  incrementView: (id: string) =>
    dataApi.patch<ResearchJournalArticle>(JOURNAL_ARTICLES_COL, id, {
      viewCount: increment(1),
    }),

  /** 다운로드 카운트 +1 */
  incrementDownload: (id: string) =>
    dataApi.patch<ResearchJournalArticle>(JOURNAL_ARTICLES_COL, id, {
      downloadCount: increment(1),
    }),

  remove: (id: string) => dataApi.delete(JOURNAL_ARTICLES_COL, id),
};

// ─────────────────────────────────────────────────────────────
// 소통 보드 (Q&A Communication Board) — 스터디 회차·세미나 공용
// 보드 read 공개, 질문/답변은 firestore.rules 에서 allowGuest+status 게이트.
// 좋아요/답변 카운트는 increment() 로 경쟁 방지(denorm).
// ─────────────────────────────────────────────────────────────
export const commBoardsApi = {
  listByContext: (contextType: CommContextType, contextId: string, activityProgressId?: string) =>
    dataApi.list<CommBoard>("comm_boards", {
      "filter[contextType]": contextType,
      "filter[contextId]": contextId,
      ...(activityProgressId ? { "filter[activityProgressId]": activityProgressId } : {}),
      limit: 100,
    }),
  get: (id: string) => dataApi.get<CommBoard>("comm_boards", id),
  create: (data: Record<string, unknown>) => dataApi.create<CommBoard>("comm_boards", data),
  update: (id: string, data: Partial<CommBoard>) =>
    dataApi.update<CommBoard>("comm_boards", id, data as unknown as Record<string, unknown>),
  delete: (id: string) => dataApi.delete("comm_boards", id),
};

export const commQuestionsApi = {
  /** 온보딩 체크리스트: 본인 작성 질문 존재 확인용 (limit 1) */
  existsByAuthor: async (authorId: string): Promise<boolean> => {
    const res = await dataApi.list<CommQuestion>("comm_questions", {
      "filter[authorId]": authorId,
      limit: 1,
    });
    return res.data.length > 0;
  },
  listByBoard: (boardId: string) =>
    dataApi.list<CommQuestion>("comm_questions", { "filter[boardId]": boardId, limit: 500 }),
  create: (data: Record<string, unknown>) =>
    dataApi.create<CommQuestion>("comm_questions", {
      ...data,
      resolved: false,
      likeCount: 0,
      answerCount: 0,
    }),
  update: (id: string, data: Partial<CommQuestion>) =>
    dataApi.update<CommQuestion>("comm_questions", id, data as unknown as Record<string, unknown>),
  delete: async (id: string): Promise<void> => {
    // cascade: 자식 답변 함께 삭제 (UI confirm "답변도 함께 사라집니다" 와 일치)
    const res = await dataApi.list<CommAnswer>("comm_answers", {
      "filter[questionId]": id,
      limit: 500,
    });
    await Promise.all(
      (res.data as CommAnswer[]).map((a) => dataApi.delete("comm_answers", a.id)),
    );
    await dataApi.delete("comm_questions", id);
  },
  /** 채택/해제 — 질문 문서만 갱신(답변엔 쓰지 않음, UI 가 resolvedAnswerId 로 판단) */
  setResolved: (id: string, resolved: boolean, resolvedAnswerId: string | null) =>
    dataApi.update<CommQuestion>("comm_questions", id, {
      resolved,
      resolvedAnswerId: resolvedAnswerId ?? null,
    } as unknown as Record<string, unknown>),
};

export const commAnswersApi = {
  /** 온보딩 체크리스트: 본인 작성 답변 존재 확인용 (limit 1) */
  existsByAuthor: async (authorId: string): Promise<boolean> => {
    const res = await dataApi.list<CommAnswer>("comm_answers", {
      "filter[authorId]": authorId,
      limit: 1,
    });
    return res.data.length > 0;
  },
  listByBoard: (boardId: string) =>
    dataApi.list<CommAnswer>("comm_answers", { "filter[boardId]": boardId, limit: 2000 }),
  listByQuestion: (questionId: string) =>
    dataApi.list<CommAnswer>("comm_answers", { "filter[questionId]": questionId, limit: 500 }),
  /** 답변 본문 수정 — rules 상 회원 작성자/보드 소유자/운영진만 가능 */
  update: (id: string, data: Partial<CommAnswer>) =>
    dataApi.update<CommAnswer>("comm_answers", id, data as unknown as Record<string, unknown>),
  create: async (data: Record<string, unknown>): Promise<CommAnswer> => {
    const created = await dataApi.create<CommAnswer>("comm_answers", { ...data, likeCount: 0 });
    // denorm: 질문 answerCount +1 — best-effort 비차단 (QA P1):
    // 카운트 갱신이 rules 에 거부되더라도 답변 저장 자체는 성공으로 처리
    try {
      await updateDoc(doc(db, "comm_questions", String(data.questionId)), {
        answerCount: increment(1),
      });
    } catch (err) {
      console.warn("[commAnswers.create] answerCount increment failed (non-fatal)", err);
    }
    return created;
  },
  delete: async (answer: Pick<CommAnswer, "id" | "questionId">): Promise<void> => {
    await dataApi.delete("comm_answers", answer.id);
    try {
      await updateDoc(doc(db, "comm_questions", answer.questionId), {
        answerCount: increment(-1),
      });
    } catch (err) {
      console.warn("[commAnswers.delete] answerCount decrement failed (non-fatal)", err);
    }
  },
};

export const commLikesApi = {
  /** 로그인 사용자가 보드 내에서 누른 좋아요 집합("type__id") — UI liked 상태용 */
  listMineSet: async (userId: string): Promise<Set<string>> => {
    const res = await dataApi.list<CommLike>("comm_likes", {
      "filter[userId]": userId,
      limit: 2000,
    });
    return new Set(res.data.map((l) => `${l.targetType}__${l.targetId}`));
  },
  /**
   * 토글 — 켜지면 true 반환. 대상 likeCount increment. (로그인 전용)
   * QA P2: read-check-write 비원자 경합으로 더블클릭 시 카운트 드리프트(±2) 발생
   * → runTransaction 으로 like 존재 확인과 카운트 증감을 원자화.
   */
  toggle: async (
    userId: string,
    targetType: CommLikeTarget,
    targetId: string,
  ): Promise<boolean> => {
    const id = `${userId}__${targetType}__${targetId}`;
    const ref = doc(db, "comm_likes", id);
    const targetCol = targetType === "question" ? "comm_questions" : "comm_answers";
    const targetRef = doc(db, targetCol, targetId);
    return runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists()) {
        tx.delete(ref);
        tx.update(targetRef, { likeCount: increment(-1) });
        return false;
      }
      tx.set(ref, { userId, targetType, targetId, createdAt: serverTimestamp() });
      tx.update(targetRef, { likeCount: increment(1) });
      return true;
    });
  },
};
