import type { Metadata } from "next";
import { profilesApi } from "@/lib/bkend";
import type { User } from "@/types";
import ProfileDetailView from "@/components/profile/ProfileDetailView";
import { BreadcrumbListJsonLd } from "@/components/seo/JsonLd";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const user = (await profilesApi.get(id)) as unknown as User;
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
    initialOwner = (await profilesApi.get(id)) as unknown as User;
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
