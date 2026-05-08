/**
 * /academic-admin/* — 운영진 학술관리 라우트 wrapper.
 *
 * 이전: 무조건 /console/academic/manage 로 redirect (모든 하위 경로 차단됨)
 * 수정: passthrough — /academic-admin/external/[id]/program 등 하위 페이지 정상 접근
 *
 * 콘솔 메인 진입은 /console/academic/manage 가 별도로 안내함.
 */

export default function AcademicAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
