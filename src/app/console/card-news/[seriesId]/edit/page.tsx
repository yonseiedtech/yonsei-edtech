import { notFound } from "next/navigation";
import { loadSeries } from "@/features/card-news/loader";
import CardNewsEditor from "@/features/card-news/CardNewsEditor";
import type { CardNewsSeries } from "@/features/card-news/types";
import { todayYmdKst } from "@/lib/dday";

interface PageProps {
  params: Promise<{ seriesId: string }>;
}

export const dynamic = "force-dynamic";
export const metadata = { title: "카드뉴스 편집 | 운영콘솔" };

// Sprint 69: KST 자정~09:00 사이 발행 시 어제 날짜로 기록되는 UTC drift 픽스
const TODAY = () => todayYmdKst();

function newSeries(): CardNewsSeries {
  const id = `draft-${Date.now().toString(36)}`;
  return {
    id,
    title: "새 카드뉴스",
    description: "",
    publishedAt: TODAY(),
    category: "공지",
    cards: [
      {
        id: "01-cover",
        kind: "cover",
        title: "표지\n타이틀",
        badge: TODAY().slice(0, 7),
        body: "yonsei-edtech.vercel.app",
        english: "Yonsei Educational Technology",
      },
    ],
  };
}

export default async function CardNewsEditPage({ params }: PageProps) {
  const { seriesId } = await params;
  let initial: CardNewsSeries;
  let isNew = false;

  if (seriesId === "new") {
    initial = newSeries();
    isNew = true;
  } else {
    const loaded = await loadSeries(seriesId);
    if (!loaded) notFound();
    initial = loaded;
  }

  return <CardNewsEditor initial={initial} isNew={isNew} />;
}
