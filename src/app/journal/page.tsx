"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Search, Filter } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import PageContainer from "@/components/ui/page-container";
import PageHeader from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/ui/empty-state";
import {
  usePublishedIssues,
  usePublicArticles,
  useSocietyArticles,
} from "@/features/journal/api/useJournal";
import {
  PublicationTypeBadge,
} from "@/features/journal/components/JournalArticleStatusBadge";
import { formatIssueCode } from "@/features/journal/lib/article-status";
import type { PublicationType } from "@/types";

export default function JournalIndexPage() {
  const { user } = useAuthStore();
  const isAuthed = !!user?.id;

  const { data: issues = [] } = usePublishedIssues();
  const { data: publicArticles = [] } = usePublicArticles();
  const { data: societyArticles = [] } = useSocietyArticles(isAuthed);
  const articles = isAuthed ? societyArticles : publicArticles;

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<PublicationType | "all">("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return articles.filter((a) => {
      if (typeFilter !== "all" && a.publicationType !== typeFilter) return false;
      if (!q) return true;
      return (
        a.titleKo.toLowerCase().includes(q) ||
        a.titleEn?.toLowerCase().includes(q) ||
        a.keywordsKo.some((k) => k.toLowerCase().includes(q)) ||
        a.authors.some((au) => au.displayName.toLowerCase().includes(q))
      );
    });
  }, [articles, search, typeFilter]);

  return (
    <PageContainer>
      <PageHeader
        icon={BookOpen}
        title="연구지 (Research Journal)"
        description="연세교육공학회의 공식 학술 출판물. 정식 연구지 호수와 워킹 페이퍼를 한 곳에서 확인하세요."
      />

      {/* 호수 발간 카드 */}
      {issues.length > 0 && (
        <section className="mb-10 space-y-3">
          <h2 className="text-lg font-semibold">최근 호수</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {issues.slice(0, 6).map((issue) => (
              <Link key={issue.id} href={`/journal/issues/${issue.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">
                      {issue.year}
                      {issue.season ? ` · ${issue.season}` : ""}
                    </p>
                    <p className="text-lg font-semibold">
                      {formatIssueCode(issue.volume, issue.number)}
                    </p>
                    <p className="mt-1 text-sm">
                      {issue.title ??
                        `연세 교육공학 연구 ${formatIssueCode(issue.volume, issue.number)}`}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {issue.articleIds.length}편 수록
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 검색·필터 */}
      <section className="mb-4 space-y-3">
        <h2 className="text-lg font-semibold">발간 논문</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="제목·키워드·저자 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-muted-foreground" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as PublicationType | "all")}
              className="rounded border border-muted px-2 py-2 text-sm"
            >
              <option value="all">전체 트랙</option>
              <option value="journal">정식 연구지</option>
              <option value="working_paper">워킹 페이퍼</option>
              <option value="note">리서치 노트</option>
            </select>
          </div>
        </div>
      </section>

      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={
            articles.length === 0
              ? "아직 발간된 논문이 없습니다"
              : "조건에 맞는 논문이 없습니다"
          }
          description={
            articles.length === 0
              ? "연구팀이 출판 마법사로 첫 논문을 발간하면 여기에 표시됩니다."
              : "검색어나 트랙 필터를 변경해보세요."
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((article) => (
            <Link key={article.id} href={`/journal/articles/${article.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <PublicationTypeBadge type={article.publicationType} size="sm" />
                    {article.publishedAt && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(article.publishedAt).toLocaleDateString("ko-KR")}
                      </span>
                    )}
                    {article.doi && (
                      <Badge variant="outline" className="text-xs">
                        DOI: {article.doi}
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-base font-semibold">{article.titleKo}</h3>
                  <p className="text-xs text-muted-foreground">
                    {article.authors
                      .slice(0, 3)
                      .map((a) => a.displayName)
                      .join(", ")}
                    {article.authors.length > 3 && ` 외 ${article.authors.length - 3}명`}
                  </p>
                  {article.abstractKo && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {article.abstractKo}
                    </p>
                  )}
                  {article.keywordsKo.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {article.keywordsKo.slice(0, 5).join(" · ")}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
