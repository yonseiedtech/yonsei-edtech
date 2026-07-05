import { NextRequest } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { sendPushToUsers, filterRecipientsByPreference } from "@/lib/push-admin";
import { fanOutNotificationAdmin } from "@/lib/notifications-bridge";

/**
 * 운영 인사이트 액션화 — 데이터 기반 넛지 일괄 발송 (2차 백로그 v2-M3).
 *
 * insights 화면(WeeklyOperationsSummary 등)에서 식별한 회원군에게 운영진이
 * 인앱 + 푸시 넛지를 1클릭으로 일괄 발송한다. 통계를 행동으로 전환.
 *
 * 대상 segment (서버사이드에서 직접 식별 — 클라이언트가 전체 데이터를 끌어오지 않게):
 *  - churn_risk        : 승인 회원 중 60일+ 미접속 (이탈 위험)
 *  - diagnosis_missing : 승인 회원 중 diagnostic_results 가 단 1건도 없음 (진단 미응시)
 *  - review_stalled    : flashcards 중 dueAt <= todayKST 인 카드가 임계 이상 (복습 정체)
 *  - custom            : 클라이언트가 명시한 userIds 그대로 (insights 화면에서 이미 식별한 목록)
 *
 * 안전 가드(오발송 방지):
 *  - admin 역할만 호출 가능 (assertAdmin)
 *  - dryRun=true 면 발송하지 않고 대상 목록(이름 포함)만 반환 → 확인 다이얼로그 미리보기
 *  - NotificationPrefs.pushAdminNudge === false 인 회원은 push 제외(인앱은 발송)
 *  - 중복 방지: push_logs/admin_nudge_<userId>_<todayKST>_<segment> (동일 segment 1일 1회)
 *
 * 발송 정책(메시지 톤·빈도)은 운영진 결정 사항 — 본 route 는 기본 템플릿 + 확인 절차까지만 제공.
 */

const SEGMENTS = ["churn_risk", "diagnosis_missing", "review_stalled", "custom"] as const;
type Segment = (typeof SEGMENTS)[number];

/** 이탈 위험 판정: 마지막 접속 후 경과일 임계 (일) */
const CHURN_INACTIVE_DAYS = 60;
/** 복습 정체 판정: due 카드 수 임계 (장) */
const REVIEW_STALLED_THRESHOLD = 10;
/** 신규(온보딩) 가입 회원 제외 기준 (일) */
const NEW_MEMBER_GRACE_DAYS = 30;
/** 1회 발송 상한 (오발송·스팸 방지) */
const MAX_RECIPIENTS = 300;

const DAY_MS = 86_400_000;

function daysSince(iso: string | undefined, nowMs: number): number {
  if (!iso) return Infinity;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return Infinity;
  return Math.max(0, Math.floor((nowMs - t) / DAY_MS));
}

function todayYmdKst(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

async function assertAdmin(req: NextRequest): Promise<string> {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) throw new Error("unauthorized");
  const decoded = await getAdminAuth().verifyIdToken(token);
  const db = getAdminDb();
  const profile = await db.collection("users").doc(decoded.uid).get();
  const role = (profile.data() as { role?: string } | undefined)?.role;
  if (role !== "admin") throw new Error("forbidden");
  return decoded.uid;
}

interface UserDoc {
  name?: string;
  email?: string;
  studentId?: string;
  role?: string;
  approved?: boolean;
  rejected?: boolean;
  createdAt?: string;
  lastLoginAt?: string;
}

interface TargetMember {
  userId: string;
  name: string;
  reason: string;
}

/** 기본 메시지 템플릿 (운영진이 다이얼로그에서 수정 가능 — 발송 정책은 운영진 결정) */
const DEFAULT_TEMPLATE: Record<
  Exclude<Segment, "custom">,
  { title: string; body: string; link: string }
> = {
  churn_risk: {
    title: "오랜만이에요, 다시 함께해요",
    body: "최근 학회 활동이 뜸하셨네요. 새로운 세미나와 스터디가 기다리고 있어요.",
    link: "/dashboard",
  },
  diagnosis_missing: {
    title: "연구 준비도 진단을 받아보세요",
    body: "아직 진단평가를 받지 않으셨어요. 내 연구·논문 준비도를 확인하고 약점을 보완해보세요.",
    link: "/diagnosis",
  },
  review_stalled: {
    title: "복습할 암기카드가 쌓여 있어요",
    body: "복습 일정이 지난 암기카드가 많아요. 잠깐 시간 내어 복습을 이어가 보세요.",
    link: "/flashcards",
  },
};

