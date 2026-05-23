import type { Metadata } from "next";
import { alumniThesesApi } from "@/lib/bkend";
import { AlumniThesisJsonLd } from "@/components/seo/JsonLd";

interface Props {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

/**
 * 졸업생 학위논문 상세 동적 OG metadata + ScholarlyArticle JSON-LD
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

type ThesisLd = {
  id: string;
  title?: string;
  titleKo?: string;
  abstract?: string;
  authorName?: string;
  year?: number;
  degreeType?: string;
  keywords?: string[];
  advisor?: string;
};

export default async function AlumniThesisDetailLayout({ params, children }: Props) {
  const { id } = await params;
  let thesisLd: ThesisLd | null = null;

  try {
    const data = (await alumniThesesApi.get(id)) as unknown as Record<string, unknown> | null;
    thesisLd = data ? ({ ...data, id } as ThesisLd) : null;
  } catch {
    // Firestore unavailable — skip JSON-LD
  }

  return (
    <>
      {thesisLd && <AlumniThesisJsonLd thesis={thesisLd} />}
      {children}
    </>
  );
}
