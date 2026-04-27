import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyAuth } from "@/lib/api-auth";
import { todayYmdKst } from "@/lib/dday";
import { pdf } from "@react-pdf/renderer";
import {
  ProfileCertificatePdfDocument,
  type PortfolioBundle,
} from "@/features/profile/ProfileCertificatePdfDocument";
import type {
  ActivityParticipation,
  Award,
  ContentCreation,
  ExternalActivity,
  RecentPaper,
  User,
} from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STAFF_ROLES = new Set(["sysadmin", "admin", "president", "staff"]);

function snapToDocs<T>(snap: FirebaseFirestore.QuerySnapshot): T[] {
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as unknown as T);
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const wantsPublic = url.searchParams.get("public") === "true";

  try {
    const db = getAdminDb();
    const userSnap = await db.collection("users").doc(id).get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });
    }
    const user = { id: userSnap.id, ...userSnap.data() } as unknown as User;

    // 본인판(미검증 포함)은 본인 또는 운영진만 다운로드 가능
    let publicOnly = wantsPublic;
    if (!publicOnly) {
      const auth = await verifyAuth(req);
      const isOwner = auth?.id === id;
      const isStaff = !!auth && STAFF_ROLES.has(auth.role);
      if (!isOwner && !isStaff) {
        return NextResponse.json(
          { error: "본인 또는 운영진만 본인판 증명서를 다운로드할 수 있습니다. ?public=true 옵션을 사용하세요." },
          { status: 403 },
        );
      }
    }

    const [partsSnap, awardsSnap, externalsSnap, contentsSnap] = await Promise.all([
      db.collection("activity_participations").where("userId", "==", id).get(),
      db.collection("awards").where("userId", "==", id).get(),
      db.collection("external_activities").where("userId", "==", id).get(),
      db.collection("content_creations").where("userId", "==", id).get(),
    ]);

    const bundle: PortfolioBundle = {
      user,
      participations: snapToDocs<ActivityParticipation>(partsSnap),
      awards: snapToDocs<Award>(awardsSnap),
      externals: snapToDocs<ExternalActivity>(externalsSnap),
      contents: snapToDocs<ContentCreation>(contentsSnap),
      papers: (user.recentPapers ?? []) as RecentPaper[],
    };

    const issuedAt = todayYmdKst();
    const certNumber = `YEDT-${id.slice(0, 6).toUpperCase()}-${issuedAt.replace(/-/g, "")}`;
    const verifyUrl = `https://yonsei-edtech.vercel.app/profile/${id}`;

    const stream = await pdf(
      <ProfileCertificatePdfDocument
        bundle={bundle}
        publicOnly={publicOnly}
        certNumber={certNumber}
        issuedAt={issuedAt}
        verifyUrl={verifyUrl}
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

    const suffix = publicOnly ? "public" : "full";
    const filename = `yonsei-edtech-portfolio-${user.name ?? id}-${suffix}.pdf`;

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "PDF 생성 실패";
    console.error("[profile certificate]", msg, err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
