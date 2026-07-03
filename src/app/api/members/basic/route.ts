import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { ROLE_HIERARCHY } from "@/lib/permissions";

/**
 * GET /api/members/basic (P1-1b, 2026-07-04)
 *
 * 회원 목록의 역할 인지 투영 — users 컬렉션의 클라이언트 list 를 staff 로 좁히면서
 * 기존 profilesApi.list / listByIds 소비처(멘션·리더보드·활동 카드·쪽지 등 30여 곳)가
 * 이 API 를 경유한다 (bkend.ts 에서 스왑 — 호출부 시그니처 무변경).
 *
 * 쿼리: approved=true|false · role=<role> · ids=a,b,c(≤300) · limit(≤1000)
 * 투영:
 *  - 항상 제거: securityQuestion·securityAnswerHash·calendarToken (내부 비밀)
 *  - 비스태프 요청: email·contactEmail·phone·studentId·birthDate 추가 제거
 *    (연락처는 contactVisibility 를 서버 강제하는 /api/members/directory 사용)
 */

const HARD_SECRET = ["securityQuestion", "securityAnswerHash", "calendarToken"] as const;
const CONTACT_FIELDS = ["email", "contactEmail", "phone", "studentId", "birthDate"] as const;

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
  const user = await verifyAuth(req);
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const isStaff = ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY.staff;

  const sp = req.nextUrl.searchParams;
  const idsParam = sp.get("ids");
  const approvedParam = sp.get("approved");
  const roleParam = sp.get("role");
  const limit = Math.min(Number(sp.get("limit")) || 1000, 1000);

  try {
    const db = getAdminDb();
    let docs: FirebaseFirestore.DocumentSnapshot[];

    if (idsParam) {
      const ids = Array.from(new Set(idsParam.split(",").filter(Boolean))).slice(0, 300);
      if (ids.length === 0) return NextResponse.json({ data: [] });
      const refs = ids.map((id) => db.collection("users").doc(id));
      docs = (await db.getAll(...refs)).filter((d) => d.exists);
    } else {
      let q: FirebaseFirestore.Query = db.collection("users");
      if (approvedParam === "true" || approvedParam === "false") {
        q = q.where("approved", "==", approvedParam === "true");
      }
      if (roleParam) q = q.where("role", "==", roleParam);
      docs = (await q.limit(limit).get()).docs;
    }

    const data = docs.map((d) => {
      const raw = serialize(d.data()) as Record<string, unknown>;
      const out: Record<string, unknown> = { id: d.id, ...raw };
      for (const f of HARD_SECRET) delete out[f];
      if (!isStaff) {
        for (const f of CONTACT_FIELDS) delete out[f];
      }
      return out;
    });

    // dataApi.list 계약(total) 유지 — useMembers·콘솔 승인 대기 카운트 등이 사용
    return NextResponse.json({ data, total: data.length });
  } catch (err) {
    console.error("[/api/members/basic]", err);
    return NextResponse.json({ error: "회원 목록 조회에 실패했습니다." }, { status: 500 });
  }
}
