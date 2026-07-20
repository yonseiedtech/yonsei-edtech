import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { withCronLog } from "@/lib/cron-observability";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import {
  createNotificationAdmin,
  fanOutNotificationAdmin,
} from "@/lib/notifications-bridge";
import {
  partitionPending,
  AUTO_APPROVE_SETTINGS_KEY,
  isAutoApproveEnabled,
} from "@/lib/auth/approval-rules";
import type { User } from "@/types";

/**
 * 미처리 가입 신청 운영진 넛지 Cron (일 1회) — v9-H5 · R1(자동 승인 서버 이관, 2026-07-21)
 *
 * 1) 전역 자동 승인(site_settings.auto_approve_enabled, 기본 ON): 규칙 통과 자격자를
 *    서버에서 approved=true 처리(운영진 콘솔 접속과 무관). 승인 알림·감사로그 부수.
 * 2) 자동 승인 후에도 남은 미처리 가입 신청이 있으면 운영진(admin·sysadmin·president·staff)
 *    에게 인앱 알림을 1일 1회 발송한다.
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
  // 자동 승인 규칙 평가에 필요한 필드 (evaluateSignup)
  name?: string;
  email?: string;
  studentId?: string;
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

    let pendingUsers: UserDoc[] = pendingSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<UserDoc, "id">) }))
      .filter((u) => !u.rejected); // 거절 제외

    // 승인 회원 (자동 승인 중복 검사 + 운영진 조회에 공용 재사용)
    const allUsersSnap = await db
      .collection("users")
      .where("approved", "==", true)
      .get();
    const approvedUsers: UserDoc[] = allUsersSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<UserDoc, "id">),
    }));

    // ── R1: 전역 자동 승인 (서버 이관, 2026-07-21) ──────────────────────────
    // 기존에는 AdminMemberTab 클라이언트 useEffect 가 운영진이 콘솔을 열 때만 자동 승인을
    // 실행했다. 이를 서버 cron(일 1회)으로 이관해 운영진 접속과 무관하게 자격자를 승인한다.
    // 전역 토글은 site_settings(auto_approve_enabled) — 문서 부재/미설정 시 기본 ON.
    let autoApproved = 0;
    const settingSnap = await db
      .collection("site_settings")
      .where("key", "==", AUTO_APPROVE_SETTINGS_KEY)
      .limit(1)
      .get();
    const autoEnabled = isAutoApproveEnabled(
      settingSnap.empty ? undefined : (settingSnap.docs[0].data().value as string),
    );

    if (autoEnabled && pendingUsers.length > 0) {
      const { qualifying } = partitionPending(
        pendingUsers as unknown as User[],
        approvedUsers as unknown as User[],
      );
      const approvedIds = new Set<string>();
      for (const u of qualifying) {
        try {
          await db
            .collection("users")
            .doc(u.id)
            .update({ approved: true, autoApprovedAt: FieldValue.serverTimestamp() });
          await createNotificationAdmin({
            userId: u.id,
            type: "member_approved",
            title: "가입이 승인되었습니다 🎉",
            body: `${u.name ?? ""}님, 연세교육공학회 회원 가입이 승인되었습니다.`,
            relatedLink: "/dashboard",
          });
          try {
            await db.collection("audit_logs").add({
              adminUid: "system:cron-auto-approve",
              targetUid: u.id,
              targetName: u.name ?? "",
              action: "auto_approve_cron",
              at: FieldValue.serverTimestamp(),
            });
          } catch {
            /* 감사 로그 실패해도 승인은 진행 */
          }
          approvedIds.add(u.id);
          autoApproved++;
        } catch (e) {
          console.error(`[pending-signup-nudge] auto-approve error userId=${u.id}`, e);
        }
      }
      // 자동 승인된 회원은 잔여 미처리(넛지 대상)에서 제외
      pendingUsers = pendingUsers.filter((u) => !approvedIds.has(u.id));
    }

    if (pendingUsers.length === 0) {
      return Response.json({
        ok: true,
        pending: 0,
        autoApproved,
        sent: 0,
        reason: autoApproved > 0 ? "all-auto-approved" : "no-pending",
      });
    }

    // 3일 초과 미처리 건수
    const staleCount = pendingUsers.filter(
      (u) => daysAgo(u.createdAt) >= STALE_DAYS,
    ).length;

    // ── 2. 운영진 조회 (승인 회원 재사용) ────────────────────────────────────
    const adminUsers: UserDoc[] = approvedUsers
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
      autoApproved,
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
