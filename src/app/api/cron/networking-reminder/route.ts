import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import { buildCandidateSlots, tallyAvailability, bestSlots, resolveSlotStartAt } from "@/features/networking/networking-utils";
import type { NetworkingAvailability } from "@/types";

/**
 * 모임·행사(네트워킹) 리마인더 Cron — Phase 2 트랙 통합 (매일 09:00 KST)
 *
 * 1) 행사 D-1·당일: attending RSVP 회원에게 인앱 알림
 * 2) RSVP 마감(rsvpDeadline) D-1: undecided RSVP 회원에게 응답 독려 알림
 * 4) 일정 투표(poll) 마감 D-1: 미투표 회원에게 넛지 (H1, 사이클 124 후속)
 * 5) 일정 투표 마감 후 auto 모드: bestSlots 1위로 자동 확정 + 참석대상 알림 (H1)
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
    // 투표 마감 리마인더 대상(approved 회원)은 poll 이벤트가 실제 있을 때만 지연 조회
    let approvedUserIds: string[] | null = null;

    for (const doc of eventsSnap.docs) {
      const ev = doc.data() as {
        title?: string;
        startAt?: string;
        rsvpDeadline?: string;
        published?: boolean;
        location?: string;
        schedulingMode?: "fixed" | "poll";
        pollDeadline?: string;
        pollDecisionMode?: "manual" | "auto";
        pollPeriodStart?: string;
        pollPeriodEnd?: string;
        pollTimeSlots?: string[];
        pollReminderSentAt?: string;
        visibility?: "public" | "private";
        shareToken?: string;
      };
      if (!ev.title || ev.published === false) continue;

      // codex 리뷰(2026-07-08): 비공개 모임은 공개 목록(/gatherings)에 노출되지 않으므로 그 링크로
      // 알림을 보내면 수신자가 못 찾는다. 공유 토큰 링크로 보내고, 토큰이 없으면 발송 자체를 스킵.
      // High-1 보안 핫픽스 트랙 정합(2026-07-08): shareToken 은 이벤트 문서에서 제거되고
      // networking_event_tokens/{token}(eventId 필드) 컬렉션으로 이관된다. cron 은 admin SDK 라
      // rules 제약 없이 (a) 레거시 ev.shareToken → (b) 토큰 매핑 역조회 → (c) 스킵 순서로 링크를 구한다.
      let gatheringsLink: string | null = null;
      if (ev.visibility === "private") {
        if (ev.shareToken) {
          gatheringsLink = `/gatherings/p/${ev.shareToken}`;
        } else {
          const tokenSnap = await db
            .collection("networking_event_tokens")
            .where("eventId", "==", doc.id)
            .limit(1)
            .get();
          gatheringsLink = tokenSnap.empty ? null : `/gatherings/p/${tokenSnap.docs[0].id}`;
        }
      } else {
        gatheringsLink = "/gatherings";
      }

      // RSVP 목록 (회원만 — 게스트는 userId 없음)
      const rsvpSnap = await db
        .collection("networking_rsvps")
        .where("eventId", "==", doc.id)
        .get();
      const rsvps = rsvpSnap.docs
        .map((d) => d.data() as { userId?: string; status?: string })
        .filter((r) => r.userId);

      // ── 1) 행사 D-1 / 당일 → attending 회원 ────────────────────────────
      // UTC ISO → KST 날짜 (slice 는 오전 행사에 하루 오차)
      const eventDate = ev.startAt
        ? new Date(new Date(ev.startAt).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
        : "";
      let daysLeft: number | null = null;
      if (eventDate === today) daysLeft = 0;
      else if (eventDate === tomorrow) daysLeft = 1;

      if (daysLeft !== null) {
        const targets = rsvps.filter((r) => r.status === "attending").map((r) => r.userId as string);
        if (gatheringsLink) {
          notifCount += await notifyOnce(db, {
            userIds: targets,
            dedupeTitle: `모임·행사 D-${daysLeft} 리마인더`,
            link: gatheringsLink,
            message:
              daysLeft === 0
                ? `오늘 "${ev.title}" 모임이 진행됩니다.${ev.location ? ` 장소: ${ev.location}` : ""}`
                : `내일 "${ev.title}" 모임이 진행됩니다.${ev.location ? ` 장소: ${ev.location}` : ""}`,
            eventId: doc.id,
          });
        }

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
      if (eventDate === yesterday && gatheringsLink) {
        const targets = rsvps.filter((r) => r.status === "attending").map((r) => r.userId as string);
        // #past-gatherings 앵커는 공개 목록 페이지 전용 — 비공개(공유 토큰) 페이지엔 없음
        const reviewLink = ev.visibility === "private" ? gatheringsLink : `${gatheringsLink}#past-gatherings`;
        notifCount += await notifyOnce(db, {
          userIds: targets,
          dedupeTitle: "모임 후기를 남겨주세요",
          link: reviewLink,
          message: `어제 "${ev.title}" 모임은 어떠셨나요? 별점과 한줄 후기가 다음 행사 준비에 큰 도움이 됩니다.`,
          eventId: doc.id,
        });
      }

      // ── 2) RSVP 마감 D-1 → undecided 회원 응답 독려 ─────────────────────
      const deadlineDate = ev.rsvpDeadline
        ? new Date(new Date(ev.rsvpDeadline).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
        : "";
      if (deadlineDate === tomorrow && gatheringsLink) {
        const targets = rsvps.filter((r) => r.status === "undecided").map((r) => r.userId as string);
        notifCount += await notifyOnce(db, {
          userIds: targets,
          dedupeTitle: "모임 참석 응답 마감 임박",
          link: gatheringsLink,
          message: `"${ev.title}" 참석 응답이 내일 마감됩니다. 참석 여부를 알려주세요.`,
          eventId: doc.id,
        });
      }

      // ── 4·5) 일정 투표(poll) 마감 D-1 리마인더 / 마감 후 auto 자동 확정 (H1) ──
      if (ev.schedulingMode === "poll" && ev.pollDeadline) {
        const deadlineMs = new Date(ev.pollDeadline).getTime();
        const nowMs = Date.now();

        // 4) 마감 24시간 이내 & 이벤트당 1회(pollReminderSentAt 마커) → 미투표 회원 넛지
        // gatheringsLink 없음(비공개+토큰 미설정)이면 실제 발송이 불가하므로 마커도 남기지 않는다
        if (gatheringsLink && !ev.pollReminderSentAt && deadlineMs > nowMs && deadlineMs - nowMs <= 24 * 60 * 60 * 1000) {
          const availSnap = await db
            .collection("networking_availability")
            .where("eventId", "==", doc.id)
            .get();
          const votedIds = new Set(
            availSnap.docs.map((d) => (d.data() as { userId?: string }).userId).filter((v): v is string => !!v),
          );
          if (approvedUserIds === null) {
            const usersSnap = await db.collection("users").where("approved", "==", true).get();
            approvedUserIds = usersSnap.docs.map((d) => d.id);
          }
          const nudgeTargets = approvedUserIds.filter((uid) => !votedIds.has(uid));
          notifCount += await notifyOnce(db, {
            userIds: nudgeTargets,
            dedupeTitle: "일정 투표 마감 임박",
            link: gatheringsLink,
            message: `"${ev.title}" 일정 투표가 24시간 내 마감됩니다. 아직 투표하지 않으셨다면 가능한 날짜를 선택해 주세요.`,
            eventId: doc.id,
          });
          await doc.ref.update({ pollReminderSentAt: new Date().toISOString() });
        }

        // 5) 마감 경과 & auto 모드 → bestSlots 1위로 자동 확정 (schedulingMode "fixed" 전환 후에는
        //    이 분기 조건 자체가 더 이상 성립하지 않으므로 별도 가드 없이 멱등)
        if (deadlineMs <= nowMs && ev.pollDecisionMode === "auto") {
          const availSnap = await db
            .collection("networking_availability")
            .where("eventId", "==", doc.id)
            .get();
          const responses = availSnap.docs.map((d) => d.data() as NetworkingAvailability);
          const candidateSlots = buildCandidateSlots(
            ev.pollPeriodStart ?? "",
            ev.pollPeriodEnd ?? "",
            ev.pollTimeSlots,
          );
          const best = bestSlots(tallyAvailability(responses, candidateSlots));

          if (best.length > 0) {
            // "HH:MM" 형식이 아닌 자유 텍스트 시간대는 18:00 기본값으로 안전 폴백 (운영진 수동 확정과 동일 유틸)
            const startAt = resolveSlotStartAt(best[0].slot);
            const nowIso = new Date().toISOString();
            await doc.ref.update({ startAt, schedulingMode: "fixed", updatedAt: nowIso });

            // 확정 알림은 공유 링크가 있을 때만 발송 (일정 확정 자체는 링크 유무와 무관하게 진행)
            if (gatheringsLink) {
              const attendTargets = rsvps.filter((r) => r.status === "attending").map((r) => r.userId as string);
              const voterIds = responses.map((r) => r.userId).filter((v): v is string => !!v);
              const confirmTargets = Array.from(new Set([...attendTargets, ...voterIds]));
              notifCount += await notifyOnce(db, {
                userIds: confirmTargets,
                dedupeTitle: "일정이 확정되었습니다",
                link: gatheringsLink,
                message: `"${ev.title}" 일정이 확정되었습니다. 자세한 일정을 확인해 주세요.`,
                eventId: doc.id,
              });
            }
          }
        }
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
