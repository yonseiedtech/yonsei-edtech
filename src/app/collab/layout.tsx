import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "공동연구",
  description:
    "회원 간 공동 연구 프로젝트를 탐색하고 협력자를 모집할 수 있습니다.",
};

export default function CollabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
