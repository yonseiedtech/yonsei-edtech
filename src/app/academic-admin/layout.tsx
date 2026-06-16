/**
 * /academic-admin/* — 운영진 학술관리 라우트 wrapper.
 *
 * 이전: 순수 passthrough — 외곽 컨테이너가 없어 직접 접근 시 페이지마다
 *       본문 폭·여백이 제각각이었다.
 * 수정(2026-06-11 여백 통일): 콘솔 쉘과 동일한 외곽 규격(max-w-7xl px-4 py-16) 제공.
 *       /console/academic/* 재export 경로는 본 layout 을 타지 않으므로 이중 적용 없음.
 * 수정(2026-06-16 권한 게이트): ConsoleLayout과 동일한 AuthGuard 래핑 추가.
 *       비로그인/세션 만료 상태에서 무가드로 동일 컴포넌트(수료증 등)가
 *       렌더되어 발생하던 간헐 crash 경로 차단. AuthGuard가 user 부재 시
 *       children을 렌더하기 전 null을 반환하므로 1프레임 렌더 윈도우도 없음.
 */

import AuthGuard from "@/features/auth/AuthGuard";

export default function AcademicAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["staff", "president", "admin", "sysadmin"]}>
      <div className="mx-auto max-w-7xl px-4 py-16">{children}</div>
    </AuthGuard>
  );
}
