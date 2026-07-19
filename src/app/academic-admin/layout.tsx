// v8-H4 정리: 하위 라우트가 모두 /console/academic/* 로 리다이렉트되는 스텁이므로
// 레이아웃은 AuthGuard/외곽 없이 즉시 통과시켜 리다이렉트를 지연 없이 실행한다.
export default function AcademicAdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
