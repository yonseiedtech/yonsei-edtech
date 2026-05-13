/**
 * 학술 논문 공식 API 클라이언트 (Sprint 70 — Research Review Agent PoC)
 *
 * 공식·무료 API 만 사용:
 * - OpenAlex: 무제한, concept tagging, 교육공학 분야 식별
 * - Semantic Scholar Graph: 100 req/5min, abstract + TLDR 제공
 *
 * Google Scholar 사용 금지 (공식 API 미제공, ToS 위반 위험).
 * 본 모듈은 abstract 만 사용 (저작권 fair use 범위) — 본문/표/그림 인용 절대 금지.
 */

/** OpenAlex "Educational technology" concept ID (level 2, ~230k works) */
export const OPENALEX_EDTECH_CONCEPT_ID = "C16443162";

/** 신뢰 가능한 영문 학술지 ISSN 화이트리스트 */
export const TRUSTED_VENUE_ISSN: ReadonlyArray<{ name: string; issn: string }> = [
  { name: "British Journal of Educational Technology", issn: "0007-1013" },
  { name: "Computers & Education", issn: "0360-1315" },
  { name: "Educational Technology Research and Development", issn: "1042-1629" },
  { name: "Educational Research Review", issn: "1747-938X" },
  { name: "Computers in Human Behavior", issn: "0747-5632" },
  { name: "The Internet and Higher Education", issn: "1096-7516" },
] as const;

export interface ResearchPaper {
  /** 식별자 (OpenAlex ID 또는 DOI) */
  id: string;
  /** DOI (있을 때만) — 인용 검증 필수 */
  doi?: string;
  title: string;
  /** 영문 abstract (있을 때만 — fair use 범위 인용) */
  abstract?: string;
  /** Semantic Scholar TLDR (있을 때만) */
  tldr?: string;
  authors: string[];
  year: number;
  /** 학술지 명 */
  venue?: string;
  /** 출처 시스템 */
  source: "openalex" | "semantic-scholar";
  /** 공식 페이지 URL */
  url?: string;
}

interface OpenAlexAuthor {
  author?: { display_name?: string };
}
interface OpenAlexWork {
  id: string;
  doi?: string;
  title?: string;
  publication_year?: number;
  abstract_inverted_index?: Record<string, number[]>;
  authorships?: OpenAlexAuthor[];
  primary_location?: {
    source?: { display_name?: string; issn_l?: string };
    landing_page_url?: string;
  };
}

/** OpenAlex inverted index → 평문 abstract 복원 */
function reconstructAbstract(inverted?: Record<string, number[]>): string | undefined {
  if (!inverted) return undefined;
  const positions: [number, string][] = [];
  for (const [word, idxs] of Object.entries(inverted)) {
    for (const i of idxs) positions.push([i, word]);
  }
  positions.sort((a, b) => a[0] - b[0]);
  const text = positions.map(([, w]) => w).join(" ");
  return text.length > 0 ? text : undefined;
}

/**
 * OpenAlex 에서 교육공학 분야 최신 논문 검색.
 * - 신뢰 학술지 ISSN whitelist 적용
 * - 지정 기간(일) 내 출판
 * - 영문 abstract 보유 건만
 */
export async function searchOpenAlexEdTech(opts: {
  fromDays?: number;
  perPage?: number;
  signal?: AbortSignal;
}): Promise<ResearchPaper[]> {
  const fromDays = opts.fromDays ?? 90;
  const perPage = Math.min(opts.perPage ?? 10, 25);
  const since = new Date(Date.now() - fromDays * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);
  const issnFilter = TRUSTED_VENUE_ISSN.map((v) => v.issn).join("|");
  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set("filter", [
    `from_publication_date:${since}`,
    `concepts.id:${OPENALEX_EDTECH_CONCEPT_ID}`,
    `primary_location.source.issn:${issnFilter}`,
    "has_abstract:true",
    "has_doi:true",
    "language:en",
  ].join(","));
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("sort", "publication_date:desc");
  url.searchParams.set("mailto", "yonsei.edtech@gmail.com");

  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "yonsei-edtech-bot/1.0" },
    signal: opts.signal,
  });
  if (!res.ok) throw new Error(`OpenAlex ${res.status}`);
  const json = (await res.json()) as { results?: OpenAlexWork[] };
  const works = json.results ?? [];

  return works.map((w) => {
    const doi = w.doi?.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
    const authors = (w.authorships ?? [])
      .map((a) => a.author?.display_name ?? "")
      .filter(Boolean);
    return {
      id: w.id,
      doi: doi || undefined,
      title: w.title ?? "(제목 없음)",
      abstract: reconstructAbstract(w.abstract_inverted_index),
      authors,
      year: w.publication_year ?? 0,
      venue: w.primary_location?.source?.display_name,
      source: "openalex",
      url: w.primary_location?.landing_page_url,
    } satisfies ResearchPaper;
  });
}

interface SemanticScholarPaper {
  paperId?: string;
  externalIds?: { DOI?: string };
  title?: string;
  abstract?: string;
  authors?: { name?: string }[];
  year?: number;
  venue?: string;
  tldr?: { text?: string };
  openAccessPdf?: { url?: string };
}

/**
 * Semantic Scholar 에서 같은 DOI 의 TLDR + abstract 보강.
 * (OpenAlex 는 TLDR 미제공, abstract 도 inverted index → 복원이 부정확할 수 있어 SS 로 보강)
 */
export async function enrichWithSemanticScholar(
  doi: string,
  signal?: AbortSignal,
): Promise<{ abstract?: string; tldr?: string }> {
  const url = `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(doi)}?fields=abstract,tldr`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "yonsei-edtech-bot/1.0" },
    signal,
  });
  if (!res.ok) return {};
  const j = (await res.json()) as SemanticScholarPaper;
  return { abstract: j.abstract ?? undefined, tldr: j.tldr?.text ?? undefined };
}
