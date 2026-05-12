import type { Metadata } from "next";
import { seminarsApi } from "@/lib/bkend";

interface Props {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

/**
 * 세미나 상세 동적 OG metadata (Sprint 67-AR — SEO 보강)
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const seminar = (await seminarsApi.get(id)) as unknown as {
      title?: string;
      description?: string;
      summary?: string;
      thumbnailUrl?: string;
    };
    const desc =
      (seminar.description ?? seminar.summary ?? "")
        .replace(/<[^>]+>/g, "")
        .slice(0, 140) || "연세교육공학회 세미나";
    return {
      title: seminar.title ? `${seminar.title} · 세미나` : "세미나 · 연세교육공학회",
      description: desc,
      openGraph: {
        title: seminar.title ?? "연세교육공학회 세미나",
        description: desc,
        images: seminar.thumbnailUrl ? [seminar.thumbnailUrl] : undefined,
        type: "article",
      },
      twitter: {
        card: seminar.thumbnailUrl ? "summary_large_image" : "summary",
        title: seminar.title ?? "연세교육공학회 세미나",
        description: desc,
        images: seminar.thumbnailUrl ? [seminar.thumbnailUrl] : undefined,
      },
    };
  } catch {
    return {
      title: "세미나 · 연세교육공학회",
      description: "연세교육공학회 세미나",
    };
  }
}

export default function SeminarLayout({ children }: Props) {
  return <>{children}</>;
}
