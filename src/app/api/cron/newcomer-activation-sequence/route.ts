import { NextRequest } from "next/server";
import { withCronLog } from "@/lib/cron-observability";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import { sendPushToUsers } from "@/lib/push-admin";
import { fanOutNotificationAdmin } from "@/lib/notifications-bridge";
import { cohortKeyOf, currentSemesterKey } from "@/lib/semester";
import { todayYmdKst, isoToKstYmd } from "@/lib/dday";

/**
 * 신입 첫 2주 자동 활성화 시퀀스 Cron (매일 09:00 KST) — v7-M2
 *
 * 현재 학기 코호트(cohortKeyOf === currentSemesterKey) 신입의 가입일(createdAt) 기준
 * D+1 / D+3 / D+7 / D+10 / D+14 에 맞춤 넛지 1회 발송.
 *
 * 단계별 스킵 조건 (퍼널 데이터 소비 — 이미 완료한 신입은 건너뜀):
 *  - D+1:  user.bio && researchInterests.length >= 1 (프로필 완성)
 *  - D+3:  guide_progress.completedItems 1건+ (온보딩 시작)
 *  - D+7:  user_activity_logs 에 funnelType=diagnostic path=ui:diagnostic/complete (진단 완료)
 *  - D+10: archive_favorites 1건+ (아카이브 즐겨찾기)
 *  - D+14: 스킵 없음 (항상 발송 — 첫 2주 회고)
 *
 * 중복 방지: push_logs/{newcomer_seq_{userId}_{step}} — 단계당 1회 보장.
 * 알림 채널: 인앱 notifications (항상) + 웹푸시 sendPushToUsers (fire-and-forget).
 */

// ── 단계별 설정 ──────────────────────────────────────────────────────────────
const STEPS = [
  {
    step: "d1" as const,
    dayOffset: 1,
    title: "환영합니다! 첫 걸음을 내딛어 볼까요?",
    body: "프로필에 자기소개와 관심 연구 키워드를 등록하면 맞춤 추천을 받을 수 있어요.",
    link: "/mypage/edit",
  },
  {
    step: "d3" as const,
    dayOffset: 3,
    title: "온보딩 체크리스트를 아직 시작하지 않으셨나요?",
    body: "신입생 온보딩 가이드로 학회 활동을 단계별로 준비해 보세요.",
    link: "/steppingstone/onboarding",
  },
  {
    step: "d7" as const,
    dayOffset: 7,
    title: "내 연구 준비도를 확인해 보세요",
    body: "5분 진단으로 연구 준비도와 약점 아카이브를 한 번에 확인할 수 있어요.",
    link: "/diagnosis",
  },
  {
    step: "d10" as const,
    dayOffset: 10,
    title: "교육공학 아카이브를 둘러보셨나요?",
    body: "아카이브에서 개념·이론·용어사전을 탐색하고 즐겨찾기로 저장해 보세요.",
    link: "/archive",
  },
  {
    step: "d14" as const,
    dayOffset: 14,
    title: "학회와 함께한 첫 2주, 어떠셨나요?",
    body: "온보딩 진행 상황을 확인하고, 동기·선배들과 인사를 나눠 보세요.",
    link: "/steppingstone/onboarding",
  },
] as const;

// ── 타입 ─────────────────────────────────────────────────────────────────────
type StepKey = (typeof STEPS)[number]["step"];

interface StepResult {
  targets: number;
  dup: number;
  skipped: number;
  sent: number;
}

type UserDoc = {
  id: string;
  createdAt?: string | null;
  approved?: boolean;
  enrollmentYear?: number | null;
  enrollmentHalf?: number | null;
  bio?: string | null;
  researchInterests?: unknown[] | null;
  interestKeywords?: unknown[] | null;
};

