import type { Metadata } from "next";
import { activitiesApi } from "@/lib/bkend";

interface Props {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

/**
 * 외부 학술대회 상세 동적 OG metadata (Sprint 67-AR — SEO 보강)
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const activity = (await activitiesApi.get(id)) as unknown as {
      title?: string;
      description?: string;
      summary?: string;
      thumbnailUrl?: string;
    };
    const desc =
      (activity.description ?? activity.summary ?? "")
        .replace(/<[^>]+>/g, "")
        .slice(0, 140) || "연세교육공학회 학술 활동";
    return {
      title: activity.title
        ? `${activity.title} · 학술대회 프로그램`
        : "학술대회 프로그램 · 연세교육공학회",
      description: desc,
      openGraph: {
        title: activity.title ?? "연세교육공학회 학술대회",
        description: desc,
        images: activity.thumbnailUrl ? [activity.thumbnailUrl] : undefined,
        type: "article",
      },
      twitter: {
        card: activity.thumbnailUrl ? "summary_large_image" : "summary",
        title: activity.title ?? "연세교육공학회 학술대회",
        description: desc,
        images: activity.thumbnailUrl ? [activity.thumbnailUrl] : undefined,
      },
    };
  } catch {
    return {
      title: "학술대회 프로그램 · 연세교육공학회",
      description: "연세교육공학회 학술대회 프로그램",
    };
  }
}

export default function ExternalActivityLayout({ children }: Props) {
  return <>{children}</>;
}
