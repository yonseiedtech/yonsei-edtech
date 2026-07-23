import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "갤러리 | 연세교육공학회",
  description:
    "연세교육공학회 활동과 행사 사진을 모아볼 수 있는 갤러리입니다.",
  openGraph: {
    title: "갤러리 | 연세교육공학회",
    description: "연세교육공학회 활동과 행사 사진을 모아볼 수 있는 갤러리입니다.",
    url: "https://yonsei-edtech.vercel.app/gallery",
    siteName: "연세교육공학회",
  },
};

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