/**
 * segment 별 대상 회원 식별 (Admin SDK 직접 조회).
 * custom 은 explicitIds 를 회원 doc 와 join.
 */
async function identifyTargets(
  segment: Segment,
  nowMs: number,
  explicitIds: string[],
): Promise<TargetMember[]> {
  const db = getAdminDb();
  const usersSnap = await db.collection("users").get();
  const userById = new Map<string, UserDoc>();
  for (const d of usersSnap.docs) userById.set(d.id, d.data() as UserDoc);

  const nameOf = (id: string) => userById.get(id)?.name?.trim() || "(이름 없음)";

  if (segment === "custom") {
    const out: TargetMember[] = [];
    for (const id of explicitIds) {
      const u = userById.get(id);
      if (!u) continue;
      if (!u.approved || u.rejected) continue;
      out.push({ userId: id, name: nameOf(id), reason: "운영진 지정" });
    }
    return out;
  }

  // 승인 + 비거절 + 신규 유예 제외 공통 풀
  const pool: { id: string; u: UserDoc }[] = [];
  for (const [id, u] of userById) {
    if (u.role === "admin") continue;
    if (!u.approved || u.rejected) continue;
    if (daysSince(u.createdAt, nowMs) <= NEW_MEMBER_GRACE_DAYS) continue;
    pool.push({ id, u });
  }

  if (segment === "churn_risk") {
    const out: TargetMember[] = [];
    for (const { id, u } of pool) {
      const dLogin = daysSince(u.lastLoginAt, nowMs);
      if (dLogin >= CHURN_INACTIVE_DAYS) {
        out.push({
          userId: id,
          name: nameOf(id),
          reason: Number.isFinite(dLogin) ? `${dLogin}일 미접속` : "접속 기록 없음",
        });
      }
    }
    out.sort((a, b) => a.name.localeCompare(b.name, "ko"));
    return out;
  }

  if (segment === "diagnosis_missing") {
    // 진단 응시 이력이 있는 userId 집합
    const dxSnap = await db.collection("diagnostic_results").get();
    const respondedIds = new Set<string>();
    for (const d of dxSnap.docs) {
      const uid = (d.data() as { userId?: string }).userId;
      if (uid) respondedIds.add(uid);
    }
    const out: TargetMember[] = [];
    for (const { id } of pool) {
      if (!respondedIds.has(id)) {
        out.push({ userId: id, name: nameOf(id), reason: "진단 미응시" });
      }
    }
    out.sort((a, b) => a.name.localeCompare(b.name, "ko"));
    return out;
  }

  // review_stalled — due 카드 임계 이상
  const todayYmd = todayYmdKst();
  const dueSnap = await db
    .collection("flashcards")
    .where("dueAt", "<=", todayYmd)
    .get();
  const dueCountByUser = new Map<string, number>();
  for (const d of dueSnap.docs) {
    const uid = (d.data() as { userId?: string }).userId;
    if (!uid) continue;
    dueCountByUser.set(uid, (dueCountByUser.get(uid) ?? 0) + 1);
  }
  const poolIds = new Set(pool.map((p) => p.id));
  const out: TargetMember[] = [];
  for (const [uid, count] of dueCountByUser) {
    if (count < REVIEW_STALLED_THRESHOLD) continue;
    if (!poolIds.has(uid)) continue; // 미승인·신규·admin 제외
    out.push({ userId: uid, name: nameOf(uid), reason: `복습 지연 ${count}장` });
  }
  out.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  return out;
}

