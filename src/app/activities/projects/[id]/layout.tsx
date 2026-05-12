import type { Metadata } from "next";
import { activitiesApi } from "@/lib/bkend";

interface Props {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

/** 학회 프로젝트 상세 동적 OG metadata (Sprint 67-AR — SEO 보강) */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const project = (await activitiesApi.get(id)) as unknown as {
      title?: string;
      description?: string;
      summary?: string;
      thumbnailUrl?: string;
    };
    const desc =
      (project.description ?? project.summary ?? "")
        .replace(/<[^>]+>/g, "")
        .slice(0, 140) || "연세교육공학회 프로젝트";
    return {
      title: project.title
        ? `${project.title} · 프로젝트 · 연세교육공학회`
        : "프로젝트 · 연세교육공학회",
      description: desc,
      openGraph: {
        title: project.title ?? "연세교육공학회 프로젝트",
        description: desc,
        images: project.thumbnailUrl ? [project.thumbnailUrl] : undefined,
        type: "article",
      },
      twitter: {
        card: project.thumbnailUrl ? "summary_large_image" : "summary",
        title: project.title ?? "연세교육공학회 프로젝트",
        description: desc,
        images: project.thumbnailUrl ? [project.thumbnailUrl] : undefined,
      },
    };
  } catch {
    return {
      title: "프로젝트 · 연세교육공학회",
      description: "연세교육공학회 프로젝트 안내",
    };
  }
}

export default function ProjectLayout({ children }: Props) {
  return <>{children}</>;
}
