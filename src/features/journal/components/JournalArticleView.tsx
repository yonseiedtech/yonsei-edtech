"use client";

import { useEffect, useMemo } from "react";
import Script from "next/script";
import { BookOpen, Download, Crown, Star, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ReviewStatusBadge,
  VisibilityBadge,
  PublicationTypeBadge,
} from "./JournalArticleStatusBadge";
import { CREDIT_ROLE_LABELS } from "@/features/collaborative-research/lib/credit-roles";
import {
  formatArticleCitation,
  formatWorkingPaperCitation,
  renderBibliography,
} from "../lib/apa7";
import { articleJsonLdString } from "../lib/json-ld";
import { formatIssueCode } from "../lib/article-status";
import { journalArticlesApi } from "@/lib/bkend";
import type { ResearchJournalArticle, ResearchJournalIssue } from "@/types";

interface Props {
  article: ResearchJournalArticle;
  issue?: ResearchJournalIssue;
  /** 비로그인 가능 — 인증/멤버 분기는 호출자가 처리. */
  isAuthenticated: boolean;
  currentUserId?: string;
}

export default function JournalArticleView({
  article,
  issue,
  isAuthenticated,
  currentUserId,
}: Props) {
  const isPublished = article.reviewStatus === "published";
  const isPublic = article.visibility === "public" && isPublished;

  // 조회수 +1 (페이지 진입 1회) — public/society 발간 한정
  useEffect(() => {
    if (!isPublished) return;
    void journalArticlesApi.incrementView(article.id).catch(() => undefined);
  }, [article.id, isPublished]);

  const citation = useMemo(() => {
    if (article.publicationType === "journal" && issue) {
      return formatArticleCitation(article, issue);
    }
    return formatWorkingPaperCitation(article);
  }, [article, issue]);

  const bibliography = useMemo(
    () => renderBibliography(article.citations ?? []),
    [article.citations],
  );

  return (
    <article className="space-y-8">
      {/* JSON-LD ScholarlyArticle — public 발간만 SEO 노출 */}
      {isPublic && (
        <Script
          id={`jsonld-article-${article.id}`}
          type="application/ld+json"
          // dangerouslySetInnerHTML 으로 head 가 아닌 inline. Next.js 가 SSR 시 본문에 삽입.
          // strategy="beforeInteractive" 면 useEffect 시점 이전 hydrate 보장.
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: articleJsonLdString(article, issue) }}
        />
      )}

      {/* 헤더 */}
      <header className="space-y-4 border-b pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <PublicationTypeBadge type={article.publicationType} size="sm" />
          <ReviewStatusBadge status={article.reviewStatus} size="sm" />
          <VisibilityBadge visibility={article.visibility} size="sm" />
          {issue && (
            <Badge variant="outline" className="text-xs">
              {formatIssueCode(issue.volume, issue.number)} · {issue.year}
            </Badge>
          )}
          {article.doi && (
            <a
              href={`https://doi.org/${article.doi}`}
              target="_blank"
              rel="noreferrer noopener"
              className="text-xs text-primary hover:underline"
            >
              DOI: {article.doi}
            </a>
          )}
        </div>

        <h1 className="text-3xl font-bold leading-tight">{article.titleKo}</h1>
        {article.titleEn && (
          <p className="text-lg italic text-muted-foreground">{article.titleEn}</p>
        )}

        {/* 저자 */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {article.authors
            .slice()
            .sort((a, b) => (a.authorOrder ?? 0) - (b.authorOrder ?? 0))
            .map((a) => (
              <span key={a.userId} className="inline-flex items-center gap-1">
                <span className="font-medium">{a.displayName}</span>
                {a.isFirstAuthor && (
                  <Star size={11} className="text-warning" />
                )}
                {a.isCorresponding && (
                  <Crown size={11} className="text-cat-5" />
                )}
                <span className="text-xs text-muted-foreground">({a.affiliation})</span>
              </span>
            ))}
        </div>

        {/* 발간일·조회수 */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {article.publishedAt && (
            <span>발간일: {new Date(article.publishedAt).toLocaleDateString("ko-KR")}</span>
          )}
          <span>👁 {article.viewCount.toLocaleString()}회 열람</span>
          <span>⬇ {article.downloadCount.toLocaleString()}회 다운로드</span>
        </div>

        {/* PDF 다운로드 */}
        {article.pdfUrl && (
          <a
            href={article.pdfUrl}
            target="_blank"
            rel="noreferrer noopener"
            onClick={() => {
              void journalArticlesApi.incrementDownload(article.id).catch(() => undefined);
            }}
            className="inline-flex items-center rounded border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent"
          >
            <Download size={14} className="mr-1" />
            PDF 다운로드
          </a>
        )}
      </header>

      {/* 초록 + 키워드 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">초록</h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {article.abstractKo}
        </p>
        {article.keywordsKo.length > 0 && (
          <p className="text-xs text-muted-foreground">
            <strong>키워드:</strong> {article.keywordsKo.join(", ")}
          </p>
        )}
        {article.abstractEn && (
          <details className="rounded border border-muted p-3">
            <summary className="cursor-pointer text-sm font-medium">Abstract (English)</summary>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {article.abstractEn}
            </p>
            {(article.keywordsEn ?? []).length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                <strong>Keywords:</strong> {(article.keywordsEn ?? []).join(", ")}
              </p>
            )}
          </details>
        )}
      </section>

      {/* 본문 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">본문</h2>
        <div className="prose prose-sm max-w-none whitespace-pre-wrap rounded border border-muted bg-background p-6 text-sm leading-relaxed">
          {article.content || "(본문 미입력)"}
        </div>
      </section>

      {/* 데이터 링크 */}
      {(article.dataLinks ?? []).length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">자료·데이터</h2>
          <ul className="space-y-1 text-sm">
            {article.dataLinks!.map((link) => (
              <li key={link}>
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <ExternalLink size={12} />
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* CRediT 매트릭스 */}
      {article.authors.some((a) => a.creditRoles.length > 0) && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">기여 역할 (CRediT)</h2>
          <Card>
            <CardContent className="p-4">
              <ul className="space-y-2 text-sm">
                {article.authors.map((a) => (
                  <li key={a.userId}>
                    <strong>{a.displayName}</strong>:{" "}
                    <span className="text-muted-foreground">
                      {a.creditRoles.length === 0
                        ? "(역할 미지정)"
                        : a.creditRoles
                            .map((r) => CREDIT_ROLE_LABELS[r])
                            .join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}

      {/* 참고문헌 */}
      {bibliography.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">참고문헌</h2>
          <Card>
            <CardContent className="p-4">
              <ol className="space-y-2 text-sm">
                {bibliography.map((entry, i) => (
                  <li key={i} className="leading-relaxed">
                    {entry}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </section>
      )}

      {/* 인용 정보 (이 논문을 인용하는 방법) */}
      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <BookOpen size={16} /> 이 논문 인용하기
        </h2>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{citation}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.clipboard) {
                  void navigator.clipboard.writeText(citation);
                }
              }}
            >
              인용 복사
            </Button>
          </CardContent>
        </Card>
      </section>

      {!isAuthenticated && !isPublic && (
        <Card className="border-warning/20 bg-warning/5">
          <CardContent className="p-4 text-sm">
            ⚠️ 이 논문은 학회 회원 또는 팀 멤버만 열람할 수 있습니다.
          </CardContent>
        </Card>
      )}
    </article>
  );
}
