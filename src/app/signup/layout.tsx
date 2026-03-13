import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "회원가입",
  description: "연세교육공학회 회원가입 페이지입니다.",
  robots: { index: false, follow: false },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
