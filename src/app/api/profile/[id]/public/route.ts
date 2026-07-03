import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/api-auth";
import { getProjectedProfile } from "@/lib/public-profile";
import type { ViaParam } from "@/lib/profile-visibility";

/**
 * GET /api/profile/[id]/public?via=qr|link
 *
 * 공개 프로필/QR 명함용 투영 조회 (P1-1, 2026-07-03).
 * - 인증 선택: Bearer 토큰이 있으면 뷰어 컨텍스트(회원/운영진)로 연락처 가시성 상향
 * - 비로그인 + via=qr|link 는 명함 교환 컨텍스트 — sectionVisibility 'shared' 필드만 노출
 * - securityAnswerHash·calendarToken·birthDate·studentId 등은 어떤 경우에도 미반환
 *
 * users 컬렉션의 `allow get: if true` 를 인증 필수로 상향하면서 공개 소비처가 이 API 로 이전됨.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  const viewer = await verifyAuth(req); // 실패해도 무방 — 비로그인 투영으로 진행
  const viaRaw = req.nextUrl.searchParams.get("via");
  const via: ViaParam = viaRaw === "qr" || viaRaw === "link" ? viaRaw : null;

  try {
    const user = await getProjectedProfile(
      id,
      viewer ? { id: viewer.id, role: viewer.role } : null,
      via,
    );
    if (!user) {
      return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ user });
  } catch (err) {
    console.error("[/api/profile/public]", err);
    return NextResponse.json({ error: "프로필 조회에 실패했습니다." }, { status: 500 });
  }
}
