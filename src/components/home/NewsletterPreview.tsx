"use client";

import Link from "next/link";
import { useNewsletters } from "@/features/newsletter/newsletter-store";
import { formatDate } from "@/lib/utils";
import { Newspaper, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewsletterPreview() {
  const { issues, isLoading } = useNewsletters();
  const published = issues
    .filter((i) => i.status === "published")
    .slice(0, 3);

  return (
    <section className="border-b py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Newspaper size={20} className="text-blue-600" />
            <h2 className="text-xl font-bold">연세교육공학회보</h2>
          </div>
          <Link
            href="/newsletter"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            더보기 <ArrowRight size={14} />
          </Link>
        </div>
        <div className="mt-4 divide-y rounded-xl border bg-white">
          {isLoading ? (
            <div className="space-y-2 px-5 py-3" aria-busy="true" aria-label="학회보 불러오는 중">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded" />
              ))}
            </div>
          ) : published.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              발행된 학회보가 없습니다.
            </div>
          ) : (
            published.map((issue) => (
              <Link
                key={issue.id}
                href="/newsletter"
                className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-muted/30"
              >
                <div className="min-w-0">
                  <span className="truncate font-medium">{issue.title}</span>
                  {issue.subtitle && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {issue.subtitle}
                    </p>
                  )}
                </div>
                <span className="shrink-0 pl-4 text-xs text-muted-foreground">
                  {formatDate(issue.publishDate)}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
