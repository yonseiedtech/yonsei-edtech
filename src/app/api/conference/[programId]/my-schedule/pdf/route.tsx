import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { pdf } from "@react-pdf/renderer";
import { PersonalSchedulePdfDocument } from "@/features/conference/PersonalSchedulePdfDocument";
import type { ConferenceProgram, UserSessionPlan, Activity } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ programId: string }> },
) {
  const { programId } = await ctx.params;
  const userId = req.nextUrl.searchParams.get("userId");
  const userNameParam = req.nextUrl.searchParams.get("userName") ?? "";
  if (!userId) {
    return NextResponse.json({ error: "userId 쿼리 파라미터가 필요합니다." }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const progSnap = await db.collection("conference_programs").doc(programId).get();
    if (!progSnap.exists) {
      return NextResponse.json({ error: "학술대회 프로그램을 찾을 수 없습니다." }, { status: 404 });
    }
    const program = { id: progSnap.id, ...(progSnap.data() as object) } as ConferenceProgram;

    const [actSnap, plansSnap] = await Promise.all([
      db.collection("activities").doc(program.activityId).get(),
      db
        .collection("user_session_plans")
        .where("userId", "==", userId)
        .where("programId", "==", programId)
        .limit(500)
        .get(),
    ]);
    const activity = actSnap.exists
      ? ({ id: actSnap.id, ...(actSnap.data() as object) } as Activity)
      : null;
    const plans = plansSnap.docs.map(
      (d) => ({ id: d.id, ...(d.data() as object) }) as UserSessionPlan,
    );

    const userName =
      userNameParam || plans[0]?.userName || "회원";

    const stream = await pdf(
      <PersonalSchedulePdfDocument
        program={program}
        activityTitle={activity?.title ?? program.title}
        userName={userName}
        plans={plans}
      />,
    ).toBuffer();
    const chunks: Buffer[] = [];
    for await (const chunk of stream as AsyncIterable<Buffer | Uint8Array>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ) as ArrayBuffer;

    const safeName = (activity?.title ?? program.title ?? "학술대회").replace(/[\\/:*?"<>|]/g, "_");
    const filename = `${safeName}-나의일정표.pdf`;

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "PDF 생성 실패";
    console.error("[conference/my-schedule/pdf]", msg, err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
