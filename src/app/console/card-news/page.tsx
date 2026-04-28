import Link from "next/link";
import { ArrowRight, Calendar, Images, Layers } from "lucide-react";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardArtFit } from "@/features/card-news/CardArtFit";
import { CARD_NEWS_SERIES } from "@/features/card-news/series";

export const metadata = {
  title: "카드뉴스 | 운영콘솔",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function CardNewsListPage() {
  const series = [...CARD_NEWS_SERIES].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        title="카드뉴스 이력"
        description="발행한 카드뉴스 시리즈 목록입니다. 인스타그램 스타일 슬라이드로 확인하고 PNG로 내려받을 수 있습니다."
        icon={Images}
      />

      {series.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
            <Images className="h-10 w-10 opacity-40" />
            <p className="text-sm">아직 발행된 카드뉴스가 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {series.map((s) => {
            const cover = s.cards[0];
            return (
              <Card
                key={s.id}
                className="flex flex-col overflow-hidden p-0 transition hover:shadow-md"
              >
                <Link
                  href={`/console/card-news/${s.id}`}
                  aria-label={`${s.title} 슬라이드 보기`}
                  className="block border-b bg-muted/40"
                >
                  {cover ? (
                    <CardArtFit spec={cover} />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center text-muted-foreground">
                      <Images className="h-10 w-10 opacity-40" />
                    </div>
                  )}
                </Link>
                <CardHeader className="space-y-2 px-5 pt-5">
                  <div className="flex items-center justify-between gap-2">
                    {s.category && (
                      <Badge variant="secondary" className="text-xs">
                        {s.category}
                      </Badge>
                    )}
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(s.publishedAt)}
                    </span>
                  </div>
                  <CardTitle className="text-lg leading-snug">
                    {s.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between gap-4 px-5 pb-5">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {s.description}
                  </p>
                  <div className="flex items-center justify-between gap-2 pt-2">
                    <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <Layers className="h-3 w-3" />
                      {s.cards.length}장
                    </span>
                    <Link
                      href={`/console/card-news/${s.id}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
                    >
                      슬라이드 보기
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
