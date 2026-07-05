import type { Metadata } from "next";
import { labsApi } from "@/lib/bkend";

interface Props {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

/** 연구실 상세 동적 OG metadata (Sprint 67-AR — SEO 보강) */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    // QA-v3 L: Lab 실존 필드는 title·ownerName (name/advisor 는 오참조 — 메타가 항상 비어 있었음)
    const lab = (await labsApi.get(id)) as unknown as {
      title?: string;
      description?: string;
      ownerName?: string;
      thumbnailUrl?: string;
    };
    const meta = [lab.ownerName && `제안: ${lab.ownerName}`].filter(Boolean).join(" · ");
    const desc =
      (lab.description ?? meta ?? "")
        .replace(/<[^>]+>/g, "")
        .slice(0, 140) || "연세교육공학회 실험실";
    return {
      title: lab.title ? `${lab.title} · 실험실 · 연세교육공학회` : "실험실 · 연세교육공학회",
      description: desc,
      openGraph: {
        title: lab.title ?? "연세교육공학회 실험실",
        description: desc,
        images: lab.thumbnailUrl ? [lab.thumbnailUrl] : undefined,
        type: "article",
      },
      twitter: {
        card: lab.thumbnailUrl ? "summary_large_image" : "summary",
        title: lab.title ?? "연세교육공학회 실험실",
        description: desc,
        images: lab.thumbnailUrl ? [lab.thumbnailUrl] : undefined,
      },
    };
  } catch {
    return {
      title: "연구실 · 연세교육공학회",
      description: "연세교육공학회 연구실 안내",
    };
  }
}

export default function LabLayout({ children }: Props) {
  return <>{children}</>;
}
