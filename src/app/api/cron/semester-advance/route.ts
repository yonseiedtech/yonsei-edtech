import { NextRequest, NextResponse } from "next/server";
import type { DocumentReference } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import { requireAuth } from "@/lib/api-auth";
import { currentSemesterKey } from "@/lib/semester";

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

  return { semesterKey: key, advanced, anchored, skipped };
}

export async function GET(req: NextRequest) {
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
