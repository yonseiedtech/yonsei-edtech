import type { Metadata } from "next";
import { progressMeetingsApi } from "@/lib/bkend";

interface Props {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

/** 진행상황 회의 상세 동적 OG metadata (Sprint 67-AR — SEO 보강) */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const meeting = (await progressMeetingsApi.get(id)) as unknown as {
      title?: string;
      agenda?: string;
      notes?: string;
      date?: string;
    };
    const desc =
      (meeting.agenda ?? meeting.notes ?? "")
        .replace(/<[^>]+>/g, "")
        .slice(0, 140) || "연세교육공학회 진행상황 회의";
    return {
      title: meeting.title
        ? `${meeting.title} · 진행상황 회의 · 연세교육공학회`
        : "진행상황 회의 · 연세교육공학회",
      description: desc,
      openGraph: {
        title: meeting.title ?? "연세교육공학회 진행상황 회의",
        description: desc,
        type: "article",
      },
      twitter: {
        card: "summary",
        title: meeting.title ?? "연세교육공학회 진행상황 회의",
        description: desc,
      },
    };
  } catch {
    return {
      title: "진행상황 회의 · 연세교육공학회",
      description: "연세교육공학회 진행상황 회의록",
    };
  }
}

export default function ProgressMeetingLayout({ children }: Props) {
  return <>{children}</>;
}
