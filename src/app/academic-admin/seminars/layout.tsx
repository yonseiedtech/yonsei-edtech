// v8-H4 정리: 하위 세미나 라우트가 모두 리다이렉트 스텁이므로 탭 네비 없이 통과시킨다.
export default function SeminarsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
