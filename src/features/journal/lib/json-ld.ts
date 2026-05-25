// ────────────────────────────────────────────────────────────
// features/journal/lib/json-ld.ts
//
// schema.org ScholarlyArticle JSON-LD 빌더 — Google Scholar / 검색엔진 인덱싱.
// public + published 가시성 논문에만 노출.
// ────────────────────────────────────────────────────────────

import type {
  ResearchJournalArticle,
  ResearchJournalIssue,
} from "@/types";

const SITE_BASE_URL = "https://yonsei-edtech.vercel.app";
const JOURNAL_NAME = "연세 교육공학 연구";
const JOURNAL_PUBLISHER = "연세교육공학회";

interface JsonLdAuthor {
  "@type": "Person";
  name: string;
  affiliation?: string;
  identifier?: string; // ORCID iD
}

interface JsonLdScholarlyArticle {
  "@context": "https://schema.org";
  "@type": "ScholarlyArticle";
  headline: string;
  name: string;
  alternativeHeadline?: string;
  inLanguage: string[];
  datePublished?: string;
  dateModified?: string;
  url: string;
  identifier?: string; // DOI
  abstract?: string;
  keywords?: string[];
  author: JsonLdAuthor[];
  isPartOf?: {
    "@type": "PublicationIssue";
    issueNumber: number;
    isPartOf: {
      "@type": "PublicationVolume";
      volumeNumber: number;
      isPartOf: {
        "@type": "Periodical";
        name: string;
        publisher: {
          "@type": "Organization";
          name: string;
        };
      };
    };
  };
  publisher?: {
    "@type": "Organization";
    name: string;
  };
  /** public 논문만 OK */
  isAccessibleForFree: boolean;
  pageStart?: string;
  pageEnd?: string;
}

export function buildArticleJsonLd(
  article: ResearchJournalArticle,
  issue?: ResearchJournalIssue,
): JsonLdScholarlyArticle {
  const url = `${SITE_BASE_URL}/journal/articles/${article.id}`;

  const authors: JsonLdAuthor[] = [...article.authors]
    .sort((a, b) => (a.authorOrder ?? 0) - (b.authorOrder ?? 0))
    .map((a) => ({
      "@type": "Person" as const,
      name: a.displayName,
      ...(a.affiliation ? { affiliation: a.affiliation } : {}),
      ...(a.orcidId ? { identifier: `https://orcid.org/${a.orcidId}` } : {}),
    }));

  const data: JsonLdScholarlyArticle = {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    headline: article.titleKo,
    name: article.titleKo,
    inLanguage: ["ko"],
    url,
    abstract: article.abstractKo,
    keywords: article.keywordsKo,
    author: authors,
    publisher: {
      "@type": "Organization",
      name: JOURNAL_PUBLISHER,
    },
    isAccessibleForFree: article.visibility === "public",
  };

  if (article.titleEn) data.alternativeHeadline = article.titleEn;
  if (article.publishedAt) data.datePublished = article.publishedAt;
  if (article.updatedAt) data.dateModified = article.updatedAt;
  if (article.doi) data.identifier = `https://doi.org/${article.doi}`;
  if (article.titleEn) data.inLanguage = ["ko", "en"];

  if (issue) {
    data.isPartOf = {
      "@type": "PublicationIssue",
      issueNumber: issue.number,
      isPartOf: {
        "@type": "PublicationVolume",
        volumeNumber: issue.volume,
        isPartOf: {
          "@type": "Periodical",
          name: JOURNAL_NAME,
          publisher: {
            "@type": "Organization",
            name: JOURNAL_PUBLISHER,
          },
        },
      },
    };
  }

  if (article.pageStart) data.pageStart = String(article.pageStart);
  if (article.pageEnd) data.pageEnd = String(article.pageEnd);

  return data;
}

/** Next.js Script 컴포넌트의 JSON 직렬화용 */
export function articleJsonLdString(
  article: ResearchJournalArticle,
  issue?: ResearchJournalIssue,
): string {
  return JSON.stringify(buildArticleJsonLd(article, issue));
}
