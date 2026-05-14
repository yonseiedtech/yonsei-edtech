import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar } from "lucide-react";
import { loadSeries } from "@/features/card-news/loader";
import { CardArt } from "@/features/card-news/art";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const s = await loadSeries(id);
  if (!s) return { title: "카드뉴스 — 연세교육공학회" };
  return {
    title: `${s.title} — 연세교육공학회 카드뉴스`,
    description: s.description,
  };
}

export default async function CardNewsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const series = await loadSeries(id);
  if (!series) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <Link
        href="/card-news"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={12} /> 카드뉴스 목록
      </Link>

      <div className="mt-4 mb-8 space-y-2 border-b pb-6">
        {series.category && (
          <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
            {series.category}
          </span>
        )}
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {series.title}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {series.description}
        </p>
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Calendar size={11} />
          {series.publishedAt} · 총 {series.cards.length}장
        </p>
      </div>

      {/* 카드 슬라이드 (세로 스크롤) */}
      <ol className="space-y-6">
        {series.cards.map((card, i) => (
          <li
            key={card.id}
            className="rounded-2xl border bg-card p-1 shadow-sm"
            aria-label={`${i + 1} / ${series.cards.length}`}
          >
            <div className="aspect-square w-full overflow-hidden rounded-xl">
              <CardArt spec={card} />
            </div>
            <p className="px-3 py-2 text-center text-[11px] text-muted-foreground">
              {i + 1} / {series.cards.length}
            </p>
          </li>
        ))}
      </ol>

      <p className="mt-10 rounded-lg border border-dashed bg-muted/10 p-3 text-[11px] leading-relaxed text-muted-foreground">
        본 카드뉴스는 연세교육공학회 운영진이 제작한 학회 공식 콘텐츠입니다. 외부 공유 시 출처를 명시해 주세요.
      </p>
    </main>
  );
}
