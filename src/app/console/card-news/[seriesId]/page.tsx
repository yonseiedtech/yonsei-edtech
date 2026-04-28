import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Layers, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import CardSlider from "@/features/card-news/CardSlider";
import { loadSeries } from "@/features/card-news/loader";

interface PageProps {
  params: Promise<{ seriesId: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps) {
  const { seriesId } = await params;
  const series = await loadSeries(seriesId);
  return {
    title: series ? `${series.title} | 카드뉴스` : "카드뉴스",
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function CardNewsDetailPage({ params }: PageProps) {
  const { seriesId } = await params;
  const series = await loadSeries(seriesId);
  if (!series) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/console/card-news"
          className="mb-3 -ml-2 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          카드뉴스 목록
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {series.category && (
            <Badge variant="secondary" className="text-xs">
              {series.category}
            </Badge>
          )}
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {formatDate(series.publishedAt)}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Layers className="h-3 w-3" />
            {series.cards.length}장
          </span>
        </div>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {series.title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              {series.description}
            </p>
          </div>
          <Link
            href={`/console/card-news/${series.id}/edit`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium shadow-sm transition hover:bg-muted"
          >
            <Pencil className="h-3.5 w-3.5" />
            편집
          </Link>
        </div>
      </div>

      <CardSlider cards={series.cards} seriesId={series.id} />
    </div>
  );
}
