import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

/**
 * 주간 다이제스트 이메일 cron — Sprint 54
 *
 * 매주 월요일 09:00 KST (= UTC 0:00 일요일/월요일).
 * Vercel Hobby 1일 1회 한도 호환을 위해 cron 은 매일 돌리고,
 * 핸들러 안에서 "오늘이 KST 월요일"인지 검사 후 발송.
 *
 * 콘텐츠
 *  - 신규/예정 세미나 5건
 *  - 인기 게시글 3건 (최근 14일 createdAt 기준)
 *  - 다가오는 활동 3건 (최근 30일 시작)
 *
 * 수신 대상: approved=true 회원 중 notificationPrefs.weeklyDigest !== false
 * 중복 방지: email_logs 의 type=weekly_digest + targetId=<weekStart> 1건만
 */

interface SeminarLite {
  id: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
}

interface PostLite {
  id: string;
  title: string;
  category?: string;
  createdAt: string;
}

interface ActivityLite {
  id: string;
  type: string;
  title: string;
  date?: string;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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

function isMondayKst(now: Date = new Date()): boolean {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    weekday: "short",
  });
  return fmt.format(now) === "Mon";
}

async function loadUpcomingSeminars(db: FirebaseFirestore.Firestore, todayYmd: string): Promise<SeminarLite[]> {
  const snap = await db.collection("seminars").where("date", ">=", todayYmd).limit(20).get();
  return snap.docs
    .map((d) => {
      const data = d.data() as { title?: string; date?: string; time?: string; location?: string };
      return {
        id: d.id,
        title: data.title ?? "",
        date: data.date ?? "",
        time: data.time,
        location: data.location,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);
}

async function loadPopularPosts(db: FirebaseFirestore.Firestore): Promise<PostLite[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);
  const cutoffIso = cutoff.toISOString();
  const snap = await db.collection("posts").where("createdAt", ">=", cutoffIso).limit(50).get();
  return snap.docs
    .map((d) => {
      const data = d.data() as { title?: string; category?: string; createdAt?: string; viewCount?: number };
      return {
        id: d.id,
        title: data.title ?? "",
        category: data.category,
        createdAt: data.createdAt ?? "",
        _view: data.viewCount ?? 0,
      };
    })
    .sort((a, b) => b._view - a._view || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);
}

async function loadUpcomingActivities(db: FirebaseFirestore.Firestore, todayYmd: string): Promise<ActivityLite[]> {
  const snap = await db.collection("activities").where("date", ">=", todayYmd).limit(20).get();
  return snap.docs
    .map((d) => {
      const data = d.data() as { type?: string; title?: string; date?: string };
      return {
        id: d.id,
        type: data.type ?? "study",
        title: data.title ?? "",
        date: data.date,
      };
    })
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
    .slice(0, 3);
}

function buildHtml({ seminars, posts, activities }: { seminars: SeminarLite[]; posts: PostLite[]; activities: ActivityLite[] }): string {
  const base = "https://yonsei-edtech.vercel.app";
  const seminarHtml = seminars.length === 0
    ? "<li style=\"color:#888\">예정된 세미나가 없습니다.</li>"
    : seminars.map((s) => `<li><a href="${base}/seminars/${s.id}" style="color:#003876;text-decoration:none">${escapeHtml(s.title)}</a> <span style="color:#888;font-size:13px">${escapeHtml(s.date)}${s.time ? ` ${escapeHtml(s.time)}` : ""}</span></li>`).join("");
  const postHtml = posts.length === 0
    ? "<li style=\"color:#888\">최근 인기 게시글이 없습니다.</li>"
    : posts.map((p) => `<li><a href="${base}/board/${p.id}" style="color:#003876;text-decoration:none">${escapeHtml(p.title)}</a></li>`).join("");
  const activityRoute = (t: string) => t === "project" ? "projects" : t === "external" ? "external" : "studies";
  const actHtml = activities.length === 0
    ? "<li style=\"color:#888\">예정된 활동이 없습니다.</li>"
    : activities.map((a) => `<li><a href="${base}/activities/${activityRoute(a.type)}/${a.id}" style="color:#003876;text-decoration:none">${escapeHtml(a.title)}</a> <span style="color:#888;font-size:13px">${escapeHtml(a.date ?? "")}</span></li>`).join("");

  return `
    <div style="font-family: 'Pretendard', sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="color: #003876; margin: 0 0 8px;">연세교육공학회 주간 다이제스트</h2>
      <p style="color: #666; margin: 0 0 24px;">이번 주 학회 활동을 한눈에 확인하세요.</p>

      <h3 style="color: #003876; border-left: 4px solid #003876; padding-left: 8px; margin: 24px 0 8px;">📅 다가오는 세미나</h3>
      <ul style="line-height: 1.9; padding-left: 20px;">${seminarHtml}</ul>

      <h3 style="color: #003876; border-left: 4px solid #003876; padding-left: 8px; margin: 24px 0 8px;">📝 최근 인기 게시글</h3>
      <ul style="line-height: 1.9; padding-left: 20px;">${postHtml}</ul>

      <h3 style="color: #003876; border-left: 4px solid #003876; padding-left: 8px; margin: 24px 0 8px;">🎯 다가오는 활동</h3>
      <ul style="line-height: 1.9; padding-left: 20px;">${actHtml}</ul>

      <p style="margin-top: 32px;"><a href="${base}/dashboard" style="display: inline-block; padding: 10px 20px; background: #003876; color: white; text-decoration: none; border-radius: 6px;">대시보드 가기</a></p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0 16px;" />
      <p style="color: #888; font-size: 12px;">
        본 메일은 매주 월요일 발송됩니다. 받지 않으시려면 <a href="${base}/mypage" style="color: #003876;">마이페이지 → 알림 설정</a> 에서 "주간 다이제스트"를 끄세요.
      </p>
      <p style="color: #888; font-size: 12px;">연세교육공학회 | yonsei.edtech@gmail.com</p>
    </div>
  `;
}

async function sendDigest(db: FirebaseFirestore.Firestore, weekKey: string): Promise<{ sent: number; recipients: number }> {
  const Resend = (await import("resend")).Resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: 0, recipients: 0 };

  const todayYmd = todayYmdKst();
  const [seminars, posts, activities] = await Promise.all([
    loadUpcomingSeminars(db, todayYmd),
    loadPopularPosts(db),
    loadUpcomingActivities(db, todayYmd),
  ]);

  // 콘텐츠 0건이면 발송 스킵 (무의미한 메일 방지)
  if (seminars.length === 0 && posts.length === 0 && activities.length === 0) {
    return { sent: 0, recipients: 0 };
  }

  // 회원 이메일 수집
  const usersSnap = await db.collection("users").where("approved", "==", true).get();
  const emails: string[] = [];
  for (const u of usersSnap.docs) {
    const d = u.data() as { email?: string; contactEmail?: string; notificationPrefs?: { weeklyDigest?: boolean } };
    if (d.notificationPrefs?.weeklyDigest === false) continue;
    const email = d.email || d.contactEmail;
    if (email) emails.push(email);
  }
  if (emails.length === 0) return { sent: 0, recipients: 0 };

  const resend = new Resend(key);
  const subject = `[연세교육공학회] 주간 다이제스트 (${weekKey})`;
  const html = buildHtml({ seminars, posts, activities });

  let sent = 0;
  for (let i = 0; i < emails.length; i += 50) {
    const batch = emails.slice(i, i + 50);
    try {
      await resend.emails.send({
        from: "연세교육공학회 <noreply@yonsei-edtech.vercel.app>",
        to: "noreply@yonsei-edtech.vercel.app",
        bcc: batch,
        subject,
        html,
      });
      sent += batch.length;
    } catch (e) {
      console.error("[email] weekly-digest send error:", e);
    }
  }

  await db.collection("email_logs").add({
    type: "weekly_digest",
    targetId: weekKey,
    recipientCount: sent,
    sentAt: new Date().toISOString(),
    sentBy: "system",
  });

  return { sent, recipients: emails.length };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const todayYmd = todayYmdKst();

    if (!isMondayKst()) {
      return Response.json({ ok: true, skipped: "not Monday KST", todayYmd });
    }

    // 중복 방지
    const dupSnap = await db
      .collection("email_logs")
      .where("type", "==", "weekly_digest")
      .where("targetId", "==", todayYmd)
      .limit(1)
      .get();
    if (!dupSnap.empty) {
      return Response.json({ ok: true, skipped: "already sent", todayYmd });
    }

    const result = await sendDigest(db, todayYmd);
    return Response.json({ ok: true, todayYmd, ...result });
  } catch (err) {
    console.error("[cron/weekly-digest]", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
