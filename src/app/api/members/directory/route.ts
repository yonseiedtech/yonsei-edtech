import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { ROLE_HIERARCHY } from "@/lib/permissions";
import type { UserRole } from "@/types";

/**
 * GET /api/members/directory
 *
 * 연락망 명단 (보류분 처리 — 연락처 프라이버시 서버 강제).
 * 이전에는 클라이언트가 users 문서 전체(전화·이메일 포함)를 받아 JS 로 가렸으나
 * (네트워크 응답·캐시에 평문 존재), 이제 서버가 contactVisibility 를 강제한다:
 *  - private: 누구에게도 연락처 미반환
 *  - staff:   요청자가 staff 이상일 때만 반환
 *  - members(기본): 승인 회원이면 반환
 * 명단 자체는 승인 회원 전용. 반환 필드는 디렉토리 화면이 쓰는 것으로 화이트리스트.
 */
export async function GET(req: NextRequest) {
  const user = await verifyAuth(req);
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const viewerIsStaff = ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY.staff;

  try {
    const db = getAdminDb();
    const snap = await db.collection("users").where("approved", "==", true).limit(1000).get();

    const members = snap.docs.map((d) => {
      const u = d.data() as Record<string, unknown>;
      const vis = (u.contactVisibility as string) ?? "members";
      const showContact = vis === "members" || (vis === "staff" && viewerIsStaff);
      return {
        id: d.id,
        name: u.name ?? "",
        role: (u.role as UserRole) ?? "member",
        occupation: u.occupation ?? null,
        affiliation: u.affiliation ?? null,
        department: u.department ?? null,
        position: u.position ?? null,
        publicTitle: u.publicTitle ?? null,
        publicDuty: u.publicDuty ?? null,
        corporateDuty: u.corporateDuty ?? null,
        researcherTitle: u.researcherTitle ?? null,
        researcherDuty: u.researcherDuty ?? null,
        freelancerNotes: u.freelancerNotes ?? null,
        enrollmentYear: u.enrollmentYear ?? null,
        enrollmentHalf: u.enrollmentHalf ?? null,
        enrollmentStatus: u.enrollmentStatus ?? null,
        studentId: viewerIsStaff ? (u.studentId ?? null) : null,
        contactVisibility: vis,
        // 연락처 — 서버에서 가시성 강제 (미허용 시 필드 자체를 내려보내지 않음)
        ...(showContact
          ? { contactEmail: u.contactEmail ?? u.email ?? null, phone: u.phone ?? null }
          : {}),
      };
    });

    return NextResponse.json({ members });
  } catch (err) {
    console.error("[/api/members/directory]", err);
    return NextResponse.json({ error: "명단 조회에 실패했습니다." }, { status: 500 });
  }
}
