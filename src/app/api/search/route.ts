import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

interface Hit {
  kind: "post" | "seminar" | "activity";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

function contains(haystack: string | undefined, needle: string): boolean {
  return (haystack ?? "").toLowerCase().includes(needle);
}

// GET /api/search?q=keyword
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 1) return Response.json({ data: [] });

  try {
    const db = getAdminDb();

    // 병렬 조회 — 제목 기반 단순 필터. 소규모 학회 특성상 메모리 필터로 충분.
    const [postsSnap, seminarsSnap, activitiesSnap] = await Promise.all([
      db.collection("posts").orderBy("createdAt", "desc").limit(200).get(),
      db.collection("seminars").orderBy("date", "desc").limit(100).get(),
      db.collection("activities").limit(200).get(),
    ]);

    const hits: Hit[] = [];

    for (const doc of postsSnap.docs) {
      const d = doc.data() as { title?: string; authorName?: string; category?: string };
      if (contains(d.title, q) || contains(d.authorName, q)) {
        hits.push({
          kind: "post",
          id: doc.id,
          title: d.title ?? "(제목 없음)",
          subtitle: `게시글 · ${d.authorName ?? ""}`,
          href: `/board/${doc.id}`,
        });
        if (hits.length >= 30) break;
      }
    }

    for (const doc of seminarsSnap.docs) {
      const d = doc.data() as { title?: string; location?: string; date?: string; speaker?: string };
      if (contains(d.title, q) || contains(d.location, q) || contains(d.speaker, q)) {
        hits.push({
          kind: "seminar",
          id: doc.id,
          title: d.title ?? "(세미나)",
          subtitle: `세미나 · ${d.date ?? ""} · ${d.location ?? ""}`,
          href: `/seminars/${doc.id}`,
        });
      }
    }

    for (const doc of activitiesSnap.docs) {
      const d = doc.data() as { title?: string; type?: string; description?: string };
      if (contains(d.title, q) || contains(d.description, q)) {
        const type = d.type === "project" ? "projects" : d.type === "study" ? "studies" : "external";
        const label = type === "projects" ? "프로젝트" : type === "studies" ? "스터디" : "대외활동";
        hits.push({
          kind: "activity",
          id: doc.id,
          title: d.title ?? "(활동)",
          subtitle: label,
          href: `/activities/${type}/${doc.id}`,
        });
      }
    }

    return Response.json({ data: hits.slice(0, 40) });
  } catch (err) {
    console.error("[search GET]", err);
    return Response.json({ error: "검색 실패" }, { status: 500 });
  }
}
