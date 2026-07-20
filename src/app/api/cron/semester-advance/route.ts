import { NextRequest, NextResponse } from "next/server";
import { withCronLog } from "@/lib/cron-observability";
import type { DocumentReference } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import { requireAuth } from "@/lib/api-auth";
import { currentSemesterKey, shiftSemesterKey } from "@/lib/semester";
import { fanOutNotificationAdmin } from "@/lib/notifications-bridge";

/**
 * 학기 자동 진행 Cron — 매일 실행, 학기 경계(3월·9월)에서만 실제 변동.
 *
 * accumulatedSemesters(휴학 제외 실제 누적 학기)를 학기마다 +1 한다.
 * - enrollmentStatus 가 on_leave/graduated 또는 isAlumni 면 증가 없이 앵커만 갱신
 *   → 휴학·졸업 회원은 학기차가 멈춤 (휴학 자동 반영)
 * - accumulatedSemestersAsOf 키로 멱등성 보장 — 같은 학기 재실행 시 no-op
 * - 처음 보는 회원(asOf 없음)은 증가 없이 앵커만 → 기존 회원 lazy 백필
 *
 * GET: Vercel cron 전용 (verifyCronAuth)
 * POST: 운영진(admin+) 수동 실행 — 최초 백필·검증용
 */
export const maxDuration = 60;

interface AdvanceResult {
  semesterKey: string;
  /** 재학생 +1 처리 수 */
  advanced: number;
  /** 증가 없이 앵커만 (신규/백필) 처리 수 */
  anchored: number;
  /** 대상 아님(누적학기 미설정·이미 처리됨·휴학·졸업) 수 */
  skipped: number;
  /** 신학기 조직도 이월 결과 (R3) */
  orgChart: OrgCarryResult;
}

interface OrgCarryResult {
  carried: boolean;
  /** 이월 원본 학기 키 또는 "legacy" (미이월 시 null) */
  source: string | null;
  reason?: string;
}

/** 학기 스코프 조직도 site_settings 키 (useOrgChart.orgChartKey 와 동일 규약 — 서버 인라인). */
function orgChartKey(semesterKey: string): string {
  return `org_chart:${semesterKey}`;
}

/** 운영진(조직도 이월 알림 수신) 역할 */
const STAFF_ROLES = new Set(["admin", "sysadmin", "president", "staff"]);

/**
 * 신학기 조직도 자동 이월 (R3, 2026-07-21).
 *
 * 9/1 학기 키 전환 시 `org_chart:{신학기}` 문서가 없으면 직전 학기(없으면 레거시 `org_chart`)
 * 조직도를 복사 생성한다. 비파괴 — 신학기 문서가 이미 있으면 아무 것도 하지 않는다(멱등).
 * 원본이 전혀 없으면(첫 학기 등) 빈 조직도를 만들지 않고 건너뛴다.
 * 이월이 실제 일어난 경우에만 운영진(staff+)에게 인앱 알림을 1회 발송한다.
 */
