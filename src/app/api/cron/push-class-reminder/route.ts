import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import { sendPushToUsers } from "@/lib/push-admin";

/**
 * 오늘 수업 안내 푸시 — Sprint 53 (Vercel Hobby 호환 daily 버전)
 *
 * 매일 09:00 KST (UTC 00:00) 실행. 오늘 진행될 active 수업의 수강자에게
 * "○○ 수업이 오늘 14:00에 시작해요" 형태로 1회 푸시.
 *
 * Hobby tier 는 1일 1회 cron 만 허용 → 분 단위 30분 전 전송 불가.
 * Pro 업그레이드 시 매 5분 cron 으로 30분 전 정확 발송으로 전환 가능 (Sprint 56+ 후속).
 *
 * 중복 방지: push_logs/class_reminder_<offering>_<date>
 * 휴강(class_sessions.mode=cancelled) 자동 제외.
 */

const DAY_NAMES_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function todayYmdKst(now: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(now);
}

function nowKstWeekday(now: Date = new Date()): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    weekday: "short",
  });
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[fmt.format(now)] ?? new Date().getDay();
}

const DAY_TOKENS: Record<string, number> = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 };

const PERIOD_TIMES: Record<number, { start: number; end: number }> = {
  1: { start: 18 * 60 + 20, end: 19 * 60 + 10 },
  2: { start: 19 * 60 + 10, end: 20 * 60 },
  3: { start: 20 * 60 + 10, end: 21 * 60 },
  4: { start: 21 * 60, end: 21 * 60 + 50 },
};

function timeToMin(hh: string, mm: string): number {
  const h = Number(hh);
  const m = Number(mm);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return -1;
  if (h < 0 || h > 23 || m < 0 || m > 59) return -1;
  return h * 60 + m;
}

function extractPeriodStart(text: string): number | null {
  const set = new Set<number>();
  const pattern = /([1-4](?:\s*[,·\-~–—]\s*[1-4])*)\s*교\s*시/g;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    const nums = m[1].split(/[,·\-~–—\s]+/).map((s) => Number(s));
    for (const n of nums) if (n >= 1 && n <= 4) set.add(n);
  }
  if (set.size === 0) return null;
  return PERIOD_TIMES[Math.min(...set)]?.start ?? null;
}

interface ParsedSched {
  weekdays: number[];
  startMin: number | null;
}

function parseSchedule(raw: string | undefined): ParsedSched {
  if (!raw) return { weekdays: [], startMin: null };
  const text = raw.trim();
  if (!text) return { weekdays: [], startMin: null };
  const weekdays: number[] = [];
  for (const ch of text) {
    if (ch in DAY_TOKENS && !weekdays.includes(DAY_TOKENS[ch])) {
      weekdays.push(DAY_TOKENS[ch]);
    }
  }
  const tm = /(\d{1,2})\s*[:시]\s*(\d{2})/.exec(text);
  let startMin: number | null = null;
  if (tm) {
    const v = timeToMin(tm[1], tm[2]);
    if (v >= 0) startMin = v;
  } else {
    startMin = extractPeriodStart(text);
  }
  return { weekdays, startMin };
}

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const now = new Date();
    const today = todayYmdKst(now);
    const weekday = nowKstWeekday(now);
    const dayChar = DAY_NAMES_KO[weekday];

    const offeringsSnap = await db
      .collection("course_offerings")
      .where("active", "==", true)
      .get();

    let sentTotal = 0;
    let removedStaleTotal = 0;
    const matched: { offeringId: string; courseName: string; recipientCount: number }[] = [];

    for (const doc of offeringsSnap.docs) {
      const o = doc.data() as { schedule?: string; courseName?: string };
      const parsed = parseSchedule(o.schedule);
      if (parsed.startMin == null) continue;
      if (!parsed.weekdays.includes(weekday)) continue;

      // 휴강 자동 제외
      const sessionsSnap = await db
        .collection("class_sessions")
        .where("courseOfferingId", "==", doc.id)
        .where("date", "==", today)
        .limit(5)
        .get();
      const cancelled = sessionsSnap.docs.some(
        (s) => (s.data() as { mode?: string }).mode === "cancelled",
      );
      if (cancelled) continue;

      // 중복 방지 (today 기준 1회)
      const dupId = `class_reminder_${doc.id}_${today}`;
      const dupRef = db.collection("push_logs").doc(dupId);
      const dupSnap = await dupRef.get();
      if (dupSnap.exists) continue;

      // 수강자 (userId 보유분만)
      const enrSnap = await db
        .collection("course_enrollments")
        .where("courseOfferingId", "==", doc.id)
        .get();
      const userIds = enrSnap.docs
        .map((d) => (d.data() as { userId?: string }).userId)
        .filter((x): x is string => !!x);
      if (userIds.length === 0) continue;

      const courseName = o.courseName ?? "수업";
      const startHH = pad2(Math.floor(parsed.startMin / 60));
      const startMM = pad2(parsed.startMin % 60);
      const result = await sendPushToUsers(userIds, {
        title: `오늘 ${startHH}:${startMM} ${courseName}`,
        body: `오늘 (${dayChar}) 수업이 있어요. 자료 미리 확인하세요.`,
        link: `/courses/${doc.id}/schedule`,
        tag: `class-reminder-${doc.id}-${today}`,
      });
      sentTotal += result.successful;
      removedStaleTotal += result.removedStale;
      matched.push({
        offeringId: doc.id,
        courseName,
        recipientCount: result.successful,
      });

      await dupRef.set({
        kind: "class_reminder_daily",
        courseOfferingId: doc.id,
        date: today,
        startMin: parsed.startMin,
        attempted: result.attempted,
        successful: result.successful,
        sentAt: new Date().toISOString(),
      });
    }

    return Response.json({
      ok: true,
      today,
      weekdayKr: dayChar,
      sentTotal,
      removedStaleTotal,
      matched,
    });
  } catch (err) {
    console.error("[cron/push-class-reminder]", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
