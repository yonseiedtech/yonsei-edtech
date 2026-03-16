import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "./firebase-admin";
import type { UserRole } from "@/types";

const ROLE_HIERARCHY: Record<UserRole, number> = {
  guest: 0,
  member: 1,
  alumni: 2,
  advisor: 2,
  staff: 3,
  president: 4,
  admin: 5,
};

export interface AuthUser {
  uid: string;
  email?: string;
  name?: string;
  role: UserRole;
}

/**
 * API 라우트에서 Firebase ID Token을 검증하고 사용자 정보를 반환.
 * 실패 시 null 반환.
 */
export async function verifyAuth(req: NextRequest): Promise<AuthUser | null> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;

  const token = header.slice(7);
  try {
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();
    const decoded = await adminAuth.verifyIdToken(token);
    const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
    const data = userDoc.data();

    return {
      uid: decoded.uid,
      email: decoded.email,
      name: data?.name,
      role: (data?.role as UserRole) ?? "member",
    };
  } catch {
    return null;
  }
}

/**
 * 인증 필수 + 최소 역할 요구. 미달 시 적절한 에러 Response 반환.
 */
export async function requireAuth(
  req: NextRequest,
  minimumRole: UserRole = "member",
): Promise<AuthUser | NextResponse> {
  const user = await verifyAuth(req);
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (ROLE_HIERARCHY[user.role] < ROLE_HIERARCHY[minimumRole]) {
    return NextResponse.json({ error: "권한이 부족합니다." }, { status: 403 });
  }
  return user;
}
