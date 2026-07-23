import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireAuth, verifyAuth } from "@/lib/api-auth";
import { ROLE_HIERARCHY } from "@/lib/permissions";
import { Timestamp } from "firebase-admin/firestore";

function tsToIso(v: unknown): string {
  if (typeof v === "string") return v;
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (v && typeof v === "object") {
    const o = v as { _seconds?: number; seconds?: number };
    const sec = o._seconds ?? o.seconds;
    if (typeof sec === "number") return new Date(sec * 1000).toISOString();
  }
  return "";
}

function normalizeDoc(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    ...raw,
    createdAt: tsToIso(raw.createdAt) || raw.createdAt,
    updatedAt: tsToIso(raw.updatedAt) || raw.updatedAt,
  };
}

// ── GET /api/learning-guides ──────────────────────────────────────────────────
// ?all=true (콘솔용, staff+ 인증 필요)
// ?slug=xxx  (단건 slug 조회, 공개범위 적용)
// ?category=xxx, ?tag=xxx (목록 필터)
export async function GET(req: NextRequest) {
  const db = getAdminDb();
  const { searchParams } = req.nextUrl;
  const all = searchParams.get("all") === "true";
  const slug = searchParams.get("slug");
  const category = searchParams.get("category");
  const tag = searchParams.get("tag");

  // 콘솔 전체 조회 (인증 필요)
  if (all) {
    const authResult = await requireAuth(req, "staff");
    if (authResult instanceof Response) return authResult;

    const snap = await db.collection("learning_guides").orderBy("createdAt", "desc").get();
    const data = snap.docs.map((d) => ({ id: d.id, ...normalizeDoc(d.data() as Record<string, unknown>) }));
    return Response.json({ data });
  }

  // 공개범위 판별 (비인증=public만, 인증회원=public+member, staff+=전체)
  const user = await verifyAuth(req).catch(() => null);
  const roleLevel = user ? ROLE_HIERARCHY[user.role] : 0;

  if (slug) {
    // 단건 slug 조회
    const snap = await db.collection("learning_guides").where("slug", "==", slug).limit(1).get();
    if (snap.empty) return Response.json({ data: null });
    const raw = snap.docs[0];
    const guide = { id: raw.id, ...normalizeDoc(raw.data() as Record<string, unknown>) } as Record<string, unknown>;

    if (guide.status !== "published") {
      // draft — staff+ 만 접근
      if (roleLevel < ROLE_HIERARCHY.staff) return Response.json({ data: null });
    } else {
      const vis = guide.visibility as string;
      if (vis === "staff" && roleLevel < ROLE_HIERARCHY.staff) return Response.json({ data: null });
      if (vis === "member" && roleLevel < ROLE_HIERARCHY.member) return Response.json({ data: null });
    }
    return Response.json({ data: guide });
  }

  // 목록 조회 — published 전체 로드 후 메모리 필터 (인덱스 미생성 대비)
  // orderBy 는 where 와 조합 시 복합 인덱스가 필요하므로 제거하고 메모리 정렬(인덱스 미생성 대비)
  const snap = await db
    .collection("learning_guides")
    .where("status", "==", "published")
    .get();
  let data = snap.docs.map(
    (d) => ({ id: d.id, ...normalizeDoc(d.data() as Record<string, unknown>) }) as Record<string, unknown>,
  );
  data.sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));

  // 카테고리·태그 필터 (메모리)
  if (category) data = data.filter((g) => g.category === category);
  if (tag) {
    data = data.filter((g) => Array.isArray(g.tags) && (g.tags as string[]).includes(tag));
  }

  // 공개범위 필터
  data = data.filter((g) => {
    const vis = g.visibility as string;
    if (vis === "staff") return roleLevel >= ROLE_HIERARCHY.staff;
    if (vis === "member") return roleLevel >= ROLE_HIERARCHY.member;
    return true; // public
  });

  return Response.json({ data });
}

// ── POST /api/learning-guides ─────────────────────────────────────────────────
// 저자 자격: /api/learning-guides/authorize 에서 검증 후 여기서 재검증
export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req, "member");
  if (authResult instanceof Response) return authResult;

  // 저자 자격 서버 검증 (staff OR study 모임장 OR seminar 연사)
  const eligible = await checkAuthorEligibility(authResult.uid, authResult.role);
  if (!eligible) {
    return Response.json(
      { error: "러닝 가이드 집필은 운영진·스터디 모임장·세미나 연사만 가능합니다." },
      { status: 403 },
    );
  }

  try {
    const body = await req.json() as Record<string, unknown>;
    const db = getAdminDb();
    const now = new Date().toISOString();

    // slug 중복 체크
    const slug = body.slug as string;
    if (!slug) return Response.json({ error: "slug가 필요합니다." }, { status: 400 });
    const existing = await db.collection("learning_guides").where("slug", "==", slug).limit(1).get();
    if (!existing.empty) {
      return Response.json({ error: "이미 사용 중인 slug입니다." }, { status: 409 });
    }

    const ref = await db.collection("learning_guides").add({
      ...body,
      authorId: authResult.uid,
      authorName: authResult.name ?? "알 수 없음",
      status: body.status ?? "draft",
      visibility: body.visibility ?? "member",
      tags: body.tags ?? [],
      chapterCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    const doc = await ref.get();
    return Response.json({ data: { id: doc.id, ...normalizeDoc(doc.data() as Record<string, unknown>) } });
  } catch (err) {
    console.error("[learning-guides POST]", err);
    return Response.json({ error: "생성에 실패했습니다." }, { status: 500 });
  }
}

// ── 저자 자격 검증 헬퍼 ────────────────────────────────────────────────────────
export async function checkAuthorEligibility(uid: string, role: string): Promise<boolean> {
  // staff 이상이면 항상 허용
  if (ROLE_HIERARCHY[role as keyof typeof ROLE_HIERARCHY] >= ROLE_HIERARCHY.staff) return true;

  const db = getAdminDb();

  // 스터디 모임장(leaderId)인 activity가 있으면 허용
  const studySnap = await db
    .collection("activities")
    .where("type", "==", "study")
    .where("leaderId", "==", uid)
    .limit(1)
    .get();
  if (!studySnap.empty) return true;

  // 세미나 연사인지 확인 (seminars.sessions.speakers 또는 별도 speakers 컬렉션)
  const seminarSnap = await db
    .collection("seminars")
    .where("speakerIds", "array-contains", uid)
    .limit(1)
    .get();
  if (!seminarSnap.empty) return true;

  return false;
}
