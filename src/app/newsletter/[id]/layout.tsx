import type { Metadata } from "next";
import { getAdminDb } from "@/lib/firebase-admin";

interface Props {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

/**
 * 학회보 상세 동적 OG metadata (Sprint 67-AR — SEO 보강).
 * 전용 API 가 없어 Firestore Admin SDK 로 직접 조회.
 */
async function fetchIssue(id: string): Promise<{
  title?: string;
  subtitle?: string;
  thumbnailUrl?: string;
} | null> {
  try {
    const db = getAdminDb();
    // 컬렉션명은 newsletter_issues 또는 newsletters 양쪽 시도
    let snap = await db.collection("newsletter_issues").doc(id).get();
    if (!snap.exists) {
      snap = await db.collection("newsletters").doc(id).get();
    }
    if (!snap.exists) return null;
    return snap.data() as {
      title?: string;
      subtitle?: string;
      thumbnailUrl?: string;
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const issue = await fetchIssue(id);
  if (!issue) {
    return {
      title: "학회보 · 연세교육공학회",
      description: "연세교육공학회 학회보",
    };
  }
  const title = issue.title ?? "학회보";
  const desc = issue.subtitle ?? "연세교육공학회 학회보";
  return {
    title: `${title} · 학회보 · 연세교육공학회`,
    description: desc,
    openGraph: {
      title,
      description: desc,
      images: issue.thumbnailUrl ? [issue.thumbnailUrl] : undefined,
      type: "article",
    },
    twitter: {
      card: issue.thumbnailUrl ? "summary_large_image" : "summary",
      title,
      description: desc,
      images: issue.thumbnailUrl ? [issue.thumbnailUrl] : undefined,
    },
  };
}

export default function NewsletterIssueLayout({ children }: Props) {
  return <>{children}</>;
}
