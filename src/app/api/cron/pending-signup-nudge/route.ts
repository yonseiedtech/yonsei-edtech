import { NextRequest } from "next/server";
import { withCronLog } from "@/lib/cron-observability";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import { fanOutNotificationAdmin } from "@/lib/notifications-bridge";

/**
 * 미처리 가입 신청 운영진 넛지 Cron (일 1회) — v9-H5
 *
 * 승인 대기 중인 가입 신청이 있을 때 운영진(admin·sysadmin·president·staff)에게
 * 인앱 알림을 1일 1회 발송한다.
 *
 * 스팸 방지:
 *  - 일 1회: push_logs/{pending_signup_nudge_{adminId}_{dateKey}} 중복 방지
 *  - 대기 신청 0건이면 스킵
 *  - 거절(rejected=true) 제외, 미승인(approved=false)만 집계
 *  - STALE_DAYS(3일) 초과 건수를 별도 집계해 긴박도 명시
 */

const STALE_DAYS = 3;
const ADMIN_ROLES = new Set(["admin", "sysadmin", "president", "staff"]);
const MAX_ADMINS = 20;

type UserDoc = {
  id: string;
  approved?: boolean;
  rejected?: boolean;
  createdAt?: string | null;
  role?: string;
};

/** UTC 날짜 키 (YYYY-MM-DD) — 일별 dedup 앵커 */
function todayKeyUTC(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** ISO 문자열에서 경과 일수 계산 */
function daysAgo(iso: string | null | undefined): number {
  if (!iso) return 0;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

async function _handler(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const dateKey = todayKeyUTC();

    // ── 1. 미승인 가입 신청 집계 ─────────────────────────────────────────────
    const pendingSnap = await db
      .collection("users")
      .where("approved", "==", false)
      .get();

    const pendingUsers: UserDoc[] = pendingSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<UserDoc, "id">) }))
      .filter((u) => !u.rejected); // 거절 제외

    if (pendingUsers.length === 0) {
      return Response.json({ ok: true, pending: 0, sent: 0, reason: "no-pending" });
    }

    // 3일 초과 미처리 건수
    const staleCount = pendingUsers.filter(
      (u) => daysAgo(u.createdAt) >= STALE_DAYS,
    ).length;

    // ── 2. 운영진 조회 ────────────────────────────────────────────────────────
    const allUsersSnap = await db
      .collection("users")
      .where("approved", "==", true)
      .get();

    const adminUsers: UserDoc[] = allUsersSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<UserDoc, "id">) }))
      .filter((u) => u.role && ADMIN_ROLES.has(u.role))
      .slice(0, MAX_ADMINS);

    if (adminUsers.length === 0) {
      return Response.json({
        ok: true,
        pending: pendingUsers.length,
        sent: 0,
        reason: "no-admin",
      });
    }

    // ── 3. dedup — 오늘 이미 발송된 운영진 제외 ──────────────────────────────
    const toNotify: UserDoc[] = [];
    for (const admin of adminUsers) {
      const dupId = `pending_signup_nudge_${admin.id}_${dateKey}`;
      const dupSnap = await db.collection("push_logs").doc(dupId).get();
      if (!dupSnap.exists) toNotify.push(admin);
    }

    if (toNotify.length === 0) {
      return Response.json({
        ok: true,
        pending: pendingUsers.length,
        sent: 0,
        reason: "all-deduped",
      });
    }

    // ── 4. 알림 내용 구성 ──────────────────────────────────────────────────────
    const totalLabel = `${pendingUsers.length}건`;
    const staleLabel = staleCount > 0 ? ` (${STALE_DAYS}일 초과 ${staleCount}건)` : "";
    const body = `가입 신청 ${totalLabel}${staleLabel}이 처리 대기 중입니다. 회원 관리에서 승인해주세요.`;

    const adminIds = toNotify.map((u) => u.id);
    await fanOutNotificationAdmin(adminIds, {
      type: "pending_signup_nudge",
      title: `미처리 가입 신청 ${totalLabel}`,
      body,
      relatedLink: "/console/members",
      metadata: { pending: pendingUsers.length, stale: staleCount, dateKey },
    });

    // ── 5. 발송 기록 (push_logs dedup 앵커) ──────────────────────────────────
    const now = new Date().toISOString();
    for (const admin of toNotify) {
      try {
        await db
          .collection("push_logs")
          .doc(`pending_signup_nudge_${admin.id}_${dateKey}`)
          .set({
            kind: "pending_signup_nudge",
            userId: admin.id,
            dateKey,
            pending: pendingUsers.length,
            stale: staleCount,
            sentAt: now,
          });
      } catch (e) {
        console.error(`[pending-signup-nudge] push_logs error adminId=${admin.id}`, e);
      }
    }

    return Response.json({
      ok: true,
      dateKey,
      pending: pendingUsers.length,
      stale: staleCount,
      admins: adminUsers.length,
      sent: toNotify.length,
    });
  } catch (err) {
    console.error("[cron/pending-signup-nudge]", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

export const GET = withCronLog("pending-signup-nudge", _handler);
