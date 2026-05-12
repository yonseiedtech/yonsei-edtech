import type { Metadata } from "next";
import { alumniThesesApi } from "@/lib/bkend";

interface Props {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

/**
 * 졸업생 학위논문 상세 동적 OG metadata (Sprint 67-AR — SEO 보강)
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const thesis = (await alumniThesesApi.get(id)) as unknown as {
      title?: string;
      titleKo?: string;
      abstract?: string;
      authorName?: string;
      year?: number;
      degreeType?: string;
    };
    const title = thesis.titleKo ?? thesis.title ?? "졸업생 학위논문";
    const author = thesis.authorName ?? "";
    const yearStr = thesis.year ? `${thesis.year}` : "";
    const degree = thesis.degreeType ? `${thesis.degreeType} 학위논문` : "학위논문";
    const meta = [author, yearStr, degree].filter(Boolean).join(" · ");
    const desc = (thesis.abstract ?? meta).slice(0, 140) || "연세교육공학회 졸업생 학위논문";
    return {
      title: `${title} · 연세교육공학회`,
      description: desc,
      openGraph: {
        title,
        description: desc,
        type: "article",
      },
      twitter: {
        card: "summary",
        title,
        description: desc,
      },
    };
  } catch {
    return {
      title: "졸업생 학위논문 · 연세교육공학회",
      description: "연세교육공학회 졸업생 학위논문",
    };
  }
}

export default function AlumniThesisLayout({ children }: Props) {
  return <>{children}</>;
}
