import type { Metadata } from "next";
import { postsApi } from "@/lib/bkend";

interface Props {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

/**
 * 게시글 상세 동적 OG metadata (Sprint 67-AR — SEO 보강)
 * Sub-layout pattern: page.tsx가 "use client" 인 경우 metadata는 형제 layout.tsx 에서 노출.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const post = (await postsApi.get(id)) as unknown as {
      title?: string;
      content?: string;
      category?: string;
    };
    const plain = (post.content ?? "").replace(/<[^>]+>/g, "").trim();
    const desc = plain.slice(0, 140) || "연세교육공학회 게시글";
    return {
      title: post.title ? `${post.title} · 연세교육공학회` : "게시글 · 연세교육공학회",
      description: desc,
      openGraph: {
        title: post.title ?? "연세교육공학회 게시글",
        description: desc,
        type: "article",
      },
      twitter: {
        card: "summary",
        title: post.title ?? "연세교육공학회 게시글",
        description: desc,
      },
    };
  } catch {
    return {
      title: "게시글 · 연세교육공학회",
      description: "연세교육공학회 게시글",
    };
  }
}

export default function BoardPostLayout({ children }: Props) {
  return <>{children}</>;
}
