/**
 * Crossref DOI 메타데이터 조회 (사이클 48b)
 *
 * 논문 읽기 등록 시 DOI 만 입력하면 서지정보(제목·저자·연도·저널·권·호·페이지)를
 * 자동으로 채운다. api.crossref.org 는 인증 불요·CORS 허용 공개 API.
 * 실패(미존재 DOI·네트워크)는 null 반환 — 호출부에서 토스트 안내.
 */

interface CrossrefAuthor {
  given?: string;
  family?: string;
  name?: string;
}

interface CrossrefWork {
  title?: string[];
  author?: CrossrefAuthor[];
  issued?: { "date-parts"?: number[][] };
  "container-title"?: string[];
  volume?: string;
  issue?: string;
  page?: string;
  DOI?: string;
  URL?: string;
}

export interface CrossrefMeta {
  title?: string;
  authors?: string;
  year?: number;
  venue?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
}

/** "10.xxxx/..." 또는 doi.org URL 에서 DOI 본체만 추출 */
export function normalizeDoi(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  const m = t.match(/10\.\d{4,9}\/[^\s"<>]+/);
  return m ? m[0].replace(/[.,;)\]]+$/, "") : null;
}

/** Crossref author 배열 → "Family, G., Family, G., & Family, G." 형태 */
function formatAuthors(authors: CrossrefAuthor[]): string {
  const names = authors
    .map((a) => {
      if (a.family) {
        const initials = (a.given ?? "")
          .split(/[\s-]+/)
          .filter(Boolean)
          .map((g) => `${g[0].toUpperCase()}.`)
          .join(" ");
        return initials ? `${a.family}, ${initials}` : a.family;
      }
      return a.name ?? "";
    })
    .filter(Boolean);
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length > 20) {
    // APA7: 21명 이상은 19명 + … + 마지막 저자
    return `${names.slice(0, 19).join(", ")}, … ${names[names.length - 1]}`;
  }
  return `${names.slice(0, -1).join(", ")}, & ${names[names.length - 1]}`;
}

/** Crossref 응답 message → ResearchPaper 폼 필드 (테스트 가능한 순수 변환) */
export function mapCrossrefWork(work: CrossrefWork): CrossrefMeta {
  const meta: CrossrefMeta = {};
  const title = work.title?.[0]?.trim();
  if (title) meta.title = title;
  if (work.author?.length) {
    const authors = formatAuthors(work.author);
    if (authors) meta.authors = authors;
  }
  const year = work.issued?.["date-parts"]?.[0]?.[0];
  if (typeof year === "number" && year > 1500) meta.year = year;
  const venue = work["container-title"]?.[0]?.trim();
  if (venue) meta.venue = venue;
  if (work.volume?.trim()) meta.volume = work.volume.trim();
  if (work.issue?.trim()) meta.issue = work.issue.trim();
  if (work.page?.trim()) meta.pages = work.page.trim();
  if (work.DOI) meta.doi = work.DOI;
  if (work.URL) meta.url = work.URL;
  return meta;
}

/** DOI 로 Crossref 조회 — 실패 시 null */
export async function fetchCrossrefByDoi(rawDoi: string): Promise<CrossrefMeta | null> {
  const doi = normalizeDoi(rawDoi);
  if (!doi) return null;
  try {
    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { message?: CrossrefWork };
    if (!json.message) return null;
    return mapCrossrefWork(json.message);
  } catch {
    return null;
  }
}
