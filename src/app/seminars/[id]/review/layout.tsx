import type { Metadata } from "next";
import { seminarsApi } from "@/lib/bkend";

interface Props {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

/**
 * 세미나 후기 작성 동적 OG metadata (Sprint 67-AR — SEO 보강)
 *
 * 후기 작성 페이지는 회원이 SNS 에 공유할 가능성이 있어 세미나 메타 노출.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const seminar = (await seminarsApi.get(id)) as unknown as {
      title?: string;
      description?: string;
      thumbnailUrl?: string;
    };
    const desc = `${seminar.title ?? "세미나"} 후기 작성 페이지`;
    return {
      title: seminar.title
        ? `${seminar.title} 후기 작성 · 연세교육공학회`
        : "세미나 후기 · 연세교육공학회",
      description: desc,
      openGraph: {
        title: seminar.title ?? "연세교육공학회 세미나 후기",
        description: desc,
        images: seminar.thumbnailUrl ? [seminar.thumbnailUrl] : undefined,
        type: "article",
      },
      twitter: {
        card: seminar.thumbnailUrl ? "summary_large_image" : "summary",
        title: seminar.title ?? "연세교육공학회 세미나 후기",
        description: desc,
        images: seminar.thumbnailUrl ? [seminar.thumbnailUrl] : undefined,
      },
    };
  } catch {
    return {
      title: "세미나 후기 · 연세교육공학회",
      description: "연세교육공학회 세미나 후기 작성",
    };
  }
}

export default function SeminarReviewLayout({ children }: Props) {
  return <>{children}</>;
}
