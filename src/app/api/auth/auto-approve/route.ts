import { NextRequest } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { User } from "@/types";
import { evaluateSignup } from "@/lib/auth/approval-rules";

/**
 * 회원가입 직후 호출. 본인 토큰으로 인증한 뒤 자동 승인 규칙을 통과하면
 * Firebase Admin SDK 권한으로 approved=true 처리한다.
 *
 * verifyAuth와 달리 미승인 사용자도 인증을 통과해야 하므로 verifyIdToken만 사용한다.
 */
export async function POST(req: NextRequest) {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return Response.json({ approved: false, reason: "인증 토큰이 없습니다." }, { status: 401 });
  }
  const token = header.slice(7);

  let uid: string;
  try {
    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
  } catch (err) {
    console.error("[auto-approve] verifyIdToken failed:", err instanceof Error ? err.message : err);
    return Response.json({ approved: false, reason: "토큰 검증 실패" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return Response.json({ approved: false, reason: "사용자 문서가 없습니다." }, { status: 404 });
    }
    const data = userDoc.data() as Partial<User> | undefined;
    if (!data) {
      return Response.json({ approved: false, reason: "사용자 데이터 없음" }, { status: 404 });
    }
    if (data.approved === true) {
      return Response.json({ approved: true, alreadyApproved: true });
    }

    // Sprint 69 보안: 가입 직후(60분 이내)에만 자동 승인 허용
    // → 가입 후 학번/이름을 위조 변경 후 자동승인을 다시 시도하는 우회 차단
    const createdAtRaw = data.createdAt as string | undefined;
    if (createdAtRaw) {
      const createdMs = new Date(createdAtRaw).getTime();
      if (!Number.isNaN(createdMs)) {
        const ageMs = Date.now() - createdMs;
        if (ageMs > 60 * 60 * 1000) {
          return Response.json({
            approved: false,
            reason: "자동 승인 가능 시간(가입 후 1시간)이 지났습니다. 운영진 승인을 기다려주세요.",
          });
        }
      }
    }

    const candidate: User = {
      id: uid,
      username: (data.username as string) ?? "",
      name: (data.name as string) ?? "",
      email: (data.email as string) ?? undefined,
      role: (data.role as User["role"]) ?? "member",
      approved: false,
      generation: (data.generation as number) ?? 0,
      field: (data.field as string) ?? "",
      studentId: (data.studentId as string) ?? undefined,
      createdAt: (data.createdAt as string) ?? "",
      updatedAt: (data.updatedAt as string) ?? "",
    };

    // 중복 학번 검사: 동일 학번을 가진 다른 승인 사용자가 있는지 확인
    let allUsers: User[] = [candidate];
    if (candidate.studentId) {
      const dupSnap = await db
        .collection("users")
        .where("studentId", "==", candidate.studentId)
        .where("approved", "==", true)
        .limit(5)
        .get();
      const duplicates: User[] = dupSnap.docs
        .filter((d) => d.id !== uid)
        .map((d) => {
          const dd = d.data();
          return {
            id: d.id,
            username: (dd.username as string) ?? "",
            name: (dd.name as string) ?? "",
            email: (dd.email as string) ?? undefined,
            role: (dd.role as User["role"]) ?? "member",
            approved: true,
            generation: (dd.generation as number) ?? 0,
            field: (dd.field as string) ?? "",
            studentId: (dd.studentId as string) ?? undefined,
            createdAt: "",
            updatedAt: "",
          };
        });
      allUsers = allUsers.concat(duplicates);
    }

    const result = evaluateSignup(candidate, allUsers);
    if (!result.qualifying) {
      return Response.json({
        approved: false,
        reasons: result.reasons,
        risk: result.risk,
      });
    }

    await db.collection("users").doc(uid).update({
      approved: true,
      autoApprovedAt: FieldValue.serverTimestamp(),
    });

    // 감사 로그
    try {
      await db.collection("audit_logs").add({
        adminUid: "system:auto-approve",
        targetUid: uid,
        targetName: candidate.name,
        action: "auto_approve_on_signup",
        at: FieldValue.serverTimestamp(),
      });
    } catch {
      /* 감사 로그 실패해도 승인은 진행 */
    }

    return Response.json({ approved: true, autoApproved: true });
  } catch (err) {
    console.error("[auto-approve] failed:", err);
    return Response.json(
      { approved: false, reason: "자동 승인 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
