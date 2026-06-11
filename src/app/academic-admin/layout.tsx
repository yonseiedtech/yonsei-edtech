/**
 * /academic-admin/* — 운영진 학술관리 라우트 wrapper.
 *
 * 이전: 순수 passthrough — 외곽 컨테이너가 없어 직접 접근 시 페이지마다
 *       본문 폭·여백이 제각각이었다.
 * 수정(2026-06-11 여백 통일): 콘솔 쉘과 동일한 외곽 규격(max-w-7xl px-4 py-16) 제공.
 *       /console/academic/* 재export 경로는 본 layout 을 타지 않으므로 이중 적용 없음.
 */

export default function AcademicAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="mx-auto max-w-7xl px-4 py-16">{children}</div>;
}
