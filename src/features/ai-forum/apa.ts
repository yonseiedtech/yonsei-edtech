/**
 * APA 7판 인용 포매터 (Sprint 67-AR — Human-in-the-loop 검증)
 *
 * AI 포럼 발언에 첨부된 APACitation 을 APA 7 표기로 변환.
 * - 영문: Last, F. M., Last, F. M., & Last, F. M. (year). Title. *Journal*, *vol*(issue), pages. https://doi.org/...
 * - 한국어: 김철수, 이영희, & 박민수. (2024). 제목. *학술지*, *권*(호), 페이지. https://doi.org/...
 *
 * 다중 인용 시 APA 표준에 따라 마침표 + 한 칸 띄어쓰기.
 * 사용자가 1차 자료를 직접 검증할 수 있도록 DOI/URL 항상 노출.
 */

import type { APACitation } from "@/types/ai-forum";

/** 저자 목록을 APA 7 형식으로 결합 */
function formatAuthors(authors: string[], language: "ko" | "en"): string {
  if (authors.length === 0) return "";
  if (authors.length === 1) return authors[0];

  const ampersand = language === "ko" ? ", & " : ", & ";

  if (authors.length === 2) {
    return `${authors[0]}${ampersand}${authors[1]}`;
  }

  // APA 7: 20명 이하면 모두 표기, 21명 이상이면 첫 19명 ... 마지막
  if (authors.length <= 20) {
    const head = authors.slice(0, -1).join(", ");
    return `${head}${ampersand}${authors[authors.length - 1]}`;
  }

  const first19 = authors.slice(0, 19).join(", ");
  const last = authors[authors.length - 1];
  return `${first19}, ... ${last}`;
}

/** in-text 인용: (저자, 연도) 또는 저자 (연도) */
export function formatInText(citation: APACitation): string {
  if (citation.authors.length === 0) return `(${citation.year})`;
  if (citation.authors.length === 1) {
    const last = citation.authors[0].split(",")[0].trim();
    return `(${last}, ${citation.year})`;
  }
  if (citation.authors.length === 2) {
    const a = citation.authors[0].split(",")[0].trim();
    const b = citation.authors[1].split(",")[0].trim();
    const conn = citation.language === "ko" ? " & " : " & ";
    return `(${a}${conn}${b}, ${citation.year})`;
  }
  // 3명 이상: 첫 저자 et al.
  const first = citation.authors[0].split(",")[0].trim();
  const etal = citation.language === "ko" ? " 외" : " et al.";
  return `(${first}${etal}, ${citation.year})`;
}

/** 전체 참고문헌 항목 (APA 7) */
export function formatAPA7Reference(c: APACitation): string {
  const authors = formatAuthors(c.authors, c.language);
  const year = `(${c.year})`;
  const title = c.title.trim();

  const parts: string[] = [`${authors}.`, `${year}.`, `${title}.`];

  if (c.type === "journal" && c.journal) {
    let journalPart = c.journal;
    if (c.volume) {
      journalPart += `, ${c.volume}`;
      if (c.issue) journalPart += `(${c.issue})`;
    }
    if (c.pages) journalPart += `, ${c.pages}`;
    parts.push(`${journalPart}.`);
  } else if ((c.type === "book" || c.type === "report") && c.publisher) {
    parts.push(`${c.publisher}.`);
  } else if (c.type === "conference" && c.conference) {
    const lead =
      c.language === "ko" ? "다음에서 발표됨: " : "Paper presented at ";
    parts.push(`${lead}${c.conference}.`);
  }

  // DOI 우선, 없으면 URL
  if (c.doi) {
    const doiUrl = c.doi.startsWith("http") ? c.doi : `https://doi.org/${c.doi}`;
    parts.push(doiUrl);
  } else if (c.url) {
    if (c.retrievedDate) {
      const retr =
        c.language === "ko"
          ? `${c.retrievedDate}에 ${c.url}에서 검색`
          : `Retrieved ${c.retrievedDate}, from ${c.url}`;
      parts.push(retr);
    } else {
      parts.push(c.url);
    }
  }

  return parts.join(" ");
}

/** 인용 외부 링크 (DOI 우선) */
export function citationLinkUrl(c: APACitation): string | null {
  if (c.doi) {
    return c.doi.startsWith("http") ? c.doi : `https://doi.org/${c.doi}`;
  }
  return c.url ?? null;
}
