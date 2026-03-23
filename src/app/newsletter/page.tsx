"use client";

import Link from "next/link";
import { useNewsletters, SECTION_TYPE_LABELS } from "@/features/newsletter/newsletter-store";
import type { NewsletterIssue } from "@/features/newsletter/newsletter-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Newspaper, ChevronRight, PenSquare } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { cn } from "@/lib/utils";

function IssueCard({ issue }: { issue: NewsletterIssue }) {
  return (
    <div className="group overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* 표지 */}
      <div
        className={cn(
          "relative flex h-48 flex-col justify-end bg-gradient-to-br p-6 text-white",
          issue.coverColor
        )}
      >
        <p className="text-xs font-medium uppercase tracking-widest opacity-80">
          vol. {issue.issueNumber}
        </p>
        <h3 className="mt-1 text-xl font-bold leading-snug">{issue.title}</h3>
        <p className="mt-1 text-sm opacity-90">{issue.subtitle}</p>
      </div>

      {/* 목차 미리보기 */}
      <div className="p-5">
        <div className="space-y-2">
          {issue.sections
            .sort((a, b) => a.order - b.order)
            .slice(0, 3)
            .map((section) => (
              <div key={section.id} className="flex items-center gap-2 text-sm">
                <Badge variant="secondary" className="shrink-0 text-[10px]">
                  {SECTION_TYPE_LABELS[section.type]}
                </Badge>
                <span className="truncate text-muted-foreground">
                  {section.title}
                </span>
              </div>
            ))}
          {issue.sections.length > 3 && (
            <p className="text-xs text-muted-foreground">
              +{issue.sections.length - 3}개 더...
            </p>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {issue.publishDate} · {issue.editorName}
          </span>
          <ChevronRight
            size={16}
            className="text-muted-foreground transition-transform group-hover:translate-x-1"
          />
        </div>
      </div>
    </div>
  );
}

export default function NewsletterPage() {
  const { issues, isLoading } = useNewsletters();
  const { user } = useAuthStore();
  const canEdit = isAtLeast(user, "staff");

  const publishedIssues = issues.filter((i) => i.status === "published");

  return (
    <div className="py-16">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Newspaper size={28} className="text-violet-600" />
            <h1 className="text-3xl font-bold">연세교육공학회보</h1>
          </div>
          {canEdit && (
            <Link href="/newsletter/edit">
              <Button size="sm">
                <PenSquare size={16} className="mr-1" />
                학회보 편집
              </Button>
            </Link>
          )}
        </div>
        <p className="mt-2 text-muted-foreground">
          연세교육공학회의 학술 활동과 소식을 담은 정기 간행물입니다.
        </p>

        {isLoading ? (
          <div className="mt-12 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : publishedIssues.length === 0 ? (
          <div className="mt-12 text-center text-muted-foreground">
            아직 발행된 학회보가 없습니다.
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {publishedIssues.map((issue) => (
              <Link key={issue.id} href={`/newsletter/${issue.id}`} className="text-left">
                <IssueCard issue={issue} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
