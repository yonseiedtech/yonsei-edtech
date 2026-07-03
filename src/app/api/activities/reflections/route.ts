import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { ROLE_HIERARCHY } from "@/lib/permissions";

/**
 * GET /api/activities/reflections?activityId=…&progressId=… (P1-2, 2026-07-04)
 *
 * 회차 회고의 권한 인지 투영 — study_session_reflections 의 blanket list
 * (인증만으로 타인 비공개 회고 전량 열람 가능)를 rules 에서 제거하면서,
 * 리더/배지 카운트가 쓰던 목록 조회를 서버 강제 투영으로 이전한다.
 *
 * 투영 규칙 (회고 r, 뷰어 v):
 *  - 본인(r.userId === v.id)  → 전체 필드
 *  - 운영진(staff+)           → 전체 필드 (기존 rules 주석 계약: isPrivate 포함 열람)
 *  - 활동 리더 && !isPrivate  → 전체 필드
 *  - 그 외                    → 내용 제거(REDACT) — id·userId·userName·회차·isPrivate·createdAt 만.
 *    (참여자 배지 카운트·리더 리포트의 작성 수 집계는 유지되고, 내용은 노출되지 않는다.
 *     클라이언트 UI 는 원래도 비공개·타인 회고 내용을 렌더하지 않았다 — 이제 서버가 보장.)
 */

const CONTENT_FIELDS = ["liked", "lacked", "longedFor", "rating", "takeaways", "nextActions"] as const;

function serialize(value: unknown): unknown {
  if (value && typeof value === "object") {
    const maybeTs = value as { toDate?: () => Date };
    if (typeof maybeTs.toDate === "function") return maybeTs.toDate().toISOString();
    if (Array.isArray(value)) return value.map(serialize);
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, serialize(v)]),
    );
  }
  return value;
}

export async function GET(req: NextRequest) {
  const viewer = await verifyAuth(req);
  if (!viewer) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const sp = req.nextUrl.searchParams;
  const activityId = sp.get("activityId");
  const progressId = sp.get("progressId");
  if (!activityId && !progressId) {
    return NextResponse.json({ error: "activityId 또는 progressId 가 필요합니다." }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    let q: FirebaseFirestore.Query = db.collection("study_session_reflections");
    if (progressId) q = q.where("activityProgressId", "==", progressId);
    else if (activityId) q = q.where("activityId", "==", activityId);
    const snap = await q.limit(1000).get();
    const docs = snap.docs.map(
      (d) => ({ id: d.id, ...(serialize(d.data()) as Record<string, unknown>) }) as Record<string, unknown> & { id: string },
    );

    const isStaff = ROLE_HIERARCHY[viewer.role] >= ROLE_HIERARCHY.staff;
    let isLeader = false;
    if (!isStaff) {
      // 리더 판정 — activityId 는 파라미터 또는 문서에서 도출
      const actId = activityId ?? (docs[0]?.activityId as string | undefined);
      if (actId) {
        const act = await db.collection("activities").doc(actId).get();
        isLeader = act.exists && (act.data() as { leaderId?: string }).leaderId === viewer.id;
      }
    }

    const data = docs.map((r) => {
      const own = r.userId === viewer.id;
      const full = own || isStaff || (isLeader && r.isPrivate !== true);
      if (full) return r;
      const redacted: Record<string, unknown> = { ...r };
      for (const f of CONTENT_FIELDS) delete redacted[f];
      return redacted;
    });

    return NextResponse.json({ data, total: data.length });
  } catch (err) {
    console.error("[/api/activities/reflections]", err);
    return NextResponse.json({ error: "회고 조회에 실패했습니다." }, { status: 500 });
  }
}
