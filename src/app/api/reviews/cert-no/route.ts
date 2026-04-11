import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";

// 해당 세미나 연사의 감사장 호수 조회 (인증 필요)
export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const seminarId = req.nextUrl.searchParams.get("seminarId");
  const speakerName = req.nextUrl.searchParams.get("speakerName");

  if (!seminarId) {
    return Response.json({ error: "seminarId가 필요합니다." }, { status: 400 });
  }

  try {
    const db = getAdminDb();

    // certificates 컬렉션에서 해당 세미나의 appreciation 타입 + 연사 이름 매칭
    const snapshot = await db.collection("certificates")
      .where("seminarId", "==", seminarId)
      .where("type", "==", "appreciation")
      .get();

    if (snapshot.empty) {
      return Response.json({ certNo: null });
    }

    // 연사 이름으로 매칭
    if (speakerName) {
      const match = snapshot.docs.find((d) => d.data().recipientName === speakerName);
      if (match) {
        return Response.json({ certNo: match.data().certificateNo || null });
      }
    }

    // 이름 매칭 실패 시 첫 번째 감사장 호수 반환
    const first = snapshot.docs[0].data();
    return Response.json({ certNo: first.certificateNo || null });
  } catch {
    return Response.json({ certNo: null });
  }
}
