import type { ResearchPaper } from "@/types";

/**
 * ResearchPaper → APA7 참고문헌 문자열 변환
 *
 * - Journal article: 저자 (연도). 논문 제목. 저널명, 권(호), 시작-끝페이지. https://doi.org/xxx
 * - Thesis: 저자 (연도). 학위논문 제목 [석·박사학위논문]. 소속기관.
 *
 * 한·영 혼합 처리: 저자/연도/제목이 있으면 최소 형태라도 출력.
 */
export function formatApa7(paper: ResearchPaper): string {
  const authors = (paper.authors ?? "").trim();
  const year = paper.year ? `(${paper.year})` : "(n.d.)";
  const title = (paper.title ?? "").trim();

  // 저자 부분
  const authorPart = authors ? `${authors} ` : "";

  if (paper.paperType === "thesis") {
    const level =
      paper.thesisLevel === "doctoral"
        ? "박사학위논문"
        : paper.thesisLevel === "master"
        ? "석사학위논문"
        : "학위논문";
    const venue = (paper.venue ?? "").trim();
    const venuePart = venue ? ` ${venue}.` : "";
    const doiOrUrl = buildDoiOrUrl(paper);
    return `${authorPart}${year}. ${title} [${level}].${venuePart}${doiOrUrl}`.trim();
  }

  // academic (학술논문)
  const venue = (paper.venue ?? "").trim();
  const volume = (paper.volume ?? "").trim();
  const issue = (paper.issue ?? "").trim();
  const pages = (paper.pages ?? "").trim();

  let citation = `${authorPart}${year}. ${title}.`;
  if (venue) {
    citation += ` ${venue}`;
    if (volume) {
      citation += `, ${volume}`;
      if (issue) citation += `(${issue})`;
    }
    if (pages) citation += `, ${pages}`;
    citation += ".";
  }
  citation += buildDoiOrUrl(paper);
  return citation.trim();
}

function buildDoiOrUrl(paper: ResearchPaper): string {
  if (paper.doi) {
    const doi = paper.doi.trim();
    if (!doi) return "";
    if (doi.startsWith("http")) return ` ${doi}`;
    return ` https://doi.org/${doi}`;
  }
  if (paper.url) {
    const url = paper.url.trim();
    return url ? ` ${url}` : "";
  }
  return "";
}

/** 여러 참고문헌을 저자·연도 순으로 정렬 후 줄바꿈 결합 */
export function formatApa7List(papers: ResearchPaper[]): string {
  const sorted = [...papers].sort((a, b) => {
    const an = (a.authors ?? "").localeCompare(b.authors ?? "", "ko");
    if (an !== 0) return an;
    return (a.year ?? 0) - (b.year ?? 0);
  });
  return sorted.map((p, i) => `${i + 1}. ${formatApa7(p)}`).join("\n");
}
