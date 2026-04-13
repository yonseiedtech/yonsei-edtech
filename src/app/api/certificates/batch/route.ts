import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req, "staff");
  if (authResult instanceof Response) return authResult;

  let seminarId: string;
  let recipients: Array<{ name: string; email?: string; type: "completion" | "appreciation" }>;
  let issuedBy: string;

  try {
    const body = await req.json();
    seminarId = body.seminarId;
    recipients = body.recipients ?? [];
    issuedBy = body.issuedBy ?? authResult.name ?? authResult.uid;
  } catch {
    return Response.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  if (!seminarId || recipients.length === 0) {
    return Response.json({ error: "seminarId와 recipients가 필요합니다." }, { status: 400 });
  }

  const db = getAdminDb();

  // seminar 정보 조회
  const seminarDoc = await db.collection("seminars").doc(seminarId).get();
  if (!seminarDoc.exists) {
    return Response.json({ error: "세미나를 찾을 수 없습니다." }, { status: 404 });
  }
  const seminarTitle = (seminarDoc.data()?.title as string) ?? "";

  // 기존 증서번호 최대값 조회 (YY-NNN 형식)
  const year = new Date().getFullYear().toString().slice(-2);
  const existingSnap = await db.collection("certificates").orderBy("certificateNo", "desc").limit(1).get();
  let lastSeq = 0;
  if (!existingSnap.empty) {
    const no = existingSnap.docs[0].data().certificateNo as string | undefined;
    if (no && no.startsWith(year + "-")) {
      lastSeq = parseInt(no.slice(3), 10) || 0;
    }
  }

  const created: number[] = [];
  const errors: Array<{ name: string; error: string }> = [];
  const now = new Date().toISOString();

  for (const r of recipients) {
    try {
      lastSeq += 1;
      const certificateNo = `${year}-${String(lastSeq).padStart(3, "0")}`;
      await db.collection("certificates").add({
        seminarId,
        seminarTitle,
        recipientName: r.name,
        type: r.type,
        certificateNo,
        issuedAt: now,
        issuedBy,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // 회원 알림 (이메일 매칭으로 userId 조회)
      if (r.email) {
        const userSnap = await db.collection("users").where("email", "==", r.email).limit(1).get();
        if (!userSnap.empty) {
          const userId = userSnap.docs[0].id;
          const label = r.type === "completion" ? "수료증" : "감사장";
          await db.collection("notifications").add({
            userId,
            type: "certificate",
            title: `${label}이 발급되었습니다`,
            message: `"${seminarTitle}" ${label}이 발급되었습니다.`,
            link: "/mypage",
            read: false,
            createdAt: now,
          });
        }
      }

      created.push(lastSeq);
    } catch (err) {
      errors.push({ name: r.name, error: err instanceof Error ? err.message : "알 수 없는 오류" });
      lastSeq -= 1; // rollback seq on failure
    }
  }

  return Response.json({ created: created.length, errors });
}
