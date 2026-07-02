import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";

/**
 * 모임·행사(네트워킹) 리마인더 Cron — Phase 2 트랙 통합 (매일 09:00 KST)
 *
 * 1) 행사 D-1·당일: attending RSVP 회원에게 인앱 알림
 * 2) RSVP 마감(rsvpDeadline) D-1: undecided RSVP 회원에게 응답 독려 알림
 *
 * 세미나 리마인더와 동일한 사용자 단위 중복 가드(notifications 조회) 사용.
 * poll 미확정(startAt 빈 값)·비공개·취소 행사는 건너뜀.
 */
export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const today = kstNow.toISOString().split("T")[0];
    const tomorrow = addDays(kstNow, 1);

    const yesterday = addDays(kstNow, -1);

    // upcoming(리마인더) + closed/done(D+1 후기 요청) 모두 필요 — 상태 3종 조회
    const eventsSnap = await db
      .collection("networking_events")
      .where("status", "in", ["upcoming", "closed", "done"])
      .get();

    let notifCount = 0;

    for (const doc of eventsSnap.docs) {
      const ev = doc.data() as {
        title?: string;
        startAt?: string;
        rsvpDeadline?: string;
        published?: boolean;
        location?: string;
      };
      if (!ev.title || ev.published === false) continue;

      // RSVP 목록 (회원만 — 게스트는 userId 없음)
      const rsvpSnap = await db
        .collection("networking_rsvps")
        .where("eventId", "==", doc.id)
        .get();
      const rsvps = rsvpSnap.docs
        .map((d) => d.data() as { userId?: string; status?: string })
        .filter((r) => r.userId);

      // ── 1) 행사 D-1 / 당일 → attending 회원 ────────────────────────────
      const eventDate = ev.startAt ? ev.startAt.slice(0, 10) : "";
      let daysLeft: number | null = null;
      if (eventDate === today) daysLeft = 0;
      else if (eventDate === tomorrow) daysLeft = 1;

      if (daysLeft !== null) {
        const targets = rsvps.filter((r) => r.status === "attending").map((r) => r.userId as string);
        notifCount += await notifyOnce(db, {
          userIds: targets,
          dedupeTitle: `모임·행사 D-${daysLeft} 리마인더`,
          link: "/gatherings",
          message:
            daysLeft === 0
              ? `오늘 "${ev.title}" 모임이 진행됩니다.${ev.location ? ` 장소: ${ev.location}` : ""}`
              : `내일 "${ev.title}" 모임이 진행됩니다.${ev.location ? ` 장소: ${ev.location}` : ""}`,
          eventId: doc.id,
        });

        // 행사 당일: attending 회원에게 학습 잔디 가산점 멱등 적립 (deterministic doc id)
        if (daysLeft === 0 && targets.length > 0) {
          const batch = db.batch();
          const nowIso = new Date().toISOString();
          for (const userId of targets) {
            const ref = db.collection("streak_events").doc(`${userId}__networking-attend__${doc.id}`);
            batch.set(ref, {
              userId,
              type: "networking-attend",
              refId: doc.id,
              points: 5,
              ymd: eventDate,
              occurredAt: nowIso,
              createdAt: nowIso,
            }, { merge: true });
          }
          await batch.commit();
        }
      }

      // ── 3) 행사 D+1 → attending 회원 후기 요청 (Phase 2-D) ──────────────
      if (eventDate === yesterday) {
        const targets = rsvps.filter((r) => r.status === "attending").map((r) => r.userId as string);
        notifCount += await notifyOnce(db, {
          userIds: targets,
          dedupeTitle: "모임 후기를 남겨주세요",
          link: "/gatherings#past-gatherings",
          message: `어제 "${ev.title}" 모임은 어떠셨나요? 별점과 한줄 후기가 다음 행사 준비에 큰 도움이 됩니다.`,
          eventId: doc.id,
        });
      }

      // ── 2) RSVP 마감 D-1 → undecided 회원 응답 독려 ─────────────────────
      const deadlineDate = ev.rsvpDeadline ? ev.rsvpDeadline.slice(0, 10) : "";
      if (deadlineDate === tomorrow) {
        const targets = rsvps.filter((r) => r.status === "undecided").map((r) => r.userId as string);
        notifCount += await notifyOnce(db, {
          userIds: targets,
          dedupeTitle: "모임 참석 응답 마감 임박",
          link: "/gatherings",
          message: `"${ev.title}" 참석 응답이 내일 마감됩니다. 참석 여부를 알려주세요.`,
          eventId: doc.id,
        });
      }
    }

    return Response.json({ ok: true, date: today, notifCount });
  } catch (err) {
    console.error("[cron/networking-reminder]", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

/** 사용자 단위 중복 가드 후 인앱 알림 일괄 생성. 생성 건수 반환. */
async function notifyOnce(
  db: FirebaseFirestore.Firestore,
  opts: { userIds: string[]; dedupeTitle: string; link: string; message: string; eventId: string },
): Promise<number> {
  if (opts.userIds.length === 0) return 0;

  const existing = await db
    .collection("notifications")
    .where("type", "==", "networking_reminder")
    .where("title", "==", opts.dedupeTitle)
    .where("link", "==", opts.link)
    .get();
  // 같은 행사에 대한 기존 수신자 (message 에 eventId 가 없으므로 refId 필드로 구분)
  const sent = new Set(
    existing.docs
      .filter((d) => (d.data() as { refId?: string }).refId === opts.eventId)
      .map((d) => (d.data() as { userId?: string }).userId),
  );
  const fresh = opts.userIds.filter((u) => !sent.has(u));
  if (fresh.length === 0) return 0;

  const batch = db.batch();
  for (const userId of fresh) {
    const ref = db.collection("notifications").doc();
    batch.set(ref, {
      userId,
      type: "networking_reminder",
      title: opts.dedupeTitle,
      message: opts.message,
      link: opts.link,
      refId: opts.eventId,
      read: false,
      createdAt: new Date().toISOString(),
    });
  }
  await batch.commit();
  return fresh.length;
}

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}
