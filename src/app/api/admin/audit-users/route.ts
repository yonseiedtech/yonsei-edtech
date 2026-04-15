import { NextRequest } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

async function assertAdmin(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) throw new Error("unauthorized");
  const decoded = await getAdminAuth().verifyIdToken(token);
  const db = getAdminDb();
  const profile = await db.collection("users").doc(decoded.uid).get();
  const role = (profile.data() as { role?: string } | undefined)?.role;
  if (role !== "admin") throw new Error("forbidden");
  return decoded.uid;
}

const ROLE_GROUPS = {
  admin: "관리자",
  president: "학회장",
  staff: "운영진",
  advisor: "자문위원",
  member: "재(휴)학생",
  alumni: "졸업생",
  guest: "게스트",
} as const;

export async function GET(req: NextRequest) {
  try {
    await assertAdmin(req);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: msg === "forbidden" ? 403 : 401 });
  }

  try {
    const db = getAdminDb();
    const auth = getAdminAuth();
    const snap = await db.collection("users").get();
    const profiles: Array<Record<string, unknown> & { id: string }> = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Record<string, unknown>),
    }));

    // Firebase Auth 사용자 전체 조회 (email 기반 매칭 맵)
    const emailToAuthUid = new Map<string, string>();
    let nextPageToken: string | undefined;
    do {
      const page = await auth.listUsers(1000, nextPageToken);
      for (const u of page.users) {
        if (u.email) emailToAuthUid.set(u.email.toLowerCase(), u.uid);
      }
      nextPageToken = page.pageToken;
    } while (nextPageToken);

    const results = profiles.map((p) => {
      const email = (p.email as string | undefined)?.toLowerCase() ?? "";
      const authUid = email ? emailToAuthUid.get(email) : undefined;
      const studentId = (p.studentId as string | undefined) || (p.username as string | undefined) || "";
      const issues: string[] = [];
      if (!email) issues.push("이메일 없음");
      if (email && !authUid) issues.push("Firebase Auth 계정 없음");
      if (authUid && authUid !== p.id) issues.push(`UID 불일치 (profile=${p.id} / auth=${authUid})`);
      if (!studentId) issues.push("학번/아이디 없음");
      if (!p.approved) issues.push("미승인");
      if (!p.role) issues.push("역할 없음");
      return {
        id: p.id,
        name: (p.name as string) ?? "",
        email,
        studentId,
        role: (p.role as string) ?? "",
        approved: !!p.approved,
        enrollmentStatus: (p.enrollmentStatus as string) ?? "",
        hasAuthAccount: !!authUid,
        uidMatch: authUid === p.id,
        issues,
      };
    });

    // 역할별 그룹핑 (admin 제외)
    const grouped: Record<string, typeof results> = {};
    for (const r of results) {
      if (r.role === "admin") continue;
      const key = ROLE_GROUPS[r.role as keyof typeof ROLE_GROUPS] ?? "기타";
      grouped[key] = grouped[key] ?? [];
      grouped[key].push(r);
    }

    return Response.json({
      total: results.length,
      totalExcludingAdmin: results.filter((r) => r.role !== "admin").length,
      authUserCount: emailToAuthUid.size,
      groups: grouped,
      summary: Object.entries(grouped).map(([label, list]) => ({
        label,
        count: list.length,
        withIssues: list.filter((r) => r.issues.length > 0).length,
      })),
    });
  } catch (err) {
    console.error("[audit-users]", err);
    return Response.json({ error: err instanceof Error ? err.message : "fail" }, { status: 500 });
  }
}
