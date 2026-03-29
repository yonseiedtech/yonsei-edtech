import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");

  if (!username || username.length < 5) {
    return Response.json({ error: "학번을 5자 이상 입력하세요." }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const snapshot = await db.collection("users")
      .where("username", "==", username)
      .limit(1)
      .get();

    return Response.json({
      available: snapshot.empty,
      message: snapshot.empty ? "사용 가능한 학번입니다." : "이미 가입된 학번입니다.",
    });
  } catch (err) {
    console.error("[check-username]", err);
    return Response.json({ error: "확인에 실패했습니다." }, { status: 500 });
  }
}
