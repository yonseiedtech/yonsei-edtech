import { getAdminDb } from "@/lib/firebase-admin";

// 챗봇 인사말 조회 (공개)
export async function GET() {
  try {
    const db = getAdminDb();
    const snap = await db.collection("site_settings").where("key", "==", "chatbot_greeting").limit(1).get();
    const greeting = snap.empty
      ? "안녕하세요! 연세교육공학회 챗봇입니다. 궁금한 점이 있으시면 편하게 질문해 주세요! 😊"
      : snap.docs[0].data().value;
    return Response.json({ greeting });
  } catch {
    return Response.json({ greeting: "안녕하세요! 연교공 챗봇입니다." });
  }
}