// ── 핸들러 ───────────────────────────────────────────────────────────────────
async function _handler(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const todayYmd = todayYmdKst();
    const semKey = currentSemesterKey();

    // 승인 회원 전체 조회 → 현재 학기 코호트 필터 (클라이언트 계산, 수십 명 규모)
    const usersSnap = await db.collection("users").where("approved", "==", true).get();
    const newcomers: UserDoc[] = usersSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<UserDoc, "id">) }))
      .filter((u) => cohortKeyOf(u) === semKey);

    if (newcomers.length === 0) {
      return Response.json({
        ok: true,
        todayYmd,
        semKey,
        newcomers: 0,
        steps: {},
      });
    }

    const stepResults: Record<StepKey, StepResult> = {
      d1: { targets: 0, dup: 0, skipped: 0, sent: 0 },
      d3: { targets: 0, dup: 0, skipped: 0, sent: 0 },
      d7: { targets: 0, dup: 0, skipped: 0, sent: 0 },
      d10: { targets: 0, dup: 0, skipped: 0, sent: 0 },
      d14: { targets: 0, dup: 0, skipped: 0, sent: 0 },
    };

    for (const stepDef of STEPS) {
      const { step, dayOffset, title, body, link } = stepDef;
      const res = stepResults[step];

      // 오늘 D+{dayOffset}에 해당하는 신입만 추출
      const dayTargets = newcomers.filter((u) => {
        if (!u.createdAt) return false;
        const joinedYmd = isoToKstYmd(u.createdAt);
        return diffYmd(joinedYmd, todayYmd) === dayOffset;
      });
      res.targets = dayTargets.length;
      if (dayTargets.length === 0) continue;

      // 중복 방지: push_logs 확인 (단계당 1회 보장)
      const afterDupCheck: UserDoc[] = [];
      for (const u of dayTargets) {
        const dupId = `newcomer_seq_${u.id}_${step}`;
        const dupSnap = await db.collection("push_logs").doc(dupId).get();
        if (dupSnap.exists) {
          res.dup++;
        } else {
          afterDupCheck.push(u);
        }
      }
      if (afterDupCheck.length === 0) continue;

      // 스킵 조건 체크 (퍼널 데이터 소비)
      const skipSet = new Set<string>();
      await applySkipCondition(db, step, afterDupCheck, skipSet);

      const finalTargets = afterDupCheck.filter((u) => !skipSet.has(u.id));
      res.skipped = afterDupCheck.length - finalTargets.length;
      if (finalTargets.length === 0) continue;

      const finalIds = finalTargets.map((u) => u.id);

      // 인앱 알림 fan-out (항상)
      await fanOutNotificationAdmin(finalIds, {
        type: "newcomer_sequence",
        title,
        body,
        relatedLink: link,
        metadata: { sequenceStep: step, semKey },
      });

      // 웹푸시 (fire-and-forget — 실패해도 인앱 알림은 이미 적재됨)
      try {
        await sendPushToUsers(finalIds, {
          title,
          body,
          link,
          tag: `newcomer-seq-${step}`,
        });
      } catch (e) {
        console.error(`[newcomer-activation-sequence] push error step=${step}`, e);
      }

      // 발송 기록 (push_logs, 개별 write — 중복 방지 앵커)
      for (const u of finalTargets) {
        try {
          await db.collection("push_logs").doc(`newcomer_seq_${u.id}_${step}`).set({
            kind: "newcomer_sequence",
            userId: u.id,
            step,
            semKey,
            sentAt: new Date().toISOString(),
          });
          res.sent++;
        } catch (e) {
          console.error(`[newcomer-activation-sequence] push_logs write error user=${u.id}`, e);
        }
      }
    }

    return Response.json({
      ok: true,
      todayYmd,
      semKey,
      newcomers: newcomers.length,
      steps: stepResults,
    });
  } catch (err) {
    console.error("[cron/newcomer-activation-sequence]", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

// ── 단계별 스킵 조건 ─────────────────────────────────────────────────────────

async function applySkipCondition(
  db: FirebaseFirestore.Firestore,
  step: StepKey,
  users: UserDoc[],
  skipSet: Set<string>,
): Promise<void> {
  if (step === "d1") {
    // 프로필 이미 완성 → 스킵
    for (const u of users) {
      const hasBio = typeof u.bio === "string" && u.bio.trim().length > 0;
      const interests = Array.isArray(u.researchInterests) ? u.researchInterests : [];
      const kw = Array.isArray(u.interestKeywords) ? u.interestKeywords : [];
      if (hasBio && interests.length + kw.length >= 1) {
        skipSet.add(u.id);
      }
    }
    return;
  }

  if (step === "d3") {
    // guide_progress에 completedItems 1건+ → 온보딩 이미 시작, 스킵
    const userIds = users.map((u) => u.id);
    for (let i = 0; i < userIds.length; i += 30) {
      const chunk = userIds.slice(i, i + 30);
      const snap = await db
        .collection("guide_progress")
        .where("userId", "in", chunk)
        .get();
      for (const doc of snap.docs) {
        const data = doc.data() as { userId?: string; completedItems?: Record<string, unknown> };
        if (data.userId && Object.keys(data.completedItems ?? {}).length > 0) {
          skipSet.add(data.userId);
        }
      }
    }
    return;
  }

  if (step === "d7") {
    // user_activity_logs에 진단 완료 이벤트(path=ui:diagnostic/complete) 기록 → 스킵
    const userIds = users.map((u) => u.id);
    for (let i = 0; i < userIds.length; i += 30) {
      const chunk = userIds.slice(i, i + 30);
      const snap = await db
        .collection("user_activity_logs")
        .where("userId", "in", chunk)
        .where("funnelType", "==", "diagnostic")
        .get();
      for (const doc of snap.docs) {
        const data = doc.data() as { userId?: string; path?: string };
        if (data.userId && data.path === "ui:diagnostic/complete") {
          skipSet.add(data.userId);
        }
      }
    }
    return;
  }

  if (step === "d10") {
    // archive_favorites 1건+ → 아카이브 이미 탐색, 스킵
    const userIds = users.map((u) => u.id);
    for (let i = 0; i < userIds.length; i += 30) {
      const chunk = userIds.slice(i, i + 30);
      const snap = await db
        .collection("archive_favorites")
        .where("userId", "in", chunk)
        .get();
      for (const doc of snap.docs) {
        const data = doc.data() as { userId?: string };
        if (data.userId) skipSet.add(data.userId);
      }
    }
    return;
  }

  // d14: 스킵 없음 — 항상 발송 (첫 2주 회고)
}

// ── 유틸 ─────────────────────────────────────────────────────────────────────

/** YYYY-MM-DD 두 날짜의 일수 차이 (to - from, 양수=미래) */
function diffYmd(fromYmd: string, toYmd: string): number {
  const [fy, fm, fd] = fromYmd.split("-").map(Number);
  const [ty, tm, td] = toYmd.split("-").map(Number);
  return Math.round(
    (Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000,
  );
}

export const GET = withCronLog("newcomer-activation-sequence", _handler);
