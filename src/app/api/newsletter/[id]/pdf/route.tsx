import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { pdf } from "@react-pdf/renderer";
import { NewsletterPdfDocument } from "@/features/newsletter/NewsletterPdfDocument";
import type { NewsletterIssue, NewsletterSection } from "@/features/newsletter/newsletter-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function docToIssue(id: string, doc: Record<string, unknown>): NewsletterIssue {
  let sections: NewsletterSection[] = [];
  if (typeof doc.sections === "string") {
    try {
      sections = JSON.parse(doc.sections) as NewsletterSection[];
    } catch {
      sections = [];
    }
  } else if (Array.isArray(doc.sections)) {
    sections = doc.sections as NewsletterSection[];
  }

  return {
    id,
    issueNumber: (doc.issueNumber as number) ?? 0,
    title: (doc.title as string) ?? "",
    subtitle: (doc.subtitle as string) ?? "",
    coverColor: (doc.coverColor as string) ?? "from-violet-600 to-indigo-700",
    publishDate: (doc.publishDate as string) ?? "",
    editorName: (doc.editorName as string) ?? "",
    sections,
    status: (doc.status as "draft" | "published") ?? "draft",
    publishAt: (doc.publishAt as string | undefined) ?? undefined,
    createdAt: (doc.createdAt as string) ?? new Date().toISOString(),
    lastEditedBy: (doc.lastEditedBy as string | undefined) ?? undefined,
    lastEditedAt: (doc.updatedAt as string | undefined) ?? undefined,
  };
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  try {
    const db = getAdminDb();
    const snap = await db.collection("newsletters").doc(id).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "학회보를 찾을 수 없습니다." }, { status: 404 });
    }
    const issue = docToIssue(id, snap.data() as Record<string, unknown>);

    if (issue.status !== "published") {
      return NextResponse.json({ error: "발행된 호만 다운로드할 수 있습니다." }, { status: 403 });
    }

    // @react-pdf/renderer v3+: toBuffer()는 Node Readable Stream을 반환
    const stream = await pdf(<NewsletterPdfDocument issue={issue} />).toBuffer();
    const chunks: Buffer[] = [];
    for await (const chunk of stream as AsyncIterable<Buffer | Uint8Array>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ) as ArrayBuffer;

    const filename = `yonsei-edtech-newsletter-vol${issue.issueNumber}.pdf`;
    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "PDF 생성 실패";
    console.error("[newsletter pdf]", msg, err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