export async function POST(req: NextRequest) {
  try {
    await assertAdmin(req);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // QA-v3 L: verifyIdToken 등 내부 메시지를 에코하지 않음
    return Response.json(
      { error: msg === "forbidden" ? "권한이 없습니다." : "인증에 실패했습니다." },
      { status: msg === "forbidden" ? 403 : 401 },
    );
  }

  let payload: {
    segment?: string;
    userIds?: unknown;
    title?: unknown;
    body?: unknown;
    link?: unknown;
    dryRun?: unknown;
  };
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const segment = payload.segment as Segment;
  if (!SEGMENTS.includes(segment)) {
    return Response.json({ error: "invalid_segment" }, { status: 400 });
  }
  const explicitIds = Array.isArray(payload.userIds)
    ? (payload.userIds.filter((x) => typeof x === "string") as string[])
    : [];
  const dryRun = payload.dryRun === true;

  const nowMs = Date.now();
  const todayYmd = todayYmdKst();

  let targets: TargetMember[];
  try {
    targets = await identifyTargets(segment, nowMs, explicitIds);
  } catch (err) {
    console.error("[admin/insights/nudge] identify", err);
    return Response.json({ error: "identify_failed" }, { status: 500 });
  }

  // 메시지 템플릿: 운영진 입력 우선, 없으면 segment 기본 템플릿(custom 은 입력 필수)
  const tmpl = segment === "custom" ? null : DEFAULT_TEMPLATE[segment];
  const title = (typeof payload.title === "string" && payload.title.trim()) || tmpl?.title || "";
  const body = (typeof payload.body === "string" && payload.body.trim()) || tmpl?.body || "";
  const link = (typeof payload.link === "string" && payload.link.trim()) || tmpl?.link || "/dashboard";

  // ── dryRun: 발송 없이 대상·미리보기만 반환 (확인 다이얼로그용) ──
  if (dryRun) {
    return Response.json({
      ok: true,
      dryRun: true,
      segment,
      todayYmd,
      total: targets.length,
      capped: targets.length > MAX_RECIPIENTS,
      maxRecipients: MAX_RECIPIENTS,
      targets: targets.slice(0, 100), // 미리보기 상한
      preview: { title, body, link },
    });
  }

  // ── 실발송 ──
  if (!title || !body) {
    return Response.json({ error: "message_required" }, { status: 400 });
  }
  if (targets.length === 0) {
    return Response.json({ ok: true, segment, total: 0, sentTotal: 0, notified: 0 });
  }
  if (targets.length > MAX_RECIPIENTS) {
    return Response.json(
      { error: "too_many_recipients", total: targets.length, max: MAX_RECIPIENTS },
      { status: 400 },
    );
  }

  const db = getAdminDb();
  const allTargetIds = targets.map((t) => t.userId);

  // 중복 방지: 동일 segment 1일 1회 (이미 오늘 받은 회원 제외)
  const dedupedIds: string[] = [];
  let skippedDup = 0;
  for (const uid of allTargetIds) {
    const dupRef = db
      .collection("push_logs")
      .doc(`admin_nudge_${uid}_${todayYmd}_${segment}`);
    const snap = await dupRef.get();
    if (snap.exists) {
      skippedDup++;
      continue;
    }
    dedupedIds.push(uid);
  }

  if (dedupedIds.length === 0) {
    return Response.json({
      ok: true,
      segment,
      total: targets.length,
      sentTotal: 0,
      notified: 0,
      skippedDup,
    });
  }

  // 인앱 알림은 전원 발송 (admin_nudge), push 는 옵트아웃 존중
  await fanOutNotificationAdmin(dedupedIds, {
    type: "admin_nudge",
    title,
    body,
    relatedLink: link,
    metadata: { segment, sentBySystem: "admin_nudge" },
  });

  const pushAllowedIds = await filterRecipientsByPreference(dedupedIds, "admin_nudge");
  let sentTotal = 0;
  let removedStale = 0;
  if (pushAllowedIds.length > 0) {
    const res = await sendPushToUsers(pushAllowedIds, {
      title,
      body,
      link,
      tag: "admin-nudge",
    });
    sentTotal = res.successful;
    removedStale = res.removedStale;
  }

  // push_logs 기록 (dedup 키 + 발송 메타)
  const sentAt = new Date().toISOString();
  for (let i = 0; i < dedupedIds.length; i += 400) {
    const chunk = dedupedIds.slice(i, i + 400);
    const batch = db.batch();
    for (const uid of chunk) {
      const ref = db
        .collection("push_logs")
        .doc(`admin_nudge_${uid}_${todayYmd}_${segment}`);
      batch.set(ref, {
        kind: "admin_nudge",
        segment,
        userId: uid,
        date: todayYmd,
        sentAt,
      });
    }
    await batch.commit();
  }

  return Response.json({
    ok: true,
    segment,
    total: targets.length,
    notified: dedupedIds.length,
    pushAllowed: pushAllowedIds.length,
    sentTotal,
    removedStale,
    skippedDup,
  });
}
