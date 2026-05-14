import Link from "next/link";
import { Images, Calendar } from "lucide-react";
import { loadAllSeries } from "@/features/card-news/loader";
import PageHeader from "@/components/ui/page-header";
import EmptyState from "@/components/ui/empty-state";

export const metadata = {
  title: "카드뉴스 — 연세교육공학회",
  description:
    "학회 운영·연구·활동 소식을 카드뉴스 형식으로 소개합니다. 각 시리즈를 클릭하면 전체 카드를 확인할 수 있습니다.",
};

export const dynamic = "force-dynamic";

export default async function CardNewsIndexPage() {
  const series = await loadAllSeries();

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <PageHeader
        icon={Images}
        title="카드뉴스"
        description="학회 운영·연구·활동 소식을 카드 형식으로 정리해 소개합니다."
      />

      {series.length === 0 ? (
        <div className="mt-10 rounded-2xl border bg-card p-6">
          <EmptyState
            icon={Images}
            title="아직 발행된 카드뉴스가 없습니다"
            description="첫 시리즈가 발행되면 본 페이지에 표시됩니다."
          />
        </div>
      ) : (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {series.map((s) => {
            const cover = s.cards.find((c) => c.kind === "cover") ?? s.cards[0];
            return (
              <li key={s.id}>
                <Link
                  href={`/card-news/${encodeURIComponent(s.id)}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {/* 표지 미리보기 — 카드뉴스 디자인 톤(브랜드 그라데이션) */}
                  <div className="relative flex aspect-square items-center justify-center bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6">
                    {s.category && (
                      <span className="absolute left-4 top-4 rounded-full bg-card/80 px-2.5 py-0.5 text-[10px] font-semibold text-foreground backdrop-blur-sm">
                        {s.category}
                      </span>
                    )}
                    <div className="text-center">
                      {cover?.badge && (
                        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-primary">
                          {cover.badge}
                        </p>
                      )}
                      <h3 className="whitespace-pre-line text-lg font-bold leading-tight tracking-tight text-foreground sm:text-xl">
                        {cover?.title ?? s.title}
                      </h3>
                      {cover?.english && (
                        <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                          {cover.english}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* 메타 정보 */}
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <h4 className="text-sm font-bold tracking-tight transition-colors group-hover:text-primary">
                      {s.title}
                    </h4>
                    <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {s.description}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-2 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={11} />
                        {s.publishedAt}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5">
                        {s.cards.length}장
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
