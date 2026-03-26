import { NextRequest } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Firebase Admin 초기화
if (getApps().length === 0) {
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (key) {
    const serviceAccount = JSON.parse(Buffer.from(key, "base64").toString());
    initializeApp({ credential: cert(serviceAccount) });
  }
}

const db = getFirestore();

export async function POST(req: NextRequest) {
  try {
    const { seminarId, registrations } = (await req.json()) as {
      seminarId: string;
      registrations: Record<string, unknown>[];
    };

    if (!seminarId || !registrations?.length) {
      return Response.json({ error: "seminarId와 registrations 필요" }, { status: 400 });
    }

    const batch = db.batch();
    const col = db.collection("seminar_registrations");
    const now = new Date().toISOString();
    let count = 0;

    for (const reg of registrations) {
      if (!reg.name) continue;
      const docRef = col.doc();
      batch.set(docRef, {
        ...reg,
        seminarId,
        createdAt: now,
        updatedAt: now,
      });
      count++;
    }

    await batch.commit();

    return Response.json({ success: true, count });
  } catch (err) {
    console.error("[registrations] batch create error:", err);
    return Response.json({ error: "등록에 실패했습니다." }, { status: 500 });
  }
}
