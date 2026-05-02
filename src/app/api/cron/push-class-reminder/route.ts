import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { sendPushToUsers } from "@/lib/push-admin";

/**
 * 수업 30분 전 푸시 — Sprint 53
 *
 * 매 5분마다 실행되며, 25~35분 후에 시작하는 수업이 있는지 확인.
 * 일치하면 해당 수업 수강자(userId)에게 1회 푸시.
 *
 * 중복 방지: push_logs/class_reminder_<offeringId>_<sessionDate> 1건만 허용.
 *
 * 수업 시각은 CourseOffering.schedule 자유 텍스트 → parseSchedule 로 추출.
 * cancelled 모드는 send 안 함.
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

function nowKstParts(now: Date = new Date()): { weekday: number; minutes: number } {
  // KST 시각으로 변환
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const wd = weekdayMap[map.weekday] ?? new Date().getDay();
  const h = Number(map.hour);
  const m = Number(map.minute);
  return { weekday: wd, minutes: h * 60 + m };
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

function extractPeriodStarts(text: string): number | null {
  const set = new Set<number>();
  const pattern = /([1-4](?:\s*[,·\-~–—]\s*[1-4])*)\s*교\s*시/g;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    const nums = m[1].split(/[,·\-~–—\s]+/).map((s) => Number(s));
    for (const n of nums) if (n >= 1 && n <= 4) set.add(n);
  }
  if (set.size === 0) return null;
  const first = Math.min(...set);
  return PERIOD_TIMES[first]?.start ?? null;
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
    startMin = extractPeriodStarts(text);
  }
  return { weekdays, startMin };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const now = new Date();
    const today = todayYmdKst(now);
    const { weekday, minutes } = nowKstParts(now);
    // 25~35분 사이 시작하는 수업
    const minLow = minutes + 25;
    const minHigh = minutes + 35;

    // 모든 active offering 가져와서 schedule 매칭 — 학기 필터 없이 active 만 (sub-30 doc 가정)
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
      if (parsed.startMin < minLow || parsed.startMin > minHigh) continue;

      // 휴강 여부 확인
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

      // 중복 방지: push_logs/class_reminder_<offering>_<date>
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
      const dayChar = DAY_NAMES_KO[weekday];
      const result = await sendPushToUsers(userIds, {
        title: `${courseName} 곧 시작 (${dayChar} ${startHH}:${startMM})`,
        body: "수업 30분 전입니다. 자료 확인하셨나요?",
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
        kind: "class_reminder",
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
      weekdayKr: DAY_NAMES_KO[weekday],
      window: { from: minLow, to: minHigh },
      sentTotal,
      removedStaleTotal,
      matched,
    });
  } catch (err) {
    console.error("[cron/push-class-reminder]", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
