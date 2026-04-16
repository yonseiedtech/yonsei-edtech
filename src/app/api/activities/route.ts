import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireAuth } from "@/lib/api-auth";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

/**
 * createdAt/updatedAt이 Firestore Timestamp 객체로 저장된 레거시 문서와
 * ISO 문자열로 저장된 신규 문서를 모두 지원하기 위한 정규화 유틸.
 */
function tsToIso(v: unknown): string {
  if (typeof v === "string") return v;
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (v && typeof v === "object") {
    const o = v as { _seconds?: number; seconds?: number; _nanoseconds?: number; nanoseconds?: number };
    const sec = o._seconds ?? o.seconds;
    if (typeof sec === "number") return new Date(sec * 1000).toISOString();
  }
  return "";
}

function normalizeDoc(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    ...raw,
    createdAt: tsToIso(raw.createdAt) || raw.createdAt,
    updatedAt: tsToIso(raw.updatedAt) || raw.updatedAt,
  };
}

// 활동 목록 조회 (공개)
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");
  const id = req.nextUrl.searchParams.get("id");

  try {
    const db = getAdminDb();

    if (id) {
      const doc = await db.collection("activities").doc(id).get();
      if (!doc.exists) return Response.json({ error: "활동을 찾을 수 없습니다." }, { status: 404 });
      return Response.json({ data: { id: doc.id, ...normalizeDoc(doc.data() as Record<string, unknown>) } });
    }

    // type 필터가 있으면 orderBy 생략 (복합 인덱스 미생성 대비) → 메모리 정렬
    const snap = type
      ? await db.collection("activities").where("type", "==", type).get()
      : await db.collection("activities").orderBy("createdAt", "desc").get();
    const data = snap.docs.map((d) => ({
      id: d.id,
      ...normalizeDoc(d.data() as Record<string, unknown>),
    }));
    // 모든 응답을 createdAt 내림차순으로 정렬 (정규화 후 안전)
    data.sort((a, b) => {
      const ca = tsToIso((a as Record<string, unknown>).createdAt);
      const cb = tsToIso((b as Record<string, unknown>).createdAt);
      return cb.localeCompare(ca);
    });
    return Response.json({ data });
  } catch (err) {
    console.error("[activities GET]", err);
    return Response.json({ error: "조회에 실패했습니다." }, { status: 500 });
  }
}

// 활동 생성 (staff+)
export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req, "staff");
  if (authResult instanceof Response) return authResult;

  try {
    const body = await req.json();
    const db = getAdminDb();
    const now = new Date().toISOString();
    const ref = await db.collection("activities").add({
      ...body,
      participants: body.participants ?? [],
      applicants: body.applicants ?? [],
      createdAt: now,
      updatedAt: now,
    });
    const doc = await ref.get();
    return Response.json({ data: { id: doc.id, ...doc.data() } });
  } catch (err) {
    console.error("[activities POST]", err);
    return Response.json({ error: "생성에 실패했습니다." }, { status: 500 });
  }
}

// 활동 수정 (staff+) 또는 참여 신청/취소 (일반 회원)
export async function PATCH(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  try {
    const body = await req.json();
    const { id, joinUserId, leaveUserId, ...data } = body;
    if (!id) return Response.json({ error: "ID가 필요합니다." }, { status: 400 });

    const db = getAdminDb();

    // 참여 신청 (atomic)
    if (joinUserId) {
      await db.collection("activities").doc(id).update({
        participants: FieldValue.arrayUnion(joinUserId),
        updatedAt: new Date().toISOString(),
      });
      return Response.json({ success: true });
    }

    // 참여 취소 (atomic)
    if (leaveUserId) {
      await db.collection("activities").doc(id).update({
        participants: FieldValue.arrayRemove(leaveUserId),
        updatedAt: new Date().toISOString(),
      });
      return Response.json({ success: true });
    }

    // 일반 수정 (staff+ 전용)
    if (!authResult || !["staff", "president", "admin"].includes(authResult.role)) {
      return Response.json({ error: "권한이 부족합니다." }, { status: 403 });
    }
    await db.collection("activities").doc(id).update({ ...data, updatedAt: new Date().toISOString() });
    return Response.json({ success: true });
  } catch (err) {
    console.error("[activities PATCH]", err);
    return Response.json({ error: "수정에 실패했습니다." }, { status: 500 });
  }
}

// 활동 삭제 (staff+)
export async function DELETE(req: NextRequest) {
  const authResult = await requireAuth(req, "staff");
  if (authResult instanceof Response) return authResult;

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return Response.json({ error: "ID가 필요합니다." }, { status: 400 });

    const db = getAdminDb();
    await db.collection("activities").doc(id).delete();
    return Response.json({ success: true });
  } catch (err) {
    console.error("[activities DELETE]", err);
    return Response.json({ error: "삭제에 실패했습니다." }, { status: 500 });
  }
}
