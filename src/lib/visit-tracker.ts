import { doc, setDoc, increment, arrayUnion, serverTimestamp } from "firebase/firestore";
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
  let isFirstVisit = false;
  try {
    if (!sessionStorage.getItem(sessionKey)) {
      sessionStorage.setItem(sessionKey, "1");
      isFirstVisit = true;
    }
  } catch {
    return;
  }
  const visitorId = userId || anonId();
  const hour = hourBucketKey(new Date());
  const group = pathGroup(pathname || "/");

  const payload: Record<string, unknown> = {
    date: ymd,
    pageViews: increment(1),
    [`hourBuckets.${hour}`]: increment(1),
    [`pathCounts.${group}`]: increment(1),
    updatedAt: serverTimestamp(),
  };
  if (isFirstVisit) {
    payload.visits = increment(1);
    payload.uniqueVisitors = arrayUnion(visitorId);
  }

  try {
    await setDoc(doc(db, "daily_visits", ymd), payload, { merge: true });
  } catch {
    if (isFirstVisit) {
      try {
        sessionStorage.removeItem(sessionKey);
      } catch {
        // noop
      }
    }
  }
}
