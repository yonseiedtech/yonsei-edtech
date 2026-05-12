import type { Metadata } from "next";
import { activitiesApi } from "@/lib/bkend";

interface Props {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

/** 스터디 상세 동적 OG metadata (Sprint 67-AR — SEO 보강) */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const study = (await activitiesApi.get(id)) as unknown as {
      title?: string;
      description?: string;
      summary?: string;
      thumbnailUrl?: string;
    };
    const desc =
      (study.description ?? study.summary ?? "")
        .replace(/<[^>]+>/g, "")
        .slice(0, 140) || "연세교육공학회 스터디";
    return {
      title: study.title
        ? `${study.title} · 스터디 · 연세교육공학회`
        : "스터디 · 연세교육공학회",
      description: desc,
      openGraph: {
        title: study.title ?? "연세교육공학회 스터디",
        description: desc,
        images: study.thumbnailUrl ? [study.thumbnailUrl] : undefined,
        type: "article",
      },
      twitter: {
        card: study.thumbnailUrl ? "summary_large_image" : "summary",
        title: study.title ?? "연세교육공학회 스터디",
        description: desc,
        images: study.thumbnailUrl ? [study.thumbnailUrl] : undefined,
      },
    };
  } catch {
    return {
      title: "스터디 · 연세교육공학회",
      description: "연세교육공학회 스터디 안내",
    };
  }
}

export default function StudyLayout({ children }: Props) {
  return <>{children}</>;
}
