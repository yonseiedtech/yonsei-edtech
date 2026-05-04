import { doc, setDoc, increment, arrayUnion, serverTimestamp, addDoc, collection } from "firebase/firestore";
import { db } from "./firebase";
import { todayYmdKst } from "./dday";

const SESSION_PREFIX = "visit-tracked-";
const ANON_KEY = "visit-anon-id";

const PATH_GROUP_LABELS: Record<string, string> = {
  home: "홈",
  seminars: "세미나",
  courses: "강의",
  research: "연구",
  activities: "학술활동",
  console: "운영콘솔",
  admin: "관리자",
  mypage: "마이페이지",
  profile: "프로필",
  dashboard: "대시보드",
  posts: "게시판",
  community: "커뮤니티",
  newsletter: "학회보",
  steppingstone: "인지디딤판",
  alumni: "졸업생",
  members: "회원",
  signin: "로그인",
  signup: "회원가입",
  calendar: "일정",
  card_news: "카드뉴스",
  fees: "학회비",
};

export function pathGroup(pathname: string): string {
  if (!pathname || pathname === "/") return "home";
  const seg = pathname.split("/").filter(Boolean)[0] ?? "home";
  return seg.replace(/-/g, "_").toLowerCase();
}

export function pathGroupLabel(group: string): string {
  return PATH_GROUP_LABELS[group] ?? group;
}

function anonId(): string {
  try {
    let v = localStorage.getItem(ANON_KEY);
    if (!v) {
      v = `anon-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
      localStorage.setItem(ANON_KEY, v);
    }
    return v;
  } catch {
    return `anon-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function hourBucketKey(now: Date): string {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    hour12: false,
  });
  return fmt.format(now).padStart(2, "0");
}

interface TrackOptions {
  userId?: string | null;
  pathname?: string;
}

export async function trackVisit(opts: TrackOptions = {}): Promise<void> {
  if (typeof window === "undefined") return;
  const { userId, pathname } = opts;
  const ymd = todayYmdKst();
  const sessionKey = `${SESSION_PREFIX}${ymd}`;
  // Sprint 68: 각 visitorId 별도 추적 — 비로그인→로그인 시 userId 도 uniqueVisitors 에 추가되도록
  const visitorsKey = `${SESSION_PREFIX}${ymd}-ids`;

  const visitorId = userId || anonId();
  const hour = hourBucketKey(new Date());
  const group = pathGroup(pathname || "/");

  let isFirstSessionVisit = false;
  let isNewVisitorThisSession = false;
  try {
    if (!sessionStorage.getItem(sessionKey)) {
      sessionStorage.setItem(sessionKey, "1");
      isFirstSessionVisit = true;
    }
    const trackedRaw = sessionStorage.getItem(visitorsKey) ?? "[]";
    const tracked: string[] = JSON.parse(trackedRaw);
    if (!tracked.includes(visitorId)) {
      tracked.push(visitorId);
      sessionStorage.setItem(visitorsKey, JSON.stringify(tracked));
      isNewVisitorThisSession = true;
    }
  } catch {
    return;
  }

  const payload: Record<string, unknown> = {
    date: ymd,
    pageViews: increment(1),
    [`hourBuckets.${hour}`]: increment(1),
    [`pathCounts.${group}`]: increment(1),
    updatedAt: serverTimestamp(),
  };
  if (isFirstSessionVisit) {
    payload.visits = increment(1);
  }
  // 새 visitorId 가 등장하면 uniqueVisitors arrayUnion (로그인 후 userId 등장 케이스 포함)
  if (isNewVisitorThisSession) {
    payload.uniqueVisitors = arrayUnion(visitorId);
  }

  try {
    await setDoc(doc(db, "daily_visits", ymd), payload, { merge: true });
  } catch {
    if (isFirstSessionVisit) {
      try {
        sessionStorage.removeItem(sessionKey);
      } catch {
        // noop
      }
    }
    if (isNewVisitorThisSession) {
      try {
        const tracked: string[] = JSON.parse(sessionStorage.getItem(visitorsKey) ?? "[]");
        sessionStorage.setItem(visitorsKey, JSON.stringify(tracked.filter((v) => v !== visitorId)));
      } catch {
        // noop
      }
    }
  }
}

// ─── Sprint 63: 회원 개별 페이지 접속 이력 ─────────────────────────────────
const ACTIVITY_THROTTLE_MS = 30 * 1000; // 동일 (userId+pathGroup) 30초 throttle
const ACTIVITY_KEY_PREFIX = "user-activity-last-";

interface UserActivityOpts {
  userId: string;
  userName?: string;
  pathname: string;
}

export async function trackUserActivity(opts: UserActivityOpts): Promise<void> {
  if (typeof window === "undefined") return;
  const { userId, userName, pathname } = opts;
  if (!userId || !pathname) return;
  const group = pathGroup(pathname);
  // 의미 없는 그룹 제외 (정적 자산 등)
  if (group === "_next" || group === "api" || group === "favicon.ico") return;

  // throttle: 같은 회원 + 같은 path group 30초 내 중복 기록 방지
  const throttleKey = `${ACTIVITY_KEY_PREFIX}${userId}-${group}`;
  try {
    const last = sessionStorage.getItem(throttleKey);
    if (last && Date.now() - Number(last) < ACTIVITY_THROTTLE_MS) return;
    sessionStorage.setItem(throttleKey, String(Date.now()));
  } catch {
    return;
  }

  const payload = {
    userId,
    userName: userName ?? "",
    path: pathname,
    pathGroup: group,
    pathLabel: pathGroupLabel(group),
    createdAt: new Date().toISOString(),
  };
  try {
    await addDoc(collection(db, "user_activity_logs"), payload);
  } catch {
    // 활동 로그 실패는 본 작업에 영향 X — silent
  }
}
