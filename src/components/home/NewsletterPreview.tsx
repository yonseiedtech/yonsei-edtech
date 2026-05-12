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
    <section className="border-b py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <Newspaper size={18} aria-hidden />
            </div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">연세교육공학회보</h2>
          </div>
          <Link
            href="/newsletter"
            className="group inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
          >
            더보기
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <div className="mt-5 divide-y rounded-2xl border bg-card shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="space-y-2 px-5 py-4" aria-busy="true" aria-label="학회보 불러오는 중">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded" />
              ))}
            </div>
          ) : published.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              아직 발행된 학회보가 없습니다.
            </div>
          ) : (
            published.map((issue) => (
              <Link
                key={issue.id}
                href="/newsletter"
                className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:bg-muted/40"
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