async function carryOverOrgChart(
  db: FirebaseFirestore.Firestore,
): Promise<OrgCarryResult> {
  try {
    const currentKey = currentSemesterKey();
    const col = db.collection("site_settings");

    // 신학기 문서가 이미 있으면 비파괴 — 스킵 (멱등: 이월·알림 모두 1회)
    const currentSnap = await col.where("key", "==", orgChartKey(currentKey)).limit(1).get();
    if (!currentSnap.empty) return { carried: false, source: null, reason: "already-exists" };

    // 원본: 직전 학기 문서 → 없으면 레거시 단일 키 `org_chart`
    const prevKey = shiftSemesterKey(currentKey, -1);
    let sourceValue: string | null = null;
    let sourceLabel: string | null = null;
    if (prevKey) {
      const prevSnap = await col.where("key", "==", orgChartKey(prevKey)).limit(1).get();
      if (!prevSnap.empty) {
        sourceValue = prevSnap.docs[0].data().value as string;
        sourceLabel = prevKey;
      }
    }
    if (sourceValue == null) {
      const legacySnap = await col.where("key", "==", "org_chart").limit(1).get();
      if (!legacySnap.empty) {
        sourceValue = legacySnap.docs[0].data().value as string;
        sourceLabel = "legacy";
      }
    }
    if (sourceValue == null) return { carried: false, source: null, reason: "no-source" };

    // 신학기 문서 생성 (복사)
    const nowIso = new Date().toISOString();
    await col.add({
      key: orgChartKey(currentKey),
      value: sourceValue,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    // 운영진(staff+) 인앱 알림 1회
    const usersSnap = await db.collection("users").where("approved", "==", true).get();
    const staffIds = usersSnap.docs
      .filter((d) => {
        const role = (d.data() as { role?: string }).role;
        return role && STAFF_ROLES.has(role);
      })
      .map((d) => d.id);
    if (staffIds.length > 0) {
      await fanOutNotificationAdmin(staffIds, {
        type: "admin_nudge",
        title: "신학기 조직도가 이월됐습니다",
        body: `${currentKey} 학기 조직도를 직전 조직도에서 자동 이월했습니다. 조직 설정에서 검토·갱신해주세요.`,
        relatedLink: "/console/settings/org-chart",
        metadata: { semesterKey: currentKey, source: sourceLabel },
      });
    }

    return { carried: true, source: sourceLabel };
  } catch (e) {
    console.error("[semester-advance] carryOverOrgChart failed", e);
    return { carried: false, source: null, reason: "error" };
  }
}

async function advanceSemesters(): Promise<AdvanceResult> {
  const db = getAdminDb();
  const key = currentSemesterKey();
  const snap = await db.collection("users").get();

  const updates: { ref: DocumentReference; data: Record<string, unknown> }[] = [];
  let advanced = 0;
  let anchored = 0;
  let skipped = 0;

  for (const doc of snap.docs) {
    const d = doc.data();
    const acc = d.accumulatedSemesters;
    // 누적학기 미설정 회원은 자동 진행 대상이 아님
    if (typeof acc !== "number" || acc <= 0) {
      skipped++;
      continue;
    }
    const asOf = d.accumulatedSemestersAsOf;
    // 이미 이번 학기에 처리됨 — 멱등 (매일 실행돼도 학기당 1회만 변동)
    if (asOf === key) {
      skipped++;
      continue;
    }
    if (typeof asOf !== "string" || !asOf) {
      // 처음 보는 회원 — 증가 없이 앵커만 (기존 회원 백필)
      updates.push({ ref: doc.ref, data: { accumulatedSemestersAsOf: key } });
      anchored++;
      continue;
    }
    // 새 학기 진입 — 재학생만 +1, 휴학·졸업은 앵커만 (학기차 동결)
    const status = d.enrollmentStatus;
    const onHold =
      status === "on_leave" || status === "graduated" || d.isAlumni === true;
    if (onHold) {
      updates.push({ ref: doc.ref, data: { accumulatedSemestersAsOf: key } });
      skipped++;
    } else {
      updates.push({
        ref: doc.ref,
        data: { accumulatedSemesters: acc + 1, accumulatedSemestersAsOf: key },
      });
      advanced++;
    }
  }

  // Firestore 배치 쓰기 (배치당 최대 500 → 450 단위 청크)
  for (let i = 0; i < updates.length; i += 450) {
    const batch = db.batch();
    for (const u of updates.slice(i, i + 450)) {
      batch.set(u.ref, u.data, { merge: true });
    }
    await batch.commit();
  }

  // R3: 학기 키 전환 시 신학기 조직도 자동 이월 (비파괴·멱등). 매일 실행돼도
  // 신학기 문서가 생기면 이후엔 스킵되므로 안전하게 매 실행 호출한다.
  const orgChart = await carryOverOrgChart(db);

  return { semesterKey: key, advanced, anchored, skipped, orgChart };
}

async function _handler(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await advanceSemesters();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/semester-advance]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, "admin");
  if (auth instanceof NextResponse) return auth;
  try {
    const result = await advanceSemesters();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/semester-advance] POST", err);
    return NextResponse.json(
      { error: "학기 진행 처리에 실패했습니다." },
      { status: 500 },
    );
  }
}

export const GET = withCronLog("semester-advance", _handler);
