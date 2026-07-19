import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import { sendPushToUsers } from "@/lib/push-admin";
import { cohortKeyOf } from "@/lib/semester";

/**
 * 개강 리마인더 Cron (매일 09:00 KST) — 방학 이탈 회원 회수 안전망.
 *
 * 관례 개강일(1학기 3/1, 2학기 9/1) 기준 D-7·D-1 에 승인 회원 전원에게 인앱 알림.
 * 학기 키(YYYY-N) + D-값을 refId 로 사용자 단위 중복 가드.
 */
export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const today = kstNow.toISOString().split("T")[0];
    const y = kstNow.getUTCFullYear();

    // 올해와 이듬해의 개강일 후보 (연말 12월에 이듬해 3/1 D-x 대응)
    const starts: { date: string; label: string; semKey: string }[] = [
      { date: `${y}-03-01`, label: `${y}년 1학기`, semKey: `${y}-1` },
      { date: `${y}-09-01`, label: `${y}년 2학기`, semKey: `${y}-2` },
      { date: `${y + 1}-03-01`, label: `${y + 1}년 1학기`, semKey: `${y + 1}-1` },
    ];

    // P2(2026-07-04): 운영진이 등록한 학사일정(academic_calendar)의 실제 개강일을 우선 사용
    // — 관례일(3/1·9/1) 하드코딩과 실제 개강일 불일치로 안내 날짜가 어긋나던 문제
    try {
      const calSnap = await getAdminDb().collection("academic_calendar").limit(20).get();
      for (const doc of calSnap.docs) {
        const c = doc.data() as { year?: number; semester?: string; semesterStart?: string };
        if (!c.year || !c.semester || !c.semesterStart) continue;
        const semKey = `${c.year}-${c.semester === "first" ? "1" : "2"}`;
        const idx = starts.findIndex((st) => st.semKey === semKey);
        if (idx >= 0) starts[idx] = { ...starts[idx], date: c.semesterStart };
      }
    } catch {
      // 학사일정 조회 실패는 관례일 폴백으로 진행
    }

    // P2: 정확 일치(7·1)만 트리거하면 cron 1회 실패 시 그 학기 리마인더가 영구 미발송 —
    // D-7~D-1 범위에서 가장 가까운 미발송 버킷(d7/d1)으로 보정. refId 가드가 중복을 막는다.
    const target = starts
      .map((s) => ({ ...s, daysLeft: diffDays(today, s.date) }))
      .map((s) =>
        s.daysLeft >= 2 && s.daysLeft <= 7
          ? { ...s, daysLeft: 7 }
          : s.daysLeft === 1
            ? s
            : { ...s, daysLeft: -1 },
      )
      .find((s) => s.daysLeft === 7 || s.daysLeft === 1);

    if (!target) {
      return Response.json({ ok: true, date: today, notifCount: 0, reason: "not D-7/D-1" });
    }

    const db = getAdminDb();
    const refId = `${target.semKey}_d${target.daysLeft}`;

    // 중복 가드 — 같은 학기·같은 D-값으로 이미 발송된 수신자 제외
    const existing = await db
      .collection("notifications")
      .where("type", "==", "class_reminder")
      .where("refId", "==", refId)
      .get();
    const sent = new Set(existing.docs.map((d) => (d.data() as { userId?: string }).userId));

    const usersSnap = await db.collection("users").where("approved", "==", true).get();
    const targets = usersSnap.docs.map((d) => d.id).filter((id) => !sent.has(id));

    const nowIso = new Date().toISOString();
    let notifCount = 0;
    // Firestore 배치 500 제한 — 400 단위 커밋
    for (let i = 0; i < targets.length; i += 400) {
      const batch = db.batch();
      for (const userId of targets.slice(i, i + 400)) {
        const ref = db.collection("notifications").doc();
        batch.set(ref, {
          userId,
          type: "class_reminder",
          title: `${target.label} 개강 D-${target.daysLeft}`,
          message:
            target.daysLeft === 7
              ? `${target.label}가 일주일 뒤 시작됩니다. 수강 과목과 시간표를 미리 확인해 보세요.`
              : `내일 ${target.label}가 시작됩니다. 시간표를 확인하세요.`,
          link: "/courses?tab=mine",
          refId,
          read: false,
          createdAt: nowIso,
        });
        notifCount++;
      }
      await batch.commit();
    }

    // 리텐션(2026-07-04): "방학 이탈 회수 안전망"이 인앱 전용이면 정작 이탈자는 못 본다 — 웹푸시 병행
    let pushResult: unknown = null;
    if (targets.length > 0) {
      try {
        pushResult = await sendPushToUsers(targets, {
          title: `${target.label} 개강 D-${target.daysLeft}`,
          body:
            target.daysLeft === 7
              ? "일주일 뒤 개강입니다 — 수강 과목과 시간표를 미리 확인해 보세요."
              : "내일 개강입니다 — 시간표를 확인하세요.",
          link: "/courses?tab=mine",
        });
      } catch (e) {
        console.error("[semester-start-reminder] push failed", e);
      }
    }

    // ── 신입(현재 학기 코호트) 온보딩 리마인드 분기 (M1) ──
    // 이번 학기 입학 신입에게만 온보딩 정착을 별도 안내. 기존 알림 패턴 재사용(신규 cron 없음),
    // type/refId 를 분리해 개강 리마인더(class_reminder)와 중복 가드를 독립적으로 유지.
    let onboardingNotifCount = 0;
    try {
      const onboardRefId = `${target.semKey}_onboarding_d${target.daysLeft}`;
      const existingOnboard = await db
        .collection("notifications")
        .where("type", "==", "onboarding_reminder")
        .where("refId", "==", onboardRefId)
        .get();
      const onboardSent = new Set(
        existingOnboard.docs.map((d) => (d.data() as { userId?: string }).userId),
      );
      // usersSnap(승인 회원) 재사용 — 신입 = cohortKeyOf(회원) === 이번 학기 키
      const newcomerIds = usersSnap.docs
        .filter((d) => {
          const u = d.data() as {
            enrollmentYear?: number;
            enrollmentHalf?: number;
            createdAt?: string;
          };
          return cohortKeyOf(u) === target.semKey;
        })
        .map((d) => d.id)
        .filter((id) => !onboardSent.has(id));

      for (let i = 0; i < newcomerIds.length; i += 400) {
        const batch = db.batch();
        for (const userId of newcomerIds.slice(i, i + 400)) {
          const ref = db.collection("notifications").doc();
          batch.set(ref, {
            userId,
            type: "onboarding_reminder",
            title: `${target.label} 신입 온보딩`,
            message:
              target.daysLeft === 7
                ? `${target.label} 개강이 일주일 앞으로 다가왔어요. 신입 온보딩 체크리스트로 학회 활동을 준비해 보세요.`
                : `내일 ${target.label}가 시작됩니다. 신입 온보딩 체크리스트로 첫 걸음을 확인해 보세요.`,
            link: "/steppingstone/onboarding",
            refId: onboardRefId,
            read: false,
            createdAt: nowIso,
          });
          onboardingNotifCount++;
        }
        await batch.commit();
      }

      if (newcomerIds.length > 0) {
        try {
          await sendPushToUsers(newcomerIds, {
            title: `${target.label} 신입 온보딩`,
            body: "신입 온보딩 체크리스트로 학회 첫 걸음을 준비해 보세요.",
            link: "/steppingstone/onboarding",
          });
        } catch (e) {
          console.error("[semester-start-reminder] onboarding push failed", e);
        }
      }
    } catch (e) {
      console.error("[semester-start-reminder] onboarding branch failed", e);
    }

    return Response.json({ ok: true, date: today, semester: target.semKey, daysLeft: target.daysLeft, notifCount, onboardingNotifCount, pushResult });
  } catch (err) {
    console.error("[cron/semester-start-reminder]", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

/** to - from 일수 (YYYY-MM-DD) */
function diffDays(fromYmd: string, toYmd: string): number {
  const [fy, fm, fd] = fromYmd.split("-").map(Number);
  const [ty, tm, td] = toYmd.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
}
