import { doc, setDoc, increment, arrayUnion, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { todayYmdKst } from "./dday";

const STORAGE_PREFIX = "visit-tracked-";

function anonId(): string {
  try {
    const KEY = "visit-anon-id";
    let v = localStorage.getItem(KEY);
    if (!v) {
      v = `anon-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
      localStorage.setItem(KEY, v);
    }
    return v;
  } catch {
    return `anon-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export async function trackVisit(userId?: string | null): Promise<void> {
  if (typeof window === "undefined") return;
  const ymd = todayYmdKst();
  const sessionKey = `${STORAGE_PREFIX}${ymd}`;
  try {
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, "1");
  } catch {
    return;
  }
  const visitorId = userId || anonId();
  try {
    await setDoc(
      doc(db, "daily_visits", ymd),
      {
        date: ymd,
        visits: increment(1),
        uniqueVisitors: arrayUnion(visitorId),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch {
    try {
      sessionStorage.removeItem(sessionKey);
    } catch {
      // noop
    }
  }
}
