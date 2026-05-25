// ────────────────────────────────────────────────────────────
// features/journal/lib/apa7.ts
//
// APA 7판 자동 인용 렌더링 (간소화). 학회 발간물 통용 형식 자동 생성.
// ────────────────────────────────────────────────────────────

import type {
  ArticleAuthorSnapshot,
  ArticleCitation,
  ResearchJournalArticle,
  ResearchJournalIssue,
} from "@/types";

export function formatAuthorsApa(authors: ArticleAuthorSnapshot[]): string {
  if (authors.length === 0) return "(저자 미입력)";
  const sorted = [...authors].sort((a, b) => (a.authorOrder ?? 0) - (b.authorOrder ?? 0));
  const formatted = sorted.map((a) => apaName(a.displayName));
  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]}, & ${formatted[1]}`;
  return `${formatted.slice(0, -1).join(", ")}, & ${formatted.at(-1)}`;
}

function apaName(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return "익명";
  if (/[가-힯]/.test(trimmed)) return trimmed;
  const parts = trimmed.split(/\s+/);
  if (parts.length < 2) return trimmed;
  const last = parts.at(-1)!;
  const initials = parts.slice(0, -1).map((p) => `${p[0]?.toUpperCase() ?? ""}.`).join(" ");
  return `${last}, ${initials}`;
}

export function formatArticleCitation(
  article: ResearchJournalArticle,
  issue?: ResearchJournalIssue,
  journalName = "연세 교육공학 연구",
): string {
  const authors = formatAuthorsApa(article.authors);
  const year = article.publishedAt
    ? new Date(article.publishedAt).getFullYear()
    : new Date().getFullYear();
  const issueRef = issue ? `, ${issue.volume}(${issue.number})` : "";
  const pages = article.pageStart && article.pageEnd
    ? `, ${article.pageStart}-${article.pageEnd}`
    : "";
  const doi = article.doi ? ` https://doi.org/${article.doi}` : "";
  return `${authors} (${year}). ${article.titleKo}. ${journalName}${issueRef}${pages}.${doi}`;
}

export function formatWorkingPaperCitation(
  article: ResearchJournalArticle,
  societyName = "연세교육공학회",
): string {
  const authors = formatAuthorsApa(article.authors);
  const year = article.publishedAt
    ? new Date(article.publishedAt).getFullYear()
    : new Date().getFullYear();
  return `${authors} (${year}). ${article.titleKo}. ${societyName} 워킹 페이퍼.`;
}

export function formatCitationEntry(c: ArticleCitation): string {
  const authors = c.authors.trim() || "(저자 미상)";
  const year = c.year ? `(${c.year}).` : "(연도 미상).";
  const title = c.title.trim();
  const source = c.source ? c.source : "";
  const doi = c.doi ? ` https://doi.org/${c.doi}` : c.url ? ` ${c.url}` : "";
  switch (c.type) {
    case "chapter":
      return `${authors} ${year} ${title}. In ${source}.${doi}`;
    case "thesis":
      return `${authors} ${year} ${title} [학위논문]. ${source}.${doi}`;
    case "web":
      return `${authors} ${year} ${title}.${doi}`;
    default:
      return `${authors} ${year} ${title}. ${source}.${doi}`;
  }
}

export function renderBibliography(citations: ArticleCitation[]): string[] {
  return [...citations]
    .sort((a, b) => {
      const ax = (a.authors || "").localeCompare(b.authors || "");
      if (ax !== 0) return ax;
      return a.year - b.year;
    })
    .map(formatCitationEntry);
}
