import type { Metadata } from "next";
import { getProjectedProfile } from "@/lib/public-profile";
import type { User } from "@/types";
import ProfileDetailView from "@/components/profile/ProfileDetailView";
import { BreadcrumbListJsonLd } from "@/components/seo/JsonLd";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    // P1-1: users 공개 get 차단 — 서버 투영(비민감 필드)으로 대체
    const user = (await getProjectedProfile(id, null, null)) as User | null;
    if (!user) throw new Error("not found");
    const desc = user.bio?.slice(0, 100) ?? "연세교육공학회 회원 프로필";
    return {
      title: `${user.name} · 연세교육공학회`,
      description: desc,
      openGraph: {
        title: user.name,
        description: desc,
        images: user.profileImage ? [user.profileImage] : undefined,
        type: "profile",
      },
    };
  } catch {
    return {
      title: "회원 프로필 · 연세교육공학회",
      description: "연세교육공학회 회원 프로필",
    };
  }
}

export default async function ProfilePage({ params }: PageProps) {
  const { id } = await params;
  let initialOwner: User | null = null;
  try {
    // P1-1: 비로그인 수준 투영 — 로그인 뷰어의 연락처 가시성은 클라이언트 refetch 가 상향
    initialOwner = (await getProjectedProfile(id, null, null)) as User | null;
  } catch {
    initialOwner = null;
  }
  return (
    <>
      <BreadcrumbListJsonLd
        items={[
          { name: "홈", href: "/" },
          { name: "멤버 소개", href: "/members" },
          {
            name: initialOwner?.name ?? "회원 프로필",
            href: `/profile/${id}`,
          },
        ]}
      />
      <ProfileDetailView ownerId={id} initialOwner={initialOwner} />
    </>
  );
}
