import { getAdminDb } from "@/lib/firebase-admin";

// 챗봇 인사말 조회 (공개)
export async function GET() {
  try {
    const db = getAdminDb();
    const snap = await db.collection("site_settings").where("key", "==", "chatbot_greeting").limit(1).get();
    const greeting = snap.empty
      ? "안녕하세요! 연교공 챗봇입니다. 현재 연교공 챗봇은 준비중입니다! 공식 오픈 시 다시 한번 안내해드릴게요 😊"
      : snap.docs[0].data().value;
    return Response.json({ greeting });
  } catch {
    return Response.json({ greeting: "안녕하세요! 연교공 챗봇입니다." });
  }
}
